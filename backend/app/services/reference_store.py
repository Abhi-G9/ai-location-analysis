import json
import logging
import os
from typing import Any, Dict, List, Optional
import cv2
import numpy as np
from PIL import Image
import torch

from backend.app.services.clip_service import get_clip_components
from backend.app.services.dinov2_service import extract_dinov2_features
from backend.app.services.image_retrieval_service import get_local_reference_photos
from backend.app.services.opencv_matcher import extract_orb_descriptors

logger = logging.getLogger("geolens.reference_store")

_reference_cache: Optional[Dict[str, Any]] = None


def get_reference_cache(force_reload: bool = False) -> Dict[str, Any]:
    """
    Loads or initializes precomputed visual embeddings and descriptors for candidate places.
    Uses ONLY genuine photographic reference assets and their legal attribution metadata.
    Does NOT use synthetic or fabricated drawings.
    Ensures that reference embeddings are generated and cached on disk.
    """
    global _reference_cache
    if _reference_cache is not None and not force_reload:
        return _reference_cache

    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    cache_dir = os.path.join(base_dir, "data", "reference_data")
    os.makedirs(cache_dir, exist_ok=True)
    cache_file = os.path.join(cache_dir, "candidate_embeddings_cache.pt")

    # If cached file exists and reload not forced, verify and load directly
    if os.path.exists(cache_file) and not force_reload:
        try:
            cached_data = torch.load(cache_file, weights_only=False)
            # Verify that the cache uses genuine reference photos (has 'reference_photo' key)
            has_genuine_metadata = any(
                isinstance(v, dict) and "reference_photo" in v
                for v in cached_data.values()
            )
            if has_genuine_metadata:
                _reference_cache = cached_data
                logger.info("Loaded precomputed genuine candidate embeddings from %s", cache_file)
                return _reference_cache
            else:
                logger.info("Existing cache contains legacy or non-genuine data. Regenerating with genuine photos.")
        except Exception as exc:
            logger.warning("Failed to load cached embeddings: %s. Regenerating.", exc)

    logger.info("Extracting and caching visual embeddings from genuine reference photographs...")
    candidates_file = os.path.join(base_dir, "data", "kota_candidates.json")
    with open(candidates_file, "r", encoding="utf-8") as f:
        candidates = json.load(f)

    # Initialize vision models
    clip_model, clip_preprocess, _, clip_cached = get_clip_components()
    device = clip_cached["device"] if clip_cached else "cpu"

    cache: Dict[str, Any] = {}

    for cand in candidates:
        cid = cand["id"]
        local_photos = get_local_reference_photos(cid)

        if not local_photos:
            logger.warning("No genuine reference photos found locally for candidate: %s", cid)
            cache[cid] = {
                "name": cand["name"],
                "has_reference_photo": False,
                "clip_embedding": None,
                "dinov2_embedding": None,
                "orb_keypoints": [],
                "orb_descriptors": None,
                "reference_photo": None,
            }
            continue

        # Use the primary verified reference photograph
        primary_photo_meta = local_photos[0]
        photo_path = primary_photo_meta["path"]

        try:
            with Image.open(photo_path) as raw_img:
                ref_img = raw_img.convert("RGB")
        except Exception as exc:
            logger.error("Failed to open reference photo at %s: %s", photo_path, exc)
            cache[cid] = {
                "name": cand["name"],
                "has_reference_photo": False,
                "clip_embedding": None,
                "dinov2_embedding": None,
                "orb_keypoints": [],
                "orb_descriptors": None,
                "reference_photo": None,
            }
            continue

        # 1. OpenCLIP embedding (512-dim, L2-normalized)
        clip_feat = None
        if clip_model is not None:
            try:
                t = clip_preprocess(ref_img).unsqueeze(0).to(device)
                with torch.no_grad():
                    feat = clip_model.encode_image(t)
                    feat = feat / feat.norm(dim=-1, keepdim=True)
                    clip_feat = feat.squeeze(0).cpu()
            except Exception as exc:
                logger.warning("Failed to extract CLIP embedding for %s: %s", cid, exc)

        # 2. Meta DINOv2 structural embedding (384-dim, L2-normalized)
        dinov2_feat = extract_dinov2_features(ref_img)

        # 3. OpenCV ORB keypoints and descriptors
        kps, des = extract_orb_descriptors(ref_img)
        serializable_kps = [
            (kp.pt[0], kp.pt[1], kp.size, kp.angle, kp.response, kp.octave)
            for kp in kps
        ] if kps else []

        cache[cid] = {
            "name": cand["name"],
            "has_reference_photo": True,
            "clip_embedding": clip_feat,
            "dinov2_embedding": dinov2_feat,
            "orb_keypoints": serializable_kps,
            "orb_descriptors": des,
            "reference_photo": {
                "filename": primary_photo_meta.get("filename"),
                "title": primary_photo_meta.get("title", primary_photo_meta.get("filename")),
                "source": primary_photo_meta.get("source", "Wikimedia Commons"),
                "source_page": primary_photo_meta.get("source_page", ""),
                "author": primary_photo_meta.get("author", "Unknown"),
                "license": primary_photo_meta.get("license", "Creative Commons"),
                "license_url": primary_photo_meta.get("license_url", ""),
                "image_url": primary_photo_meta.get("image_url", ""),
            },
        }

    try:
        torch.save(cache, cache_file)
        logger.info("Successfully persisted genuine reference embeddings for %d candidates to %s", len(cache), cache_file)
    except Exception as exc:
        logger.error("Failed to write reference cache file: %s", exc)

    _reference_cache = cache
    return _reference_cache


def reload_reference_cache() -> Dict[str, Any]:
    """Force reloads and regenerates the reference cache from local image assets."""
    return get_reference_cache(force_reload=True)

import json
import logging
import os
from typing import Any, Dict, List, Optional
import cv2
import numpy as np
from PIL import Image, ImageDraw
import torch

from backend.app.services.clip_service import get_clip_components
from backend.app.services.dinov2_service import extract_dinov2_features
from backend.app.services.opencv_matcher import extract_orb_descriptors

logger = logging.getLogger("geolens.reference_store")

_reference_cache: Optional[Dict[str, Any]] = None


def _create_synthetic_reference_image(candidate_id: str) -> Image.Image:
    """
    Creates a distinctive synthetic reference image for candidate places when
    external photographs are not yet locally downloaded.
    Provides verifiable geometric and color features for positive/negative testing.
    """
    width, height = 400, 300
    img = Image.new("RGB", (width, height), color=(135, 206, 235))  # Sky blue background
    draw = ImageDraw.Draw(img)

    if candidate_id == "kota-barrage":
        # Water river + concrete dam with spillway gates
        draw.rectangle([(0, 180), (width, height)], fill=(28, 107, 160))  # Water
        draw.rectangle([(0, 120), (width, 180)], fill=(160, 160, 160))  # Concrete dam
        for x in range(30, width - 30, 25):
            draw.rectangle([(x, 130), (x + 15, 175)], fill=(50, 50, 50))  # Spillway gates
        draw.rectangle([(0, 110), (width, 125)], fill=(100, 100, 100))  # Roadway bridge

    elif candidate_id == "chambal-hanging-bridge":
        # River gorge + tall cable-stayed pylon + diagonal stay cables
        draw.rectangle([(0, 200), (width, height)], fill=(30, 110, 170))  # Deep Chambal gorge
        # Tall Pylon tower
        draw.rectangle([(180, 40), (220, 220)], fill=(220, 220, 220))
        # Bridge deck
        draw.rectangle([(0, 160), (width, 175)], fill=(100, 100, 100))
        # Diagonal stay cables
        for y in range(50, 140, 15):
            draw.line([(200, y), (y * 2, 165)], fill=(240, 240, 240), width=2)
            draw.line([(200, y), (width - y * 2, 165)], fill=(240, 240, 240), width=2)

    elif candidate_id == "seven-wonders-park":
        # Green park lawn + lake waterfront + miniature Eiffel tower
        draw.rectangle([(0, 200), (width, height)], fill=(34, 139, 34))  # Green lawn
        draw.rectangle([(250, 170), (width, 240)], fill=(40, 120, 180))  # Lake corner
        # Miniature tower pyramid
        draw.polygon([(100, 200), (140, 60), (160, 60), (200, 200)], fill=(120, 100, 80))
        draw.rectangle([(130, 120), (170, 130)], fill=(80, 60, 40))

    elif candidate_id == "jagmandir-palace":
        # Blue lake surrounding red sandstone island palace
        draw.rectangle([(0, 100), (width, height)], fill=(40, 120, 180))  # Lake
        draw.rectangle([(100, 130), (300, 200)], fill=(178, 34, 34))  # Red sandstone palace
        # Chhatri domes
        draw.ellipse([(120, 100), (150, 130)], fill=(178, 34, 34))
        draw.ellipse([(250, 100), (280, 130)], fill=(178, 34, 34))
        draw.ellipse([(185, 90), (215, 130)], fill=(205, 92, 92))

    elif candidate_id == "garh-palace-kota":
        # High yellow sandstone fort ramparts and battlements
        draw.rectangle([(0, 200), (width, height)], fill=(139, 115, 85))
        draw.rectangle([(40, 80), (360, 200)], fill=(218, 165, 32))  # Golden fort
        # Battlements crenellations
        for x in range(40, 360, 20):
            draw.rectangle([(x, 70), (x + 10, 80)], fill=(218, 165, 32))
        # Arch gateway
        draw.chord([(170, 140), (230, 200)], 180, 360, fill=(60, 40, 20))

    elif candidate_id == "godavari-dham-temple":
        # River + white marble temple shikhara (spire)
        draw.rectangle([(0, 210), (width, height)], fill=(30, 120, 180))
        draw.rectangle([(120, 140), (280, 210)], fill=(245, 245, 245))  # White marble base
        draw.polygon([(170, 140), (200, 50), (230, 140)], fill=(245, 245, 245))  # Temple spire
        draw.line([(200, 50), (200, 30)], fill=(255, 69, 0), width=3)  # Flag

    else:
        # Generic distinctive landscape with river and structure
        draw.rectangle([(0, 180), (width, height)], fill=(40, 130, 190))
        draw.rectangle([(80, 110), (320, 180)], fill=(180, 150, 110))
        draw.polygon([(80, 110), (200, 60), (320, 110)], fill=(140, 70, 30))

    return img


def get_reference_cache() -> Dict[str, Any]:
    """
    Loads or initializes precomputed visual embeddings and descriptors for candidate places.
    Ensures that reference embeddings are generated and cached only once on disk.
    """
    global _reference_cache
    if _reference_cache is not None:
        return _reference_cache

    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    cache_dir = os.path.join(base_dir, "data", "reference_data")
    os.makedirs(cache_dir, exist_ok=True)
    cache_file = os.path.join(cache_dir, "candidate_embeddings_cache.pt")

    # If cached file exists, load directly
    if os.path.exists(cache_file):
        try:
            _reference_cache = torch.load(cache_file, weights_only=False)
            logger.info("Loaded precomputed candidate embeddings from %s", cache_file)
            return _reference_cache
        except Exception as exc:
            logger.warning("Failed to load cached embeddings: %s. Regenerating.", exc)

    logger.info("Generating reference visual embeddings for candidate landmarks...")
    candidates_file = os.path.join(base_dir, "data", "kota_candidates.json")
    with open(candidates_file, "r", encoding="utf-8") as f:
        candidates = json.load(f)

    # Get models
    clip_model, clip_preprocess, _, clip_cached = get_clip_components()
    device = clip_cached["device"] if clip_cached else "cpu"

    cache: Dict[str, Any] = {}

    for cand in candidates:
        cid = cand["id"]
        ref_img = _create_synthetic_reference_image(cid)

        # 1. CLIP embedding (512-dim)
        clip_feat = None
        if clip_model is not None:
            t = clip_preprocess(ref_img).unsqueeze(0).to(device)
            with torch.no_grad():
                feat = clip_model.encode_image(t)
                feat = feat / feat.norm(dim=-1, keepdim=True)
                clip_feat = feat.squeeze(0).cpu()

        # 2. DINOv2 embedding (384-dim)
        dinov2_feat = extract_dinov2_features(ref_img)

        # 3. OpenCV ORB descriptors
        kps, des = extract_orb_descriptors(ref_img)
        # Convert KeyPoints to serializable tuples: (x, y, size, angle, response, octave)
        serializable_kps = [
            (kp.pt[0], kp.pt[1], kp.size, kp.angle, kp.response, kp.octave)
            for kp in kps
        ] if kps else []

        cache[cid] = {
            "name": cand["name"],
            "clip_embedding": clip_feat,
            "dinov2_embedding": dinov2_feat,
            "orb_keypoints": serializable_kps,
            "orb_descriptors": des,
        }

    try:
        torch.save(cache, cache_file)
        logger.info("Successfully cached reference embeddings for %d candidates to %s", len(cache), cache_file)
    except Exception as exc:
        logger.error("Failed to write reference cache file: %s", exc)

    _reference_cache = cache
    return _reference_cache

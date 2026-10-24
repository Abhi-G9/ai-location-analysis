import logging
from typing import Any, Dict, List, Optional
import cv2
import numpy as np
from PIL import Image
import torch

from backend.app.services.clip_service import get_clip_components
from backend.app.services.dinov2_service import extract_dinov2_features
from backend.app.services.opencv_matcher import compute_geometric_matching, extract_orb_descriptors
from backend.app.services.reference_store import get_reference_cache

logger = logging.getLogger("geolens.ranking")


def rank_candidates(
    query_image: Image.Image,
    candidates: List[Dict[str, Any]],
    exif_data: Dict[str, Any],
    ocr_data: Dict[str, Any],
) -> List[Dict[str, Any]]:
    """
    Ranks retrieved candidate locations using multi-modal AI visual feature comparison
    and evidence verification.

    Signals Evaluated:
    1. DINOv2 Structural Similarity: Dense geometry and landmark texture alignment (weight: 0.50).
    2. CLIP Visual Similarity: High-level visual-semantic scene alignment (weight: 0.35).
    3. OpenCV ORB & RANSAC Inliers: Distinctive 2D keypoint geometric correspondence (weight: 0.15).
    4. Text & Spatial Agreement Boosts:
       - OCR keyword match: +0.25 boost
       - EXIF GPS proximity (< 10 km): +0.30 boost

    Note on Interpretation:
    - Raw cosine similarity measures mathematical vector alignment (-1.0 to +1.0).
    - Composite rank score determines candidate ordering. It is NOT labeled as a ground-truth probability.
    """
    if not candidates:
        return []

    # 1. Extract query image visual features
    # CLIP
    clip_model, clip_preprocess, _, clip_cached = get_clip_components()
    device = clip_cached["device"] if clip_cached else "cpu"
    query_clip_feat = None
    if clip_model is not None:
        try:
            t = clip_preprocess(query_image).unsqueeze(0).to(device)
            with torch.no_grad():
                f = clip_model.encode_image(t)
                query_clip_feat = (f / f.norm(dim=-1, keepdim=True)).squeeze(0).cpu()
        except Exception as exc:
            logger.warning("Failed to extract query CLIP feature: %s", exc)

    # DINOv2
    query_dinov2_feat = extract_dinov2_features(query_image)

    # OpenCV ORB
    query_kps, query_des = extract_orb_descriptors(query_image)

    # Load cached reference representations
    ref_cache = get_reference_cache()

    ranked_candidates: List[Dict[str, Any]] = []

    for candidate in candidates:
        cid = candidate["id"]
        ref_data = ref_cache.get(cid)

        # Default scores if reference data unavailable
        clip_sim = 0.0
        dinov2_sim = 0.0
        ransac_inliers = 0
        inlier_ratio = 0.0
        structural_agreement = "No Reference Features"

        if ref_data is not None:
            # 1. CLIP visual cosine similarity
            ref_clip_feat = ref_data.get("clip_embedding")
            if query_clip_feat is not None and ref_clip_feat is not None:
                sim = torch.dot(query_clip_feat, ref_clip_feat).item()
                clip_sim = round(float(sim), 4)

            # 2. DINOv2 structural cosine similarity
            ref_dinov2_feat = ref_data.get("dinov2_embedding")
            if query_dinov2_feat is not None and ref_dinov2_feat is not None:
                d_sim = torch.dot(query_dinov2_feat, ref_dinov2_feat).item()
                dinov2_sim = round(float(d_sim), 4)

            # 3. OpenCV geometric feature matching
            ref_des = ref_data.get("orb_descriptors")
            ref_kps_tuples = ref_data.get("orb_keypoints", [])
            ref_kps = [
                cv2.KeyPoint(x=t[0], y=t[1], size=t[2], angle=t[3], response=t[4], octave=int(t[5]))
                for t in ref_kps_tuples
            ] if ref_kps_tuples else None

            match_res = compute_geometric_matching(query_kps, query_des, ref_kps, ref_des)
            ransac_inliers = match_res["ransac_inliers"]
            inlier_ratio = match_res["inlier_ratio"]
            structural_agreement = match_res["structural_agreement"]

        # Compute Evidence Agreement Boosts
        ocr_boost = 0.0
        ocr_text_lower = ocr_data.get("combined_text", "").lower()
        candidate_name_lower = candidate["name"].lower()
        if any(kw.lower() in ocr_text_lower for kw in candidate.get("keywords", [])) or (candidate_name_lower in ocr_text_lower):
            ocr_boost = 0.25

        gps_boost = 0.0
        dist = candidate.get("distance_km")
        if dist is not None:
            if dist < 5.0:
                gps_boost = 0.30
            elif dist < 25.0:
                gps_boost = 0.15

        # Weighted Visual Score
        # Bound similarities between 0 and 1 for scoring
        bounded_dinov2 = max(0.0, dinov2_sim)
        bounded_clip = max(0.0, clip_sim)
        bounded_orb = min(1.0, ransac_inliers / 30.0)

        visual_score = (0.50 * bounded_dinov2) + (0.35 * bounded_clip) + (0.15 * bounded_orb)
        composite_score = min(1.0, visual_score + ocr_boost + gps_boost)

        # Formulate human-readable ranking evidence breakdown
        evidence_breakdown: List[str] = [
            f"DINOv2 structural similarity: {dinov2_sim:.3f}",
            f"CLIP visual-semantic similarity: {clip_sim:.3f}",
            f"OpenCV geometric keypoint inliers: {ransac_inliers} ({structural_agreement})",
        ]
        if ocr_boost > 0:
            evidence_breakdown.append("Supporting Evidence: Recognized candidate name/sign in visible OCR text (+0.25).")
        if gps_boost > 0:
            evidence_breakdown.append(f"Supporting Evidence: Located within {dist:.1f} km of EXIF GPS coordinates (+{gps_boost:.2f}).")

        ranked_candidates.append({
            **candidate,
            "rank": 0,  # Assigned after sorting
            "composite_rank_score": round(composite_score, 4),
            "clip_visual_similarity": clip_sim,
            "dinov2_structural_similarity": dinov2_sim,
            "opencv_feature_inliers": ransac_inliers,
            "inlier_ratio": inlier_ratio,
            "structural_agreement": structural_agreement,
            "evidence_breakdown": evidence_breakdown,
            "reference_photo": ref_data.get("reference_photo") if ref_data else None,
        })

    # Sort descending by composite score, then by DINOv2 similarity
    ranked_candidates.sort(
        key=lambda x: (x["composite_rank_score"], x["dinov2_structural_similarity"]),
        reverse=True,
    )

    # Assign sequential ranks
    for idx, c in enumerate(ranked_candidates):
        c["rank"] = idx + 1

    return ranked_candidates

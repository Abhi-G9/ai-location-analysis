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
    gemini_data: Optional[Dict[str, Any]] = None,
    google_vision_data: Optional[Dict[str, Any]] = None,
) -> List[Dict[str, Any]]:
    """
    Ranks retrieved candidate locations using multi-modal AI visual feature comparison
    and evidence verification.

    Signals Evaluated:
    1. DINOv2 Structural Similarity: Dense geometry and landmark texture alignment (weight: 0.50).
    2. CLIP Visual Similarity: High-level visual-semantic scene alignment (weight: 0.35).
    3. OpenCV ORB & RANSAC Inliers: Distinctive 2D keypoint geometric correspondence (weight: 0.15).
    4. Text, Spatial, Gemini & Web Agreement Boosts:
       - OCR keyword match: +0.25 boost
       - EXIF GPS proximity (< 10 km): +0.30 boost
       - Gemini visual reasoning match: +0.25 boost
       - Google Cloud Vision Web Detection match: +0.25 boost

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

        gemini_boost = 0.0
        if gemini_data and gemini_data.get("available") and gemini_data.get("status") == "success":
            g_name = (gemini_data.get("identified_place_name") or "").lower()
            cand_names = [c.get("name", "").lower() for c in gemini_data.get("candidate_places", [])]
            if candidate_name_lower in g_name or any(candidate_name_lower in cn or cn in candidate_name_lower for cn in cand_names if len(cn) > 3):
                gemini_boost = 0.25

        vision_boost = 0.0
        if google_vision_data and google_vision_data.get("available") and google_vision_data.get("status") == "success":
            v_names = [vn.lower() for vn in google_vision_data.get("candidate_names", [])]
            if any(candidate_name_lower in vn or vn in candidate_name_lower for vn in v_names if len(vn) > 3):
                vision_boost = 0.25

        # Weighted Visual Score
        # Bound similarities between 0 and 1 for scoring
        bounded_dinov2 = max(0.0, dinov2_sim)
        bounded_clip = max(0.0, clip_sim)
        bounded_orb = min(1.0, ransac_inliers / 30.0)

        # Dynamically normalize weights across active visual feature extractors
        active_weights = 0.0
        weighted_visual_sum = 0.0
        if query_dinov2_feat is not None:
            active_weights += 0.50
            weighted_visual_sum += 0.50 * bounded_dinov2
        if query_clip_feat is not None:
            active_weights += 0.35
            weighted_visual_sum += 0.35 * bounded_clip
        # OpenCV ORB is always active and lightweight
        active_weights += 0.15
        weighted_visual_sum += 0.15 * bounded_orb

        visual_score = (weighted_visual_sum / active_weights) if active_weights > 0 else 0.0
        composite_score = min(1.0, visual_score + ocr_boost + gps_boost + gemini_boost + vision_boost)

        # Formulate human-readable ranking evidence breakdown
        evidence_breakdown: List[str] = []
        if query_dinov2_feat is not None:
            evidence_breakdown.append(f"DINOv2 structural similarity: {dinov2_sim:.3f}")
        if query_clip_feat is not None:
            evidence_breakdown.append(f"CLIP visual-semantic similarity: {clip_sim:.3f}")
        evidence_breakdown.append(f"OpenCV geometric keypoint inliers: {ransac_inliers} ({structural_agreement})")
        if ocr_boost > 0:
            evidence_breakdown.append("Supporting Evidence: Recognized candidate name/sign in visible OCR text (+0.25).")
        if gps_boost > 0:
            evidence_breakdown.append(f"Supporting Evidence: Located within {dist:.1f} km of EXIF GPS coordinates (+{gps_boost:.2f}).")
        if gemini_boost > 0:
            evidence_breakdown.append("Supporting Evidence: Confirmed by Gemini background visual reasoning (+0.25).")
        if vision_boost > 0:
            evidence_breakdown.append("Supporting Evidence: Confirmed by Google Cloud Vision online image detection (+0.25).")

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

    # Sort descending by composite score, then by DINOv2 similarity, then by OpenCV inliers
    ranked_candidates.sort(
        key=lambda x: (x["composite_rank_score"], x["dinov2_structural_similarity"], x["opencv_feature_inliers"]),
        reverse=True,
    )

    # Assign sequential ranks
    for idx, c in enumerate(ranked_candidates):
        c["rank"] = idx + 1

    return ranked_candidates

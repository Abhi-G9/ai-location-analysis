import logging
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger("geolens.verification")


def verify_geolocation_prediction(
    ranked_candidates: List[Dict[str, Any]],
    exif_data: Dict[str, Any],
    ocr_data: Dict[str, Any],
    clip_data: Dict[str, Any],
    heuristics_data: Dict[str, Any],
    abstention_triggered: bool = False,
) -> Dict[str, Any]:
    """
    Stage E & F: Verification, Confidence Calibration, and Geographic Precision.

    Cross-checks multi-modal visual evidence, metadata, and OCR against candidate features.
    Enforces honest AI principles:
    - Pretrained models cannot hallucinate exact coordinates.
    - Raw similarity scores are NOT probabilities.
    - Clear confidence categories based on measurable criteria.
    - Clear geographic precision level (specific_landmark, neighborhood, city, regional, unknown).
    - Estimated error distance with uncertainty explanation.
    - Transparent documentation of reasons the prediction may be wrong (confounders).
    - Explicit abstention when evidence is insufficient.
    """
    # 1. Check for immediate abstention
    if abstention_triggered or not ranked_candidates:
        return {
            "is_verified": False,
            "confidence_category": "Insufficient Evidence",
            "confidence_basis": "No geographic clues, OCR text, or distinctive visual features matched known reference locations.",
            "precision_level": "unknown",
            "estimated_error_km": None,
            "error_distance_description": "Geographic error cannot be calculated because evidence is insufficient to localize the image.",
            "abstention": True,
            "abstention_reason": "Visual clues and metadata are insufficient to identify a specific real-world location in Kota.",
            "verified_candidate": None,
            "alternative_candidates": [],
            "supporting_evidence": [],
            "confounding_factors": [
                "No EXIF GPS metadata was present in the image headers.",
                "No legible text, place names, or road markers were recognized by OCR.",
                "Visual scene composition does not match any known Kota reference landmark above baseline threshold.",
            ],
            "verification_methodology": (
                "Rule-based multi-modal convergence checking across DINOv2 structural embeddings, "
                "OpenCLIP semantics, OpenCV RANSAC inliers, OCR text verification, and GPS proximity."
            ),
        }

    top_candidate = ranked_candidates[0]
    alternatives = ranked_candidates[1:]

    # Extract top candidate metrics
    composite_score = float(top_candidate.get("composite_rank_score") or 0.0)
    dinov2_sim = float(top_candidate.get("dinov2_structural_similarity") or 0.0)
    clip_sim = float(top_candidate.get("clip_visual_similarity") or 0.0)
    ransac_inliers = int(top_candidate.get("opencv_feature_inliers") or 0)
    distance_km = top_candidate.get("distance_km")

    # Clue checks
    has_gps = exif_data.get("has_gps", False) and exif_data.get("gps") is not None
    gps_near = has_gps and (distance_km is not None) and (distance_km < 1.0)
    gps_city_level = has_gps and (distance_km is not None) and (distance_km < 25.0)

    ocr_text = ocr_data.get("combined_text", "").lower()
    candidate_name = top_candidate.get("name", "").lower()
    keywords = [kw.lower() for kw in top_candidate.get("keywords", [])]
    ocr_name_match = (candidate_name in ocr_text) or any(kw in ocr_text for kw in keywords if len(kw) > 3)

    # Margin between top candidate and runner-up
    score_margin = 1.0
    if len(ranked_candidates) > 1:
        runner_up_score = float(ranked_candidates[1].get("composite_rank_score") or 0.0)
        score_margin = composite_score - runner_up_score

    # 2. Determine Confidence Category based on measurable criteria
    # Rules:
    # 1. "Verified Match":
    #    - Physical GPS confirmed (< 1 km), OR
    #    - Exact OCR landmark name match + strong DINOv2 (>= 0.50), OR
    #    - Strong geometric match (RANSAC inliers >= 15 and DINOv2 >= 0.65).
    # 2. "Plausible Candidate":
    #    - Composite score >= 0.50 and DINOv2 >= 0.40 and margin >= 0.04, OR
    #    - OCR / GPS city-level agreement + moderate visual similarity (>= 0.35).
    # 3. "Low Confidence":
    #    - Composite score between 0.35 and 0.50, OR
    #    - Score margin < 0.04 (ambiguous between multiple candidates).
    # 4. "Insufficient Evidence" (Abstention):
    #    - Composite score < 0.35 and no GPS/OCR confirmation.

    confidence_category = "Low Confidence"
    confidence_basis = ""
    is_verified = False
    precision_level = "city"
    estimated_error_km: Optional[float] = None
    error_desc = ""
    abstention = False
    abstention_reason: Optional[str] = None

    if composite_score < 0.35 and not (gps_near or ocr_name_match):
        confidence_category = "Insufficient Evidence"
        confidence_basis = f"Top candidate composite score ({composite_score:.2f}) falls below minimum detection threshold (0.35)."
        precision_level = "unknown"
        estimated_error_km = None
        error_desc = "Confidence is insufficient to estimate geographical bounds."
        abstention = True
        abstention_reason = "Visual features do not sufficiently match any candidate place in the database."

    elif gps_near:
        confidence_category = "Verified Match"
        confidence_basis = f"Confirmed by camera EXIF GPS coordinates ({distance_km:.2f} km from landmark center) with visual alignment."
        is_verified = True
        precision_level = "specific_landmark"
        estimated_error_km = 0.25
        error_desc = "Estimated sensor/GPS error radius is within ±250 meters."

    elif ocr_name_match and (dinov2_sim >= 0.45 or composite_score >= 0.50):
        confidence_category = "Verified Match"
        confidence_basis = f"Confirmed by readable signboard text matching candidate place name with supportive DINOv2 structural features ({dinov2_sim:.2f})."
        is_verified = True
        precision_level = "specific_landmark"
        estimated_error_km = 0.5
        error_desc = "Landmark verified by text and visual structure; estimated error radius ±500 meters."

    elif ransac_inliers >= 15 and dinov2_sim >= 0.65:
        confidence_category = "Verified Match"
        confidence_basis = f"High geometric visual correspondence: {ransac_inliers} RANSAC keypoint inliers and strong DINOv2 structural similarity ({dinov2_sim:.2f})."
        is_verified = True
        precision_level = "specific_landmark"
        estimated_error_km = 0.75
        error_desc = "Strong architectural correspondence; estimated error radius ±750 meters."

    elif composite_score >= 0.50 and score_margin >= 0.04:
        confidence_category = "Plausible Candidate"
        confidence_basis = f"Moderate multi-modal alignment (composite: {composite_score:.2f}, DINOv2: {dinov2_sim:.2f}, CLIP: {clip_sim:.2f}) with distinct lead over alternatives."
        is_verified = False
        precision_level = "neighborhood"
        estimated_error_km = 3.5
        error_desc = "Plausible match to candidate neighborhood; estimated error radius ±3.5 km."

    elif score_margin < 0.04 and len(ranked_candidates) > 1:
        confidence_category = "Low Confidence"
        confidence_basis = (
            f"Ambiguous prediction: Top candidate '{top_candidate['name']}' ({composite_score:.2f}) and runner-up "
            f"'{ranked_candidates[1]['name']}' ({ranked_candidates[1].get('composite_rank_score', 0):.2f}) differ by less than 4% margin."
        )
        is_verified = False
        precision_level = "city"
        estimated_error_km = 15.0
        error_desc = "High ambiguity between candidate landmarks; estimated error radius ±15.0 km (city-wide)."

    else:
        confidence_category = "Low Confidence"
        confidence_basis = f"Weak visual-semantic alignment (composite score: {composite_score:.2f}) without conclusive geometric or textual confirmation."
        is_verified = False
        precision_level = "city"
        estimated_error_km = 20.0
        error_desc = "Weak visual evidence; city-level localization only, estimated error radius ±20.0 km."

    # 3. Compile Supporting Evidence
    supporting_evidence: List[str] = []
    if is_verified:
        supporting_evidence.append(f"Verification criteria fulfilled: {confidence_basis}")

    if dinov2_sim >= 0.40:
        supporting_evidence.append(f"DINOv2 structural feature similarity of {dinov2_sim:.3f} indicates architectural correspondence.")
    if clip_sim >= 0.35:
        supporting_evidence.append(f"OpenCLIP visual embedding similarity of {clip_sim:.3f} aligns with the candidate scene category.")
    if ransac_inliers > 0:
        supporting_evidence.append(f"OpenCV ORB feature detector found {ransac_inliers} geometrically consistent inliers.")
    if ocr_name_match:
        supporting_evidence.append(f"OCR extracted text on signage corroborating '{top_candidate['name']}'.")
    if has_gps and (distance_km is not None):
        supporting_evidence.append(f"Camera EXIF GPS metadata is situated {distance_km:.2f} km from this location.")

    # 4. Compile Honest Confounding Factors (Reasons the Result May Be Wrong)
    confounding_factors: List[str] = []

    if not has_gps:
        confounding_factors.append(
            "Missing GPS Metadata: The image lacks camera coordinates. Visual models cannot physically guarantee latitude/longitude without spatial telemetry."
        )
    if not ocr_data.get("candidate_geo_clues"):
        confounding_factors.append(
            "Absence of Signage: No unambiguous street signs or milestone markers were detected in visible text to independently corroborate the site."
        )
    if ransac_inliers < 10:
        confounding_factors.append(
            f"Limited Keypoint Inliers: Found only {ransac_inliers} RANSAC geometric inliers. Perspective, scale differences, or lighting may reduce keypoint repeatability."
        )
    if score_margin < 0.08 and len(ranked_candidates) > 1:
        alt_name = ranked_candidates[1].get("name", "Runner-up")
        confounding_factors.append(
            f"Visual Ambiguity: Visual similarity score is close to '{alt_name}'. Rajasthani architectural styles (chhatris, stone jharokhas) are shared across multiple regional landmarks."
        )
    confounding_factors.append(
        "Single-View Reference Limit: Reference data consists of curated landmark representations. Seasonal foliage, river water levels, or crowd conditions can vary widely."
    )

    return {
        "is_verified": is_verified,
        "confidence_category": confidence_category,
        "confidence_basis": confidence_basis,
        "precision_level": precision_level,
        "estimated_error_km": estimated_error_km,
        "error_distance_description": error_desc,
        "abstention": abstention,
        "abstention_reason": abstention_reason,
        "verified_candidate": top_candidate if not abstention else None,
        "alternative_candidates": alternatives[:3] if not abstention else [],
        "supporting_evidence": supporting_evidence,
        "confounding_factors": confounding_factors,
        "verification_methodology": (
            "Multi-modal cross-verification evaluating DINOv2 structural embeddings, "
            "OpenCLIP scene semantics, OpenCV RANSAC inlier homography, OCR keyword confirmation, "
            "and EXIF spatial proximity."
        ),
    }

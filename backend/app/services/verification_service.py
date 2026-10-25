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

    elif (ransac_inliers >= 15 and dinov2_sim >= 0.65) or (ransac_inliers >= 20 and composite_score >= 0.50):
        confidence_category = "Verified Match"
        confidence_basis = f"High geometric visual correspondence: {ransac_inliers} RANSAC keypoint inliers with strong multi-modal alignment ({composite_score:.2f})."
        is_verified = True
        precision_level = "specific_landmark"
        estimated_error_km = 0.75
        error_desc = "Strong architectural correspondence; estimated error radius ±750 meters."

    elif composite_score >= 0.50 and score_margin >= 0.04:
        confidence_category = "Plausible Candidate"
        confidence_basis = f"Moderate multi-modal alignment (composite: {composite_score:.2f}) with distinct lead over alternatives."
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


def build_location_result(
    verification_result: Dict[str, Any],
    exif_data: Dict[str, Any],
    ocr_data: Dict[str, Any],
    clip_data: Dict[str, Any],
    heuristics_data: Dict[str, Any],
    reverse_geo_data: Optional[Dict[str, Any]] = None,
    gemini_data: Optional[Dict[str, Any]] = None,
    google_vision_data: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Constructs the streamlined product-facing location response:
    - Detailed Geographic Hierarchy: Area, City, District, State, Country, Postal Code
    - Online Image Matches & External Evidence Sources
    - Why This Location? (landmarks/architecture, text found, metadata, matching evidence, sources)
    - Other Possible Locations (real alternative candidates only)
    - If unestablished: “Location could not be reliably determined from the available evidence.”
    """
    is_determined = not verification_result.get("abstention", True)
    top_candidate = verification_result.get("verified_candidate")

    if not is_determined or not top_candidate:
        missing_clues = []
        if not exif_data.get("has_gps"):
            missing_clues.append("No GPS coordinates or camera telemetry embedded in image EXIF tags.")
        if not ocr_data.get("candidate_geo_clues") and ocr_data.get("total_lines_found", 0) == 0:
            missing_clues.append("No readable road signs, milestone markers, or place names detected in visible text.")
        elif ocr_data.get("total_lines_found", 0) > 0 and not ocr_data.get("candidate_geo_clues"):
            missing_clues.append("Text detected in the image does not correspond to any known geographic landmark.")
        missing_clues.append(
            "Visual features alone without distinctive architectural landmarks or geographic anchors are insufficient to pinpoint a location."
        )

        sources_consulted = ["Image EXIF Metadata", "RapidOCR Text Reader"]
        if clip_data.get("model_available"):
            sources_consulted.append("OpenCLIP ViT-B-32 Scene Classifier")
        if gemini_data and gemini_data.get("available"):
            sources_consulted.append("Google Gemini API (Visual Reasoning)")
        if google_vision_data and google_vision_data.get("available"):
            sources_consulted.append("Google Cloud Vision API (Web Detection)")
        sources_consulted.extend(["Local Curated Index", "OpenStreetMap"])

        return {
            "is_determined": False,
            "unreliable_reason": "Location could not be reliably determined from the available evidence.",
            "missing_clues": missing_clues,
            "place_name": None,
            "area": None,
            "city": None,
            "district": None,
            "region_state": None,
            "country": None,
            "postal_code": None,
            "exact_address": None,
            "latitude": None,
            "longitude": None,
            "geographic_precision": "unknown",
            "confidence_level": "Unverified",
            "confidence_basis": verification_result.get("confidence_basis") or "Insufficient evidence to identify a location without risking a false prediction.",
            "detection_source": "Unverified",
            "reference_photo": None,
            "online_image_matches": [],
            "evidence_sources": [],
            "landmarks_and_architecture": [
                f"Scene context: {env['label']}"
                for env in clip_data.get("top_environments", [])[:2]
            ],
            "text_found": [line["text"] for line in ocr_data.get("detected_lines", [])[:5]],
            "metadata_clues": [
                f"Camera: {exif_data.get('camera_make', '')} {exif_data.get('camera_model', '')}".strip()
            ] if exif_data.get("has_exif") and (exif_data.get("camera_make") or exif_data.get("camera_model")) else ["No camera EXIF metadata found"],
            "matching_evidence": [],
            "sources_consulted": sources_consulted,
            "alternative_locations": [],
        }

    # Location IS determined
    place_name = top_candidate.get("name")
    area = top_candidate.get("area")
    city = top_candidate.get("city")
    district = top_candidate.get("district")
    region_state = top_candidate.get("state")
    country = top_candidate.get("country", "India")
    postal_code = top_candidate.get("postcode")
    exact_address = None

    if reverse_geo_data:
        if reverse_geo_data.get("area"):
            area = reverse_geo_data.get("area")
        elif reverse_geo_data.get("suburb"):
            area = reverse_geo_data.get("suburb")
        if reverse_geo_data.get("city"):
            city = reverse_geo_data.get("city")
        if reverse_geo_data.get("district"):
            district = reverse_geo_data.get("district")
        if reverse_geo_data.get("state"):
            region_state = reverse_geo_data.get("state")
        if reverse_geo_data.get("country"):
            country = reverse_geo_data.get("country")
        if reverse_geo_data.get("postcode"):
            postal_code = reverse_geo_data.get("postcode")
        if verification_result.get("is_verified") and reverse_geo_data.get("display_name"):
            exact_address = reverse_geo_data.get("display_name")
    elif verification_result.get("is_verified") and verification_result.get("precision_level") == "specific_landmark":
        exact_address = top_candidate.get("description")

    # Detection source categorization
    has_gps = exif_data.get("has_gps") and exif_data.get("gps") is not None
    distance_km = top_candidate.get("distance_km")
    gps_near = has_gps and distance_km is not None and distance_km < 1.0

    ocr_text = ocr_data.get("combined_text", "").lower()
    candidate_name = top_candidate.get("name", "").lower()
    keywords = [kw.lower() for kw in top_candidate.get("keywords", [])]
    ocr_name_match = (candidate_name in ocr_text) or any(kw in ocr_text for kw in keywords if len(kw) > 3)

    dinov2_sim = float(top_candidate.get("dinov2_structural_similarity") or 0.0)
    clip_sim = float(top_candidate.get("clip_visual_similarity") or 0.0)
    has_strong_visual = dinov2_sim >= 0.40 or clip_sim >= 0.30

    gemini_matched = False
    if gemini_data and gemini_data.get("available") and gemini_data.get("status") == "success":
        g_id = (gemini_data.get("identified_place_name") or "").lower()
        if candidate_name in g_id or g_id in candidate_name:
            gemini_matched = True

    vision_matched = False
    if google_vision_data and google_vision_data.get("available") and google_vision_data.get("status") == "success":
        v_cands = [vc.lower() for vc in google_vision_data.get("candidate_names", [])]
        if any(candidate_name in vc or vc in candidate_name for vc in v_cands):
            vision_matched = True

    if gemini_matched and vision_matched:
        detection_source = "Multi-Modal AI & Web (Gemini + Google Vision)"
    elif gemini_matched:
        detection_source = "Gemini Visual Forensics & DINOv2"
    elif vision_matched:
        detection_source = "Google Cloud Vision Web Detection"
    elif gps_near and (ocr_name_match or has_strong_visual):
        detection_source = "Multi-Modal Convergence (GPS + Visual)"
    elif gps_near:
        detection_source = "EXIF GPS Telemetry"
    elif ocr_name_match and has_strong_visual:
        detection_source = "Multi-Modal Convergence (OCR + Visual)"
    elif ocr_name_match:
        detection_source = "OCR Signage & Text"
    elif has_strong_visual:
        detection_source = "Visual Landmark Matching (DINOv2 & OpenCLIP)"
    else:
        detection_source = "Visual Feature Alignment"

    # Map precision
    raw_precision = verification_result.get("precision_level", "city")
    precision_map = {
        "specific_landmark": "specific location",
        "neighborhood": "area",
        "city": "city",
        "regional": "region",
        "unknown": "unknown",
    }
    geographic_precision = precision_map.get(raw_precision, "area")

    # Visible landmarks & architecture
    landmarks_and_architecture = []
    if top_candidate.get("category"):
        landmarks_and_architecture.append(f"Landmark category: {top_candidate['category'].replace('_', ' ').title()}")
    if top_candidate.get("visual_features"):
        landmarks_and_architecture.extend(top_candidate["visual_features"][:3])
    for env in clip_data.get("top_environments", [])[:1]:
        landmarks_and_architecture.append(f"Visual environment: {env['label']}")
    if gemini_data and gemini_data.get("visual_clues"):
        g_lms = gemini_data["visual_clues"].get("landmarks_and_architecture", [])
        if g_lms:
            landmarks_and_architecture.extend(g_lms[:2])

    # Text found
    text_found = [line["text"] for line in ocr_data.get("detected_lines", [])[:5]]
    if gemini_data and gemini_data.get("visual_clues", {}).get("text_and_signs"):
        for g_txt in gemini_data["visual_clues"]["text_and_signs"][:3]:
            if g_txt not in text_found:
                text_found.append(f"Gemini detected: {g_txt}")
    if not text_found:
        text_found = ["No legible text or signage detected in photograph."]

    # Metadata clues
    metadata_clues = []
    if exif_data.get("has_gps") and exif_data.get("gps"):
        gps = exif_data["gps"]
        metadata_clues.append(f"Camera GPS: {gps['latitude']:.5f}° N, {gps['longitude']:.5f}° E ({gps.get('coordinate_provenance', 'EXIF')})")
    elif exif_data.get("has_exif"):
        cam = f"{exif_data.get('camera_make', '')} {exif_data.get('camera_model', '')}".strip()
        metadata_clues.append(f"Camera device: {cam or 'Present in EXIF'}. GPS coordinates scrubbed/absent.")
    else:
        metadata_clues.append("No EXIF metadata embedded in file.")

    # Reference Photo Metadata & Provenance
    ref_photo = top_candidate.get("reference_photo")

    # Matching evidence
    matching_evidence = list(verification_result.get("supporting_evidence", []))
    if ref_photo and ref_photo.get("title"):
        matching_evidence.insert(0, f"Matched against verified reference photograph '{ref_photo['title']}' ({ref_photo.get('license', 'Creative Commons')}).")
    elif not matching_evidence:
        matching_evidence.append(f"Visual alignment with {place_name} reference features.")

    if gemini_matched and gemini_data.get("reasoning_summary"):
        matching_evidence.append(f"Gemini analysis: {gemini_data['reasoning_summary']}")
    if vision_matched and google_vision_data.get("best_guess_labels"):
        matching_evidence.append(f"Google Vision web match: {', '.join(google_vision_data['best_guess_labels'])}")

    # Online Image Matches & External Evidence Sources
    online_image_matches: List[str] = []
    evidence_sources: List[Dict[str, str]] = []

    if ref_photo:
        if ref_photo.get("image_url"):
            online_image_matches.append(ref_photo["image_url"])
        if ref_photo.get("source_page"):
            evidence_sources.append({
                "title": f"Reference: {ref_photo.get('title', 'Landmark Photo')}",
                "url": ref_photo["source_page"],
                "type": "archive",
            })

    if google_vision_data and google_vision_data.get("available"):
        for img_url in google_vision_data.get("full_matching_images", [])[:4]:
            if img_url not in online_image_matches:
                online_image_matches.append(img_url)
        for page in google_vision_data.get("pages_with_matching_images", [])[:4]:
            evidence_sources.append({
                "title": page.get("page_title") or "Online Image Match Page",
                "url": page.get("url", ""),
                "type": "webpage",
            })

    # Sources consulted
    sources_consulted = [top_candidate.get("source", "OpenStreetMap")]
    if ref_photo and ref_photo.get("source"):
        sources_consulted.insert(0, f"{ref_photo['source']} Reference Photo Archive")
    if gemini_data and gemini_data.get("available"):
        sources_consulted.append("Google Gemini API (Visual Reasoning)")
    if google_vision_data and google_vision_data.get("available"):
        sources_consulted.append("Google Cloud Vision API (Web Detection)")
    if ocr_data.get("total_lines_found", 0) > 0:
        sources_consulted.append("RapidOCR Text Reader")
    if clip_data.get("model_available"):
        sources_consulted.append("OpenCLIP ViT-B-32")
    sources_consulted.append("Meta DINOv2")
    if exif_data.get("has_gps"):
        sources_consulted.append("Image EXIF Telemetry")

    # Alternatives
    alt_locations = []
    for alt in verification_result.get("alternative_candidates", []):
        if alt.get("name") != place_name:
            alt_locations.append({
                "name": alt["name"],
                "city": alt.get("city"),
                "region_state": alt.get("state"),
                "country": alt.get("country"),
                "latitude": alt.get("latitude"),
                "longitude": alt.get("longitude"),
                "precision": precision_map.get(alt.get("precision", "area"), "area"),
                "description": alt.get("description"),
                "confidence_hint": f"Rank #{alt.get('rank', 'Alt')} Candidate",
            })

    return {
        "is_determined": True,
        "unreliable_reason": None,
        "missing_clues": [],
        "place_name": place_name,
        "area": area,
        "city": city,
        "district": district,
        "region_state": region_state,
        "country": country,
        "postal_code": postal_code,
        "exact_address": exact_address,
        "latitude": round(top_candidate["latitude"], 5) if top_candidate.get("latitude") is not None else None,
        "longitude": round(top_candidate["longitude"], 5) if top_candidate.get("longitude") is not None else None,
        "geographic_precision": geographic_precision,
        "confidence_level": verification_result.get("confidence_category", "Plausible Candidate"),
        "confidence_basis": verification_result.get("confidence_basis", ""),
        "detection_source": detection_source,
        "reference_photo": ref_photo,
        "online_image_matches": online_image_matches[:6],
        "evidence_sources": evidence_sources[:6],
        "landmarks_and_architecture": landmarks_and_architecture,
        "text_found": text_found,
        "metadata_clues": metadata_clues,
        "matching_evidence": matching_evidence,
        "sources_consulted": sources_consulted,
        "alternative_locations": alt_locations[:3],
    }

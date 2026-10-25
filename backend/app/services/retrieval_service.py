import logging
from typing import Any, Dict, List, Optional
from backend.app.services.geo_provider import get_geo_provider

logger = logging.getLogger("geolens.retrieval")


def retrieve_candidate_locations(
    exif_data: Dict[str, Any],
    ocr_data: Dict[str, Any],
    clip_data: Dict[str, Any],
    gemini_data: Optional[Dict[str, Any]] = None,
    google_vision_data: Optional[Dict[str, Any]] = None,
    max_candidates: int = 5,
) -> Dict[str, Any]:
    """
    Retrieve candidate places from the geographic database using multi-modal clues.
    Separates candidate retrieval from candidate ranking.

    Retrieval Signals:
    1. EXIF GPS Signal: Retrieves landmarks within spatial proximity if coordinates exist.
    2. OCR Signage Signal: Matches detected text strings, highway numbers, and landmark names.
    3. CLIP Semantic Signal: Retrieves places that share architectural or environmental categories.
    4. Gemini Visual Analysis Signal: Identifies specific landmarks, architecture, and background clues.
    5. Google Cloud Vision Web Detection Signal: Matches web entities, best guess labels, and landmark annotations.

    Guarantees:
    - Never fabricates candidates to fill empty lists.
    - Explicitly tags the retrieval reason and matched clues behind every retrieved candidate.
    """
    provider = get_geo_provider()
    candidate_map: Dict[str, Dict[str, Any]] = {}

    # 1. Signal A: EXIF GPS proximity retrieval
    has_gps = exif_data.get("has_gps", False)
    if has_gps and exif_data.get("gps"):
        lat = exif_data["gps"]["latitude"]
        lon = exif_data["gps"]["longitude"]
        spatial_candidates = provider.get_candidates_by_coordinates(lat, lon, radius_km=30.0)

        for place in spatial_candidates:
            place_id = place["id"]
            dist_km = place.get("distance_km", 0.0)
            reason = f"Within {dist_km:.1f} km of EXIF GPS coordinates ({lat:.4f}, {lon:.4f})"
            if place_id not in candidate_map:
                candidate_map[place_id] = {
                    **place,
                    "retrieval_reasons": [reason],
                    "matched_clues": ["EXIF GPS Proximity"],
                }
            else:
                candidate_map[place_id]["retrieval_reasons"].append(reason)
                candidate_map[place_id]["matched_clues"].append("EXIF GPS Proximity")

    # 2. Signal B: OCR Text and Signage keyword retrieval
    keywords_to_query: List[str] = []
    keywords_to_query.extend(ocr_data.get("candidate_geo_clues", []))
    for line in ocr_data.get("detected_lines", []):
        text = line.get("text", "").strip()
        if 3 <= len(text) <= 80:
            keywords_to_query.append(text)
            for w in text.split():
                clean_w = w.strip(".,;:!-#'\"()").lower()
                if len(clean_w) >= 3 and clean_w not in ["the", "and", "for", "with"]:
                    keywords_to_query.append(clean_w)

    if keywords_to_query:
        keyword_candidates = provider.get_candidates_by_keywords(keywords_to_query)
        for place in keyword_candidates:
            place_id = place["id"]
            reason = f"Matched text keywords: {', '.join(keywords_to_query[:3])}"
            if place_id not in candidate_map:
                candidate_map[place_id] = {
                    **place,
                    "retrieval_reasons": [reason],
                    "matched_clues": ["Visible Text / OCR"],
                }
            else:
                candidate_map[place_id]["retrieval_reasons"].append(reason)
                candidate_map[place_id]["matched_clues"].append("Visible Text / OCR")

    # 3. Signal C: Gemini Visual Analysis
    if gemini_data and gemini_data.get("available") and gemini_data.get("status") == "success":
        gemini_keywords: List[str] = []
        if gemini_data.get("identified_place_name"):
            gemini_keywords.append(gemini_data["identified_place_name"])
        for cand in gemini_data.get("candidate_places", []):
            if cand.get("name"):
                gemini_keywords.append(cand["name"])

        if gemini_keywords:
            gemini_candidates = provider.get_candidates_by_keywords(gemini_keywords)
            for place in gemini_candidates:
                place_id = place["id"]
                reason = f"Gemini Visual Clue: {gemini_data.get('reasoning_summary') or 'Visual background analysis'}"
                if place_id not in candidate_map:
                    candidate_map[place_id] = {
                        **place,
                        "retrieval_reasons": [reason],
                        "matched_clues": ["Gemini Visual Analysis"],
                    }
                else:
                    candidate_map[place_id]["retrieval_reasons"].append(reason)
                    candidate_map[place_id]["matched_clues"].append("Gemini Visual Analysis")

    # 4. Signal D: Google Cloud Vision Web Detection & Landmarks
    if google_vision_data and google_vision_data.get("available") and google_vision_data.get("status") == "success":
        vision_keywords = list(google_vision_data.get("candidate_names", []))
        if vision_keywords:
            vision_candidates = provider.get_candidates_by_keywords(vision_keywords)
            for place in vision_candidates:
                place_id = place["id"]
                reason = f"Google Cloud Vision Web match: {', '.join(vision_keywords[:2])}"
                if place_id not in candidate_map:
                    candidate_map[place_id] = {
                        **place,
                        "retrieval_reasons": [reason],
                        "matched_clues": ["Google Cloud Vision Web Detection"],
                    }
                else:
                    candidate_map[place_id]["retrieval_reasons"].append(reason)
                    candidate_map[place_id]["matched_clues"].append("Google Cloud Vision Web Detection")

    # 5. Signal E: OpenCLIP Semantic Category retrieval
    top_environments = clip_data.get("top_environments", [])
    if top_environments:
        has_other_signals = bool(candidate_map) or bool(keywords_to_query)
        clip_threshold = 0.20 if has_other_signals else 0.24

        for env in top_environments[:2]:
            sim = env.get("cosine_similarity", 0.0)
            if sim >= clip_threshold:
                cat_candidates = provider.get_candidates_by_category(env["label"])
                for place in cat_candidates:
                    place_id = place["id"]
                    reason = f"Matched visual environment: '{env['label']}' (sim: {sim:.2f})"
                    if place_id not in candidate_map:
                        candidate_map[place_id] = {
                            **place,
                            "retrieval_reasons": [reason],
                            "matched_clues": [f"CLIP Semantic ({env['label']})"],
                        }
                    else:
                        candidate_map[place_id]["retrieval_reasons"].append(reason)
                        candidate_map[place_id]["matched_clues"].append(f"CLIP Semantic ({env['label']})")

    # Convert to list
    retrieved_list = list(candidate_map.values())

    # Sort candidates by number of independent matching clue signals
    retrieved_list.sort(key=lambda c: len(c.get("matched_clues", [])), reverse=True)

    # Trim to max_candidates
    final_candidates = retrieved_list[:max_candidates]

    if final_candidates:
        status_message = (
            f"Retrieved {len(final_candidates)} candidate location(s) from the Kota, Rajasthan database "
            f"matching {len(candidate_map)} clue signal(s)."
        )
    else:
        status_message = (
            "No candidate locations in the Kota, Rajasthan database matched the extracted visual or textual clues. "
            "The system abstains from inventing unverified locations."
        )

    return {
        "dataset_scope": "Kota, Rajasthan, India",
        "total_database_places": len(provider.get_all_candidates()),
        "candidates_retrieved_count": len(final_candidates),
        "candidates": final_candidates,
        "abstention": len(final_candidates) == 0,
        "message": status_message,
    }

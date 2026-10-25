import base64
import logging
import os
from typing import Any, Dict, List, Optional
import httpx

from backend.app.core.config import settings

logger = logging.getLogger("geolens.google_vision")

VISION_REST_URL = "https://vision.googleapis.com/v1/images:annotate"


async def detect_web_and_landmarks(
    image_bytes: bytes,
    timeout_sec: float = 20.0,
) -> Dict[str, Any]:
    """
    Integrates official Google Cloud Vision API for Web Detection and Landmark Detection.
    Separate from Gemini.
    
    Supports:
    1. GOOGLE_VISION_API_KEY in backend/.env (via Google Cloud Vision REST API).
    2. GOOGLE_APPLICATION_CREDENTIALS service account path in backend/.env.
    
    Returns online image matches, matching webpages, web entities, and Google landmark records.
    """
    if not getattr(settings, "ENABLE_GOOGLE_VISION", False):
        logger.info("Google Cloud Vision is disabled via ENABLE_GOOGLE_VISION=False; skipping web detection.")
        return {
            "available": False,
            "status": "disabled",
            "message": "Google Cloud Vision is disabled.",
            "web_entities": [],
            "full_matching_images": [],
            "partial_matching_images": [],
            "pages_with_matching_images": [],
            "visually_similar_images": [],
            "best_guess_labels": [],
            "landmarks_detected": [],
            "candidate_names": [],
        }

    vision_key = settings.GOOGLE_VISION_API_KEY
    creds_path = settings.GOOGLE_APPLICATION_CREDENTIALS or os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")

    # If neither credential option is configured, report honest unconfigured status
    if not (vision_key and vision_key.strip()) and not (creds_path and os.path.exists(creds_path)):
        logger.info("Google Cloud Vision API is not configured; skipping web detection.")
        return {
            "available": False,
            "status": "unconfigured",
            "message": "Google Cloud Vision API is not configured. Add GOOGLE_VISION_API_KEY or GOOGLE_APPLICATION_CREDENTIALS in backend/.env to enable online image web detection.",
            "web_entities": [],
            "full_matching_images": [],
            "partial_matching_images": [],
            "pages_with_matching_images": [],
            "visually_similar_images": [],
            "best_guess_labels": [],
            "landmarks_detected": [],
            "candidate_names": [],
        }

    # 1. Try Service Account Client if GOOGLE_APPLICATION_CREDENTIALS is valid
    if creds_path and os.path.exists(creds_path):
        try:
            from google.cloud import vision

            client = vision.ImageAnnotatorClient()
            image = vision.Image(content=image_bytes)

            response = client.annotate_image({
                "image": image,
                "features": [
                    {"type_": vision.Feature.Type.WEB_DETECTION, "max_results": 15},
                    {"type_": vision.Feature.Type.LANDMARK_DETECTION, "max_results": 10},
                ],
            })

            return _parse_sdk_response(response)
        except Exception as exc:
            logger.info("google-cloud-vision SDK client failed: %s. Falling back to REST API.", exc)

    # 2. REST API with GOOGLE_VISION_API_KEY
    if vision_key and vision_key.strip():
        b64_content = base64.b64encode(image_bytes).decode("utf-8")
        payload = {
            "requests": [
                {
                    "image": {"content": b64_content},
                    "features": [
                        {"type": "WEB_DETECTION", "maxResults": 15},
                        {"type": "LANDMARK_DETECTION", "maxResults": 10},
                    ],
                }
            ]
        }

        return await _call_vision_rest_api(payload, vision_key, timeout_sec)

    return {
        "available": False,
        "status": "unconfigured",
        "message": "Neither GOOGLE_VISION_API_KEY nor valid GOOGLE_APPLICATION_CREDENTIALS found.",
        "web_entities": [],
        "full_matching_images": [],
        "partial_matching_images": [],
        "pages_with_matching_images": [],
        "visually_similar_images": [],
        "best_guess_labels": [],
        "landmarks_detected": [],
        "candidate_names": [],
    }


async def _call_vision_rest_api(payload: Dict[str, Any], vision_key: str, timeout_sec: float = 25.0) -> Dict[str, Any]:
    url = f"{VISION_REST_URL}?key={vision_key.strip()}"

    try:
        async with httpx.AsyncClient(timeout=timeout_sec) as http_client:
            resp = await http_client.post(url, json=payload)
            if resp.status_code == 429:
                return {
                    "available": False,
                    "status": "rate_limited",
                    "message": "Google Cloud Vision API quota exceeded (HTTP 429).",
                    "web_entities": [],
                    "full_matching_images": [],
                    "partial_matching_images": [],
                    "pages_with_matching_images": [],
                    "visually_similar_images": [],
                    "best_guess_labels": [],
                    "landmarks_detected": [],
                    "candidate_names": [],
                }
            elif resp.status_code == 403:
                return {
                    "available": False,
                    "status": "billing_or_auth_required",
                    "message": "Google Cloud Vision API requires billing enabled or API credentials with Vision permissions.",
                    "web_entities": [],
                    "full_matching_images": [],
                    "partial_matching_images": [],
                    "pages_with_matching_images": [],
                    "visually_similar_images": [],
                    "best_guess_labels": [],
                    "landmarks_detected": [],
                    "candidate_names": [],
                }
            elif resp.status_code != 200:
                return {
                    "available": False,
                    "status": f"error_{resp.status_code}",
                    "message": f"Google Cloud Vision API returned HTTP {resp.status_code}: {resp.text[:150]}",
                    "web_entities": [],
                    "full_matching_images": [],
                    "partial_matching_images": [],
                    "pages_with_matching_images": [],
                    "visually_similar_images": [],
                    "best_guess_labels": [],
                    "landmarks_detected": [],
                    "candidate_names": [],
                }

            data = resp.json()
            responses = data.get("responses", [])
            if not responses:
                return {
                    "available": True,
                    "status": "empty",
                    "message": "No annotations returned by Google Cloud Vision.",
                    "web_entities": [],
                    "full_matching_images": [],
                    "partial_matching_images": [],
                    "pages_with_matching_images": [],
                    "visually_similar_images": [],
                    "best_guess_labels": [],
                    "landmarks_detected": [],
                    "candidate_names": [],
                }

            return _parse_rest_response(responses[0])

    except Exception as exc:
        logger.warning("Google Cloud Vision API connection failed: %s", exc)
        return {
            "available": False,
            "status": "network_error",
            "message": f"Failed to connect to Google Cloud Vision API: {exc}",
            "web_entities": [],
            "full_matching_images": [],
            "partial_matching_images": [],
            "pages_with_matching_images": [],
            "visually_similar_images": [],
            "best_guess_labels": [],
            "landmarks_detected": [],
            "candidate_names": [],
        }


def _parse_rest_response(res: Dict[str, Any]) -> Dict[str, Any]:
    """Parses raw REST JSON response from Google Cloud Vision annotate endpoint."""
    web = res.get("webDetection", {})
    landmarks = res.get("landmarkAnnotations", [])

    # 1. Best guess labels
    best_guesses = [
        bg.get("label", "").strip()
        for bg in web.get("bestGuessLabels", [])
        if bg.get("label")
    ]

    # 2. Web entities (filtered for significant descriptions)
    web_entities = []
    candidate_names = []
    for ent in web.get("webEntities", []):
        desc = ent.get("description", "").strip()
        score = round(float(ent.get("score", 0.0)), 4)
        if desc and len(desc) > 2 and desc.lower() not in ["sky", "water", "tree", "plant", "building"]:
            web_entities.append({"description": desc, "score": score, "entity_id": ent.get("entityId", "")})
            if score >= 0.5:
                candidate_names.append(desc)

    for bg in best_guesses:
        if bg and bg not in candidate_names:
            candidate_names.insert(0, bg)

    # 3. Full matching image URLs
    full_matches = [
        img.get("url")
        for img in web.get("fullMatchingImages", [])
        if img.get("url")
    ]

    # 4. Partial matching image URLs
    partial_matches = [
        img.get("url")
        for img in web.get("partialMatchingImages", [])
        if img.get("url")
    ]

    # 5. Pages with matching images
    pages = []
    for page in web.get("pagesWithMatchingImages", []):
        url = page.get("url")
        title = page.get("pageTitle", "")
        if url:
            pages.append({"url": url, "page_title": title})

    # 6. Visually similar images
    similar_images = [
        img.get("url")
        for img in web.get("visuallySimilarImages", [])
        if img.get("url")
    ]

    # 7. Landmarks
    landmarks_detected = []
    for lm in landmarks:
        desc = lm.get("description", "").strip()
        score = round(float(lm.get("score", 0.0)), 4)
        locs = lm.get("locations", [])
        lat = None
        lon = None
        if locs and "latLng" in locs[0]:
            lat = locs[0]["latLng"].get("latitude")
            lon = locs[0]["latLng"].get("longitude")

        if desc:
            landmarks_detected.append({
                "name": desc,
                "score": score,
                "latitude": lat,
                "longitude": lon,
            })
            if desc not in candidate_names:
                candidate_names.insert(0, desc)

    return {
        "available": True,
        "status": "success",
        "message": f"Retrieved {len(web_entities)} web entities and {len(full_matches)} online image matches.",
        "best_guess_labels": best_guesses,
        "web_entities": web_entities,
        "full_matching_images": full_matches[:8],
        "partial_matching_images": partial_matches[:8],
        "pages_with_matching_images": pages[:6],
        "visually_similar_images": similar_images[:8],
        "landmarks_detected": landmarks_detected,
        "candidate_names": candidate_names[:10],
    }


def _parse_sdk_response(response: Any) -> Dict[str, Any]:
    """Parses google-cloud-vision protobuf response object."""
    web = response.web_detection
    landmarks = response.landmark_annotations

    best_guesses = [bg.label.strip() for bg in web.best_guess_labels if bg.label]

    web_entities = []
    candidate_names = []
    for ent in web.web_entities:
        desc = ent.description.strip() if ent.description else ""
        score = round(float(ent.score), 4)
        if desc and len(desc) > 2 and desc.lower() not in ["sky", "water", "tree", "plant", "building"]:
            web_entities.append({"description": desc, "score": score, "entity_id": ent.entity_id})
            if score >= 0.5:
                candidate_names.append(desc)

    for bg in best_guesses:
        if bg and bg not in candidate_names:
            candidate_names.insert(0, bg)

    full_matches = [img.url for img in web.full_matching_images if img.url]
    partial_matches = [img.url for img in web.partial_matching_images if img.url]
    similar_images = [img.url for img in web.visually_similar_images if img.url]

    pages = []
    for page in web.pages_with_matching_images:
        if page.url:
            pages.append({"url": page.url, "page_title": page.page_title or ""})

    landmarks_detected = []
    for lm in landmarks:
        desc = lm.description.strip() if lm.description else ""
        score = round(float(lm.score), 4)
        lat = None
        lon = None
        if lm.locations:
            lat = lm.locations[0].lat_lng.latitude
            lon = lm.locations[0].lat_lng.longitude
        if desc:
            landmarks_detected.append({
                "name": desc,
                "score": score,
                "latitude": lat,
                "longitude": lon,
            })
            if desc not in candidate_names:
                candidate_names.insert(0, desc)

    return {
        "available": True,
        "status": "success",
        "message": f"Retrieved {len(web_entities)} web entities and {len(full_matches)} online image matches.",
        "best_guess_labels": best_guesses,
        "web_entities": web_entities,
        "full_matching_images": full_matches[:8],
        "partial_matching_images": partial_matches[:8],
        "pages_with_matching_images": pages[:6],
        "visually_similar_images": similar_images[:8],
        "landmarks_detected": landmarks_detected,
        "candidate_names": candidate_names[:10],
    }

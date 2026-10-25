import base64
import json
import logging
import re
from typing import Any, Dict, List, Optional
import httpx
from PIL import Image

from backend.app.core.config import settings

logger = logging.getLogger("geolens.gemini")

# Primary and fallback supported multimodal models in Gemini API v1beta
# Verified live against Google Generative Language API
SUPPORTED_MODELS = [
    "gemini-3.5-flash-lite",
    "gemini-flash-lite-latest",
    "gemini-3.5-flash",
    "gemini-3.8-flash",
]

SYSTEM_PROMPT = """You are an expert AI geolocation and computer vision investigator.
Your goal is to detect the real-world geographic location shown in the photograph by analyzing:
1. Primary subject & background architecture (monuments, towers, bridges, domes, gates, temples, palaces, riverfronts, gardens, public parks, building facades, facades).
2. Visible signage, shop names, billboards, road markers, street numbers, vehicle license plates, script/language (Hindi, English, regional scripts).
3. Natural terrain, bodies of water, riverbanks, ghats, cliffs, ravines, trees/vegetation, climate indicators.
4. Urban infrastructure, paving patterns, public park features, boundary designs.

ANALYSIS RULES:
- Identify the most specific geographic location possible from the photograph:
  - If a specific landmark/monument is visible (e.g., Seven Wonders Park, Chambal Riverfront, Kota Barrage, Garh Palace, India Gate, Hawa Mahal, etc.): provide its exact name in "identified_place_name", its city in "city", state in "state_region", and country in "country". Set "is_identifiable": true.
  - If a specific landmark is not 100% certain but the city, district, or region is recognizable from architecture, terrain, or signage: provide the prominent area/neighborhood in "identified_place_name", the city in "city", state in "state_region", and set "is_identifiable": true.
  - Always list 1 to 4 plausible candidate places in "candidate_places" with their name, city, and why they match.
  - In "reasoning_summary", provide a clear, user-friendly 1-2 sentence explanation of the specific visual clues, architectural elements, or background details that led to this location detection.
  - Only set "is_identifiable": false if the image has zero geographic clues (e.g. pure blank screenshot, close-up of a cup/food, or abstract pattern).

Respond with ONLY valid JSON (no markdown formatting, no code fences, no extra text) matching this exact schema:
{
  "is_identifiable": true,
  "confidence_rating": "Verified Match" | "Plausible Candidate" | "Low Confidence" | "Insufficient Evidence",
  "identified_place_name": "Name of landmark or prominent location",
  "city": "City name",
  "state_region": "State/Region",
  "country": "Country name (e.g. India)",
  "reasoning_summary": "Explanation of visual clues and background evidence",
  "candidate_places": [
    {
      "name": "Candidate place name",
      "city": "City",
      "state": "State",
      "country": "Country",
      "relevance_clue": "Why this candidate matches"
    }
  ],
  "visual_clues": {
    "landmarks_and_architecture": ["clue 1"],
    "text_and_signs": ["text detected"],
    "environment_and_terrain": ["terrain clue"],
    "distinctive_features": ["feature"]
  }
}
"""


def _sanitize_message(message: str, api_key: Optional[str] = None) -> str:
    """Sanitizes text by removing raw API keys, query strings, and header secrets."""
    if not message:
        return ""
    if api_key and api_key.strip():
        message = message.replace(api_key.strip(), "[REDACTED_API_KEY]")
    # Redact Google AI Studio / GCP API keys (AIzaSy...)
    message = re.sub(r"AIzaSy[A-Za-z0-9_\-]{33}", "[REDACTED_API_KEY]", message)
    # Redact OAuth / gcloud tokens (AQ....)
    message = re.sub(r"AQ\.[A-Za-z0-9_\-\.]{30,}", "[REDACTED_API_KEY]", message)
    # Redact any url key query params
    message = re.sub(r"key=[^&\s\"'\)]+", "key=[REDACTED_KEY]", message)
    # Redact header secrets
    message = re.sub(r"x-goog-api-key[:=\s]+[^,\s\"'\)]+", "x-goog-api-key: [REDACTED]", message)
    return message


def _clean_json_text(text: str) -> str:
    """Strips markdown code fences and cleans raw JSON text."""
    text = text.strip()
    if text.startswith("```json"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    return text.strip()


def get_gemini_models_to_try() -> List[str]:
    """Returns an ordered, deduplicated list of supported Gemini models to attempt."""
    configured = getattr(settings, "GEMINI_MODEL", "gemini-3.5-flash-lite") or "gemini-3.5-flash-lite"
    configured = configured.strip()
    models = [configured]
    for m in SUPPORTED_MODELS:
        if m not in models:
            models.append(m)
    return models


async def analyze_with_gemini(
    image_bytes: bytes,
    mime_type: str = "image/jpeg",
    timeout_sec: float = 25.0,
) -> Dict[str, Any]:
    """
    Performs visual background and landmark analysis using the official Google Gemini API.
    
    Reads GEMINI_API_KEY from settings (backend/.env).
    Gracefully handles missing keys, quota exhaustion, network timeouts, and model errors.
    Supports automatic model fallback if a configured model returns HTTP 404.
    """
    api_key = settings.GEMINI_API_KEY
    if not api_key or not api_key.strip():
        logger.info("GEMINI_API_KEY is not configured; skipping Gemini visual reasoning.")
        primary_model = get_gemini_models_to_try()[0]
        return {
            "available": False,
            "status": "unconfigured",
            "model": primary_model,
            "message": "Gemini API key is not configured in backend/.env. Add GEMINI_API_KEY to enable AI visual reasoning.",
            "is_identifiable": False,
            "confidence_rating": "Unconfigured",
            "identified_place_name": None,
            "candidate_places": [],
            "visual_clues": {},
            "reasoning_summary": None,
        }

    b64_image = base64.b64encode(image_bytes).decode("utf-8")
    models_to_try = get_gemini_models_to_try()
    primary_model = models_to_try[0]

    # 1. Try official google-genai SDK first if possible
    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key.strip())
        response = await client.aio.models.generate_content(
            model=primary_model,
            contents=[
                types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                types.Part.from_text(text=SYSTEM_PROMPT),
            ],
            config=types.GenerateContentConfig(
                temperature=0.1,
                response_mime_type="application/json",
            ),
        )

        resp_text = response.text or ""
        cleaned = _clean_json_text(resp_text)
        data = json.loads(cleaned)
        data["available"] = True
        data["status"] = "success"
        data["model"] = primary_model
        return data

    except Exception as sdk_exc:
        sanitized_sdk_err = _sanitize_message(str(sdk_exc), api_key)
        logger.info(
            "google-genai SDK call on model '%s' failed: %s. Attempting REST fallback chain.",
            primary_model,
            sanitized_sdk_err,
        )

    # 2. REST API Fallback Chain
    # Note: Google Generative Language REST API expects camelCase 'inlineData' and 'mimeType'
    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {
                        "inlineData": {
                            "mimeType": mime_type,
                            "data": b64_image,
                        }
                    },
                    {
                        "text": SYSTEM_PROMPT,
                    },
                ],
            }
        ],
        "generationConfig": {
            "temperature": 0.1,
            "responseMimeType": "application/json",
        },
    }

    last_error_res = None
    for model_name in models_to_try:
        res = await _call_gemini_rest(payload, api_key, model_name, timeout_sec)
        if res.get("status") == "success":
            return res
        last_error_res = res
        # If the failure is 404 (model not found on endpoint), proceed to try the next model in chain
        if res.get("status") == "error_404":
            logger.info("Model '%s' returned 404 on API endpoint; trying fallback model.", model_name)
            continue
        # For non-404 errors (such as 400 invalid key or 429 quota), don't loop endlessly
        break

    return last_error_res or {
        "available": False,
        "status": "error",
        "model": primary_model,
        "message": "Gemini API request failed across all candidate models.",
        "is_identifiable": False,
        "confidence_rating": "API Error",
        "identified_place_name": None,
        "candidate_places": [],
        "visual_clues": {},
        "reasoning_summary": None,
    }


async def _call_gemini_rest(
    payload: Dict[str, Any],
    api_key: str,
    model: str = "gemini-3.5-flash-lite",
    timeout_sec: float = 25.0,
) -> Dict[str, Any]:
    """
    Executes a direct REST request to Google's Generative Language API.
    Uses 'x-goog-api-key' header instead of query parameter to keep secrets out of URLs.
    """
    clean_key = api_key.strip()
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    headers = {
        "x-goog-api-key": clean_key,
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=timeout_sec) as http_client:
            resp = await http_client.post(url, json=payload, headers=headers)

            if resp.status_code == 429:
                logger.warning("Gemini API rate limit or quota exceeded (HTTP 429) for model '%s'.", model)
                return {
                    "available": False,
                    "status": "rate_limited",
                    "model": model,
                    "message": "Gemini API rate limit exceeded. Check quota in Google AI Studio.",
                    "is_identifiable": False,
                    "confidence_rating": "Rate Limited",
                    "identified_place_name": None,
                    "candidate_places": [],
                    "visual_clues": {},
                    "reasoning_summary": None,
                }
            elif resp.status_code == 404:
                err_text = ""
                try:
                    err_json = resp.json()
                    err_text = err_json.get("error", {}).get("message", "")
                except Exception:
                    err_text = resp.text[:150]
                sanitized_msg = _sanitize_message(err_text, clean_key)
                logger.warning("Gemini API HTTP 404 for model '%s': %s", model, sanitized_msg)
                return {
                    "available": False,
                    "status": "error_404",
                    "model": model,
                    "message": f"Gemini model '{model}' not supported on v1beta endpoint (HTTP 404): {sanitized_msg}",
                    "is_identifiable": False,
                    "confidence_rating": "Model Not Found",
                    "identified_place_name": None,
                    "candidate_places": [],
                    "visual_clues": {},
                    "reasoning_summary": None,
                }
            elif resp.status_code != 200:
                err_text = ""
                try:
                    err_json = resp.json()
                    err_text = err_json.get("error", {}).get("message", "")
                except Exception:
                    err_text = resp.text[:150]
                sanitized_msg = _sanitize_message(err_text, clean_key)
                logger.warning("Gemini API HTTP %s for model '%s': %s", resp.status_code, model, sanitized_msg)
                return {
                    "available": False,
                    "status": f"error_{resp.status_code}",
                    "model": model,
                    "message": f"Gemini API returned HTTP {resp.status_code}: {sanitized_msg}",
                    "is_identifiable": False,
                    "confidence_rating": "API Error",
                    "identified_place_name": None,
                    "candidate_places": [],
                    "visual_clues": {},
                    "reasoning_summary": None,
                }

            result_json = resp.json()
            candidates = result_json.get("candidates", [])
            if not candidates:
                return {
                    "available": True,
                    "status": "empty_response",
                    "model": model,
                    "message": "Gemini generated no response candidates for this image.",
                    "is_identifiable": False,
                    "confidence_rating": "Insufficient Evidence",
                    "identified_place_name": None,
                    "candidate_places": [],
                    "visual_clues": {},
                    "reasoning_summary": None,
                }

            text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "{}")
            cleaned = _clean_json_text(text)
            parsed = json.loads(cleaned)

            parsed["available"] = True
            parsed["status"] = "success"
            parsed["model"] = model

            # Intelligent normalization: ensure Gemini detection always produces an actionable location
            if not parsed.get("identified_place_name") and parsed.get("candidate_places"):
                for cp in parsed["candidate_places"]:
                    if cp.get("name"):
                        parsed["identified_place_name"] = cp["name"]
                        if not parsed.get("city") and cp.get("city"):
                            parsed["city"] = cp["city"]
                        if not parsed.get("state_region") and cp.get("state"):
                            parsed["state_region"] = cp["state"]
                        parsed["is_identifiable"] = True
                        break

            if not parsed.get("identified_place_name") and parsed.get("city"):
                city_name = parsed["city"]
                parsed["identified_place_name"] = f"{city_name} City / Prominent Area"
                parsed["is_identifiable"] = True

            return parsed

    except json.JSONDecodeError as jde:
        logger.warning("Failed to parse Gemini JSON output for model '%s': %s", model, jde)
        return {
            "available": True,
            "status": "parse_error",
            "model": model,
            "message": "Gemini returned non-JSON response.",
            "is_identifiable": False,
            "confidence_rating": "Parse Error",
            "identified_place_name": None,
            "candidate_places": [],
            "visual_clues": {},
            "reasoning_summary": None,
        }
    except Exception as exc:
        sanitized_exc = _sanitize_message(str(exc), clean_key)
        logger.warning("Gemini API execution error: %s", sanitized_exc)
        return {
            "available": False,
            "status": "network_error",
            "model": model,
            "message": f"Network or execution error communicating with Gemini API: {sanitized_exc}",
            "is_identifiable": False,
            "confidence_rating": "Connection Error",
            "identified_place_name": None,
            "candidate_places": [],
            "visual_clues": {},
            "reasoning_summary": None,
        }

import asyncio
from unittest.mock import patch, AsyncMock
import pytest
from fastapi.testclient import TestClient

from backend.app.services.gemini_service import (
    analyze_with_gemini,
    _sanitize_message,
    get_gemini_models_to_try,
)
from backend.app.services.google_vision_service import detect_web_and_landmarks
from backend.app.core.config import settings


def test_gemini_service_unconfigured():
    """Verify Gemini cleanly reports unconfigured status when no API key is present."""
    with patch.object(settings, "GEMINI_API_KEY", ""):
        result = asyncio.run(analyze_with_gemini(b"dummy_image_data"))
        assert result["available"] is False
        assert result["status"] == "unconfigured"
        assert result["is_identifiable"] is False
        assert "not configured" in result["message"]


def test_gemini_service_mocked_success():
    """Verify Gemini parses structured visual clues when mock response is returned."""
    fake_response = {
        "available": True,
        "status": "success",
        "model": "gemini-3.5-flash-lite",
        "is_identifiable": True,
        "confidence_rating": "Verified Match",
        "identified_place_name": "Godavari Riverfront",
        "city": "Nashik",
        "state_region": "Maharashtra",
        "country": "India",
        "reasoning_summary": "Recognized river ghats and sacred bathing steps characteristic of Nashik.",
        "candidate_places": [
            {
                "name": "Ramkund Ghat",
                "city": "Nashik",
                "state": "Maharashtra",
                "country": "India",
                "relevance_clue": "Sacred riverbank structure",
            }
        ],
        "visual_clues": {
            "landmarks_and_architecture": ["River ghats", "Stone steps"],
            "text_and_signs": [],
            "environment_and_terrain": ["River water", "Wide riverbank"],
            "distinctive_features": ["Bathing ghat pavilions"],
        },
    }

    with patch.object(settings, "GEMINI_API_KEY", "fake_gemini_key"):
        with patch("google.genai.Client", side_effect=RuntimeError("SDK disabled for mock test")):
            with patch("backend.app.services.gemini_service._call_gemini_rest", new_callable=AsyncMock, return_value=fake_response):
                result = asyncio.run(analyze_with_gemini(b"dummy_image_data"))
                assert result["available"] is True
                assert result["status"] == "success"
                assert result["model"] == "gemini-3.5-flash-lite"
                assert result["identified_place_name"] == "Godavari Riverfront"
                assert result["city"] == "Nashik"
                assert len(result["candidate_places"]) == 1


def test_gemini_service_fallback_on_404():
    """Verify that when primary model returns 404, the service automatically tries the next supported model."""
    error_404_res = {
        "available": False,
        "status": "error_404",
        "model": "gemini-3.5-flash-lite",
        "message": "Model not found (HTTP 404)",
        "is_identifiable": False,
    }
    fallback_success = {
        "available": True,
        "status": "success",
        "model": "gemini-flash-lite-latest",
        "is_identifiable": True,
        "identified_place_name": "Gateway of India",
        "city": "Mumbai",
    }

    call_count = 0

    async def mock_call_rest(payload, api_key, model, timeout_sec=25.0):
        nonlocal call_count
        call_count += 1
        if model == "gemini-3.5-flash-lite":
            return error_404_res
        return fallback_success

    with patch.object(settings, "GEMINI_API_KEY", "fake_key_12345"):
        with patch("google.genai.Client", side_effect=RuntimeError("SDK fallback")):
            with patch("backend.app.services.gemini_service._call_gemini_rest", side_effect=mock_call_rest):
                result = asyncio.run(analyze_with_gemini(b"dummy_bytes"))
                assert result["status"] == "success"
                assert result["model"] == "gemini-flash-lite-latest"
                assert result["identified_place_name"] == "Gateway of India"
                assert call_count >= 2


def test_gemini_sanitization_never_exposes_key():
    """Verify that error messages and URLs are sanitized to prevent secret leaks."""
    secret_key = "AIzaSyD_TestSecretKey1234567890abc"
    raw_error = f"Error calling https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={secret_key}"
    sanitized = _sanitize_message(raw_error, secret_key)
    assert secret_key not in sanitized
    assert "[REDACTED" in sanitized


def test_vision_service_disabled_by_default():
    """Verify Google Cloud Vision is disabled by default and makes zero network requests."""
    with patch.object(settings, "ENABLE_GOOGLE_VISION", False):
        result = asyncio.run(detect_web_and_landmarks(b"dummy_image_data"))
        assert result["available"] is False
        assert result["status"] == "disabled"
        assert "disabled" in result["message"].lower()
        assert result["web_entities"] == []


def test_vision_service_unconfigured():
    """Verify Google Cloud Vision cleanly returns unconfigured status when enabled but neither key nor creds exist."""
    with patch.object(settings, "ENABLE_GOOGLE_VISION", True):
        with patch.object(settings, "GOOGLE_VISION_API_KEY", ""):
            with patch.object(settings, "GOOGLE_APPLICATION_CREDENTIALS", ""):
                result = asyncio.run(detect_web_and_landmarks(b"dummy_image_data"))
                assert result["available"] is False
                assert result["status"] == "unconfigured"
                assert "not configured" in result["message"]
                assert result["web_entities"] == []


def test_vision_service_mocked_success():
    """Verify Google Cloud Vision returns entities and candidate names when enabled and REST API succeeds."""
    fake_vision_result = {
        "available": True,
        "status": "success",
        "web_entities": [
            {"entity_id": "/m/01c45", "description": "Godavari River", "score": 0.94},
            {"entity_id": "/m/0268r", "description": "Nashik", "score": 0.88},
        ],
        "full_matching_images": ["https://example.com/godavari.jpg"],
        "partial_matching_images": [],
        "pages_with_matching_images": [
            {"url": "https://en.wikipedia.org/wiki/Godavari_River", "page_title": "Godavari River - Wikipedia"}
        ],
        "visually_similar_images": [],
        "best_guess_labels": ["godavari river nashik"],
        "landmarks_detected": [
            {"name": "Ramkund", "score": 0.91, "latitude": 19.9975, "longitude": 73.7898}
        ],
        "candidate_names": ["Godavari River", "Nashik", "godavari river nashik", "Ramkund"],
    }

    with patch.object(settings, "ENABLE_GOOGLE_VISION", True):
        with patch.object(settings, "GOOGLE_VISION_API_KEY", "fake_vision_key"):
            with patch.object(settings, "GOOGLE_APPLICATION_CREDENTIALS", ""):
                with patch("backend.app.services.google_vision_service._call_vision_rest_api", new_callable=AsyncMock, return_value=fake_vision_result):
                    result = asyncio.run(detect_web_and_landmarks(b"dummy_image_data"))
                    assert result["available"] is True
                    assert result["status"] == "success"
                    assert len(result["web_entities"]) == 2
                    assert "Godavari River" in result["candidate_names"]
                    assert len(result["pages_with_matching_images"]) == 1


def test_analyze_endpoint_returns_gemini_and_vision_fields(client: TestClient, valid_jpeg_bytes: bytes):
    """Verify POST /api/v1/analyze includes gemini, google_vision, and new geographic fields in response."""
    files = {"file": ("test_location.jpg", valid_jpeg_bytes, "image/jpeg")}
    response = client.post("/api/v1/analyze", files=files)
    assert response.status_code == 200
    data = response.json()

    # Check top-level multimodal fields
    assert "gemini" in data
    assert "google_vision" in data
    assert "location" in data
    assert data["google_vision"]["available"] is False
    assert data["google_vision"]["status"] == "disabled"

    # Check location hierarchy fields
    loc = data["location"]
    if loc:
        assert "area" in loc
        assert "district" in loc
        assert "postal_code" in loc
        assert "online_image_matches" in loc
        assert "evidence_sources" in loc

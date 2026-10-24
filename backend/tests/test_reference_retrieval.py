import io
import os
from unittest.mock import MagicMock, patch
import pytest
from PIL import Image

from backend.app.core.config import settings
from backend.app.services.image_retrieval_service import (
    download_and_verify_image,
    fetch_mapillary_reference_images,
    fetch_wikimedia_reference_images,
    get_local_reference_photos,
    save_reference_photo_and_metadata,
)
from backend.app.services.ranking_service import rank_candidates
from backend.app.services.reference_store import get_reference_cache
from backend.app.services.verification_service import verify_geolocation_prediction


def test_wikimedia_search_parsing_and_attribution():
    """Verify Wikimedia Commons API query parses metadata and rejects documents."""
    mock_response = {
        "query": {
            "pages": {
                "101": {
                    "title": "File:Historic_Tower.jpg",
                    "imageinfo": [
                        {
                            "url": "https://upload.wikimedia.org/test.jpg",
                            "thumburl": "https://upload.wikimedia.org/thumb.jpg",
                            "width": 800,
                            "height": 600,
                            "descriptionurl": "https://commons.wikimedia.org/wiki/File:Historic_Tower.jpg",
                            "extmetadata": {
                                "Artist": {"value": "<a href='...'>John Doe</a>"},
                                "LicenseShortName": {"value": "CC BY-SA 4.0"},
                                "LicenseUrl": {"value": "https://creativecommons.org/licenses/by-sa/4.0/"},
                                "ImageDescription": {"value": "Historic Clock Tower"},
                            },
                        }
                    ],
                },
                "102": {
                    "title": "File:Unwanted_Document.pdf",  # Must be ignored
                    "imageinfo": [{"url": "https://upload.wikimedia.org/doc.pdf"}],
                },
            }
        }
    }

    with patch("urllib.request.urlopen") as mock_urlopen:
        mock_cm = MagicMock()
        mock_cm.status = 200
        mock_cm.read.return_value = json_bytes(mock_response)
        mock_urlopen.return_value.__enter__.return_value = mock_cm

        results = fetch_wikimedia_reference_images("Clock Tower", limit=3)
        assert len(results) == 1
        res = results[0]
        assert res["title"] == "Historic Tower.jpg"
        assert res["author"] == "John Doe"
        assert res["license"] == "CC BY-SA 4.0"
        assert res["source"] == "Wikimedia Commons"


def test_mapillary_without_token_skips_cleanly():
    """Verify Mapillary skips cleanly with zero errors when client token is unconfigured."""
    with patch.object(settings, "MAPILLARY_CLIENT_TOKEN", None):
        results = fetch_mapillary_reference_images(lat=25.18, lon=75.83, radius_m=200)
        assert results == []


def test_mapillary_with_token_queries_bounding_box():
    """Verify Mapillary formats OAuth header and parses responses when token is configured."""
    mock_payload = {
        "data": [
            {
                "id": "123456789",
                "thumb_1024_url": "https://images.mapillary.com/123456789/thumb-1024.jpg",
                "geometry": {"type": "Point", "coordinates": [75.831, 25.181]},
                "compass_angle": 180.5,
            }
        ]
    }

    with patch.object(settings, "MAPILLARY_CLIENT_TOKEN", "MLY|TEST_TOKEN_123"):
        with patch("urllib.request.urlopen") as mock_urlopen:
            mock_cm = MagicMock()
            mock_cm.status = 200
            mock_cm.read.return_value = json_bytes(mock_payload)
            mock_urlopen.return_value.__enter__.return_value = mock_cm

            results = fetch_mapillary_reference_images(lat=25.18, lon=75.83, radius_m=250)
            assert len(results) == 1
            res = results[0]
            assert res["source"] == "Mapillary v4"
            assert res["license"] == "CC-BY-SA 4.0"
            assert res["latitude"] == 25.181


def test_download_and_verify_rejects_corrupted_images():
    """Verify download_and_verify_image rejects microscopic or corrupted buffers."""
    tiny_bytes = b"tiny"
    with patch("urllib.request.urlopen") as mock_urlopen:
        mock_cm = MagicMock()
        mock_cm.read.return_value = tiny_bytes
        mock_urlopen.return_value.__enter__.return_value = mock_cm

        assert download_and_verify_image("https://example.com/bad.jpg") is None


def test_local_reference_store_godavari_temple():
    """Verify genuine reference assets for Godavari Dham Temple exist with valid provenance."""
    photos = get_local_reference_photos("godavari-dham-temple")
    assert len(photos) >= 1
    primary = photos[0]
    assert "Godavari" in primary["filename"]
    assert os.path.exists(primary["path"])
    assert primary.get("source") == "Wikimedia Commons"
    assert "Bornleeo" in primary.get("author", "")


def test_abstention_on_unrelated_scene():
    """
    Verify that an unrelated indoor or blank scene with low composite similarity (<0.35)
    and no GPS/OCR confirmation triggers honest abstention.
    """
    candidates = [
        {
            "id": "godavari-dham-temple",
            "name": "Godavari Dham Temple",
            "composite_rank_score": 0.12,
            "dinov2_structural_similarity": 0.10,
            "clip_visual_similarity": 0.08,
            "opencv_feature_inliers": 1,
            "distance_km": None,
            "keywords": ["godavari dham", "hanuman"],
        }
    ]
    exif = {"has_gps": False, "gps": None}
    ocr = {"combined_text": "", "detected_lines": [], "candidate_geo_clues": []}
    clip = {"top_environments": [{"label": "Office Interior", "cosine_similarity": 0.40}]}

    verification = verify_geolocation_prediction(
        ranked_candidates=candidates,
        exif_data=exif,
        ocr_data=ocr,
        clip_data=clip,
        heuristics_data={},
    )

    assert verification["abstention"] is True
    assert verification["is_verified"] is False
    assert verification["confidence_category"] == "Insufficient Evidence"
    assert "minimum detection threshold" in verification["confidence_basis"]


def json_bytes(obj) -> bytes:
    import json
    return json.dumps(obj).encode("utf-8")

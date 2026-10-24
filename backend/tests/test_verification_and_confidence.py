import io
import pytest
from fastapi.testclient import TestClient
from PIL import Image

from backend.app.main import app
from backend.app.services.verification_service import verify_geolocation_prediction


@pytest.fixture
def client():
    return TestClient(app)


def test_verified_match_via_gps_confirmation():
    """
    Acceptance test: Candidate backed by close GPS (<1km) is classified as 'Verified Match'
    with 'specific_landmark' precision and tight error bounds.
    """
    mock_candidates = [
        {
            "id": "seven_wonders_park",
            "name": "Seven Wonders Park",
            "category": "urban_park",
            "latitude": 25.1764,
            "longitude": 75.8488,
            "distance_km": 0.15,  # 150 meters away
            "composite_rank_score": 0.72,
            "dinov2_structural_similarity": 0.55,
            "clip_visual_similarity": 0.48,
            "opencv_feature_inliers": 8,
            "keywords": ["seven wonders", "eiffel tower", "kishore sagar"],
        }
    ]
    exif_data = {
        "has_gps": True,
        "gps": {"latitude": 25.1770, "longitude": 75.8490},
    }
    ocr_data = {"combined_text": "", "candidate_geo_clues": []}
    clip_data = {"top_environments": []}
    heuristics_data = {}

    res = verify_geolocation_prediction(
        ranked_candidates=mock_candidates,
        exif_data=exif_data,
        ocr_data=ocr_data,
        clip_data=clip_data,
        heuristics_data=heuristics_data,
    )

    assert res["is_verified"] is True
    assert res["confidence_category"] == "Verified Match"
    assert res["precision_level"] == "specific_landmark"
    assert res["estimated_error_km"] == 0.25
    assert res["abstention"] is False
    assert len(res["supporting_evidence"]) > 0
    assert any("GPS" in ev for ev in res["supporting_evidence"])


def test_verified_match_via_ocr_signage():
    """
    Acceptance test: Candidate supported by readable signage matching the landmark name
    and strong structural DINOv2 features is classified as 'Verified Match'.
    """
    mock_candidates = [
        {
            "id": "garh_palace",
            "name": "Garh Palace",
            "category": "historical_fort",
            "latitude": 25.1834,
            "longitude": 75.8312,
            "composite_rank_score": 0.65,
            "dinov2_structural_similarity": 0.58,
            "clip_visual_similarity": 0.50,
            "opencv_feature_inliers": 6,
            "keywords": ["garh palace", "city palace kota", "hadoti museum"],
        }
    ]
    exif_data = {"has_gps": False, "gps": None}
    ocr_data = {
        "combined_text": "WELCOME TO KOTA GARH PALACE MUSEUM",
        "candidate_geo_clues": ["garh palace", "kota"],
    }
    clip_data = {"top_environments": []}
    heuristics_data = {}

    res = verify_geolocation_prediction(
        ranked_candidates=mock_candidates,
        exif_data=exif_data,
        ocr_data=ocr_data,
        clip_data=clip_data,
        heuristics_data=heuristics_data,
    )

    assert res["is_verified"] is True
    assert res["confidence_category"] == "Verified Match"
    assert res["precision_level"] == "specific_landmark"
    assert res["estimated_error_km"] <= 1.0


def test_verified_match_via_high_ransac_inliers():
    """
    Acceptance test: When distinctive architectural keypoints match reference image with
    >= 15 RANSAC inliers and high DINOv2 similarity, verification succeeds.
    """
    mock_candidates = [
        {
            "id": "chambal_hanging_bridge",
            "name": "Kota Hanging Bridge",
            "category": "bridge_infrastructure",
            "latitude": 25.1432,
            "longitude": 75.8083,
            "composite_rank_score": 0.70,
            "dinov2_structural_similarity": 0.68,
            "clip_visual_similarity": 0.45,
            "opencv_feature_inliers": 22,  # Strong geometric match
            "keywords": ["hanging bridge", "cable stayed bridge"],
        }
    ]
    exif_data = {"has_gps": False, "gps": None}
    ocr_data = {"combined_text": "", "candidate_geo_clues": []}
    clip_data = {"top_environments": []}
    heuristics_data = {}

    res = verify_geolocation_prediction(
        ranked_candidates=mock_candidates,
        exif_data=exif_data,
        ocr_data=ocr_data,
        clip_data=clip_data,
        heuristics_data=heuristics_data,
    )

    assert res["is_verified"] is True
    assert res["confidence_category"] == "Verified Match"
    assert res["precision_level"] == "specific_landmark"


def test_plausible_candidate_moderate_evidence():
    """
    Acceptance test: Solid visual alignment without conclusive ground truth is classified
    as 'Plausible Candidate' at 'neighborhood' precision with wider error bounds.
    """
    mock_candidates = [
        {
            "id": "chambal_riverfront",
            "name": "Chambal Riverfront",
            "category": "riverfront_promenade",
            "latitude": 25.1795,
            "longitude": 75.8280,
            "composite_rank_score": 0.58,
            "dinov2_structural_similarity": 0.46,
            "clip_visual_similarity": 0.42,
            "opencv_feature_inliers": 4,
            "keywords": ["riverfront", "chambal ghats"],
        },
        {
            "id": "seven_wonders_park",
            "name": "Seven Wonders Park",
            "category": "urban_park",
            "latitude": 25.1764,
            "longitude": 75.8488,
            "composite_rank_score": 0.40,
            "dinov2_structural_similarity": 0.32,
            "clip_visual_similarity": 0.30,
            "opencv_feature_inliers": 1,
            "keywords": [],
        },
    ]
    exif_data = {"has_gps": False, "gps": None}
    ocr_data = {"combined_text": "", "candidate_geo_clues": []}
    clip_data = {"top_environments": []}
    heuristics_data = {}

    res = verify_geolocation_prediction(
        ranked_candidates=mock_candidates,
        exif_data=exif_data,
        ocr_data=ocr_data,
        clip_data=clip_data,
        heuristics_data=heuristics_data,
    )

    assert res["is_verified"] is False
    assert res["confidence_category"] == "Plausible Candidate"
    assert res["precision_level"] == "neighborhood"
    assert res["estimated_error_km"] is not None
    assert res["estimated_error_km"] >= 2.0  # Conservative error radius
    assert len(res["alternative_candidates"]) == 1


def test_low_confidence_ambiguous_margin():
    """
    Acceptance test: When two top candidates have very close scores (delta < 0.04),
    the system marks the prediction as 'Low Confidence' and identifies the ambiguity.
    """
    mock_candidates = [
        {
            "id": "candidate_a",
            "name": "Place Alpha",
            "category": "park",
            "latitude": 25.1,
            "longitude": 75.8,
            "composite_rank_score": 0.49,
            "dinov2_structural_similarity": 0.40,
            "clip_visual_similarity": 0.38,
            "opencv_feature_inliers": 2,
            "keywords": [],
        },
        {
            "id": "candidate_b",
            "name": "Place Beta",
            "category": "garden",
            "latitude": 25.2,
            "longitude": 75.9,
            "composite_rank_score": 0.48,  # Only 0.01 difference
            "dinov2_structural_similarity": 0.39,
            "clip_visual_similarity": 0.37,
            "opencv_feature_inliers": 1,
            "keywords": [],
        },
    ]
    exif_data = {"has_gps": False, "gps": None}
    ocr_data = {"combined_text": "", "candidate_geo_clues": []}
    clip_data = {"top_environments": []}
    heuristics_data = {}

    res = verify_geolocation_prediction(
        ranked_candidates=mock_candidates,
        exif_data=exif_data,
        ocr_data=ocr_data,
        clip_data=clip_data,
        heuristics_data=heuristics_data,
    )

    assert res["confidence_category"] == "Low Confidence"
    assert "Ambiguous" in res["confidence_basis"]
    assert res["precision_level"] == "city"
    assert res["estimated_error_km"] >= 10.0


def test_abstention_on_insufficient_evidence():
    """
    Acceptance test: Weak visual scores (<0.35) without supporting metadata
    trigger explicit abstention and withhold coordinates/error estimates.
    """
    mock_candidates = [
        {
            "id": "random_place",
            "name": "Random Place",
            "category": "unknown",
            "latitude": 25.1,
            "longitude": 75.8,
            "composite_rank_score": 0.28,  # Below threshold
            "dinov2_structural_similarity": 0.18,
            "clip_visual_similarity": 0.22,
            "opencv_feature_inliers": 0,
            "keywords": [],
        }
    ]
    exif_data = {"has_gps": False, "gps": None}
    ocr_data = {"combined_text": "", "candidate_geo_clues": []}
    clip_data = {"top_environments": []}
    heuristics_data = {}

    res = verify_geolocation_prediction(
        ranked_candidates=mock_candidates,
        exif_data=exif_data,
        ocr_data=ocr_data,
        clip_data=clip_data,
        heuristics_data=heuristics_data,
    )

    assert res["abstention"] is True
    assert res["confidence_category"] == "Insufficient Evidence"
    assert res["precision_level"] == "unknown"
    assert res["estimated_error_km"] is None
    assert res["verified_candidate"] is None


def test_honest_confounding_factors_always_reported():
    """
    Acceptance test: The verification service always returns documented confounding
    factors explaining why the result could be erroneous.
    """
    mock_candidates = [
        {
            "id": "test_id",
            "name": "Test Landmark",
            "category": "landmark",
            "latitude": 25.1,
            "longitude": 75.8,
            "composite_rank_score": 0.55,
            "dinov2_structural_similarity": 0.45,
            "clip_visual_similarity": 0.40,
            "opencv_feature_inliers": 3,
            "keywords": [],
        }
    ]
    exif_data = {"has_gps": False, "gps": None}
    ocr_data = {"combined_text": "", "candidate_geo_clues": []}
    clip_data = {"top_environments": []}
    heuristics_data = {}

    res = verify_geolocation_prediction(
        ranked_candidates=mock_candidates,
        exif_data=exif_data,
        ocr_data=ocr_data,
        clip_data=clip_data,
        heuristics_data=heuristics_data,
    )

    assert len(res["confounding_factors"]) >= 3
    # Check that reasons mention GPS or reference limits
    reasons_text = " ".join(res["confounding_factors"]).lower()
    assert "gps" in reasons_text
    assert "reference" in reasons_text


def test_api_analyze_returns_verification_structure(client):
    """
    Acceptance test: POST /api/v1/analyze includes the full Phase 5 verification object.
    """
    img = Image.new("RGB", (300, 300), color=(180, 140, 100))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)

    response = client.post(
        "/api/v1/analyze",
        files={"file": ("test_verify.jpg", buf, "image/jpeg")},
    )

    assert response.status_code == 200
    data = response.json()
    assert "verification" in data
    v = data["verification"]
    assert "confidence_category" in v
    assert "precision_level" in v
    assert "confounding_factors" in v
    assert "abstention" in v
    assert "supporting_evidence" in v
    assert "location" in data
    assert data["location"]["is_determined"] is False
    assert data["location"]["unreliable_reason"] == "Location could not be reliably determined from the available evidence."
    assert data["phase"] == "AI Location Analysis"


def test_location_result_with_gps_telemetry(client):
    """
    Acceptance test: When an image contains valid EXIF GPS, location is determined
    with verified confidence, coordinates, and real-world metadata.
    """
    img = Image.new("RGB", (300, 200), color=(120, 160, 220))
    exif = img.getexif()
    gps = exif.get_ifd(0x8825)
    gps[1] = "N"
    gps[2] = 25.1782
    gps[3] = "E"
    gps[4] = 75.8272
    buf = io.BytesIO()
    img.save(buf, format="JPEG", exif=exif)
    buf.seek(0)

    response = client.post(
        "/api/v1/analyze",
        files={"file": ("gps_test.jpg", buf, "image/jpeg")},
    )

    assert response.status_code == 200
    data = response.json()
    loc = data["location"]
    assert loc["is_determined"] is True
    assert loc["place_name"] is not None
    assert loc["latitude"] is not None
    assert loc["longitude"] is not None
    assert loc["confidence_level"] == "Verified Match"
    assert len(loc["metadata_clues"]) > 0
    assert len(loc["sources_consulted"]) > 0

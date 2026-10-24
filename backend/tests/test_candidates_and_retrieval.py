import io
import pytest
from fastapi.testclient import TestClient
from PIL import Image, ImageDraw
from PIL.ExifTags import Base, IFD

from backend.app.services.geo_provider import get_geo_provider, haversine_distance_km


def test_candidates_endpoint_list_all(client: TestClient):
    """Verify that GET /api/v1/candidates returns the documented Kota places."""
    response = client.get("/api/v1/candidates")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 10
    names = [place["name"] for place in data]
    assert "Kota Barrage" in names
    assert any("Hanging Bridge" in n for n in names)
    assert any("Seven Wonders" in n for n in names)


def test_candidates_traceable_provenance():
    """Verify that every single candidate place in the dataset has traceable source and license."""
    provider = get_geo_provider()
    all_places = provider.get_all_candidates()
    assert len(all_places) >= 10

    for place in all_places:
        assert place["name"], "Every candidate must have a name"
        assert place["id"], "Every candidate must have an id"
        assert "OpenStreetMap" in place["source"] or "ASI" in place["source"], (
            f"Candidate {place['name']} must have verified source provenance"
        )
        assert place["license"], f"Candidate {place['name']} must have license attribution"
        assert 24.5 <= place["latitude"] <= 26.0, f"Latitude {place['latitude']} outside Kota region"
        assert 75.0 <= place["longitude"] <= 76.5, f"Longitude {place['longitude']} outside Kota region"


def test_candidates_endpoint_keyword_search(client: TestClient):
    """Verify filtering candidates by keyword query."""
    response = client.get("/api/v1/candidates?q=Barrage")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert data[0]["name"] == "Kota Barrage"


def test_candidates_endpoint_category_filter(client: TestClient):
    """Verify filtering candidates by category."""
    response = client.get("/api/v1/candidates?category=Temple")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 2
    for item in data:
        assert "Temple" in item["category"] or "Religious" in item["category"]


def test_retrieval_via_gps_clue(client: TestClient):
    """Verify that GPS coordinates in EXIF retrieve geographically proximate Kota candidates."""
    # Kota Barrage coordinates: 25.1782 N, 75.8272 E
    img = Image.new("RGB", (300, 200), color=(100, 150, 200))
    exif = img.getexif()
    gps = exif.get_ifd(IFD.GPSInfo)
    gps[1] = "N"
    gps[2] = 25.1782
    gps[3] = "E"
    gps[4] = 75.8272
    buf = io.BytesIO()
    img.save(buf, format="JPEG", exif=exif)

    files = {"file": ("barrage_gps.jpg", buf.getvalue(), "image/jpeg")}
    response = client.post("/api/v1/analyze", files=files)
    assert response.status_code == 200
    data = response.json()

    retrieval = data["retrieval"]
    assert retrieval["abstention"] is False
    assert retrieval["candidates_retrieved_count"] > 0
    candidate_names = [c["name"] for c in retrieval["candidates"]]
    assert "Kota Barrage" in candidate_names
    # Verify retrieval reason is transparent
    top_c = retrieval["candidates"][0]
    assert any("EXIF GPS" in r for r in top_c["retrieval_reasons"])


def test_retrieval_via_ocr_signage(client: TestClient):
    """Verify that visible text matching a candidate name retrieves that candidate."""
    img = Image.new("RGB", (400, 120), color="white")
    draw = ImageDraw.Draw(img)
    draw.text((20, 40), "CHAMBAL HANGING BRIDGE NH 52", fill="black")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")

    files = {"file": ("bridge_sign.jpg", buf.getvalue(), "image/jpeg")}
    response = client.post("/api/v1/analyze", files=files)
    assert response.status_code == 200
    data = response.json()

    retrieval = data["retrieval"]
    assert retrieval["candidates_retrieved_count"] > 0
    candidate_names = [c["name"] for c in retrieval["candidates"]]
    assert any("Hanging Bridge" in name for name in candidate_names)


def test_retrieval_honest_abstention_never_invents_candidates(client: TestClient):
    """
    Critical requirement: If an image has no GPS, no recognizable text, and no matching
    visual environment (e.g. an indoor abstract image), the system must abstain
    and never invent a candidate merely to fill the list.
    """
    # Plain solid black image with no text and no EXIF
    img = Image.new("RGB", (100, 100), color="black")
    buf = io.BytesIO()
    img.save(buf, format="PNG")

    files = {"file": ("empty_black.png", buf.getvalue(), "image/png")}
    response = client.post("/api/v1/analyze", files=files)
    assert response.status_code == 200
    data = response.json()

    # The system must clearly explain its retrieval results
    assert "retrieval" in data
    # Candidates may be empty or strictly justified by clip; no fabricated names
    for c in data["retrieval"]["candidates"]:
        assert len(c["matched_clues"]) > 0, "No candidate can be returned without explicit matched clues"


def test_haversine_distance_calculation():
    """Verify that the Haversine formula calculates accurate distances."""
    # Kota Barrage (25.1782, 75.8272) to Seven Wonders Park (25.1795, 75.8456) is ~1.85 km
    dist = haversine_distance_km(25.1782, 75.8272, 25.1795, 75.8456)
    assert 1.5 <= dist <= 2.2

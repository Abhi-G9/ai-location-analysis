import pytest
from fastapi.testclient import TestClient


def test_analysis_with_gps_exif(client: TestClient, image_with_gps_bytes: bytes):
    """Verify that EXIF metadata and GPS coordinates are accurately extracted."""
    files = {"file": ("chambal_garden_gps.jpg", image_with_gps_bytes, "image/jpeg")}
    response = client.post("/api/v1/analyze", files=files)
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "valid"
    assert data["filename"] == "chambal_garden_gps.jpg"
    assert data["format"] == "JPEG"

    # EXIF validations
    exif = data["exif"]
    assert exif["has_exif"] is True
    assert exif["has_gps"] is True
    assert exif["camera_make"] == "Nikon"
    assert exif["camera_model"] == "D850"
    assert exif["gps"] is not None
    assert abs(exif["gps"]["latitude"] - 25.18) < 0.001
    assert abs(exif["gps"]["longitude"] - 75.83) < 0.001

    # Check that summary clues include the GPS findings
    clues_str = " ".join(data["summary_clues"])
    assert "GPS" in clues_str


def test_analysis_without_exif_graceful(client: TestClient, valid_png_bytes: bytes):
    """Confirm missing EXIF / GPS does not crash the pipeline and visual analysis still runs."""
    files = {"file": ("screenshot_no_exif.png", valid_png_bytes, "image/png")}
    response = client.post("/api/v1/analyze", files=files)
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "valid"
    assert data["exif"]["has_gps"] is False
    assert data["exif"]["gps"] is None

    # Visual analysis should proceed normally
    assert "heuristics" in data
    assert "clip" in data
    assert data["heuristics"]["framing"] in ["Square", "Landscape", "Portrait"]


def test_analysis_with_readable_ocr(client: TestClient, image_with_text_bytes: bytes):
    """Confirm readable text and geographic clues are extracted by RapidOCR."""
    files = {"file": ("highway_sign.jpg", image_with_text_bytes, "image/jpeg")}
    response = client.post("/api/v1/analyze", files=files)
    assert response.status_code == 200
    data = response.json()

    ocr = data["ocr"]
    assert ocr["engine_available"] is True
    assert ocr["total_lines_found"] > 0
    assert "KOTA" in ocr["combined_text"].upper()

    # Verify that geographic clues were identified
    assert len(ocr["candidate_geo_clues"]) > 0
    geo_clues_upper = [c.upper() for c in ocr["candidate_geo_clues"]]
    assert any("KOTA" in c or "RAJASTHAN" in c or "NH" in c for c in geo_clues_upper)


def test_analysis_clip_semantic_output(client: TestClient, valid_jpeg_bytes: bytes):
    """Verify that OpenCLIP model returns real similarity scores and visual embeddings."""
    files = {"file": ("nature_scene.jpg", valid_jpeg_bytes, "image/jpeg")}
    response = client.post("/api/v1/analyze", files=files)
    assert response.status_code == 200
    data = response.json()

    clip = data["clip"]
    assert clip["model_available"] is True
    assert "OpenCLIP" in clip["model_name"]
    assert len(clip["top_environments"]) > 0

    top_env = clip["top_environments"][0]
    assert "label" in top_env
    assert -1.0 <= top_env["cosine_similarity"] <= 1.0
    assert 0.0 <= top_env["relative_score"] <= 100.0

    # 512-dim embedding representation
    assert clip["embedding_dims"] == 512
    assert len(clip["embedding_preview"]) > 0


def test_analysis_visual_heuristics(client: TestClient, valid_jpeg_bytes: bytes):
    """Verify image processing heuristics return bounded values."""
    files = {"file": ("photo.jpg", valid_jpeg_bytes, "image/jpeg")}
    response = client.post("/api/v1/analyze", files=files)
    assert response.status_code == 200
    data = response.json()

    heuristics = data["heuristics"]
    assert 0.0 <= heuristics["brightness_percent"] <= 100.0
    assert heuristics["sharpness_score"] >= 0.0
    assert len(heuristics["dominant_colors"]) > 0
    for color in heuristics["dominant_colors"]:
        assert color["hex"].startswith("#")
        assert len(color["rgb"]) == 3
        assert 0.0 <= color["percentage"] <= 100.0

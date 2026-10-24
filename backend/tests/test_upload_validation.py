import io
import pytest
from fastapi.testclient import TestClient


def test_valid_jpeg_upload(client: TestClient, valid_jpeg_bytes: bytes):
    """Confirm a valid JPEG image is accepted and dimensions correctly extracted."""
    files = {"file": ("test_landmark.jpg", valid_jpeg_bytes, "image/jpeg")}
    response = client.post("/api/v1/analyze", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "valid"
    assert data["filename"] == "test_landmark.jpg"
    assert data["content_type"] == "image/jpeg"
    assert data["format"] == "JPEG"
    assert data["dimensions"]["width"] == 200
    assert data["dimensions"]["height"] == 150
    assert data["size_bytes"] == len(valid_jpeg_bytes)


def test_valid_png_upload(client: TestClient, valid_png_bytes: bytes):
    """Confirm a valid PNG image is accepted and dimensions correctly extracted."""
    files = {"file": ("street_scene.png", valid_png_bytes, "image/png")}
    response = client.post("/api/v1/analyze", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "valid"
    assert data["filename"] == "street_scene.png"
    assert data["format"] == "PNG"
    assert data["dimensions"]["width"] == 100
    assert data["dimensions"]["height"] == 100


def test_valid_webp_upload(client: TestClient, valid_webp_bytes: bytes):
    """Confirm a valid WebP image is accepted."""
    files = {"file": ("city_skyline.webp", valid_webp_bytes, "image/webp")}
    response = client.post("/api/v1/analyze", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "valid"
    assert data["format"] == "WEBP"
    assert data["dimensions"]["width"] == 80
    assert data["dimensions"]["height"] == 80


def test_reject_non_image_file(client: TestClient, text_file_bytes: bytes):
    """Confirm non-image files are rejected with 415 status code."""
    files = {"file": ("notes.txt", text_file_bytes, "text/plain")}
    response = client.post("/api/v1/analyze", files=files)
    assert response.status_code == 415
    data = response.json()
    assert "Unsupported" in data["detail"]


def test_reject_corrupted_image(client: TestClient, corrupted_image_bytes: bytes):
    """Confirm corrupted/truncated image files are rejected with 400 Bad Request."""
    files = {"file": ("corrupted.jpg", corrupted_image_bytes, "image/jpeg")}
    response = client.post("/api/v1/analyze", files=files)
    assert response.status_code == 400
    data = response.json()
    assert "corrupted" in data["detail"].lower()


def test_reject_empty_file(client: TestClient):
    """Confirm 0-byte file upload is rejected with 400 Bad Request."""
    files = {"file": ("empty.jpg", b"", "image/jpeg")}
    response = client.post("/api/v1/analyze", files=files)
    assert response.status_code == 400
    data = response.json()
    assert "empty" in data["detail"].lower()


def test_reject_oversized_file(client: TestClient, monkeypatch):
    """Confirm file exceeding configured MAX_UPLOAD_SIZE_MB is rejected with 413."""
    # Temporarily set max size to a small value (1 MB) to test rejection without huge allocations
    from backend.app.core.config import settings
    monkeypatch.setattr(settings, "MAX_UPLOAD_SIZE_MB", 1)

    # 1.5 MB payload of dummy bytes
    oversized_data = b"X" * (int(1.5 * 1024 * 1024))
    files = {"file": ("giant.jpg", oversized_data, "image/jpeg")}
    response = client.post("/api/v1/analyze", files=files)
    assert response.status_code == 413
    data = response.json()
    assert "exceeded" in data["detail"].lower() or "exceeds" in data["detail"].lower()


def test_sanitize_filename_path_traversal(client: TestClient, valid_jpeg_bytes: bytes):
    """Confirm path traversal attempts in filename are sanitized."""
    files = {"file": ("../../../../etc/passwd.jpg", valid_jpeg_bytes, "image/jpeg")}
    response = client.post("/api/v1/analyze", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["filename"] == "passwd.jpg"
    assert "/" not in data["filename"]
    assert "\\" not in data["filename"]

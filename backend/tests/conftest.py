import io
import pytest
from fastapi.testclient import TestClient
from PIL import Image

from backend.app.main import app


@pytest.fixture
def client():
    """Provides a TestClient fixture for invoking FastAPI endpoints."""
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def valid_jpeg_bytes() -> bytes:
    """Creates a minimal valid RGB JPEG image in memory."""
    buf = io.BytesIO()
    img = Image.new("RGB", (200, 150), color=(73, 109, 137))
    img.save(buf, format="JPEG")
    return buf.getvalue()


@pytest.fixture
def valid_png_bytes() -> bytes:
    """Creates a minimal valid RGBA PNG image in memory."""
    buf = io.BytesIO()
    img = Image.new("RGBA", (100, 100), color=(255, 0, 0, 128))
    img.save(buf, format="PNG")
    return buf.getvalue()


@pytest.fixture
def valid_webp_bytes() -> bytes:
    """Creates a minimal valid WebP image in memory."""
    buf = io.BytesIO()
    img = Image.new("RGB", (80, 80), color=(0, 255, 0))
    img.save(buf, format="WEBP")
    return buf.getvalue()


@pytest.fixture
def corrupted_image_bytes() -> bytes:
    """Creates a corrupted byte sequence starting with JPEG header but broken data."""
    return b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00THIS_IS_CORRUPTED_GARBAGE_DATA"


@pytest.fixture
def text_file_bytes() -> bytes:
    """Creates plain text bytes masquerading as an image."""
    return b"This is just a plain text file, definitely not a photo."

import io
import pytest
from fastapi.testclient import TestClient
from PIL import Image, ImageDraw
from PIL.ExifTags import Base, IFD

from backend.app.main import app


@pytest.fixture
def client():
    """Provides a TestClient fixture for invoking FastAPI endpoints."""
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def valid_jpeg_bytes() -> bytes:
    """Creates a minimal valid RGB JPEG image in memory without EXIF."""
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
def image_with_gps_bytes() -> bytes:
    """Creates an image with valid embedded GPS EXIF tags (Kota, Rajasthan: ~25.18 N, 75.83 E)."""
    buf = io.BytesIO()
    img = Image.new("RGB", (300, 200), color=(100, 150, 200))
    exif = img.getexif()
    exif[Base.Make] = "Nikon"
    exif[Base.Model] = "D850"
    gps_ifd = exif.get_ifd(IFD.GPSInfo)
    gps_ifd[1] = "N"
    gps_ifd[2] = 25.180000
    gps_ifd[3] = "E"
    gps_ifd[4] = 75.830000
    img.save(buf, format="JPEG", exif=exif)
    return buf.getvalue()


@pytest.fixture
def image_with_text_bytes() -> bytes:
    """Creates an image with readable rendered text for OCR validation."""
    buf = io.BytesIO()
    img = Image.new("RGB", (400, 150), color="white")
    draw = ImageDraw.Draw(img)
    # Draw high contrast text
    draw.text((20, 50), "KOTA RAJASTHAN NH-52", fill="black")
    img.save(buf, format="JPEG")
    return buf.getvalue()


@pytest.fixture
def corrupted_image_bytes() -> bytes:
    """Creates a corrupted byte sequence starting with JPEG header but broken data."""
    return b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00THIS_IS_CORRUPTED_GARBAGE_DATA"


@pytest.fixture
def text_file_bytes() -> bytes:
    """Creates plain text bytes masquerading as an image."""
    return b"This is just a plain text file, definitely not a photo."

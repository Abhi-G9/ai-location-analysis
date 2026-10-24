import io
import os
from typing import Tuple
from fastapi import HTTPException, status
from PIL import Image, UnidentifiedImageError

from backend.app.core.config import settings

# Recognized magic numbers for supported image formats
MAGIC_NUMBERS = {
    "image/jpeg": [b"\xff\xd8\xff"],
    "image/png": [b"\x89PNG\r\n\x1a\n"],
    "image/webp": [b"RIFF"],
}


def sanitize_filename(filename: str) -> str:
    """Strip directory path components to prevent path traversal attacks."""
    if not filename:
        return "unnamed_upload.jpg"
    # Take only the final filename component
    clean_name = os.path.basename(filename.replace("\\", "/"))
    # Restrict to safe characters
    return "".join(c for c in clean_name if c.isalnum() or c in "._- ") or "upload"


def validate_magic_bytes(header: bytes, declared_type: str) -> str:
    """
    Validate that the file header matches a known safe image signature.
    Returns the detected MIME type.
    """
    if header.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if header.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if header.startswith(b"RIFF") and len(header) >= 12 and header[8:12] == b"WEBP":
        return "image/webp"

    raise HTTPException(
        status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
        detail=f"Unsupported or invalid image format. Supported formats are: JPEG, PNG, WEBP.",
    )


def validate_and_decode_image(
    file_bytes: bytes,
    original_filename: str,
    declared_content_type: str,
) -> Tuple[str, str, str, Tuple[int, int]]:
    """
    Safely validates, parses, and extracts dimensions from the uploaded image bytes.

    Returns:
        (sanitized_filename, detected_mime, format_name, (width, height))
    """
    # 1. Check size against configured maximum
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    size_bytes = len(file_bytes)
    if size_bytes == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is empty (0 bytes).",
        )
    if size_bytes > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail=f"File size ({size_bytes / (1024 * 1024):.2f} MB) exceeds the maximum allowed limit of {settings.MAX_UPLOAD_SIZE_MB} MB.",
        )

    # 2. Check magic bytes
    detected_mime = validate_magic_bytes(file_bytes[:16], declared_content_type)
    if detected_mime not in settings.ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"File type '{detected_mime}' is not permitted.",
        )

    # 3. Decode safely with Pillow
    try:
        # First verification step
        with Image.open(io.BytesIO(file_bytes)) as img:
            img.verify()

        # Reopen to read dimensions and format (verify() closes/invalidates the stream)
        with Image.open(io.BytesIO(file_bytes)) as img:
            format_name = img.format or "UNKNOWN"
            width, height = img.size

            if width <= 0 or height <= 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid image dimensions detected.",
                )

    except (UnidentifiedImageError, SyntaxError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"The uploaded file is corrupted or not a valid image: {str(exc)}",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to decode image data safely.",
        )

    sanitized = sanitize_filename(original_filename)
    return sanitized, detected_mime, format_name, (width, height)

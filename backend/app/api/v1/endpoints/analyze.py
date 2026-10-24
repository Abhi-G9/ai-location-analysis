from fastapi import APIRouter, File, HTTPException, UploadFile, status
from backend.app.core.config import settings
from backend.app.core.security import validate_and_decode_image
from backend.app.schemas.analyze import AnalyzeResponse, ImageDimensions

router = APIRouter()

CHUNK_SIZE = 64 * 1024  # 64 KB chunk size for memory-safe streaming reads


@router.post(
    "/analyze",
    response_model=AnalyzeResponse,
    status_code=status.HTTP_200_OK,
    summary="Validate and analyze image intake",
)
async def analyze_image(
    file: UploadFile = File(..., description="The photograph file to analyze (JPEG, PNG, WebP)"),
) -> AnalyzeResponse:
    """
    Intake and validate an uploaded image.
    In Phase 1, this endpoint performs strict format validation, size checks,
    magic byte verification, and safe image decoding.
    Full visual clue extraction and multi-stage geolocation matching will be enabled
    in subsequent phases.
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No filename provided in upload.",
        )

    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    content = bytearray()
    total_read = 0

    try:
        while True:
            chunk = await file.read(CHUNK_SIZE)
            if not chunk:
                break
            total_read += len(chunk)
            if total_read > max_bytes:
                raise HTTPException(
                    status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                    detail=f"Upload exceeded maximum permitted size of {settings.MAX_UPLOAD_SIZE_MB} MB.",
                )
            content.extend(chunk)
    finally:
        await file.close()

    raw_bytes = bytes(content)

    # Validate file integrity, format, and extract dimensions
    sanitized_name, detected_mime, format_name, (width, height) = validate_and_decode_image(
        file_bytes=raw_bytes,
        original_filename=file.filename,
        declared_content_type=file.content_type or "",
    )

    return AnalyzeResponse(
        status="valid",
        filename=sanitized_name,
        content_type=detected_mime,
        format=format_name,
        size_bytes=len(raw_bytes),
        dimensions=ImageDimensions(width=width, height=height),
        phase="Phase 1: File Intake & Validation",
        message="Image successfully verified, safely decoded, and ready for visual analysis pipeline.",
    )

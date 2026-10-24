import io
import logging
from typing import List
from fastapi import APIRouter, File, HTTPException, UploadFile, status
from PIL import Image, ImageOps

from backend.app.core.config import settings
from backend.app.core.security import validate_and_decode_image
from backend.app.schemas.analyze import AnalyzeResponse, ImageDimensions
from backend.app.services.clip_service import analyze_with_clip
from backend.app.services.exif_service import extract_exif_metadata
from backend.app.services.ocr_service import extract_text_clues
from backend.app.services.visual_clues_service import analyze_image_heuristics

logger = logging.getLogger("geolens.analyze")
router = APIRouter()

CHUNK_SIZE = 64 * 1024  # 64 KB chunk size for memory-safe streaming reads


@router.post(
    "/analyze",
    response_model=AnalyzeResponse,
    status_code=status.HTTP_200_OK,
    summary="Analyze photograph visual clues, metadata, and scene semantics",
)
async def analyze_image(
    file: UploadFile = File(..., description="The photograph file to analyze (JPEG, PNG, WebP)"),
) -> AnalyzeResponse:
    """
    Intake and analyze an uploaded image.
    Executes the Phase 2 analysis pipeline:
    1. Safe intake validation (size limits, magic numbers, Pillow verify).
    2. EXIF metadata & GPS coordinate extraction.
    3. RapidOCR text reading and candidate geographic keyword extraction.
    4. Computer vision heuristics (lighting, sharpness, dominant palette).
    5. OpenCLIP semantic zero-shot classification and embedding extraction.
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

    # 1. Validate file integrity, format, and dimensions
    sanitized_name, detected_mime, format_name, (width, height) = validate_and_decode_image(
        file_bytes=raw_bytes,
        original_filename=file.filename,
        declared_content_type=file.content_type or "",
    )

    # Open image for feature extraction
    raw_img = Image.open(io.BytesIO(raw_bytes))

    # 2. Extract EXIF metadata before transposition
    exif_result = extract_exif_metadata(raw_img)

    # Correct image orientation if EXIF orientation flag is present
    try:
        oriented_img = ImageOps.exif_transpose(raw_img)
        if oriented_img is None:
            oriented_img = raw_img
    except Exception:
        oriented_img = raw_img

    # 3. Extract OCR text
    ocr_result = extract_text_clues(oriented_img)

    # 4. Extract visual heuristics (sharpness, lighting, dominant palette)
    heuristics_result = analyze_image_heuristics(oriented_img)

    # 5. Extract semantic visual clues with OpenCLIP
    clip_result = analyze_with_clip(oriented_img)

    # 6. Build evidence summary clues
    summary_clues: List[str] = []

    if exif_result.get("has_gps") and exif_result.get("gps"):
        gps = exif_result["gps"]
        summary_clues.append(
            f"EXIF GPS Coordinates found: {gps['latitude']:.4f}, {gps['longitude']:.4f}"
        )
    elif exif_result.get("has_exif"):
        make = exif_result.get("camera_make") or ""
        model = exif_result.get("camera_model") or ""
        cam = f"{make} {model}".strip() or "Device detected"
        summary_clues.append(f"EXIF metadata present ({cam}), but GPS coordinates are absent or scrubbed.")
    else:
        summary_clues.append("No EXIF metadata found (common for web and social media images).")

    if ocr_result.get("candidate_geo_clues"):
        clues_str = ", ".join(ocr_result["candidate_geo_clues"])
        summary_clues.append(f"Geographic keywords spotted in visible text: {clues_str}")
    elif ocr_result.get("total_lines_found", 0) > 0:
        summary_clues.append(f"Visible text detected ({ocr_result['total_lines_found']} lines), but no specific location names recognized.")

    if clip_result.get("top_environments"):
        top_env = clip_result["top_environments"][0]
        summary_clues.append(
            f"Semantic scene classification: {top_env['label']} (cosine similarity: {top_env['cosine_similarity']:.2f})"
        )

    summary_clues.append(
        f"Visual properties: {heuristics_result['framing']} format, {heuristics_result['lighting_condition']}, {heuristics_result['focus_quality']}."
    )

    message = (
        f"Analyzed '{sanitized_name}': Extracted {len(summary_clues)} investigative clues. "
        "Candidate location retrieval and spatial verification will be activated in Phases 3-5."
    )

    return AnalyzeResponse(
        status="valid",
        filename=sanitized_name,
        content_type=detected_mime,
        format=format_name,
        size_bytes=len(raw_bytes),
        dimensions=ImageDimensions(width=width, height=height),
        phase="Phase 2: Visual Clues & Image Analysis",
        exif=exif_result,
        ocr=ocr_result,
        heuristics=heuristics_result,
        clip=clip_result,
        summary_clues=summary_clues,
        message=message,
    )

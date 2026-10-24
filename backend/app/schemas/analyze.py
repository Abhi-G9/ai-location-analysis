from typing import Optional, Tuple
from pydantic import BaseModel, Field


class ImageDimensions(BaseModel):
    width: int
    height: int


class AnalyzeResponse(BaseModel):
    """
    Response schema for the /api/v1/analyze intake endpoint.
    In Phase 1, it validates and decodes the image safely without making
    premature location claims.
    """
    status: str = Field(..., description="Status of the image intake, e.g., 'valid'")
    filename: str = Field(..., description="Original uploaded filename")
    content_type: str = Field(..., description="Verified MIME type")
    format: str = Field(..., description="Image format detected (JPEG, PNG, WEBP)")
    size_bytes: int = Field(..., description="File size in bytes")
    dimensions: ImageDimensions = Field(..., description="Image width and height in pixels")
    phase: str = Field(
        default="Phase 1: File Intake & Validation",
        description="Current development phase indicator"
    )
    message: str = Field(..., description="Informational message about the image intake status")

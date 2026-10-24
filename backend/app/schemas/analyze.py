from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ImageDimensions(BaseModel):
    width: int
    height: int


class GPSInfo(BaseModel):
    latitude: float = Field(..., description="Decimal latitude")
    longitude: float = Field(..., description="Decimal longitude")
    altitude_m: Optional[float] = Field(None, description="Altitude in meters")
    heading_deg: Optional[float] = Field(None, description="Camera direction in degrees (0-360)")
    coordinate_provenance: str = Field("EXIF GPS header tag", description="Data origin")


class EXIFMetadata(BaseModel):
    has_exif: bool
    has_gps: bool
    camera_make: Optional[str] = None
    camera_model: Optional[str] = None
    software: Optional[str] = None
    capture_date: Optional[str] = None
    focal_length_mm: Optional[float] = None
    aperture_f_number: Optional[float] = None
    exposure_time_sec: Optional[str] = None
    iso_speed: Optional[int] = None
    orientation: Optional[int] = None
    gps: Optional[GPSInfo] = None
    note: str


class OCRTextLine(BaseModel):
    text: str
    confidence: float
    box: List[List[float]] = []


class OCRResult(BaseModel):
    engine_available: bool
    detected_lines: List[OCRTextLine] = []
    total_lines_found: int = 0
    combined_text: str = ""
    candidate_geo_clues: List[str] = []
    note: str


class ColorSwatch(BaseModel):
    hex: str
    rgb: List[int]
    percentage: float


class VisualHeuristics(BaseModel):
    aspect_ratio: float
    framing: str
    brightness_percent: float
    lighting_condition: str
    sharpness_score: float
    focus_quality: str
    dominant_colors: List[ColorSwatch] = []


class CLIPCategory(BaseModel):
    label: str
    description: str
    cosine_similarity: float
    relative_score: float


class CLIPAnalysis(BaseModel):
    model_available: bool
    model_name: Optional[str] = None
    top_environments: List[CLIPCategory] = []
    top_settings: List[CLIPCategory] = []
    embedding_dims: int = 0
    embedding_preview: List[float] = []
    note: str


class AnalyzeResponse(BaseModel):
    """
    Structured image-analysis results returned by POST /api/v1/analyze.
    Incorporates safe intake, EXIF metadata, OCR text detection,
    visual heuristics, and CLIP semantic scene understanding.
    """
    status: str = Field(..., description="Status of the image intake, e.g. 'valid'")
    filename: str = Field(..., description="Sanitized original filename")
    content_type: str = Field(..., description="Verified MIME type")
    format: str = Field(..., description="Image format (JPEG, PNG, WEBP)")
    size_bytes: int = Field(..., description="File size in bytes")
    dimensions: ImageDimensions = Field(..., description="Image width and height in pixels")
    phase: str = Field(default="Phase 2: Visual Clues & Image Analysis")
    exif: EXIFMetadata
    ocr: OCRResult
    heuristics: VisualHeuristics
    clip: CLIPAnalysis
    summary_clues: List[str] = Field(default=[], description="Bullet points of identified visual clues")
    message: str = Field(..., description="Human-readable summary of analysis results")

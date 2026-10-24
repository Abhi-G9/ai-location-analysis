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


class CandidatePlace(BaseModel):
    id: str
    name: str
    category: str
    latitude: float
    longitude: float
    precision: str = "specific_landmark"
    city: str
    district: str
    state: str
    country: str = "India"
    description: str
    source: str
    license: str
    distance_km: Optional[float] = None
    retrieval_reasons: List[str] = []
    matched_clues: List[str] = []
    visual_features: List[str] = []
    # Phase 4 AI Visual Ranking Fields
    rank: Optional[int] = None
    composite_rank_score: Optional[float] = None
    clip_visual_similarity: Optional[float] = None
    dinov2_structural_similarity: Optional[float] = None
    opencv_feature_inliers: Optional[int] = None
    inlier_ratio: Optional[float] = None
    structural_agreement: Optional[str] = None
    evidence_breakdown: List[str] = []


class CandidateRetrievalResult(BaseModel):
    dataset_scope: str = "Kota, Rajasthan, India"
    total_database_places: int
    candidates_retrieved_count: int
    candidates: List[CandidatePlace] = []
    top_candidate: Optional[CandidatePlace] = None
    ranking_methodology: str = (
        "Multi-Modal Feature Fusion: 50% DINOv2 Structural + 35% CLIP Visual + "
        "15% OpenCV RANSAC Inliers + Clue Agreement Boosts"
    )
    abstention: bool = False
    message: str


class VerificationResult(BaseModel):
    is_verified: bool = Field(..., description="True if evidence fulfills rigorous verification criteria")
    confidence_category: str = Field(..., description="'Verified Match', 'Plausible Candidate', 'Low Confidence', or 'Insufficient Evidence'")
    confidence_basis: str = Field(..., description="Explicit measurable rationale behind the category")
    precision_level: str = Field(..., description="'specific_landmark', 'neighborhood', 'city', 'regional', or 'unknown'")
    estimated_error_km: Optional[float] = Field(None, description="Estimated geographic error radius in kilometers")
    error_distance_description: str = Field(..., description="Uncertainty explanation for the estimated error bounds")
    abstention: bool = Field(False, description="True if system explicitly refuses to pinpoint a location")
    abstention_reason: Optional[str] = Field(None, description="Detailed explanation when abstaining")
    verified_candidate: Optional[CandidatePlace] = None
    alternative_candidates: List[CandidatePlace] = []
    supporting_evidence: List[str] = []
    confounding_factors: List[str] = []
    verification_methodology: str


class AnalyzeResponse(BaseModel):
    """
    Structured image-analysis results returned by POST /api/v1/analyze.
    Phase 5 incorporates interactive mapping, evidence verification, and honest confidence calibration.
    """
    status: str = Field(..., description="Status of the image intake, e.g. 'valid'")
    filename: str = Field(..., description="Sanitized original filename")
    content_type: str = Field(..., description="Verified MIME type")
    format: str = Field(..., description="Image format (JPEG, PNG, WEBP)")
    size_bytes: int = Field(..., description="File size in bytes")
    dimensions: ImageDimensions = Field(..., description="Image width and height in pixels")
    phase: str = Field(default="Phase 5: Verification, Mapping & Confidence")
    exif: EXIFMetadata
    ocr: OCRResult
    heuristics: VisualHeuristics
    clip: CLIPAnalysis
    retrieval: CandidateRetrievalResult
    verification: VerificationResult
    summary_clues: List[str] = Field(default=[], description="Bullet points of identified visual clues")
    message: str = Field(..., description="Human-readable summary of analysis results")

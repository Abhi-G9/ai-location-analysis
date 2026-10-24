export interface HealthStatus {
  status: string;
  version: string;
  environment: string;
  timestamp: string;
  service: string;
}

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface GPSInfo {
  latitude: number;
  longitude: number;
  altitude_m?: number | null;
  heading_deg?: number | null;
  coordinate_provenance: string;
}

export interface EXIFMetadata {
  has_exif: boolean;
  has_gps: boolean;
  camera_make?: string | null;
  camera_model?: string | null;
  software?: string | null;
  capture_date?: string | null;
  focal_length_mm?: number | null;
  aperture_f_number?: number | null;
  exposure_time_sec?: string | null;
  iso_speed?: number | null;
  orientation?: number | null;
  gps?: GPSInfo | null;
  note: string;
}

export interface OCRTextLine {
  text: string;
  confidence: number;
  box: number[][];
}

export interface OCRResult {
  engine_available: boolean;
  detected_lines: OCRTextLine[];
  total_lines_found: number;
  combined_text: string;
  candidate_geo_clues: string[];
  note: string;
}

export interface ColorSwatch {
  hex: string;
  rgb: number[];
  percentage: number;
}

export interface VisualHeuristics {
  aspect_ratio: number;
  framing: string;
  brightness_percent: number;
  lighting_condition: string;
  sharpness_score: number;
  focus_quality: string;
  dominant_colors: ColorSwatch[];
}

export interface CLIPCategory {
  label: string;
  description: string;
  cosine_similarity: number;
  relative_score: number;
}

export interface CLIPAnalysis {
  model_available: boolean;
  model_name?: string | null;
  top_environments: CLIPCategory[];
  top_settings: CLIPCategory[];
  embedding_dims: number;
  embedding_preview: number[];
  note: string;
}

export interface AnalyzeResponse {
  status: string;
  filename: string;
  content_type: string;
  format: string;
  size_bytes: number;
  dimensions: ImageDimensions;
  phase: string;
  exif: EXIFMetadata;
  ocr: OCRResult;
  heuristics: VisualHeuristics;
  clip: CLIPAnalysis;
  summary_clues: string[];
  message: string;
}

export type UploadState = 'idle' | 'selected' | 'uploading' | 'success' | 'error';

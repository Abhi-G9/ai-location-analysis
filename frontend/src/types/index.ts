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

export interface CandidatePlace {
  id: string;
  name: string;
  category: string;
  latitude: number;
  longitude: number;
  precision: string;
  city: string;
  district: string;
  state: string;
  country: string;
  description: string;
  source: string;
  license: string;
  distance_km?: number | null;
  retrieval_reasons: string[];
  matched_clues: string[];
  visual_features: string[];
  // Phase 4 Multi-Modal AI Ranking Fields
  rank?: number | null;
  composite_rank_score?: number | null;
  clip_visual_similarity?: number | null;
  dinov2_structural_similarity?: number | null;
  opencv_feature_inliers?: number | null;
  inlier_ratio?: number | null;
  structural_agreement?: string | null;
  evidence_breakdown?: string[];
}

export interface CandidateRetrievalResult {
  dataset_scope: string;
  total_database_places: number;
  candidates_retrieved_count: number;
  candidates: CandidatePlace[];
  top_candidate?: CandidatePlace | null;
  ranking_methodology: string;
  abstention: boolean;
  message: string;
}

export interface VerificationResult {
  is_verified: boolean;
  confidence_category: 'Verified Match' | 'Plausible Candidate' | 'Low Confidence' | 'Insufficient Evidence';
  confidence_basis: string;
  precision_level: 'specific_landmark' | 'neighborhood' | 'city' | 'regional' | 'unknown';
  estimated_error_km?: number | null;
  error_distance_description: string;
  abstention: boolean;
  abstention_reason?: string | null;
  verified_candidate?: CandidatePlace | null;
  alternative_candidates: CandidatePlace[];
  supporting_evidence: string[];
  confounding_factors: string[];
  verification_methodology: string;
}

export interface LocationCandidateSummary {
  name: string;
  city?: string | null;
  region_state?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  precision: string;
  description?: string | null;
  confidence_hint?: string | null;
}

export interface ReferencePhotoAttribution {
  filename?: string;
  title?: string;
  source?: string;
  source_page?: string;
  author?: string;
  license?: string;
  license_url?: string;
  image_url?: string;
}

export interface LocationResult {
  is_determined: boolean;
  unreliable_reason?: string | null;
  missing_clues: string[];
  place_name?: string | null;
  city?: string | null;
  region_state?: string | null;
  country?: string | null;
  exact_address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  geographic_precision: string;
  confidence_level: string;
  confidence_basis: string;
  detection_source?: string | null;
  reference_photo?: ReferencePhotoAttribution | null;
  landmarks_and_architecture: string[];
  text_found: string[];
  metadata_clues: string[];
  matching_evidence: string[];
  sources_consulted: string[];
  alternative_locations: LocationCandidateSummary[];
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
  retrieval: CandidateRetrievalResult;
  verification: VerificationResult;
  location?: LocationResult | null;
  summary_clues: string[];
  message: string;
}

export type UploadState = 'idle' | 'selected' | 'uploading' | 'success' | 'error';

export interface EvaluationSampleResult {
  sample_id: string;
  sample_type: string;
  description: string;
  ground_truth_place_id?: string | null;
  ground_truth_name?: string | null;
  predicted_top_1_name?: string | null;
  predicted_top_1_id?: string | null;
  confidence_category: string;
  precision_level: string;
  estimated_error_km?: number | null;
  actual_error_km?: number | null;
  is_top_1_correct: boolean;
  is_top_5_correct: boolean;
  abstained: boolean;
  clues_provided: string[];
}

export interface ModelCardEntry {
  model_name: string;
  architecture: string;
  primary_task: string;
  feature_dimension: string;
  rationale: string;
  hardware_target: string;
}

export interface EvaluationReport {
  timestamp: string;
  dataset_scope: string;
  total_samples: number;
  positive_samples_count: number;
  negative_samples_count: number;
  top_1_accuracy_percent: number;
  top_5_accuracy_percent: number;
  median_error_km?: number | null;
  negative_abstention_rate_percent: number;
  false_positive_rate_percent: number;
  model_cards: ModelCardEntry[];
  limitations: string[];
  future_work: string[];
  sample_results: EvaluationSampleResult[];
}

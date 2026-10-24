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

export interface AnalyzeResponse {
  status: string;
  filename: string;
  content_type: string;
  format: string;
  size_bytes: number;
  dimensions: ImageDimensions;
  phase: string;
  message: string;
}

export type UploadState = 'idle' | 'selected' | 'uploading' | 'success' | 'error';

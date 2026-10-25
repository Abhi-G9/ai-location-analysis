import { AnalyzeResponse, HealthStatus } from '../types';

/**
 * Resolves and normalizes the backend API base URL.
 * Automatically ensures the '/api/v1' path is included without duplication.
 *
 * Examples:
 * - "https://ai-location-analysis.onrender.com" -> "https://ai-location-analysis.onrender.com/api/v1"
 * - "https://ai-location-analysis.onrender.com/api/v1" -> "https://ai-location-analysis.onrender.com/api/v1"
 * - "https://ai-location-analysis.onrender.com/" -> "https://ai-location-analysis.onrender.com/api/v1"
 * - Unset / local development -> "/api/v1" (proxied to localhost:8000/api/v1 via Vite)
 */
export function getApiBaseUrl(): string {
  const envUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();

  if (!envUrl) {
    return '/api/v1';
  }

  // Strip trailing slashes
  const cleanUrl = envUrl.replace(/\/+$/, '');

  // If already ends with /api/v1, preserve without duplicating
  if (cleanUrl.endsWith('/api/v1')) {
    return cleanUrl;
  }

  return `${cleanUrl}/api/v1`;
}

export const API_BASE_URL = getApiBaseUrl();

export async function checkBackendHealth(): Promise<HealthStatus> {
  const response = await fetch(`${API_BASE_URL}/health`, {
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Backend health check failed with status ${response.status}`);
  }

  return response.json();
}

export async function uploadAndAnalyzeImage(file: File): Promise<AnalyzeResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/analyze`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    let errorDetail = 'Image analysis failed.';
    try {
      const errorJson = await response.json();
      if (errorJson.detail) {
        errorDetail = errorJson.detail;
      }
    } catch {
      errorDetail = `Server returned error (${response.status}: ${response.statusText})`;
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

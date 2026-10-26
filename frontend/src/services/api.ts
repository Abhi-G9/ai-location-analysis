import { AnalyzeResponse, HealthStatus } from '../types';

/**
 * Resolves and normalizes the backend API base URL.
 * Automatically ensures the '/api/v1' path is included without duplication.
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

/**
 * Automatically optimizes large images in the browser before network transmission.
 * Reduces 5-10MB mobile camera photos down to crisp ~300KB Full HD images.
 * Keeps upload speed super fast and prevents backend memory spikes on Render.
 */
export async function optimizeImageForUpload(file: File): Promise<File> {
  // If file is already under 800 KB, no client resizing needed
  if (file.size <= 800 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 1600;
        let { width, height } = img;

        if (width <= MAX_DIM && height <= MAX_DIM && file.size <= 1.2 * 1024 * 1024) {
          resolve(file);
          return;
        }

        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob || blob.size >= file.size) {
              resolve(file);
              return;
            }
            const optimizedFile = new File(
              [blob],
              file.name.replace(/\.[^/.]+$/, '') + '.jpg',
              {
                type: 'image/jpeg',
                lastModified: Date.now(),
              }
            );
            resolve(optimizedFile);
          },
          'image/jpeg',
          0.85
        );
      };
      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

export async function checkBackendHealth(): Promise<HealthStatus> {
  const response = await fetch(`${API_BASE_URL}/health`, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Backend health check failed with status ${response.status}`);
  }

  return response.json();
}

export async function uploadAndAnalyzeImage(file: File): Promise<AnalyzeResponse> {
  // Pre-optimize large smartphone photos for lightning-fast upload and memory protection
  const preparedFile = await optimizeImageForUpload(file);

  const formData = new FormData();
  formData.append('file', preparedFile);

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

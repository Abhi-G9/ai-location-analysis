import React, { useRef, useState } from 'react';
import { UploadCloud, AlertTriangle, X, CheckCircle, FileCheck } from 'lucide-react';
import { uploadAndAnalyzeImage } from '../services/api';
import { AnalyzeResponse, UploadState } from '../types';

interface ImageUploaderProps {
  onSuccess: (result: AnalyzeResponse) => void;
  onReset: () => void;
}

const MAX_SIZE_MB = 10;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onSuccess, onReset }) => {
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateClientFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `Unsupported file format (${file.type || 'unknown'}). Please choose a JPEG, PNG, or WebP image.`;
    }
    const sizeMb = file.size / (1024 * 1024);
    if (sizeMb > MAX_SIZE_MB) {
      return `File size (${sizeMb.toFixed(2)} MB) exceeds the maximum allowed limit of ${MAX_SIZE_MB} MB.`;
    }
    return null;
  };

  const handleFile = (file: File) => {
    setErrorMessage(null);
    const clientError = validateClientFile(file);
    if (clientError) {
      setErrorMessage(clientError);
      setUploadState('error');
      return;
    }

    setSelectedFile(file);
    setUploadState('selected');
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleReset = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadState('idle');
    setErrorMessage(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    onReset();
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setUploadState('uploading');
    setErrorMessage(null);

    try {
      const response = await uploadAndAnalyzeImage(selectedFile);
      setUploadState('success');
      onSuccess(response);
    } catch (err: any) {
      setUploadState('error');
      setErrorMessage(err.message || 'An unexpected error occurred during image intake.');
    }
  };

  return (
    <div className="w-full bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6 sm:p-8 backdrop-blur-sm shadow-xl">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-white mb-2">Upload Photograph for Analysis</h3>
        <p className="text-sm text-slate-400">
          Upload a real-world photograph (landmark, street, building, public square, or landscape).
        </p>
      </div>

      {errorMessage && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start space-x-3 text-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block">Intake Validation Issue:</span>
            <span className="text-xs text-rose-200">{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-400 hover:text-rose-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {!selectedFile ? (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition flex flex-col items-center justify-center ${
            dragActive
              ? 'border-sky-400 bg-sky-500/10 scale-[1.01]'
              : 'border-slate-600 hover:border-slate-500 hover:bg-slate-800/40'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleInputChange}
          />
          <div className="p-4 bg-slate-700/50 rounded-full text-sky-400 mb-4 ring-8 ring-slate-800">
            <UploadCloud className="w-8 h-8" />
          </div>
          <p className="text-base font-semibold text-slate-200 mb-1">
            Click to choose a photograph or drag and drop
          </p>
          <p className="text-xs text-slate-400 mb-3">
            Supports JPEG, PNG, and WebP (Max file size: 10 MB)
          </p>
          <span className="px-3 py-1 rounded-full bg-slate-700/80 text-slate-300 text-xs font-medium">
            Safe intake: decoded safely in memory
          </span>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* Image Preview Box */}
            <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-700 aspect-video flex items-center justify-center">
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt="Photograph preview"
                  className="object-contain max-h-full max-w-full"
                />
              )}
              <button
                onClick={handleReset}
                className="absolute top-3 right-3 p-1.5 bg-slate-900/80 hover:bg-slate-900 text-slate-300 hover:text-white rounded-full backdrop-blur border border-slate-700 transition"
                title="Remove image"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Selected File Details */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center space-x-2 text-sky-400 font-semibold text-sm">
                <FileCheck className="w-5 h-5" />
                <span>File Selected for Intake</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Filename:</span>
                  <span className="text-slate-200 font-mono truncate max-w-[200px]" title={selectedFile.name}>
                    {selectedFile.name}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Declared Type:</span>
                  <span className="text-slate-200 font-mono">{selectedFile.type || 'unknown'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">File Size:</span>
                  <span className="text-slate-200 font-mono">
                    {(selectedFile.size / 1024).toFixed(1)} KB ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                  </span>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleAnalyze}
                  disabled={uploadState === 'uploading'}
                  className={`flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm transition flex items-center justify-center space-x-2 shadow-lg ${
                    uploadState === 'uploading'
                      ? 'bg-sky-700 text-sky-200 cursor-not-allowed'
                      : 'bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold hover:shadow-sky-500/20'
                  }`}
                >
                  {uploadState === 'uploading' ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Verifying & Intake...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Intake & Validate Image</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleReset}
                  disabled={uploadState === 'uploading'}
                  className="py-2.5 px-4 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-700/60 text-sm font-medium transition"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

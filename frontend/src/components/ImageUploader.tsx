import React, { useRef, useState } from 'react';
import { UploadCloud, X, AlertCircle } from 'lucide-react';
import { uploadAndAnalyzeImage } from '../services/api';
import { AnalyzeResponse } from '../types';

interface ImageUploaderProps {
  onSuccess: (result: AnalyzeResponse) => void;
  onReset: () => void;
  onAnalyzingStateChange?: (isAnalyzing: boolean) => void;
}

const MAX_SIZE_MB = 10;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onSuccess,
  onReset,
  onAnalyzingStateChange,
}) => {
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `Unsupported format (${file.type || 'unknown'}). Please select a JPEG, PNG, or WebP photograph.`;
    }
    const sizeMb = file.size / (1024 * 1024);
    if (sizeMb > MAX_SIZE_MB) {
      return `File size (${sizeMb.toFixed(1)} MB) exceeds the ${MAX_SIZE_MB} MB limit.`;
    }
    return null;
  };

  const handleFile = (file: File) => {
    setErrorMessage(null);
    const err = validateFile(file);
    if (err) {
      setErrorMessage(err);
      return;
    }
    setSelectedFile(file);
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
    setIsAnalyzing(false);
    setErrorMessage(null);
    if (onAnalyzingStateChange) onAnalyzingStateChange(false);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    onReset();
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);
    setErrorMessage(null);
    if (onAnalyzingStateChange) onAnalyzingStateChange(true);

    try {
      const response = await uploadAndAnalyzeImage(selectedFile);
      setIsAnalyzing(false);
      if (onAnalyzingStateChange) onAnalyzingStateChange(false);
      onSuccess(response);
    } catch (err: any) {
      setIsAnalyzing(false);
      if (onAnalyzingStateChange) onAnalyzingStateChange(false);
      setErrorMessage(err.message || 'An unexpected error occurred while analyzing the image.');
    }
  };

  return (
    <div className="w-full bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-sm space-y-6">
      {errorMessage && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
          <span className="flex-1">{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-rose-600 hover:text-rose-800">
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
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-3 ${
            dragActive
              ? 'border-blue-500 bg-blue-50/50'
              : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50/60'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleInputChange}
          />
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
            <UploadCloud className="w-6 h-6 text-slate-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">
              Click to select a photo, or drag and drop here
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              JPEG, PNG, or WebP (up to 10 MB)
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Centered Preview Area */}
          <div className="relative max-w-lg mx-auto rounded-xl overflow-hidden bg-slate-100 border border-slate-200 aspect-video flex items-center justify-center">
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Selected preview"
                className="object-contain max-h-full max-w-full"
              />
            )}
            {!isAnalyzing && (
              <button
                onClick={handleReset}
                className="absolute top-2.5 right-2.5 p-1.5 bg-white/90 hover:bg-white text-slate-700 rounded-full shadow-sm border border-slate-200 transition"
                title="Choose different image"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Simple Loading State */}
          {isAnalyzing ? (
            <div className="text-center py-6 space-y-3">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm font-medium text-slate-700">
                Analyzing visual clues and searching for matching locations…
              </p>
            </div>
          ) : (
            /* Clear Analyze Image Button */
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-xs mx-auto">
              <button
                onClick={handleAnalyze}
                className="w-full py-2.5 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
              >
                Analyze Image
              </button>
              <button
                onClick={handleReset}
                className="w-full sm:w-auto py-2.5 px-4 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium text-sm transition"
              >
                Change Photo
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

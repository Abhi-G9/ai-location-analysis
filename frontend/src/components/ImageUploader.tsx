import React, { useRef, useState, useEffect } from 'react';
import {
  UploadCloud,
  X,
  AlertCircle,
  Sparkles,
  Search,
  ShieldCheck,
  Cpu,
  CheckCircle2,
} from 'lucide-react';
import { uploadAndAnalyzeImage } from '../services/api';
import { AnalyzeResponse } from '../types';

interface ImageUploaderProps {
  onSuccess: (result: AnalyzeResponse) => void;
  onReset: () => void;
  onAnalyzingStateChange?: (isAnalyzing: boolean) => void;
}

const MAX_SIZE_MB = 10;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface AnalysisStep {
  id: string;
  label: string;
  detail: string;
  icon: React.ElementType;
}

const ANALYSIS_STEPS: AnalysisStep[] = [
  {
    id: 'forensics',
    label: 'Forensic & EXIF Analysis',
    detail: 'Inspecting hardware tags, GPS coordinates, and camera optics…',
    icon: ShieldCheck,
  },
  {
    id: 'gemini',
    label: 'Gemini Visual Reasoning & OCR',
    detail: 'Analyzing architectural forms, visible text, signage, and scripts…',
    icon: Sparkles,
  },
  {
    id: 'web_matching',
    label: 'Deep Visual & Structural Alignment',
    detail: 'Evaluating dense structural geometry with DINOv2 and OpenCLIP…',
    icon: Search,
  },
  {
    id: 'verification',
    label: 'Reference Imagery & Verification',
    detail: 'Cross-verifying structural cues and calibrating confidence…',
    icon: Cpu,
  },
];

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
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Smoothly cycle through analysis steps to provide real-time feedback
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isAnalyzing) {
      setActiveStepIndex(0);
      interval = setInterval(() => {
        setActiveStepIndex((prev) => (prev < ANALYSIS_STEPS.length - 1 ? prev + 1 : prev));
      }, 2500);
    } else {
      setActiveStepIndex(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAnalyzing]);

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
    setActiveStepIndex(0);
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
    setActiveStepIndex(0);
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
    <div className="w-full bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
          <span className="flex-1 font-medium">{errorMessage}</span>
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
          className={`border-2 border-dashed rounded-2xl p-10 sm:p-12 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center space-y-4 group ${
            dragActive
              ? 'border-blue-500 bg-blue-50/70 scale-[0.99] shadow-inner'
              : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50/70'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleInputChange}
          />
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-50 to-indigo-50 border border-blue-200/70 flex items-center justify-center text-blue-600 group-hover:scale-105 transition-transform duration-200 shadow-xs">
            <UploadCloud className="w-7 h-7 text-blue-600" />
          </div>
          <div className="space-y-1">
            <p className="text-base font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
              Click to select a photo, or drag and drop here
            </p>
            <p className="text-xs text-slate-500">
              Supports JPEG, PNG, or WebP photographs up to 10 MB
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Centered Image Preview Card */}
          <div className="relative max-w-md mx-auto rounded-xl overflow-hidden bg-slate-100/80 border border-slate-200 shadow-inner flex items-center justify-center min-h-[220px] max-h-[360px]">
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Selected preview"
                className="object-contain max-h-[360px] w-full rounded-xl"
              />
            )}
            {!isAnalyzing && (
              <button
                onClick={handleReset}
                className="absolute top-3 right-3 p-1.5 bg-white/95 hover:bg-white text-slate-700 hover:text-slate-900 rounded-full shadow-md border border-slate-200 transition-transform active:scale-95"
                title="Choose different image"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Analysis Active: Multi-Stage Progress State */}
          {isAnalyzing ? (
            <div className="max-w-md mx-auto p-6 rounded-2xl bg-gradient-to-br from-blue-50/50 via-slate-50 to-indigo-50/40 border border-blue-100 shadow-xs space-y-5">
              <div className="text-center space-y-1.5">
                <div className="inline-flex items-center space-x-2 text-blue-600 font-semibold text-sm">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <span>Analyzing visual clues and searching for matching locations…</span>
                </div>
                <p className="text-xs text-slate-500">
                  Executing multi-modal neural inspection and online image search
                </p>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-200/80 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-600 via-indigo-600 to-teal-500 h-1.5 rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${Math.min(100, ((activeStepIndex + 1) / ANALYSIS_STEPS.length) * 100)}%`,
                  }}
                />
              </div>

              {/* Step List */}
              <div className="space-y-2.5 pt-1">
                {ANALYSIS_STEPS.map((step, idx) => {
                  const Icon = step.icon;
                  const isDone = idx < activeStepIndex;
                  const isCurrent = idx === activeStepIndex;

                  return (
                    <div
                      key={step.id}
                      className={`flex items-center space-x-3 p-2.5 rounded-xl border text-xs transition-all duration-300 ${
                        isCurrent
                          ? 'bg-white border-blue-200 shadow-xs text-slate-900 font-medium'
                          : isDone
                          ? 'bg-slate-50/60 border-slate-200/60 text-slate-700'
                          : 'opacity-40 border-transparent text-slate-400'
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 text-xs ${
                          isDone
                            ? 'bg-emerald-100 text-emerald-700'
                            : isCurrent
                            ? 'bg-blue-600 text-white animate-pulse'
                            : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        {isDone ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <Icon className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="truncate">{step.label}</span>
                          {isCurrent && (
                            <span className="text-[10px] text-blue-600 font-semibold uppercase tracking-wider">
                              In Progress
                            </span>
                          )}
                        </div>
                        {isCurrent && (
                          <p className="text-[11px] text-slate-500 truncate mt-0.5 font-normal">
                            {step.detail}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Clear Analyze Image Buttons */
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-sm mx-auto">
              <button
                onClick={handleAnalyze}
                className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-sm transition-all shadow-md shadow-blue-500/20 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center space-x-2"
              >
                <Sparkles className="w-4 h-4 text-blue-200" />
                <span>Analyze Image</span>
              </button>
              <button
                onClick={handleReset}
                className="w-full sm:w-auto py-3 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium text-sm transition active:scale-[0.98]"
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

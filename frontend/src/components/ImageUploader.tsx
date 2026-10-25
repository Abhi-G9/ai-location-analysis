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
  ArrowRight,
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
    label: 'Camera & EXIF Inspection',
    detail: 'Reading camera model, GPS coordinates, and capture metadata…',
    icon: ShieldCheck,
  },
  {
    id: 'gemini',
    label: 'Gemini Visual Reasoning & OCR',
    detail: 'Recognizing background monuments, street signs, and script…',
    icon: Sparkles,
  },
  {
    id: 'alignment',
    label: 'Geographic Search & Verification',
    detail: 'Cross-referencing OpenStreetMap and spatial candidate indexes…',
    icon: Search,
  },
  {
    id: 'calibration',
    label: 'Final Evidence Synthesis',
    detail: 'Pinpointing confirmed coordinates and calibrating confidence…',
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

  // Smoothly cycle through analysis steps to provide real-time user feedback
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isAnalyzing) {
      setActiveStepIndex(0);
      interval = setInterval(() => {
        setActiveStepIndex((prev) => (prev < ANALYSIS_STEPS.length - 1 ? prev + 1 : prev));
      }, 2400);
    } else {
      setActiveStepIndex(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAnalyzing]);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `Unsupported format (${file.type || 'unknown'}). Please choose a JPG, PNG, or WebP photo.`;
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
      setErrorMessage(err.message || 'An error occurred while analyzing the image. Please try again.');
    }
  };

  return (
    <div className="w-full bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-sm transition-all space-y-6">
      {/* Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start space-x-3">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block">Notice:</span>
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-600 hover:text-rose-900 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {!selectedFile ? (
        /* Empty Upload Dropzone */
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center space-y-4 group ${
            dragActive
              ? 'border-teal-500 bg-teal-50/50 scale-[0.99] shadow-inner'
              : 'border-slate-300 hover:border-teal-400 hover:bg-slate-50/60'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleInputChange}
          />

          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-teal-50 to-emerald-50 border border-teal-200/80 flex items-center justify-center text-teal-600 group-hover:scale-105 transition-transform duration-200 shadow-xs">
            <UploadCloud className="w-8 h-8 text-teal-600" />
          </div>

          <div className="space-y-1.5 max-w-sm">
            <p className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-teal-600 transition-colors">
              Choose a photo, or drag it here
            </p>
            <p className="text-xs sm:text-sm text-slate-500 font-normal">
              Supports JPEG, PNG, or WebP up to 10 MB
            </p>
          </div>

          <div className="pt-2 flex items-center space-x-2 text-xs font-semibold text-teal-700">
            <span>Click to browse files</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      ) : (
        /* Image Preview & Analysis Card */
        <div className="space-y-6">
          <div className="relative max-w-md mx-auto rounded-2xl overflow-hidden bg-slate-100/80 border border-slate-200 shadow-inner flex items-center justify-center min-h-[220px] max-h-[380px]">
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Selected preview"
                className="object-contain max-h-[380px] w-full rounded-2xl"
              />
            )}
            {!isAnalyzing && (
              <button
                onClick={handleReset}
                className="absolute top-3 right-3 p-1.5 bg-white/95 hover:bg-white text-slate-700 hover:text-slate-900 rounded-full shadow-md border border-slate-200 transition-transform active:scale-95"
                title="Choose different photo"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Analysis Active: Real-Time Stepper */}
          {isAnalyzing ? (
            <div className="max-w-md mx-auto p-6 rounded-2xl bg-gradient-to-br from-teal-50/40 via-slate-50 to-emerald-50/40 border border-teal-100 shadow-xs space-y-5">
              <div className="text-center space-y-1.5">
                <div className="inline-flex items-center space-x-2 text-teal-800 font-bold text-sm">
                  <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                  <span>Inspecting photo &amp; searching location…</span>
                </div>
                <p className="text-xs text-slate-500">
                  Running Gemini AI visual analysis and spatial verification
                </p>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-200/80 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-500 h-1.5 rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${Math.min(100, ((activeStepIndex + 1) / ANALYSIS_STEPS.length) * 100)}%`,
                  }}
                />
              </div>

              {/* Steps Progress */}
              <div className="space-y-2 pt-1">
                {ANALYSIS_STEPS.map((step, idx) => {
                  const Icon = step.icon;
                  const isDone = idx < activeStepIndex;
                  const isCurrent = idx === activeStepIndex;

                  return (
                    <div
                      key={step.id}
                      className={`flex items-center space-x-3 p-2.5 rounded-xl border text-xs transition-all duration-300 ${
                        isCurrent
                          ? 'bg-white border-teal-200 shadow-xs text-slate-900 font-medium'
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
                            ? 'bg-teal-600 text-white animate-pulse'
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
                            <span className="text-[10px] text-teal-700 font-bold uppercase tracking-wider">
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
            /* Action Buttons */
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-sm mx-auto">
              <button
                onClick={handleAnalyze}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold text-sm transition-all shadow-md shadow-teal-600/20 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 flex items-center justify-center space-x-2"
              >
                <Sparkles className="w-4 h-4 text-emerald-100" />
                <span>Find Location</span>
              </button>
              <button
                onClick={handleReset}
                className="w-full sm:w-auto py-3.5 px-5 rounded-2xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm transition active:scale-[0.98]"
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

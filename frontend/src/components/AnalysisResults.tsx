import React from 'react';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { AnalyzeResponse } from '../types';

interface AnalysisResultsProps {
  result: AnalyzeResponse;
  onReset: () => void;
}

export const AnalysisResults: React.FC<AnalysisResultsProps> = ({ result, onReset }) => {
  return (
    <div className="w-full bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6 sm:p-8 backdrop-blur-sm shadow-xl mt-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 pb-6 border-b border-slate-700/80">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-xl font-bold text-white">Intake & Validation Verified</h3>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                Phase 1 Complete
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{result.message}</p>
          </div>
        </div>

        <button
          onClick={onReset}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-700 hover:bg-slate-600 text-slate-200 transition"
        >
          Analyze Another Image
        </button>
      </div>

      {/* Verified Image Attributes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 my-6">
        <div className="bg-slate-900/70 border border-slate-800 p-4 rounded-xl">
          <span className="text-slate-400 text-xs block mb-1">Detected Format</span>
          <span className="text-base font-bold text-white font-mono">{result.format}</span>
          <span className="text-[11px] text-slate-500 block mt-1">Verified magic byte signature</span>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 p-4 rounded-xl">
          <span className="text-slate-400 text-xs block mb-1">MIME Type</span>
          <span className="text-base font-bold text-sky-400 font-mono">{result.content_type}</span>
          <span className="text-[11px] text-slate-500 block mt-1">MIME header matched</span>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 p-4 rounded-xl">
          <span className="text-slate-400 text-xs block mb-1">Pixel Dimensions</span>
          <span className="text-base font-bold text-emerald-400 font-mono">
            {result.dimensions.width} &times; {result.dimensions.height}
          </span>
          <span className="text-[11px] text-slate-500 block mt-1">Safe non-allocating scan</span>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 p-4 rounded-xl">
          <span className="text-slate-400 text-xs block mb-1">Payload Size</span>
          <span className="text-base font-bold text-purple-400 font-mono">
            {(result.size_bytes / 1024).toFixed(1)} KB
          </span>
          <span className="text-[11px] text-slate-500 block mt-1">Streaming memory limit passed</span>
        </div>
      </div>

      {/* Pipeline Readiness Callout */}
      <div className="bg-slate-900/80 border border-sky-900/40 rounded-xl p-5">
        <div className="flex items-center space-x-2 text-sky-400 font-semibold text-sm mb-3">
          <Sparkles className="w-4 h-4" />
          <span>Multi-Stage Inference Pipeline Roadmap</span>
        </div>

        <div className="space-y-3 text-xs text-slate-300">
          <div className="flex items-start space-x-3 p-3 rounded-lg bg-slate-800/40 border border-slate-700/50">
            <span className="font-bold text-sky-400 flex-shrink-0">Stage A (Now):</span>
            <div className="flex-1">
              <span className="font-medium text-slate-200">Safe Image Intake & Decoding</span>
              <p className="text-slate-400 mt-0.5">
                File integrity verified, size within bounds ({result.size_bytes} bytes), dimensions confirmed ({result.dimensions.width}x{result.dimensions.height}).
              </p>
            </div>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono">
              Ready
            </span>
          </div>

          <div className="flex items-start space-x-3 p-3 rounded-lg bg-slate-800/40 border border-slate-700/50">
            <span className="font-bold text-slate-400 flex-shrink-0">Stage B (Phase 2):</span>
            <div className="flex-1">
              <span className="font-medium text-slate-200">Visual Clues & Metadata Extraction</span>
              <p className="text-slate-400 mt-0.5">
                EXIF GPS & camera tags, OCR for street signs/billboards (RapidOCR/PaddleOCR), and CLIP semantic feature extraction.
              </p>
            </div>
            <span className="text-[10px] bg-slate-700 text-slate-400 px-2 py-0.5 rounded font-mono">
              Next Phase
            </span>
          </div>

          <div className="flex items-start space-x-3 p-3 rounded-lg bg-slate-800/40 border border-slate-700/50">
            <span className="font-bold text-slate-400 flex-shrink-0">Stage C-E (Phases 3-5):</span>
            <div className="flex-1">
              <span className="font-medium text-slate-200">Candidate Retrieval, Ranking & Evidence Verification</span>
              <p className="text-slate-400 mt-0.5">
                Kota/Rajasthan curated candidate dataset, DINOv2 visual matching, conservative confidence scoring, Leaflet mapping with abstention when evidence is insufficient.
              </p>
            </div>
            <span className="text-[10px] bg-slate-700 text-slate-400 px-2 py-0.5 rounded font-mono">
              Planned
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

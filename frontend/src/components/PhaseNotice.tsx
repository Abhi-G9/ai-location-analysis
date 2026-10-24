import React from 'react';
import { Award, CheckCircle2 } from 'lucide-react';

export const PhaseNotice: React.FC = () => {
  return (
    <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-800/40 rounded-xl p-5 mb-8 shadow-sm">
      <div className="flex items-start space-x-3">
        <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg mt-0.5">
          <Award className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
            <h2 className="text-sm font-semibold text-emerald-300">
              All 6 Phases Completed: Production-Grade AI Image Geolocation Website
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Full Pipeline & Evaluation Verified</span>
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed mb-3">
            <strong>GeoLens AI</strong> has successfully implemented and verified all six development phases:
            safe image intake &bull; EXIF & RapidOCR forensics &bull; Kota geographic candidate database &bull;
            DINOv2 + OpenCLIP + OpenCV RANSAC visual ranking &bull; Leaflet interactive mapping &bull;
            and Phase 6 systematic evaluation with model cards and privacy hardening.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-[11px]">
            <div className="bg-emerald-900/40 border border-emerald-500/40 text-emerald-300 px-2.5 py-1.5 rounded text-center">
              1. Foundation ✓
            </div>
            <div className="bg-emerald-900/40 border border-emerald-500/40 text-emerald-300 px-2.5 py-1.5 rounded text-center">
              2. Visual Clues ✓
            </div>
            <div className="bg-emerald-900/40 border border-emerald-500/40 text-emerald-300 px-2.5 py-1.5 rounded text-center">
              3. Candidate DB ✓
            </div>
            <div className="bg-emerald-900/40 border border-emerald-500/40 text-emerald-300 px-2.5 py-1.5 rounded text-center">
              4. AI Matching ✓
            </div>
            <div className="bg-emerald-900/40 border border-emerald-500/40 text-emerald-300 px-2.5 py-1.5 rounded text-center">
              5. Map & Verify ✓
            </div>
            <div className="bg-emerald-900/60 border border-emerald-400/80 text-emerald-200 px-2.5 py-1.5 rounded text-center font-bold ring-1 ring-emerald-500/40">
              6. Evaluation ★
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

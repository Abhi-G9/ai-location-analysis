import React from 'react';
import { Layers } from 'lucide-react';

export const PhaseNotice: React.FC = () => {
  return (
    <div className="bg-gradient-to-r from-sky-950/40 via-slate-900 to-slate-900 border border-sky-800/40 rounded-xl p-5 mb-8 shadow-sm">
      <div className="flex items-start space-x-3">
        <div className="p-2 bg-sky-500/20 text-sky-400 rounded-lg mt-0.5">
          <Layers className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
            <h2 className="text-sm font-semibold text-sky-300">
              Phase 1 Milestone: Intake & System Foundation
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Honest AI Architecture
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed mb-3">
            In Phase 1, we set up the core infrastructure: strict file validation, magic byte checking, memory-safe decoding,
            and health connectivity. In accordance with our engineering principles, we do not pretend a pretrained model can
            fabricate an exact address out of thin air. Real visual geolocation (EXIF, OCR, CLIP, DINOv2) starts in Phase 2.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-[11px]">
            <div className="bg-sky-900/40 border border-sky-500/40 text-sky-200 px-2.5 py-1.5 rounded text-center font-medium">
              1. Foundation ✓
            </div>
            <div className="bg-slate-800/60 border border-slate-700/60 text-slate-400 px-2.5 py-1.5 rounded text-center">
              2. Visual Clues
            </div>
            <div className="bg-slate-800/60 border border-slate-700/60 text-slate-400 px-2.5 py-1.5 rounded text-center">
              3. Candidate DB
            </div>
            <div className="bg-slate-800/60 border border-slate-700/60 text-slate-400 px-2.5 py-1.5 rounded text-center">
              4. AI Matching
            </div>
            <div className="bg-slate-800/60 border border-slate-700/60 text-slate-400 px-2.5 py-1.5 rounded text-center">
              5. Map & Verify
            </div>
            <div className="bg-slate-800/60 border border-slate-700/60 text-slate-400 px-2.5 py-1.5 rounded text-center">
              6. Evaluation
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

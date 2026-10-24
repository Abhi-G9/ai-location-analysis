import React from 'react';
import { Layers, CheckCircle2 } from 'lucide-react';

export const PhaseNotice: React.FC = () => {
  return (
    <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-800/40 rounded-xl p-5 mb-8 shadow-sm">
      <div className="flex items-start space-x-3">
        <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg mt-0.5">
          <Layers className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
            <h2 className="text-sm font-semibold text-emerald-300">
              Phase 2 Active: Visual Clues & Image Analysis Pipeline
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Multi-Stage Clue Extraction</span>
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed mb-3">
            In Phase 2, the pipeline extracts investigative clues without jumping to conclusions: EXIF metadata (camera make, model, GPS tags if present),
            RapidOCR text reading for road signs and shop boards, computer vision heuristics (lighting, sharpness, dominant color palette), and
            zero-shot visual semantics using OpenCLIP. Candidate database retrieval begins in Phase 3.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-[11px]">
            <div className="bg-slate-800/80 border border-slate-700 text-slate-400 px-2.5 py-1.5 rounded text-center">
              1. Foundation ✓
            </div>
            <div className="bg-emerald-900/50 border border-emerald-500/60 text-emerald-200 px-2.5 py-1.5 rounded text-center font-semibold ring-1 ring-emerald-500/30">
              2. Visual Clues ★
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

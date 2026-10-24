import React, { useState } from 'react';
import {
  CheckCircle2,
  Camera,
  MapPin,
  FileText,
  Sparkles,
  Sliders,
  AlertCircle,
  Eye,
  Info,
  Layers,
  Search,
  Compass,
  ShieldCheck,
  Award,
  Cpu,
  AlertTriangle,
  Navigation,
} from 'lucide-react';
import { AnalyzeResponse } from '../types';
import { MapViewer } from './MapViewer';

interface AnalysisResultsProps {
  result: AnalyzeResponse;
  onReset: () => void;
}

export const AnalysisResults: React.FC<AnalysisResultsProps> = ({ result, onReset }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'ranking' | 'exif' | 'ocr' | 'clip' | 'heuristics'>('overview');

  const { exif, ocr, clip, heuristics, retrieval, verification } = result;
  const topCandidate = retrieval.top_candidate || (retrieval.candidates.length > 0 ? retrieval.candidates[0] : null);

  // Confidence Category styling helper
  const getConfidenceBadge = (cat: string) => {
    switch (cat) {
      case 'Verified Match':
        return {
          bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          dot: 'bg-emerald-400',
          icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
        };
      case 'Plausible Candidate':
        return {
          bg: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
          dot: 'bg-blue-400',
          icon: <Compass className="w-4 h-4 text-blue-400" />,
        };
      case 'Low Confidence':
        return {
          bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          dot: 'bg-amber-400',
          icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
        };
      case 'Insufficient Evidence':
      default:
        return {
          bg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
          dot: 'bg-rose-400',
          icon: <AlertCircle className="w-4 h-4 text-rose-400" />,
        };
    }
  };

  const confBadge = getConfidenceBadge(verification.confidence_category);

  return (
    <div className="w-full bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6 sm:p-8 backdrop-blur-sm shadow-xl mt-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 pb-6 border-b border-slate-700/80">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-xl font-bold text-white">Investigation & Spatial Verification</h3>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                Phase 5 Active
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              File: <span className="font-mono text-slate-200">{result.filename}</span> &bull;{' '}
              {result.dimensions.width} &times; {result.dimensions.height} px &bull;{' '}
              {(result.size_bytes / 1024).toFixed(1)} KB ({result.format})
            </p>
          </div>
        </div>

        <button
          onClick={onReset}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-700 hover:bg-slate-600 text-slate-200 transition"
        >
          Analyze Another Image
        </button>
      </div>

      {/* PHASE 5: VERIFICATION & CONFIDENCE HERO BANNER */}
      <div className="my-6 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-700 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3 flex-wrap gap-2">
            {/* Confidence Category Badge */}
            <div
              className={`flex items-center space-x-2 px-3 py-1 rounded-xl border text-xs font-bold ${confBadge.bg}`}
            >
              {confBadge.icon}
              <span>{verification.confidence_category}</span>
            </div>

            {/* Precision Level Badge */}
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs font-mono">
              <TargetIcon className="w-3.5 h-3.5 text-sky-400" />
              <span>Precision: {verification.precision_level.replace('_', ' ')}</span>
            </div>

            {/* Estimated Error Margin */}
            {verification.estimated_error_km !== null && verification.estimated_error_km !== undefined ? (
              <div className="flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-slate-800 border border-slate-700 text-emerald-300 text-xs font-mono">
                <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                <span>Error Radius: &plusmn;{verification.estimated_error_km} km</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 text-xs font-mono">
                <span>Error Radius: Withheld (Insufficient Data)</span>
              </div>
            )}
          </div>

          {topCandidate && !verification.abstention && (
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400">Composite Score:</span>
              <span className="text-sm font-mono font-bold px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {topCandidate.composite_rank_score !== undefined && topCandidate.composite_rank_score !== null
                  ? `${(topCandidate.composite_rank_score * 100).toFixed(1)}%`
                  : 'N/A'}
              </span>
            </div>
          )}
        </div>

        {/* Verification Content Body */}
        {verification.abstention ? (
          <div className="pt-4 flex items-start space-x-3">
            <AlertCircle className="w-6 h-6 text-rose-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-base font-bold text-white mb-1">
                Honest Abstention: Specific Landmark Coordinates Withheld
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed mb-2">
                {verification.abstention_reason ||
                  'The uploaded photograph does not exhibit sufficient visual or metadata evidence to localize to a specific landmark in Kota, Rajasthan.'}
              </p>
              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 text-xs text-slate-400">
                <span className="font-semibold text-slate-300 block mb-1">Verification Rationale:</span>
                {verification.confidence_basis}
              </div>
            </div>
          </div>
        ) : topCandidate ? (
          <div className="pt-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                    #1 Verified Candidate
                  </span>
                </div>
                <h4 className="text-2xl font-bold text-white mb-1">{topCandidate.name}</h4>
                <p className="text-xs text-slate-300 max-w-2xl">{topCandidate.description}</p>
              </div>

              <div className="text-left md:text-right flex-shrink-0">
                <span className="text-sm font-mono text-white block font-bold">
                  {topCandidate.latitude.toFixed(5)}&deg; N, {topCandidate.longitude.toFixed(5)}&deg; E
                </span>
                <span className="text-xs text-slate-400 block">
                  {topCandidate.city}, {topCandidate.district}, {topCandidate.state}
                </span>
                {topCandidate.distance_km !== null && topCandidate.distance_km !== undefined && (
                  <span className="text-xs font-mono text-emerald-400 block mt-1">
                    &bull; {topCandidate.distance_km.toFixed(2)} km from image GPS capture point
                  </span>
                )}
              </div>
            </div>

            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 text-xs text-slate-300 flex items-start space-x-2">
              <Info className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-white">Confidence Basis: </span>
                <span>{verification.confidence_basis}</span>
              </div>
            </div>

            {/* AI Feature Meters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 text-xs">
              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-slate-400 text-[11px]">DINOv2 Structural Sim:</span>
                  <span className="font-mono font-bold text-sky-300">
                    {topCandidate.dinov2_structural_similarity !== undefined && topCandidate.dinov2_structural_similarity !== null
                      ? topCandidate.dinov2_structural_similarity.toFixed(3)
                      : 'N/A'}
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-sky-400 h-1.5 rounded-full"
                    style={{
                      width: `${Math.max(5, Math.min(100, ((topCandidate.dinov2_structural_similarity || 0) + 0.1) * 110))}%`,
                    }}
                  />
                </div>
              </div>

              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-slate-400 text-[11px]">CLIP Visual-Semantic Sim:</span>
                  <span className="font-mono font-bold text-purple-300">
                    {topCandidate.clip_visual_similarity !== undefined && topCandidate.clip_visual_similarity !== null
                      ? topCandidate.clip_visual_similarity.toFixed(3)
                      : 'N/A'}
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-purple-400 h-1.5 rounded-full"
                    style={{
                      width: `${Math.max(5, Math.min(100, ((topCandidate.clip_visual_similarity || 0) + 0.1) * 110))}%`,
                    }}
                  />
                </div>
              </div>

              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-slate-400 text-[11px]">OpenCV Keypoint Inliers:</span>
                  <span className="font-mono font-bold text-emerald-300">
                    {topCandidate.opencv_feature_inliers ?? 0} inliers
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 block truncate">
                  {topCandidate.structural_agreement || 'Evaluated'}
                </span>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-700 mb-6 overflow-x-auto space-x-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 px-3 text-xs font-semibold flex items-center space-x-1.5 border-b-2 transition whitespace-nowrap ${
            activeTab === 'overview'
              ? 'border-sky-400 text-sky-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Interactive Map & Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('ranking')}
          className={`pb-3 px-3 text-xs font-semibold flex items-center space-x-1.5 border-b-2 transition whitespace-nowrap ${
            activeTab === 'ranking'
              ? 'border-emerald-400 text-emerald-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Award className="w-4 h-4 text-amber-400" />
          <span>
            Candidate Ranking ({retrieval.candidates.length > 0 ? `${retrieval.candidates.length} Ranked` : 'Abstained'})
          </span>
        </button>

        <button
          onClick={() => setActiveTab('exif')}
          className={`pb-3 px-3 text-xs font-semibold flex items-center space-x-1.5 border-b-2 transition whitespace-nowrap ${
            activeTab === 'exif'
              ? 'border-sky-400 text-sky-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>EXIF & GPS ({exif.has_gps ? 'GPS Found' : exif.has_exif ? 'Tags Present' : 'No EXIF'})</span>
        </button>

        <button
          onClick={() => setActiveTab('ocr')}
          className={`pb-3 px-3 text-xs font-semibold flex items-center space-x-1.5 border-b-2 transition whitespace-nowrap ${
            activeTab === 'ocr'
              ? 'border-sky-400 text-sky-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Visible Text ({ocr.total_lines_found} lines)</span>
        </button>

        <button
          onClick={() => setActiveTab('clip')}
          className={`pb-3 px-3 text-xs font-semibold flex items-center space-x-1.5 border-b-2 transition whitespace-nowrap ${
            activeTab === 'clip'
              ? 'border-sky-400 text-sky-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>OpenCLIP Semantics</span>
        </button>

        <button
          onClick={() => setActiveTab('heuristics')}
          className={`pb-3 px-3 text-xs font-semibold flex items-center space-x-1.5 border-b-2 transition whitespace-nowrap ${
            activeTab === 'heuristics'
              ? 'border-sky-400 text-sky-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Image Properties</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW WITH INTERACTIVE MAP */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Interactive Leaflet Map Component */}
          <div>
            <MapViewer
              topCandidate={topCandidate}
              alternativeCandidates={verification.alternative_candidates}
              verification={verification}
              cameraGPS={exif.gps}
            />
          </div>

          {/* Verification Evidence & Confounding Factors Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Supporting Evidence List */}
            <div className="bg-slate-900/80 border border-emerald-900/40 rounded-xl p-5">
              <div className="flex items-center space-x-2 text-emerald-400 font-semibold text-sm mb-3">
                <ShieldCheck className="w-4 h-4" />
                <span>Supporting Evidence Cross-Check</span>
              </div>
              {verification.supporting_evidence.length > 0 ? (
                <ul className="space-y-2 text-xs text-slate-300">
                  {verification.supporting_evidence.map((item, idx) => (
                    <li key={idx} className="flex items-start space-x-2.5">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-400">
                  No positive cross-verification checks passed. Prediction withheld to maintain geolocation integrity.
                </p>
              )}
            </div>

            {/* Honest Confounding Factors */}
            <div className="bg-slate-900/80 border border-amber-900/40 rounded-xl p-5">
              <div className="flex items-center space-x-2 text-amber-400 font-semibold text-sm mb-3">
                <AlertTriangle className="w-4 h-4" />
                <span>Why This Prediction Might Be Wrong (Confounders)</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-300">
                {verification.confounding_factors.map((factor, idx) => (
                  <li key={idx} className="flex items-start space-x-2.5">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                    <span>{factor}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Alternative Candidates Section */}
          {verification.alternative_candidates.length > 0 && !verification.abstention && (
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
                  <Compass className="w-4 h-4 text-sky-400" />
                  <span>Alternative Candidate Locations</span>
                </h4>
                <span className="text-[11px] text-slate-400">
                  {verification.alternative_candidates.length} alternatives evaluated
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {verification.alternative_candidates.map((alt) => (
                  <div key={alt.id} className="bg-slate-950/70 p-3 rounded-lg border border-slate-800 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-white truncate max-w-[140px]">{alt.name}</span>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                        Rank #{alt.rank}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mb-2 truncate">{alt.category.replace('_', ' ')}</p>
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">Score:</span>
                      <span className="font-mono font-bold text-sky-300">
                        {alt.composite_rank_score !== undefined && alt.composite_rank_score !== null
                          ? `${(alt.composite_rank_score * 100).toFixed(1)}%`
                          : 'N/A'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Executive Clues Summary Box */}
          <div className="bg-slate-900/80 border border-sky-900/40 rounded-xl p-5">
            <div className="flex items-center space-x-2 text-sky-400 font-semibold text-sm mb-3">
              <Eye className="w-4 h-4" />
              <span>Extracted Investigative Clues & Model Signals</span>
            </div>
            <ul className="space-y-2 text-xs text-slate-300">
              {result.summary_clues.map((clue, idx) => (
                <li key={idx} className="flex items-start space-x-2.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-sky-400 mt-1.5 flex-shrink-0" />
                  <span>{clue}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* TAB 2: CANDIDATE RANKING */}
      {activeTab === 'ranking' && (
        <div className="space-y-4">
          {/* Methodology Banner */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 text-xs">
            <div className="flex items-center space-x-2 text-sky-400 font-bold mb-1">
              <Cpu className="w-4 h-4" />
              <span>Documented Multi-Modal Ranking Methodology</span>
            </div>
            <p className="text-slate-300 mb-2">{retrieval.ranking_methodology}</p>
            <p className="text-[11px] text-slate-500">
              Note: Similarity values are relative mathematical feature alignments, not calibrated probabilities of correctness.
            </p>
          </div>

          {retrieval.abstention || retrieval.candidates.length === 0 ? (
            <div className="p-6 rounded-xl bg-slate-900/80 border border-amber-500/30 text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
              <h4 className="text-sm font-bold text-white">Honest Abstention: No Candidate Match</h4>
              <p className="text-xs text-slate-300 max-w-lg mx-auto">
                {retrieval.message}
              </p>
              <div className="inline-flex items-center space-x-1.5 text-[11px] text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Anti-Hallucination Guardrail Active</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {retrieval.candidates.map((candidate) => (
                <div
                  key={candidate.id}
                  className={`bg-slate-900/80 border rounded-xl p-5 transition space-y-3 ${
                    candidate.rank === 1
                      ? 'border-emerald-500/50 shadow-md ring-1 ring-emerald-500/20'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div className="flex items-center space-x-3">
                      <span
                        className={`text-xs font-mono px-2.5 py-1 rounded-lg font-bold ${
                          candidate.rank === 1
                            ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        Rank #{candidate.rank}
                      </span>
                      <div>
                        <h4 className="text-base font-bold text-white">{candidate.name}</h4>
                        <span className="text-xs text-sky-400">{candidate.category}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-slate-400">Score:</span>
                      <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-slate-800 text-white border border-slate-700">
                        {candidate.composite_rank_score !== undefined && candidate.composite_rank_score !== null
                          ? `${(candidate.composite_rank_score * 100).toFixed(1)}%`
                          : 'N/A'}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300">{candidate.description}</p>

                  {/* Feature Breakdown Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 text-xs">
                    <div className="p-2.5 bg-slate-950/70 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-500 block">DINOv2 Structural Sim</span>
                      <span className="font-mono text-sky-300 font-bold">
                        {candidate.dinov2_structural_similarity !== undefined && candidate.dinov2_structural_similarity !== null
                          ? candidate.dinov2_structural_similarity.toFixed(3)
                          : '0.000'}
                      </span>
                    </div>

                    <div className="p-2.5 bg-slate-950/70 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-500 block">CLIP Visual-Semantic Sim</span>
                      <span className="font-mono text-purple-300 font-bold">
                        {candidate.clip_visual_similarity !== undefined && candidate.clip_visual_similarity !== null
                          ? candidate.clip_visual_similarity.toFixed(3)
                          : '0.000'}
                      </span>
                    </div>

                    <div className="p-2.5 bg-slate-950/70 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-500 block">OpenCV RANSAC Inliers</span>
                      <span className="font-mono text-emerald-300 font-bold">
                        {candidate.opencv_feature_inliers ?? 0} matches
                      </span>
                    </div>
                  </div>

                  {/* Supporting Clues */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-2 text-xs">
                    <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                      <span className="text-slate-400 text-[11px]">Matched by:</span>
                      {candidate.matched_clues.map((clue, cIdx) => (
                        <span
                          key={cIdx}
                          className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[10px] font-semibold"
                        >
                          {clue}
                        </span>
                      ))}
                    </div>

                    <div className="text-[11px] font-mono text-slate-400">
                      {candidate.latitude.toFixed(4)}&deg; N, {candidate.longitude.toFixed(4)}&deg; E
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: EXIF & GPS */}
      {activeTab === 'exif' && (
        <div className="space-y-4">
          {exif.has_gps && exif.gps ? (
            <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-xl p-5">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm mb-3">
                <MapPin className="w-5 h-5" />
                <span>Embedded GPS Coordinates Detected in Header</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Latitude</span>
                  <span className="text-white font-mono font-bold">{exif.gps.latitude.toFixed(6)}&deg;</span>
                </div>
                <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Longitude</span>
                  <span className="text-white font-mono font-bold">{exif.gps.longitude.toFixed(6)}&deg;</span>
                </div>
                <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Altitude</span>
                  <span className="text-white font-mono">
                    {exif.gps.altitude_m !== null ? `${exif.gps.altitude_m} m` : 'N/A'}
                  </span>
                </div>
                <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Heading</span>
                  <span className="text-white font-mono">
                    {exif.gps.heading_deg !== null ? `${exif.gps.heading_deg}&deg;` : 'N/A'}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-emerald-300/80 mt-3 flex items-center space-x-1.5">
                <Info className="w-3.5 h-3.5" />
                <span>
                  Reminder: In accordance with our principles, metadata is considered an investigative clue, not infallible proof.
                </span>
              </p>
            </div>
          ) : (
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 text-xs text-slate-400 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-200 block mb-0.5">No GPS Coordinates in EXIF</span>
                <span>
                  Social platforms automatically scrub EXIF metadata upon upload to protect user privacy.
                  Our multi-stage pipeline relies primarily on visual clues (text, architecture, CLIP embeddings) when GPS tags are missing.
                </span>
              </div>
            </div>
          )}

          {/* Camera Parameters Table */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center space-x-2">
              <Camera className="w-4 h-4 text-sky-400" />
              <span>Camera & Capture Settings</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Camera Make:</span>
                <span className="text-slate-200 font-medium">{exif.camera_make || 'Unknown'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Model:</span>
                <span className="text-slate-200 font-medium">{exif.camera_model || 'Unknown'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Capture Timestamp:</span>
                <span className="text-slate-200 font-medium">{exif.capture_date || 'Not recorded'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Focal Length:</span>
                <span className="text-slate-200 font-mono">
                  {exif.focal_length_mm ? `${exif.focal_length_mm} mm` : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Aperture:</span>
                <span className="text-slate-200 font-mono">
                  {exif.aperture_f_number ? `f/${exif.aperture_f_number}` : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Exposure Time:</span>
                <span className="text-slate-200 font-mono">{exif.exposure_time_sec || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">ISO Speed:</span>
                <span className="text-slate-200 font-mono">{exif.iso_speed || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Orientation Code:</span>
                <span className="text-slate-200 font-mono">{exif.orientation || 'Standard (1)'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: VISIBLE TEXT & OCR */}
      {activeTab === 'ocr' && (
        <div className="space-y-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
                <FileText className="w-4 h-4 text-amber-400" />
                <span>RapidOCR Text Extractions ({ocr.total_lines_found} lines found)</span>
              </h4>
              <span className="text-[10px] text-slate-400 font-mono">ONNX Runtime Engine</span>
            </div>

            {ocr.candidate_geo_clues.length > 0 && (
              <div className="mb-4 p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                <span className="text-xs font-bold text-amber-300 block mb-2">
                  Potential Geographic Indicators Found in Signage:
                </span>
                <div className="flex flex-wrap gap-2">
                  {ocr.candidate_geo_clues.map((clue, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-200 text-xs font-bold border border-amber-500/30 flex items-center space-x-1"
                    >
                      <Search className="w-3 h-3" />
                      <span>{clue}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {ocr.detected_lines.length > 0 ? (
              <div className="divide-y divide-slate-800">
                {ocr.detected_lines.map((line, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                    <span className="font-mono text-slate-200">&ldquo;{line.text}&rdquo;</span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                      {(line.confidence * 100).toFixed(1)}% conf
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 text-xs">
                <FileText className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                <p>No legible text detected on signs, road markers, or buildings in this image.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: OPENCLIP SEMANTICS */}
      {activeTab === 'clip' && (
        <div className="space-y-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>Zero-Shot Architectural & Environmental Classification</span>
              </h4>
              <span className="text-[10px] text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded font-mono">
                {clip.model_name}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mb-4">{clip.note}</p>

            <div className="space-y-3">
              {clip.top_environments.map((env, idx) => (
                <div key={idx} className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="font-bold text-slate-200">{env.label}</span>
                    <div className="space-x-2 font-mono text-[11px]">
                      <span className="text-slate-400">Cosine Sim:</span>
                      <span className="text-purple-300 font-bold">{env.cosine_similarity.toFixed(4)}</span>
                      <span className="text-slate-500">&bull;</span>
                      <span className="text-slate-400">Rel:</span>
                      <span className="text-purple-400 font-bold">{env.relative_score.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-purple-500 h-1.5 rounded-full"
                      style={{
                        width: `${Math.max(5, Math.min(100, (env.cosine_similarity + 0.1) * 120))}%`,
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-1">{env.description}</span>
                </div>
              ))}
            </div>

            {/* Embedding Vector Preview */}
            <div className="mt-6 pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-slate-400">Visual Feature Vector ({clip.embedding_dims} Dimensions):</span>
                <span className="text-[11px] text-slate-500 font-mono">Normalized unit sphere representation</span>
              </div>
              <div className="flex flex-wrap gap-1 font-mono text-[10px]">
                {clip.embedding_preview.map((val, idx) => (
                  <span key={idx} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                    {val.toFixed(3)}
                  </span>
                ))}
                <span className="px-1.5 py-0.5 text-slate-500">...</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: HEURISTICS & PROPERTIES */}
      {activeTab === 'heuristics' && (
        <div className="space-y-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <span>Image Characteristics & Color Palette</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block mb-1">Lighting Condition</span>
                <span className="text-sm font-bold text-white block">{heuristics.lighting_condition}</span>
                <span className="text-[11px] text-slate-400 font-mono">
                  Mean luminance: {heuristics.brightness_percent}%
                </span>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block mb-1">Focus Quality</span>
                <span className="text-sm font-bold text-white block">{heuristics.focus_quality}</span>
                <span className="text-[11px] text-slate-400 font-mono">
                  Laplacian var: {heuristics.sharpness_score}
                </span>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block mb-1">Framing / Aspect Ratio</span>
                <span className="text-sm font-bold text-white block">{heuristics.framing}</span>
                <span className="text-[11px] text-slate-400 font-mono">Ratio: {heuristics.aspect_ratio}</span>
              </div>
            </div>

            {/* Dominant Color Palette */}
            <div>
              <span className="text-xs font-bold text-slate-300 block mb-2">
                Dominant Color Swatches (Quantized K-Means):
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {heuristics.dominant_colors.map((color, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center space-x-3"
                  >
                    <div
                      className="w-8 h-8 rounded-lg shadow-inner border border-white/20 flex-shrink-0"
                      style={{ backgroundColor: color.hex }}
                    />
                    <div className="text-xs">
                      <span className="font-mono font-bold text-white block">{color.hex.toUpperCase()}</span>
                      <span className="text-[11px] text-slate-400">{color.percentage}% area</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Honest AI Milestone Notice Footer */}
      <div className="mt-8 pt-4 border-t border-slate-700/60 flex items-center justify-between flex-wrap gap-2 text-xs text-slate-400">
        <span className="flex items-center space-x-1.5">
          <Info className="w-3.5 h-3.5 text-sky-400" />
          <span>
            Phase 5 complete: Interactive Leaflet mapping, evidence cross-verification, and calibrated confidence active.
          </span>
        </span>
        <span className="font-mono text-[11px] text-emerald-400">Pipeline Stage E & F Verified</span>
      </div>
    </div>
  );
};

// Supporting target icon helper
const TargetIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

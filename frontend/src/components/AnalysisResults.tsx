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
} from 'lucide-react';
import { AnalyzeResponse } from '../types';

interface AnalysisResultsProps {
  result: AnalyzeResponse;
  onReset: () => void;
}

export const AnalysisResults: React.FC<AnalysisResultsProps> = ({ result, onReset }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'exif' | 'ocr' | 'clip' | 'heuristics'>('overview');

  const { exif, ocr, clip, heuristics } = result;

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
              <h3 className="text-xl font-bold text-white">Visual Analysis & Clues Extracted</h3>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                Phase 2 Complete
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

      {/* Executive Clues Summary Box */}
      <div className="my-6 bg-slate-900/80 border border-sky-900/40 rounded-xl p-5">
        <div className="flex items-center space-x-2 text-sky-400 font-semibold text-sm mb-3">
          <Eye className="w-4 h-4" />
          <span>Extracted Investigative Clues Summary</span>
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
          <span>Overview</span>
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

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* EXIF Snapshot */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                <Camera className="w-4 h-4 text-sky-400" />
                <span>EXIF Metadata Status</span>
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                  exif.has_gps
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : exif.has_exif
                    ? 'bg-sky-500/20 text-sky-300'
                    : 'bg-slate-700 text-slate-400'
                }`}
              >
                {exif.has_gps ? 'GPS Coordinates Available' : exif.has_exif ? 'Metadata Present' : 'Scrubbed / Missing'}
              </span>
            </div>
            {exif.has_gps && exif.gps ? (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-200">
                <div className="flex items-center space-x-1.5 font-bold mb-1">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  <span>
                    Lat: {exif.gps.latitude.toFixed(6)} &bull; Lon: {exif.gps.longitude.toFixed(6)}
                  </span>
                </div>
                <p className="text-[11px] text-emerald-300/80">Source: {exif.gps.coordinate_provenance}</p>
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                {exif.camera_make || exif.camera_model
                  ? `Captured with ${exif.camera_make || ''} ${exif.camera_model || ''}. GPS tags absent.`
                  : 'No embedded GPS tags or camera metadata were found in this file.'}
              </p>
            )}
          </div>

          {/* OCR Snapshot */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                <FileText className="w-4 h-4 text-amber-400" />
                <span>Visible Text Reading (RapidOCR)</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                {ocr.total_lines_found} Region(s)
              </span>
            </div>
            {ocr.candidate_geo_clues.length > 0 ? (
              <div className="space-y-1.5">
                <span className="text-[11px] text-slate-400 block">Candidate Geographic Keywords:</span>
                <div className="flex flex-wrap gap-1.5">
                  {ocr.candidate_geo_clues.map((kw, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold text-xs"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            ) : ocr.total_lines_found > 0 ? (
              <p className="text-xs text-slate-300 truncate font-mono">
                &ldquo;{ocr.combined_text}&rdquo;
              </p>
            ) : (
              <p className="text-xs text-slate-400">No legible text found in this photograph.</p>
            )}
          </div>

          {/* CLIP Snapshot */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>Top Scene Semantic Match (OpenCLIP)</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono">
                ViT-B-32
              </span>
            </div>
            {clip.top_environments.length > 0 ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-white">{clip.top_environments[0].label}</span>
                  <span className="text-purple-300 font-mono">
                    sim: {clip.top_environments[0].cosine_similarity.toFixed(3)}
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-purple-500 h-1.5 rounded-full"
                    style={{
                      width: `${Math.max(
                        5,
                        Math.min(100, (clip.top_environments[0].cosine_similarity + 0.2) * 100)
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">CLIP visual classification unavailable.</p>
            )}
          </div>

          {/* Heuristics Snapshot */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                <Sliders className="w-4 h-4 text-emerald-400" />
                <span>Lighting & Focus</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                {heuristics.framing}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-slate-800/60 rounded">
                <span className="text-slate-400 text-[10px] block">Condition:</span>
                <span className="text-slate-200 font-medium">{heuristics.lighting_condition}</span>
              </div>
              <div className="p-2 bg-slate-800/60 rounded">
                <span className="text-slate-400 text-[10px] block">Detail:</span>
                <span className="text-slate-200 font-medium">{heuristics.focus_quality}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EXIF & GPS */}
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
                  Social platforms (WhatsApp, Twitter/X, Instagram) automatically scrub EXIF metadata upon upload to protect user privacy.
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

      {/* TAB 3: VISIBLE TEXT & OCR */}
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

      {/* TAB 4: OPENCLIP SEMANTICS */}
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
                <span className="text-[11px] text-slate-500 font-mono">Cached for Phase 4 matching</span>
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

      {/* TAB 5: HEURISTICS & PROPERTIES */}
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
            Phase 2 complete: Real clues extracted. Candidate location retrieval and geospatial matching begin in Phase 3.
          </span>
        </span>
        <span className="font-mono text-[11px] text-emerald-400">Pipeline Stage B Verified</span>
      </div>
    </div>
  );
};

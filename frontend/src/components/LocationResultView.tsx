import React from 'react';
import {
  AlertCircle,
  FileText,
  Camera,
  CheckCircle2,
  Building,
  ExternalLink,
  Sparkles,
  Globe,
  Compass,
  Layers,
  ShieldCheck,
  Tag,
} from 'lucide-react';
import { AnalyzeResponse, LocationResult } from '../types';

interface LocationResultViewProps {
  result: AnalyzeResponse;
}

export const LocationResultView: React.FC<LocationResultViewProps> = ({ result }) => {
  // Extract or synthesize LocationResult from the response
  const loc: LocationResult = result.location || {
    is_determined: !result.verification.abstention && !!result.verification.verified_candidate,
    unreliable_reason: result.verification.abstention
      ? 'Location could not be reliably determined from the available evidence.'
      : null,
    missing_clues: result.verification.confounding_factors || [],
    place_name: result.verification.verified_candidate?.name || null,
    area: null,
    city: result.verification.verified_candidate?.city || null,
    district: result.verification.verified_candidate?.district || null,
    region_state: result.verification.verified_candidate?.state || null,
    country: result.verification.verified_candidate?.country || 'India',
    postal_code: null,
    exact_address:
      result.verification.is_verified && result.verification.precision_level === 'specific_landmark'
        ? result.verification.verified_candidate?.description
        : null,
    latitude: result.verification.verified_candidate?.latitude || null,
    longitude: result.verification.verified_candidate?.longitude || null,
    geographic_precision:
      result.verification.precision_level === 'specific_landmark' ? 'specific location' : 'area',
    confidence_level: result.verification.confidence_category,
    confidence_basis: result.verification.confidence_basis,
    detection_source: 'Multi-Modal Reasoning',
    reference_photo: null,
    online_image_matches: [],
    evidence_sources: [],
    landmarks_and_architecture: result.clip.top_environments.map((e) => `Visual environment: ${e.label}`),
    text_found: result.ocr.detected_lines.map((l) => l.text),
    metadata_clues:
      result.exif.has_gps && result.exif.gps
        ? [`Camera GPS: ${result.exif.gps.latitude.toFixed(5)}° N, ${result.exif.gps.longitude.toFixed(5)}° E`]
        : ['No GPS metadata in photograph.'],
    matching_evidence: result.verification.supporting_evidence,
    sources_consulted: [
      result.verification.verified_candidate?.source || 'OpenStreetMap',
      'RapidOCR Engine',
      'Meta DINOv2',
      'OpenCLIP',
      ...(result.gemini?.available ? ['Google Gemini AI'] : []),
      ...(result.google_vision?.available ? ['Google Cloud Vision'] : []),
    ],
    alternative_locations: result.verification.alternative_candidates.map((alt) => ({
      name: alt.name,
      city: alt.city,
      region_state: alt.state,
      country: alt.country,
      latitude: alt.latitude,
      longitude: alt.longitude,
      precision: alt.precision || 'area',
      description: alt.description,
      confidence_hint: alt.composite_rank_score ? `${(alt.composite_rank_score * 100).toFixed(0)}% match` : null,
    })),
  };

  // Helper for confidence badge colors
  const getConfidenceBadgeClass = (confidence: string) => {
    switch (confidence) {
      case 'Verified Match':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-400/20';
      case 'Plausible Candidate':
        return 'bg-blue-50 text-blue-800 border-blue-300 ring-1 ring-blue-400/20';
      case 'Low Confidence':
        return 'bg-amber-50 text-amber-800 border-amber-300 ring-1 ring-amber-400/20';
      default:
        return 'bg-rose-50 text-rose-800 border-rose-300 ring-1 ring-rose-400/20';
    }
  };

  const geminiData = result.gemini;
  const visionData = result.google_vision;

  return (
    <div className="w-full bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-sm space-y-8 animate-fadeIn">
      {/* 1. SECTION: UNRELIABLE / ABSTENTION STATE */}
      {!loc.is_determined ? (
        <div className="space-y-6">
          <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-amber-50/80 via-white to-orange-50/50 border border-amber-200/90 shadow-xs flex items-start space-x-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0 text-amber-700">
              <AlertCircle className="w-5 h-5 text-amber-700" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                Location could not be reliably determined from the available evidence.
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                {loc.confidence_basis ||
                  'The uploaded photograph does not contain sufficient distinctive architectural, textual, or geographic clues to identify where it was taken without risking a false prediction.'}
              </p>
            </div>
          </div>

          {/* Missing Clues & Confounders */}
          {loc.missing_clues && loc.missing_clues.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Missing Clues & Confounding Factors
              </h4>
              <div className="bg-slate-50/80 rounded-xl border border-slate-200 p-4">
                <ul className="space-y-2 text-xs text-slate-700">
                  {loc.missing_clues.map((clue, idx) => (
                    <li key={idx} className="flex items-start space-x-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                      <span>{clue}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Observed Context */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600">
            <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 space-y-1.5">
              <span className="font-semibold text-slate-800 flex items-center space-x-1.5">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Text Detected</span>
              </span>
              {loc.text_found.length > 0 ? (
                <p className="text-slate-700 font-mono text-[11px] truncate bg-white p-2 rounded border border-slate-200">
                  &ldquo;{loc.text_found.join(', ')}&rdquo;
                </p>
              ) : (
                <p className="text-slate-500">No readable text identified in photograph.</p>
              )}
            </div>

            <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 space-y-1.5">
              <span className="font-semibold text-slate-800 flex items-center space-x-1.5">
                <Camera className="w-4 h-4 text-indigo-600" />
                <span>Camera Metadata Status</span>
              </span>
              <p className="text-slate-700">
                {result.exif.has_gps
                  ? 'GPS coordinates found in file metadata.'
                  : result.exif.has_exif
                  ? 'Device metadata present; GPS absent.'
                  : 'No EXIF metadata embedded in file.'}
              </p>
            </div>
          </div>

          {/* AI Services Diagnostics */}
          <div className="space-y-2 pt-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              AI Services Diagnostics
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div
                className={`p-3.5 rounded-xl border ${
                  geminiData?.available
                    ? 'bg-purple-50/50 border-purple-200 text-purple-900'
                    : geminiData?.status?.startsWith('error')
                    ? 'bg-rose-50/60 border-rose-200 text-rose-900'
                    : 'bg-slate-50/80 border-slate-200 text-slate-700'
                }`}
              >
                <span className="font-semibold flex items-center space-x-1.5 mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  <span>Google Gemini AI</span>
                  {geminiData?.status && (
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-white/80 border border-slate-200">
                      {geminiData.status}
                    </span>
                  )}
                </span>
                <p className="text-[11px] leading-relaxed text-slate-600">
                  {geminiData?.message ||
                    (geminiData?.available
                      ? 'Model executed: No distinctive landmark recognized with high confidence.'
                      : 'Unconfigured or pending API key in backend/.env.')}
                </p>
              </div>

              {visionData && visionData.available && visionData.status === 'success' ? (
                <div className="p-3.5 rounded-xl border bg-teal-50/50 border-teal-200 text-teal-900">
                  <span className="font-semibold flex items-center space-x-1.5 mb-1">
                    <Globe className="w-3.5 h-3.5 text-teal-600" />
                    <span>Google Cloud Vision</span>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-white/80 border border-slate-200">
                      {visionData.status}
                    </span>
                  </span>
                  <p className="text-[11px] leading-relaxed text-slate-600">
                    {visionData.message || 'Web search active: Matching online photographs evaluated.'}
                  </p>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl border bg-indigo-50/50 border-indigo-200 text-indigo-900">
                  <span className="font-semibold flex items-center space-x-1.5 mb-1">
                    <Layers className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Local Multi-Modal Verification</span>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-white/80 border border-indigo-200">
                      ACTIVE
                    </span>
                  </span>
                  <p className="text-[11px] leading-relaxed text-slate-600">
                    Meta DINOv2 dense geometry, OpenCLIP semantic analysis, and RapidOCR active without external billing.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* 2. SECTION: DETERMINED LOCATION RESULTS */
        <div className="space-y-8">
          {/* Most Likely Location Card */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 flex items-center space-x-1.5">
                <Compass className="w-4 h-4" />
                <span>Most Likely Location</span>
              </span>
              {loc.detection_source && (
                <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs">
                  {loc.detection_source}
                </span>
              )}
            </div>

            <div className="p-6 sm:p-7 rounded-2xl bg-gradient-to-br from-blue-50/40 via-white to-indigo-50/30 border border-blue-100 shadow-xs space-y-5">
              {/* Place Name and Primary Badges */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-slate-200/80">
                <div className="space-y-1">
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    {loc.place_name || 'Location Identified'}
                  </h3>
                  <p className="text-sm font-medium text-slate-600">
                    {[loc.area, loc.city, loc.district, loc.region_state, loc.country]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                </div>

                <div className="flex items-center space-x-2 flex-wrap gap-1.5">
                  <span
                    className={`px-3 py-1 rounded-lg text-xs font-semibold border ${getConfidenceBadgeClass(
                      loc.confidence_level
                    )}`}
                  >
                    {loc.confidence_level}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 capitalize">
                    {loc.geographic_precision}
                  </span>
                </div>
              </div>

              {/* Detailed Geographic Breakdown Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {loc.place_name && (
                  <div className="p-3 bg-white/90 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                      Place / Landmark
                    </span>
                    <span className="font-semibold text-slate-900 truncate block">
                      {loc.place_name}
                    </span>
                  </div>
                )}

                {loc.area && (
                  <div className="p-3 bg-white/90 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                      Area / Neighborhood
                    </span>
                    <span className="font-medium text-slate-800 truncate block">{loc.area}</span>
                  </div>
                )}

                {loc.city && (
                  <div className="p-3 bg-white/90 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                      City / Town
                    </span>
                    <span className="font-medium text-slate-800 truncate block">{loc.city}</span>
                  </div>
                )}

                {loc.district && (
                  <div className="p-3 bg-white/90 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                      District
                    </span>
                    <span className="font-medium text-slate-800 truncate block">{loc.district}</span>
                  </div>
                )}

                {loc.region_state && (
                  <div className="p-3 bg-white/90 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                      State / Region
                    </span>
                    <span className="font-medium text-slate-800 truncate block">{loc.region_state}</span>
                  </div>
                )}

                {loc.country && (
                  <div className="p-3 bg-white/90 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                      Country
                    </span>
                    <span className="font-medium text-slate-800 truncate block">{loc.country}</span>
                  </div>
                )}

                {loc.postal_code && (
                  <div className="p-3 bg-white/90 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                      Postal Code
                    </span>
                    <span className="font-mono font-medium text-slate-800 block">{loc.postal_code}</span>
                  </div>
                )}

                {typeof loc.latitude === 'number' && typeof loc.longitude === 'number' && (
                  <div className="p-3 bg-white/90 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                      Coordinates
                    </span>
                    <span className="font-mono font-medium text-blue-700 truncate block">
                      {loc.latitude.toFixed(5)}&deg; N, {loc.longitude.toFixed(5)}&deg; E
                    </span>
                  </div>
                )}
              </div>

              {/* Exact Address (if verified) */}
              {loc.exact_address && (
                <div className="p-3.5 bg-white/90 rounded-xl border border-slate-200 shadow-2xs text-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                    Verified Address
                  </span>
                  <span className="text-slate-800 font-medium leading-relaxed">
                    {loc.exact_address}
                  </span>
                </div>
              )}

              {/* Evidence Basis Note */}
              {loc.confidence_basis && (
                <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200/70 text-xs flex items-start space-x-2.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-semibold text-blue-900 block">Evidence Calibration:</span>
                    <p className="text-blue-800 leading-relaxed font-normal">{loc.confidence_basis}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 3. SECTION: WHY THIS LOCATION? (VISUAL CLUES & REASONING) */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Why This Location? (Visual Evidence)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Landmarks and Architecture */}
              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 space-y-2">
                <span className="font-semibold text-slate-900 flex items-center space-x-1.5">
                  <Building className="w-4 h-4 text-indigo-600" />
                  <span>Visible Landmarks & Architecture</span>
                </span>
                <ul className="space-y-1.5 text-slate-700">
                  {loc.landmarks_and_architecture.length > 0 ? (
                    loc.landmarks_and_architecture.map((item, idx) => (
                      <li key={idx} className="flex items-start space-x-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-slate-500 italic">No specific architectural landmark isolated.</li>
                  )}
                </ul>
              </div>

              {/* Text Found in Image */}
              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 space-y-2">
                <span className="font-semibold text-slate-900 flex items-center space-x-1.5">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>Text Found in Image</span>
                </span>
                {loc.text_found.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {loc.text_found.map((item, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-mono text-[11px] text-slate-800 shadow-2xs"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-xs italic">No readable text found in image.</p>
                )}
              </div>

              {/* Relevant Metadata */}
              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 space-y-2">
                <span className="font-semibold text-slate-900 flex items-center space-x-1.5">
                  <Camera className="w-4 h-4 text-orange-600" />
                  <span>Camera & Forensic Metadata</span>
                </span>
                <ul className="space-y-1.5 text-slate-700">
                  {loc.metadata_clues.map((item, idx) => (
                    <li key={idx} className="flex items-start space-x-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Matching Geographic Evidence */}
              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 space-y-2">
                <span className="font-semibold text-slate-900 flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-teal-600" />
                  <span>Matching Geographic Evidence</span>
                </span>
                <ul className="space-y-1.5 text-slate-700">
                  {loc.matching_evidence.length > 0 ? (
                    loc.matching_evidence.map((item, idx) => (
                      <li key={idx} className="flex items-start space-x-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-slate-500 italic">No corroborating database evidence.</li>
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* 4. SECTION: GEMINI VISUAL REASONING INSIGHTS */}
          {geminiData && geminiData.available && (
            <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-50/60 via-white to-indigo-50/40 border border-purple-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-purple-900 font-bold text-xs uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span>Gemini AI Visual Reasoning</span>
                </div>
                {geminiData.confidence_rating && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                    {geminiData.confidence_rating}
                  </span>
                )}
              </div>

              {geminiData.reasoning_summary && (
                <p className="text-xs text-slate-700 leading-relaxed font-normal bg-white/80 p-3 rounded-xl border border-purple-100">
                  {geminiData.reasoning_summary}
                </p>
              )}

              {/* Candidate places discovered by Gemini */}
              {geminiData.candidate_places && geminiData.candidate_places.length > 0 && (
                <div className="pt-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Places Evaluated by Gemini:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {geminiData.candidate_places.map((place, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-white border border-purple-200 text-xs text-purple-950 font-medium shadow-2xs"
                        title={place.relevance_clue || undefined}
                      >
                        {place.name}
                        {place.city ? ` (${place.city})` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 5. SECTION: GEOGRAPHIC ARCHIVE & REFERENCE CITATIONS */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
                <Globe className="w-4 h-4 text-teal-600" />
                <span>Geographic Archive &amp; Reference Citations</span>
              </h4>

              {/* Provider Status Pill - shown only when Vision is actively enabled */}
              {visionData && visionData.available && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-medium border bg-teal-50 text-teal-700 border-teal-200">
                  Google Cloud Vision Active
                </span>
              )}
            </div>

            {/* Web Entities Tags */}
            {visionData && visionData.web_entities && visionData.web_entities.length > 0 && (
              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Identified Web Entities:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {visionData.web_entities.map((entity, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 font-medium shadow-2xs flex items-center space-x-1"
                    >
                      <Tag className="w-3 h-3 text-teal-600" />
                      <span>{entity.description}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {(entity.score * 100).toFixed(0)}%
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Matching Web Pages with clickable links */}
            {visionData &&
              visionData.pages_with_matching_images &&
              visionData.pages_with_matching_images.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 space-y-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Matching Online Webpages:
                  </span>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {visionData.pages_with_matching_images.slice(0, 5).map((page, idx) => (
                      <a
                        key={idx}
                        href={page.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-2 rounded-lg bg-white hover:bg-teal-50/50 border border-slate-200 hover:border-teal-200 text-xs transition group"
                      >
                        <span className="font-medium text-slate-800 group-hover:text-teal-700 truncate mr-2">
                          {page.page_title || page.url}
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-600 flex-shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

            {/* Genuine Reference Photo Attribution (Wikimedia Commons / Mapillary) */}
            {loc.reference_photo && (
              <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex items-start space-x-3.5">
                {loc.reference_photo.image_url && (
                  <img
                    src={loc.reference_photo.image_url}
                    alt={loc.reference_photo.title || 'Reference photo'}
                    className="w-14 h-14 object-cover rounded-lg flex-shrink-0 border border-slate-200 shadow-xs"
                    loading="lazy"
                  />
                )}
                <div className="space-y-1 min-w-0 flex-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 truncate">
                      Reference: {loc.reference_photo.title || 'Landmark Photo'}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      {loc.reference_photo.license || 'CC License'}
                    </span>
                  </div>
                  <p className="text-slate-500 text-[11px]">
                    Author: {loc.reference_photo.author || 'Verified Contributor'} &bull; Source: {loc.reference_photo.source || 'Wikimedia Commons'}
                  </p>
                  {loc.reference_photo.source_page && (
                    <a
                      href={loc.reference_photo.source_page}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center space-x-1 text-[11px] pt-0.5"
                    >
                      <span>View verified archive citation</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Sources Consulted Bar */}
            <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/80 text-xs flex items-center justify-between flex-wrap gap-2">
              <span className="font-semibold text-slate-600 text-[11px] uppercase tracking-wider">
                Sources Consulted:
              </span>
              <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                {loc.sources_consulted.map((src, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-md bg-white text-slate-700 border border-slate-200 text-[11px] shadow-2xs font-medium"
                  >
                    {src}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* 6. SECTION: OTHER POSSIBLE LOCATIONS */}
          {loc.alternative_locations.length > 0 && (
            <div className="space-y-3 pt-3 border-t border-slate-200/80">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
                <Layers className="w-4 h-4 text-slate-500" />
                <span>Other Possible Locations</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {loc.alternative_locations.map((alt, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200 hover:border-slate-300 transition space-y-1.5 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <h5 className="font-bold text-slate-900 truncate max-w-[140px]">
                        {alt.name}
                      </h5>
                      {alt.confidence_hint && (
                        <span className="text-[10px] text-blue-600 font-semibold font-mono bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                          {alt.confidence_hint}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-600 text-[11px] truncate">
                      {[alt.city, alt.region_state, alt.country].filter(Boolean).join(', ')}
                    </p>
                    {typeof alt.latitude === 'number' && typeof alt.longitude === 'number' && (
                      <p className="font-mono text-[10px] text-slate-500 pt-1 border-t border-slate-200">
                        {alt.latitude.toFixed(4)}&deg; N, {alt.longitude.toFixed(4)}&deg; E
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

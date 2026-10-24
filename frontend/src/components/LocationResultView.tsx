import React from 'react';
import {
  AlertCircle,
  FileText,
  Camera,
  CheckCircle2,
  Building,
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
    city: result.verification.verified_candidate?.city || null,
    region_state: result.verification.verified_candidate?.state || null,
    country: result.verification.verified_candidate?.country || 'India',
    exact_address:
      result.verification.is_verified && result.verification.precision_level === 'specific_landmark'
        ? result.verification.verified_candidate?.description
        : null,
    latitude: result.verification.verified_candidate?.latitude || null,
    longitude: result.verification.verified_candidate?.longitude || null,
    geographic_precision: result.verification.precision_level === 'specific_landmark' ? 'specific location' : 'area',
    confidence_level: result.verification.confidence_category,
    confidence_basis: result.verification.confidence_basis,
    landmarks_and_architecture: result.clip.top_environments.map((e) => `Visual environment: ${e.label}`),
    text_found: result.ocr.detected_lines.map((l) => l.text),
    metadata_clues: result.exif.has_gps && result.exif.gps
      ? [`Camera GPS: ${result.exif.gps.latitude.toFixed(5)}° N, ${result.exif.gps.longitude.toFixed(5)}° E`]
      : ['No GPS metadata in photograph.'],
    matching_evidence: result.verification.supporting_evidence,
    sources_consulted: [
      result.verification.verified_candidate?.source || 'OpenStreetMap',
      'RapidOCR Engine',
      'Meta DINOv2',
      'OpenCLIP',
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

  return (
    <div className="w-full bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-sm space-y-8 animate-fadeIn">
      {/* 1. SECTION: UNRELIABLE / ABSTENTION STATE */}
      {!loc.is_determined ? (
        <div className="space-y-6">
          <div className="p-5 rounded-lg bg-amber-50/70 border border-amber-200/80 flex items-start space-x-3.5">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Location could not be reliably determined from the available evidence.
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {loc.confidence_basis ||
                  'The uploaded photograph does not contain sufficient distinctive architectural, textual, or metadata clues to identify where it was taken without risking a false prediction.'}
              </p>
            </div>
          </div>

          {/* Missing Clues Explanation */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Missing Clues & Confounders
            </h4>
            <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
              <ul className="space-y-2 text-xs text-slate-700">
                {loc.missing_clues.map((clue, idx) => (
                  <li key={idx} className="flex items-start space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 flex-shrink-0" />
                    <span>{clue}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Observed Context If Any */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600">
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="font-semibold text-slate-800 block mb-1 flex items-center space-x-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>Text Detected</span>
              </span>
              {loc.text_found.length > 0 ? (
                <p className="text-slate-700 font-mono text-[11px] truncate">
                  &ldquo;{loc.text_found.join(', ')}&rdquo;
                </p>
              ) : (
                <p className="text-slate-500">No readable text found in image.</p>
              )}
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="font-semibold text-slate-800 block mb-1 flex items-center space-x-1.5">
                <Camera className="w-3.5 h-3.5 text-blue-600" />
                <span>Metadata Status</span>
              </span>
              <p className="text-slate-700">
                {result.exif.has_gps
                  ? 'GPS coordinates found in file.'
                  : result.exif.has_exif
                  ? 'Device metadata present; GPS absent.'
                  : 'No EXIF metadata embedded.'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* 2. SECTION: DETERMINED LOCATION RESULTS */
        <div className="space-y-8">
          {/* Most Likely Location Card */}
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                Most Likely Location
              </span>
            </div>

            <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-slate-200">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
                    {loc.place_name}
                  </h3>
                  <p className="text-sm text-slate-600 mt-0.5">
                    {[loc.city, loc.region_state, loc.country].filter(Boolean).join(', ')}
                  </p>
                </div>

                <div className="flex items-center space-x-2 flex-shrink-0">
                  <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                    {loc.confidence_level}
                  </span>
                  <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 capitalize">
                    {loc.geographic_precision}
                  </span>
                </div>
              </div>

              {/* Verified Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {loc.exact_address && (
                  <div className="sm:col-span-2 p-3 bg-white rounded-lg border border-slate-200">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-0.5">
                      Exact Address (Verified)
                    </span>
                    <span className="text-slate-900 font-medium">{loc.exact_address}</span>
                  </div>
                )}

                {typeof loc.latitude === 'number' && typeof loc.longitude === 'number' && (
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-0.5">
                      Coordinates
                    </span>
                    <span className="font-mono text-slate-900 font-medium">
                      {loc.latitude.toFixed(5)}&deg; N, {loc.longitude.toFixed(5)}&deg; E
                    </span>
                  </div>
                )}

                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-0.5">
                    Evidence Basis
                  </span>
                  <span className="text-slate-700">{loc.confidence_basis}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Why This Location? Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Why This Location?
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Landmarks and Architecture */}
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                <span className="font-semibold text-slate-900 flex items-center space-x-1.5">
                  <Building className="w-3.5 h-3.5 text-blue-600" />
                  <span>Visible Landmarks & Architecture</span>
                </span>
                <ul className="space-y-1.5 text-slate-700">
                  {loc.landmarks_and_architecture.map((item, idx) => (
                    <li key={idx} className="flex items-start space-x-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Text Found in Image */}
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                <span className="font-semibold text-slate-900 flex items-center space-x-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  <span>Text Found in Image</span>
                </span>
                <ul className="space-y-1.5 text-slate-700">
                  {loc.text_found.map((item, idx) => (
                    <li key={idx} className="flex items-start space-x-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                      <span className="font-mono text-[11px]">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Relevant Metadata */}
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                <span className="font-semibold text-slate-900 flex items-center space-x-1.5">
                  <Camera className="w-3.5 h-3.5 text-blue-600" />
                  <span>Relevant Metadata</span>
                </span>
                <ul className="space-y-1.5 text-slate-700">
                  {loc.metadata_clues.map((item, idx) => (
                    <li key={idx} className="flex items-start space-x-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Matching Geographic Evidence */}
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                <span className="font-semibold text-slate-900 flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Matching Geographic Evidence</span>
                </span>
                <ul className="space-y-1.5 text-slate-700">
                  {loc.matching_evidence.map((item, idx) => (
                    <li key={idx} className="flex items-start space-x-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Sources Actually Consulted */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs flex items-center justify-between flex-wrap gap-2">
              <span className="font-semibold text-slate-700">Sources Consulted:</span>
              <div className="flex items-center space-x-2 flex-wrap gap-1">
                {loc.sources_consulted.map((src, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200 text-[11px]"
                  >
                    {src}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Other Possible Locations Section */}
          {loc.alternative_locations.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-slate-200">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Other Possible Locations
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {loc.alternative_locations.map((alt, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <h5 className="font-bold text-slate-900 truncate max-w-[150px]">
                        {alt.name}
                      </h5>
                      {alt.confidence_hint && (
                        <span className="text-[10px] text-slate-500 font-mono">
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

import React, { useState } from 'react';
import {
  MapPin,
  Copy,
  Check,
  Sparkles,
  FileText,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Globe,
  Compass,
  ArrowUpRight,
  Info,
  Navigation,
} from 'lucide-react';
import { AnalyzeResponse, LocationResult } from '../types';
import { FeedbackCard } from './FeedbackCard';

interface LocationResultViewProps {
  result: AnalyzeResponse;
  onReset?: () => void;
}

export const LocationResultView: React.FC<LocationResultViewProps> = ({ result, onReset }) => {
  const [copied, setCopied] = useState<boolean>(false);

  // Extract or synthesize LocationResult
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

  const hasCoords = typeof loc.latitude === 'number' && typeof loc.longitude === 'number';
  const coordsString = hasCoords ? `${loc.latitude!.toFixed(5)}, ${loc.longitude!.toFixed(5)}` : '';

  // Google Maps Directions link: from current location (default origin) to destination coordinates
  const directionsUrl = hasCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${loc.latitude},${loc.longitude}`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
        [loc.place_name, loc.city, loc.region_state, loc.country].filter(Boolean).join(', ')
      )}`;

  // Google Maps Search / Pin View link
  const googleMapsUrl = hasCoords
    ? `https://www.google.com/maps/search/?api=1&query=${loc.latitude},${loc.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        [loc.place_name, loc.city, loc.region_state].filter(Boolean).join(', ')
      )}`;

  const handleCopyCoords = () => {
    if (coordsString) {
      navigator.clipboard.writeText(coordsString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const geminiData = result.gemini;

  return (
    <div className="w-full space-y-6 animate-fadeIn">
      {/* 1. DETERMINED / FOUND STATE */}
      {loc.is_determined ? (
        <div className="space-y-6">
          {/* Main Hero Card for Found Location */}
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-teal-50/70 via-white to-emerald-50/50 border border-teal-200/90 shadow-md shadow-teal-500/5 space-y-6">
            {/* Top Bar with Confidence & Source */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-200/80">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-100/80 text-emerald-800 border border-emerald-300 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{loc.confidence_level || 'Location Verified'}</span>
              </div>

              <div className="flex items-center space-x-2 text-xs text-slate-500 font-medium">
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                <span>Detected via {loc.detection_source || 'Gemini AI Vision'}</span>
              </div>
            </div>

            {/* Title & Geographic Hierarchy */}
            <div className="space-y-2">
              <div className="flex items-start space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-teal-600/20 mt-1">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    {loc.place_name || 'Location Identified'}
                  </h2>
                  <p className="text-sm sm:text-base font-medium text-slate-600 flex items-center space-x-1.5 pt-0.5">
                    <span>
                      {[loc.area, loc.city, loc.district, loc.region_state, loc.country]
                        .filter(Boolean)
                        .join(' • ')}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons (including Google Maps Directions) */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              {/* PRIMARY ACTION: Get Directions from User's Current Location */}
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-teal-600/20 transition-all active:scale-95 group"
                title="Open turn-by-turn route from your current location in Google Maps"
              >
                <Navigation className="w-4 h-4 text-emerald-100 group-hover:rotate-12 transition-transform" />
                <span>Get Directions (from My Location)</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>

              {/* SECONDARY ACTION: View Pin on Google Maps */}
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 px-4 py-3 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold text-xs sm:text-sm shadow-2xs transition active:scale-95"
              >
                <Compass className="w-4 h-4 text-teal-600" />
                <span>View on Map</span>
              </a>

              {/* TERTIARY ACTION: Copy Coordinates */}
              {hasCoords && (
                <button
                  onClick={handleCopyCoords}
                  className="inline-flex items-center space-x-2 px-4 py-3 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-medium text-xs sm:text-sm shadow-2xs transition active:scale-95"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-700 font-semibold">Coordinates Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-slate-500" />
                      <span>Copy Coordinates</span>
                    </>
                  )}
                </button>
              )}

              {onReset && (
                <button
                  onClick={onReset}
                  className="inline-flex items-center space-x-1.5 px-4 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold transition"
                >
                  <span>Upload Another Photo</span>
                </button>
              )}
            </div>
          </div>

          {/* 2-Column Real-Website Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Card: Geographic Data Tiles */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-4">
              <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
                <Globe className="w-4 h-4 text-teal-600" />
                <h3 className="font-bold text-sm text-slate-900">Geographic Breakdown</h3>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                {loc.city && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-0.5">
                      City / Town
                    </span>
                    <span className="font-semibold text-slate-800 text-sm block">{loc.city}</span>
                  </div>
                )}

                {loc.region_state && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-0.5">
                      State / Region
                    </span>
                    <span className="font-semibold text-slate-800 text-sm block">{loc.region_state}</span>
                  </div>
                )}

                {loc.country && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-0.5">
                      Country
                    </span>
                    <span className="font-semibold text-slate-800 text-sm block">{loc.country}</span>
                  </div>
                )}

                {hasCoords && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-0.5">
                      GPS Coordinates
                    </span>
                    <span className="font-mono font-semibold text-teal-700 block truncate">
                      {loc.latitude!.toFixed(4)}&deg; N, {loc.longitude!.toFixed(4)}&deg; E
                    </span>
                  </div>
                )}
              </div>

              {loc.exact_address && (
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                    Verified Address
                  </span>
                  <p className="text-slate-800 font-medium leading-relaxed">{loc.exact_address}</p>
                </div>
              )}

              {loc.confidence_basis && (
                <div className="p-3 rounded-xl bg-teal-50/60 border border-teal-200/70 text-xs text-teal-900 space-y-1">
                  <span className="font-bold flex items-center space-x-1.5 text-teal-800">
                    <Info className="w-3.5 h-3.5" />
                    <span>Evidence Calibration:</span>
                  </span>
                  <p className="leading-relaxed font-normal">{loc.confidence_basis}</p>
                </div>
              )}
            </div>

            {/* Right Card: AI Visual Reasoning & Forensics */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-4">
              <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-sm text-slate-900">AI Visual Clues &amp; Reasoning</h3>
              </div>

              {geminiData?.reasoning_summary && (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50/40 to-teal-50/40 border border-emerald-100 text-xs space-y-1.5">
                  <span className="font-bold text-emerald-900 block">Gemini AI Observation:</span>
                  <p className="text-slate-700 leading-relaxed font-normal">
                    {geminiData.reasoning_summary}
                  </p>
                </div>
              )}

              {/* Text Spotted */}
              <div className="space-y-1.5 text-xs">
                <span className="font-semibold text-slate-700 flex items-center space-x-1.5">
                  <FileText className="w-3.5 h-3.5 text-teal-600" />
                  <span>Visible Text / Signboards Detected:</span>
                </span>
                {loc.text_found.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {loc.text_found.map((txt, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-mono text-[11px] border border-slate-200"
                      >
                        {txt}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 italic text-[11px]">No signboards or text recognized.</p>
                )}
              </div>

              {/* Camera & EXIF Telemetry */}
              <div className="space-y-1.5 text-xs pt-1">
                <span className="font-semibold text-slate-700 flex items-center space-x-1.5">
                  <Camera className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Camera Metadata:</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {loc.metadata_clues.map((clue, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] border border-slate-200"
                    >
                      {clue}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Alternative Candidate Locations (if available) */}
          {loc.alternative_locations && loc.alternative_locations.length > 0 && (
            <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Other Matching Candidate Places Evaluated
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {loc.alternative_locations.map((alt, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1 hover:border-teal-300 transition"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 truncate">{alt.name}</span>
                      {alt.confidence_hint && (
                        <span className="text-[10px] font-semibold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                          {alt.confidence_hint}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-500 text-[11px]">
                      {[alt.city, alt.region_state, alt.country].filter(Boolean).join(', ')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* USER FEEDBACK CARD */}
          <FeedbackCard placeName={loc.place_name} coordinates={coordsString} />
        </div>
      ) : (
        /* 2. RESPONSIBLE ABSTENTION STATE (WHEN LOCATION CANNOT BE DETERMINED) */
        <div className="space-y-6">
          <div className="p-6 sm:p-8 rounded-3xl bg-white border border-amber-200 shadow-sm space-y-6">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1.5 flex-1">
                <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 text-[11px] font-semibold">
                  <span>Insufficient Geographic Evidence</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                  Location Could Not Be Reliably Identified
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                  {loc.confidence_basis ||
                    'The uploaded photo does not contain sufficient landmark architecture, readable street signs, or camera GPS data to safely determine where it was taken without guessing.'}
                </p>
              </div>
            </div>

            {/* Missing Clues Breakdown */}
            {loc.missing_clues && loc.missing_clues.length > 0 && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                  Evidence Evaluation:
                </span>
                <ul className="space-y-1.5 text-xs text-slate-700">
                  {loc.missing_clues.map((clue, idx) => (
                    <li key={idx} className="flex items-start space-x-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                      <span>{clue}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tips for better results */}
            <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-200/80 text-xs text-teal-900 space-y-1.5">
              <span className="font-bold flex items-center space-x-1.5 text-teal-800">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Tips for Best Results:</span>
              </span>
              <p className="text-slate-700 leading-relaxed font-normal">
                Try uploading photos that clearly feature background monuments, shop signboards, milestone stones, unique landscapes, or original camera photos with GPS enabled.
              </p>
            </div>

            {onReset && (
              <div className="pt-2">
                <button
                  onClick={onReset}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs sm:text-sm transition shadow-sm active:scale-95"
                >
                  Upload a Different Photo
                </button>
              </div>
            )}
          </div>

          {/* USER FEEDBACK CARD EVEN ON ABSTENTION */}
          <FeedbackCard placeName="Unverified Location" coordinates={null} />
        </div>
      )}
    </div>
  );
};

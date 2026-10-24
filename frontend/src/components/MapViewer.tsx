import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CandidatePlace, VerificationResult, GPSInfo } from '../types';
import { ShieldCheck, MapPin, AlertTriangle, Compass, ExternalLink } from 'lucide-react';

interface MapViewerProps {
  topCandidate?: CandidatePlace | null;
  alternativeCandidates: CandidatePlace[];
  verification: VerificationResult;
  cameraGPS?: GPSInfo | null;
}

// Custom Leaflet DivIcons using inline SVG for zero-asset-dependency rendering
const createTopMarkerIcon = () => {
  return L.divIcon({
    className: 'custom-map-pin top-candidate-pin',
    html: `
      <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background: rgba(16, 185, 129, 0.3); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="position: relative; width: 28px; height: 28px; border-radius: 50%; background: #059669; border: 2px solid #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: white;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg>
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
};

const createAlternativeMarkerIcon = (rank: number) => {
  return L.divIcon({
    className: 'custom-map-pin alt-candidate-pin',
    html: `
      <div style="position: relative; width: 28px; height: 28px; border-radius: 50%; background: #334155; border: 2px solid #94a3b8; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: #f1f5f9; font-weight: bold; font-size: 11px; font-family: monospace;">
        ${rank}
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
};

const createCameraGPSMarkerIcon = () => {
  return L.divIcon({
    className: 'custom-map-pin camera-gps-pin',
    html: `
      <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
        <div style="position: relative; width: 24px; height: 24px; border-radius: 50%; background: #0284c7; border: 2px solid #38bdf8; box-shadow: 0 2px 10px rgba(2, 132, 199, 0.5); display: flex; align-items: center; justify-content: center; color: white;">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>
          </svg>
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });
};

// Component that dynamically adjusts map viewport bounds
const MapBoundsAdjuster: React.FC<{
  points: [number, number][];
}> = ({ points }) => {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 14, { animate: true });
    } else {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15, animate: true });
    }
  }, [points, map]);

  return null;
};

export const MapViewer: React.FC<MapViewerProps> = ({
  topCandidate,
  alternativeCandidates,
  verification,
  cameraGPS,
}) => {
  const isAbstaining = verification.abstention;
  const defaultKotaCenter: [number, number] = [25.18, 75.83];

  // Collect map points for bounding box
  const points: [number, number][] = [];

  if (!isAbstaining && topCandidate) {
    points.push([topCandidate.latitude, topCandidate.longitude]);
  }

  if (!isAbstaining) {
    alternativeCandidates.forEach((c) => {
      points.push([c.latitude, c.longitude]);
    });
  }

  if (cameraGPS) {
    points.push([cameraGPS.latitude, cameraGPS.longitude]);
  }

  // Determine circle color based on confidence category
  const getCircleOptions = () => {
    switch (verification.confidence_category) {
      case 'Verified Match':
        return { color: '#10b981', fillColor: '#10b981', fillOpacity: 0.18 };
      case 'Plausible Candidate':
        return { color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.15 };
      case 'Low Confidence':
      default:
        return { color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.12 };
    }
  };

  const circleOpts = getCircleOptions();
  const radiusMeters = verification.estimated_error_km ? verification.estimated_error_km * 1000 : 0;

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-slate-700 bg-slate-900 shadow-xl">
      {/* Map Header Status Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900/90 border-b border-slate-700/80 text-xs">
        <div className="flex items-center space-x-2">
          <MapPin className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-slate-200">Interactive Evidence Map</span>
          <span className="text-slate-500">&bull;</span>
          <span className="text-slate-400">OpenStreetMap Cartography</span>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                verification.confidence_category === 'Verified Match'
                  ? 'bg-emerald-400'
                  : verification.confidence_category === 'Plausible Candidate'
                  ? 'bg-blue-400'
                  : verification.confidence_category === 'Low Confidence'
                  ? 'bg-amber-400'
                  : 'bg-rose-400'
              }`}
            />
            <span className="text-slate-300 font-medium">{verification.confidence_category}</span>
          </div>

          {verification.estimated_error_km !== null && verification.estimated_error_km !== undefined && (
            <span className="text-slate-400 font-mono hidden sm:inline">
              Error Radius: &plusmn;{verification.estimated_error_km} km
            </span>
          )}
        </div>
      </div>

      {/* Map Container */}
      <div className="h-[380px] sm:h-[440px] w-full relative z-0">
        <MapContainer
          center={points.length > 0 ? points[0] : defaultKotaCenter}
          zoom={13}
          scrollWheelZoom={false}
          className="h-full w-full"
          style={{ background: '#1e293b' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />

          <MapBoundsAdjuster points={points} />

          {/* Uncertainty / Error Radius Circle */}
          {!isAbstaining && topCandidate && radiusMeters > 0 && (
            <Circle
              center={[topCandidate.latitude, topCandidate.longitude]}
              radius={radiusMeters}
              pathOptions={{
                color: circleOpts.color,
                fillColor: circleOpts.fillColor,
                fillOpacity: circleOpts.fillOpacity,
                weight: 1.5,
                dashArray: '4, 6',
              }}
            />
          )}

          {/* Connection line between Camera GPS and Candidate */}
          {!isAbstaining && topCandidate && cameraGPS && (
            <Polyline
              positions={[
                [cameraGPS.latitude, cameraGPS.longitude],
                [topCandidate.latitude, topCandidate.longitude],
              ]}
              pathOptions={{
                color: '#38bdf8',
                weight: 2,
                dashArray: '6, 6',
                opacity: 0.8,
              }}
            />
          )}

          {/* Camera GPS Marker */}
          {cameraGPS && (
            <Marker
              position={[cameraGPS.latitude, cameraGPS.longitude]}
              icon={createCameraGPSMarkerIcon()}
            >
              <Popup className="custom-leaflet-popup">
                <div className="text-xs p-1">
                  <div className="flex items-center space-x-1.5 font-bold text-sky-700 mb-1">
                    <Compass className="w-3.5 h-3.5" />
                    <span>Camera Capture Location</span>
                  </div>
                  <p className="text-slate-600 text-[11px] mb-1">Extracted from image EXIF GPS metadata tags.</p>
                  <p className="font-mono text-[10px] text-slate-500">
                    {cameraGPS.latitude.toFixed(5)}&deg; N, {cameraGPS.longitude.toFixed(5)}&deg; E
                  </p>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Top #1 Candidate Marker */}
          {!isAbstaining && topCandidate && (
            <Marker
              position={[topCandidate.latitude, topCandidate.longitude]}
              icon={createTopMarkerIcon()}
            >
              <Popup className="custom-leaflet-popup">
                <div className="text-xs p-1 max-w-[220px]">
                  <div className="flex items-center space-x-1 text-emerald-700 font-bold mb-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>#1 Top Prediction</span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">{topCandidate.name}</h4>
                  <p className="text-slate-600 text-[11px] my-1 leading-snug">{topCandidate.description}</p>
                  <div className="pt-1 border-t border-slate-200 mt-1">
                    <p className="font-mono text-[10px] text-slate-500">
                      {topCandidate.latitude.toFixed(5)}&deg; N, {topCandidate.longitude.toFixed(5)}&deg; E
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Source: {topCandidate.source}</p>
                  </div>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Alternative Candidates */}
          {!isAbstaining &&
            alternativeCandidates.map((alt) => (
              <Marker
                key={alt.id}
                position={[alt.latitude, alt.longitude]}
                icon={createAlternativeMarkerIcon(alt.rank || 2)}
              >
                <Popup className="custom-leaflet-popup">
                  <div className="text-xs p-1 max-w-[200px]">
                    <div className="font-bold text-slate-700 mb-0.5">
                      #{alt.rank || 'Alt'} Alternative: {alt.name}
                    </div>
                    <p className="text-slate-600 text-[11px] mb-1">{alt.category.replace('_', ' ')}</p>
                    <p className="font-mono text-[10px] text-slate-500">
                      {alt.latitude.toFixed(5)}&deg; N, {alt.longitude.toFixed(5)}&deg; E
                    </p>
                    {alt.composite_rank_score !== undefined && alt.composite_rank_score !== null && (
                      <p className="text-[10px] font-semibold text-slate-600 mt-1">
                        Composite Score: {(alt.composite_rank_score * 100).toFixed(1)}%
                      </p>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
        </MapContainer>

        {/* Abstention Informative Banner Overlay */}
        {isAbstaining && (
          <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-6 z-10 pointer-events-auto">
            <div className="max-w-md bg-slate-900 border border-amber-500/40 rounded-2xl p-6 shadow-2xl text-center">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center mb-3">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Location Markers Withheld</h4>
              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                {verification.abstention_reason ||
                  'Visual clues and metadata are insufficient to assert a specific landmark coordinate without risking a false prediction.'}
              </p>
              <div className="bg-slate-800/80 rounded-xl p-3 text-left border border-slate-700/80 text-[11px] text-slate-400">
                <div className="font-semibold text-slate-200 mb-1 flex items-center space-x-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Honest AI Guarantee</span>
                </div>
                GeoLens AI adheres to strict verification thresholds and refuses to hallucinate coordinates merely to fill the map view.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Map Legend Footer */}
      <div className="px-4 py-2.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between flex-wrap gap-2 text-[11px] text-slate-400">
        <div className="flex items-center space-x-4 flex-wrap gap-y-1">
          <div className="flex items-center space-x-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Top Prediction</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-400" />
            <span>Alternative Candidates</span>
          </div>
          {cameraGPS && (
            <div className="flex items-center space-x-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-sky-400" />
              <span>Camera GPS</span>
            </div>
          )}
          {verification.estimated_error_km !== null && verification.estimated_error_km !== undefined && (
            <div className="flex items-center space-x-1.5">
              <div className="w-2.5 h-2.5 border border-dashed border-emerald-400 rounded-full" />
              <span>Uncertainty Bounds</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-1 text-slate-400">
          <ExternalLink className="w-3 h-3" />
          <a
            href="https://www.openstreetmap.org"
            target="_blank"
            rel="noreferrer"
            className="hover:text-slate-200 transition underline underline-offset-2"
          >
            OSM Attribution
          </a>
        </div>
      </div>
    </div>
  );
};

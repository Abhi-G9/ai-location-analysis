import React, { useState } from 'react';
import { Header } from './components/Header';
import { ImageUploader } from './components/ImageUploader';
import { LocationResultView } from './components/LocationResultView';
import { AnalyzeResponse } from './types';

export const App: React.FC = () => {
  const [analysisResult, setAnalysisResult] = useState<AnalyzeResponse | null>(null);

  const handleIntakeSuccess = (result: AnalyzeResponse) => {
    setAnalysisResult(result);
  };

  const handleReset = () => {
    setAnalysisResult(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-blue-50/20 text-slate-900 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      <Header />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">
        <ImageUploader
          onSuccess={handleIntakeSuccess}
          onReset={handleReset}
        />

        {analysisResult && (
          <LocationResultView result={analysisResult} />
        )}
      </main>

      <footer className="border-t border-slate-200/80 bg-white/80 backdrop-blur-xs py-6 text-center text-xs text-slate-500">
        <div className="max-w-3xl mx-auto px-4 space-y-1">
          <p className="font-medium text-slate-600">
            AI Location Analysis &bull; Multi-Modal Photographic Geolocation
          </p>
          <p className="text-[11px] text-slate-400">
            Powered by Gemini AI, RapidOCR, OpenCLIP, Meta DINOv2 & OpenStreetMap
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;

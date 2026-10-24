import React, { useState } from 'react';
import { Header } from './components/Header';
import { StatusBanner } from './components/StatusBanner';
import { PhaseNotice } from './components/PhaseNotice';
import { ImageUploader } from './components/ImageUploader';
import { AnalysisResults } from './components/AnalysisResults';
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Header />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <StatusBanner />
        <PhaseNotice />

        <div className="space-y-6">
          <ImageUploader
            onSuccess={handleIntakeSuccess}
            onReset={handleReset}
          />

          {analysisResult && (
            <AnalysisResults
              result={analysisResult}
              onReset={handleReset}
            />
          )}
        </div>
      </main>

      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-center text-xs text-slate-500">
        <p>GeoLens AI &bull; Multi-Stage Image Geolocation &bull; Phase 1 Foundation Active</p>
      </footer>
    </div>
  );
};

export default App;

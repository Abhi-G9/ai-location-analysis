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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
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

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <p>AI Location Analysis &bull; Evidence-Based Photographic Geolocation</p>
      </footer>
    </div>
  );
};

export default App;

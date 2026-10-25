import React, { useState } from 'react';
import { Header } from './components/Header';
import { LandingHero, HowItWorksSection, CapabilitiesSection, FAQSection } from './components/LandingSections';
import { ImageUploader } from './components/ImageUploader';
import { LocationResultView } from './components/LocationResultView';
import { AnalyzeResponse } from './types';

export const App: React.FC = () => {
  const [analysisResult, setAnalysisResult] = useState<AnalyzeResponse | null>(null);

  const handleIntakeSuccess = (result: AnalyzeResponse) => {
    setAnalysisResult(result);
    // Smooth scroll down to the result view
    setTimeout(() => {
      window.scrollTo({ top: 380, behavior: 'smooth' });
    }, 100);
  };

  const handleReset = () => {
    setAnalysisResult(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 text-slate-900 flex flex-col font-sans selection:bg-teal-100 selection:text-teal-900">
      {/* Modern Top Header / Navbar */}
      <Header onReset={handleReset} hasResult={!!analysisResult} />

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-10">
        {/* Landing Hero (shown at all times, provides strong context) */}
        {!analysisResult && <LandingHero />}

        {/* Upload Zone */}
        <section id="uploader" className="w-full">
          <ImageUploader
            onSuccess={handleIntakeSuccess}
            onReset={handleReset}
          />
        </section>

        {/* Results Section */}
        {analysisResult && (
          <section id="results" className="w-full pt-2">
            <LocationResultView result={analysisResult} onReset={handleReset} />
          </section>
        )}

        {/* Informative Landing Content (shown when no result is currently active) */}
        {!analysisResult && (
          <div className="space-y-12 pt-4">
            <HowItWorksSection />
            <CapabilitiesSection />
            <FAQSection />
          </div>
        )}
      </main>

      {/* Polished Modern Footer */}
      <footer className="border-t border-slate-200/80 bg-white/90 backdrop-blur-xs py-8 text-center text-xs text-slate-500 mt-12">
        <div className="max-w-4xl mx-auto px-4 space-y-3">
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-medium text-slate-600">
            <a href="#how-it-works" className="hover:text-teal-600 transition-colors">
              How It Works
            </a>
            <a href="#capabilities" className="hover:text-teal-600 transition-colors">
              Capabilities
            </a>
            <a href="#faq" className="hover:text-teal-600 transition-colors">
              FAQ
            </a>
            <button onClick={handleReset} className="hover:text-teal-600 transition-colors">
              Upload Photo
            </button>
          </div>

          <p className="font-semibold text-slate-700">
            GeoLens AI &bull; Photographic Geolocation &amp; Landmark Recognition
          </p>

          <p className="text-[11px] text-slate-400 max-w-md mx-auto">
            Powered by Google Gemini Multimodal AI, RapidOCR, and OpenStreetMap. All images are processed securely in memory without persistent storage.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;

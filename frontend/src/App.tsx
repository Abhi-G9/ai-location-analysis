import React, { useState } from 'react';
import { Header, NavTab } from './components/Header';
import {
  LandingHero,
  HowItWorksPage,
  CapabilitiesPage,
  FAQPage,
  AboutPage,
} from './components/LandingSections';
import { ImageUploader } from './components/ImageUploader';
import { LocationResultView } from './components/LocationResultView';
import { FeedbackCard } from './components/FeedbackCard';
import { AnalyzeResponse } from './types';
import { Mail, Compass } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [analysisResult, setAnalysisResult] = useState<AnalyzeResponse | null>(null);

  const handleIntakeSuccess = (result: AnalyzeResponse) => {
    setAnalysisResult(result);
    // Smooth scroll down to the result view
    setTimeout(() => {
      window.scrollTo({ top: 400, behavior: 'smooth' });
    }, 100);
  };

  const handleReset = () => {
    setAnalysisResult(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGoToScanner = () => {
    setActiveTab('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-100/80 text-slate-900 flex flex-col font-sans selection:bg-teal-100 selection:text-teal-900">
      {/* Top Navbar with Tab Switching (No full page refresh) */}
      <Header
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onReset={handleReset}
        hasResult={!!analysisResult}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8">
        {/* VIEW 1: HOME / SCANNER */}
        {activeTab === 'home' && (
          <div className="space-y-8 animate-fadeIn">
            {/* Hero Banner (Always informative) */}
            <LandingHero />

            {/* Uploader Card */}
            <section id="uploader" className="w-full">
              <ImageUploader
                onSuccess={handleIntakeSuccess}
                onReset={handleReset}
              />
            </section>

            {/* Results Section (When image is analyzed) */}
            {analysisResult && (
              <section id="results" className="w-full pt-2">
                <LocationResultView result={analysisResult} onReset={handleReset} />
              </section>
            )}

            {/* Community Reviews & Ratings (Shown below uploader) */}
            {!analysisResult && (
              <section className="w-full pt-2">
                <FeedbackCard placeName={null} coordinates={null} />
              </section>
            )}
          </div>
        )}

        {/* VIEW 2: HOW IT WORKS (Dedicated Page) */}
        {activeTab === 'how-it-works' && (
          <HowItWorksPage onGoToScanner={handleGoToScanner} />
        )}

        {/* VIEW 3: CAPABILITIES (Dedicated Page) */}
        {activeTab === 'capabilities' && (
          <CapabilitiesPage onGoToScanner={handleGoToScanner} />
        )}

        {/* VIEW 4: FAQ (Dedicated Page) */}
        {activeTab === 'faq' && (
          <FAQPage onGoToScanner={handleGoToScanner} />
        )}

        {/* VIEW 5: ABOUT & CONTACT (Dedicated Page) */}
        {activeTab === 'about' && (
          <AboutPage onGoToScanner={handleGoToScanner} />
        )}
      </main>

      {/* Polished Modern Footer */}
      <footer className="border-t border-slate-200/90 bg-white/95 backdrop-blur-xs py-10 text-center text-xs text-slate-500 mt-12 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 space-y-4">
          {/* Footer Navigation */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-slate-600">
            <button
              onClick={() => {
                setActiveTab('home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-teal-600 transition-colors"
            >
              Scanner Home
            </button>
            <button
              onClick={() => {
                setActiveTab('how-it-works');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-teal-600 transition-colors"
            >
              How It Works
            </button>
            <button
              onClick={() => {
                setActiveTab('capabilities');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-teal-600 transition-colors"
            >
              Capabilities
            </button>
            <button
              onClick={() => {
                setActiveTab('faq');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-teal-600 transition-colors"
            >
              Q&amp;A
            </button>
            <button
              onClick={() => {
                setActiveTab('about');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-teal-600 transition-colors"
            >
              About &amp; Contact
            </button>
          </div>

          {/* Contact Email Banner */}
          <div className="pt-2 flex items-center justify-center space-x-2 text-slate-600">
            <Mail className="w-4 h-4 text-teal-600" />
            <span>Support &amp; Contact:</span>
            <a
              href="mailto:abhi.sys.01@gmail.com"
              className="font-mono font-bold text-teal-700 hover:text-teal-800 underline transition-colors"
            >
              abhi.sys.01@gmail.com
            </a>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-center space-x-2">
            <Compass className="w-4 h-4 text-teal-600" />
            <p className="font-bold text-slate-800 text-xs">
              AI Location Detect PRO &bull; Multi-Modal Photographic Geolocation
            </p>
          </div>

          <p className="text-[11px] text-slate-400 max-w-lg mx-auto">
            Images are evaluated securely in memory during inspection. Optical Character Recognition (OCR), visual neural models, and spatial data are used to provide responsible geolocation.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;

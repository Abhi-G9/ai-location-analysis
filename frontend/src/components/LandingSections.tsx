import React from 'react';
import {
  Sparkles,
  Building2,
  FileSearch,
  Mountain,
  Compass,
  Globe2,
  Cpu,
  Layers,
  HelpCircle,
} from 'lucide-react';

export const LandingHero: React.FC = () => {
  return (
    <div className="text-center space-y-4 max-w-2xl mx-auto pt-2 pb-6">
      {/* Top Technology Badge */}
      <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-teal-50/80 border border-teal-200/70 text-teal-800 text-xs font-semibold shadow-xs">
        <Sparkles className="w-3.5 h-3.5 text-teal-600 animate-pulse" />
        <span>Powered by Google Gemini AI &amp; OpenStreetMap</span>
      </div>

      {/* Main Punchy Headline in Simple English */}
      <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
        Find Where Any Photo <br />
        <span className="bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
          Was Taken in Seconds
        </span>
      </h1>

      {/* Clear, Simple Explanation */}
      <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal max-w-xl mx-auto">
        Upload any photograph to discover its real-world location. Our AI analyzes architectural landmarks, street signage, terrain, and camera GPS data to locate it accurately.
      </p>

      {/* Quick Feature Badges */}
      <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs font-medium text-slate-700">
        <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-slate-100/80 border border-slate-200/80">
          <Building2 className="w-3.5 h-3.5 text-teal-600" />
          <span>Famous Landmarks</span>
        </span>
        <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-slate-100/80 border border-slate-200/80">
          <FileSearch className="w-3.5 h-3.5 text-emerald-600" />
          <span>Road Signs &amp; Shops</span>
        </span>
        <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-slate-100/80 border border-slate-200/80">
          <Mountain className="w-3.5 h-3.5 text-cyan-600" />
          <span>Rivers &amp; Hills</span>
        </span>
        <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-slate-100/80 border border-slate-200/80">
          <Compass className="w-3.5 h-3.5 text-indigo-600" />
          <span>Camera GPS Telemetry</span>
        </span>
      </div>
    </div>
  );
};

export const HowItWorksSection: React.FC = () => {
  const steps = [
    {
      num: '01',
      title: 'Upload Any Photo',
      description:
        'Select any photograph from your phone or computer. Both social media images and original camera files are supported.',
      icon: Layers,
      color: 'text-teal-600 bg-teal-50 border-teal-200',
    },
    {
      num: '02',
      title: 'AI Visual Forensics',
      description:
        'Google Gemini AI, RapidOCR, and visual models scan visible architecture, signs, terrain, and hardware metadata.',
      icon: Cpu,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    },
    {
      num: '03',
      title: 'Pinpoint Location on Map',
      description:
        'View the confirmed place name, city, state, country, and open the coordinates directly on Google Maps.',
      icon: Globe2,
      color: 'text-cyan-600 bg-cyan-50 border-cyan-200',
    },
  ];

  return (
    <section id="how-it-works" className="space-y-6 pt-6">
      <div className="text-center space-y-1.5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-teal-700">
          Simple 3-Step Process
        </h2>
        <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          How GeoLens Works
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
          High-accuracy visual reasoning without guesswork.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <div
              key={step.num}
              className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-teal-300 hover:shadow-md transition-all space-y-3 group"
            >
              <div className="flex items-center justify-between">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${step.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="font-mono text-sm font-bold text-slate-300 group-hover:text-teal-500 transition-colors">
                  {step.num}
                </span>
              </div>
              <h4 className="font-bold text-base text-slate-900">{step.title}</h4>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                {step.description}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export const CapabilitiesSection: React.FC = () => {
  const capabilities = [
    {
      title: 'Famous Monuments & Heritage',
      description:
        'Identifies temples, forts, towers, palaces, bridges, dams, and prominent tourist destinations across India and worldwide.',
      icon: Building2,
      badge: 'High Accuracy',
    },
    {
      title: 'Street Signboards & Shop Banners',
      description:
        'Extracts text written in Hindi, English, and regional languages from road signboards, milestone stones, and commercial signs.',
      icon: FileSearch,
      badge: 'OCR Powered',
    },
    {
      title: 'Natural Terrain & Landscapes',
      description:
        'Analyzes unique rock formations, river valleys, waterfalls, lakes, and vegetation patterns to estimate geographic regions.',
      icon: Mountain,
      badge: 'Visual AI',
    },
    {
      title: 'Camera GPS & Metadata',
      description:
        'Extracts high-precision latitude and longitude if the photo was taken with camera location services enabled.',
      icon: Compass,
      badge: '100% Exact',
    },
  ];

  return (
    <section id="capabilities" className="space-y-6 pt-4">
      <div className="text-center space-y-1.5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-teal-700">
          Detection Capabilities
        </h2>
        <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          What Can Our AI Detect?
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
          Combining multiple forensic clues for dependable results.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {capabilities.map((cap, idx) => {
          const Icon = cap.icon;
          return (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-slate-300 transition space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  {cap.badge}
                </span>
              </div>
              <h4 className="font-bold text-sm text-slate-900">{cap.title}</h4>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                {cap.description}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export const FAQSection: React.FC = () => {
  const faqs = [
    {
      q: 'Does this only work for one city, or everywhere?',
      a: 'GeoLens works everywhere! Google Gemini AI and OpenStreetMap have worldwide geographic coverage. Photos from Kota, Jaipur, Delhi, Mumbai, or international landmarks can all be localized.',
    },
    {
      q: 'What happens if I upload a regular selfie or bedroom photo?',
      a: 'Responsible AI is built into GeoLens. If a photo lacks distinctive landmarks, signs, or GPS data, the system clearly notifies you that evidence is insufficient instead of inventing a fake location.',
    },
    {
      q: 'Are my uploaded photographs kept or stored?',
      a: 'No. All images are processed strictly in-memory during analysis and never permanently saved or shared with third parties.',
    },
    {
      q: 'What type of photo gives the best results?',
      a: 'Photographs showing background architecture, street signboards, distinctive natural landscapes, or original camera files with GPS enabled yield the fastest and most accurate matches.',
    },
  ];

  return (
    <section id="faq" className="space-y-6 pt-4 pb-8">
      <div className="text-center space-y-1.5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-teal-700">
          Frequently Asked Questions
        </h2>
        <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          Common Questions &amp; Answers
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {faqs.map((faq, idx) => (
          <div
            key={idx}
            className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-2"
          >
            <div className="flex items-start space-x-2.5">
              <HelpCircle className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
              <h4 className="font-bold text-xs sm:text-sm text-slate-900 leading-snug">
                {faq.q}
              </h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-normal pl-6">
              {faq.a}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};

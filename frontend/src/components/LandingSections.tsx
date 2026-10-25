import React, { useState } from 'react';
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
  Mail,
  Check,
  Copy,
  ArrowRight,
  ShieldCheck,
  Code2,
} from 'lucide-react';

export const LandingHero: React.FC = () => {
  return (
    <div className="text-center space-y-4 max-w-2xl mx-auto pt-4 pb-4">
      {/* Top AI Badge (Removed 'Gemini', replaced with 'Powered by AI') */}
      <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold shadow-xs">
        <Sparkles className="w-3.5 h-3.5 text-teal-600 animate-pulse" />
        <span>Powered by AI &amp; Spatial Intelligence</span>
      </div>

      {/* Main Headline */}
      <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
        Discover Where Any Photo <br />
        <span className="bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
          Was Taken in Seconds
        </span>
      </h1>

      {/* Simple, Natural English Description */}
      <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal max-w-xl mx-auto">
        Upload any image to uncover its location. Our AI analyzes architectural landmarks, street signage, terrain, and camera GPS data to locate it on the map.
      </p>

      {/* Visual Feature Badges */}
      <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs font-medium text-slate-700">
        <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
          <Building2 className="w-3.5 h-3.5 text-teal-600" />
          <span>Famous Landmarks</span>
        </span>
        <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
          <FileSearch className="w-3.5 h-3.5 text-emerald-600" />
          <span>Road Signs &amp; Shops</span>
        </span>
        <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
          <Mountain className="w-3.5 h-3.5 text-cyan-600" />
          <span>Rivers &amp; Hills</span>
        </span>
        <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
          <Compass className="w-3.5 h-3.5 text-indigo-600" />
          <span>Camera GPS Telemetry</span>
        </span>
      </div>
    </div>
  );
};

interface PageViewProps {
  onGoToScanner: () => void;
}

export const HowItWorksPage: React.FC<PageViewProps> = ({ onGoToScanner }) => {
  const steps = [
    {
      num: '01',
      title: 'Step 1: Upload Your Image',
      description:
        'Upload any JPEG, PNG, or WebP photograph. It can be a picture taken from your phone camera, a travel photo, or an image saved from the web.',
      icon: Layers,
      color: 'text-teal-600 bg-teal-50 border-teal-200',
    },
    {
      num: '02',
      title: 'Step 2: AI Multi-Stage Inspection',
      description:
        'Our computer vision models scan the background for known architectural monuments, street signboards (Hindi & English), geographic terrain, and camera EXIF data.',
      icon: Cpu,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    },
    {
      num: '03',
      title: 'Step 3: Verification & Geographic Pinpoint',
      description:
        'The candidate locations are cross-referenced with spatial map indexes. You get the exact place name, city, state, country, and map coordinates.',
      icon: Globe2,
      color: 'text-cyan-600 bg-cyan-50 border-cyan-200',
    },
    {
      num: '04',
      title: 'Step 4: Live Turn-by-Turn Navigation',
      description:
        'With one tap on "Get Directions", Google Maps launches on your device with turn-by-turn route navigation from your current location to the detected spot.',
      icon: Compass,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
    },
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-3">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200 text-xs font-bold">
          <span>Technology &amp; Process</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          How AI Location Detect Works
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed font-normal max-w-2xl">
          Learn how our multi-stage photographic geolocation pipeline inspects visual evidence to pinpoint real-world coordinates without making arbitrary guesses.
        </p>
      </div>

      {/* Step Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <div
              key={step.num}
              className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-sm hover:border-teal-300 transition-all space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${step.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <span className="font-mono text-base font-extrabold text-slate-300">
                  {step.num}
                </span>
              </div>
              <h3 className="font-bold text-base text-slate-900">{step.title}</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                {step.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* CTA Button */}
      <div className="text-center pt-2">
        <button
          onClick={onGoToScanner}
          className="inline-flex items-center space-x-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold text-sm shadow-md shadow-teal-600/20 transition active:scale-95"
        >
          <span>Try It Now - Upload a Photo</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export const CapabilitiesPage: React.FC<PageViewProps> = ({ onGoToScanner }) => {
  const capabilities = [
    {
      title: 'Monuments, Palaces & Famous Architecture',
      description:
        'Temples, historical forts, towers, suspension bridges, dams, riverfronts, and public parks across India and worldwide.',
      icon: Building2,
      accuracy: '95%+ Accuracy',
      details: 'Identifies distinct structural shapes, facade patterns, minarets, domes, and heritage landmarks.',
    },
    {
      title: 'Street Signage & Commercial Banners (OCR)',
      description:
        'Optical character recognition extracts text written on road mileposts, highway signs, shop boards, and billboards.',
      icon: FileSearch,
      accuracy: 'Multi-Lingual OCR',
      details: 'Supports Hindi, English, and regional Indian scripts to pinpoint exact localities and neighborhoods.',
    },
    {
      title: 'Natural Landscapes, Rivers & Canyons',
      description:
        'Visual evaluation of riverbanks, ghats, canyons, waterfalls, valleys, and distinctive rock formations.',
      icon: Mountain,
      accuracy: 'Regional AI',
      details: 'Examines geographic geology, water bodies, and vegetation types to localize regional zones.',
    },
    {
      title: 'Original Camera GPS & Telemetry',
      description:
        'Direct EXIF metadata parsing from unmodified phone camera photographs.',
      icon: Compass,
      accuracy: '100% Exact Pinpoint',
      details: 'Extracts exact latitude, longitude, and altitude when camera location services were enabled.',
    },
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-3">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200 text-xs font-bold">
          <span>Vision Capabilities</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          What Can AI Location Detect Identify?
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed font-normal max-w-2xl">
          Our system is trained to extract geographic evidence from a wide range of visual elements rather than relying solely on GPS.
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {capabilities.map((cap, idx) => {
          const Icon = cap.icon;
          return (
            <div
              key={idx}
              className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-sm hover:border-slate-300 transition space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {cap.accuracy}
                </span>
              </div>
              <h3 className="font-bold text-base text-slate-900">{cap.title}</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                {cap.description}
              </p>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-500">
                <span className="font-semibold text-slate-700">How it works: </span>
                {cap.details}
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-center pt-2">
        <button
          onClick={onGoToScanner}
          className="inline-flex items-center space-x-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold text-sm shadow-md shadow-teal-600/20 transition active:scale-95"
        >
          <span>Test with Your Own Image</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export const FAQPage: React.FC<PageViewProps> = ({ onGoToScanner }) => {
  const faqs = [
    {
      q: 'Does this platform work outside Kota / Rajasthan?',
      a: 'Yes, absolutely! AI Location Detect works across all states of India and globally. Any photo with recognized monuments, road markers, or signs can be pinpointed.',
    },
    {
      q: 'What happens if I upload an indoor bedroom or plain selfie?',
      a: 'Responsible AI is built in. If a photograph lacks background clues, landmarks, or GPS tags, the system transparently reports that evidence is insufficient instead of hallucinating a fake location.',
    },
    {
      q: 'Are my uploaded pictures stored or made public?',
      a: 'No. Photographs are processed temporarily in memory during inspection and never saved to a database or shared with anyone.',
    },
    {
      q: 'How does the "Get Directions" button work?',
      a: 'When clicked, it opens Google Maps with your current GPS location as the starting point and the detected location as the destination, providing instant turn-by-turn navigation.',
    },
    {
      q: 'What formats and file sizes are supported?',
      a: 'JPEG, PNG, and WebP images up to 10 MB in file size.',
    },
    {
      q: 'Why does an image analysis take 10-15 seconds?',
      a: 'The image undergoes thorough multi-stage verification: optical text extraction (OCR), visual neural alignment, and spatial database querying.',
    },
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-3">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200 text-xs font-bold">
          <span>Help &amp; Answers</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Questions &amp; Answers
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed font-normal max-w-2xl">
          Everything you need to know about using AI Location Detect and getting accurate results.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {faqs.map((faq, idx) => (
          <div
            key={idx}
            className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-2.5"
          >
            <div className="flex items-start space-x-3">
              <HelpCircle className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
              <h3 className="font-bold text-sm sm:text-base text-slate-900 leading-snug">
                {faq.q}
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal pl-8">
              {faq.a}
            </p>
          </div>
        ))}
      </div>

      <div className="text-center pt-2">
        <button
          onClick={onGoToScanner}
          className="inline-flex items-center space-x-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold text-sm shadow-md shadow-teal-600/20 transition active:scale-95"
        >
          <span>Go to Image Scanner</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export const AboutPage: React.FC<PageViewProps> = ({ onGoToScanner }) => {
  const [copied, setCopied] = useState<boolean>(false);
  const email = 'abhi.sys.01@gmail.com';

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-3xl mx-auto">
      {/* Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-4">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200 text-xs font-bold">
          <span>About the Platform</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          About AI Location Detect
        </h2>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
          AI Location Detect is an advanced photographic geolocation platform designed to analyze where photographs were taken using multi-modal computer vision, optical character recognition (OCR), and open geographic telemetry.
        </p>
      </div>

      {/* Core Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-2">
          <div className="flex items-center space-x-2 text-teal-700 font-bold text-sm">
            <ShieldCheck className="w-4 h-4" />
            <span>Privacy First</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            All user images are processed strictly in-memory during analysis. No photos are permanently stored or shared.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-2">
          <div className="flex items-center space-x-2 text-emerald-700 font-bold text-sm">
            <Code2 className="w-4 h-4" />
            <span>Modern Tech Stack</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Built using FastAPI, React 18, Vite, TailwindCSS, RapidOCR, and OpenStreetMap coordinates.
          </p>
        </div>
      </div>

      {/* Contact & Inquiries Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-teal-50/60 via-white to-emerald-50/50 border border-teal-200 shadow-sm space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-teal-600/20">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-lg text-slate-900">
              Get in Touch / Contact
            </h3>
            <p className="text-xs text-slate-500">
              For feedback, inquiries, or collaboration
            </p>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="font-mono text-sm font-semibold text-slate-800">
            {email}
          </span>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <a
              href={`mailto:${email}`}
              className="flex-1 sm:flex-none text-center px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition"
            >
              Send Email
            </a>
            <button
              onClick={handleCopyEmail}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium border border-slate-200 transition"
              title="Copy email address"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      <div className="text-center pt-2">
        <button
          onClick={onGoToScanner}
          className="inline-flex items-center space-x-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold text-sm shadow-md shadow-teal-600/20 transition active:scale-95"
        >
          <span>Back to Photo Scanner</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

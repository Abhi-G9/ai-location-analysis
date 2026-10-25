import React from 'react';
import { Compass } from 'lucide-react';

interface HeaderProps {
  onReset?: () => void;
  hasResult?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onReset, hasResult }) => {
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 transition-all">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand / Logo */}
        <div 
          onClick={onReset}
          className="flex items-center space-x-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-teal-500/20 group-hover:scale-105 transition-transform">
            <Compass className="w-5 h-5 text-white animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-extrabold text-lg tracking-tight text-slate-900">
                Geo<span className="text-teal-600">Lens</span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                AI Pro
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
              Photographic Location Intelligence
            </p>
          </div>
        </div>

        {/* Center / Navigation Links */}
        <nav className="hidden md:flex items-center space-x-6 text-xs font-semibold text-slate-600">
          <a href="#how-it-works" className="hover:text-teal-600 transition-colors">
            How It Works
          </a>
          <a href="#capabilities" className="hover:text-teal-600 transition-colors">
            Capabilities
          </a>
          <a href="#faq" className="hover:text-teal-600 transition-colors">
            Questions & Answers
          </a>
        </nav>

        {/* Live Status Indicator & Quick Action */}
        <div className="flex items-center space-x-3">
          <div className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>AI Online &amp; Ready</span>
          </div>

          {hasResult && onReset && (
            <button
              onClick={onReset}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition active:scale-95"
            >
              New Analysis
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

import React from 'react';
import { Compass, HelpCircle, Layers, Cpu, User } from 'lucide-react';

export type NavTab = 'home' | 'how-it-works' | 'capabilities' | 'faq' | 'about';

interface HeaderProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onReset?: () => void;
  hasResult?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  onReset,
  hasResult,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-white shadow-sm transition-all">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand / Logo */}
        <div
          onClick={() => {
            onTabChange('home');
            if (onReset) onReset();
          }}
          className="flex items-center space-x-3 cursor-pointer group select-none"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-teal-500/30 group-hover:scale-105 transition-transform">
            <Compass className="w-5 h-5 text-white animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-white group-hover:text-teal-300 transition-colors">
                AI Location <span className="text-teal-400">Detect</span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                PRO
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium hidden sm:block">
              Visual Geolocation Intelligence
            </p>
          </div>
        </div>

        {/* Center Navigation Tabs (Switch views without page reload) */}
        <nav className="hidden md:flex items-center space-x-1 text-xs font-semibold">
          <button
            onClick={() => onTabChange('home')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeTab === 'home'
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            Home
          </button>
          <button
            onClick={() => onTabChange('how-it-works')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center space-x-1.5 ${
              activeTab === 'how-it-works'
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>How It Works</span>
          </button>
          <button
            onClick={() => onTabChange('capabilities')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center space-x-1.5 ${
              activeTab === 'capabilities'
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Capabilities</span>
          </button>
          <button
            onClick={() => onTabChange('faq')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center space-x-1.5 ${
              activeTab === 'faq'
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Q&amp;A</span>
          </button>
          <button
            onClick={() => onTabChange('about')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center space-x-1.5 ${
              activeTab === 'about'
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>About</span>
          </button>
        </nav>

        {/* Right Action / Status */}
        <div className="flex items-center space-x-2.5">
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="hidden sm:inline">AI Online</span>
          </div>

          {activeTab !== 'home' ? (
            <button
              onClick={() => onTabChange('home')}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white text-xs font-bold shadow-sm transition active:scale-95"
            >
              Analyze Photo
            </button>
          ) : hasResult && onReset ? (
            <button
              onClick={onReset}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition active:scale-95"
            >
              New Search
            </button>
          ) : null}
        </div>
      </div>

      {/* Mobile Sub-Navigation Bar */}
      <div className="md:hidden flex items-center justify-around px-2 py-2 border-t border-slate-800 bg-slate-900/95 text-[11px] font-medium overflow-x-auto">
        <button
          onClick={() => onTabChange('home')}
          className={`px-2.5 py-1 rounded-lg ${
            activeTab === 'home' ? 'text-teal-300 font-bold bg-teal-500/20' : 'text-slate-400'
          }`}
        >
          Home
        </button>
        <button
          onClick={() => onTabChange('how-it-works')}
          className={`px-2.5 py-1 rounded-lg ${
            activeTab === 'how-it-works' ? 'text-teal-300 font-bold bg-teal-500/20' : 'text-slate-400'
          }`}
        >
          How It Works
        </button>
        <button
          onClick={() => onTabChange('capabilities')}
          className={`px-2.5 py-1 rounded-lg ${
            activeTab === 'capabilities' ? 'text-teal-300 font-bold bg-teal-500/20' : 'text-slate-400'
          }`}
        >
          Capabilities
        </button>
        <button
          onClick={() => onTabChange('faq')}
          className={`px-2.5 py-1 rounded-lg ${
            activeTab === 'faq' ? 'text-teal-300 font-bold bg-teal-500/20' : 'text-slate-400'
          }`}
        >
          Q&amp;A
        </button>
        <button
          onClick={() => onTabChange('about')}
          className={`px-2.5 py-1 rounded-lg ${
            activeTab === 'about' ? 'text-teal-300 font-bold bg-teal-500/20' : 'text-slate-400'
          }`}
        >
          About
        </button>
      </div>
    </header>
  );
};

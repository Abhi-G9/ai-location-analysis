import React from 'react';
import { Compass, Sparkles } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="relative bg-white border-b border-slate-200/80 shadow-xs">
      {/* Subtle modern top accent gradient line */}
      <div className="h-1 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-teal-500" />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center space-y-3">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/60 text-blue-700 text-xs font-semibold shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
          <span>Multimodal Visual Intelligence</span>
        </div>

        <div className="flex items-center justify-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Compass className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            AI Location <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Analysis</span>
          </h1>
        </div>

        <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto font-normal">
          Upload a photo to investigate where it may have been taken.
        </p>
      </div>
    </header>
  );
};

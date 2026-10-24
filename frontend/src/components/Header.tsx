import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          AI Location Analysis
        </h1>
        <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto">
          Upload a photo to investigate where it may have been taken.
        </p>
      </div>
    </header>
  );
};

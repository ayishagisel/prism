'use client';

import { useState } from 'react';

type ViewType = 'agency' | 'client';

interface ViewToggleProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

export default function ViewToggle({ currentView, onViewChange }: ViewToggleProps) {
  return (
    <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
      <button
        onClick={() => onViewChange('agency')}
        className={`px-4 py-2 rounded-md font-medium transition-all ${
          currentView === 'agency'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        Agency View
      </button>
      <button
        onClick={() => onViewChange('client')}
        className={`px-4 py-2 rounded-md font-medium transition-all ${
          currentView === 'client'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        Client View
      </button>
    </div>
  );
}

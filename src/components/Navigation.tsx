import React from 'react';

interface NavigationProps {
  activeTab: 'quick' | 'print' | 'wall';
  onTabChange: (tab: 'quick' | 'print' | 'wall') => void;
}

export default function Navigation({ activeTab, onTabChange }: NavigationProps) {
  return (
    <nav className="flex justify-center gap-4 md:gap-6 pb-4 flex-wrap">
      <button
        onClick={() => onTabChange('quick')}
        className={`text-sm md:text-base uppercase tracking-wider px-6 py-2 rounded-sm ${
          activeTab === 'quick'
            ? 'tech-button-active'
            : 'tech-button'
        }`}
      >
        Quick Scale
      </button>
      <button
        onClick={() => onTabChange('print')}
        className={`text-sm md:text-base uppercase tracking-wider px-6 py-2 rounded-sm ${
          activeTab === 'print'
            ? 'tech-button-active'
            : 'tech-button'
        }`}
      >
        Print Studio
      </button>
      <button
        onClick={() => onTabChange('wall')}
        className={`text-sm md:text-base uppercase tracking-wider px-6 py-2 rounded-sm ${
          activeTab === 'wall'
            ? 'tech-button-active'
            : 'tech-button'
        }`}
      >
        Wall Setup
      </button>
    </nav>
  );
}

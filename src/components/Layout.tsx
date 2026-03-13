import React, { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [theme, setTheme] = useState<'dark' | 'light'>('light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(t => t === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="min-h-screen bg-bg text-text font-mono p-4 md:p-8 selection:bg-accent selection:text-bg transition-colors duration-300">
      <div className="w-full max-w-[1400px] mx-auto relative">
        <button 
          onClick={toggleTheme}
          className="absolute top-0 right-0 p-2 text-accent hover:bg-accent hover:text-bg border border-accent rounded-sm z-10 flex items-center gap-2 bg-panel transition-colors"
          title="Toggle Theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          <span className="uppercase hidden md:inline text-xs tracking-wider">{theme === 'dark' ? 'Light' : 'Dark'}</span>
        </button>
        <div className="tech-panel tech-panel-corner p-1 mt-12 md:mt-0">
          <div className="border border-accent/30 p-4 md:p-8 min-h-[80vh] relative flex flex-col">
            <div className="absolute top-4 left-4 z-40">
              <div className="w-16 h-16 md:w-32 md:h-32 border border-muted bg-panel p-1 overflow-hidden rounded-sm">
                <img 
                  src="/cerdito_1.jpg" 
                  alt="Pixel Ladder Logo" 
                  className="w-full h-full object-cover relative z-10"
                  onError={(e) => {
                    e.currentTarget.src = "/pig-logo.svg";
                  }}
                />
              </div>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

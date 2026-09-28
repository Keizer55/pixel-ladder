import React, { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider';
import LanguageSwitcher from './LanguageSwitcher';

interface LayoutProps {
  children: React.ReactNode;
}

const THEME_KEY = 'pl-theme';

// index.html applies the saved (or system) theme before first paint; start from it.
function initialTheme(): 'dark' | 'light' {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

export default function Layout({ children }: LayoutProps) {
  const { t } = useI18n();
  const [theme, setTheme] = useState<'dark' | 'light'>(initialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // Storage unavailable: the theme still applies for this visit.
    }
  };

  return (
    <div className="min-h-screen bg-bg text-text font-mono p-4 md:p-8 selection:bg-accent selection:text-bg transition-colors duration-300">
      <div className="w-full max-w-[1400px] mx-auto relative pt-14 md:pt-0">
        <div className="absolute top-0 right-0 z-10 flex gap-2">
          <LanguageSwitcher />
          <button
            type="button"
            onClick={toggleTheme}
            className="h-11 md:h-9 min-w-11 px-3 text-accent hover:bg-accent hover:text-bg border border-accent rounded-sm flex items-center justify-center gap-2 bg-panel transition-colors"
            title={t.layout.themeToggle}
            aria-label={t.layout.themeToggle}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" aria-hidden="true" /> : <Moon className="w-4 h-4" aria-hidden="true" />}
            <span className="uppercase hidden md:inline text-xs tracking-wider">{theme === 'dark' ? t.layout.light : t.layout.dark}</span>
          </button>
        </div>
        <div className="tech-panel tech-panel-corner p-1">
          <div className="border border-accent/30 p-4 md:p-8 min-h-[80vh] relative flex flex-col">
            <div className="absolute top-4 left-4 z-40">
              <div className="w-16 h-16 md:w-32 md:h-32 border border-muted bg-panel p-1 overflow-hidden rounded-sm">
                <img
                  src="/cerdito_1.jpg"
                  alt=""
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

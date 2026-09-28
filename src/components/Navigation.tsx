import React, { useRef } from 'react';
import { useI18n } from '../i18n/I18nProvider';
import type { Tab } from '../lib/Workspace';

interface NavigationProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const TABS: Tab[] = ['quick', 'print', 'wall'];

export default function Navigation({ activeTab, onTabChange }: NavigationProps) {
  const { t } = useI18n();
  const refs = useRef<Record<Tab, HTMLButtonElement | null>>({ quick: null, print: null, wall: null });

  // Arrow keys move between tabs (WAI-ARIA tabs pattern, automatic activation).
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let next = -1;
    if (e.key === 'ArrowRight') next = (index + 1) % TABS.length;
    else if (e.key === 'ArrowLeft') next = (index - 1 + TABS.length) % TABS.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = TABS.length - 1;
    if (next < 0) return;
    e.preventDefault();
    onTabChange(TABS[next]);
    refs.current[TABS[next]]?.focus();
  };

  return (
    <nav className="flex justify-center pb-4">
      <div role="tablist" aria-label={t.app.toolsLabel} className="flex justify-center gap-4 md:gap-6 flex-wrap">
        {TABS.map((tab, i) => {
          const selected = activeTab === tab;
          return (
            <button
              key={tab}
              ref={(el) => { refs.current[tab] = el; }}
              type="button"
              role="tab"
              id={`tab-${tab}`}
              aria-selected={selected}
              aria-controls={`panel-${tab}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onTabChange(tab)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              className={`text-sm md:text-base uppercase tracking-wider px-6 py-2 rounded-sm ${
                selected ? 'tech-button-active' : 'tech-button'
              }`}
            >
              {t.app.tabs[tab]}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

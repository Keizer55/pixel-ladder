import React from 'react';
import { Globe } from 'lucide-react';
import { useI18n, type Lang } from '../i18n/I18nProvider';

const LANGS: { code: Lang; label: string; name: string }[] = [
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'es', label: 'ES', name: 'Español' },
];

// Square segmented control that sits next to the theme button.
export default function LanguageSwitcher() {
  const { lang, setLang, t } = useI18n();

  return (
    <div role="group" aria-label={t.layout.language} className="flex items-stretch border border-accent bg-panel rounded-sm">
      <span className="hidden md:flex items-center px-2 text-accent" aria-hidden="true">
        <Globe className="w-4 h-4" />
      </span>
      {LANGS.map(({ code, label, name }, i) => {
        const active = code === lang;
        return (
          <button
            key={code}
            type="button"
            lang={code}
            aria-pressed={active}
            title={name}
            onClick={() => setLang(code)}
            className={`min-w-11 md:min-w-0 h-[42px] md:h-[34px] md:px-3 text-xs tracking-wider transition-colors ${
              i > 0 ? 'border-l border-accent' : 'md:border-l md:border-accent'
            } ${active ? 'bg-accent text-bg' : 'text-accent hover:bg-accent-dim'}`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

import React, { createContext, useContext, useEffect, useState } from 'react';
import { en, type Dict } from './en';
import { es } from './es';

export type Lang = 'en' | 'es';

const DICTS: Record<Lang, Dict> = { en, es };
const STORAGE_KEY = 'pl-lang';

// index.html sets <html lang> before first paint (saved choice, else browser
// language), so read it back here to start in the same language.
function initialLang(): Lang {
  const fromDoc = document.documentElement.lang;
  if (fromDoc === 'en' || fromDoc === 'es') return fromDoc;
  return /^es\b/i.test(navigator.language || '') ? 'es' : 'en';
}

interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Dict;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = (next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage can be unavailable (private mode); the choice still applies for this visit.
    }
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t: DICTS[lang] }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}

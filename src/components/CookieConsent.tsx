import { useEffect, useState } from 'react';
import { Cookie } from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider';
import Button from './ui/Button';

export default function CookieConsent() {
  const { t } = useI18n();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('clarity-consent');
    if (!consent) {
      setIsVisible(true);
    } else if (consent === 'accepted') {
      window.clarity?.('consent');
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('clarity-consent', 'accepted');
    setIsVisible(false);
    window.clarity?.('consent');
  };

  const handleDecline = () => {
    localStorage.setItem('clarity-consent', 'declined');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div role="region" aria-label="Cookies" className="fixed bottom-0 left-0 right-0 z-50 bg-panel border-t-2 border-accent p-4 md:p-6 shadow-lg">
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-start md:items-center gap-4">
        <div className="flex-1 flex gap-3 items-start">
          <Cookie className="w-5 h-5 shrink-0 mt-0.5 text-accent" aria-hidden="true" />
          <p className="text-sm md:text-base font-mono text-text">
            {t.cookies.before}<strong>{t.cookies.service}</strong>{t.cookies.middle}<strong>{t.cookies.local}</strong>{t.cookies.after}
          </p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button variant="primary" size="md" onClick={handleAccept} className="flex-1 md:flex-none">
            {t.cookies.accept}
          </Button>
          <Button variant="secondary" size="md" onClick={handleDecline} className="flex-1 md:flex-none">
            {t.cookies.decline}
          </Button>
        </div>
      </div>
    </div>
  );
}

declare global {
  interface Window {
    clarity: any;
  }
}

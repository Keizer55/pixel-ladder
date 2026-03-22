import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

export default function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('clarity-consent');
    if (!consent) {
      setIsVisible(true);
    } else if (consent === 'accepted') {
      loadClarity();
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('clarity-consent', 'accepted');
    setIsVisible(false);
    loadClarity();
  };

  const handleDecline = () => {
    localStorage.setItem('clarity-consent', 'declined');
    setIsVisible(false);
  };

  const loadClarity = () => {
    if ((window as any).clarity) return; // Prevent multiple loads
    (function(c: any, l: any, a: string, r: string, i: string, t?: any, y?: any) {
      c[a] = c[a] || function() { (c[a].q = c[a].q || []).push(arguments) };
      t = l.createElement(r); t.async = 1; t.src = "https://www.clarity.ms/tag/" + i;
      y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
    })(window, document, "clarity", "script", "vuotlcahms");
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-panel border-t-2 border-accent p-4 md:p-6 shadow-lg"
         style={{backgroundColor: 'var(--color-panel)'}}>
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-start md:items-center gap-4">
        <div className="flex-1">
          <p className="text-sm md:text-base font-mono text-primary">
            🍪 We use <strong>Microsoft Clarity</strong> to understand how you use our tool and improve your experience. 
            Your images are <strong>always processed locally</strong> and never uploaded.
          </p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button
            onClick={handleAccept}
            className="flex-1 md:flex-none px-4 py-2 bg-accent text-surface font-mono text-sm hover:opacity-80 transition-opacity border-2 border-accent"
          >
            Accept
          </button>
          <button
            onClick={handleDecline}
            className="flex-1 md:flex-none px-4 py-2 bg-surface text-primary font-mono text-sm hover:bg-muted/10 transition-colors border-2 border-muted"
          >
            Decline
          </button>
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

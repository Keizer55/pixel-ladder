import React from 'react';
import { useI18n } from '../i18n/I18nProvider';
import { track } from '../lib/analytics';

// Donations page. A plain link on purpose: the embed script Buy Me a Coffee offers
// would load third-party JavaScript and need CSP exceptions for no benefit.
export const SUPPORT_URL = 'https://buymeacoffee.com/dicetamer';

// Official yellow button from the Buy Me a Coffee creator kit (public/bmc-button.svg),
// shown below "How Pixel Ladder works".
export default function SupportLink() {
  const { t } = useI18n();
  return (
    <div className="mt-4 flex flex-col items-center gap-3 text-center">
      <p className="text-muted text-sm max-w-xl">{t.support.pitch}</p>
      <a
        href={SUPPORT_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track('support-click')}
        className="inline-block rounded-lg transition-transform motion-safe:hover:-translate-y-0.5 hover:opacity-90"
      >
        <img src="/bmc-button.svg" alt={t.support.button} width={545} height={153} className="h-10 md:h-11 w-auto" />
      </a>
    </div>
  );
}

import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ResolutionAlertProps {
  lead: string;
  detail: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

// Low-resolution warning: states the numbers and offers the way out. Same text
// size as its surroundings (12px); colour plus icon plus wording, never colour alone.
export default function ResolutionAlert({ lead, detail, actionLabel, onAction, className = '' }: ResolutionAlertProps) {
  return (
    <div className={`flex gap-2 items-start p-2.5 border border-danger bg-danger/5 rounded-sm text-left ${className}`}>
      <AlertTriangle className="w-4 h-4 shrink-0 mt-px text-danger" aria-hidden="true" />
      <div className="flex flex-col gap-1.5 min-w-0">
        <p className="text-xs leading-normal text-text normal-case">
          <strong className="text-danger font-semibold">{lead}</strong>
          {detail}
        </p>
        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="self-start text-xs uppercase tracking-wide text-accent underline underline-offset-4 hover:no-underline"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

// "×2.95" → "×3", "×2.1" → "×2.1": one decimal, rounded up so it never understates.
export function formatScale(ratio: number) {
  const up = Math.ceil(ratio * 10) / 10;
  return Number.isInteger(up) ? String(up) : up.toFixed(1);
}

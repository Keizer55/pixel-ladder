import React from 'react';

interface RadioCardProps {
  // No @types/react in the project, so JSX does not add `key` to props.
  key?: string;
  name: string;
  value: string;
  checked: boolean;
  onChange: (value: string) => void;
  title: string;
  description: string;
  // Extra line shown under the description (e.g. the resulting size).
  detail?: React.ReactNode;
}

// A square, selectable card backed by a native radio input, so arrow keys move
// between options and screen readers announce the group.
export default function RadioCard({ name, value, checked, onChange, title, description, detail }: RadioCardProps) {
  return (
    <label
      className={`flex gap-3 items-start p-3 rounded-sm border cursor-pointer transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-text ${
        checked ? 'border-accent bg-accent-dim shadow-[inset_0_0_0_1px_var(--color-accent)]' : 'border-border hover:border-accent'
      }`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
        className="sr-only"
      />
      <span
        aria-hidden="true"
        className={`mt-0.5 w-3.5 h-3.5 shrink-0 border-[1.5px] flex items-center justify-center ${checked ? 'border-accent' : 'border-border'}`}
      >
        {checked && <span className="w-1.5 h-1.5 bg-accent" />}
      </span>
      <span className="flex flex-col gap-1 min-w-0">
        <span className="text-sm font-medium uppercase tracking-wide text-text">{title}</span>
        <span className="text-xs leading-snug text-muted">{description}</span>
        {detail && <span className="text-xs text-accent">{detail}</span>}
      </span>
    </label>
  );
}

import React, { useRef } from 'react';

interface ChoiceGroupProps<T extends string> {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  className?: string;
  // Classes for every option button (size, padding, font size).
  optionClassName?: string;
}

// Square toggle buttons that behave as a radio group: one tab stop, arrow keys
// move and select, and the checked state is announced.
export default function ChoiceGroup<T extends string>({
  label,
  value,
  options,
  onChange,
  className = '',
  optionClassName = '',
}: ChoiceGroupProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    const delta = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (index + delta + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div role="radiogroup" aria-label={label} className={`flex gap-2 ${className}`}>
      {options.map((option, i) => {
        const checked = option.value === value;
        return (
          <button
            key={option.value}
            ref={(el) => { refs.current[i] = el; }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            className={`uppercase rounded-sm ${checked ? 'tech-button-active border border-accent' : 'tech-button'} ${optionClassName}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

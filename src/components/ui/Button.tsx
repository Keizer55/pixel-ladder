import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-sm font-mono uppercase tracking-wider transition-colors disabled:cursor-not-allowed';

// primary: the one filled action per step · secondary: outlined · ghost: icon/quiet · danger: destructive
const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'border border-accent bg-accent text-bg hover:opacity-90 disabled:bg-muted/15 disabled:text-muted disabled:border-muted/30 disabled:hover:opacity-100',
  secondary:
    'border border-accent bg-transparent text-accent hover:bg-accent hover:text-bg disabled:border-muted/40 disabled:text-muted disabled:hover:bg-transparent',
  ghost: 'border border-transparent bg-transparent text-muted hover:text-accent',
  danger: 'border border-danger bg-transparent text-danger hover:bg-danger hover:text-bg',
};

// 32 · 40 · 52 px tall
const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-13 px-6 text-base tracking-widest',
};

const ICON_SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-13 w-13',
};

export function buttonClasses({
  variant = 'secondary',
  size = 'md',
  iconOnly = false,
  className = '',
}: { variant?: ButtonVariant; size?: ButtonSize; iconOnly?: boolean; className?: string } = {}) {
  return [BASE, VARIANTS[variant], iconOnly ? ICON_SIZES[size] : SIZES[size], className].join(' ');
}

// The project has no @types/react, so native button attributes are passed through loosely.
interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconOnly?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  children?: React.ReactNode;
  [attribute: string]: unknown;
}

export default function Button({ variant, size, iconOnly, className, type = 'button', ...rest }: ButtonProps) {
  return <button type={type} className={buttonClasses({ variant, size, iconOnly, className })} {...rest} />;
}

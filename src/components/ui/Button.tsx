import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'danger-solid' | 'success';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  iconOnly?: boolean;
  loading?: boolean;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  block?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', iconOnly, loading, isLoading, leftIcon, rightIcon, block, className = '', disabled, children, ...rest },
  ref,
) {
  const isSpinning = loading || isLoading;
  const cls = [
    'crew-btn',
    `crew-btn--${variant}`,
    size === 'sm' ? 'crew-btn--sm' : size === 'lg' ? 'crew-btn--lg' : '',
    iconOnly ? `crew-btn--icon${size === 'sm' ? ' crew-btn--sm' : ''}` : '',
    block ? 'crew-btn--block' : '',
    isSpinning ? 'crew-btn--loading' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button ref={ref} className={cls} disabled={disabled || isSpinning} {...rest}>
      {isSpinning && <Loader2 size={15} className="animate-spin" aria-hidden />}
      {!isSpinning && leftIcon}
      {children}
      {!isSpinning && rightIcon}
    </button>
  );
});

export interface GlowButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  secondaryLabel?: string;
  icon?: React.ReactNode;
  block?: boolean;
}

export function GlowButton({ label, secondaryLabel, icon, block, className = '', children, ...rest }: GlowButtonProps) {
  const cls = ['crew-btn', 'crew-btn--glow', block ? 'crew-btn--glow-block' : '', className]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={cls} {...rest}>
      {icon && <span className="crew-glass-icon" aria-hidden>{icon}</span>}
      <span className="crew-glass-txtwrap">
        <span className="crew-glass-txt crew-glass-txt--1">{glowLetters(label)}</span>
        <span className="crew-glass-txt crew-glass-txt--2">{glowLetters(secondaryLabel ?? label)}</span>
      </span>
      {children}
    </button>
  );
}

function glowLetters(text: string): React.ReactNode {
  return Array.from(text).map((ch, i) => (
    <span key={i} className="crew-glass-letter">
      {ch === ' ' ? '\u00A0' : ch}
    </span>
  ));
}
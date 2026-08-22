import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-solid' | 'success';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'md' | 'sm';
  iconOnly?: boolean;
  loading?: boolean;
  block?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', iconOnly, loading, block, className = '', disabled, children, ...rest },
  ref,
) {
  const cls = [
    'crew-btn',
    `crew-btn--${variant}`,
    size === 'sm' ? 'crew-btn--sm' : '',
    iconOnly ? `crew-btn--icon${size === 'sm' ? ' crew-btn--sm' : ''}` : '',
    block ? 'crew-btn--block' : '',
    loading ? 'crew-btn--loading' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button ref={ref} className={cls} disabled={disabled || loading} {...rest}>
      {loading && <Loader2 size={15} className="animate-spin" aria-hidden />}
      {children}
    </button>
  );
});

// =============================================================
// Glass / Glow button — glossy dark CTA (reference: Uiverse.io
// "dexter-st" glassy button). Per-letter shimmer, ambient icon
// flicker, and a violet highlight sweep on hover/focus. The label
// swaps to `secondaryLabel` on hover/focus (e.g. "Sign In" →
// "Welcome!"). Class names: .crew-btn--glow (+ .crew-glass-*).
// =============================================================
export interface GlowButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Primary label rendered with letter-shimmer animation. */
  label: string;
  /** Alternate label revealed on hover / keyboard focus. */
  secondaryLabel?: string;
  /** Icon shown at the left (pass a lucide icon, e.g. <LogIn size={18} />). */
  icon?: React.ReactNode;
  /** Full-width variant (use inside form columns). */
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

/** Split text into per-letter shimmers; non-breaking space keeps layout stable. */
function glowLetters(text: string): React.ReactNode {
  return Array.from(text).map((ch, i) => (
    <span key={i} className="crew-glass-letter">
      {ch === ' ' ? '\u00A0' : ch}
    </span>
  ));
}
import { initials } from '@/lib/utils';

const FALLBACK = ['#6d4aff', '#0694a2', '#f59e0b', '#e5484d', '#2f6fed', '#22a06b', '#8b5cf6', '#0ea5e9', '#f0b429'];

export function Avatar({
  name,
  firstName,
  lastName,
  src,
  photo,
  color,
  size = 34,
  className = '',
  title,
}: {
  name?: string;
  firstName?: string;
  lastName?: string;
  src?: string | null;
  photo?: string | null;
  color?: string;
  size?: number | 'sm' | 'md' | 'lg';
  className?: string;
  title?: string;
}) {
  const numericSize = typeof size === 'number' ? size : size === 'sm' ? 28 : size === 'lg' ? 48 : 34;
  const fullName = (name || `${firstName || ''} ${lastName || ''}`.trim()) || 'User';
  const imgUrl = photo || src;
  const parts = fullName.trim().split(/\s+/);
  const first = parts[0] ?? '?';
  const last = parts.length > 1 ? parts[parts.length - 1] : '';
  let seed = 0;
  for (const ch of fullName) seed = (seed + ch.charCodeAt(0)) % FALLBACK.length;
  const color2 = color ?? FALLBACK[seed];

  return (
    <span
      className={`crew-avatar ${className}`}
      style={{ width: numericSize, height: numericSize, fontSize: Math.max(11, numericSize * 0.36), background: color2 }}
      title={title ?? fullName}
      aria-label={fullName}
    >
      {imgUrl ? <img src={imgUrl} alt={fullName} /> : initials(first, last)}
    </span>
  );
}
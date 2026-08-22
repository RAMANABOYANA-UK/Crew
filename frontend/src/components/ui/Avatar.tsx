import { initials } from '@/lib/utils';

const FALLBACK = ['#6d4aff', '#0694a2', '#f59e0b', '#e5484d', '#2f6fed', '#22a06b', '#8b5cf6', '#0ea5e9', '#f0b429'];

export function Avatar({
  name,
  photo,
  color,
  size = 34,
  className = '',
  title,
}: {
  name: string;
  photo?: string | null;
  color?: string;
  size?: number;
  className?: string;
  title?: string;
}) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0] ?? '?';
  const last = parts.length > 1 ? parts[parts.length - 1] : '';
  let seed = 0;
  for (const ch of name) seed = (seed + ch.charCodeAt(0)) % FALLBACK.length;
  const color2 = color ?? FALLBACK[seed];

  return (
    <span
      className={`crew-avatar ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(11, size * 0.36), background: color2 }}
      title={title ?? name}
      aria-label={name}
    >
      {photo ? <img src={photo} alt={name} /> : initials(first, last)}
    </span>
  );
}
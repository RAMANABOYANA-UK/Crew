// =============================================================
// Crew HRMS — date & formatting helpers (date-fns based)
// =============================================================
import { format, parseISO } from 'date-fns';

export function cn(...inputs: (string | undefined | null | false | Record<string, boolean>)[]): string {
  return inputs
    .flatMap((input) => {
      if (!input) return [];
      if (typeof input === 'string') return input.split(' ');
      if (typeof input === 'object') {
        return Object.entries(input)
          .filter(([_, val]) => Boolean(val))
          .map(([key]) => key);
      }
      return [];
    })
    .filter(Boolean)
    .join(' ');
}

export const todayISO = (): string => format(new Date(), 'yyyy-MM-dd');

export const nowTime = (): string => format(new Date(), 'HH:mm');

export function fmtDate(iso: string): string {
  return format(parseISO(iso), 'dd MMM yyyy');
}

export function fmtDay(iso: string): string {
  return format(parseISO(iso), 'EEE');
}

export function fmtMoney(n: number, withUnit: 'month' | 'year' | '' = 'month'): string {
  const s = '₹' + Math.round(n).toLocaleString('en-IN');
  if (withUnit === 'month') return `${s}/month`;
  if (withUnit === 'year') return `${s}/year`;
  return s;
}

export function fmtHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function durationMinutes(from: string, to: string): number {
  const [fh, fm] = from.split(':').map(Number);
  const [th, tm] = to.split(':').map(Number);
  return (th * 60 + tm) - (fh * 60 + fm);
}

export function addWorkMinutes(minutes: number): string {
  const d = new Date(Date.now() + minutes * 60_000);
  return format(d, 'HH:mm');
}

export function initials(first: string, last: string): string {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase();
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/** Count weekdays (Mon–Fri) between two ISO dates inclusive. */
export function countWorkingDays(startISO: string, endISO: string): number {
  let days = 0;
  const cur = parseISO(startISO);
  const end = parseISO(endISO);
  while (cur <= end) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) days++;
    cur.setDate(cur.getDate() + 1);
    if (cur > end && days === 0) break;
    if (cur > end && cur.getTime() - end.getTime() > 86400000 * 400) break;
  }
  return days;
}
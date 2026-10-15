import type { Tone } from './bridge.ts';

export function cx(...names: (string | false | null | undefined)[]): string {
  return names.filter(Boolean).join(' ');
}

export function tone(t: Tone | undefined): string {
  return `at-t-${t ?? 'default'}`;
}

/** "5m ago", "3d ago", or "in 2h". */
export function ago(at: number, now: number): string {
  const seconds = (now - at) / 1000;
  const s = Math.abs(seconds);
  if (s < 45) return 'just now';
  const [n, unit] =
    s < 3600 ? [s / 60, 'm'] : s < 86_400 ? [s / 3600, 'h'] : s < 86_400 * 30 ? [s / 86_400, 'd'] : s < 86_400 * 365 ? [s / 86_400 / 30, 'mo'] : [s / 86_400 / 365, 'y'];
  const k = Math.max(1, Math.round(n));
  return seconds >= 0 ? `${k}${unit} ago` : `in ${k}${unit}`;
}

export function toTime(at: string | number | Date): number {
  return at instanceof Date ? at.getTime() : typeof at === 'number' ? at : Date.parse(at);
}

export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return '–';
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${+(n / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${+(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e4) return `${+(n / 1e3).toFixed(1)}k`;
  return Number.isInteger(n) ? n.toLocaleString('en') : (+n.toFixed(2)).toLocaleString('en');
}

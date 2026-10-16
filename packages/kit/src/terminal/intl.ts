// Numbers and dates written as a browser writes them in English, for an
// engine without Intl (QuickJS has none). Where Intl exists, nothing here
// runs. Only what the kit and the templates use: grouped numbers, the date
// and time options below, and numeric sorting.

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

type DateOptions = {
  weekday?: 'short' | 'long' | 'narrow';
  day?: 'numeric' | '2-digit';
  month?: 'numeric' | '2-digit' | 'short' | 'long' | 'narrow';
  year?: 'numeric' | '2-digit';
  hour?: 'numeric' | '2-digit';
  minute?: 'numeric' | '2-digit';
  second?: 'numeric' | '2-digit';
  dateStyle?: 'full' | 'long' | 'medium' | 'short';
  timeStyle?: 'full' | 'long' | 'medium' | 'short';
  hour12?: boolean;
};

const pad = (n: number) => String(n).padStart(2, '0');

export function groupNumber(n: number, maxFraction = 3): string {
  if (!Number.isFinite(n)) return n > 0 ? '∞' : n < 0 ? '-∞' : 'NaN';
  const sign = n < 0 ? '-' : '';
  const fixed = Math.abs(n).toFixed(maxFraction).replace(/\.?0+$/, '');
  const [whole, fraction] = fixed.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sign}${grouped}${fraction ? `.${fraction}` : ''}`;
}

export function formatDate(d: Date, us: boolean, o: DateOptions, fallback: 'date' | 'time' | 'both'): string {
  if (!Number.isFinite(d.getTime())) return 'Invalid Date';
  const opts: DateOptions = { ...o };
  if (opts.dateStyle) {
    const style = opts.dateStyle;
    Object.assign(opts, style === 'short' ? { day: 'numeric', month: 'numeric', year: 'numeric' } : { day: 'numeric', month: style === 'medium' ? 'short' : 'long', year: 'numeric', ...(style === 'full' ? { weekday: 'long' } : {}) });
  }
  if (opts.timeStyle) Object.assign(opts, { hour: 'numeric', minute: '2-digit', ...(opts.timeStyle !== 'short' ? { second: '2-digit' } : {}) });
  const anyDate = opts.weekday || opts.day || opts.month || opts.year;
  const anyTime = opts.hour || opts.minute || opts.second;
  if (!anyDate && !anyTime) {
    if (fallback !== 'time') Object.assign(opts, { day: 'numeric', month: 'numeric', year: 'numeric' });
    if (fallback !== 'date') Object.assign(opts, { hour: 'numeric', minute: '2-digit', second: '2-digit' });
  }
  const date = dateText(d, us, opts);
  const time = timeText(d, us, opts);
  return [date, time].filter(Boolean).join(', ');
}

function dateText(d: Date, us: boolean, o: DateOptions): string {
  const day = o.day ? (o.day === '2-digit' ? pad(d.getDate()) : String(d.getDate())) : '';
  const year = o.year ? (o.year === '2-digit' ? pad(d.getFullYear() % 100) : String(d.getFullYear())) : '';
  const weekday = o.weekday ? (o.weekday === 'long' ? DAYS[d.getDay()] : DAYS[d.getDay()].slice(0, o.weekday === 'narrow' ? 1 : 3)) : '';
  if (o.month === 'numeric' || o.month === '2-digit') {
    const month = o.month === '2-digit' ? pad(d.getMonth() + 1) : String(d.getMonth() + 1);
    const parts = us ? [month, day, year] : [day, month, year];
    const text = parts.filter(Boolean).join('/');
    return weekday ? `${weekday}, ${text}` : text;
  }
  const month = o.month ? (o.month === 'long' ? MONTHS[d.getMonth()] : MONTHS[d.getMonth()].slice(0, o.month === 'narrow' ? 1 : 3)) : '';
  let text: string;
  if (us) {
    text = [month, day].filter(Boolean).join(' ');
    if (year) text = day && month ? `${text}, ${year}` : [text, year].filter(Boolean).join(' ');
    return weekday ? (text ? `${weekday}, ${text}` : weekday) : text;
  }
  text = [day, month, year].filter(Boolean).join(' ');
  return weekday ? (text ? `${weekday}${day ? ' ' : ', '}${text}` : weekday) : text;
}

function timeText(d: Date, us: boolean, o: DateOptions): string {
  if (!o.hour && !o.minute && !o.second) return '';
  const twelve = o.hour12 ?? us;
  const h = d.getHours();
  const hour = twelve ? String(h % 12 || 12) : pad(h);
  const parts = [o.hour ? hour : '', o.minute ? pad(d.getMinutes()) : '', o.second ? pad(d.getSeconds()) : ''].filter(Boolean);
  return `${parts.join(':')}${twelve && o.hour ? ` ${h < 12 ? 'AM' : 'PM'}` : ''}`;
}

/** Compares as `localeCompare` does with `{ numeric: true }`: runs of digits by their value. */
export function compareText(a: string, b: string, numeric: boolean): number {
  if (!numeric) return plain(a, b);
  const split = (s: string) => s.match(/\d+|\D+/g) ?? [];
  const [x, y] = [split(a), split(b)];
  for (let i = 0; i < Math.min(x.length, y.length); i++) {
    const [p, q] = [x[i], y[i]];
    const r = /^\d/.test(p) && /^\d/.test(q) ? Number(p) - Number(q) : plain(p, q);
    if (r) return r < 0 ? -1 : 1;
  }
  return x.length - y.length;
}

function plain(a: string, b: string): number {
  const [x, y] = [a.toLowerCase(), b.toLowerCase()];
  if (x !== y) return x < y ? -1 : 1;
  return a === b ? 0 : a < b ? 1 : -1;
}

export function installIntl(locale: string) {
  if (typeof (globalThis as { Intl?: unknown }).Intl !== 'undefined') return;
  const us = /-US$/i.test(locale);
  const fallbackUs = (l: unknown) => (typeof l === 'string' && l.includes('-') ? /-US$/i.test(l) : us);
  Number.prototype.toLocaleString = function (this: number, _l?: unknown, o?: { maximumFractionDigits?: number }) {
    return groupNumber(Number(this), o?.maximumFractionDigits ?? 3);
  };
  Date.prototype.toLocaleDateString = function (this: Date, l?: unknown, o?: DateOptions) {
    return formatDate(this, fallbackUs(l), o ?? {}, 'date');
  };
  Date.prototype.toLocaleTimeString = function (this: Date, l?: unknown, o?: DateOptions) {
    return formatDate(this, fallbackUs(l), o ?? {}, 'time');
  };
  Date.prototype.toLocaleString = function (this: Date, l?: unknown, o?: DateOptions) {
    return formatDate(this, fallbackUs(l), o ?? {}, 'both');
  };
  String.prototype.localeCompare = function (this: string, that: string, _l?: unknown, o?: { numeric?: boolean }) {
    return compareText(String(this), String(that), Boolean(o?.numeric));
  };
}

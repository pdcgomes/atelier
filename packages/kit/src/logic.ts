// What the interactive components do, apart from how they look: the state
// keys they keep, how they sort, filter, approve and send. The browser's kit
// and the terminal's both draw from here, so a click in one and a key in the
// other leave the same things in the canvas's state.

import { createContext, isValidElement, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Tone } from './bridge.ts';
import type { ApprovalMark, FieldProps, NeedsYouMark } from './forms.tsx';
import { useAction, useCanvasState, useForm, useNow, type FormHandle, type FormValues } from './hooks.ts';
import { formatNumber } from './util.ts';

// ---- Tabs

export function useTabs<T extends { id: string }>(tabs: T[], stateKey = 'tab', initial?: string) {
  const visible = tabs.filter(Boolean);
  const [open, setOpen] = useCanvasState(stateKey, initial ?? visible[0]?.id ?? '');
  const current = visible.find((t) => t.id === open) ?? visible[0];
  const select = (id: string) => setOpen(id);
  const move = (by: number) => {
    const i = visible.findIndex((t) => t.id === current?.id);
    const next = visible[(i + by + visible.length) % visible.length];
    if (next) setOpen(next.id);
  };
  return { visible, current, select, move };
}

// ---- Sections

/** Whether a section is open: kept in the canvas's state under `stateKey`, else just on screen. */
export function useSection(stateKey: string | undefined, open: boolean): [boolean, (now: boolean) => void] {
  const [kept, setKept] = useCanvasState<boolean | null>(stateKey ?? '', null);
  const [local, setLocal] = useState(open);
  const isOpen = stateKey ? (kept !== null ? kept : open) : local;
  const set = (now: boolean) => {
    if (now === isOpen) return;
    if (stateKey) setKept(now);
    else setLocal(now);
  };
  return [isOpen, set];
}

// ---- Tables

/** A value kept in the canvas's state when `key` is given, and only on screen otherwise. */
export function useKept<T>(key: string | undefined, initial: T): [T, (v: T) => void] {
  const [kept, setKept] = useCanvasState<T>(key ?? '', initial);
  const [local, setLocal] = useState<T>(initial);
  return key ? [kept, setKept] : [local, setLocal];
}

export interface TableColumn<Row> {
  key: string;
  label: ReactNode;
  align?: 'left' | 'right' | 'center';
  width?: number | string;
  render?: (row: Row, index: number) => ReactNode;
  sortBy?: (row: Row) => string | number;
  sortable?: boolean;
}

export type Sort = { col: number; dir: 1 | -1 } | null;

function primitive(v: unknown): string | number | null {
  if (typeof v === 'number' || typeof v === 'string') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (isValidElement(v)) return null;
  return v == null ? '' : String(v);
}

/** A table's columns, and its rows as sorted and filtered, with the sort and filter kept under `stateKey`. */
export function useTableView<Row>({ columns, headers, rows, stateKey }: { columns?: TableColumn<Row>[]; headers?: ReactNode[]; rows: Row[]; stateKey?: string }) {
  const [sort, setSort] = useKept<Sort>(stateKey && `${stateKey}:sort`, null);
  const [query, setQuery] = useKept<string>(stateKey && `${stateKey}:filter`, '');
  const cols: TableColumn<Row>[] =
    columns ?? (headers ?? []).map((label, i) => ({ key: String(i), label, render: (row: Row) => (row as unknown as ReactNode[])[i] }));
  const cell = (row: Row, c: TableColumn<Row>, i: number): ReactNode => (c.render ? c.render(row, i) : ((row as Record<string, unknown>)[c.key] as ReactNode));
  const value = (row: Row, c: TableColumn<Row>, i: number) => (c.sortBy ? c.sortBy(row) : primitive(columns ? (row as Record<string, unknown>)[c.key] : cell(row, c, i)));
  const shown = useMemo(() => {
    let list = rows.map((row, i) => ({ row, i }));
    const q = query.trim().toLowerCase();
    if (q) list = list.filter(({ row, i }) => cols.some((c) => String(value(row, c, i) ?? '').toLowerCase().includes(q)));
    if (sort && cols[sort.col]) {
      const c = cols[sort.col];
      list = [...list].sort((a, b) => {
        const [x, y] = [value(a.row, c, a.i), value(b.row, c, b.i)];
        const r = typeof x === 'number' && typeof y === 'number' ? x - y : String(x ?? '').localeCompare(String(y ?? ''), undefined, { numeric: true });
        return r * sort.dir;
      });
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, query, sort, cols.length]);
  /** Ascending, then descending, then unsorted. */
  const cycle = (n: number) => {
    const dir = sort?.col === n ? sort.dir : 0;
    setSort(dir === 0 ? { col: n, dir: 1 } : dir === 1 ? { col: n, dir: -1 } : null);
  };
  return { cols, shown, sort, cycle, query, setQuery, cell };
}

// ---- Stats

const BLOCKS = '▁▂▃▄▅▆▇█';

/** Values as block characters, lowest to highest. */
export function blocks(values: number[]): string {
  const [min, max] = [Math.min(...values), Math.max(...values)];
  return values.map((v) => BLOCKS[max === min ? 3 : Math.round(((v - min) / (max - min)) * 7)]).join('');
}

// ---- Timelines

export function useTimeline<T>(items: T[], limit?: number) {
  const now = useNow();
  const [all, setAll] = useState(false);
  const shown = limit && !all ? items.slice(0, limit) : items;
  return { now, all, shown, more: Boolean(limit && items.length > limit), toggle: () => setAll(!all) };
}

// ---- Calendars

export interface CalendarDayEvent {
  date: string;
  title: string;
  tone?: Tone;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function isoDay(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** A month's weeks, with each day's events, and the way to the months either side. */
export function useCalendar<E extends CalendarDayEvent>({ events, month, weekStart = 1 }: { events: E[]; month?: string; weekStart?: 0 | 1 }) {
  const first = month ?? events.map((e) => e.date).sort()[0]?.slice(0, 7) ?? isoDay(new Date()).slice(0, 7);
  const [shown, setShown] = useState(first);
  const [y, m] = shown.split('-').map(Number);
  const start = new Date(y, m - 1, 1);
  const offset = (start.getDay() - weekStart + 7) % 7;
  const all = Array.from({ length: 42 }, (_, i) => new Date(y, m - 1, 1 - offset + i));
  const byDay = new Map<string, E[]>();
  for (const e of events) byDay.set(e.date, [...(byDay.get(e.date) ?? []), e]);
  const today = isoDay(new Date());
  const weeks = all.slice(35).some((d) => d.getMonth() === m - 1) ? 6 : 5;
  const days = all.slice(0, weeks * 7).map((date) => {
    const key = isoDay(date);
    return { date, key, out: date.getMonth() !== m - 1, today: key === today, events: byDay.get(key) ?? [] };
  });
  const go = (by: number) => setShown(isoDay(new Date(y, m - 1 + by, 1)).slice(0, 7));
  return {
    label: start.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
    dows: Array.from({ length: 7 }, (_, i) => DAYS[(i + weekStart) % 7]),
    days,
    weeks,
    go,
  };
}

// ---- Diffs

/** The lines of `after` that differ from `before`, as a unified diff's lines. */
export function lineDiff(before: string, after: string): string[] {
  const a = before.split('\n');
  const b = after.split('\n');
  if (a.length * b.length > 4_000_000) return [...a.map((l) => `-${l}`), ...b.map((l) => `+${l}`)];
  const lcs = Array.from({ length: a.length + 1 }, () => new Uint32Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
  const out: string[] = [];
  let [i, j] = [0, 0];
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) (out.push(` ${a[i]}`), i++, j++);
    else if (lcs[i + 1][j] >= lcs[i][j + 1]) out.push(`-${a[i++]}`);
    else out.push(`+${b[j++]}`);
  }
  while (i < a.length) out.push(`-${a[i++]}`);
  while (j < b.length) out.push(`+${b[j++]}`);
  return out;
}

export type DiffKind = 'file' | 'hunk' | 'add' | 'del' | '';

/** A diff's lines, each with what kind of line it is. */
export function diffLines(diff?: string, before?: string, after?: string): { kind: DiffKind; text: string }[] {
  const lines = diff != null ? diff.replace(/\n$/, '').split('\n') : lineDiff(before ?? '', after ?? '');
  return lines.map((text) => ({
    text,
    kind: /^(\+\+\+|---|diff )/.test(text) ? 'file' : text.startsWith('@@') ? 'hunk' : text.startsWith('+') ? 'add' : text.startsWith('-') ? 'del' : '',
  }));
}

// ---- Histograms

/** Values counted into ranges, as a bar chart's categories and counts. */
export function histogram(values: number[], bins?: number, unit?: string) {
  const finite = values.filter(Number.isFinite);
  const count = bins ?? Math.max(4, Math.min(30, Math.ceil(Math.log2(finite.length || 1) + 1)));
  const [lo, hi] = [Math.min(...finite), Math.max(...finite)];
  const step = (hi - lo || 1) / count;
  const counts = Array.from({ length: count }, () => 0);
  for (const v of finite) counts[Math.min(count - 1, Math.floor((v - lo) / step))]++;
  const categories = counts.map((_, i) => `${formatNumber(lo + i * step)}${unit ?? ''}`);
  return { categories, counts, caption: `${finite.length} values in ${count} ranges of ${formatNumber(step)}${unit ?? ''}` };
}

// ---- Forms

export const FormContext = createContext<FormHandle | null>(null);

/** A field's value: from its form, from the canvas's state, or from its props. */
export function useField<T>({ name, stateKey, value, onChange }: FieldProps<T>, initial: T): [T, (v: T) => void, string | undefined] {
  const form = useContext(FormContext);
  const [kept, setKept] = useCanvasState<T>(stateKey ?? '', initial);
  const [local, setLocal] = useState<T>(initial);
  if (form && name) return [(form.values[name] as T) ?? initial, (v) => (form.set(name, v), onChange?.(v)), form.errors[name]];
  if (value !== undefined) return [value, (v) => onChange?.(v), undefined];
  if (stateKey) return [kept, (v) => (setKept(v), onChange?.(v)), undefined];
  return [local, (v) => (setLocal(v), onChange?.(v)), undefined];
}

export function fill(template: string, values: FormValues): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) => {
    const v = values[k];
    return v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
  });
}

export interface FormSpec {
  name: string;
  initial?: FormValues;
  validate?: (values: FormValues) => Record<string, string>;
  onSubmit?: (values: FormValues) => void;
  start?: { prompt: string; mode?: 'terminal' | 'background' };
}

/** A form's answers, and sending them: to the canvas's state, to `onSubmit`, and to a new agent with `start`. */
export function useFormRunner({ name, initial, validate, onSubmit, start }: FormSpec) {
  const handle = useForm(name, { initial, validate });
  const actions = useAction();
  const send = () => {
    if (!handle.submit()) return false;
    onSubmit?.(handle.values);
    if (start) void actions.startSession({ prompt: fill(start.prompt, handle.values), mode: start.mode });
    return true;
  };
  return { handle, send };
}

// ---- Approvals

/** An approval's mark under `approval:<id>`, and the note written for it. */
export function useApproval(id: string) {
  const [mark, setMark] = useCanvasState<ApprovalMark | null>(`approval:${id}`, null);
  const [note, setNote] = useState(mark?.note ?? '');
  const decide = (state: ApprovalMark['state']) => setMark({ state, note: note.trim() || undefined, at: new Date().toISOString() });
  const tone: Tone = mark?.state === 'approved' ? 'success' : mark?.state === 'held' ? 'warning' : 'accent';
  return { mark, note, setNote, decide, undo: () => setMark(null), tone };
}

// ---- Needs you

/** A Needs you item's mark, kept under `needsYou` by its id, and asking an agent to take it on. */
export function useNeedsYou({ id, title, detail, blocking, done, ask }: { id: string; title: ReactNode; detail?: ReactNode; blocking?: boolean; done?: boolean; ask?: { prompt?: string; mode?: 'terminal' | 'background' } }) {
  const [marks, setMarks] = useCanvasState<Record<string, NeedsYouMark | null>>('needsYou', {});
  const actions = useAction();
  const mark = marks[id];
  const set = (state: NeedsYouMark['state'] | null) => setMarks((m) => ({ ...m, [id]: state ? { state, at: new Date().toISOString() } : null }));
  const settled = Boolean(done || (mark && mark.state !== 'asked'));
  const label = typeof title === 'string' ? title : id;
  const askAgent = async () => {
    const prompt = ask?.prompt ?? `Take on this item from the canvas: ${label}.${typeof detail === 'string' ? ` ${detail}` : ''}`;
    const result = await actions.startSession({ prompt, mode: ask?.mode });
    if (result.ok) set('asked');
  };
  const tone: Tone = settled ? 'success' : blocking ? 'danger' : 'warning';
  return { mark, set, settled, askAgent, tone };
}

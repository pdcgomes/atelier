import { isValidElement, useMemo, useState, type ReactNode } from 'react';
import type { Tone } from './bridge.ts';
import { useCanvasState, useNow } from './hooks.ts';
import { Button } from './forms.tsx';
import { ago, cx, formatNumber, toTime, tone } from './util.ts';

/** A value kept in the canvas's state when `key` is given, and only on screen otherwise. */
function useKept<T>(key: string | undefined, initial: T): [T, (v: T) => void] {
  const [kept, setKept] = useCanvasState<T>(key ?? '', initial);
  const [local, setLocal] = useState<T>(initial);
  return key ? [kept, setKept] : [local, setLocal];
}

export interface Column<Row> {
  key: string;
  label: ReactNode;
  align?: 'left' | 'right' | 'center';
  width?: number | string;
  /** What the cell shows. Without it, `row[key]`. */
  render?: (row: Row, index: number) => ReactNode;
  /** What the column sorts by. Without it, `row[key]`. */
  sortBy?: (row: Row) => string | number;
  sortable?: boolean;
}

export interface RowAction<Row> {
  label: string;
  tone?: Tone;
  onClick: (row: Row, index: number) => void;
  /** Hides the action on rows it doesn't apply to. */
  hidden?: (row: Row) => boolean;
}

export interface TableProps<Row> {
  /** With rows as objects: what each column shows. */
  columns?: Column<Row>[];
  /** With rows as arrays of cells: the column headings. */
  headers?: ReactNode[];
  rows: Row[];
  /** Shows a box that filters the rows by what's typed in it. */
  filter?: boolean;
  /** A tone for each row, drawn as a bar on its left. */
  rowTone?: (row: Row, index: number) => Tone | undefined;
  actions?: RowAction<Row>[];
  /** What to say when there are no rows. Without it, the table isn't shown at all. */
  empty?: string;
  maxHeight?: number;
  dense?: boolean;
  /** Keeps the sort and the filter in the canvas's state under this key. */
  stateKey?: string;
}

function primitive(v: unknown): string | number | null {
  if (typeof v === 'number' || typeof v === 'string') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (isValidElement(v)) return null;
  return v == null ? '' : String(v);
}

/** A table that sorts by any column you click and filters by what you type. */
export function Table<Row>({ columns, headers, rows, filter, rowTone, actions, empty, maxHeight, dense, stateKey }: TableProps<Row>) {
  const [sort, setSort] = useKept<{ col: number; dir: 1 | -1 } | null>(stateKey && `${stateKey}:sort`, null);
  const [query, setQuery] = useKept<string>(stateKey && `${stateKey}:filter`, '');
  const cols: Column<Row>[] =
    columns ?? (headers ?? []).map((label, i) => ({ key: String(i), label, render: (row: Row) => (row as unknown as ReactNode[])[i] }));
  const cell = (row: Row, c: Column<Row>, i: number): ReactNode => (c.render ? c.render(row, i) : ((row as Record<string, unknown>)[c.key] as ReactNode));
  const value = (row: Row, c: Column<Row>, i: number) => (c.sortBy ? c.sortBy(row) : primitive(columns ? (row as Record<string, unknown>)[c.key] : cell(row, c, i)));

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

  if (!rows.length) return empty ? <p className="at-empty">{empty}</p> : null;
  return (
    <div>
      {filter && (
        <div className="at-table-tools">
          <input className="at-input" style={{ maxWidth: 260 }} placeholder={`Filter ${rows.length} rows`} value={query} onChange={(e) => setQuery(e.target.value)} />
          {query && <span className="at-text-3 at-sm">{shown.length} shown</span>}
        </div>
      )}
      <div className="at-table-wrap" style={{ maxHeight }}>
        <table className={cx('at-table', dense && 'at-dense')}>
          <thead>
            <tr>
              {cols.map((c, n) => {
                const dir = sort?.col === n ? sort.dir : 0;
                const sortable = c.sortable ?? true;
                return (
                  <th key={c.key} className={c.align && c.align !== 'left' ? `at-${c.align}` : undefined} style={{ width: c.width }} aria-sort={dir ? (dir > 0 ? 'ascending' : 'descending') : undefined}>
                    {sortable ? (
                      <button type="button" onClick={() => setSort(dir === 0 ? { col: n, dir: 1 } : dir === 1 ? { col: n, dir: -1 } : null)}>
                        {c.label}
                        <span className="at-sort">{dir > 0 ? '▲' : dir < 0 ? '▼' : ''}</span>
                      </button>
                    ) : (
                      c.label
                    )}
                  </th>
                );
              })}
              {actions?.length ? <th aria-label="Actions" /> : null}
            </tr>
          </thead>
          <tbody>
            {shown.map(({ row, i }) => {
              const t = rowTone?.(row, i);
              return (
                <tr key={i} className={cx(t && tone(t), t && 'at-toned-row')}>
                  {cols.map((c) => (
                    <td key={c.key} className={c.align && c.align !== 'left' ? `at-${c.align}` : undefined}>
                      {cell(row, c, i)}
                    </td>
                  ))}
                  {actions?.length ? (
                    <td>
                      <div className="at-table-actions">
                        {actions
                          .filter((a) => !a.hidden?.(row))
                          .map((a) => (
                            <Button key={a.label} size="sm" tone={a.tone} onClick={() => a.onClick(row, i)}>
                              {a.label}
                            </Button>
                          ))}
                      </div>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const BLOCKS = '▁▂▃▄▅▆▇█';

function blocks(values: number[]): string {
  const [min, max] = [Math.min(...values), Math.max(...values)];
  return values.map((v) => BLOCKS[max === min ? 3 : Math.round(((v - min) / (max - min)) * 7)]).join('');
}

export interface StatProps {
  label: ReactNode;
  value: ReactNode;
  /** Colours the value. */
  tone?: Tone;
  /** A change, such as "+12%", in its own tone. */
  delta?: ReactNode;
  deltaTone?: Tone;
  /** A note under the value. */
  hint?: ReactNode;
  /** Recent values, drawn as a sparkline of blocks. */
  trend?: number[];
}

/** A number that matters, with its label. */
export function Stat({ label, value, tone: t, delta, deltaTone, hint, trend }: StatProps) {
  return (
    <div className={cx('at-stat', t && t !== 'default' && tone(t), t && t !== 'default' && 'at-toned-value')}>
      <span className="at-stat-label">{label}</span>
      <span className="at-stat-value">{typeof value === 'number' ? formatNumber(value) : value}</span>
      {(delta != null || hint != null || trend?.length) && (
        <span className="at-stat-foot">
          <span>
            {delta != null && <span className={cx(tone(deltaTone), 'at-toned')}>{delta}</span>} {hint}
          </span>
          {trend && trend.length > 1 && (
            <span className={cx('at-spark-blocks', tone(t ?? 'accent'))} aria-label={`Trend: ${trend.join(', ')}`}>
              {blocks(trend)}
            </span>
          )}
        </span>
      )}
    </div>
  );
}

/** Stats side by side, as many to a row as fit. */
export function Stats({ children, min = 140 }: { children: ReactNode; min?: number }) {
  return (
    <div className="at-stats" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${min}px), 1fr))` }}>
      {children}
    </div>
  );
}

/** A small label in a tone: a status, a count, a tag. */
export function Badge({ tone: t = 'default', variant = 'soft', dot, children }: { tone?: Tone; variant?: 'soft' | 'solid' | 'outline'; dot?: boolean; children?: ReactNode }) {
  return <span className={cx('at-badge', tone(t), variant !== 'soft' && `at-v-${variant}`, dot && 'at-dot')}>{children}</span>;
}

export interface MeterProps {
  value: number;
  max?: number;
  label?: ReactNode;
  tone?: Tone;
  /** What's written after the label: a percentage, the value out of the maximum, or nothing. */
  show?: 'percent' | 'value' | 'none';
  /** Draws it in block characters, like a terminal meter. */
  blocks?: boolean;
  /** The bar in parts, each in its own tone: done, in progress, blocked. What's written still counts `value`. */
  segments?: { value: number; tone?: Tone; label?: string }[];
}

/** How far along something is. */
export function Meter({ value, max = 100, label, tone: t = 'accent', show = 'percent', blocks: asBlocks, segments }: MeterProps) {
  const total = value;
  const ratio = max > 0 ? Math.min(1, Math.max(0, total / max)) : 0;
  const shown = show === 'percent' ? `${Math.round(ratio * 100)}%` : show === 'value' ? `${formatNumber(total)} / ${formatNumber(max)}` : null;
  const width = 24;
  return (
    <div className={cx('at-meter', tone(t))} role="meter" aria-valuenow={total} aria-valuemin={0} aria-valuemax={max} aria-label={typeof label === 'string' ? label : undefined}>
      {(label != null || shown) && (
        <div className="at-meter-head">
          <span>{label}</span>
          {shown && <span className="at-meter-value">{shown}</span>}
        </div>
      )}
      {asBlocks && !segments ? (
        <div className="at-meter-blocks">
          {'█'.repeat(Math.round(ratio * width))}
          <span className="at-meter-rest">{'░'.repeat(width - Math.round(ratio * width))}</span>
        </div>
      ) : (
        <div className="at-meter-track">
          {(segments ?? [{ value, tone: t }]).map((s, i) => (
            <span key={i} className={cx('at-meter-fill', tone(s.tone ?? t))} style={{ width: `${max > 0 ? (s.value / max) * 100 : 0}%` }} title={s.label} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Labels and their values, in columns. */
export function KeyValue({ items, columns = 1 }: { items: [ReactNode, ReactNode][] | Record<string, ReactNode>; columns?: 1 | 2 }) {
  const pairs = Array.isArray(items) ? items : Object.entries(items);
  return (
    <dl className={cx('at-kv', columns === 2 && 'at-kv-2')}>
      {pairs.map(([k, v], i) => (
        <div key={i} style={{ display: 'contents' }}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export interface TimelineItem {
  /** When it happened: ISO with the time zone, or milliseconds. */
  at?: string | number;
  title: ReactNode;
  body?: ReactNode;
  tone?: Tone;
  /** Who did it. */
  who?: ReactNode;
}

/** What happened, newest first, as a line of events. */
export function Timeline({ items, limit }: { items: TimelineItem[]; limit?: number }) {
  const now = useNow();
  const [all, setAll] = useState(false);
  const shown = limit && !all ? items.slice(0, limit) : items;
  return (
    <div>
      <ol className="at-timeline">
        {shown.map((it, i) => (
          <li key={i} className={tone(it.tone ?? 'accent')}>
            <span className="at-timeline-dot" />
            <div>
              <div className="at-timeline-head">
                <span className="at-timeline-title">{it.title}</span>
                {it.who != null && <span className="at-text-2 at-sm">{it.who}</span>}
                {it.at != null && Number.isFinite(toTime(it.at)) && <span className="at-time at-sm">{ago(toTime(it.at), now)}</span>}
              </div>
              {it.body != null && <div className="at-timeline-body">{it.body}</div>}
            </div>
          </li>
        ))}
      </ol>
      {limit && items.length > limit && (
        <Button size="sm" variant="ghost" onClick={() => setAll(!all)}>
          {all ? 'Show fewer' : `Show all ${items.length}`}
        </Button>
      )}
    </div>
  );
}

export interface Lane {
  title: ReactNode;
  tone?: Tone;
  items: { title: ReactNode; detail?: ReactNode; badge?: ReactNode; tone?: Tone }[];
}

/** Columns of cards, such as Ready, Doing and Blocked. */
export function Lanes({ lanes }: { lanes: Lane[] }) {
  return (
    <div className="at-lanes">
      {lanes.map((lane, i) => (
        <section key={i} className={cx('at-lane', tone(lane.tone ?? 'accent'))}>
          <div className="at-lane-head">
            <span>{lane.title}</span>
            <span>{lane.items.length}</span>
          </div>
          {lane.items.map((it, n) => (
            <article key={n} className={cx('at-card', it.tone && tone(it.tone), it.tone && 'at-toned-line')}>
              <div className="at-row" style={{ gap: 6, justifyContent: 'space-between' }}>
                <span className="at-card-title">{it.title}</span>
                {it.badge}
              </div>
              {it.detail != null && <div className="at-card-detail">{it.detail}</div>}
            </article>
          ))}
        </section>
      ))}
    </div>
  );
}

export interface CalendarEvent {
  /** `YYYY-MM-DD`. */
  date: string;
  title: string;
  tone?: Tone;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** A month, with events on their days. */
export function Calendar({ events, month, weekStart = 1 }: { events: CalendarEvent[]; month?: string; weekStart?: 0 | 1 }) {
  const first = month ?? events.map((e) => e.date).sort()[0]?.slice(0, 7) ?? iso(new Date()).slice(0, 7);
  const [shown, setShown] = useState(first);
  const [y, m] = shown.split('-').map(Number);
  const start = new Date(y, m - 1, 1);
  const offset = (start.getDay() - weekStart + 7) % 7;
  const days = Array.from({ length: 42 }, (_, i) => new Date(y, m - 1, 1 - offset + i));
  const byDay = new Map<string, CalendarEvent[]>();
  for (const e of events) byDay.set(e.date, [...(byDay.get(e.date) ?? []), e]);
  const today = iso(new Date());
  const go = (by: number) => {
    const d = new Date(y, m - 1 + by, 1);
    setShown(iso(d).slice(0, 7));
  };
  const weeks = days.slice(35).some((d) => d.getMonth() === m - 1) ? 6 : 5;
  return (
    <div className="at-cal">
      <div className="at-cal-head">
        <strong>{start.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</strong>
        <span className="at-row" style={{ gap: 4 }}>
          <Button size="sm" variant="ghost" onClick={() => go(-1)}>
            ‹
          </Button>
          <Button size="sm" variant="ghost" onClick={() => go(1)}>
            ›
          </Button>
        </span>
      </div>
      <div className="at-cal-grid">
        {Array.from({ length: 7 }, (_, i) => (
          <span key={i} className="at-cal-dow">
            {DAYS[(i + weekStart) % 7]}
          </span>
        ))}
        {days.slice(0, weeks * 7).map((d) => {
          const key = iso(d);
          return (
            <div key={key} className={cx('at-cal-day', d.getMonth() !== m - 1 && 'at-out', key === today && 'at-today')}>
              <span className="at-cal-n">{d.getDate()}</span>
              {(byDay.get(key) ?? []).map((e, i) => (
                <span key={i} className={cx('at-cal-event', tone(e.tone ?? 'accent'))} title={e.title}>
                  {e.title}
                </span>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export interface TreeItem {
  label: ReactNode;
  detail?: ReactNode;
  badge?: ReactNode;
  children?: TreeItem[];
  /** Whether it starts open. */
  open?: boolean;
}

function Branch({ item }: { item: TreeItem }) {
  const [open, setOpen] = useState(item.open ?? true);
  const kids = item.children?.length ? item.children : null;
  return (
    <li>
      <div className="at-tree-item">
        {kids ? (
          <button type="button" className="at-tree-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? '▾' : '▸'}
          </button>
        ) : (
          <span className="at-tree-toggle">·</span>
        )}
        <span>{item.label}</span>
        {item.badge}
        {item.detail != null && <span className="at-tree-detail">{item.detail}</span>}
      </div>
      {kids && open && (
        <ul>
          {kids.map((k, i) => (
            <Branch key={i} item={k} />
          ))}
        </ul>
      )}
    </li>
  );
}

/** Things inside things, each part folding away. */
export function Tree({ items }: { items: TreeItem[] }) {
  return (
    <ul className="at-tree">
      {items.map((it, i) => (
        <Branch key={i} item={it} />
      ))}
    </ul>
  );
}

/** The lines of `after` that differ from `before`, as a unified diff's lines. */
function lineDiff(before: string, after: string): string[] {
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

/** Changes to text: a unified diff, or what changed between `before` and `after`. */
export function DiffView({ diff, before, after, title }: { diff?: string; before?: string; after?: string; title?: ReactNode }) {
  const lines = diff != null ? diff.replace(/\n$/, '').split('\n') : lineDiff(before ?? '', after ?? '');
  return (
    <pre className="at-diff">
      {title != null && <span className="at-diff-line at-diff-file">{title}</span>}
      {lines.map((l, i) => {
        const kind = /^(\+\+\+|---|diff )/.test(l) ? 'at-diff-file' : l.startsWith('@@') ? 'at-diff-hunk' : l.startsWith('+') ? 'at-diff-add' : l.startsWith('-') ? 'at-diff-del' : '';
        return (
          <span key={i} className={cx('at-diff-line', kind)}>
            {l || ' '}
          </span>
        );
      })}
    </pre>
  );
}

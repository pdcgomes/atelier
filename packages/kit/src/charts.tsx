// Charts, drawn as SVG at the width they're shown at, in the theme's chart
// colours. Every chart takes a `title`, which is required: it's what the
// chart is about, for anyone reading it and anyone who can't see it.

import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import type { Tone } from './bridge.ts';
import { cx, formatNumber, tone as toneClass } from './util.ts';

const CHAR = 6.6;

function colour(i: number, t?: Tone): string {
  if (t) return t === 'muted' ? 'var(--text-3)' : t === 'default' ? 'var(--text-2)' : `var(--${t})`;
  return `var(--chart-${(i % 8) + 1})`;
}

function useWidth(fallback = 600): [RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(fallback);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth || fallback);
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(120, Math.round(entry.contentRect.width))));
    observer.observe(el);
    return () => observer.disconnect();
  }, [fallback]);
  return [ref, width];
}

/** Round numbers between `min` and `max`, about `count` of them. */
export function ticks(min: number, max: number, count = 5): number[] {
  if (min === max) return [min];
  const raw = (max - min) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const out: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-9; v += step) out.push(+v.toFixed(10));
  return out;
}

function extent(values: number[], includeZero = true): [number, number] {
  const finite = values.filter(Number.isFinite);
  let lo = Math.min(...finite, ...(includeZero ? [0] : []));
  let hi = Math.max(...finite, ...(includeZero ? [0] : []));
  if (!finite.length) [lo, hi] = [0, 1];
  if (lo === hi) hi = lo + 1;
  const t = ticks(lo, hi);
  return [Math.min(lo, t[0]), Math.max(hi, t[t.length - 1])];
}

interface Common {
  /** What the chart shows. Required: it heads the chart and labels it for anyone who can't see it. */
  title: string;
  /** What it's measured against, its units, where the numbers come from. */
  caption?: ReactNode;
  height?: number;
}

interface Series {
  name: string;
  values: number[];
  tone?: Tone;
}

function Frame({ title, caption, legend, children, width }: { title: string; caption?: ReactNode; legend?: { name: string; colour: string; value?: string }[]; children: ReactNode; width?: RefObject<HTMLDivElement | null> }) {
  return (
    <figure className="at-chart" style={{ margin: 0 }} aria-label={title}>
      <div className="at-chart-head">
        <span className="at-chart-title">{title}</span>
        {legend && legend.length > 0 && (
          <span className="at-legend">
            {legend.map((l) => (
              <span key={l.name}>
                <i style={{ ['--c' as string]: l.colour }} />
                {l.name}
                {l.value && <span className="at-text-3">{l.value}</span>}
              </span>
            ))}
          </span>
        )}
      </div>
      <div ref={width}>{children}</div>
      {caption != null && <figcaption className="at-chart-caption">{caption}</figcaption>}
    </figure>
  );
}

function unitOf(v: number, unit?: string) {
  return `${formatNumber(v)}${unit ?? ''}`;
}

export interface BarChartProps extends Common {
  categories: string[];
  series: Series[];
  stacked?: boolean;
  horizontal?: boolean;
  /** After each value, such as "%" or " ms". */
  unit?: string;
}

/** Bars, by category: grouped, stacked, or across. */
export function BarChart({ title, caption, categories, series, stacked, horizontal, unit, height }: BarChartProps) {
  const [ref, width] = useWidth();
  const totals = categories.map((_, c) => (stacked ? series.reduce((n, s) => n + Math.max(0, s.values[c] ?? 0), 0) : Math.max(...series.map((s) => s.values[c] ?? 0))));
  const negatives = stacked ? [] : series.flatMap((s) => s.values.filter((v) => v < 0));
  const [lo, hi] = extent([...totals, ...negatives]);
  // Counts get whole-number ticks.
  const whole = series.every((s) => s.values.every(Number.isInteger));
  const marks = (a: number, b: number) => {
    const all = ticks(a, b);
    const kept = whole ? all.filter(Number.isInteger) : all;
    return kept.length >= 2 ? kept : all;
  };
  const legend = series.length > 1 ? series.map((s, i) => ({ name: s.name, colour: colour(i, s.tone) })) : undefined;
  const label = Math.min(150, Math.max(...categories.map((c) => c.length)) * CHAR + 10);

  if (horizontal) {
    const row = stacked || series.length === 1 ? 22 : 12 * series.length + 8;
    const h = height ?? categories.length * (row + 8) + 28;
    const left = label;
    const right = 50;
    const x = (v: number) => left + ((v - lo) / (hi - lo)) * (width - left - right);
    return (
      <Frame title={title} caption={caption} legend={legend} width={ref}>
        <svg width={width} height={h} role="img" aria-label={title}>
          {marks(lo, hi).map((t) => (
            <g key={t}>
              <line className="at-gridline" x1={x(t)} x2={x(t)} y1={0} y2={h - 20} />
              <text x={x(t)} y={h - 6} textAnchor="middle">
                {unitOf(t, unit)}
              </text>
            </g>
          ))}
          {categories.map((c, ci) => {
            const y0 = ci * (row + 8) + 4;
            let acc = 0;
            return (
              <g key={c}>
                <text x={left - 8} y={y0 + row / 2 + 4} textAnchor="end" style={{ fill: 'var(--text-2)' }}>
                  {c}
                </text>
                {series.map((s, si) => {
                  const v = s.values[ci] ?? 0;
                  const [a, b] = stacked ? [acc, (acc += Math.max(0, v))] : [Math.min(0, v), Math.max(0, v)];
                  const bh = stacked || series.length === 1 ? row : 10;
                  const by = stacked || series.length === 1 ? y0 : y0 + si * 12 + 4;
                  return (
                    <rect key={s.name} className="at-hover" x={x(a)} y={by} width={Math.max(0, x(b) - x(a))} height={bh} rx={2} fill={colour(si, s.tone)}>
                      <title>{`${c}, ${s.name}: ${unitOf(v, unit)}`}</title>
                    </rect>
                  );
                })}
                {(stacked || series.length === 1) && (
                  <text className="at-value-label" x={x(stacked ? acc : Math.max(0, series[0].values[ci] ?? 0)) + 6} y={y0 + row / 2 + 4}>
                    {unitOf(stacked ? acc : (series[0].values[ci] ?? 0), unit)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </Frame>
    );
  }

  const h = height ?? 220;
  const left = Math.max(...marks(lo, hi).map((t) => unitOf(t, unit).length)) * CHAR + 10;
  const bottom = 34;
  const plot = width - left - 4;
  const band = plot / Math.max(1, categories.length);
  const y = (v: number) => 6 + (1 - (v - lo) / (hi - lo)) * (h - bottom - 6);
  const thin = Math.ceil((Math.max(...categories.map((c) => c.length)) * CHAR + 8) / band);
  return (
    <Frame title={title} caption={caption} legend={legend} width={ref}>
      <svg width={width} height={h} role="img" aria-label={title}>
        {marks(lo, hi).map((t) => (
          <g key={t}>
            <line className="at-gridline" x1={left} x2={width} y1={y(t)} y2={y(t)} />
            <text x={left - 6} y={y(t) + 3.5} textAnchor="end">
              {unitOf(t, unit)}
            </text>
          </g>
        ))}
        <line className="at-axis" x1={left} x2={width} y1={y(Math.max(lo, 0))} y2={y(Math.max(lo, 0))} />
        {categories.map((c, ci) => {
          const x0 = left + ci * band;
          const inner = band * 0.72;
          const each = stacked ? inner : inner / series.length;
          let acc = 0;
          return (
            <g key={c}>
              {series.map((s, si) => {
                const v = s.values[ci] ?? 0;
                const [a, b] = stacked ? [acc, (acc += Math.max(0, v))] : [Math.min(0, v), Math.max(0, v)];
                const bx = x0 + (band - inner) / 2 + (stacked ? 0 : si * each);
                return (
                  <rect key={s.name} className="at-hover" x={bx} y={y(b)} width={Math.max(1, each - (stacked ? 0 : 2))} height={Math.max(0, y(a) - y(b))} rx={2} fill={colour(si, s.tone)}>
                    <title>{`${c}, ${s.name}: ${unitOf(v, unit)}`}</title>
                  </rect>
                );
              })}
              {ci % thin === 0 && (
                <text x={x0 + band / 2} y={h - bottom + 16} textAnchor="middle" style={{ fill: 'var(--text-2)' }}>
                  {c.length * CHAR > band * thin ? `${c.slice(0, Math.max(3, Math.floor((band * thin) / CHAR) - 1))}…` : c}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </Frame>
  );
}

export interface LineChartProps extends Common {
  /** The labels along the bottom, one for each value. */
  x: (string | number)[];
  series: Series[];
  /** Fills under each line. */
  area?: boolean;
  unit?: string;
  yMin?: number;
  yMax?: number;
}

/** Lines over time, or any other order: one per series, optionally filled. */
export function LineChart({ title, caption, x, series, area, unit, yMin, yMax, height }: LineChartProps) {
  const [ref, width] = useWidth();
  const all = series.flatMap((s) => s.values);
  const [lo0, hi0] = extent(all, Boolean(area));
  const [lo, hi] = [yMin ?? lo0, yMax ?? hi0];
  const h = height ?? 220;
  const left = Math.max(...ticks(lo, hi).map((t) => unitOf(t, unit).length)) * CHAR + 10;
  const bottom = 30;
  const n = Math.max(2, x.length);
  const px = (i: number) => left + 4 + (i / (n - 1)) * (width - left - 12);
  const py = (v: number) => 6 + (1 - (v - lo) / (hi - lo)) * (h - bottom - 6);
  const every = Math.ceil(x.length / Math.max(1, Math.floor((width - left) / (Math.max(...x.map((l) => String(l).length)) * CHAR + 14))));
  const legend = series.length > 1 ? series.map((s, i) => ({ name: s.name, colour: colour(i, s.tone) })) : undefined;
  return (
    <Frame title={title} caption={caption} legend={legend} width={ref}>
      <svg width={width} height={h} role="img" aria-label={title}>
        {ticks(lo, hi).map((t) => (
          <g key={t}>
            <line className="at-gridline" x1={left} x2={width} y1={py(t)} y2={py(t)} />
            <text x={left - 6} y={py(t) + 3.5} textAnchor="end">
              {unitOf(t, unit)}
            </text>
          </g>
        ))}
        {x.map((label, i) =>
          i % every === 0 ? (
            <text key={i} x={px(i)} y={h - 10} textAnchor="middle">
              {label}
            </text>
          ) : null,
        )}
        {series.map((s, si) => {
          const points = s.values.map((v, i) => [px(i), py(v)] as const).filter(([, y]) => Number.isFinite(y));
          if (!points.length) return null;
          const line = points.map(([a, b], i) => `${i ? 'L' : 'M'}${a.toFixed(1)},${b.toFixed(1)}`).join('');
          const c = colour(si, s.tone);
          return (
            <g key={s.name}>
              {area && <path d={`${line}L${points[points.length - 1][0]},${py(Math.max(lo, 0))}L${points[0][0]},${py(Math.max(lo, 0))}Z`} fill={c} opacity={0.14} />}
              <path d={line} fill="none" stroke={c} strokeWidth={1.8} strokeLinejoin="round" />
              {points.length <= 40 &&
                points.map(([a, b], i) => (
                  <circle key={i} cx={a} cy={b} r={2.6} fill="var(--panel)" stroke={c} strokeWidth={1.5}>
                    <title>{`${x[i]}, ${s.name}: ${unitOf(s.values[i], unit)}`}</title>
                  </circle>
                ))}
            </g>
          );
        })}
      </svg>
    </Frame>
  );
}

const BLOCKS = '▁▂▃▄▅▆▇█';

/** A small line with no axes, for a trend beside a number. `blocks` draws it in block characters. */
export function Sparkline({ title, values, tone: t = 'accent', blocks, width = 96, height = 24 }: { title: string; values: number[]; tone?: Tone; blocks?: boolean; width?: number; height?: number }) {
  const [lo, hi] = [Math.min(...values), Math.max(...values)];
  if (blocks) {
    return (
      <span className={cx('at-spark-blocks', toneClass(t))} role="img" aria-label={`${title}: ${values.join(', ')}`} title={title}>
        {values.map((v) => BLOCKS[hi === lo ? 3 : Math.round(((v - lo) / (hi - lo)) * 7)]).join('')}
      </span>
    );
  }
  const px = (i: number) => (i / Math.max(1, values.length - 1)) * (width - 4) + 2;
  const py = (v: number) => (hi === lo ? height / 2 : 2 + (1 - (v - lo) / (hi - lo)) * (height - 4));
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${px(i).toFixed(1)},${py(v).toFixed(1)}`).join('');
  const c = colour(0, t);
  return (
    <svg className="at-spark" width={width} height={height} role="img" aria-label={`${title}: ${values.join(', ')}`}>
      <title>{title}</title>
      <path d={d} fill="none" stroke={c} strokeWidth={1.5} strokeLinejoin="round" />
      {values.length > 0 && <circle cx={px(values.length - 1)} cy={py(values[values.length - 1])} r={2} fill={c} />}
    </svg>
  );
}

/** Parts of a whole, as a ring. `center` goes in the middle. */
export function DonutChart({ title, caption, segments, center, unit, height = 180 }: Common & { segments: { label: string; value: number; tone?: Tone }[]; center?: ReactNode; unit?: string }) {
  const total = segments.reduce((n, s) => n + Math.max(0, s.value), 0) || 1;
  const r = height / 2 - 4;
  const inner = r * 0.62;
  let angle = -Math.PI / 2;
  const arc = (a0: number, a1: number) => {
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const p = (a: number, rad: number) => `${(r + 4 + Math.cos(a) * rad).toFixed(2)},${(r + 4 + Math.sin(a) * rad).toFixed(2)}`;
    return `M${p(a0, r)}A${r},${r} 0 ${large} 1 ${p(a1, r)}L${p(a1, inner)}A${inner},${inner} 0 ${large} 0 ${p(a0, inner)}Z`;
  };
  return (
    <Frame title={title} caption={caption}>
      <div className="at-row" style={{ gap: 18, alignItems: 'center' }}>
        <div style={{ position: 'relative', width: height, height }}>
          <svg width={height} height={height} role="img" aria-label={title}>
            {segments.map((s, i) => {
              const sweep = (Math.max(0, s.value) / total) * Math.PI * 2;
              const a0 = angle;
              angle += sweep;
              return sweep > 0 ? (
                <path key={s.label} className="at-hover" d={sweep >= Math.PI * 2 - 1e-6 ? arc(a0, a0 + Math.PI * 2 - 1e-4) : arc(a0, angle)} fill={colour(i, s.tone)}>
                  <title>{`${s.label}: ${unitOf(s.value, unit)} (${Math.round((s.value / total) * 100)}%)`}</title>
                </path>
              ) : null;
            })}
          </svg>
          {center != null && <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center', fontWeight: 700 }}>{center}</div>}
        </div>
        <div className="at-legend" style={{ flexDirection: 'column', gap: 4 }}>
          {segments.map((s, i) => (
            <span key={s.label}>
              <i style={{ ['--c' as string]: colour(i, s.tone) }} />
              {s.label}
              <span className="at-text-3">
                {unitOf(s.value, unit)} · {Math.round((s.value / total) * 100)}%
              </span>
            </span>
          ))}
        </div>
      </div>
    </Frame>
  );
}

/** How values are spread: how many fall in each range. */
export function Histogram({ title, caption, values, bins, unit, height, tone: t }: Common & { values: number[]; bins?: number; unit?: string; tone?: Tone }) {
  const finite = values.filter(Number.isFinite);
  const count = bins ?? Math.max(4, Math.min(30, Math.ceil(Math.log2(finite.length || 1) + 1)));
  const [lo, hi] = [Math.min(...finite), Math.max(...finite)];
  const step = (hi - lo || 1) / count;
  const counts = Array.from({ length: count }, () => 0);
  for (const v of finite) counts[Math.min(count - 1, Math.floor((v - lo) / step))]++;
  const categories = counts.map((_, i) => `${formatNumber(lo + i * step)}${unit ?? ''}`);
  return <BarChart title={title} caption={caption ?? `${finite.length} values in ${count} ranges of ${formatNumber(step)}${unit ?? ''}`} categories={categories} series={[{ name: 'Count', values: counts, tone: t }]} height={height} />;
}

export interface ScatterSeries {
  name: string;
  points: { x: number; y: number; label?: string }[];
  tone?: Tone;
}

/** Points by two measures, to show how they relate. */
export function ScatterChart({ title, caption, series, xLabel, yLabel, height = 240 }: Common & { series: ScatterSeries[]; xLabel?: string; yLabel?: string }) {
  const [ref, width] = useWidth();
  const pts = series.flatMap((s) => s.points);
  const [xlo, xhi] = extent(pts.map((p) => p.x), false);
  const [ylo, yhi] = extent(pts.map((p) => p.y), false);
  const left = Math.max(...ticks(ylo, yhi).map((t) => formatNumber(t).length)) * CHAR + 14;
  const bottom = 36;
  const px = (v: number) => left + ((v - xlo) / (xhi - xlo)) * (width - left - 10);
  const py = (v: number) => 8 + (1 - (v - ylo) / (yhi - ylo)) * (height - bottom - 8);
  return (
    <Frame title={title} caption={caption} legend={series.length > 1 ? series.map((s, i) => ({ name: s.name, colour: colour(i, s.tone) })) : undefined} width={ref}>
      <svg width={width} height={height} role="img" aria-label={title}>
        {ticks(ylo, yhi).map((t) => (
          <g key={`y${t}`}>
            <line className="at-gridline" x1={left} x2={width} y1={py(t)} y2={py(t)} />
            <text x={left - 6} y={py(t) + 3.5} textAnchor="end">{formatNumber(t)}</text>
          </g>
        ))}
        {ticks(xlo, xhi).map((t) => (
          <text key={`x${t}`} x={px(t)} y={height - bottom + 16} textAnchor="middle">{formatNumber(t)}</text>
        ))}
        {xLabel && <text x={(left + width) / 2} y={height - 4} textAnchor="middle" style={{ fill: 'var(--text-2)' }}>{xLabel}</text>}
        {yLabel && <text transform={`translate(10 ${(height - bottom) / 2}) rotate(-90)`} textAnchor="middle" style={{ fill: 'var(--text-2)' }}>{yLabel}</text>}
        {series.map((s, si) =>
          s.points.map((p, i) => (
            <circle key={`${si}-${i}`} className="at-hover" cx={px(p.x)} cy={py(p.y)} r={4} fill={colour(si, s.tone)} fillOpacity={0.75}>
              <title>{`${p.label ? `${p.label}: ` : ''}${formatNumber(p.x)}, ${formatNumber(p.y)}`}</title>
            </circle>
          )),
        )}
      </svg>
    </Frame>
  );
}

/** A grid of values, each cell as strong as its value. */
export function Heatmap({ title, caption, rows, columns, values, unit, tone: t = 'accent' }: Common & { rows: string[]; columns: string[]; values: number[][]; unit?: string; tone?: Tone }) {
  const [ref, width] = useWidth();
  const flat = values.flat().filter(Number.isFinite);
  const [lo, hi] = [Math.min(...flat), Math.max(...flat)];
  const left = Math.min(160, Math.max(...rows.map((r) => r.length)) * CHAR + 10);
  const cell = Math.max(10, Math.min(36, (width - left) / Math.max(1, columns.length)));
  const top = 18;
  const c = colour(0, t);
  return (
    <Frame title={title} caption={caption} width={ref}>
      <div style={{ overflowX: 'auto' }}>
        <svg width={left + cell * columns.length} height={top + cell * rows.length} role="img" aria-label={title}>
          {columns.map((col, i) =>
            cell >= 18 || i % Math.ceil(18 / cell) === 0 ? (
              <text key={col} x={left + i * cell + cell / 2} y={12} textAnchor="middle">{col}</text>
            ) : null,
          )}
          {rows.map((row, r) => (
            <g key={row}>
              <text x={left - 8} y={top + r * cell + cell / 2 + 4} textAnchor="end" style={{ fill: 'var(--text-2)' }}>{row}</text>
              {columns.map((col, i) => {
                const v = values[r]?.[i];
                const strength = Number.isFinite(v) ? (hi === lo ? 1 : (v - lo) / (hi - lo)) : 0;
                return (
                  <rect key={col} x={left + i * cell + 1} y={top + r * cell + 1} width={cell - 2} height={cell - 2} rx={2} fill={Number.isFinite(v) ? c : 'var(--surface)'} fillOpacity={Number.isFinite(v) ? 0.12 + strength * 0.88 : 1}>
                    <title>{`${row}, ${col}: ${Number.isFinite(v) ? unitOf(v, unit) : 'no value'}`}</title>
                  </rect>
                );
              })}
            </g>
          ))}
        </svg>
      </div>
    </Frame>
  );
}

export interface GanttTask {
  label: string;
  /** `YYYY-MM-DD`, or an ISO time. */
  start: string;
  end: string;
  tone?: Tone;
  /** How much of it is done, from 0 to 1. */
  progress?: number;
}

const DAY = 86_400_000;

/** Work over time, as bars from start to end, with today marked. */
export function Gantt({ title, caption, tasks, today }: Common & { tasks: GanttTask[]; today?: string }) {
  const [ref, width] = useWidth();
  const spans = tasks.map((t) => [Date.parse(t.start), Date.parse(t.end)] as const);
  const lo = Math.min(...spans.map(([a]) => a));
  const hi = Math.max(...spans.map(([, b]) => b)) + DAY;
  const left = Math.min(200, Math.max(...tasks.map((t) => t.label.length)) * CHAR + 14);
  const x = (t: number) => left + ((t - lo) / (hi - lo || 1)) * (width - left - 8);
  const row = 24;
  const top = 22;
  const h = top + tasks.length * row + 6;
  const days = (hi - lo) / DAY;
  // As many dates along the top as fit, each about 56 pixels wide.
  const room = Math.max(2, Math.floor((width - left) / 56));
  const step = [1, 2, 7, 14, 30, 61, 91, 182, 365].find((s) => days / s <= room) ?? 365;
  const marks: number[] = [];
  for (let t = lo; t <= hi; t += step * DAY) marks.push(t);
  const now = today ? Date.parse(today) : Date.now();
  return (
    <Frame title={title} caption={caption} width={ref}>
      <svg width={width} height={h} role="img" aria-label={title}>
        {marks.map((t) => (
          <g key={t}>
            <line className="at-gridline" x1={x(t)} x2={x(t)} y1={top - 4} y2={h} />
            <text x={x(t) + 2} y={12}>{new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</text>
          </g>
        ))}
        {now >= lo && now <= hi && <line x1={x(now)} x2={x(now)} y1={top - 6} y2={h} stroke="var(--danger)" strokeWidth={1.5} />}
        {tasks.map((t, i) => {
          const [a, b] = spans[i];
          const y = top + i * row;
          const c = colour(i, t.tone ?? 'accent');
          const w = Math.max(3, x(b + DAY) - x(a));
          return (
            <g key={`${t.label}-${i}`}>
              <text x={left - 8} y={y + 15} textAnchor="end" style={{ fill: 'var(--text-2)' }}>{t.label}</text>
              <rect x={x(a)} y={y + 4} width={w} height={row - 9} rx={3} fill={c} fillOpacity={t.progress != null ? 0.3 : 0.9}>
                <title>{`${t.label}: ${t.start} to ${t.end}${t.progress != null ? `, ${Math.round(t.progress * 100)}% done` : ''}`}</title>
              </rect>
              {t.progress != null && <rect x={x(a)} y={y + 4} width={w * Math.min(1, Math.max(0, t.progress))} height={row - 9} rx={3} fill={c} />}
            </g>
          );
        })}
      </svg>
    </Frame>
  );
}

export interface FlowNode {
  id: string;
  label: string;
  tone?: Tone;
}

export interface FlowEdge {
  from: string;
  to: string;
  label?: string;
}

/** Ranks, by the longest way in, and which edges go back: the loops. */
export function layout(nodes: FlowNode[], edges: FlowEdge[]) {
  const ids = nodes.map((n) => n.id);
  const out = new Map(ids.map((id) => [id, edges.filter((e) => e.from === id)]));
  const back = new Set<FlowEdge>();
  const state = new Map<string, 'open' | 'done'>();
  const visit = (id: string) => {
    state.set(id, 'open');
    for (const e of out.get(id) ?? []) {
      if (state.get(e.to) === 'open') back.add(e);
      else if (!state.has(e.to) && ids.includes(e.to)) visit(e.to);
    }
    state.set(id, 'done');
  };
  for (const id of ids) if (!state.has(id)) visit(id);
  const rank = new Map(ids.map((id) => [id, 0]));
  for (let pass = 0; pass < ids.length; pass++) {
    let moved = false;
    for (const e of edges) {
      if (back.has(e) || !rank.has(e.from) || !rank.has(e.to)) continue;
      if (rank.get(e.to)! < rank.get(e.from)! + 1) {
        rank.set(e.to, rank.get(e.from)! + 1);
        moved = true;
      }
    }
    if (!moved) break;
  }
  return { rank, back };
}

/** Steps and the ways between them, with loops drawn as dashed edges going back. `current` marks where things are now. */
export function FlowDiagram({ title, caption, nodes, edges, current }: Common & { nodes: FlowNode[]; edges: FlowEdge[]; current?: string }) {
  const [ref, avail] = useWidth();
  const { rank, back } = layout(nodes, edges);
  const ranks = Math.max(0, ...rank.values()) + 1;
  const columns: FlowNode[][] = Array.from({ length: ranks }, () => []);
  for (const n of nodes) columns[rank.get(n.id) ?? 0].push(n);
  // Boxes as wide as their labels, narrowed to fit the width there is, with
  // labels on two lines when they have to be. Past that, the diagram scrolls.
  const gapX = ranks > 1 ? Math.max(22, Math.min(46, (avail - 8 - ranks * 110) / (ranks - 1))) : 0;
  const natural = Math.min(190, Math.max(84, Math.max(...nodes.map((n) => n.label.length)) * 7 + 20));
  const boxW = Math.max(68, Math.min(natural, (avail - 8 - gapX * (ranks - 1)) / ranks));
  const perLine = Math.max(4, Math.floor((boxW - 12) / 7));
  const wrap = (label: string): string[] => {
    if (label.length <= perLine) return [label];
    const words = label.split(' ');
    let first = '';
    while (words.length && `${first} ${words[0]}`.trim().length <= perLine) first = `${first} ${words.shift()}`.trim();
    const rest = words.join(' ');
    if (!first) return [`${label.slice(0, perLine - 1)}…`];
    return [first, rest.length > perLine ? `${rest.slice(0, perLine - 1)}…` : rest].filter(Boolean);
  };
  const lines = new Map(nodes.map((n) => [n.id, wrap(n.label)]));
  const boxH = [...lines.values()].some((l) => l.length > 1) ? 42 : 30;
  const gapY = 18;
  const tallest = Math.max(...columns.map((c) => c.length));
  const loops = [...back].length;
  const height = tallest * (boxH + gapY) + (loops ? 30 + loops * 14 : 0) + 10;
  const width = ranks * (boxW + gapX);
  const pos = new Map<string, { x: number; y: number }>();
  columns.forEach((col, r) =>
    col.forEach((n, i) => pos.set(n.id, { x: 4 + r * (boxW + gapX), y: 6 + ((tallest - col.length) / 2 + i) * (boxH + gapY) })),
  );
  const base = tallest * (boxH + gapY);
  const id = title.replace(/\W+/g, '-');
  let loop = 0;
  return (
    <Frame title={title} caption={caption} width={ref}>
      <div style={{ overflowX: 'auto' }}>
        <svg width={width} height={height} role="img" aria-label={title}>
          <defs>
            <marker id={`${id}-arrow`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0L10,5L0,10z" fill="var(--text-3)" />
            </marker>
            <marker id={`${id}-back`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0L10,5L0,10z" fill="var(--warning)" />
            </marker>
          </defs>
          {edges.map((e, i) => {
            const [a, b] = [pos.get(e.from), pos.get(e.to)];
            if (!a || !b) return null;
            if (back.has(e)) {
              const depth = base + 10 + loop++ * 14;
              const [x1, x2] = [a.x + boxW / 2, b.x + boxW / 2];
              return (
                <g key={i}>
                  <path className="at-flow-edge at-back" d={`M${x1},${a.y + boxH}L${x1},${depth}L${x2},${depth}L${x2},${b.y + boxH + 2}`} markerEnd={`url(#${id}-back)`} />
                  {e.label && <text className="at-flow-label" x={(x1 + x2) / 2} y={depth - 4} textAnchor="middle">{e.label}</text>}
                </g>
              );
            }
            const [x1, y1, x2, y2] = [a.x + boxW, a.y + boxH / 2, b.x - 2, b.y + boxH / 2];
            const mid = (x1 + x2) / 2;
            return (
              <g key={i}>
                <path className="at-flow-edge" d={`M${x1},${y1}C${mid},${y1} ${mid},${y2} ${x2},${y2}`} markerEnd={`url(#${id}-arrow)`} />
                {e.label && <text className="at-flow-label" x={mid} y={(y1 + y2) / 2 - 5} textAnchor="middle">{e.label}</text>}
              </g>
            );
          })}
          {nodes.map((n) => {
            const p = pos.get(n.id)!;
            return (
              <g key={n.id} className={cx('at-flow-node', n.id === current && 'at-current')}>
                <rect x={p.x} y={p.y} width={boxW} height={boxH} rx={6} style={n.tone ? { stroke: colour(0, n.tone) } : undefined}>
                  <title>{n.label}</title>
                </rect>
                <text x={p.x + boxW / 2} y={p.y + boxH / 2 + 4 - ((lines.get(n.id)!.length - 1) * 13) / 2} textAnchor="middle">
                  {lines.get(n.id)!.map((line, i) => (
                    <tspan key={i} x={p.x + boxW / 2} dy={i ? 13 : 0}>
                      {line}
                    </tspan>
                  ))}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </Frame>
  );
}
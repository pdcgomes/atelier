// The kit's terminal side: every component the browser's kit has, with the
// same props, each rendering an element atelier-tui draws (tui/src/kit). What
// the components do comes from ../logic.ts, which the browser's kit uses too.
//
// An element carries its props as JSON, the React nodes in its props as named
// slots, and its handlers, which atelier-tui calls by name.

import { createContext, createElement, useContext, useState, type CSSProperties, type ReactNode } from 'react';
import type { Tone } from '../bridge.ts';
import { useAction, useNow } from '../hooks.ts';
import { blocks, diffLines, FormContext, histogram, ratioOf, STATUS_ORDER, useApproval, useCalendar, useField, useFormRunner, useNeedsYou, useSection, useStatuses, useTableView, useTabs, useTimeline, type WireframeStatus } from '../logic.ts';
import type { Note, SideListItem } from '../wireframe.tsx';
import { niceTicks, rankFlow } from '../chartmath.ts';
import { ago, formatNumber, toTime } from '../util.ts';
import type { PanelProps, Tab } from '../layout.tsx';
import type { TextProps } from '../text.tsx';
import type { ImageProps } from '../media.tsx';
import type { CalendarEvent, Lane, MeterProps, StatProps, TableProps, TimelineItem, TreeItem } from '../data.tsx';
import type { BarChartProps, FlowEdge, FlowNode, GanttTask, LineChartProps, ScatterSeries } from '../charts.tsx';
import type { ButtonProps, FieldProps, FormProps, NeedsYouProps, Option } from '../forms.tsx';

interface Box {
  children?: ReactNode;
  style?: CSSProperties;
  className?: string;
}

/** An element atelier-tui draws, with its children first and its slots after, so neither moves the other. */
export function el(name: string, p: Record<string, unknown>, slots?: Record<string, ReactNode> | null, children?: ReactNode) {
  const named = Object.entries(slots ?? {})
    .filter(([, v]) => v != null && v !== false && v !== '')
    .map(([n, v]) => createElement('at-slot', { key: n, p: { n } }, v));
  return createElement(`at-${name}`, { p }, children ?? null, named);
}

// ---- Layout

export function Stack({ gap = 12, align, children, style, className }: Box & { gap?: number; align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline' }) {
  return el('Stack', { gap, align, style, className }, null, children);
}

export function Row({ gap = 10, align = 'center', justify, wrap = true, children, style, className }: Box & { gap?: number; align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline'; justify?: 'start' | 'center' | 'end' | 'between'; wrap?: boolean }) {
  return el('Row', { gap, align, justify, wrap, style, className }, null, children);
}

export function Grid({ columns, min = 260, gap = 12, children, style, className }: Box & { columns?: number | string; min?: number; gap?: number }) {
  return el('Grid', { columns, min, gap, style, className }, null, children);
}

export function Split({ ratio = [2, 1], gap = 12, children, style, className }: Box & { ratio?: [number, number]; gap?: number }) {
  return el('Split', { ratio, gap, style, className }, null, children);
}

export function Divider({ label }: { label?: ReactNode }) {
  return el('Divider', {}, { label });
}

export function Panel({ title, info, keys, tone, focus, padding, children, style, className }: PanelProps) {
  return el('Panel', { keys, tone, focus, padding, style, className }, { title, info }, children);
}

export function Tabs({ tabs, stateKey = 'tab', initial }: { tabs: Tab[]; stateKey?: string; initial?: string }) {
  const { visible, current, select, move } = useTabs(tabs, stateKey, initial);
  const slots: Record<string, ReactNode> = {};
  for (const t of visible) {
    slots[`label:${t.id}`] = t.label;
    slots[`badge:${t.id}`] = t.badge;
  }
  return el('Tabs', { tabs: visible.map((t) => t.id), active: current?.id ?? null, select, move }, slots, current?.content);
}

export function Section({ title, count, info, open = true, stateKey, children }: { title: ReactNode; count?: ReactNode; info?: ReactNode; open?: boolean; stateKey?: string; children?: ReactNode }) {
  const [isOpen, setOpen] = useSection(stateKey, open);
  return el('Section', { open: isOpen, toggle: () => setOpen(!isOpen) }, { title, count, info }, children);
}

// ---- Text

export function Heading({ level = 2, info, children }: { level?: 1 | 2 | 3; info?: ReactNode; children: ReactNode }) {
  return el('Heading', { level }, { info }, children);
}

export function Text({ children, tone, size = 'md', weight = 'normal', italic, truncate, tabular, as = 'p' }: TextProps) {
  return el('Text', { tone, size, weight, italic, truncate, tabular, as }, null, children);
}

export function Code({ children, block, lang, copy = true, wrap }: { children: string; block?: boolean; lang?: string; copy?: boolean; wrap?: boolean }) {
  return el('Code', { text: String(children ?? ''), block, lang, copy, wrap });
}

export function Kbd({ children }: { children: ReactNode }) {
  return el('Kbd', {}, null, children);
}

export function Link({ href, path, line, children }: { href?: string; path?: string; line?: number; children?: ReactNode }) {
  const actions = useAction();
  const label = children ?? path?.split('/').pop() ?? href;
  const open = () => (path ? actions.openFile({ path, line }) : href ? actions.openUrl({ url: href }) : undefined);
  return el('Link', { href, path, line, open }, null, label);
}

export function Time({ at, relative = true }: { at: string | number | Date; relative?: boolean }) {
  const now = useNow();
  const t = toTime(at);
  if (!Number.isFinite(t)) return el('Time', { text: String(at) });
  const full = new Date(t).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  return el('Time', { at: t, text: relative ? ago(t, now) : full, full });
}

// ---- Images and video

/** A file the terminal shows: atelier-tui fetches it from the daemon itself. */
export function useFile(path: string | undefined): { url?: string; error?: string } {
  return path ? { url: `atelier-file:${path}` } : {};
}

export function Image({ path, alt, caption, height, fit = 'contain' }: ImageProps) {
  return el('Image', { path, alt, height, fit }, { caption });
}

export function Gallery({ images, columns, height = 140 }: { images: { path: string; alt: string; caption?: string }[]; columns?: number; height?: number }) {
  return el('Gallery', { images, columns, height });
}

export function Video({ path, caption, height, autoPlay, loop, muted }: { path: string; caption?: ReactNode; height?: number; autoPlay?: boolean; loop?: boolean; muted?: boolean }) {
  return el('Video', { path, height, autoPlay, loop, muted }, { caption });
}

// ---- Data

export function Table<Row>({ columns, headers, rows, filter, rowTone, actions, empty, maxHeight, dense, stateKey }: TableProps<Row>) {
  const { cols, shown, sort, cycle, query, setQuery, cell } = useTableView({ columns, headers, rows, stateKey });
  if (!rows.length) return empty ? el('Text', { tone: 'muted' }, null, empty) : null;
  const slots: Record<string, ReactNode> = {};
  cols.forEach((c, n) => (slots[`h:${n}`] = c.label));
  const list = shown.map(({ row, i }) => {
    cols.forEach((c, n) => (slots[`c:${i}:${n}`] = cell(row, c, i)));
    const acts = (actions ?? []).map((a, k) => ({ a, k })).filter(({ a }) => !a.hidden?.(row));
    return { i, tone: rowTone?.(row, i) ?? null, actions: acts.map(({ a, k }) => ({ label: a.label, tone: a.tone ?? null, k })) };
  });
  return el(
    'Table',
    {
      columns: cols.map((c) => ({ key: c.key, align: c.align ?? 'left', width: c.width ?? null, sortable: c.sortable ?? true })),
      rows: list,
      total: rows.length,
      sort,
      query,
      filter: Boolean(filter),
      actions: Boolean(actions?.length),
      empty,
      maxHeight,
      dense,
      sortBy: (n: number) => cycle(n),
      search: (q: string) => setQuery(String(q)),
      act: (i: number, k: number) => {
        const a = actions?.[k];
        if (a && rows[i] !== undefined) a.onClick(rows[i], i);
      },
    },
    slots,
  );
}

export function Stat({ label, value, tone, delta, deltaTone, hint, trend }: StatProps) {
  return el('Stat', { tone, deltaTone, trend: trend && trend.length > 1 ? blocks(trend) : null }, { label, value: typeof value === 'number' ? formatNumber(value) : value, delta, hint });
}

export function Stats({ children, min = 140 }: { children: ReactNode; min?: number }) {
  return el('Stats', { min }, null, children);
}

export function Badge({ tone = 'default', variant = 'soft', dot, children }: { tone?: Tone; variant?: 'soft' | 'solid' | 'outline'; dot?: boolean; children?: ReactNode }) {
  return el('Badge', { tone, variant, dot }, null, children);
}

export function Meter({ value, max = 100, label, tone = 'accent', show = 'percent', blocks: asBlocks, segments, height }: MeterProps) {
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const text = show === 'percent' ? `${Math.round(ratio * 100)}%` : show === 'value' ? `${formatNumber(value)} / ${formatNumber(max)}` : null;
  return el('Meter', { value, max, tone, show, blocks: asBlocks, segments, height, ratio, text }, { label });
}

export function KeyValue({ items, columns = 1 }: { items: [ReactNode, ReactNode][] | Record<string, ReactNode>; columns?: 1 | 2 }) {
  const pairs = Array.isArray(items) ? items : Object.entries(items);
  const slots: Record<string, ReactNode> = {};
  pairs.forEach(([k, v], i) => {
    slots[`k:${i}`] = k;
    slots[`v:${i}`] = v;
  });
  return el('KeyValue', { n: pairs.length, columns }, slots);
}

export function Timeline({ items, limit }: { items: TimelineItem[]; limit?: number }) {
  const { now, all, shown, more, toggle } = useTimeline(items, limit);
  const slots: Record<string, ReactNode> = {};
  shown.forEach((it, i) => {
    slots[`title:${i}`] = it.title;
    slots[`who:${i}`] = it.who;
    slots[`body:${i}`] = it.body;
  });
  const list = shown.map((it) => ({ tone: it.tone ?? 'accent', ago: it.at != null && Number.isFinite(toTime(it.at)) ? ago(toTime(it.at), now) : null }));
  const button = more ? (
    <Button size="sm" variant="ghost" onClick={toggle}>
      {all ? 'Show fewer' : `Show all ${items.length}`}
    </Button>
  ) : null;
  return el('Timeline', { items: list }, slots, button);
}

export function Lanes({ lanes }: { lanes: Lane[] }) {
  const slots: Record<string, ReactNode> = {};
  const list = lanes.map((lane, l) => {
    slots[`title:${l}`] = lane.title;
    return {
      tone: lane.tone ?? 'accent',
      count: lane.items.length,
      items: lane.items.map((it, n) => {
        slots[`item:${l}:${n}`] = it.title;
        slots[`detail:${l}:${n}`] = it.detail;
        slots[`badge:${l}:${n}`] = it.badge;
        return { tone: it.tone ?? null };
      }),
    };
  });
  return el('Lanes', { lanes: list }, slots);
}

export function Calendar({ events, month, weekStart = 1 }: { events: CalendarEvent[]; month?: string; weekStart?: 0 | 1 }) {
  const { label, dows, days, go } = useCalendar({ events, month, weekStart });
  return el('Calendar', {
    label,
    dows,
    days: days.map((d) => ({ n: d.date.getDate(), key: d.key, out: d.out, today: d.today, events: d.events.map((e) => ({ title: e.title, tone: e.tone ?? 'accent' })) })),
    prev: () => go(-1),
    next: () => go(1),
  });
}

type Branch = { path: string; kids: boolean; open: boolean; children: Branch[] };

export function Tree({ items }: { items: TreeItem[] }) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const slots: Record<string, ReactNode> = {};
  const walk = (list: TreeItem[], prefix: string): Branch[] =>
    list.map((it, i) => {
      const path = prefix ? `${prefix}.${i}` : String(i);
      slots[`label:${path}`] = it.label;
      slots[`detail:${path}`] = it.detail;
      slots[`badge:${path}`] = it.badge;
      const kids = it.children?.length ? it.children : null;
      const isOpen = open[path] ?? it.open ?? true;
      return { path, kids: Boolean(kids), open: isOpen, children: kids && isOpen ? walk(kids, path) : [] };
    });
  const tree = walk(items, '');
  return el('Tree', { items: tree, toggle: (path: string, now: boolean) => setOpen((o) => ({ ...o, [String(path)]: Boolean(now) })) }, slots);
}

export function DiffView({ diff, before, after, title }: { diff?: string; before?: string; after?: string; title?: ReactNode }) {
  return el('DiffView', { lines: diffLines(diff, before, after) }, { title });
}

// ---- Charts

type Series = { name: string; values: number[]; tone?: Tone };
const series = (list: Series[]) => list.map((s) => ({ name: s.name, values: s.values, tone: s.tone ?? null }));

export function BarChart({ title, caption, categories, series: s, stacked, horizontal, unit, height }: BarChartProps) {
  return el('BarChart', { title, categories, series: series(s), stacked, horizontal, unit, height }, { caption });
}

export function LineChart({ title, caption, x, series: s, area, unit, yMin, yMax, height }: LineChartProps) {
  return el('LineChart', { title, x, series: series(s), area, unit, yMin, yMax, height }, { caption });
}

export function Sparkline({ title, values, tone = 'accent', blocks: asBlocks, width = 96, height = 24, min, max, shade }: { title: string; values: number[]; tone?: Tone; blocks?: boolean; width?: number | string; height?: number; min?: number; max?: number; shade?: [number, number] }) {
  return el('Sparkline', { title, values, tone, blocks: asBlocks, width, height, min, max, shade });
}

export function DonutChart({ title, caption, segments, center, unit, height = 180 }: { title: string; caption?: ReactNode; height?: number; segments: { label: string; value: number; tone?: Tone }[]; center?: ReactNode; unit?: string }) {
  return el('DonutChart', { title, segments, unit, height }, { caption, center });
}

export function Histogram({ title, caption, values, bins, unit, height, tone }: { title: string; caption?: ReactNode; height?: number; values: number[]; bins?: number; unit?: string; tone?: Tone }) {
  const h = histogram(values, bins, unit);
  return <BarChart title={title} caption={caption ?? h.caption} categories={h.categories} series={[{ name: 'Count', values: h.counts, tone }]} height={height} />;
}

export function ScatterChart({ title, caption, series: s, xLabel, yLabel, height = 240 }: { title: string; caption?: ReactNode; height?: number; series: ScatterSeries[]; xLabel?: string; yLabel?: string }) {
  return el('ScatterChart', { title, series: s, xLabel, yLabel, height }, { caption });
}

export function Heatmap({ title, caption, rows, columns, values, unit, tone = 'accent' }: { title: string; caption?: ReactNode; height?: number; rows: string[]; columns: string[]; values: number[][]; unit?: string; tone?: Tone }) {
  return el('Heatmap', { title, rows, columns, values, unit, tone }, { caption });
}

export function Gantt({ title, caption, tasks, today }: { title: string; caption?: ReactNode; height?: number; tasks: GanttTask[]; today?: string }) {
  const now = today ? Date.parse(today) : Date.now();
  return el('Gantt', { title, tasks, today, now }, { caption });
}

export function FlowDiagram({ title, caption, nodes, edges, current }: { title: string; caption?: ReactNode; height?: number; nodes: FlowNode[]; edges: FlowEdge[]; current?: string }) {
  const { rank, back } = rankFlow(nodes.map((n) => n.id), edges);
  return el('FlowDiagram', { title, nodes, edges, current, rank: Object.fromEntries(rank), back: edges.flatMap((e, i) => (back.has(e) ? [i] : [])) }, { caption });
}

export function ticks(min: number, max: number, count = 5): number[] {
  return niceTicks(min, max, count);
}

export function flowLayout(nodes: FlowNode[], edges: FlowEdge[]): { rank: Map<string, number>; back: Set<FlowEdge> } {
  return rankFlow(nodes.map((n) => n.id), edges);
}

// ---- Wireframes

type Look = { glyph: string; tone: Tone; label: string };

export function Marker({ n }: { n: number | string }) {
  return el('Marker', { n: String(n) });
}

export function Status({ status, label }: { status: WireframeStatus; label?: string }) {
  const s = useStatuses()(status);
  return el('Status', { status, label: label ?? s.label, glyph: s.glyph, tone: s.tone });
}

export function StatusLegend({ meanings, counts, shown }: { meanings?: Partial<Record<WireframeStatus, string>>; counts?: Partial<Record<WireframeStatus, number>>; shown?: WireframeStatus[] }) {
  const look = useStatuses();
  const order = STATUS_ORDER.filter((s) => (!shown || shown.includes(s)) && (!meanings || meanings[s]));
  const items = order.map((s) => ({ ...look(s), meaning: meanings?.[s] ?? null, count: counts?.[s] || null }));
  return el('StatusLegend', { meanings: Boolean(meanings), counts: Boolean(counts), shown: shown ?? null, items });
}

export function Notes({ items, columns = 2 }: { items: Note[]; columns?: number }) {
  const look = useStatuses();
  return el('Notes', { columns, items: items.map((i) => ({ n: String(i.n), title: i.title, text: i.text, mark: i.status ? look(i.status) : null })) });
}

export function Wireframe({ frame = 'window', toolbar, toolbarEnd, caption, columns, gap = 10, padding, children }: { frame?: 'window' | 'phone' | 'none'; toolbar?: ReactNode; toolbarEnd?: ReactNode; caption?: ReactNode; columns?: string; gap?: number; padding?: number | string; children?: ReactNode }) {
  return el('Wireframe', { frame, columns, gap, padding }, { toolbar, toolbarEnd, caption }, children);
}

export function Region({ n, label, status, dashed, grow, padding, children }: { n?: number | string; label?: string; status?: WireframeStatus; dashed?: boolean; grow?: boolean; padding?: number; children?: ReactNode }) {
  const look = useStatuses();
  const mark: Look | null = status ? look(status) : null;
  return el('Region', { n: n != null ? String(n) : null, label, status, mark, dashed, grow, padding }, null, children);
}

export function Placeholder({ w, h, ratio, caption, badge, selected, dim, dashed, inset, onClick, children }: { w?: number; h?: number; ratio?: string; caption?: ReactNode; badge?: ReactNode; selected?: boolean; dim?: boolean; dashed?: boolean; inset?: [number, number, number, number]; onClick?: () => void; children?: ReactNode }) {
  return el('Placeholder', { w, h, ratio: ratioOf(ratio), selected, dim, dashed, inset, ...(onClick ? { click: () => onClick() } : {}) }, { caption, badge }, children);
}

export function SideList({ title, status, items, note, onSelect }: { title?: string; status?: WireframeStatus; items: SideListItem[]; note?: string; onSelect?: (label: string) => void }) {
  const look = useStatuses();
  const mark: Look | null = status ? look(status) : null;
  return el('SideList', { title, status, mark, items, note, ...(onSelect ? { select: (label: string) => onSelect(String(label)) } : {}) });
}

export function Field({ name, value, tone, wrap, children }: { name: string; value?: string; tone?: 'secondary' | 'muted'; wrap?: boolean; children?: ReactNode }) {
  return el('Field', { name, value, tone, wrap }, null, children);
}

export function Segmented({ items, active, onChange }: { items: string[]; active?: string; onChange?: (item: string) => void }) {
  return el('Segmented', { items, active, ...(onChange ? { change: (item: string) => onChange(String(item)) } : {}) });
}

export function Chip({ dim, selected, onClick, children }: { dim?: boolean; selected?: boolean; onClick?: () => void; children?: ReactNode }) {
  return el('Chip', { dim, selected, ...(onClick ? { click: () => onClick() } : {}) }, null, children);
}

// ---- Forms

const SubmitContext = createContext<(() => boolean) | null>(null);

export function Button({ children, onClick, tone = 'default', variant = 'outline', size = 'md', disabled, kbd, type = 'button', title }: ButtonProps) {
  const submit = useContext(SubmitContext);
  const press = () => {
    onClick?.();
    if (type === 'submit') submit?.();
  };
  return el('Button', { tone, variant, size, disabled, kbd, type, title, ...(disabled ? {} : { press }) }, null, children);
}

export function TextInput(props: FieldProps<string> & { placeholder?: string; type?: 'text' | 'email' | 'url' | 'number' | 'date' }) {
  const [value, set, error] = useField(props, '');
  return el('TextInput', { value: value ?? '', placeholder: props.placeholder, type: props.type ?? 'text', error, change: (v: string) => set(String(v)) }, { label: props.label, hint: props.hint });
}

export function TextArea(props: FieldProps<string> & { placeholder?: string; rows?: number }) {
  const [value, set, error] = useField(props, '');
  return el('TextArea', { value: value ?? '', placeholder: props.placeholder, rows: props.rows ?? 3, error, change: (v: string) => set(String(v)) }, { label: props.label, hint: props.hint });
}

const options = (list: (Option | string)[]) => list.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));

export function Select(props: FieldProps<string> & { options: (Option | string)[]; placeholder?: string }) {
  const [value, set, error] = useField(props, '');
  const list = options(props.options).map((o) => ({ value: o.value, label: typeof o.label === 'string' ? o.label : o.value }));
  return el('Select', { value: value ?? '', options: list, placeholder: props.placeholder, error, change: (v: string) => set(String(v)) }, { label: props.label, hint: props.hint });
}

export function Checkbox(props: FieldProps<boolean> & { label: ReactNode }) {
  const [value, set] = useField(props, false);
  return el('Checkbox', { checked: Boolean(value), change: (v: boolean) => set(Boolean(v)) }, { label: props.label });
}

export function Toggle(props: FieldProps<boolean> & { label?: ReactNode }) {
  const [value, set] = useField(props, false);
  return el('Toggle', { checked: Boolean(value), change: (v: boolean) => set(Boolean(v)) }, { label: props.label });
}

export function Radio(props: FieldProps<string> & { options: (Option | string)[]; vertical?: boolean }) {
  const [value, set, error] = useField(props, '');
  const list = options(props.options);
  const slots: Record<string, ReactNode> = { label: props.label, hint: props.hint };
  list.forEach((o, i) => (slots[`o:${i}`] = o.label));
  return el('Radio', { value: value ?? '', options: list.map((o) => ({ value: o.value })), vertical: props.vertical, error, change: (v: string) => set(String(v)) }, slots);
}

export function Slider(props: FieldProps<number> & { min?: number; max?: number; step?: number; unit?: string }) {
  const { min = 0, max = 100, step = 1, unit = '' } = props;
  const [value, set, error] = useField(props, min);
  return el('Slider', { value: value ?? min, min, max, step, unit, error, change: (v: number) => set(Math.min(max, Math.max(min, Number(v)))) }, { label: props.label, hint: props.hint });
}

export function Rating(props: FieldProps<number> & { max?: number }) {
  const max = props.max ?? 5;
  const [value, set, error] = useField(props, 0);
  return el(
    'Rating',
    { value: value ?? 0, max, error, pick: (n: number) => set(value === Number(n) ? 0 : Number(n)), change: (n: number) => set(Math.min(max, Math.max(0, Number(n)))) },
    { label: props.label, hint: props.hint },
  );
}

export function Form({ name, initial, validate, onSubmit, submitLabel = 'Send', start, children }: FormProps) {
  const { handle, send } = useFormRunner({ name, initial, validate, onSubmit, start });
  const foot = (
    <Row gap={8}>
      <Button type="submit" variant="solid" tone="accent">
        {handle.submitted ? `${submitLabel} again` : submitLabel}
      </Button>
      {handle.submitted && (
        <Text as="span" tone="muted" size="sm">
          Sent <Time at={handle.submitted.at} />
        </Text>
      )}
    </Row>
  );
  return (
    <FormContext.Provider value={handle}>
      <SubmitContext.Provider value={send}>
        {el('Form', { name, submit: send }, null, (
          <>
            {children}
            {foot}
          </>
        ))}
      </SubmitContext.Provider>
    </FormContext.Provider>
  );
}

export function Approval({ id, title, detail, children, note = true, labels = { approve: 'Approve', hold: 'Hold' } }: { id: string; title?: ReactNode; detail?: ReactNode; children?: ReactNode; note?: boolean; labels?: { approve: string; hold: string } }) {
  const { mark, note: text, setNote, decide, undo, tone } = useApproval(id);
  const badge = mark ? (
    <Badge tone={mark.state === 'approved' ? 'success' : 'warning'} dot>
      {mark.state === 'approved' ? 'Approved' : 'Held'} <Time at={mark.at} />
    </Badge>
  ) : null;
  const actions = mark ? (
    <Row gap={8}>
      {mark.note && <Text as="span" tone="secondary">{`“${mark.note}”`}</Text>}
      <Button size="sm" variant="ghost" onClick={undo}>
        Undo
      </Button>
    </Row>
  ) : (
    <Stack gap={6}>
      {note && <TextArea rows={2} placeholder="A note for the agent (optional)" value={text} onChange={setNote} />}
      <Row gap={8}>
        <Button size="sm" variant="solid" tone="success" onClick={() => decide('approved')}>
          {labels.approve}
        </Button>
        <Button size="sm" tone="warning" onClick={() => decide('held')}>
          {labels.hold}
        </Button>
      </Row>
    </Stack>
  );
  return el('Approval', { tone, state: mark?.state ?? null }, { title, badge, detail, actions }, children);
}

export function NeedsYou({ id, title, detail, unblocks, blocking, command, done, ask }: NeedsYouProps) {
  const { mark, set, settled, askAgent, tone } = useNeedsYou({ id, title, detail, blocking, done, ask });
  const badges = (
    <>
      {blocking && !settled && <Badge tone="danger">blocking</Badge>}
      {done ? (
        <Badge tone="success">done</Badge>
      ) : mark ? (
        <Badge tone={mark.state === 'asked' ? 'info' : 'success'}>
          {mark.state === 'asked' ? 'asked an agent' : mark.state} <Time at={mark.at} />
        </Badge>
      ) : null}
    </>
  );
  const actions = done ? null : mark ? (
    <Button size="sm" variant="ghost" onClick={() => set(null)}>
      Undo
    </Button>
  ) : (
    <Row gap={8}>
      <Button size="sm" variant="solid" tone="success" onClick={() => set('done')}>
        Done
      </Button>
      <Button size="sm" onClick={() => set('skipped')}>
        Skip
      </Button>
      <Button size="sm" tone="accent" onClick={askAgent}>
        Ask the agent
      </Button>
    </Row>
  );
  return el(
    'NeedsYou',
    { tone, settled, blocking },
    {
      title,
      badges,
      detail: settled ? null : detail,
      unblocks: !settled && unblocks != null ? <>Unblocks: {unblocks}</> : null,
      command: !settled && command ? <Code block lang="shell">{command}</Code> : null,
      actions,
    },
  );
}

// What a canvas can import from "atelier", with every prop.
// Generated from the kit by scripts/reference.mjs; don't edit it by hand.
//
// A canvas may also import React's hooks from "atelier" or "react":
// useState, useEffect, useMemo, useRef, useCallback, useReducer, Fragment.

import type { CSSProperties, JSX, ReactNode } from 'react';

// ---- Tones, sessions and actions

export type Tone = 'default' | 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'muted';
/** A Claude Code session the daemon knows about. */
export interface Session {
    id: string;
    /** What the session is doing now. */
    status: 'working' | 'idle' | 'waiting' | 'ended';
    /** The project folder it runs in. */
    project: string;
    /** Its first prompt, or the title it was given. */
    title?: string;
    /** When it last did something, in milliseconds since the epoch. */
    at: number;
    /** "background" for a run a canvas started without a terminal. */
    kind?: 'terminal' | 'background';
}
/** What an action did, once you've confirmed it or turned it down. */
export interface ActionResult {
    ok: boolean;
    message: string;
    /** The session it started or resumed, when it did. */
    session?: string;
}
export type Action = {
    type: 'startSession';
    prompt: string;
    mode?: 'terminal' | 'background';
} | {
    type: 'openSession';
    id: string;
} | {
    type: 'tell';
    session: string;
    text: string;
} | {
    type: 'openFile';
    path: string;
    line?: number;
} | {
    type: 'openUrl';
    url: string;
};

// ---- The theme (useTheme)

/** The colours a theme gives canvases, as `--<name>` CSS variables. */
export interface ThemeColors {
    bg: string;
    panel: string;
    surface: string;
    border: string;
    focus: string;
    text: string;
    text2: string;
    text3: string;
    selection: string;
    accent: string;
    success: string;
    warning: string;
    danger: string;
    info: string;
    /** Chart series, in order. */
    chart: string[];
}
export interface Theme {
    id: string;
    name: string;
    dark: boolean;
    source: 'omarchy' | 'haunt';
    colors: ThemeColors;
}

// ---- Layout

interface Box {
    children?: ReactNode;
    style?: CSSProperties;
    className?: string;
}
declare const ALIGN: {
    readonly start: 'flex-start';
    readonly center: 'center';
    readonly end: 'flex-end';
    readonly stretch: 'stretch';
    readonly baseline: 'baseline';
};
declare const JUSTIFY: {
    readonly start: 'flex-start';
    readonly center: 'center';
    readonly end: 'flex-end';
    readonly between: 'space-between';
};
/** Things one above the other. */
export declare function Stack({ gap, align, children, style, className }: Box & {
    gap?: number;
    align?: keyof typeof ALIGN;
}): JSX.Element;
/** Things side by side, wrapping onto new lines when there isn't room. */
export declare function Row({ gap, align, justify, wrap, children, style, className, }: Box & {
    gap?: number;
    align?: keyof typeof ALIGN;
    justify?: keyof typeof JUSTIFY;
    wrap?: boolean;
}): JSX.Element;
/**
 * A grid. `columns` is a count, or any CSS `grid-template-columns`; without
 * it, as many columns of at least `min` pixels as fit.
 */
export declare function Grid({ columns, min, gap, children, style, className }: Box & {
    columns?: number | string;
    min?: number;
    gap?: number;
}): JSX.Element;
/** Two columns, `ratio` wide, which become one on a narrow screen. */
export declare function Split({ ratio, gap, children, style, className }: Box & {
    ratio?: [number, number];
    gap?: number;
}): JSX.Element;
/** A line between things, with an optional label in it. */
export declare function Divider({ label }: {
    label?: ReactNode;
}): JSX.Element;
export interface PanelProps extends Box {
    /** Set into the top border. */
    title?: ReactNode;
    /** On the right of the top border: a count, a time, a badge. */
    info?: ReactNode;
    /** Key hints on the right of the top border, such as `["r refresh"]`. */
    keys?: string[];
    /** Colours the border. */
    tone?: Tone;
    /** Draws the border in the focus colour, as for the window that has focus. */
    focus?: boolean;
    padding?: number;
}
/** A panel, like a window in a tiling window manager: its title is set into its border. */
export declare function Panel({ title, info, keys, tone: t, focus, padding, children, style, className }: PanelProps): JSX.Element;
export interface Tab {
    id: string;
    label: ReactNode;
    /** A count or badge after the label. */
    badge?: ReactNode;
    content: ReactNode;
}
/**
 * Tabs, like a bar's workspaces. The open tab is kept in the canvas's state
 * under `stateKey` (by default `tab`), so it's still open after a reload.
 */
export declare function Tabs({ tabs, stateKey, initial }: {
    tabs: Tab[];
    stateKey?: string;
    initial?: string;
}): JSX.Element;
/**
 * A part of a canvas that folds away. Whether it's open is kept in the
 * canvas's state when `stateKey` is given.
 */
export declare function Section({ title, count, info, open, stateKey, children, }: {
    title: ReactNode;
    count?: ReactNode;
    info?: ReactNode;
    open?: boolean;
    stateKey?: string;
    children?: ReactNode;
}): JSX.Element;
/** Whether a node renders anything: lets parts hide when there's nothing in them. */
export declare function hasContent(node: ReactNode): boolean;

// ---- Text

/** A heading. `info` sits after it, dimmer: a count, a date, a badge. */
export declare function Heading({ level, info, children }: {
    level?: 1 | 2 | 3;
    info?: ReactNode;
    children: ReactNode;
}): JSX.Element;
export interface TextProps {
    children?: ReactNode;
    /** `default` is ordinary text; `muted` the dimmest; the others colour it. */
    tone?: Tone | 'secondary';
    size?: 'sm' | 'md' | 'lg';
    weight?: 'normal' | 'medium' | 'bold';
    italic?: boolean;
    /** Cuts it to one line, with an ellipsis. */
    truncate?: boolean;
    as?: 'p' | 'span' | 'div';
}
/** Text, in one of the theme's colours. */
export declare function Text({ children, tone: t, size, weight, italic, truncate, as }: TextProps): JSX.Element;
/** Code: inline, or a block with its language and a copy button. `wrap` wraps long lines, for prose such as a caption. */
export declare function Code({ children, block, lang, copy, wrap }: {
    children: string;
    block?: boolean;
    lang?: string;
    copy?: boolean;
    wrap?: boolean;
}): JSX.Element;
/** A key, as on a keyboard. */
export declare function Kbd({ children }: {
    children: ReactNode;
}): JSX.Element;
/**
 * A link. `href` opens a web page; `path` opens a file on your machine, in
 * the viewer if it's an image, video, PDF or Markdown, and otherwise in your
 * editor, at `line` if given.
 */
export declare function Link({ href, path, line, children }: {
    href?: string;
    path?: string;
    line?: number;
    children?: ReactNode;
}): JSX.Element;
/** A time, as how long ago it was ("5m ago"), with the date and time on hover. */
export declare function Time({ at, relative }: {
    at: string | number | Date;
    relative?: boolean;
}): JSX.Element;

// ---- Markdown

export declare function Markdown({ children }: {
    children: string;
}): JSX.Element;


// ---- Images and video, read from disk

/** A file on disk, as a URL the canvas can show, once the viewer has fetched it. */
export declare function useFile(path: string | undefined): {
    url?: string;
    error?: string;
};
export interface ImageProps {
    /** Where the image is: absolute, from home (`~/`), or relative to the canvas. */
    path: string;
    /** What it shows, for anyone who can't see it. */
    alt: string;
    caption?: ReactNode;
    height?: number;
    fit?: 'contain' | 'cover';
}
/** An image read from disk: a screenshot, a render, a photo. Nothing is embedded in the canvas. */
export declare function Image({ path, alt, caption, height, fit }: ImageProps): JSX.Element;
/** Images in a grid. Each opens full size when clicked. */
export declare function Gallery({ images, columns, height }: {
    images: {
        path: string;
        alt: string;
        caption?: string;
    }[];
    columns?: number;
    height?: number;
}): JSX.Element;
/** A video read from disk. */
export declare function Video({ path, caption, height, autoPlay, loop, muted }: {
    path: string;
    caption?: ReactNode;
    height?: number;
    autoPlay?: boolean;
    loop?: boolean;
    muted?: boolean;
}): JSX.Element;

// ---- Data

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
/** A table that sorts by any column you click and filters by what you type. */
export declare function Table<Row>({ columns, headers, rows, filter, rowTone, actions, empty, maxHeight, dense, stateKey }: TableProps<Row>): JSX.Element | null;
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
export declare function Stat({ label, value, tone: t, delta, deltaTone, hint, trend }: StatProps): JSX.Element;
/** Stats side by side, as many to a row as fit. */
export declare function Stats({ children, min }: {
    children: ReactNode;
    min?: number;
}): JSX.Element;
/** A small label in a tone: a status, a count, a tag. */
export declare function Badge({ tone: t, variant, dot, children }: {
    tone?: Tone;
    variant?: 'soft' | 'solid' | 'outline';
    dot?: boolean;
    children?: ReactNode;
}): JSX.Element;
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
    segments?: {
        value: number;
        tone?: Tone;
        label?: string;
    }[];
}
/** How far along something is. */
export declare function Meter({ value, max, label, tone: t, show, blocks: asBlocks, segments }: MeterProps): JSX.Element;
/** Labels and their values, in columns. */
export declare function KeyValue({ items, columns }: {
    items: [ReactNode, ReactNode][] | Record<string, ReactNode>;
    columns?: 1 | 2;
}): JSX.Element;
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
export declare function Timeline({ items, limit }: {
    items: TimelineItem[];
    limit?: number;
}): JSX.Element;
export interface Lane {
    title: ReactNode;
    tone?: Tone;
    items: {
        title: ReactNode;
        detail?: ReactNode;
        badge?: ReactNode;
        tone?: Tone;
    }[];
}
/** Columns of cards, such as Ready, Doing and Blocked. */
export declare function Lanes({ lanes }: {
    lanes: Lane[];
}): JSX.Element;
export interface CalendarEvent {
    /** `YYYY-MM-DD`. */
    date: string;
    title: string;
    tone?: Tone;
}
/** A month, with events on their days. */
export declare function Calendar({ events, month, weekStart }: {
    events: CalendarEvent[];
    month?: string;
    weekStart?: 0 | 1;
}): JSX.Element;
export interface TreeItem {
    label: ReactNode;
    detail?: ReactNode;
    badge?: ReactNode;
    children?: TreeItem[];
    /** Whether it starts open. */
    open?: boolean;
}
/** Things inside things, each part folding away. */
export declare function Tree({ items }: {
    items: TreeItem[];
}): JSX.Element;
/** Changes to text: a unified diff, or what changed between `before` and `after`. */
export declare function DiffView({ diff, before, after, title }: {
    diff?: string;
    before?: string;
    after?: string;
    title?: ReactNode;
}): JSX.Element;

// ---- Charts, drawn as SVG. Every chart has a title.

/** Round numbers between `min` and `max`, about `count` of them. */
export declare function ticks(min: number, max: number, count?: number): number[];
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
export interface BarChartProps extends Common {
    categories: string[];
    series: Series[];
    stacked?: boolean;
    horizontal?: boolean;
    /** After each value, such as "%" or " ms". */
    unit?: string;
}
/** Bars, by category: grouped, stacked, or across. */
export declare function BarChart({ title, caption, categories, series, stacked, horizontal, unit, height }: BarChartProps): JSX.Element;
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
export declare function LineChart({ title, caption, x, series, area, unit, yMin, yMax, height }: LineChartProps): JSX.Element;
/** A small line with no axes, for a trend beside a number. `blocks` draws it in block characters. */
export declare function Sparkline({ title, values, tone: t, blocks, width, height }: {
    title: string;
    values: number[];
    tone?: Tone;
    blocks?: boolean;
    width?: number;
    height?: number;
}): JSX.Element;
/** Parts of a whole, as a ring. `center` goes in the middle. */
export declare function DonutChart({ title, caption, segments, center, unit, height }: Common & {
    segments: {
        label: string;
        value: number;
        tone?: Tone;
    }[];
    center?: ReactNode;
    unit?: string;
}): JSX.Element;
/** How values are spread: how many fall in each range. */
export declare function Histogram({ title, caption, values, bins, unit, height, tone: t }: Common & {
    values: number[];
    bins?: number;
    unit?: string;
    tone?: Tone;
}): JSX.Element;
export interface ScatterSeries {
    name: string;
    points: {
        x: number;
        y: number;
        label?: string;
    }[];
    tone?: Tone;
}
/** Points by two measures, to show how they relate. */
export declare function ScatterChart({ title, caption, series, xLabel, yLabel, height }: Common & {
    series: ScatterSeries[];
    xLabel?: string;
    yLabel?: string;
}): JSX.Element;
/** A grid of values, each cell as strong as its value. */
export declare function Heatmap({ title, caption, rows, columns, values, unit, tone: t }: Common & {
    rows: string[];
    columns: string[];
    values: number[][];
    unit?: string;
    tone?: Tone;
}): JSX.Element;
export interface GanttTask {
    label: string;
    /** `YYYY-MM-DD`, or an ISO time. */
    start: string;
    end: string;
    tone?: Tone;
    /** How much of it is done, from 0 to 1. */
    progress?: number;
}
/** Work over time, as bars from start to end, with today marked. */
export declare function Gantt({ title, caption, tasks, today }: Common & {
    tasks: GanttTask[];
    today?: string;
}): JSX.Element;
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
export declare function flowLayout(nodes: FlowNode[], edges: FlowEdge[]): {
    rank: Map<string, number>;
    back: Set<FlowEdge>;
};
/** Steps and the ways between them, with loops drawn as dashed edges going back. `current` marks where things are now. */
export declare function FlowDiagram({ title, caption, nodes, edges, current }: Common & {
    nodes: FlowNode[];
    edges: FlowEdge[];
    current?: string;
}): JSX.Element;

// ---- Forms, approvals and Needs you items

export interface ButtonProps {
    children?: ReactNode;
    onClick?: () => void;
    tone?: Tone;
    /** `solid` for the main thing to do, `outline` for the rest, `ghost` for the least. */
    variant?: 'solid' | 'outline' | 'ghost';
    size?: 'sm' | 'md';
    disabled?: boolean;
    /** A key hint shown in the button. */
    kbd?: string;
    type?: 'button' | 'submit';
    title?: string;
}
export declare function Button({ children, onClick, tone: t, variant, size, disabled, kbd, type, title }: ButtonProps): JSX.Element;
interface FieldProps<T> {
    /** Inside a `Form`: the answer's name. */
    name?: string;
    /** Outside a form: keeps the value in the canvas's state under this key. */
    stateKey?: string;
    value?: T;
    onChange?: (value: T) => void;
    label?: ReactNode;
    hint?: ReactNode;
}
export declare function TextInput(props: FieldProps<string> & {
    placeholder?: string;
    type?: 'text' | 'email' | 'url' | 'number' | 'date';
}): JSX.Element;
export declare function TextArea(props: FieldProps<string> & {
    placeholder?: string;
    rows?: number;
}): JSX.Element;
export interface Option {
    value: string;
    label: ReactNode;
}
export declare function Select(props: FieldProps<string> & {
    options: (Option | string)[];
    placeholder?: string;
}): JSX.Element;
export declare function Checkbox(props: FieldProps<boolean> & {
    label: ReactNode;
}): JSX.Element;
export declare function Toggle(props: FieldProps<boolean> & {
    label?: ReactNode;
}): JSX.Element;
/** One of several options. */
export declare function Radio(props: FieldProps<string> & {
    options: (Option | string)[];
    vertical?: boolean;
}): JSX.Element;
export declare function Slider(props: FieldProps<number> & {
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
}): JSX.Element;
/** Stars, from one to `max`. Clicking the current one clears it. */
export declare function Rating(props: FieldProps<number> & {
    max?: number;
}): JSX.Element;
export interface FormProps {
    /** The answers are kept in the canvas's state under `form:<name>`, where agents read them. */
    name: string;
    initial?: FormValues;
    /** Problems with the answers, by field. Returning none lets the form be sent. */
    validate?: (values: FormValues) => Record<string, string>;
    onSubmit?: (values: FormValues) => void;
    submitLabel?: string;
    /** Starts an agent with the answers once they're sent. `{{field}}` in the prompt is replaced by that answer. */
    start?: {
        prompt: string;
        mode?: 'terminal' | 'background';
    };
    children?: ReactNode;
}
/**
 * A form whose answers go to the canvas's state when it's sent. An agent
 * waiting on the canvas (`canvas_wait`) gets them, or `start` hands them to
 * a new one.
 */
export declare function Form({ name, initial, validate, onSubmit, submitLabel, start, children }: FormProps): JSX.Element;
/** What an approval leaves in the canvas's state, under `approval:<id>`. */
export interface ApprovalMark {
    state: 'approved' | 'held';
    note?: string;
    at: string;
}
/**
 * Approve or hold something, with a note: a cut, a post, a design. The mark
 * is kept under `approval:<id>`, where agents read it.
 */
export declare function Approval({ id, title, detail, children, note, labels, }: {
    id: string;
    title?: ReactNode;
    detail?: ReactNode;
    children?: ReactNode;
    note?: boolean;
    labels?: {
        approve: string;
        hold: string;
    };
}): JSX.Element;
/** Your answer to a Needs you item, kept under `needsYou` in the canvas's state, by the item's id. */
export interface NeedsYouMark {
    state: 'done' | 'skipped' | 'asked';
    at: string;
}
export interface NeedsYouProps {
    id: string;
    title: ReactNode;
    /** Exactly what to do, and where. */
    detail?: ReactNode;
    /** What doing it unblocks. */
    unblocks?: ReactNode;
    /** Whether work is waiting on it. */
    blocking?: boolean;
    /** A command to run, shown with a copy button. */
    command?: string;
    /** Set by the agent once it has seen it done. */
    done?: boolean;
    /** "Ask the agent" starts one with this prompt. */
    ask?: {
        prompt?: string;
        mode?: 'terminal' | 'background';
    };
}
/**
 * Something only you can do, with Done, Skip and Ask the agent. Your answer
 * is kept under `needsYou` in the canvas's state; agents read it and fold it
 * into the canvas.
 */
export declare function NeedsYou({ id, title, detail, unblocks, blocking, command, done, ask }: NeedsYouProps): JSX.Element;

// ---- Hooks

type SetValue<T> = (value: T | ((previous: T) => T)) => void;
/**
 * A value kept in the canvas's state file, beside it, so it's still there
 * after a reload and agents can read it. Use it for what you decide on the
 * canvas: marks, picks, notes, the tab you're on.
 */
export declare function useCanvasState<T>(key: string, initial: T): [T, SetValue<T>];
/** The agent sessions the daemon knows, kept up to date. */
export declare function useSessions(): Session[];
/** The theme you picked in the viewer. */
export declare function useTheme(): Theme;
/** The time now, updated every `intervalMs`. */
export declare function useNow(intervalMs?: number): number;
export interface Actions {
    /** Starts Claude Code in this canvas's project: in a terminal tab, or in the background with its progress in the viewer. */
    startSession(options: {
        prompt: string;
        mode?: 'terminal' | 'background';
    }): Promise<ActionResult>;
    /** Carries a session on in a terminal tab. */
    openSession(options: {
        id: string;
    }): Promise<ActionResult>;
    /** Gives a session a message: when its turn ends if it's working, or by resuming it in the background. */
    tell(options: {
        session: string;
        text: string;
    }): Promise<ActionResult>;
    /** Opens a file in your editor, or in the viewer if it's an image, video, PDF or Markdown. */
    openFile(options: {
        path: string;
        line?: number;
    }): Promise<ActionResult>;
    /** Opens a web page in a new browser tab. */
    openUrl(options: {
        url: string;
    }): Promise<ActionResult>;
}
/**
 * Actions that reach outside the canvas. Each one is shown to you in the
 * viewer, with its prompt, and runs only when you confirm it.
 */
export declare function useAction(): Actions;
export type FormValues = Record<string, unknown>;
/** What a submitted form leaves in the canvas's state, under `form:<name>`. */
export interface Submission {
    values: FormValues;
    at: string;
}
export interface FormHandle {
    values: FormValues;
    errors: Record<string, string>;
    set(field: string, value: unknown): void;
    /** Validates, and if that passes, saves the answers under `form:<name>`. Returns whether it did. */
    submit(): boolean;
    reset(): void;
    /** The last answers sent, if there are any. */
    submitted: Submission | null;
}
/**
 * A form's answers. They're kept as a draft while you fill it in, and sent
 * to the canvas's state when you submit, which is when an agent waiting on
 * the canvas hears about them.
 */
export declare function useForm(name: string, options?: {
    initial?: FormValues;
    validate?: (values: FormValues) => Record<string, string>;
}): FormHandle;

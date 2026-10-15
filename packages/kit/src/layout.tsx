import { Children, isValidElement, useId, type CSSProperties, type ReactNode } from 'react';
import type { Tone } from './bridge.ts';
import { useCanvasState } from './hooks.ts';
import { cx, tone } from './util.ts';
import { Kbd } from './text.tsx';

interface Box {
  children?: ReactNode;
  style?: CSSProperties;
  className?: string;
}

const ALIGN = { start: 'flex-start', center: 'center', end: 'flex-end', stretch: 'stretch', baseline: 'baseline' } as const;
const JUSTIFY = { start: 'flex-start', center: 'center', end: 'flex-end', between: 'space-between' } as const;

/** Things one above the other. */
export function Stack({ gap = 12, align, children, style, className }: Box & { gap?: number; align?: keyof typeof ALIGN }) {
  return (
    <div className={cx('at-stack', className)} style={{ gap, alignItems: align && ALIGN[align], ...style }}>
      {children}
    </div>
  );
}

/** Things side by side, wrapping onto new lines when there isn't room. */
export function Row({
  gap = 10,
  align = 'center',
  justify,
  wrap = true,
  children,
  style,
  className,
}: Box & { gap?: number; align?: keyof typeof ALIGN; justify?: keyof typeof JUSTIFY; wrap?: boolean }) {
  return (
    <div
      className={cx('at-row', !wrap && 'at-nowrap', className)}
      style={{ gap, alignItems: ALIGN[align], justifyContent: justify && JUSTIFY[justify], ...style }}
    >
      {children}
    </div>
  );
}

/**
 * A grid. `columns` is a count, or any CSS `grid-template-columns`; without
 * it, as many columns of at least `min` pixels as fit.
 */
export function Grid({ columns, min = 260, gap = 12, children, style, className }: Box & { columns?: number | string; min?: number; gap?: number }) {
  const template =
    typeof columns === 'number' ? `repeat(${columns}, minmax(0, 1fr))` : (columns ?? `repeat(auto-fit, minmax(min(100%, ${min}px), 1fr))`);
  return (
    <div className={cx('at-grid', className)} style={{ gridTemplateColumns: template, gap, alignItems: 'start', ...style }}>
      {children}
    </div>
  );
}

/** Two columns, `ratio` wide, which become one on a narrow screen. */
export function Split({ ratio = [2, 1], gap = 12, children, style, className }: Box & { ratio?: [number, number]; gap?: number }) {
  return (
    <div
      className={cx('at-split', className)}
      style={{ gridTemplateColumns: `minmax(0, ${ratio[0]}fr) minmax(0, ${ratio[1]}fr)`, gap, alignItems: 'start', ...style }}
    >
      {children}
    </div>
  );
}

/** A line between things, with an optional label in it. */
export function Divider({ label }: { label?: ReactNode }) {
  return <div className={cx('at-divider', label != null && 'at-labelled')}>{label}</div>;
}

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
export function Panel({ title, info, keys, tone: t, focus, padding, children, style, className }: PanelProps) {
  const id = useId();
  const head = title != null || info != null || keys?.length;
  return (
    <fieldset
      role="region"
      aria-labelledby={title != null ? id : undefined}
      className={cx('at-panel', t && tone(t), t && 'at-toned-line', focus && 'at-focus', className)}
      style={{ ...(padding != null ? { paddingLeft: padding, paddingRight: padding, paddingBottom: padding } : {}), ...style }}
    >
      {head ? (
        <legend>
          {title != null && (
            <span id={id} className="at-panel-title">
              {title}
            </span>
          )}
          <span className="at-panel-line" />
          {(info != null || keys?.length) && (
            <span className="at-panel-info">
              {info}
              {keys?.map((k) => {
                const [key, ...words] = k.split(' ');
                return (
                  <span key={k}>
                    <Kbd>{key}</Kbd> {words.join(' ')}
                  </span>
                );
              })}
            </span>
          )}
        </legend>
      ) : null}
      <div className="at-panel-body">{children}</div>
    </fieldset>
  );
}

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
export function Tabs({ tabs, stateKey = 'tab', initial }: { tabs: Tab[]; stateKey?: string; initial?: string }) {
  const visible = tabs.filter(Boolean);
  const [open, setOpen] = useCanvasState(stateKey, initial ?? visible[0]?.id ?? '');
  const current = visible.find((t) => t.id === open) ?? visible[0];
  const move = (by: number) => {
    const i = visible.findIndex((t) => t.id === current?.id);
    const next = visible[(i + by + visible.length) % visible.length];
    if (next) setOpen(next.id);
  };
  return (
    <div>
      <div className="at-tabs-bar" role="tablist" onKeyDown={(e) => (e.key === 'ArrowRight' ? move(1) : e.key === 'ArrowLeft' ? move(-1) : null)}>
        {visible.map((t, i) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            className="at-tab"
            aria-selected={t.id === current?.id}
            tabIndex={t.id === current?.id ? 0 : -1}
            onClick={() => setOpen(t.id)}
          >
            <span className="at-tab-n">{i + 1}</span>
            <span>{t.label}</span>
            {t.badge != null && <span className="at-tab-badge">{t.badge}</span>}
          </button>
        ))}
      </div>
      <div role="tabpanel">{current?.content}</div>
    </div>
  );
}

/**
 * A part of a canvas that folds away. Whether it's open is kept in the
 * canvas's state when `stateKey` is given.
 */
export function Section({
  title,
  count,
  info,
  open = true,
  stateKey,
  children,
}: {
  title: ReactNode;
  count?: ReactNode;
  info?: ReactNode;
  open?: boolean;
  stateKey?: string;
  children?: ReactNode;
}) {
  const [kept, setKept] = useCanvasState<boolean | null>(stateKey ?? '', null);
  const isOpen = stateKey && kept !== null ? kept : open;
  return (
    <details
      className="at-section"
      open={isOpen}
      onToggle={(e) => {
        const now = (e.currentTarget as HTMLDetailsElement).open;
        if (stateKey && now !== isOpen) setKept(now);
      }}
    >
      <summary>
        {title}
        {count != null && <span className="at-section-count">{count}</span>}
        {info != null && <span className="at-section-info">{info}</span>}
      </summary>
      <div className="at-section-body">{children}</div>
    </details>
  );
}

/** Whether a node renders anything: lets parts hide when there's nothing in them. */
export function hasContent(node: ReactNode): boolean {
  return Children.toArray(node).some((c) => isValidElement(c) || c !== '');
}

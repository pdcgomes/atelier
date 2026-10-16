import type { ReactNode } from 'react';
import type { Tone } from './bridge.ts';
import { ratioOf, STATUS_ORDER, useStatuses, type WireframeStatus } from './logic.ts';
import { cx, tone } from './util.ts';

export type { WireframeStatus } from './logic.ts';

/** The number a region carries, and the note keyed to it. */
export function Marker({ n }: { n: number | string }) {
  return <span className="at-wf-marker">{n}</span>;
}

/** Where something stands: built, being built, planned, later, or waiting on you, as a dot in its tone; a terminal draws its glyph. */
export function Status({ status, label }: { status: WireframeStatus; label?: string }) {
  const s = useStatuses()(status);
  return (
    <span className={cx('at-wf-status', tone(s.tone))}>
      <span className="at-wf-status-dot" />
      <span className="at-wf-status-label">{label ?? s.label}</span>
    </span>
  );
}

/**
 * The statuses in a row, with how many regions are in each when `counts` is
 * given; with `meanings`, each status and what it means here, one per line.
 * `shown` limits it to those statuses.
 */
export function StatusLegend({ meanings, counts, shown }: { meanings?: Partial<Record<WireframeStatus, string>>; counts?: Partial<Record<WireframeStatus, number>>; shown?: WireframeStatus[] }) {
  const order = STATUS_ORDER.filter((s) => !shown || shown.includes(s));
  if (meanings) {
    return (
      <div className="at-wf-meanings">
        {order.filter((s) => meanings[s]).map((s) => (
          <div key={s}>
            <Status status={s} />
            <span>{meanings[s]}</span>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="at-wf-legend">
      {order.map((s) => (
        <span key={s}>
          <Status status={s} />
          {counts?.[s] ? <span className="at-wf-count">{counts[s]}</span> : null}
        </span>
      ))}
    </div>
  );
}

export interface Note {
  n: number | string;
  title: string;
  text: string;
  status?: WireframeStatus;
}

/** The notes under a wireframe, one for each numbered region. */
export function Notes({ items, columns = 2 }: { items: Note[]; columns?: number }) {
  return (
    <div className="at-wf-notes" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {items.map((item) => (
        <div key={String(item.n)} className="at-wf-note">
          <Marker n={item.n} />
          <div>
            <div className="at-wf-note-head">
              <span className="at-wf-note-title">{item.title}</span>
              {item.status && <Status status={item.status} />}
            </div>
            <p className="at-wf-note-text">{item.text}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * A screen drawn as a wireframe: a window with its toolbar, a phone, or no
 * frame. `columns` lays its regions out on the screen's own columns, as in
 * `"170px minmax(0, 1fr) 230px"`; `toolbarEnd` sits at the toolbar's right.
 */
export function Wireframe({ frame = 'window', toolbar, toolbarEnd, caption, columns, gap = 10, padding, children }: { frame?: 'window' | 'phone' | 'none'; toolbar?: ReactNode; toolbarEnd?: ReactNode; caption?: ReactNode; columns?: string; gap?: number; padding?: number | string; children?: ReactNode }) {
  const body = (
    <div className={cx('at-wf-body', columns && 'at-wf-grid')} style={{ ...(columns ? { gridTemplateColumns: columns } : {}), gap, ...(padding != null ? { padding } : {}) }}>
      {children}
    </div>
  );
  const under = caption != null && <figcaption className="at-wf-under">{caption}</figcaption>;
  if (frame === 'phone') {
    return (
      <figure className="at-wf at-wf-figure at-wf-phone-figure">
        <div className="at-wf-phone">
          <div className="at-wf-phone-top">
            <span>9:41</span>
            <i />
            <span>100%</span>
          </div>
          {body}
          <div className="at-wf-phone-home">
            <i />
          </div>
        </div>
        {under}
      </figure>
    );
  }
  if (frame === 'none') {
    return (
      <figure className="at-wf at-wf-figure at-wf-bare">
        {body}
        {under}
      </figure>
    );
  }
  return (
    <figure className="at-wf at-wf-figure">
      <div className="at-wf-window">
        <div className="at-wf-toolbar">
          <span className="at-wf-lights">
            <i />
            <i />
            <i />
          </span>
          {toolbar}
          {toolbarEnd != null && <span className="at-wf-toolbar-end">{toolbarEnd}</span>}
        </div>
        {body}
      </div>
      {under}
    </figure>
  );
}

/**
 * A region of a wireframe: numbered, labelled and marked with where it
 * stands. Dashed for what shows on demand: a sheet, a popover, a menu.
 * `grow` takes the height left in a phone, a column or its row, its last
 * row at the bottom, as a card's buttons sit.
 */
export function Region({ n, label, status, dashed, grow, padding, children }: { n?: number | string; label?: string; status?: WireframeStatus; dashed?: boolean; grow?: boolean; padding?: number; children?: ReactNode }) {
  const head = n != null || label || status;
  return (
    <section className={cx('at-wf at-wf-region', dashed && 'at-dashed', grow && 'at-grow')} style={padding != null ? { padding } : undefined}>
      {head && (
        <div className="at-wf-region-head">
          {n != null && <Marker n={n} />}
          {label && <span className="at-wf-caption">{label}</span>}
          {status && (
            <span className="at-wf-region-status">
              <Status status={status} />
            </span>
          )}
        </div>
      )}
      <div className="at-wf-region-body">{children}</div>
    </section>
  );
}

/**
 * A stand-in for content: a photo, a thumbnail, a document, a card. `w` and
 * `h` in pixels, or `w` and a `ratio` such as `"4:5"`; without `w`, as wide
 * as there's room. `inset` draws a rectangle inside it, as fractions
 * `[x, y, width, height]`: the photo inside its border, a crop. `dashed`
 * outlines it as a proposal; `onClick` makes it pressable, for a playground.
 */
export function Placeholder({ w, h, ratio, caption, badge, selected, dim, dashed, inset, onClick, children }: { w?: number; h?: number; ratio?: string; caption?: ReactNode; badge?: ReactNode; selected?: boolean; dim?: boolean; dashed?: boolean; inset?: [number, number, number, number]; onClick?: () => void; children?: ReactNode }) {
  const r = ratioOf(ratio);
  const height = h ?? (w != null ? Math.round(w * (r ?? 0.7)) : undefined);
  const box = {
    ...(height != null ? { height } : {}),
    ...(height == null && r ? { aspectRatio: `1 / ${r}` } : {}),
  };
  return (
    <span
      className={cx('at-wf-tile', w == null && 'at-wide', height == null && !r && 'at-fill', onClick && 'at-pressable')}
      style={w != null ? { width: w } : undefined}
      {...(onClick ? { role: 'button', tabIndex: 0, onClick, onKeyDown: (e: { key: string }) => (e.key === 'Enter' || e.key === ' ') && onClick() } : {})}
    >
      <span className={cx('at-wf-tile-box', inset && 'at-paper', selected && 'at-selected', dim && 'at-dim', dashed && 'at-dashed')} style={box}>
        {inset && <span className="at-wf-inset" style={{ left: `${inset[0] * 100}%`, top: `${inset[1] * 100}%`, width: `${inset[2] * 100}%`, height: `${inset[3] * 100}%` }} />}
        {children != null && <span className="at-wf-tile-label">{children}</span>}
        {badge != null && <span className="at-wf-tile-badge">{badge}</span>}
      </span>
      {caption != null && <span className="at-wf-tile-caption">{caption}</span>}
    </span>
  );
}

export interface SideListItem {
  label: string;
  /** On the right: a count, a key. */
  count?: string;
  depth?: number;
  selected?: boolean;
  dim?: boolean;
  /** A dot before the label, in this tone. */
  tone?: Tone;
  /** A line between groups, as in a menu. */
  separator?: boolean;
}

/** A sidebar's section or a menu: a title and rows, with counts, nested by depth. With `onSelect`, a row can be pressed. */
export function SideList({ title, status, items, note, onSelect }: { title?: string; status?: WireframeStatus; items: SideListItem[]; note?: string; onSelect?: (label: string) => void }) {
  return (
    <div className="at-wf-list">
      {(title || status) && (
        <div className="at-wf-list-head">
          {title && <span className="at-wf-caption">{title}</span>}
          {status && (
            <span className="at-wf-region-status">
              <Status status={status} />
            </span>
          )}
        </div>
      )}
      {items.map((item, i) =>
        item.separator ? (
          <hr key={i} className="at-wf-list-rule" />
        ) : (
          <div
            key={i}
            className={cx('at-wf-list-row', item.selected && 'at-selected', item.dim && 'at-dim', onSelect && 'at-pressable')}
            style={{ paddingLeft: 5 + (item.depth ?? 0) * 12 }}
            {...(onSelect ? { role: 'button', tabIndex: 0, onClick: () => onSelect(item.label), onKeyDown: (e: { key: string }) => (e.key === 'Enter' || e.key === ' ') && onSelect(item.label) } : {})}
          >
            {item.tone && <i className={cx('at-wf-dot', tone(item.tone))} />}
            <span className="at-wf-list-label">{item.label}</span>
            {item.count != null && <span className="at-wf-list-count">{item.count}</span>}
          </div>
        ),
      )}
      {note && <div className="at-wf-list-note">{note}</div>}
    </div>
  );
}

/** A labelled value, spaced as an inspector's or a form's rows are. `wrap` shows all of a long value, in monospace. */
export function Field({ name, value, tone: t, wrap, children }: { name: string; value?: string; tone?: 'secondary' | 'muted'; wrap?: boolean; children?: ReactNode }) {
  return (
    <div className="at-wf-field">
      <span className="at-wf-field-name">{name}</span>
      <span className={cx('at-wf-field-value', t === 'secondary' && 'at-text-2', t === 'muted' && 'at-text-3', wrap && 'at-wrap')}>{children ?? value}</span>
    </div>
  );
}

/** A segmented control. With `onChange`, its segments can be pressed. */
export function Segmented({ items, active, onChange }: { items: string[]; active?: string; onChange?: (item: string) => void }) {
  return (
    <span className="at-wf-seg">
      {items.map((item) =>
        onChange ? (
          <button key={item} type="button" className={cx(item === active && 'at-on')} aria-pressed={item === active} onClick={() => onChange(item)}>
            {item}
          </button>
        ) : (
          <span key={item} className={cx(item === active && 'at-on')}>
            {item}
          </span>
        ),
      )}
    </span>
  );
}

/** A small rounded label: a choice, a tag, a value. `selected` marks the one chosen; with `onClick`, it can be pressed. */
export function Chip({ dim, selected, onClick, children }: { dim?: boolean; selected?: boolean; onClick?: () => void; children?: ReactNode }) {
  const className = cx('at-wf-chip', dim && 'at-dim', selected && 'at-selected', onClick && 'at-pressable');
  if (onClick) {
    return (
      <button type="button" className={className} aria-pressed={selected} onClick={onClick}>
        {children}
      </button>
    );
  }
  return <span className={className}>{children}</span>;
}

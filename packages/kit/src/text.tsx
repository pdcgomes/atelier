import { useState, type ReactNode } from 'react';
import type { Tone } from './bridge.ts';
import { useAction, useNow } from './hooks.ts';
import { ago, cx, toTime, tone } from './util.ts';

/** A heading. `info` sits after it, dimmer: a count, a date, a badge. */
export function Heading({ level = 2, info, children }: { level?: 1 | 2 | 3; info?: ReactNode; children: ReactNode }) {
  const Tag = (`h${level}` as 'h1' | 'h2' | 'h3');
  return (
    <Tag className={`at-h${level}`}>
      {children}
      {info != null && <span className="at-h-info">{info}</span>}
    </Tag>
  );
}

export interface TextProps {
  children?: ReactNode;
  /** `default` is ordinary text; `muted` the dimmest; the others colour it. */
  tone?: Tone | 'secondary';
  /** `xs` for the smallest print: a chart's scale, a caption in a drawing. */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  weight?: 'normal' | 'medium' | 'bold';
  italic?: boolean;
  /** Cuts it to one line, with an ellipsis. */
  truncate?: boolean;
  /** Digits all one width, so a column of numbers lines up. */
  tabular?: boolean;
  as?: 'p' | 'span' | 'div';
}

/** Text, in one of the theme's colours. */
export function Text({ children, tone: t, size = 'md', weight = 'normal', italic, truncate, tabular, as = 'p' }: TextProps) {
  const Tag = as;
  const colour = t === 'secondary' ? 'at-text-2' : t === 'muted' ? 'at-text-3' : t && t !== 'default' ? cx(tone(t), 'at-toned') : null;
  return (
    <Tag className={cx('at-text', colour, size !== 'md' && `at-${size}`, weight !== 'normal' && `at-${weight}`, italic && 'at-italic', truncate && 'at-truncate', tabular && 'at-tabular')}>
      {children}
    </Tag>
  );
}

/** Code: inline, or a block with its language and a copy button. `wrap` wraps long lines, for prose such as a caption. */
export function Code({ children, block, lang, copy = true, wrap }: { children: string; block?: boolean; lang?: string; copy?: boolean; wrap?: boolean }) {
  const [copied, setCopied] = useState(false);
  if (!block) return <code className="at-code">{children}</code>;
  return (
    <figure className={cx('at-codeblock', wrap && 'at-wrap')}>
      {(lang || copy) && (
        <figcaption className="at-codeblock-head">
          <span>{lang ?? ''}</span>
          {copy && (
            <button
              type="button"
              className="at-link"
              onClick={() => navigator.clipboard?.writeText(children).then(() => setCopied(true), () => setCopied(false))}
            >
              {copied ? 'copied' : 'copy'}
            </button>
          )}
        </figcaption>
      )}
      <pre>{children}</pre>
    </figure>
  );
}

/** A key, as on a keyboard. */
export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="at-kbd">{children}</kbd>;
}

/**
 * A link. `href` opens a web page; `path` opens a file on your machine, in
 * the viewer if it's an image, video, PDF or Markdown, and otherwise in your
 * editor, at `line` if given.
 */
export function Link({ href, path, line, children }: { href?: string; path?: string; line?: number; children?: ReactNode }) {
  const actions = useAction();
  const label = children ?? path?.split('/').pop() ?? href;
  return (
    <button
      type="button"
      className="at-link"
      title={path ?? href}
      onClick={() => (path ? actions.openFile({ path, line }) : href ? actions.openUrl({ url: href }) : undefined)}
    >
      {label}
    </button>
  );
}

/** A time, as how long ago it was ("5m ago"), with the date and time on hover. */
export function Time({ at, relative = true }: { at: string | number | Date; relative?: boolean }) {
  const now = useNow();
  const t = toTime(at);
  if (!Number.isFinite(t)) return <span className="at-time">{String(at)}</span>;
  const full = new Date(t).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  return (
    <time className="at-time" dateTime={new Date(t).toISOString()} title={full}>
      {relative ? ago(t, now) : full}
    </time>
  );
}

// What opens over the canvas: the theme picker, finding a canvas, the keys,
// the confirm sheet an action waits in, the runs drawer and the document
// viewer.

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { themes, type Theme } from '@atelier/themes';
import { Badge, Button, Kbd, Markdown, Panel, Text } from '../../kit/src/index.ts';
import { ago, cx } from '../../kit/src/util.ts';
import { basename, dirname, kindOf, readFile } from './api.ts';
import type { Action, CanvasInfo, Run, Session } from './types.ts';

function Sheet({ title, info, keys, side, full, onClose, children, tone }: { title: ReactNode; info?: ReactNode; keys?: string[]; side?: boolean; full?: boolean; onClose: () => void; children: ReactNode; tone?: 'warning' | 'accent' }) {
  return (
    <div className={cx('av-scrim', side && 'av-side', full && 'av-full')} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="av-sheet" role="dialog" aria-modal="true">
        <Panel title={title} info={info} keys={keys ?? ['esc close']} tone={tone} focus>
          {children}
        </Panel>
      </div>
    </div>
  );
}

/** Arrow keys and Enter over a filtered list. */
function usePicker<T>(items: T[], onPick: (item: T) => void, onMove?: (item: T) => void) {
  const [at, setAt] = useState(0);
  const list = useRef<HTMLUListElement>(null);
  useEffect(() => setAt((n) => Math.min(n, Math.max(0, items.length - 1))), [items.length]);
  useEffect(() => {
    if (items[at]) onMove?.(items[at]);
    list.current?.querySelector(`[data-at="${at}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [at, items]);
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || (e.key === 'n' && e.ctrlKey)) setAt((n) => Math.min(items.length - 1, n + 1));
    else if (e.key === 'ArrowUp' || (e.key === 'p' && e.ctrlKey)) setAt((n) => Math.max(0, n - 1));
    else if (e.key === 'Enter' && items[at]) onPick(items[at]);
    else return;
    e.preventDefault();
  };
  return { at, setAt, list, onKeyDown };
}

function Swatch({ theme }: { theme: Theme }) {
  const c = theme.colors;
  return (
    <span className="av-swatch" aria-hidden>
      {[c.bg, c.accent, c.success, c.warning, c.danger, c.info].map((colour, i) => (
        <i key={i} style={{ background: colour, outline: i === 0 ? `1px solid ${c.border}` : undefined }} />
      ))}
    </span>
  );
}

/** Where each theme's palette is from, as the picker says it. */
const SOURCES: Record<Theme['source'], string> = { omarchy: 'Omarchy', ooze: 'ooze', cursor: 'Cursor', haunt: 'haunt' };

export function ThemePicker({ current, onPreview, onPick, onClose }: { current: string; onPreview: (id: string) => void; onPick: (id: string) => void; onClose: () => void }) {
  const [filter, setFilter] = useState('');
  const shown = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return themes.filter((t) => !f || t.name.toLowerCase().includes(f) || t.id.includes(f) || (f === 'light' && !t.dark) || (f === 'dark' && t.dark));
  }, [filter]);
  const picker = usePicker(shown, (t) => onPick(t.id), (t) => onPreview(t.id));
  useEffect(() => {
    const i = shown.findIndex((t) => t.id === current);
    if (i >= 0) picker.setAt(i);
  }, []);
  return (
    <Sheet title="Themes" info={`${shown.length} of ${themes.length}`} keys={['↑↓ preview', '⏎ keep', 'esc back']} onClose={onClose}>
      <input className="av-filter" autoFocus placeholder="Find a theme, or type light or dark" value={filter} onChange={(e) => setFilter(e.target.value)} onKeyDown={picker.onKeyDown} />
      <ul className="av-list av-scroll" ref={picker.list} style={{ maxHeight: '58vh' }}>
        {shown.map((t, i) => (
          <li key={t.id} data-at={i} className={cx('av-item', i === picker.at && 'av-on')} onMouseEnter={() => picker.setAt(i)} onClick={() => onPick(t.id)}>
            <span>
              <b>{t.name}</b> <span className="av-sub">{t.dark ? 'dark' : 'light'} · {SOURCES[t.source]}</span>
              {t.id === current && <span className="av-sub"> · yours</span>}
            </span>
            <Swatch theme={t} />
          </li>
        ))}
      </ul>
    </Sheet>
  );
}

export function Finder({ canvases, current, onPick, onClose }: { canvases: CanvasInfo[]; current: string | null; onPick: (id: string) => void; onClose: () => void }) {
  const [filter, setFilter] = useState('');
  const shown = useMemo(() => {
    const words = filter.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return [...canvases]
      .filter((c) => words.every((w) => `${c.title} ${c.name} ${c.project} ${c.template ?? ''}`.toLowerCase().includes(w)))
      .sort((a, b) => b.modified - a.modified);
  }, [canvases, filter]);
  const picker = usePicker(shown, (c) => onPick(c.id));
  const now = Date.now();
  return (
    <Sheet title="Find a canvas" info={`${shown.length}`} keys={['↑↓ move', '⏎ open', 'esc close']} onClose={onClose}>
      <input className="av-filter" autoFocus placeholder="Its title, its name or its project" value={filter} onChange={(e) => setFilter(e.target.value)} onKeyDown={picker.onKeyDown} />
      <ul className="av-list av-scroll" ref={picker.list} style={{ maxHeight: '58vh' }}>
        {shown.map((c, i) => (
          <li key={c.id} data-at={i} className={cx('av-item', i === picker.at && 'av-on')} onMouseEnter={() => picker.setAt(i)} onClick={() => onPick(c.id)}>
            <span>
              <b>{c.title}</b> <span className="av-sub">{projectName(c.project)} · {c.template ?? 'custom'}</span>
              {c.id === current && <span className="av-sub"> · open</span>}
            </span>
            <span className="av-sub">{ago(c.modified, now)}</span>
          </li>
        ))}
        {!shown.length && <li className="av-item">Nothing matches.</li>}
      </ul>
    </Sheet>
  );
}

export function projectName(project: string) {
  return /\/\.atelier$/.test(project) ? '~/.atelier' : basename(project);
}

const KEYS: [string, string][] = [
  ['1 – 9', "Switch to this project's canvases, in the bar's order"],
  ['0', 'Every canvas, by project'],
  ['/', 'Find a canvas'],
  ['t', 'Pick a theme'],
  ['r', 'Background runs'],
  ['?', 'These keys'],
  ['esc', 'Close what is open'],
];

export function Help({ onClose }: { onClose: () => void }) {
  return (
    <Sheet title="Keys" onClose={onClose}>
      <div className="av-keys">
        {KEYS.map(([k, what]) => (
          <div key={k} style={{ display: 'contents' }}>
            <span>
              <Kbd>{k}</Kbd>
            </span>
            <Text tone="secondary">{what}</Text>
          </div>
        ))}
      </div>
      <Text tone="muted" size="sm">
        The keys work while the canvas has focus too, except in its text fields.
      </Text>
    </Sheet>
  );
}

export interface Ask {
  action: Action;
  canvas: CanvasInfo;
  resolve: (confirmed: Action | null) => void;
}

/**
 * Where an action waits for you. Its buttons ignore you for a moment after it
 * opens, so a canvas can't time an action to land under a click or a key
 * you were already making.
 */
export function Confirm({ ask, sessions, editor }: { ask: Ask; sessions: Session[]; editor: string }) {
  const { action, canvas } = ask;
  const [mode, setMode] = useState<'terminal' | 'background'>(action.type === 'startSession' ? (action.mode ?? 'terminal') : 'terminal');
  const [armed, setArmed] = useState(false);
  const go = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    go.current?.focus();
    const t = setTimeout(() => setArmed(true), 600);
    return () => clearTimeout(t);
  }, []);
  const confirm = () => armed && ask.resolve(action.type === 'startSession' ? { ...action, mode } : action);
  const cancel = () => ask.resolve(null);
  const session = (id: string) => sessions.find((s) => s.id === id);
  const named = (id: string) => session(id)?.title ?? id.slice(0, 8);

  let title = '';
  let verb = 'Run';
  let body: ReactNode = null;
  switch (action.type) {
    case 'startSession':
      title = 'Start Claude Code';
      verb = 'Start';
      body = (
        <>
          <Text tone="secondary">
            In <b>{projectName(canvas.project)}</b>, asked for by <b>{canvas.title}</b>:
          </Text>
          <pre className="av-confirm-prompt">{action.prompt}</pre>
          <div className="at-options" role="radiogroup" style={{ marginTop: 10 }}>
            {(['terminal', 'background'] as const).map((m) => (
              <label key={m} className="at-check">
                <input type="radio" name="mode" checked={mode === m} onChange={() => setMode(m)} />
                <span>{m === 'terminal' ? 'In a terminal tab' : 'In the background, with its steps here'}</span>
              </label>
            ))}
          </div>
        </>
      );
      break;
    case 'openSession':
      title = 'Open a session';
      verb = 'Open';
      body = (
        <Text tone="secondary">
          Resumes <b>{named(action.id)}</b> in a terminal tab, with <code className="at-code">claude --resume</code>.
        </Text>
      );
      break;
    case 'tell': {
      title = 'Message a session';
      verb = 'Send';
      const s = session(action.session);
      body = (
        <>
          <Text tone="secondary">
            To <b>{named(action.session)}</b>.{' '}
            {s?.status === 'working' ? "It's working, so it gets this when its turn ends." : "It isn't working, so it's resumed in the background with this."}
          </Text>
          <pre className="av-confirm-prompt">{action.text}</pre>
        </>
      );
      break;
    }
    case 'openFile':
      title = 'Open a file';
      verb = 'Open';
      body = (
        <Text tone="secondary">
          Opens <b>{action.path}</b>
          {action.line ? ` at line ${action.line}` : ''} with <code className="at-code">{editor}</code>.
        </Text>
      );
      break;
    case 'openUrl':
      title = 'Open a web page';
      verb = 'Open';
      body = (
        <>
          <Text tone="secondary">In a new tab:</Text>
          <pre className="av-confirm-prompt">{action.url}</pre>
        </>
      );
      break;
  }
  return (
    <div className="av-scrim">
      <div
        className="av-sheet"
        role="alertdialog"
        aria-modal="true"
        onKeyDown={(e) => {
          if (e.key === 'Escape') cancel();
          else if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'BUTTON') confirm();
          else return;
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <Panel title={title} info={canvas.title} tone="warning" focus>
          {body}
          <div className="av-buttons">
            <button type="button" className="at-button" onClick={cancel}>
              Cancel <Kbd>esc</Kbd>
            </button>
            <button type="button" ref={go} className={cx('at-button', 'at-t-accent', 'at-v-solid')} aria-disabled={!armed} style={{ opacity: armed ? 1 : 0.55 }} onClick={confirm}>
              {verb} <Kbd>⏎</Kbd>
            </button>
          </div>
        </Panel>
      </div>
    </div>
  );
}

const STATUS_TONE = { running: 'info', done: 'success', failed: 'danger', stopped: 'muted' } as const;

export function Runs({ runs, onResume, onStop, onClose }: { runs: Run[]; onResume: (run: Run) => void; onStop: (run: Run) => void; onClose: () => void }) {
  const sorted = [...runs].sort((a, b) => b.started - a.started);
  const [open, setOpen] = useState<string | null>(sorted[0]?.id ?? null);
  const now = Date.now();
  return (
    <Sheet title="Runs" info={`${runs.filter((r) => r.status === 'running').length} running`} side onClose={onClose}>
      <div className="av-scroll">
        {!sorted.length && (
          <Text tone="muted">
            No background runs yet. A canvas starts one when you confirm an action to run in the background.
          </Text>
        )}
        {sorted.map((run) => (
          <div key={run.id} className={cx('av-run', open === run.id && 'av-on')}>
            <div className="av-run-head" onClick={() => setOpen(open === run.id ? null : run.id)}>
              <Badge tone={STATUS_TONE[run.status]} dot>
                {run.status}
              </Badge>
              <span className="av-run-title">{run.prompt.split('\n')[0]}</span>
              <span className="av-sub">{ago(run.started, now)}</span>
            </div>
            {open === run.id && (
              <>
                <ol className="av-steps">
                  {run.steps.map((step, i) => (
                    <li key={i} className={`av-step-${step.kind}`}>
                      <span>{clock(step.at)}</span>
                      <pre>{step.text}</pre>
                    </li>
                  ))}
                  {!run.steps.length && <li>Starting…</li>}
                </ol>
                <div className="av-buttons">
                  {run.status === 'running' && (
                    <Button size="sm" tone="danger" onClick={() => onStop(run)}>
                      Stop
                    </Button>
                  )}
                  <Button size="sm" disabled={!run.session || run.status === 'running'} onClick={() => onResume(run)}>
                    Open in a terminal
                  </Button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </Sheet>
  );
}

function clock(at: number) {
  const d = new Date(at);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export interface Doc {
  path: string;
  canvas?: string;
}

/** Shows an image, a video, a PDF or a Markdown file a canvas opened. */
export function DocumentView({ doc, onClose }: { doc: Doc; onClose: () => void }) {
  const [shown, setShown] = useState<{ url?: string; text?: string; error?: string } | null>(null);
  const kind = kindOf(doc.path);
  useEffect(() => {
    let url: string | undefined;
    let gone = false;
    readFile(doc.canvas, doc.path).then(
      ({ mime, bytes }) => {
        if (gone) return;
        if (kind === 'markdown') setShown({ text: absoluteImages(new TextDecoder().decode(bytes), dirname(doc.path)) });
        else setShown({ url: (url = URL.createObjectURL(new Blob([bytes], { type: mime }))) });
      },
      (e: Error) => !gone && setShown({ error: e.message }),
    );
    return () => {
      gone = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [doc.path, doc.canvas]);
  return (
    <Sheet title={basename(doc.path)} info={doc.path.includes('/') ? doc.path : undefined} full onClose={onClose}>
      <div className={cx('av-doc', 'av-scroll', kind === 'markdown' && 'av-doc-top')}>
        {!shown && <Text tone="muted">Opening…</Text>}
        {shown?.error && <Text tone="danger">{shown.error}</Text>}
        {shown?.url && kind === 'image' && <img src={shown.url} alt={basename(doc.path)} />}
        {shown?.url && kind === 'video' && <video src={shown.url} controls autoPlay />}
        {shown?.url && kind === 'pdf' && <iframe src={shown.url} title={basename(doc.path)} />}
        {shown?.text !== undefined && (
          <div className="av-doc-md">
            <Markdown>{shown.text}</Markdown>
          </div>
        )}
      </div>
    </Sheet>
  );
}

/** Makes a Markdown file's relative image paths absolute, so they're found beside it. */
function absoluteImages(text: string, folder: string) {
  return text.replace(/(!\[[^\]]*\]\()(?!https?:|data:|\/|~)([^)\s]+)/g, (_, head: string, rel: string) => `${head}${folder}/${rel.replace(/^\.\//, '')}`);
}

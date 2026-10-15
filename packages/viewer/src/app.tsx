// The viewer: the bar, the canvas on screen in its sealed frame, and the
// overlays. It follows the daemon's events, keeps the canvas's state in step
// with its file, and is the only way a canvas reaches anything outside.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { themeById, cssVariables, type Theme } from '@atelier/themes';
import { Panel, Stack, Text } from '../../kit/src/index.ts';
import { connect as connectBridge, receive as bridgeReceive } from '../../kit/src/bridge.ts';
import { api, kindOf, readFile, VIEWABLE } from './api.ts';
import { Bar, Home, type Link } from './chrome.tsx';
import { FrameHost, type Init } from './frames.ts';
import { Confirm, DocumentView, Finder, Help, Runs, ThemePicker, type Ask, type Doc } from './overlays.tsx';
import type { Action, ActionResult, Built, CanvasInfo, Problem, Run, RunStep, Session, Settings } from './types.ts';

type Overlay = 'themes' | 'find' | 'help' | 'runs' | null;

interface Entry {
  id: string;
  version: string;
  state: Record<string, unknown>;
  /** Keys with writes on their way to the daemon, which its echoes mustn't undo. */
  pending: Map<string, number>;
  scroll: [number, number];
}

const idFromHash = () => new URLSearchParams(location.hash.slice(1)).get('c');

function savedScroll(id: string): [number, number] {
  try {
    const s = JSON.parse(sessionStorage.getItem(`scroll:${id}`) ?? 'null');
    if (Array.isArray(s) && s.length === 2) return [Number(s[0]) || 0, Number(s[1]) || 0];
  } catch {}
  return [0, 0];
}

function applyTheme(theme: Theme) {
  let style = document.getElementById('av-theme');
  if (!style) {
    style = document.createElement('style');
    style.id = 'av-theme';
    document.head.append(style);
  }
  style.textContent = `:root { ${cssVariables(theme)} }`;
}

/** Whether an action from a canvas is one the viewer knows, with its parts the right shape. */
function validAction(raw: unknown): Action | null {
  if (!raw || typeof raw !== 'object') return null;
  const a = raw as Record<string, unknown>;
  const text = (v: unknown, max: number) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
  switch (a.type) {
    case 'startSession':
      return text(a.prompt, 50_000) && (a.mode === undefined || a.mode === 'terminal' || a.mode === 'background') ? { type: 'startSession', prompt: a.prompt as string, mode: a.mode as 'terminal' | 'background' | undefined } : null;
    case 'openSession':
      return text(a.id, 200) ? { type: 'openSession', id: a.id as string } : null;
    case 'tell':
      return text(a.session, 200) && text(a.text, 50_000) ? { type: 'tell', session: a.session as string, text: a.text as string } : null;
    case 'openFile':
      return text(a.path, 4096) && (a.line === undefined || (Number.isInteger(a.line) && (a.line as number) > 0)) ? { type: 'openFile', path: a.path as string, line: a.line as number | undefined } : null;
    case 'openUrl':
      return text(a.url, 4096) && /^https?:\/\//i.test(a.url as string) ? { type: 'openUrl', url: a.url as string } : null;
  }
  return null;
}

let toastCount = 0;

export function App() {
  const [canvases, setCanvases] = useState<CanvasInfo[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [link, setLink] = useState<Link>('connecting');
  const [current, setCurrent] = useState<string | null>(idFromHash);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [problems, setProblems] = useState<Problem[] | null>(null);
  const [crash, setCrash] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const [ask, setAsk] = useState<Ask | null>(null);
  const [doc, setDoc] = useState<Doc | null>(null);
  const [toasts, setToasts] = useState<{ id: number; text: string; tone: string }[]>([]);

  const theme = themeById(preview ?? settings?.theme);
  const entry = useRef<Entry | null>(null);
  const host = useRef<FrameHost | null>(null);
  const main = useRef<HTMLDivElement>(null);
  const live = useRef({ current, canvases, sessions, theme, ask: ask as Ask | null });
  live.current = { current, canvases, sessions, theme, ask };

  const canvas = canvases.find((c) => c.id === current) ?? null;
  const project = canvas?.project ?? null;
  const workspaces = useMemo(() => (project ? canvases.filter((c) => c.project === project).sort((a, b) => a.name.localeCompare(b.name)) : []), [canvases, project]);

  const toast = useCallback((text: string, tone = 'accent') => {
    const id = ++toastCount;
    setToasts((t) => [...t.slice(-3), { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  const go = useCallback((id: string | null) => {
    setOverlay(null);
    if (id) location.hash = `c=${id}`;
    else history.pushState(null, '', location.pathname);
    setCurrent(id);
  }, []);

  useEffect(() => {
    const onHash = () => setCurrent(idFromHash());
    addEventListener('hashchange', onHash);
    addEventListener('popstate', onHash);
    return () => {
      removeEventListener('hashchange', onHash);
      removeEventListener('popstate', onHash);
    };
  }, []);

  useEffect(() => applyTheme(theme), [theme]);
  useEffect(() => host.current?.post({ type: 'theme', theme }), [theme]);
  useEffect(() => host.current?.post({ type: 'sessions', sessions }), [sessions]);
  useEffect(() => {
    document.title = canvas ? `${canvas.title} · Atelier` : 'Atelier';
  }, [canvas?.title]);

  // The viewer's own Markdown (the document viewer) asks for its images the way a canvas does.
  useEffect(() => {
    connectBridge(
      (m) => {
        if (m.type !== 'file') return;
        readFile(live.current.current ?? undefined, String(m.path)).then(
          ({ mime, bytes }) => bridgeReceive({ type: 'reply', id: m.id, ok: true, mime, bytes }),
          (e: Error) => bridgeReceive({ type: 'reply', id: m.id, ok: false, message: e.message }),
        );
      },
      {},
    );
  }, []);

  /**
   * Loads the canvas on screen, or its new version. A load asked for while
   * one for the same canvas is on its way becomes one more check after it,
   * so a canvas is never booted twice for the same version.
   */
  const loading = useRef<{ id: string; again: boolean } | null>(null);
  const load = useCallback(async function load(id: string, fresh: boolean): Promise<void> {
    if (loading.current?.id === id) {
      loading.current.again = true;
      return;
    }
    const mine = { id, again: false };
    loading.current = mine;
    try {
      await fetchCanvas(id, fresh);
    } finally {
      if (loading.current === mine) loading.current = null;
      if (mine.again && live.current.current === id) await load(id, false);
    }
  }, []);

  const fetchCanvas = async (id: string, fresh: boolean) => {
    const known = !fresh && entry.current?.id === id ? entry.current : null;
    let res: Response;
    try {
      res = await fetch(`/api/canvas?id=${encodeURIComponent(id)}`, { headers: known ? { 'if-none-match': `"${known.version}"` } : {}, cache: 'no-store' });
    } catch {
      return;
    }
    if (live.current.current !== id || res.status === 304) return;
    if (res.status === 404) {
      host.current?.clear();
      entry.current = null;
      setMissing(true);
      return;
    }
    const body = (await res.json()) as { built: Built; state: Record<string, unknown>; error?: string };
    if (live.current.current !== id || !body.built) return;
    setMissing(false);
    const e: Entry = known ?? { id, version: '', state: body.state ?? {}, pending: new Map(), scroll: savedScroll(id) };
    e.version = body.built.version;
    entry.current = e;
    if (body.built.kind === 'problem') {
      setProblems(body.built.problems);
      if (!known) host.current?.clear();
      return;
    }
    setProblems(null);
    setCrash(null);
    const built = body.built;
    host.current?.show(
      (): Init => ({
        canvas: built.kind === 'module' ? { kind: 'module', code: built.code } : { kind: 'template', template: built.template, data: built.data },
        state: e.state,
        sessions: live.current.sessions,
        theme: live.current.theme,
        scroll: e.scroll,
      }),
    );
  };

  useEffect(() => {
    entry.current = null;
    setProblems(null);
    setCrash(null);
    setMissing(false);
    host.current?.clear();
    if (current) load(current, true);
  }, [current, load]);

  /** What the frame asks of the viewer. */
  const runAction = useCallback(
    async (raw: unknown): Promise<ActionResult> => {
      const action = validAction(raw);
      const here = live.current.canvases.find((c) => c.id === live.current.current);
      if (!action || !here) return { ok: false, message: "That isn't an action Atelier knows." };
      if (action.type === 'openFile' && VIEWABLE.test(action.path)) {
        setDoc({ path: action.path, canvas: here.id });
        return { ok: true, message: 'Opened in the viewer.' };
      }
      if (live.current.ask) return { ok: false, message: 'Another action is waiting for you.' };
      const confirmed = await new Promise<Action | null>((resolve) => setAsk({ action, canvas: here, resolve }));
      setAsk(null);
      host.current?.focus();
      if (!confirmed) return { ok: false, message: 'You turned it down.' };
      if (confirmed.type === 'openUrl') {
        open(confirmed.url, '_blank', 'noopener,noreferrer');
        return { ok: true, message: 'Opened in a new tab.' };
      }
      try {
        const result = await api<ActionResult>('POST', '/api/action', { canvas: here.id, action: confirmed });
        toast(result.message, result.ok ? 'success' : 'danger');
        return result;
      } catch (e) {
        toast((e as Error).message, 'danger');
        return { ok: false, message: (e as Error).message };
      }
    },
    [toast],
  );

  const keys = useRef<(key: string) => void>(() => {});
  keys.current = (key: string) => {
    if (live.current.ask) return;
    if (key === 'Escape') {
      if (overlay === 'themes') setPreview(null);
      setOverlay(null);
      setDoc(null);
      return;
    }
    if (overlay || doc) return;
    if (key === '0') return go(null);
    if (/^[1-9]$/.test(key)) {
      const w = workspaces[Number(key) - 1];
      if (w) go(w.id);
      return;
    }
    const next = ({ t: 'themes', '/': 'find', r: 'runs', '?': 'help' } as const)[key as 't'];
    if (next) setOverlay(next);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const typing = e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable]');
      if (e.key !== 'Escape' && typing) return;
      if (/^[0-9tr/?]$/.test(e.key) || e.key === 'Escape') {
        e.preventDefault();
        keys.current(e.key);
      }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, []);

  // The frames, made once, and told what to do through the latest closures.
  const handlers = useRef({ runAction, toast });
  handlers.current = { runAction, toast };
  useEffect(() => {
    const h = new FrameHost(main.current!, {
      setState(key, value) {
        const e = entry.current;
        if (!e) return;
        e.state = { ...e.state, [key]: value };
        e.pending.set(key, (e.pending.get(key) ?? 0) + 1);
        api('PUT', `/api/state?id=${encodeURIComponent(e.id)}`, { key, value })
          .catch((failure: Error) => handlers.current.toast(`Not saved: ${failure.message}`, 'danger'))
          .finally(() => {
            const n = (e.pending.get(key) ?? 1) - 1;
            if (n > 0) e.pending.set(key, n);
            else e.pending.delete(key);
          });
      },
      file: (path) => readFile(entry.current?.id, path),
      action: (raw) => handlers.current.runAction(raw),
      scroll(x, y) {
        const e = entry.current;
        if (!e) return;
        e.scroll = [x, y];
        sessionStorage.setItem(`scroll:${e.id}`, JSON.stringify(e.scroll));
      },
      error: (message) => setCrash(message),
      shown: (error) => setCrash(error),
      key: (key) => keys.current(key),
    });
    host.current = h;
    return () => h.destroy();
  }, []);

  // The daemon's news.
  useEffect(() => {
    const events = new EventSource('/api/events');
    const on = <T,>(type: string, handle: (data: T) => void) => events.addEventListener(type, (e) => handle(JSON.parse((e as MessageEvent).data)));
    events.onopen = () => setLink('live');
    events.onerror = () => {
      setLink('lost');
      if (events.readyState === EventSource.CLOSED) {
        fetch('/api/status', { cache: 'no-store' }).then(
          (res) => setLink(res.status === 401 ? 'signed-out' : 'lost'),
          () => setLink('lost'),
        );
      }
    };
    on<{ canvases: CanvasInfo[]; sessions: Session[]; settings: Settings; runs: Run[] }>('hello', (d) => {
      setCanvases(d.canvases);
      setSessions(d.sessions);
      setSettings(d.settings);
      setRuns(d.runs);
      setLink('live');
      if (live.current.current) load(live.current.current, false);
    });
    on<{ canvases: CanvasInfo[] }>('canvases', (d) => setCanvases(d.canvases));
    on<{ id: string }>('canvas', (d) => d.id === live.current.current && load(d.id, false));
    on<{ id: string; state: Record<string, unknown> }>('state', (d) => {
      const e = entry.current;
      if (!e || e.id !== d.id) return;
      const merged: Record<string, unknown> = { ...d.state };
      for (const key of e.pending.keys()) {
        if (key in e.state) merged[key] = e.state[key];
        else delete merged[key];
      }
      if (JSON.stringify(merged) === JSON.stringify(e.state)) return;
      e.state = merged;
      host.current?.post({ type: 'state', state: merged });
    });
    on<{ sessions: Session[] }>('sessions', (d) => setSessions(d.sessions));
    on<{ runs: Run[] }>('runs', (d) => setRuns(d.runs));
    on<{ id: string; step: RunStep }>('run', (d) => setRuns((list) => list.map((r) => (r.id === d.id ? { ...r, steps: [...r.steps, d.step].slice(-500) } : r))));
    on<Settings>('settings', (d) => setSettings(d));
    on<{ id: string }>('show', (d) => {
      if (d.id !== live.current.current) go(d.id);
      focus();
    });
    return () => events.close();
  }, [load, go]);

  const pickTheme = (id: string) => {
    setOverlay(null);
    setPreview(null);
    setSettings((s) => (s ? { ...s, theme: id } : s));
    api<Settings>('PUT', '/api/settings', { theme: id }).catch((e: Error) => toast(e.message, 'danger'));
  };

  const resume = (run: Run) => {
    if (!run.session || !run.canvas) return;
    api<ActionResult>('POST', '/api/action', { canvas: run.canvas, action: { type: 'openSession', id: run.session } }).then(
      (r) => toast(r.message, r.ok ? 'success' : 'danger'),
      (e: Error) => toast(e.message, 'danger'),
    );
  };

  const trouble = problems ?? (crash ? [{ file: '', line: 0, column: 0, message: crash }] : null);
  return (
    <div className="av">
      <Bar workspaces={workspaces} current={canvas} project={project} sessions={sessions} runs={runs} theme={theme} link={link} onPick={go} onOpen={(o) => setOverlay(o)} />
      <main className="av-main">
        <div className="av-frames" ref={main} />
        {!current && <Home canvases={canvases} sessions={sessions} onPick={go} />}
        {current && (missing || (link === 'live' && !canvas)) && (
          <div className="av-page">
            <Panel title="Not found" tone="warning">
              <Text>That canvas isn't here any more. Press 0 for every canvas, or / to find one.</Text>
            </Panel>
          </div>
        )}
      </main>
      {trouble && (
        <div className="av-strip">
          <Panel title={problems ? "This canvas doesn't build" : 'This canvas stopped with an error'} info={problems ? 'showing the last version that did' : undefined} tone="danger">
            <Stack gap={4}>
              {trouble.map((p, i) => (
                <pre key={i}>
                  {p.file && <span className="av-where">{`${p.file.split('/').slice(-2).join('/')}:${p.line}:${p.column} `}</span>}
                  {p.message}
                </pre>
              ))}
              {problems && (
                <Text tone="muted" size="sm">
                  The agent that wrote it is told the same, and the canvas reloads once it's fixed.
                </Text>
              )}
            </Stack>
          </Panel>
        </div>
      )}
      {overlay === 'themes' && <ThemePicker current={settings?.theme ?? theme.id} onPreview={setPreview} onPick={pickTheme} onClose={() => (setPreview(null), setOverlay(null))} />}
      {overlay === 'find' && <Finder canvases={canvases} current={current} onPick={go} onClose={() => setOverlay(null)} />}
      {overlay === 'help' && <Help onClose={() => setOverlay(null)} />}
      {overlay === 'runs' && (
        <Runs
          runs={runs}
          onResume={resume}
          onStop={(run) => api('POST', '/api/runs/stop', { id: run.id }).catch((e: Error) => toast(e.message, 'danger'))}
          onClose={() => setOverlay(null)}
        />
      )}
      {doc && kindOf(doc.path) && <DocumentView doc={doc} onClose={() => setDoc(null)} />}
      {ask && <Confirm ask={ask} sessions={sessions} editor={settings?.editor ?? 'open'} />}
      <div className="av-toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`av-toast at-t-${t.tone}`}>
            {t.text}
          </div>
        ))}
      </div>
    </div>
  );
}

// The daemon's HTTP server, on 127.0.0.1 only: the viewer, the sealed frame's
// page, the kit runtime, and the API the viewer, the CLI and the MCP server
// use. docs/security.md says who may ask for what.

import { randomBytes, timingSafeEqual } from 'node:crypto';
import { existsSync, readFileSync, realpathSync, rmSync, statSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { dirname, join, resolve } from 'node:path';
import { Delivered, changesSince } from './sync.ts';
import { spawn } from 'node:child_process';
import { check } from './check.ts';
import { DIST, ensureHome, paths, readJson, writeJson } from './home.ts';
import { Library, projectOf, type CanvasInfo } from './library.ts';
import { Refused, foldersFor, readAllowed } from './files.ts';
import { Sessions } from './sessions.ts';
import { eventsSince, matches, readState, setState, stateFile, type StateEvent } from './state.ts';
import { loadSettings, saveSettings } from './settings.ts';
import * as actions from './actions.ts';

export const VERSION = '0.1.0';

export interface DaemonInfo {
  pid: number;
  port: number;
  token: string;
  version: string;
  started: string;
}

const VIEWER_POLICY =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; media-src 'self' blob:; font-src 'self' data:; connect-src 'self'; frame-src 'self' blob:; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
const FRAME_POLICY =
  "default-src 'none'; script-src 'unsafe-inline' blob: data:; style-src 'unsafe-inline'; img-src data: blob:; font-src data: blob:; media-src data: blob:; form-action 'none'; base-uri 'none'; frame-ancestors 'self'";

const INDEX = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Atelier</title>
  <link rel="icon" href="data:,">
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/viewer.js"></script>
</body>
</html>
`;

class Hub {
  private clients = new Set<ServerResponse>();
  add(res: ServerResponse) {
    this.clients.add(res);
    res.on('close', () => this.clients.delete(res));
  }
  get viewers() {
    return this.clients.size;
  }
  send(type: string, data: unknown) {
    const text = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const c of this.clients) c.write(text);
  }
  ping() {
    for (const c of this.clients) c.write(': ping\n\n');
  }
}

interface Waiter {
  id: string;
  keys?: string[];
  resolve: (events: StateEvent[]) => void;
}

function json(res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) {
  const text = JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...headers });
  res.end(text);
}

function body(req: IncomingMessage, limit = 8 << 20): Promise<unknown> {
  return new Promise((done, fail) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => {
      size += c.length;
      if (size > limit) {
        fail(new Refused(413, 'That request is too big.'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => {
      try {
        done(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {});
      } catch {
        fail(new Refused(400, "That request isn't JSON."));
      }
    });
    req.on('error', fail);
  });
}

function same(a: string | undefined, b: string) {
  if (!a || a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/** Opens a URL in your browser, without a shell. */
export function openBrowser(url: string) {
  const [cmd, args] = process.platform === 'darwin' ? ['open', [url]] : process.platform === 'win32' ? ['cmd', ['/c', 'start', '', url]] : ['xdg-open', [url]];
  spawn(cmd as string, args as string[], { stdio: 'ignore', detached: true }).unref();
}

export async function serve(options: { port?: number } = {}) {
  ensureHome();
  const token = randomBytes(24).toString('hex');
  const library = new Library();
  const sessions = new Sessions();
  const hub = new Hub();
  const waiters = new Set<Waiter>();
  const delivered = new Delivered(join(dirname(paths.sessions), 'delivered.json'));

  /** The canvas a tool just wrote, by its real path, from a PostToolUse hook's input. */
  const canvasWritten = (input: Record<string, unknown>): string | null => {
    const file = (input.tool_input as { file_path?: unknown } | undefined)?.file_path;
    if (typeof file !== 'string') return null;
    const path = resolve(typeof input.cwd === 'string' ? input.cwd : process.cwd(), file);
    if (!/\/\.atelier\/[^/]+\.canvas\.(tsx|json)$/.test(path)) return null;
    try {
      return realpathSync(path);
    } catch {
      return null;
    }
  };
  let port = 0;

  library.start();
  library.on('list', () => hub.send('canvases', { canvases: library.list() }));
  library.on('canvas', (id: string) => hub.send('canvas', { id }));
  library.on('state', (id: string, state: unknown) => hub.send('state', { id, state }));
  sessions.on('change', () => hub.send('sessions', { sessions: sessions.list() }));
  const runs = actions.runs;
  runs?.on('change', () => hub.send('runs', { runs: runs.list() }));
  runs?.on('step', (id: string, step: unknown) => hub.send('run', { id, step }));
  setInterval(() => hub.ping(), 20_000).unref();

  const cookie = () => `atelier_${port}`;
  const hosts = () => [`127.0.0.1:${port}`, `localhost:${port}`];
  const origins = () => hosts().map((h) => `http://${h}`);

  const authorised = (req: IncomingMessage): 'cookie' | 'token' | null => {
    const header = req.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (same(header, token)) return 'token';
    const cookies = Object.fromEntries((req.headers.cookie ?? '').split(';').map((c) => c.trim().split('=').map(decodeURIComponent)));
    return same(cookies[cookie()], token) ? 'cookie' : null;
  };

  /** Shows a canvas: in the viewer if one is open, and otherwise in a new browser tab. */
  const show = (canvas: CanvasInfo | undefined, open: boolean) => {
    if (hub.viewers > 0) {
      if (canvas) hub.send('show', { id: canvas.id });
      return { shown: true, opened: false };
    }
    if (open && loadSettings().autoOpen) {
      openBrowser(`http://127.0.0.1:${port}/?t=${token}${canvas ? `&c=${canvas.id}` : ''}`);
      return { shown: true, opened: true };
    }
    return { shown: false, opened: false };
  };

  const canvasFor = (url: URL) => {
    const canvas = library.byId(url.searchParams.get('id') ?? '');
    if (!canvas) throw new Refused(404, "There's no such canvas.");
    return canvas;
  };

  const register = (given: string) => {
    // The library knows canvases by their real paths, so /tmp and /private/tmp are one.
    let path = given;
    try {
      path = realpathSync(given);
    } catch {}
    const project = projectOf(path);
    if (project) library.addProject(project);
    library.rescan();
    return library.byPath(path);
  };

  async function route(req: IncomingMessage, res: ServerResponse) {
    const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
    if (!hosts().includes(req.headers.host ?? '')) return json(res, 421, { error: 'Atelier only answers at 127.0.0.1.' });

    if (url.pathname === '/frame.html') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'content-security-policy': FRAME_POLICY, 'cache-control': 'no-cache', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer' });
      return res.end(readFileSync(join(DIST, 'static/frame.html')));
    }

    if (url.pathname === '/' && url.searchParams.has('t')) {
      if (!same(url.searchParams.get('t') ?? undefined, token)) return json(res, 401, { error: 'That link has expired. Run `atelier open` for a new one.' });
      const canvas = url.searchParams.get('c');
      res.writeHead(302, { 'set-cookie': `${cookie()}=${token}; HttpOnly; SameSite=Strict; Path=/`, location: canvas ? `/#c=${canvas}` : '/', 'cache-control': 'no-store' });
      return res.end();
    }

    const auth = authorised(req);
    if (!auth) {
      if (url.pathname === '/') {
        res.writeHead(401, { 'content-type': 'text/html; charset=utf-8' });
        return res.end('<!doctype html><meta charset="utf-8"><title>Atelier</title><body style="font:14px monospace;padding:2em">Open Atelier from your terminal with <b>atelier open</b>.</body>');
      }
      return json(res, 401, { error: 'Open Atelier from your terminal with `atelier open`.' });
    }
    if (req.method !== 'GET' && auth === 'cookie' && !origins().includes(String(req.headers.origin ?? ''))) return json(res, 403, { error: 'That request came from another page.' });

    if (req.method === 'GET' && url.pathname === '/') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'content-security-policy': VIEWER_POLICY, 'cache-control': 'no-cache', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer' });
      return res.end(INDEX);
    }
    if (req.method === 'GET' && (url.pathname === '/viewer.js' || url.pathname === '/runtime.js')) {
      const file = join(DIST, url.pathname.slice(1));
      const tag = `"${statSync(file).mtimeMs.toString(36)}"`;
      if (req.headers['if-none-match'] === tag) return res.writeHead(304).end();
      res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8', etag: tag, 'cache-control': 'no-cache', 'x-content-type-options': 'nosniff' });
      return res.end(readFileSync(file));
    }

    const api = `${req.method} ${url.pathname}`;
    switch (api) {
      case 'GET /api/status':
        return json(res, 200, { version: VERSION, pid: process.pid, port, home: paths.daemon.replace(/\/daemon\.json$/, ''), projects: library.roots(), canvases: library.list().length, viewers: hub.viewers, sessions: sessions.list().length });
      case 'GET /api/canvases':
        return json(res, 200, { canvases: library.list(), projects: library.roots() });
      case 'GET /api/canvas': {
        const canvas = canvasFor(url);
        const built = await library.build(canvas.id);
        if (!built) throw new Refused(404, "There's no such canvas.");
        const tag = `"${built.version}"`;
        if (req.headers['if-none-match'] === tag) return res.writeHead(304, { etag: tag }).end();
        return json(res, built.kind === 'problem' ? 422 : 200, { canvas, built, state: readState(canvas.path) }, { etag: tag });
      }
      case 'GET /api/state': {
        const canvas = canvasFor(url);
        return json(res, 200, { state: readState(canvas.path), events: eventsSince(canvas.path, url.searchParams.get('since') ?? undefined), file: stateFile(canvas.path) });
      }
      case 'PUT /api/state': {
        const canvas = canvasFor(url);
        const { key, value } = (await body(req)) as { key?: unknown; value?: unknown };
        if (typeof key !== 'string' || !key || key.length > 200) throw new Refused(400, 'A state key has to be text.');
        library.quietly(stateFile(canvas.path));
        const { state, event } = await setState(canvas.path, key, value === undefined ? null : value);
        hub.send('state', { id: canvas.id, state });
        for (const w of waiters) if (w.id === canvas.id && matches(event, w.keys)) w.resolve([event]);
        return json(res, 200, { ok: true });
      }
      case 'GET /api/file': {
        const canvas = library.byId(url.searchParams.get('canvas') ?? '');
        const folders = canvas ? foldersFor(canvas.path) : [paths.canvases];
        const { bytes, mime } = readAllowed(url.searchParams.get('path') ?? '', folders, library.allowedRoots());
        res.writeHead(200, { 'content-type': mime, 'content-length': bytes.length, 'cache-control': 'private, no-store', 'x-content-type-options': 'nosniff', 'content-security-policy': "default-src 'none'; sandbox" });
        return res.end(bytes);
      }
      case 'GET /api/settings':
        return json(res, 200, loadSettings());
      case 'PUT /api/settings': {
        const settings = saveSettings((await body(req)) as never);
        hub.send('settings', settings);
        return json(res, 200, settings);
      }
      case 'GET /api/events': {
        res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive', 'x-accel-buffering': 'no' });
        res.write(`event: hello\ndata: ${JSON.stringify({ canvases: library.list(), sessions: sessions.list(), settings: loadSettings(), runs: runs?.list() ?? [], version: VERSION })}\n\n`);
        hub.add(res);
        return;
      }
      case 'GET /api/sessions':
        return json(res, 200, { sessions: sessions.list() });
      case 'POST /api/open': {
        const { path, id, show: andShow = true } = (await body(req)) as { path?: string; id?: string; show?: boolean };
        const canvas = path ? register(path) : id ? library.byId(id) : undefined;
        if ((path || id) && !canvas) throw new Refused(404, path ? `${path} isn't a canvas: canvases live in a project's .atelier folder, named <name>.canvas.tsx or <name>.canvas.json.` : "There's no such canvas.");
        const shown = andShow ? show(canvas, true) : { shown: false, opened: false };
        return json(res, 200, { ...shown, canvas, url: `http://127.0.0.1:${port}/?t=${token}${canvas ? `&c=${canvas.id}` : ''}` });
      }
      case 'POST /api/check': {
        const { path, show: andShow } = (await body(req)) as { path?: string; show?: boolean };
        if (!path) throw new Refused(400, 'Say which canvas to check.');
        const checked = await check(path);
        const canvas = register(path);
        let shown = null;
        if (checked.ok && andShow && canvas) shown = show(canvas, true);
        return json(res, 200, { ...checked, canvas, shown });
      }
      case 'POST /api/hook': {
        const { event, input } = (await body(req)) as { event?: string; input?: Record<string, unknown> };
        if (typeof event !== 'string' || !input) throw new Refused(400, 'A hook sends its event and its input.');
        if (typeof input.cwd === 'string' && event === 'SessionStart') library.addProject(input.cwd);
        const messages = sessions.hook(event, input);
        const id = typeof input.session_id === 'string' ? input.session_id : '';
        const written = event === 'PostToolUse' ? canvasWritten(input) : null;
        if (id && written) sessions.own(id, written);
        // When a prompt is sent, a turn ends or a session resumes, it hears what the user did on its canvases since it last heard.
        let news: string[] = [];
        const session = id ? sessions.get(id) : undefined;
        if (session && (event === 'UserPromptSubmit' || event === 'Stop' || (event === 'SessionStart' && input.source === 'resume'))) {
          news = changesSince(session.canvases ?? [], session.synced, delivered);
          if (session.canvases?.length) sessions.heard(id);
        }
        return json(res, 200, { messages, news });
      }
      case 'POST /api/action': {
        const { canvas: id, action } = (await body(req)) as { canvas?: string; action?: actions.Action };
        const canvas = library.byId(id ?? '');
        if (!canvas || !action || typeof action !== 'object') throw new Refused(400, 'An action needs its canvas and what to do.');
        return json(res, 200, await actions.runAction(canvas, action, { sessions, library, port, token }));
      }
      case 'GET /api/runs':
        return json(res, 200, { runs: runs?.list() ?? [] });
      case 'POST /api/runs/stop': {
        const { id } = (await body(req)) as { id?: string };
        if (!runs?.stop(id ?? '')) throw new Refused(404, "That run isn't running.");
        return json(res, 200, { ok: true });
      }
      case 'GET /api/run': {
        const run = runs?.get(url.searchParams.get('id') ?? '');
        if (!run) throw new Refused(404, "There's no such run.");
        return json(res, 200, run);
      }
      case 'GET /api/wait': {
        const canvas = canvasFor(url);
        const keys = url.searchParams.get('keys')?.split(',').filter(Boolean);
        const since = url.searchParams.get('since') ?? undefined;
        const timeout = Math.min(3600, Math.max(1, Number(url.searchParams.get('timeout') ?? 600))) * 1000;
        const already = eventsSince(canvas.path, since).filter((e) => matches(e, keys));
        if (since && already.length) {
          delivered.add(canvas.path, already);
          return json(res, 200, { events: already, state: readState(canvas.path), timedOut: false });
        }
        const events = await new Promise<StateEvent[]>((resolve) => {
          const waiter: Waiter = { id: canvas.id, keys, resolve };
          const timer = setTimeout(() => resolve([]), timeout);
          waiter.resolve = (e) => {
            clearTimeout(timer);
            waiters.delete(waiter);
            resolve(e);
          };
          waiters.add(waiter);
          req.on('close', () => waiter.resolve([]));
        });
        delivered.add(canvas.path, events);
        return json(res, 200, { events, state: readState(canvas.path), timedOut: events.length === 0 });
      }
      case 'POST /api/stop':
        json(res, 200, { ok: true });
        return setTimeout(() => shutdown(), 50);
    }
    return json(res, 404, { error: 'There is nothing here.' });
  }

  const server = createServer((req, res) => {
    route(req, res).catch((e) => {
      if (res.headersSent) return res.end();
      if (e instanceof Refused) return json(res, e.status, { error: e.message });
      json(res, 500, { error: String((e as Error)?.message ?? e) });
    });
  });
  server.requestTimeout = 0;
  server.headersTimeout = 30_000;

  const wanted = options.port ?? Number(process.env.ATELIER_PORT ?? 7380);
  for (let p = wanted; ; p++) {
    try {
      await new Promise<void>((ok, fail) => {
        server.once('error', fail);
        server.listen(p, '127.0.0.1', () => {
          server.off('error', fail);
          ok();
        });
      });
      port = p;
      break;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'EADDRINUSE' || p > wanted + 20 || options.port === 0) throw e;
    }
  }
  port = (server.address() as { port: number }).port;
  const info: DaemonInfo = { pid: process.pid, port, token, version: VERSION, started: new Date().toISOString() };
  writeJson(paths.daemon, info, 0o600);

  function shutdown() {
    if (readJson<DaemonInfo | null>(paths.daemon, null)?.pid === process.pid && existsSync(paths.daemon)) rmSync(paths.daemon);
    library.stop();
    server.close();
    process.exit(0);
  }
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
  return { info, library, sessions, hub, server, shutdown };
}

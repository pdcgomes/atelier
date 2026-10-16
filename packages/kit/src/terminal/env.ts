// What React DOM and the kit expect around them, in an engine that has
// nothing but JavaScript: a window and a document, timers, a clock and a
// console. The engine's host (atelier-tui) provides `__host`; anything a
// real runtime already has, such as Node's timers in the tests, is kept.

import { HostDocument, HostElement } from './dom.ts';
import { installIntl } from './intl.ts';

export interface Host {
  /** A message for the viewer around the canvas, as JSON. */
  post(json: string): void;
  /** Calls `fire(id)` after `ms`. */
  timer(id: number, ms: number): void;
  cancel(id: number): void;
  /** The time now, in milliseconds: the real time, or a fixed one for a snapshot. */
  now(): number;
  log(level: string, text: string): void;
  /** `en-GB`, `en-US`: how dates are written where Intl is missing. */
  locale?: string;
}

type Fn = (...args: unknown[]) => void;

const g = globalThis as Record<string, unknown>;
export const host: Host = (g.__host as Host) ?? {
  post() {},
  timer() {},
  cancel() {},
  now: () => Date.now(),
  log() {},
};

const timers = new Map<number, { fn: Fn; args: unknown[]; every?: number }>();
let timerIds = 0;

/** Runs a timer the host says is due. */
export function fire(id: number) {
  const t = timers.get(id);
  if (!t) return;
  if (t.every != null) host.timer(id, t.every);
  else timers.delete(id);
  t.fn(...t.args);
}

function installTimers() {
  if (typeof g.setTimeout === 'function') return;
  const add = (fn: Fn, ms: unknown, args: unknown[], every?: number) => {
    const id = ++timerIds;
    timers.set(id, { fn, args, every });
    host.timer(id, Math.max(0, Number(ms) || 0));
    return id;
  };
  const clear = (id: unknown) => {
    if (timers.delete(Number(id))) host.cancel(Number(id));
  };
  g.setTimeout = (fn: Fn, ms?: number, ...args: unknown[]) => add(fn, ms, args);
  g.setInterval = (fn: Fn, ms?: number, ...args: unknown[]) => add(fn, ms, args, Math.max(10, Number(ms) || 0));
  g.clearTimeout = clear;
  g.clearInterval = clear;
  g.requestAnimationFrame = (fn: (t: number) => void) => add(() => fn(host.now()), 16, []);
  g.cancelAnimationFrame = clear;
}

function installClock() {
  const Real = Date;
  class TerminalDate extends Real {
    constructor(...args: unknown[]) {
      if (args.length === 0) super(host.now());
      else super(...(args as [number]));
    }
    static override now() {
      return host.now();
    }
  }
  g.Date = TerminalDate;
  g.performance = { now: () => host.now(), timeOrigin: 0 };
}

function installConsole() {
  const say = (level: string) => (...args: unknown[]) => host.log(level, args.map((a) => (typeof a === 'string' ? a : safe(a))).join(' '));
  g.console = { log: say('log'), info: say('info'), warn: say('warn'), error: say('error'), debug: say('debug') };
}

function safe(v: unknown) {
  try {
    return v instanceof Error ? `${v.message}\n${v.stack ?? ''}` : JSON.stringify(v);
  } catch {
    return String(v);
  }
}

/** The document the canvas renders into, and the element it renders under. */
export let doc: HostDocument;
export let root: HostElement;

export function installEnvironment() {
  installTimers();
  if (typeof g.queueMicrotask !== 'function') g.queueMicrotask = (fn: () => void) => void Promise.resolve().then(fn);
  if (g.__host) {
    installClock();
    installConsole();
  }
  installIntl(host.locale ?? 'en-GB');
  doc = new HostDocument();
  root = doc.createElement('div');
  doc.body.appendChild(root);
  class HTMLIFrameElement {}
  const win = g.window && g.window !== g ? (g.window as Record<string, unknown>) : g;
  const set = (target: Record<string, unknown>, name: string, value: unknown) => {
    try {
      Object.defineProperty(target, name, { value, writable: true, configurable: true });
    } catch {
      // Node's own navigator can't be replaced, and needn't be.
    }
  };
  const parts: Record<string, unknown> = {
    document: doc,
    HTMLIFrameElement,
    navigator: { userAgent: 'atelier-tui' },
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => true,
    event: undefined,
  };
  for (const [name, value] of Object.entries(parts)) set(win, name, value);
  set(g, 'window', win);
  set(g, 'document', doc);
  set(g, 'self', win);
}

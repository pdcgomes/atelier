// What you did on a canvas, kept beside it: `<name>.state.json` holds each
// key's latest value, and `<name>.events.jsonl` each change, with its time.
// Only the viewer writes them; agents read them.
//
// View state (the open tab, a table's sort and filter, a form's draft) is
// kept in the state but not logged: it changes with every keystroke and is
// nobody's news. The log is compacted once it passes LOG_LIMIT, keeping the
// last week, as long as the daemon remembers a session, and never fewer
// than the last KEEP_LAST changes.

import { appendFileSync, existsSync, readFileSync, statSync } from 'node:fs';
import { readJson, writeAtomic, writeJson } from './home.ts';

export const LOG_LIMIT = 256 * 1024;
export const KEEP_FOR = 7 * 86_400_000;
export const KEEP_LAST = 500;

export interface StateEvent {
  at: string;
  key: string;
  value: unknown;
}

const base = (canvas: string) => canvas.replace(/\.canvas\.(tsx|json)$/, '');
export const stateFile = (canvas: string) => `${base(canvas)}.state.json`;
export const eventsFile = (canvas: string) => `${base(canvas)}.events.jsonl`;

export function readState(canvas: string): Record<string, unknown> {
  const state = readJson<unknown>(stateFile(canvas), {});
  return state && typeof state === 'object' && !Array.isArray(state) ? (state as Record<string, unknown>) : {};
}

// One write at a time for each canvas, so two quick changes can't lose one another.
const queues = new Map<string, Promise<unknown>>();

export function setState(canvas: string, key: string, value: unknown): Promise<{ state: Record<string, unknown>; event: StateEvent }> {
  const run = async () => {
    const state = readState(canvas);
    state[key] = value;
    writeJson(stateFile(canvas), state);
    const event = { at: new Date().toISOString(), key, value };
    if (isViewState(key)) return { state, event };
    appendFileSync(eventsFile(canvas), `${JSON.stringify(event)}\n`);
    if (statSync(eventsFile(canvas)).size > LOG_LIMIT) compactEvents(canvas);
    return { state, event };
  };
  const next = (queues.get(canvas) ?? Promise.resolve()).then(run, run);
  queues.set(canvas, next.catch(() => {}));
  return next;
}

/** The changes after `since` (an ISO time), oldest first. */
export function eventsSince(canvas: string, since?: string): StateEvent[] {
  if (!existsSync(eventsFile(canvas))) return [];
  const after = since ? Date.parse(since) : -Infinity;
  const out: StateEvent[] = [];
  for (const line of readFileSync(eventsFile(canvas), 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try {
      const event = JSON.parse(line) as StateEvent;
      if (Date.parse(event.at) > after) out.push(event);
    } catch {
      // A line cut short by a crash is skipped.
    }
  }
  return out;
}

/** Whether a key is view state: kept so the canvas looks as you left it, but nobody's news. */
export function isViewState(key: string): boolean {
  return key === 'tab' || key.startsWith('draft:') || key.endsWith(':sort') || key.endsWith(':filter');
}

/** Whether an event is one of the answers asked for: each of `keys` matches itself, or keys starting with it. */
export function matches(event: StateEvent, keys: string[] | undefined): boolean {
  if (!keys?.length) return !isViewState(event.key);
  return keys.some((k) => event.key === k || event.key.startsWith(k));
}

/**
 * Rewrites a canvas's log with the changes worth keeping: those from the last
 * `keepFor` ms, and at least the last `keepLast`, without view state or lines
 * cut short by a crash. Returns how many changes were kept and dropped.
 */
export function compactEvents(canvas: string, { keepFor = KEEP_FOR, keepLast = KEEP_LAST, now = Date.now() } = {}): { kept: number; dropped: number } {
  const file = eventsFile(canvas);
  if (!existsSync(file)) return { kept: 0, dropped: 0 };
  const lines = readFileSync(file, 'utf8').split('\n').filter((l) => l.trim());
  const events: StateEvent[] = [];
  for (const line of lines) {
    try {
      const event = JSON.parse(line) as StateEvent;
      if (typeof event.key === 'string' && !isViewState(event.key) && Number.isFinite(Date.parse(event.at))) events.push(event);
    } catch {}
  }
  const since = now - keepFor;
  const firstRecent = events.findIndex((e) => Date.parse(e.at) >= since);
  const from = Math.max(0, Math.min(firstRecent < 0 ? events.length : firstRecent, events.length - keepLast));
  const kept = events.slice(from);
  writeAtomic(file, kept.map((e) => `${JSON.stringify(e)}\n`).join(''));
  return { kept: kept.length, dropped: lines.length - kept.length };
}

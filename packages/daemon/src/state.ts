// What you did on a canvas, kept beside it: `<name>.state.json` holds each
// key's latest value, and `<name>.events.jsonl` every change, with its time.
// Only the viewer writes them; agents read them.

import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { readJson, writeJson } from './home.ts';

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
    appendFileSync(eventsFile(canvas), `${JSON.stringify(event)}\n`);
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

/** Whether an event is one of the answers asked for: each of `keys` matches itself, or keys starting with it. */
export function matches(event: StateEvent, keys: string[] | undefined): boolean {
  if (!keys?.length) return !event.key.startsWith('draft:') && event.key !== 'tab' && !event.key.endsWith(':sort') && !event.key.endsWith(':filter');
  return keys.some((k) => event.key === k || event.key.startsWith(k));
}

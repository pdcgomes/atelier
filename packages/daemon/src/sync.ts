// What the user did on a session's canvases since it last heard, as lines a
// hook hands Claude: when a prompt is sent, when a turn ends, and when a
// session resumes. Only the canvases the session wrote count, and nothing
// Claude already had from canvas_wait is told twice.

import { existsSync } from 'node:fs';
import { basename, dirname } from 'node:path';
import { readJson, writeJson } from './home.ts';
import { eventsSince, matches, type StateEvent } from './state.ts';

const MAX_LINES = 12;

/** Events canvas_wait has returned, so a catch-up doesn't repeat them, kept on disk to outlast a restart. */
export class Delivered {
  private seen: Set<string>;
  private file: string;

  constructor(file: string) {
    this.file = file;
    this.seen = new Set(readJson<string[]>(file, []));
  }

  static key(canvas: string, event: StateEvent) {
    return `${canvas}|${event.at}|${event.key}`;
  }

  add(canvas: string, events: StateEvent[]) {
    if (!events.length) return;
    for (const event of events) this.seen.add(Delivered.key(canvas, event));
    if (this.seen.size > 5000) this.seen = new Set([...this.seen].slice(-2500));
    writeJson(this.file, [...this.seen]);
  }

  has(canvas: string, event: StateEvent) {
    return this.seen.has(Delivered.key(canvas, event));
  }
}

const clip = (s: string, n = 140) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const json = (v: unknown) => clip(JSON.stringify(v) ?? 'null');

/** One change, as a reader would say it. */
export function describe(event: StateEvent): string {
  const { key, value } = event;
  const v = value as Record<string, unknown> | null;
  if (value === null) return `${key}: taken back`;
  if (key.startsWith('approval:') && typeof v?.state === 'string') {
    return `approval ${key.slice(9)}: ${v.state}${typeof v.note === 'string' && v.note ? ` (note: "${clip(v.note, 100)}")` : ''}`;
  }
  if (key.startsWith('form:') && v && typeof v === 'object' && 'values' in v) return `form ${key.slice(5)} sent: ${json(v.values)}`;
  if (key === 'needsYou' && v && typeof v === 'object') {
    const marks = Object.entries(v).filter(([, m]) => m && typeof m === 'object').map(([id, m]) => `${id} ${(m as { state?: string }).state}`);
    return `needs you: ${marks.join(', ') || 'all marks taken back'}`;
  }
  if (key === 'checks' && v && typeof v === 'object') {
    const ticked = Object.entries(v).filter(([, on]) => on === true).map(([id]) => id);
    return `checklist ticked: ${ticked.join(', ') || 'none'}`;
  }
  return `${key}: ${json(value)}`;
}

/** The changes on `canvases` after `since`, the latest for each key, as lines. */
export function changesSince(canvases: string[], since: string | undefined, delivered: Delivered): string[] {
  if (!since) return [];
  const lines: string[] = [];
  for (const canvas of canvases) {
    if (!existsSync(canvas)) continue;
    const latest = new Map<string, StateEvent>();
    for (const event of eventsSince(canvas, since)) {
      if (!matches(event, undefined)) continue;
      if (delivered.has(canvas, event)) latest.delete(event.key);
      else latest.set(event.key, event);
    }
    const name = `${basename(dirname(canvas))}/${basename(canvas)}`;
    for (const event of latest.values()) lines.push(`${name}: ${describe(event)}`);
  }
  if (lines.length <= MAX_LINES) return lines;
  return [...lines.slice(0, MAX_LINES), `and ${lines.length - MAX_LINES} more: read them with canvas_state`];
}

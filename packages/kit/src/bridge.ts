// The canvas's line to the viewer around its sealed frame. A canvas can't
// reach the network, so its state, its files, its actions and the agents'
// sessions all come through here, by postMessage.

import type { Theme } from '@atelier/themes';

export type Tone = 'default' | 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'muted';

/** A Claude Code session the daemon knows about. */
export interface Session {
  id: string;
  /** What the session is doing now. */
  status: 'working' | 'idle' | 'waiting' | 'ended';
  /** The project folder it runs in. */
  project: string;
  /** Its first prompt, or the title it was given. */
  title?: string;
  /** When it last did something, in milliseconds since the epoch. */
  at: number;
  /** "background" for a run a canvas started without a terminal. */
  kind?: 'terminal' | 'background';
}

/** What an action did, once you've confirmed it or turned it down. */
export interface ActionResult {
  ok: boolean;
  message: string;
  /** The session it started or resumed, when it did. */
  session?: string;
}

export type Action =
  | { type: 'startSession'; prompt: string; mode?: 'terminal' | 'background' }
  | { type: 'openSession'; id: string }
  | { type: 'tell'; session: string; text: string }
  | { type: 'openFile'; path: string; line?: number }
  | { type: 'openUrl'; url: string };

type Message = { type: string; [key: string]: unknown };

let send: (message: Message) => void = () => {};
let state: Record<string, unknown> = {};
let sessions: Session[] = [];
let theme: Theme | null = null;
const listeners = new Set<() => void>();
const waiting = new Map<string, (reply: Message) => void>();
let counter = 0;

function changed() {
  for (const listen of listeners) listen();
}

export function subscribe(listen: () => void): () => void {
  listeners.add(listen);
  return () => listeners.delete(listen);
}

/** Connects the bridge: called once by the runtime with the viewer's first message. */
export function connect(post: (message: Message) => void, init: { state?: Record<string, unknown>; sessions?: Session[]; theme?: Theme }) {
  send = post;
  state = init.state ?? {};
  sessions = init.sessions ?? [];
  theme = init.theme ?? null;
  changed();
}

/** A message from the viewer, after the first. */
export function receive(message: Message) {
  switch (message.type) {
    case 'state':
      state = (message.state as Record<string, unknown>) ?? {};
      return changed();
    case 'sessions':
      sessions = (message.sessions as Session[]) ?? [];
      return changed();
    case 'theme':
      theme = message.theme as Theme;
      return changed();
    case 'reply': {
      const id = String(message.id);
      waiting.get(id)?.(message);
      waiting.delete(id);
    }
  }
}

export const getState = () => state;
export const getSessions = () => sessions;
export const getTheme = () => theme;

export function setState(key: string, value: unknown) {
  state = { ...state, [key]: value };
  changed();
  send({ type: 'set-state', key, value });
}

function ask(message: Message): Promise<Message> {
  const id = `r${++counter}`;
  return new Promise((resolve) => {
    waiting.set(id, resolve);
    send({ ...message, id });
  });
}

/** Asks the viewer for an action. It runs only once you confirm it there. */
export async function act(action: Action): Promise<ActionResult> {
  const reply = await ask({ type: 'action', action });
  return { ok: Boolean(reply.ok), message: String(reply.message ?? ''), session: reply.session as string | undefined };
}

const files = new Map<string, Promise<string>>();

/** A blob URL for a file on disk, which the viewer fetches for the canvas. */
export function fileUrl(path: string): Promise<string> {
  let url = files.get(path);
  if (!url) {
    url = ask({ type: 'file', path }).then((reply) => {
      if (!reply.ok) {
        files.delete(path);
        throw new Error(String(reply.message ?? `Can't open ${path}`));
      }
      return URL.createObjectURL(new Blob([reply.bytes as ArrayBuffer], { type: String(reply.mime ?? '') }));
    });
    files.set(path, url);
  }
  return url;
}

/** Shows a canvas's problem in the viewer. */
export function report(message: string) {
  send({ type: 'error', message });
}

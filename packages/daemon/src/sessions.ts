// The agent sessions the daemon knows, from what the plugin's hooks report,
// and messages waiting for them.

import { EventEmitter } from 'node:events';
import { paths, readJson, writeJson } from './home.ts';

export interface Session {
  id: string;
  status: 'working' | 'idle' | 'waiting' | 'ended';
  project: string;
  title?: string;
  /** When it last did something, in milliseconds. */
  at: number;
  started: number;
  kind?: 'terminal' | 'background';
  transcript?: string;
}

/** What a Claude Code hook sends on its standard input. */
export interface HookInput {
  session_id?: string;
  cwd?: string;
  transcript_path?: string;
  prompt?: string;
  message?: string;
  source?: string;
  [key: string]: unknown;
}

const WEEK = 7 * 86_400_000;
const KEEP = 300;

function titleFrom(prompt: string) {
  const line = prompt.replace(/<[^>]+>/g, ' ').split('\n').map((l) => l.trim()).find(Boolean) ?? '';
  return line.length > 90 ? `${line.slice(0, 89)}…` : line;
}

export class Sessions extends EventEmitter {
  private all = new Map<string, Session>();
  private inbox = new Map<string, string[]>();
  private saving: NodeJS.Timeout | null = null;

  constructor() {
    super();
    const now = Date.now();
    for (const s of readJson<Session[]>(paths.sessions, [])) if (now - s.at < WEEK) this.all.set(s.id, s);
    for (const [id, messages] of Object.entries(readJson<Record<string, string[]>>(paths.inbox, {}))) this.inbox.set(id, messages);
  }

  list(): Session[] {
    return [...this.all.values()].sort((a, b) => b.at - a.at);
  }

  get(id: string) {
    return this.all.get(id);
  }

  private save() {
    if (this.saving) return;
    this.saving = setTimeout(() => {
      this.saving = null;
      writeJson(paths.sessions, this.list().slice(0, KEEP));
      writeJson(paths.inbox, Object.fromEntries(this.inbox));
    }, 200);
  }

  /** Records a session the daemon started itself, before its hooks say anything. */
  started(session: Partial<Session> & { id: string; project: string }) {
    const now = Date.now();
    this.all.set(session.id, { status: 'working', at: now, started: now, ...this.all.get(session.id), ...session });
    this.save();
    this.emit('change');
  }

  /** What a hook reports. Returns the messages waiting for the session when its turn ends. */
  hook(event: string, input: HookInput): string[] {
    const id = input.session_id;
    if (!id) return [];
    const now = Date.now();
    const s: Session = this.all.get(id) ?? { id, status: 'idle', project: input.cwd ?? '', at: now, started: now };
    s.at = now;
    if (input.cwd && !s.project) s.project = input.cwd;
    if (input.transcript_path) s.transcript = input.transcript_path;
    switch (event) {
      case 'SessionStart':
        s.status = 'idle';
        break;
      case 'UserPromptSubmit':
        s.status = 'working';
        if (!s.title && typeof input.prompt === 'string') s.title = titleFrom(input.prompt);
        break;
      case 'PreToolUse':
      case 'PostToolUse':
        s.status = 'working';
        break;
      case 'Notification':
        s.status = 'waiting';
        break;
      case 'Stop':
        s.status = 'idle';
        break;
      case 'SessionEnd':
        s.status = 'ended';
        break;
    }
    this.all.set(id, s);
    let handed: string[] = [];
    if (event === 'Stop' && this.inbox.get(id)?.length) {
      handed = this.inbox.get(id)!;
      this.inbox.delete(id);
      s.status = 'working';
    }
    this.save();
    this.emit('change');
    return handed;
  }

  /** Leaves a message for a working session, which its Stop hook hands over. */
  leave(id: string, text: string) {
    this.inbox.set(id, [...(this.inbox.get(id) ?? []), text]);
    this.save();
  }

  waiting(id: string): string[] {
    return this.inbox.get(id) ?? [];
  }
}

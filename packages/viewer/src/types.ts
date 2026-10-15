// What the daemon sends the viewer, as packages/daemon/src defines it.

export interface CanvasInfo {
  id: string;
  path: string;
  project: string;
  name: string;
  kind: 'tsx' | 'template';
  template?: string;
  title: string;
  modified: number;
}

export interface Problem {
  file: string;
  line: number;
  column: number;
  message: string;
}

export type Built =
  | { kind: 'module'; code: string; version: string }
  | { kind: 'template'; template: string; data: unknown; version: string }
  | { kind: 'problem'; problems: Problem[]; version: string };

export interface Session {
  id: string;
  status: 'working' | 'idle' | 'waiting' | 'ended';
  project: string;
  title?: string;
  at: number;
  kind?: 'terminal' | 'background';
}

export interface Settings {
  theme: string;
  terminal: 'ghostty' | 'iterm' | 'terminal' | 'custom';
  terminalCommand?: string;
  editor: string;
  autoOpen: boolean;
}

export interface RunStep {
  at: number;
  kind: 'text' | 'tool' | 'result' | 'error' | 'system';
  text: string;
}

/** A background run of Claude Code that a canvas started. */
export interface Run {
  id: string;
  canvas?: string;
  project: string;
  prompt: string;
  status: 'running' | 'done' | 'failed' | 'stopped';
  started: number;
  ended?: number;
  /** The session it ran as, once Claude Code has said. */
  session?: string;
  steps: RunStep[];
  result?: string;
}

export type Action =
  | { type: 'startSession'; prompt: string; mode?: 'terminal' | 'background' }
  | { type: 'openSession'; id: string }
  | { type: 'tell'; session: string; text: string }
  | { type: 'openFile'; path: string; line?: number }
  | { type: 'openUrl'; url: string };

export interface ActionResult {
  ok: boolean;
  message: string;
  session?: string;
  run?: string;
}

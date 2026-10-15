// Placeholder until the agent loops are built: every action is turned down.

import type { EventEmitter } from 'node:events';
import type { CanvasInfo } from './library.ts';

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

export interface Runs extends EventEmitter {
  list(): unknown[];
  get(id: string): unknown;
}

export const runs: Runs | undefined = undefined;

export async function runAction(_canvas: CanvasInfo, _action: Action, _context: unknown): Promise<ActionResult> {
  return { ok: false, message: "Actions aren't ready yet." };
}

// The schemas of the parts most templates have: links, Needs you items, the
// log, decisions and agents. Only schemas here, as the daemon reads them.

import { s, type Infer } from '../packages/kit/src/schema.ts';

export const link = s.object({
  label: s.string({ min: 1 }),
  /** A file: opens in the viewer or your editor. */
  path: s.optional(s.string()),
  /** A web page. */
  href: s.optional(s.string()),
});

export const needsYouItem = s.object({
  id: s.string({ min: 1 }),
  title: s.string({ min: 1 }),
  detail: s.optional(s.string()),
  unblocks: s.optional(s.string()),
  blocking: s.optional(s.boolean()),
  command: s.optional(s.string()),
  done: s.optional(s.boolean()),
  ask: s.optional(s.object({ prompt: s.optional(s.string()), mode: s.optional(s.enum(['terminal', 'background'])) })),
});

export const logEntry = s.object({
  at: s.time(),
  text: s.string({ min: 1 }),
  who: s.optional(s.string()),
});

export const decision = s.object({
  at: s.time(),
  decision: s.string({ min: 1 }),
  why: s.string(),
  /** Who decided: the owner, a measurement, a default. */
  by: s.optional(s.string()),
});

export const agent = s.object({
  /** The Claude Code session's id. */
  id: s.string({ min: 1 }),
  title: s.string({ min: 1 }),
  role: s.optional(s.string()),
  /** How it ended, or what it's doing. */
  note: s.optional(s.string()),
});

export const tone = s.enum(['default', 'accent', 'success', 'warning', 'danger', 'info', 'muted']);

export type LinkData = Infer<typeof link>;
export type NeedsYouData = Infer<typeof needsYouItem>;
export type LogData = Infer<typeof logEntry>;
export type DecisionData = Infer<typeof decision>;
export type AgentData = Infer<typeof agent>;

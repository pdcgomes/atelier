import { s, type Infer } from '../../packages/kit/src/schema.ts';
import { agent, decision, link, logEntry, needsYouItem } from '../parts.ts';

export const description = 'A studio of agents making something big: milestones by phase, every deliverable and its state, the roles and how work moves between them, what needs you, and the agents.';

const item = s.object({
  title: s.string({ min: 1 }),
  /** `you` is waiting on you. */
  state: s.enum(['done', 'doing', 'you', 'todo']),
  note: s.optional(s.string()),
});

export const schema = s.object({
  title: s.string({ min: 1 }),
  /** Where the whole thing stands, in a sentence or two. */
  summary: s.string(),
  updated: s.optional(s.time()),
  links: s.optional(s.array(link)),
  now: s.optional(
    s.object({
      /** What's being made now. */
      doing: s.string({ min: 1 }),
      detail: s.optional(s.string()),
      /** What waits on you. */
      waiting: s.optional(s.string()),
      /** The next checkpoint with you. */
      next: s.optional(s.string()),
    }),
  ),
  needsYou: s.optional(s.array(needsYouItem)),
  phases: s.optional(s.array(s.object({ id: s.string({ min: 1 }), name: s.string({ min: 1 }), note: s.optional(s.string()) }))),
  milestones: s.array(
    s.object({
      id: s.string({ min: 1 }),
      name: s.string({ min: 1 }),
      /** A phase's id. */
      phase: s.optional(s.string()),
      /** What has to be true for it to pass. */
      gate: s.optional(s.string()),
      status: s.enum(['active', 'waiting', 'next', 'later', 'done']),
      groups: s.array(s.object({ name: s.string({ min: 1 }), note: s.optional(s.string()), items: s.array(item) })),
    }),
  ),
  /** What comes after the last milestone. */
  later: s.optional(s.string()),
  flow: s.optional(
    s.object({
      title: s.string({ min: 1 }),
      note: s.optional(s.string()),
      nodes: s.array(s.object({ id: s.string({ min: 1 }), label: s.string({ min: 1 }) })),
      edges: s.array(s.object({ from: s.string({ min: 1 }), to: s.string({ min: 1 }), label: s.optional(s.string()) })),
      /** The step most work is at. */
      current: s.optional(s.string()),
    }),
  ),
  roles: s.optional(
    s.array(
      s.object({
        role: s.string({ min: 1 }),
        owns: s.string(),
        reviewer: s.optional(s.string()),
        now: s.optional(s.string()),
        active: s.optional(s.boolean()),
      }),
    ),
  ),
  agents: s.optional(s.array(agent)),
  decisions: s.optional(s.array(decision)),
  log: s.optional(s.array(logEntry)),
});

export type Studio = Infer<typeof schema>;

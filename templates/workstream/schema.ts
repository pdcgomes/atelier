import { s, type Infer } from '../../packages/kit/src/schema.ts';
import { agent, decision, link, logEntry, needsYouItem } from '../parts.ts';

export const description = "One line of work: its goal, the plan's steps, what needs you, what's ready or blocked, decisions, the log and measurements.";

export const schema = s.object({
  title: s.string({ min: 1 }),
  /** What it's for, in a sentence or two. */
  goal: s.string({ min: 1 }),
  /** Where it stands now, in a sentence. */
  status: s.string(),
  updated: s.optional(s.time()),
  links: s.optional(s.array(link)),
  needsYou: s.optional(s.array(needsYouItem)),
  plan: s.optional(
    s.array(
      s.object({
        id: s.string({ min: 1 }),
        step: s.string({ min: 1 }),
        detail: s.optional(s.string()),
        doneWhen: s.optional(s.string()),
        /** A tracker id, an issue, a commit. */
        ref: s.optional(s.string()),
        status: s.enum(['not started', 'in progress', 'done', 'blocked', 'dropped']),
        note: s.optional(s.string()),
      }),
    ),
  ),
  ready: s.optional(s.array(s.object({ title: s.string({ min: 1 }), detail: s.optional(s.string()) }))),
  blocked: s.optional(s.array(s.object({ title: s.string({ min: 1 }), blockedBy: s.string({ min: 1 }), detail: s.optional(s.string()) }))),
  decisions: s.optional(s.array(decision)),
  log: s.optional(s.array(logEntry)),
  measurements: s.optional(
    s.array(
      s.object({
        label: s.string({ min: 1 }),
        value: s.number(),
        unit: s.optional(s.string()),
        /** What it's measured against. */
        budget: s.optional(s.number()),
        better: s.optional(s.enum(['lower', 'higher'])),
        /** Earlier values, oldest first. */
        history: s.optional(s.array(s.number())),
        note: s.optional(s.string()),
      }),
    ),
  ),
  agents: s.optional(s.array(agent)),
});

export type Workstream = Infer<typeof schema>;

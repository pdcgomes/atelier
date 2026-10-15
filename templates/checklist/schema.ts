import { s, type Infer } from '../../packages/kit/src/schema.ts';
import { link, logEntry } from '../parts.ts';

export const description = "A checklist in groups, such as a release or a launch: you tick what you've done, the agent ticks what it has checked, and it shows what's left.";

export const schema = s.object({
  title: s.string({ min: 1 }),
  summary: s.optional(s.string()),
  /** When it all has to be done by. */
  due: s.optional(s.time()),
  updated: s.optional(s.time()),
  links: s.optional(s.array(link)),
  groups: s.array(
    s.object({
      name: s.string({ min: 1 }),
      note: s.optional(s.string()),
      items: s.array(
        s.object({
          id: s.string({ min: 1 }),
          title: s.string({ min: 1 }),
          detail: s.optional(s.string()),
          command: s.optional(s.string()),
          link: s.optional(link),
          /** Whether it has to be done; the rest are worth doing. */
          required: s.optional(s.boolean()),
          /** Who does it: you or the agent. */
          who: s.optional(s.enum(['you', 'agent'])),
          /** Checked by the agent, and so ticked whatever the state says. */
          done: s.optional(s.boolean()),
          due: s.optional(s.time()),
        }),
      ),
    }),
  ),
  log: s.optional(s.array(logEntry)),
});

export type Checklist = Infer<typeof schema>;

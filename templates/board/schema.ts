import { s, type Infer } from '../../packages/kit/src/schema.ts';
import { link, logEntry, needsYouItem, tone } from '../parts.ts';

export const description = 'Columns of cards, such as To do, Doing, In review and Done, with a list you can sort and filter.';

export const schema = s.object({
  title: s.string({ min: 1 }),
  summary: s.optional(s.string()),
  updated: s.optional(s.time()),
  links: s.optional(s.array(link)),
  columns: s.array(
    s.object({
      title: s.string({ min: 1 }),
      tone: s.optional(tone),
      /** At most this many cards belong here; more is shown as over. */
      limit: s.optional(s.number()),
      cards: s.array(
        s.object({
          id: s.string({ min: 1 }),
          title: s.string({ min: 1 }),
          detail: s.optional(s.string()),
          owner: s.optional(s.string()),
          tags: s.optional(s.array(s.string())),
          due: s.optional(s.time()),
          tone: s.optional(tone),
          /** A tracker id, an issue, a pull request. */
          ref: s.optional(s.string()),
        }),
      ),
    }),
  ),
  needsYou: s.optional(s.array(needsYouItem)),
  log: s.optional(s.array(logEntry)),
});

export type Board = Infer<typeof schema>;

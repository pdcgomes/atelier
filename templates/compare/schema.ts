import { s, type Infer } from '../../packages/kit/src/schema.ts';
import { link, logEntry } from '../parts.ts';

export const description = 'Options side by side for a decision: what each is, its pros and cons, scores against weighted criteria, a recommendation, and your pick with your reasons.';

export const schema = s.object({
  title: s.string({ min: 1 }),
  /** The decision to make, as a question. */
  question: s.string({ min: 1 }),
  context: s.optional(s.string()),
  updated: s.optional(s.time()),
  links: s.optional(s.array(link)),
  criteria: s.optional(
    s.array(
      s.object({
        name: s.string({ min: 1 }),
        /** How much it counts, against the others. 1 if left out. */
        weight: s.optional(s.number()),
        note: s.optional(s.string()),
      }),
    ),
  ),
  options: s.array(
    s.object({
      id: s.string({ min: 1 }),
      name: s.string({ min: 1 }),
      summary: s.string(),
      pros: s.optional(s.array(s.string())),
      cons: s.optional(s.array(s.string())),
      cost: s.optional(s.string()),
      image: s.optional(s.object({ path: s.string({ min: 1 }), alt: s.string({ min: 1 }) })),
      /** A score from 0 to 5 for each criterion, by its name. */
      scores: s.optional(s.array(s.object({ criterion: s.string({ min: 1 }), score: s.number(), note: s.optional(s.string()) }))),
    }),
  ),
  recommendation: s.optional(s.object({ option: s.string({ min: 1 }), why: s.string({ min: 1 }) })),
  log: s.optional(s.array(logEntry)),
});

export type Compare = Infer<typeof schema>;

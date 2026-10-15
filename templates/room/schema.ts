import { s, type Infer } from '../../packages/kit/src/schema.ts';
import { decision, link, logEntry, needsYouItem } from '../parts.ts';

export const description = 'A room where pieces of work (posts, videos, articles, releases) move through stages to your approval and out to their channels, with the schedule and the numbers.';

export const schema = s.object({
  title: s.string({ min: 1 }),
  summary: s.string(),
  updated: s.optional(s.time()),
  links: s.optional(s.array(link)),
  /** The stages a piece moves through, in order. The last is where finished pieces are. */
  stages: s.array(s.string({ min: 1 })),
  pieces: s.array(
    s.object({
      id: s.string({ min: 1 }),
      title: s.string({ min: 1 }),
      /** One of `stages`. */
      stage: s.string({ min: 1 }),
      kind: s.optional(s.string()),
      due: s.optional(s.time()),
      owner: s.optional(s.string()),
      detail: s.optional(s.string()),
      images: s.optional(s.array(s.object({ path: s.string({ min: 1 }), alt: s.string({ min: 1 }), caption: s.optional(s.string()) }))),
      /** The words to approve: a caption, a headline, release notes. */
      copy: s.optional(s.string()),
      /** Shows Approve and Hold for it, kept under `approval:<id>`. */
      approve: s.optional(s.boolean()),
      channels: s.optional(
        s.array(
          s.object({
            name: s.string({ min: 1 }),
            state: s.enum(['draft', 'scheduled', 'posted', 'skipped', 'failed']),
            at: s.optional(s.time()),
            link: s.optional(s.string()),
          }),
        ),
      ),
      numbers: s.optional(s.array(s.object({ label: s.string({ min: 1 }), value: s.number() }))),
    }),
  ),
  metrics: s.optional(
    s.array(
      s.object({
        label: s.string({ min: 1 }),
        value: s.number(),
        unit: s.optional(s.string()),
        delta: s.optional(s.string()),
        trend: s.optional(s.array(s.number())),
      }),
    ),
  ),
  roles: s.optional(s.array(s.object({ role: s.string({ min: 1 }), does: s.string(), now: s.optional(s.string()) }))),
  needsYou: s.optional(s.array(needsYouItem)),
  decisions: s.optional(s.array(decision)),
  log: s.optional(s.array(logEntry)),
});

export type Room = Infer<typeof schema>;

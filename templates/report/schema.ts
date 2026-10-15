import { s, type Infer } from '../../packages/kit/src/schema.ts';
import { link, tone } from '../parts.ts';

export const description = 'A report to read: the headline numbers, then sections of text with their charts, tables and images, and where it all came from.';

const series = s.array(s.object({ name: s.string({ min: 1 }), values: s.array(s.number()), tone: s.optional(tone) }));

export const schema = s.object({
  title: s.string({ min: 1 }),
  /** The finding, in a sentence or two. */
  summary: s.string({ min: 1 }),
  /** What it covers: a week, a release, a test run. */
  period: s.optional(s.string()),
  updated: s.optional(s.time()),
  stats: s.optional(
    s.array(
      s.object({
        label: s.string({ min: 1 }),
        value: s.string({ min: 1 }),
        tone: s.optional(tone),
        delta: s.optional(s.string()),
        deltaTone: s.optional(tone),
        hint: s.optional(s.string()),
        trend: s.optional(s.array(s.number())),
      }),
    ),
  ),
  sections: s.array(
    s.object({
      title: s.string({ min: 1 }),
      /** Markdown. */
      body: s.optional(s.string()),
      bars: s.optional(s.object({ title: s.string({ min: 1 }), categories: s.array(s.string()), series, unit: s.optional(s.string()), stacked: s.optional(s.boolean()), horizontal: s.optional(s.boolean()), caption: s.optional(s.string()) })),
      lines: s.optional(s.object({ title: s.string({ min: 1 }), x: s.array(s.string()), series, unit: s.optional(s.string()), area: s.optional(s.boolean()), caption: s.optional(s.string()) })),
      donut: s.optional(s.object({ title: s.string({ min: 1 }), segments: s.array(s.object({ label: s.string({ min: 1 }), value: s.number(), tone: s.optional(tone) })), unit: s.optional(s.string()), caption: s.optional(s.string()) })),
      table: s.optional(s.object({ headers: s.array(s.string()), rows: s.array(s.array(s.string())) })),
      images: s.optional(s.array(s.object({ path: s.string({ min: 1 }), alt: s.string({ min: 1 }), caption: s.optional(s.string()) }))),
    }),
  ),
  sources: s.optional(s.array(link)),
});

export type Report = Infer<typeof schema>;

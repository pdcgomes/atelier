import { s, type Infer } from '../../packages/kit/src/schema.ts';
import { link, logEntry, needsYouItem } from '../parts.ts';

export const description = "A review's findings by severity, each with where it is, what's proposed and a diff, the reviewers' progress, and your call on each finding.";

export const schema = s.object({
  title: s.string({ min: 1 }),
  /** What was reviewed: a pull request, a branch, a design. */
  subject: s.optional(s.string()),
  summary: s.string(),
  updated: s.optional(s.time()),
  links: s.optional(s.array(link)),
  reviewers: s.optional(
    s.array(
      s.object({
        name: s.string({ min: 1 }),
        /** What it looks at: security, performance, the tests. */
        focus: s.optional(s.string()),
        status: s.enum(['waiting', 'reviewing', 'done']),
        note: s.optional(s.string()),
      }),
    ),
  ),
  findings: s.array(
    s.object({
      id: s.string({ min: 1 }),
      severity: s.enum(['critical', 'high', 'medium', 'low', 'note']),
      title: s.string({ min: 1 }),
      /** A file, relative to the project, with its line. */
      file: s.optional(s.string()),
      line: s.optional(s.number()),
      /** What's wrong and why it matters, in Markdown. */
      detail: s.string(),
      /** What to do about it. */
      proposal: s.optional(s.string()),
      /** The change proposed, as a unified diff. */
      diff: s.optional(s.string()),
      status: s.optional(s.enum(['open', 'fixed', 'accepted', 'declined'])),
      by: s.optional(s.string()),
    }),
  ),
  needsYou: s.optional(s.array(needsYouItem)),
  log: s.optional(s.array(logEntry)),
});

export type Review = Infer<typeof schema>;

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { s, validate } from '../src/schema.ts';

const step = s.object({ id: s.string(), status: s.enum(['done', 'doing']), note: s.optional(s.string()) });
const schema = s.object({ title: s.string({ min: 1 }), updated: s.time(), plan: s.array(step), stars: s.optional(s.number()) });

test('data that matches has no problems', () => {
  assert.deepEqual(validate(schema, { template: 'x', title: 'Library', updated: '2026-10-15T09:30:00+01:00', plan: [{ id: 'a', status: 'done' }] }), []);
});

test('each problem says where it is', () => {
  const problems = validate(schema, { title: '', updated: 'yesterday', plan: [{ id: 1, status: 'later' }], extra: true });
  const where = problems.map((p) => p.path);
  assert.deepEqual(where, ['title', 'updated', 'plan[0].id', 'plan[0].status', 'extra']);
  assert.match(problems[3].message, /should be one of "done", "doing", not "later"/);
  assert.match(problems[4].message, /isn't part of this template/);
});

test('what is missing is named, unless it may be left out', () => {
  const problems = validate(schema, {});
  assert.deepEqual(problems.map((p) => p.path), ['title', 'updated', 'plan']);
  assert.match(problems[2].message, /plan is missing \(a list of objects\)/);
});

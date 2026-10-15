// A canvas's state and its log: view state is kept but not logged, and the
// log is compacted once it grows, keeping what sessions may still need.

import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';

const root = realpathSync(mkdtempSync(join(tmpdir(), 'atelier-state-')));
process.env.ATELIER_HOME = join(root, 'home');
const { setState, readState, eventsFile, eventsSince, compactEvents, LOG_LIMIT, KEEP_LAST } = await import('../src/state.ts');
after(() => rmSync(root, { recursive: true, force: true }));

const folder = join(root, 'project/.atelier');
mkdirSync(folder, { recursive: true });
const lines = (canvas) => readFileSync(eventsFile(canvas), 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
const DAY = 86_400_000;

test('view state is kept in the state but not logged', async () => {
  const canvas = join(folder, 'view.canvas.tsx');
  writeFileSync(canvas, '');
  await setState(canvas, 'draft:brief', { goal: 'S' });
  await setState(canvas, 'draft:brief', { goal: 'Sh' });
  await setState(canvas, 'tab', 'plan');
  await setState(canvas, 'findings:sort', { key: 'severity' });
  await setState(canvas, 'list:filter', 'crash');
  await setState(canvas, 'approval:cut-2', { state: 'approved' });
  assert.deepEqual(readState(canvas), {
    'draft:brief': { goal: 'Sh' },
    tab: 'plan',
    'findings:sort': { key: 'severity' },
    'list:filter': 'crash',
    'approval:cut-2': { state: 'approved' },
  });
  assert.deepEqual(lines(canvas).map((e) => e.key), ['approval:cut-2']);
});

test('compacting keeps the last week, and never fewer than the last changes', () => {
  const canvas = join(folder, 'old.canvas.tsx');
  writeFileSync(canvas, '');
  const now = Date.parse('2026-10-15T12:00:00Z');
  const old = Array.from({ length: 900 }, (_, i) => ({ at: new Date(now - 30 * DAY + i * 1000).toISOString(), key: `needsYou`, value: { n: i } }));
  const recent = Array.from({ length: 20 }, (_, i) => ({ at: new Date(now - DAY + i * 1000).toISOString(), key: `approval:${i}`, value: { state: 'approved' } }));
  const noise = { at: new Date(now - 60_000).toISOString(), key: 'tab', value: 'plan' };
  writeFileSync(eventsFile(canvas), [...old, ...recent, noise].map((e) => JSON.stringify(e)).join('\n') + '\n{"at":"2026-10-15T11:5');
  const result = compactEvents(canvas, { now });
  const kept = lines(canvas);
  assert.equal(kept.length, KEEP_LAST, 'old changes kept up to the minimum');
  assert.deepEqual(kept.slice(-20).map((e) => e.key), recent.map((e) => e.key), 'the last week, all of it');
  assert.ok(!kept.some((e) => e.key === 'tab'), 'no view state');
  assert.equal(result.dropped, old.length + recent.length + 2 - KEEP_LAST);

  // With more than the minimum in the last week, the whole week stays.
  const week = Array.from({ length: 700 }, (_, i) => ({ at: new Date(now - 3 * DAY + i * 1000).toISOString(), key: 'checks', value: { i } }));
  writeFileSync(eventsFile(canvas), [...old, ...week].map((e) => JSON.stringify(e)).join('\n') + '\n');
  compactEvents(canvas, { now });
  assert.equal(lines(canvas).length, 700);
  assert.deepEqual(eventsSince(canvas, new Date(now - 4 * DAY).toISOString()).length, 700, 'a session synced within the week loses nothing');
});

test('a log that passes its limit is compacted as it grows', async () => {
  const canvas = join(folder, 'big.canvas.tsx');
  writeFileSync(canvas, '');
  const pad = 'x'.repeat(400);
  const old = Array.from({ length: 1000 }, (_, i) => JSON.stringify({ at: new Date(Date.now() - 30 * DAY + i).toISOString(), key: 'note', value: pad }));
  writeFileSync(eventsFile(canvas), `${old.join('\n')}\n`);
  assert.ok(statSync(eventsFile(canvas)).size > LOG_LIMIT);
  await setState(canvas, 'approval:last', { state: 'held' });
  assert.ok(statSync(eventsFile(canvas)).size < LOG_LIMIT, 'smaller than its limit again');
  const kept = lines(canvas);
  assert.equal(kept.length, KEEP_LAST);
  assert.equal(kept.at(-1).key, 'approval:last', 'the change that tipped it over is kept');
});

// What a canvas's actions do once they're confirmed, with a stand-in for
// Claude Code that records how it was run, and /bin/sh for a terminal.

import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { daemon } from './helpers.mjs';

const stub = new URL('./fixtures/claude.mjs', import.meta.url).pathname;
const pause = (ms) => new Promise((done) => setTimeout(done, ms));
let d;
let log;
let canvas;

before(async () => {
  d = await daemon({ env: { ATELIER_CLAUDE: stub, ATELIER_STUB_LOG: join(process.env.TMPDIR ?? '/tmp', `atelier-stub-${process.pid}.jsonl`) } });
  log = join(process.env.TMPDIR ?? '/tmp', `atelier-stub-${process.pid}.jsonl`);
  writeFileSync(log, '');
  await d.call('PUT', '/api/settings', { autoOpen: false, terminal: 'custom', terminalCommand: ['/bin/sh', '{script}'], editor: stub });
  writeFileSync(join(d.project, 'README.md'), '# Readme');
  const file = d.write('.atelier/loop.canvas.tsx', 'export default () => <div>loop</div>;\n');
  canvas = (await d.call('POST', '/api/open', { path: file })).body.canvas;
});
after(() => d?.stop());

const act = async (action) => (await d.call('POST', '/api/action', { canvas: canvas.id, action })).body;
const calls = () => readFileSync(log, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);

async function nextCall(test) {
  for (let i = 0; i < 100; i++) {
    const found = calls().find(test);
    if (found) return found;
    await pause(50);
  }
  throw new Error(`No such call; saw ${JSON.stringify(calls().map((c) => c.args))}`);
}

async function runOf(id, done = (r) => r.status !== 'running') {
  for (let i = 0; i < 100; i++) {
    const r = await d.call('GET', `/api/run?id=${id}`);
    if (r.status === 200 && done(r.body)) return r.body;
    await pause(50);
  }
  throw new Error(`Run ${id} didn't finish`);
}

test('a session started in a terminal gets the prompt as it was written, never as options', async () => {
  const prompt = '--dangerously-skip-permissions\nWrite the notes for "1.4"; $(touch /tmp/atelier-pwned) `id`';
  const result = await act({ type: 'startSession', prompt });
  assert.equal(result.ok, true, result.message);
  const call = await nextCall((c) => c.args.at(-1) === prompt);
  assert.equal(call.cwd, d.project);
  assert.deepEqual(call.args.slice(0, 3), ['--session-id', result.session, '--']);
  assert.equal(existsSync('/tmp/atelier-pwned'), false);
  const { body } = await d.call('GET', '/api/sessions');
  const s = body.sessions.find((x) => x.id === result.session);
  assert.equal(s.kind, 'terminal');
  assert.equal(s.title, '--dangerously-skip-permissions');
});

test('a background run streams its steps and its result', async () => {
  const events = await d.events();
  const result = await act({ type: 'startSession', prompt: 'Summarise the README', mode: 'background' });
  assert.equal(result.ok, true, result.message);
  const run = await runOf(result.run);
  assert.equal(run.status, 'done');
  assert.equal(run.result, 'Done: Summarise the README');
  assert.equal(run.cost, 0.01);
  assert.deepEqual(run.steps.map((s) => s.kind), ['system', 'text', 'tool', 'result']);
  assert.equal(run.steps[2].text, 'Read README.md');
  const call = await nextCall((c) => c.stdin === 'Summarise the README');
  assert.deepEqual(call.args.slice(0, 4), ['-p', '--output-format', 'stream-json', '--verbose']);
  assert.equal(call.args[call.args.indexOf('--session-id') + 1], result.session);
  assert.equal(call.run, result.run);
  for (let i = 0; i < 40 && !events.seen.some((e) => e.type === 'run' && e.data.id === result.run && e.data.step.kind === 'result'); i++) await pause(50);
  assert.ok(events.seen.some((e) => e.type === 'run' && e.data.id === result.run && e.data.step.kind === 'result'), 'the viewer heard each step');
  const { body } = await d.call('GET', '/api/runs');
  assert.equal(body.runs[0].id, result.run);
  events.close();
});

test("a run that fails says why, and one you stop is stopped", async () => {
  const failing = await act({ type: 'startSession', prompt: 'FAIL please', mode: 'background' });
  const failed = await runOf(failing.run);
  assert.equal(failed.status, 'failed');
  assert.match(failed.steps.at(-1).text, /Something went wrong in the stub/);
  const slow = await act({ type: 'startSession', prompt: 'SLOW please', mode: 'background' });
  await runOf(slow.run, (r) => r.steps.length >= 3);
  assert.equal((await d.call('POST', '/api/runs/stop', { id: slow.run })).status, 200);
  assert.equal((await runOf(slow.run)).status, 'stopped');
  assert.equal((await d.call('POST', '/api/runs/stop', { id: slow.run })).status, 404);
});

test('a message for a working session waits for its turn to end', async () => {
  const id = '11111111-2222-4333-8444-555555555555';
  await d.call('POST', '/api/hook', { event: 'UserPromptSubmit', input: { session_id: id, cwd: d.project, prompt: 'Build it' } });
  const result = await act({ type: 'tell', session: id, text: 'Use the blue logo' });
  assert.equal(result.ok, true);
  assert.match(result.message, /when its turn ends/);
  const stop = await d.call('POST', '/api/hook', { event: 'Stop', input: { session_id: id, cwd: d.project } });
  assert.deepEqual(stop.body.messages, ['Use the blue logo']);
  const again = await d.call('POST', '/api/hook', { event: 'Stop', input: { session_id: id, cwd: d.project } });
  assert.deepEqual(again.body.messages, [], 'handed over once');
});

test('a message for an idle session resumes it in the background', async () => {
  const id = '66666666-2222-4333-8444-555555555555';
  await d.call('POST', '/api/hook', { event: 'SessionStart', input: { session_id: id, cwd: d.project } });
  const result = await act({ type: 'tell', session: id, text: 'Now the changelog' });
  assert.equal(result.ok, true, result.message);
  const run = await runOf(result.run);
  assert.equal(run.status, 'done');
  const call = await nextCall((c) => c.stdin === 'Now the changelog');
  assert.equal(call.args[call.args.indexOf('--resume') + 1], id);
});

test('a session opens in a terminal by its id, and only a real id', async () => {
  const id = '77777777-2222-4333-8444-555555555555';
  const result = await act({ type: 'openSession', id });
  assert.equal(result.ok, true, result.message);
  await nextCall((c) => c.args.join(' ') === `--resume ${id}`);
  assert.equal((await act({ type: 'openSession', id: '--help' })).ok, false);
  assert.equal((await act({ type: 'tell', session: '; rm -rf ~', text: 'x' })).ok, false);
});

test('files open in the editor, at their line, only from the projects', async () => {
  const result = await act({ type: 'openFile', path: '../README.md', line: 3 });
  assert.equal(result.ok, true, result.message);
  await nextCall((c) => c.args.join(' ') === join(d.project, 'README.md'));
  const outside = await act({ type: 'openFile', path: '/etc/hosts' });
  assert.equal(outside.ok, false);
  assert.match(outside.message, /outside the projects/);
  assert.equal((await act({ type: 'openFile', path: 'nowhere.md' })).ok, false);
  assert.equal((await act({ type: 'openUrl', url: 'https://example.com' })).ok, false, 'the viewer opens those itself');
});

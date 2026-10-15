// The commands agents and their hooks use, run as Claude Code runs them:
// hooks with their JSON on standard input, the MCP server over its pipes.

import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { daemon } from './helpers.mjs';

const cli = new URL('../src/cli.ts', import.meta.url).pathname;
let d;

before(async () => {
  d = await daemon();
  await d.call('PUT', '/api/settings', { autoOpen: false });
});
after(() => d?.stop());

function run(args, { input, cwd = d.project } = {}) {
  return new Promise((done) => {
    const child = execFile(process.execPath, [cli, ...args], { cwd, env: { ...process.env, ATELIER_HOME: d.home } }, (error, stdout, stderr) =>
      done({ code: error?.code ?? 0, stdout, stderr }),
    );
    child.stdin.end(input ?? '');
  });
}

const hook = async (event, input) => {
  const r = await run(['hook', event], { input: JSON.stringify({ session_id: 'hooked', cwd: d.project, hook_event_name: event, ...input }) });
  assert.equal(r.code, 0, r.stderr);
  return r.stdout.trim() ? JSON.parse(r.stdout) : null;
};

test('a canvas the agent writes is checked, and its problems handed back', async () => {
  d.write('.atelier/broken.canvas.tsx', 'export default function B() {\n  return <div style={{ color: "#fff" }}>{missing}</div>;\n}\n');
  const out = await hook('PostToolUse', { tool_name: 'Write', tool_input: { file_path: '.atelier/broken.canvas.tsx' } });
  assert.equal(out.decision, 'block');
  assert.match(out.reason, /\.atelier\/broken\.canvas\.tsx:2:\d+: .*missing/);
  assert.match(out.reason, /colour/i);
});

test('a canvas that passes is shown, and the agent is told', async () => {
  const file = d.write('.atelier/good.canvas.tsx', 'import { Panel } from "atelier";\nexport default function G() {\n  return <Panel title="Good">fine</Panel>;\n}\n');
  const out = await hook('PostToolUse', { tool_name: 'Write', tool_input: { file_path: file } });
  assert.equal(out.decision, undefined);
  assert.match(out.hookSpecificOutput.additionalContext, /no problems/);
  const { body } = await d.call('GET', '/api/canvases');
  assert.ok(body.canvases.some((c) => c.path === file));
});

test("files the agent writes elsewhere are left alone, and the viewer's files are refused", async () => {
  assert.equal(await hook('PostToolUse', { tool_name: 'Write', tool_input: { file_path: 'src/index.ts' } }), null);
  const out = await hook('PostToolUse', { tool_name: 'Write', tool_input: { file_path: '.atelier/good.state.json' } });
  assert.equal(out.decision, 'block');
  assert.match(out.reason, /only by the Atelier viewer/);
});

test('a session that starts hears about the canvases, and is listed', async () => {
  const out = await hook('SessionStart', { source: 'startup' });
  assert.match(out.hookSpecificOutput.additionalContext, /good\.canvas\.tsx/);
  await hook('UserPromptSubmit', { prompt: 'Plan the release' });
  const { body } = await d.call('GET', '/api/sessions');
  const s = body.sessions.find((x) => x.id === 'hooked');
  assert.equal(s.status, 'working');
  assert.equal(s.title, 'Plan the release');
  assert.equal(await hook('Stop', { stop_hook_active: false }), null, 'nothing waiting, so the turn ends');
});

test('a session hears what the user did on its canvases: when it sends a prompt, when its turn ends, and when it resumes', async () => {
  const as = (id) => (event, input = {}) => hook(event, { session_id: id, ...input });
  const owner = as('owner-session');
  const stranger = as('stranger-session');
  await owner('SessionStart', { source: 'startup' });
  await stranger('SessionStart', { source: 'startup' });
  const file = d.write('.atelier/owned.canvas.tsx', 'import { Panel } from "atelier";\nexport default function O() {\n  return <Panel title="Owned">x</Panel>;\n}\n');
  await owner('PostToolUse', { tool_name: 'Write', tool_input: { file_path: file } });
  const { body } = await d.call('GET', '/api/canvases');
  const id = body.canvases.find((c) => c.path === file).id;
  const put = (key, value) => d.call('PUT', `/api/state?id=${id}`, { key, value });
  await new Promise((r) => setTimeout(r, 20));

  // Between turns: the next prompt brings it, without the noise, once.
  await put('approval:cut-2', { state: 'approved', note: 'tighter', at: new Date().toISOString() });
  await put('tab', 'plan');
  await put('checks', { fee: true, screens: null });
  const caught = await owner('UserPromptSubmit', { prompt: 'carry on' });
  const context = caught.hookSpecificOutput.additionalContext;
  assert.match(context, /\.atelier\/owned\.canvas\.tsx: approval cut-2: approved \(note: "tighter"\)/);
  assert.match(context, /checklist ticked: fee/);
  assert.doesNotMatch(context, /tab/);
  assert.equal(await owner('UserPromptSubmit', { prompt: 'again' }), null, 'told once');
  assert.equal(await stranger('UserPromptSubmit', { prompt: 'hello' }), null, "another session's canvases aren't its news");

  // During a turn: the turn doesn't end until it has heard.
  await put('needsYou', { store: { state: 'done', at: new Date().toISOString() } });
  const stop = await owner('Stop', { stop_hook_active: false });
  assert.equal(stop.decision, 'block');
  assert.match(stop.reason, /needs you: store done/);
  assert.equal(await owner('Stop', { stop_hook_active: true }), null, 'and then it can stop');

  // What canvas_wait already returned isn't told again.
  const since = new Date().toISOString();
  await put('form:brief', { values: { goal: 'Ship' }, at: since });
  const waited = await d.call('GET', `/api/wait?id=${id}&keys=form:&since=${encodeURIComponent(since)}&timeout=2`);
  assert.equal(waited.body.events.length, 1);
  assert.equal(await owner('UserPromptSubmit', { prompt: 'next' }), null);

  // A resumed session catches up on what happened while it was away.
  await put('approval:cut-3', { state: 'held', at: new Date().toISOString() });
  const resumed = await owner('SessionStart', { source: 'resume' });
  assert.match(resumed.hookSpecificOutput.additionalContext, /approval cut-3: held/);
  assert.match(resumed.hookSpecificOutput.additionalContext, /This project has Atelier canvases/);
});

test('a hook with nothing to go on does no harm', async () => {
  const r = await run(['hook', 'PostToolUse'], { input: 'not json' });
  assert.equal(r.code, 0);
  assert.equal(r.stdout, '');
});

test('atelier new starts a canvas that passes its check', async () => {
  const r = await run(['new', 'custom', 'release-plan', '--no-open']);
  assert.equal(r.code, 0, r.stderr);
  const file = join(d.project, '.atelier/release-plan.canvas.tsx');
  assert.ok(existsSync(file));
  assert.match(readFileSync(file, 'utf8'), /title: "Release plan"/);
  const checked = await run(['check', file]);
  assert.equal(checked.code, 0, checked.stdout);
  assert.equal((await run(['new', 'custom', 'release-plan', '--no-open'])).code, 1, "an existing canvas isn't replaced");
  const unknown = await run(['new', 'nope', 'x']);
  assert.equal(unknown.code, 1);
  assert.match(unknown.stderr, /no template called "nope"/);
});

/** The MCP server, as Claude Code runs it. */
function mcp() {
  const child = spawn(process.execPath, [cli, 'mcp'], { cwd: d.project, env: { ...process.env, ATELIER_HOME: d.home }, stdio: ['pipe', 'pipe', 'pipe'] });
  const waiting = new Map();
  let buffer = '';
  let n = 0;
  child.stdout.on('data', (chunk) => {
    buffer += chunk;
    let i;
    while ((i = buffer.indexOf('\n')) >= 0) {
      const msg = JSON.parse(buffer.slice(0, i));
      buffer = buffer.slice(i + 1);
      waiting.get(msg.id)?.(msg);
    }
  });
  const ask = (method, params) =>
    new Promise((done) => {
      const id = ++n;
      waiting.set(id, done);
      child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
    });
  return { ask, tool: async (name, args) => (await ask('tools/call', { name, arguments: args })).result, close: () => child.stdin.end() };
}

test('the MCP server lists its tools and checks canvases', async () => {
  const m = mcp();
  const init = await m.ask('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '1' } });
  assert.equal(init.result.protocolVersion, '2025-06-18');
  assert.equal(init.result.serverInfo.name, 'atelier');
  const { result } = await m.ask('tools/list', {});
  assert.deepEqual(result.tools.map((t) => t.name), ['canvas_open', 'canvas_check', 'canvas_state', 'canvas_list', 'canvas_wait']);
  const bad = await m.tool('canvas_check', { path: '.atelier/broken.canvas.tsx' });
  assert.equal(bad.isError, true);
  assert.match(bad.content[0].text, /missing/);
  assert.equal((await m.tool('canvas_check', { path: '.atelier/good.canvas.tsx' })).content[0].text, 'No problems.');
  const listed = await m.tool('canvas_list', {});
  assert.match(listed.content[0].text, /good\.canvas\.tsx/);
  const unknown = await m.ask('resources/list', {});
  assert.equal(unknown.error.code, -32601);
  m.close();
});

test('canvas_wait returns the answer the user gives', async () => {
  const m = mcp();
  await m.ask('initialize', { protocolVersion: '2025-06-18' });
  const waiting = m.tool('canvas_wait', { path: '.atelier/good.canvas.tsx', keys: ['form:'], timeout_seconds: 20 });
  await new Promise((r) => setTimeout(r, 600));
  const { body } = await d.call('GET', '/api/canvases');
  const id = body.canvases.find((c) => c.path.endsWith('good.canvas.tsx')).id;
  await d.call('PUT', `/api/state?id=${id}`, { key: 'tab', value: 'plan' });
  await d.call('PUT', `/api/state?id=${id}`, { key: 'form:brief', value: { values: { goal: 'Ship 1.4' } } });
  const answer = await waiting;
  assert.match(answer.content[0].text, /form:brief = \{"values":\{"goal":"Ship 1.4"\}\}/);
  assert.doesNotMatch(answer.content[0].text.split('The canvas')[0], /tab =/);
  const state = await m.tool('canvas_state', { path: '.atelier/good.canvas.tsx' });
  assert.match(state.content[0].text, /"goal": "Ship 1.4"/);
  const quiet = await m.tool('canvas_wait', { path: '.atelier/good.canvas.tsx', keys: ['approval:'], timeout_seconds: 1 });
  assert.match(quiet.content[0].text, /No answer in 1 seconds/);
  m.close();
});

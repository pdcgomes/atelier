import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { request } from 'node:http';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { PNG, daemon } from './helpers.mjs';

let d;
before(async () => {
  d = await daemon({ env: { ATELIER_NO_BROWSER: '1' } });
  await d.call('PUT', '/api/settings', { autoOpen: false });
});
after(() => d?.stop());

const CANVAS = `import { Panel, Text } from "atelier";
export const meta = { title: "Release 1.4" };
export default function Release() {
  return <Panel title="Release"><Text>Version one</Text></Panel>;
}
`;

test('only 127.0.0.1, and only with the token', async () => {
  const wrongHost = await new Promise((done, fail) =>
    request({ host: '127.0.0.1', port: d.info.port, path: '/api/status', headers: { host: 'atelier.example.com', authorization: `Bearer ${d.info.token}` } }, (res) => {
      res.resume();
      done(res.statusCode);
    })
      .on('error', fail)
      .end(),
  );
  assert.equal(wrongHost, 421, 'a rebound hostname is refused');
  assert.equal((await fetch(`${d.base}/api/status`)).status, 401);
  assert.equal((await fetch(`${d.base}/api/status`, { headers: { authorization: 'Bearer nope' } })).status, 401);
  const ok = await d.call('GET', '/api/status');
  assert.equal(ok.status, 200);
  assert.equal(ok.body.pid > 0, true);
});

test("the viewer's link sets a cookie, and the page has its policy", async () => {
  const link = await fetch(`${d.base}/?t=${d.info.token}&c=abc`, { redirect: 'manual' });
  assert.equal(link.status, 302);
  assert.equal(link.headers.get('location'), '/#c=abc');
  const cookie = link.headers.get('set-cookie');
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);
  const page = await fetch(`${d.base}/`, { headers: { cookie: cookie.split(';')[0] } });
  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-security-policy'), /frame-src 'self'/);
  const frame = await fetch(`${d.base}/frame.html`);
  assert.equal(frame.status, 200, "the frame's page needs no session");
  assert.match(frame.headers.get('content-security-policy'), /^default-src 'none'/);
  const bad = await fetch(`${d.base}/?t=wrong`, { redirect: 'manual' });
  assert.equal(bad.status, 401);
});

test('a write with the cookie has to come from the viewer itself', async () => {
  const file = d.write('.atelier/origin.canvas.tsx', CANVAS);
  const { body } = await d.call('POST', '/api/open', { path: file });
  const cookie = (await fetch(`${d.base}/?t=${d.info.token}`, { redirect: 'manual' })).headers.get('set-cookie').split(';')[0];
  const put = (origin) =>
    fetch(`${d.base}/api/state?id=${body.canvas.id}`, { method: 'PUT', headers: { cookie, 'content-type': 'application/json', ...(origin ? { origin } : {}) }, body: JSON.stringify({ key: 'x', value: 1 }) });
  assert.equal((await put('https://evil.example')).status, 403);
  assert.equal((await put()).status, 403, 'no Origin, no write');
  assert.equal((await put(d.base)).status, 200);
});

test('a canvas is found, built, and told apart from the next version', async () => {
  const file = d.write('.atelier/release.canvas.tsx', CANVAS);
  const opened = await d.call('POST', '/api/open', { path: file });
  assert.equal(opened.status, 200);
  assert.equal(opened.body.shown, false, 'no viewer is open and the browser is off');
  const id = opened.body.canvas.id;
  const list = await d.call('GET', '/api/canvases');
  const listed = list.body.canvases.find((c) => c.id === id);
  assert.equal(listed.title, 'Release 1.4');
  assert.equal(listed.project, d.project);

  const first = await d.call('GET', `/api/canvas?id=${id}`);
  assert.equal(first.status, 200);
  assert.equal(first.body.built.kind, 'module');
  assert.match(first.body.built.code, /globalThis\.__atelier\["atelier"\]/);
  const tag = first.headers.get('etag');
  assert.equal((await d.call('GET', `/api/canvas?id=${id}`, undefined, { 'if-none-match': tag })).status, 304);

  const events = await d.events();
  writeFileSync(file, CANVAS.replace('Version one', 'Version two'));
  await events.next('canvas', (e) => e.id === id);
  const second = await d.call('GET', `/api/canvas?id=${id}`, undefined, { 'if-none-match': tag });
  assert.equal(second.status, 200);
  assert.match(second.body.built.code, /Version two/);
  events.close();
});

test("a canvas opens in its own theme or its template's, and a theme picked for it is view state", async () => {
  const wireframes = d.write('.atelier/screens.canvas.json', JSON.stringify({ template: 'wireframes', title: 'Screens', intro: 'Drawn today.', screens: [{ id: 'a', name: 'A' }] }));
  const nord = d.write('.atelier/nord-screens.canvas.json', JSON.stringify({ template: 'wireframes', theme: 'nord', title: 'Screens', intro: 'Drawn today.', screens: [{ id: 'a', name: 'A' }] }));
  const tsx = d.write('.atelier/themed.canvas.tsx', CANVAS.replace('title: "Release 1.4"', 'title: "Themed", theme: "rose-pine"'));
  const ids = [];
  for (const path of [wireframes, nord, tsx, d.write('.atelier/plain.canvas.tsx', CANVAS)]) ids.push((await d.call('POST', '/api/open', { path })).body.canvas.id);
  const listed = (await d.call('GET', '/api/canvases')).body.canvases;
  assert.deepEqual(ids.map((id) => listed.find((c) => c.id === id).theme), ['cursor', 'nord', 'rose-pine', undefined]);
  await d.call('PUT', `/api/state?id=${ids[0]}`, { key: 'theme', value: 'gruvbox' });
  const state = await d.call('GET', `/api/state?id=${ids[0]}`);
  assert.equal(state.body.state.theme, 'gruvbox');
  assert.deepEqual(state.body.events ?? [], [], 'a theme picked for a canvas isn\'t news for the agent');
});

test('a canvas is the same canvas by any path to it', async () => {
  const file = d.write('.atelier/linked.canvas.tsx', CANVAS);
  const link = join(d.root, 'project-link');
  symlinkSync(d.project, link);
  const direct = await d.call('POST', '/api/open', { path: file });
  const through = await d.call('POST', '/api/open', { path: join(link, '.atelier/linked.canvas.tsx') });
  assert.equal(through.status, 200, through.body.error);
  assert.equal(through.body.canvas.id, direct.body.canvas.id);
});

test("a canvas that doesn't build says why", async () => {
  const file = d.write('.atelier/broken.canvas.tsx', 'export default function () { return <div>; }');
  const { body } = await d.call('POST', '/api/open', { path: file });
  const res = await d.call('GET', `/api/canvas?id=${body.canvas.id}`);
  assert.equal(res.status, 422);
  assert.equal(res.body.built.kind, 'problem');
  assert.ok(res.body.built.problems[0].line >= 1);
});

test('state is kept beside the canvas, with each change logged', async () => {
  const file = d.write('.atelier/marks.canvas.tsx', CANVAS);
  const { body } = await d.call('POST', '/api/open', { path: file });
  const id = body.canvas.id;
  const events = await d.events();
  assert.equal((await d.call('PUT', `/api/state?id=${id}`, { key: 'needsYou', value: { steam: { state: 'done' } } })).status, 200);
  await d.call('PUT', `/api/state?id=${id}`, { key: 'tab', value: 'plan' });
  const pushed = await events.next('state', (e) => e.id === id);
  assert.equal(pushed.state.needsYou.steam.state, 'done');
  const kept = JSON.parse(readFileSync(join(d.project, '.atelier/marks.state.json'), 'utf8'));
  assert.deepEqual(kept, { needsYou: { steam: { state: 'done' } }, tab: 'plan' });
  const lines = readFileSync(join(d.project, '.atelier/marks.events.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  assert.deepEqual(lines.map((l) => l.key), ['needsYou'], 'the tab is kept in the state, not logged');
  const state = await d.call('GET', `/api/state?id=${id}&since=${encodeURIComponent(lines[0].at)}`);
  assert.deepEqual(state.body.events.map((e) => e.key), lines.slice(1).filter((l) => l.at > lines[0].at).map((l) => l.key));
  events.close();
});

test('waiting for an answer ends when one comes', async () => {
  const file = d.write('.atelier/ask.canvas.tsx', CANVAS);
  const { body } = await d.call('POST', '/api/open', { path: file });
  const id = body.canvas.id;
  const since = new Date().toISOString();
  const waiting = d.call('GET', `/api/wait?id=${id}&keys=form:&since=${encodeURIComponent(since)}&timeout=10`);
  await new Promise((r) => setTimeout(r, 200));
  await d.call('PUT', `/api/state?id=${id}`, { key: 'tab', value: 'other' });
  await d.call('PUT', `/api/state?id=${id}`, { key: 'form:brief', value: { values: { goal: 'Go' }, at: since } });
  const answered = await waiting;
  assert.equal(answered.body.timedOut, false);
  assert.deepEqual(answered.body.events.map((e) => e.key), ['form:brief'], 'only the answer asked for');
  const quiet = await d.call('GET', `/api/wait?id=${id}&keys=approval:&timeout=1`);
  assert.equal(quiet.body.timedOut, true);
});

test('files come only from the projects, and only images, video, PDFs and Markdown', async () => {
  const file = d.write('.atelier/media.canvas.tsx', CANVAS);
  const { body } = await d.call('POST', '/api/open', { path: file });
  const id = body.canvas.id;
  writeFileSync(join(d.project, 'shot.png'), PNG);
  writeFileSync(join(d.project, 'fake.png'), 'not a picture');
  writeFileSync(join(d.project, 'notes.md'), '# Notes');
  writeFileSync(join(d.project, 'page.html'), '<script>alert(1)</script>');
  symlinkSync('/etc/hosts', join(d.project, 'hosts.png'));
  const get = (path) => d.call('GET', `/api/file?canvas=${id}&path=${encodeURIComponent(path)}`);

  const shot = await get('shot.png');
  assert.equal(shot.status, 200, 'relative to the project');
  assert.equal((await get('../shot.png')).status, 200, 'and to the canvas, where the project has no such file');
  assert.equal(shot.headers.get('content-type'), 'image/png');
  assert.match(shot.headers.get('content-security-policy'), /sandbox/);
  assert.equal((await get(join(d.project, 'notes.md'))).status, 200);
  assert.equal((await get(join(d.project, 'fake.png'))).status, 415, 'a PNG by name has to be one by content');
  assert.equal((await get(join(d.project, 'page.html'))).status, 415, 'HTML is never served');
  assert.equal((await get(join(d.project, 'hosts.png'))).status, 403, 'a symlink out of the project is followed, then refused');
  assert.equal((await get('/etc/hosts')).status, 403);
  assert.equal((await get(join(d.project, 'gone.png'))).status, 404, 'missing, where it would be served');
  assert.equal((await get('/nowhere/gone.png')).status, 403, 'and the same answer as anywhere else outside');
});

test('hooks tell the daemon what sessions are doing', async () => {
  const hook = (event, input) => d.call('POST', '/api/hook', { event, input: { session_id: 's1', cwd: d.project, ...input } });
  await hook('SessionStart', { source: 'startup' });
  await hook('UserPromptSubmit', { prompt: 'Build the release canvas\nwith the plan' });
  let { body } = await d.call('GET', '/api/sessions');
  assert.equal(body.sessions[0].status, 'working');
  assert.equal(body.sessions[0].title, 'Build the release canvas');
  await hook('Notification', { message: 'Claude needs your permission' });
  ({ body } = await d.call('GET', '/api/sessions'));
  assert.equal(body.sessions[0].status, 'waiting');
  const stop = await hook('Stop', {});
  assert.deepEqual(stop.body.messages, []);
  ({ body } = await d.call('GET', '/api/sessions'));
  assert.equal(body.sessions[0].status, 'idle');
});

test('the daemon writes where it is, for you alone', () => {
  const info = join(d.home, 'daemon.json');
  assert.ok(existsSync(info));
  assert.equal(statSync(info).mode & 0o777, 0o600);
});

test('an app following along, such as haunt, is no viewer, and can have the themes', async () => {
  const before = (await d.call('GET', '/api/status')).body.viewers;
  const res = await fetch(`${d.base}/api/events?client=haunt`, { headers: { authorization: `Bearer ${d.info.token}` } });
  const reader = res.body.getReader();
  const { value } = await reader.read();
  assert.match(new TextDecoder().decode(value), /event: hello/);
  assert.equal((await d.call('GET', '/api/status')).body.viewers, before, 'so a canvas an agent shows still opens the browser');
  await reader.cancel();
  const { status, body } = await d.call('GET', '/api/themes');
  assert.equal(status, 200);
  const tokyo = body.themes.find((t) => t.id === 'tokyo-night');
  assert.ok(tokyo?.colors?.bg && tokyo.colors.accent, 'each theme with its colours');
});

test('atelier-tui is a viewer in a terminal, with the terminal runtime and the kit it draws', async () => {
  const before = (await d.call('GET', '/api/status')).body;
  const res = await fetch(`${d.base}/api/events?viewer=terminal`, { headers: { authorization: `Bearer ${d.info.token}` } });
  const reader = res.body.getReader();
  assert.match(new TextDecoder().decode((await reader.read()).value), /event: hello/);
  const during = (await d.call('GET', '/api/status')).body;
  assert.equal(during.viewers, before.viewers + 1, 'so a canvas an agent shows goes to it, not to a new browser tab');
  assert.equal(during.viewerKinds.terminal, before.viewerKinds.terminal + 1);
  await reader.cancel();

  const js = await d.call('GET', '/terminal.js');
  assert.equal(js.status, 200);
  assert.match(js.headers.get('content-type'), /javascript/);
  assert.ok(js.headers.get('etag'));
  assert.match(js.body.toString(), /__terminal/);
  const kit = await d.call('GET', '/api/kit');
  assert.equal(kit.status, 200);
  assert.ok(kit.body.kit.components.Panel.props.includes('title'), 'every component, with its props');
  assert.equal(kit.body.version, before.version);
});

test('with the viewer set to the terminal, a canvas opens in atelier-tui in a terminal tab', async () => {
  const log = join(d.root, 'tui.log');
  const stub = join(d.root, 'atelier-tui');
  writeFileSync(stub, `#!/bin/sh\necho "$@" >> '${log}'\n`, { mode: 0o755 });
  const t = await daemon({ env: { ATELIER_TUI: stub } });
  try {
    await t.call('PUT', '/api/settings', { autoOpen: true, viewer: 'terminal', terminal: 'custom', terminalCommand: ['/bin/sh', '{script}'] });
    const file = t.write('.atelier/plan.canvas.json', JSON.stringify({ template: 'checklist', title: 'Plan', groups: [] }));
    const { body } = await t.call('POST', '/api/open', { path: file });
    assert.equal(body.in, 'terminal');
    for (let i = 0; i < 50 && !existsSync(log); i++) await new Promise((r) => setTimeout(r, 100));
    assert.equal(readFileSync(log, 'utf8').trim(), body.canvas.path, 'atelier-tui is started on the canvas');
  } finally {
    await t.stop();
  }
});

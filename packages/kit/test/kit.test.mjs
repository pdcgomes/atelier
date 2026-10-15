// The kit in a real browser: forms, marks and saved state reach the viewer
// as they should, and the hooks follow what the viewer sends.

import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { after, before, test } from 'node:test';
import { launch } from '../../../scripts/lib/chrome.mjs';
import { harness } from '../../../scripts/lib/harness.mjs';

const gallery = new URL('../../../examples/gallery/gallery.canvas.tsx', import.meta.url).pathname;
const hooks = new URL('./fixtures/hooks.canvas.tsx', import.meta.url).pathname;
const chromeMissing = !existsSync(process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');

let chrome, served, servedHooks;
const enc = (v) => encodeURIComponent(JSON.stringify(v));
const posted = (type, key) => chrome.js(`window.__posted.filter((m) => m.type === ${JSON.stringify(type)}${key ? ` && m.key === ${JSON.stringify(key)}` : ''})`);
async function open(url, state = {}) {
  await chrome.goto(`${url}?state=${enc(state)}`);
  await chrome.until('document.body.dataset.shown === "yes"', 20);
}

before(async () => {
  if (chromeMissing) return;
  served = await harness(gallery);
  servedHooks = await harness(hooks);
  chrome = await launch({ width: 1100, height: 900 });
});
after(async () => {
  await chrome?.close();
  served?.close();
  servedHooks?.close();
});

test('a form is only sent once it passes its checks', { skip: chromeMissing }, async () => {
  await open(served.url, { tab: 'forms' });
  await chrome.press('Send');
  assert.ok(await chrome.js(`document.body.textContent.includes('Say what the lane is for.')`), 'the problem is shown by the field');
  assert.equal((await posted('set-state', 'form:brief')).length, 0);

  await chrome.type('input[placeholder="What the lane should deliver"]', 'Make the grid faster');
  await chrome.press('Send');
  const [sent] = await posted('set-state', 'form:brief');
  assert.equal(sent.value.values.goal, 'Make the grid faster');
  assert.equal(sent.value.values.lane, 'ui', 'answers left as they were keep their initial values');
  assert.ok(Date.parse(sent.value.at));
  const [action] = await posted('action');
  assert.deepEqual(action.action, { type: 'startSession', prompt: 'Start the ui lane: Make the grid faster', mode: 'background' });
  assert.ok(await chrome.js(`document.body.textContent.includes('Send again')`));
});

test('Needs you items and approvals leave marks in the state', { skip: chromeMissing }, async () => {
  await open(served.url, { tab: 'forms' });
  await chrome.press('Done');
  const [mark] = await posted('set-state', 'needsYou');
  assert.equal(mark.value.steam.state, 'done');
  assert.ok(await chrome.js(`[...document.querySelectorAll('.at-badge')].some((b) => b.textContent.startsWith('done'))`));

  await chrome.type('textarea[placeholder="A note for the agent (optional)"]', 'Tighter hook');
  await chrome.press('Approve');
  const [approval] = await posted('set-state', 'approval:cut-3');
  assert.equal(approval.value.state, 'approved');
  assert.equal(approval.value.note, 'Tighter hook');

  await chrome.js(`[...document.querySelectorAll('.at-ask')].find((a) => a.textContent.includes("Episode 3")).querySelector('button').click()`);
  const marks = await posted('set-state', 'approval:cut-3');
  assert.equal(marks.at(-1).value, null, 'Undo takes the mark back');
});

test('tabs, tables and saved state', { skip: chromeMissing }, async () => {
  await open(served.url, { tab: 'words' });
  assert.ok(await chrome.js(`[...document.querySelectorAll('.at-panel-title')].some((t) => t.textContent === 'Markdown')`), 'the tab kept in the state is open');

  await chrome.js(`[...document.querySelectorAll('[role=tab]')].find((t) => t.textContent.includes('Core')).click()`);
  const tabs = await posted('set-state', 'tab');
  assert.equal(tabs.at(-1).value, 'core');

  const first = () => chrome.js(`document.querySelector('.at-table tbody tr td').textContent`);
  assert.equal(await first(), 'LIB-01');
  await chrome.js(`[...document.querySelectorAll('.at-table th button')].find((b) => b.textContent.startsWith('Tests')).click()`);
  assert.equal(await first(), 'LIB-04', 'sorted by tests, fewest first');
  await chrome.type('.at-table-tools input', 'culling');
  assert.equal(await chrome.js(`document.querySelectorAll('.at-table tbody tr').length`), 1, 'filtered to the one row');
});

test('the hooks follow what the viewer sends', { skip: chromeMissing }, async () => {
  const sessions = [{ id: 'a', status: 'working', project: '/p', at: Date.now() }];
  await chrome.goto(`${servedHooks.url}?theme=gruvbox&state=${enc({ count: 2 })}&sessions=${enc(sessions)}`);
  await chrome.until('document.body.dataset.shown === "yes"', 20);
  assert.equal(await chrome.js(`document.getElementById('theme').textContent`), 'Gruvbox');
  assert.equal(await chrome.js(`document.getElementById('working').textContent`), '1');
  assert.equal(await chrome.js(`document.getElementById('bump').textContent`), '2');

  await chrome.js(`window.postMessage({ type: 'sessions', sessions: [...${JSON.stringify(sessions)}, { id: 'b', status: 'idle', project: '/p', at: 0 }] }, '*')`);
  await chrome.until(`document.getElementById('sessions').textContent === '2'`);
  await chrome.js(`document.getElementById('bump').click()`);
  const [set] = await posted('set-state', 'count');
  assert.equal(set.value, 3, 'set from the value kept in the state');
  await chrome.js(`window.postMessage({ type: 'state', state: { count: 9 } }, '*')`);
  await chrome.until(`document.getElementById('bump').textContent === '9'`);
});

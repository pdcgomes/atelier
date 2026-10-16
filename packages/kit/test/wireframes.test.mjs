// The wireframes: every tab of every example draws in a real browser without
// an error, and a question answered on the canvas leaves the same state in the
// browser and in the terminal, so the agent hears the same from either.

import assert from 'node:assert/strict';
import { copyFileSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { compile } from '../../daemon/src/compile.ts';
import { launch } from '../../../scripts/lib/chrome.mjs';
import { harness } from '../../../scripts/lib/harness.mjs';
import { terminal } from '../../../scripts/lib/terminal.mjs';

const repo = new URL('../../../', import.meta.url).pathname;
const chromeMissing = !existsSync(process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome') && 'Chrome is not installed';
const dir = mkdtempSync(join(tmpdir(), 'atelier-wireframes-'));
const example = join(dir, 'import.canvas.json');
copyFileSync(join(repo, 'templates/wireframes/example.json'), example);
const examples = [example, ...readdirSync(join(repo, 'examples/wireframes')).filter((f) => /\.canvas\.(tsx|json)$/.test(f)).map((f) => join(repo, 'examples/wireframes', f))];
let chrome;

before(async () => {
  if (!chromeMissing) chrome = await launch({ width: 1200, height: 900 });
});
after(async () => {
  await chrome?.close();
  rmSync(dir, { recursive: true, force: true });
});

/** A canvas as the terminal's engine starts it. */
async function started(file, state = {}) {
  if (file.endsWith('.json')) {
    const data = JSON.parse(readFileSync(file, 'utf8'));
    return terminal({ kind: 'template', template: data.template, data }, { state });
  }
  return terminal({ kind: 'module', code: (await compile(file)).code }, { state });
}

test('the examples cover every wireframe component', () => {
  const kit = JSON.parse(readFileSync(join(repo, 'packages/kit/kit.json'), 'utf8'));
  const wireframe = Object.entries(kit.components).filter(([, c]) => c.module === 'wireframe').map(([name]) => name);
  const drawn = (file) => wireframe.filter((name) => new RegExp(`<${name}\\b`).test(readFileSync(file, 'utf8')));
  const used = new Set(examples.filter((f) => f.endsWith('.tsx')).flatMap(drawn));
  if (examples.some((f) => f.endsWith('.json'))) for (const name of drawn(join(repo, 'templates/wireframes/view.tsx'))) used.add(name);
  assert.deepEqual(wireframe.filter((n) => !used.has(n)), []);
});

for (const file of examples) {
  const name = file.split('/').pop();
  test(`every tab of ${name} draws in the browser`, { skip: chromeMissing }, async () => {
    const tabs = (await started(file)).find((n) => n.t === 'Tabs')?.p.tabs ?? [];
    assert.ok(tabs.length >= 3, `${name} has an overview, its screens and its questions`);
    const served = await harness(file);
    try {
      for (const [i, tab] of tabs.entries()) {
        for (const theme of i === 0 ? ['tokyo-night', 'catppuccin-latte'] : ['tokyo-night']) {
          await chrome.goto(`${served.url}?theme=${theme}&state=${encodeURIComponent(JSON.stringify({ tab }))}`);
          await chrome.until('document.body.dataset.shown', 20);
          assert.equal(await chrome.js('document.body.dataset.shown'), 'yes', `${name}, ${tab} in ${theme}`);
          assert.deepEqual(await chrome.js('window.__posted.filter((m) => m.type === "error").map((m) => m.message)'), [], `${name}, ${tab}`);
          assert.equal(await chrome.js(`document.querySelector('[role=tab][aria-selected=true]')?.textContent.includes(${JSON.stringify(String(i + 1))})`), true, `${name} opens on ${tab}`);
        }
      }
    } finally {
      served.close();
    }
  });
}

test('answering a question leaves the same state in the browser and the terminal', { skip: chromeMissing }, async () => {
  const key = (m) => m.type === 'set-state' && /^(form|draft):question:/.test(m.key);
  const strip = (v) => JSON.parse(JSON.stringify(v, (k, x) => (k === 'at' ? '…' : x)));

  const t = await started(example, { tab: 'questions' });
  t.dispatch(t.find((n) => n.t === 'Radio'), 'change', 'A');
  t.dispatch(t.find((n) => n.t === 'TextArea'), 'change', 'Ask before erasing');
  t.dispatch(t.find((n) => n.t === 'Button' && t.text(n) === 'Send my answer'), 'press');
  const fromTerminal = t.posts.filter(key);
  const sent = fromTerminal.find((m) => m.key === 'form:question:erase-default');
  assert.deepEqual(strip(sent.value), { values: { option: 'A', note: 'Ask before erasing' }, at: '…' });

  const served = await harness(example);
  try {
    await chrome.goto(`${served.url}?state=${encodeURIComponent(JSON.stringify({ tab: 'questions' }))}`);
    await chrome.until('document.body.dataset.shown === "yes"', 20);
    await chrome.js(`[...document.querySelectorAll('.at-check')].find((l) => l.textContent.trim() === 'A').querySelector('input').click()`);
    await chrome.type('textarea', 'Ask before erasing');
    await chrome.press('Send my answer');
    const fromBrowser = await chrome.js(`window.__posted.filter((m) => m.type === 'set-state' && /^(form|draft):question:/.test(m.key))`);
    assert.deepEqual(strip(fromBrowser.filter((m) => m.key.startsWith('form:'))), strip(fromTerminal.filter((m) => m.key.startsWith('form:'))));
  } finally {
    served.close();
  }
});

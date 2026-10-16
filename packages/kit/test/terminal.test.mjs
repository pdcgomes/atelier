// The kit's terminal side keeps up with the browser's: the same components,
// every one of them drawn, and the same things left in a canvas's state for
// the same thing done, so an agent hears the same from either viewer.

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { compile } from '../../daemon/src/compile.ts';
import { current, manifest } from '../../../scripts/manifest.mjs';
import { terminal } from '../../../scripts/lib/terminal.mjs';
import { launch } from '../../../scripts/lib/chrome.mjs';
import { harness } from '../../../scripts/lib/harness.mjs';

const at = (p) => new URL(p, import.meta.url).pathname;
const galleryFile = at('../../../examples/gallery/gallery.canvas.tsx');
const chromeMissing = !existsSync(process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
const kit = manifest();
const gallery = (await compile(galleryFile)).code;
const tabs = [...readFileSync(galleryFile, 'utf8').matchAll(/\{ id: '(\w+)', label: '[^']*',[^}\n]*content:/g)].map((m) => m[1]);
const templates = [...readFileSync(at('../../../templates/index.ts'), 'utf8').matchAll(/template\('([\w-]+)'/g)].map((m) => m[1]);

const exportNames = (file) =>
  [...readFileSync(file, 'utf8').matchAll(/^export \{([^}]*)\} from/gm)]
    .flatMap((m) => m[1].split(','))
    .map((s) => s.trim().split(/\s+as\s+/).at(-1))
    .filter(Boolean)
    .sort();

test('kit.json says what the kit has now', () => {
  assert.ok(current(), 'packages/kit/kit.json is out of date: node scripts/build.mjs writes it; commit it');
});

test('the terminal kit exports everything the browser kit does', () => {
  assert.deepEqual(exportNames(at('../src/terminal/index.ts')), exportNames(at('../src/index.ts')));
});

test('the gallery uses every component, so the conformance frames draw them all', () => {
  const imported = new Set(/import \{([^}]*)\} from 'atelier'/.exec(readFileSync(galleryFile, 'utf8'))[1].split(',').map((s) => s.trim()));
  const missing = Object.keys(kit.components).filter((c) => !imported.has(c));
  assert.deepEqual(missing, [], `examples/gallery/gallery.canvas.tsx should show ${missing.join(', ')}`);
});

test('the components canvas has a sample of every component, and each draws in the terminal', async () => {
  const file = at('../../../examples/components/components.canvas.tsx');
  const sampled = [...readFileSync(file, 'utf8').matchAll(/^ {2}(\w+): \(\) =>/gm)].map((m) => m[1]);
  const missing = Object.keys(kit.components).filter((c) => !sampled.includes(c));
  assert.deepEqual(missing, [], `examples/components/components.canvas.tsx should have a sample of ${missing.join(', ')}, for atelier-tui's preview harness`);
  const code = (await compile(file)).code;
  for (const name of Object.keys(kit.components)) {
    const t = await terminal({ kind: 'module', code }, { state: { component: name } });
    assert.equal(t.error(), null, `${name}'s sample draws without an error`);
    if (!kit.components[name].composed) assert.ok(t.all().some((n) => n.t === name), `${name}'s sample draws a ${name}`);
  }
});

test('every component is drawn as an element of its own, or composed from others', async () => {
  const seen = new Set();
  const html = new Set();
  for (const tab of tabs) {
    const t = await terminal({ kind: 'module', code: gallery }, { state: { tab } });
    assert.equal(t.error(), null, `the gallery's ${tab} tab draws without an error`);
    for (const n of t.all()) (/^[A-Z]/.test(n.t) ? seen : html).add(n.t);
  }
  for (const name of templates) {
    const data = JSON.parse(readFileSync(at(`../../../templates/${name}/example.json`), 'utf8'));
    const t = await terminal({ kind: 'template', template: name, data });
    assert.equal(t.error(), null, `the ${name} template draws without an error`);
    for (const n of t.all()) (/^[A-Z]/.test(n.t) ? seen : html).add(n.t);
  }
  for (const [name, c] of Object.entries(kit.components)) {
    if (c.composed) assert.ok(!seen.has(name), `${name} is composed, so it has no element`);
    else assert.ok(seen.has(name), `${name} is drawn as an element in the gallery`);
  }
  const extra = [...html].filter((tag) => !kit.html.includes(tag));
  assert.deepEqual(extra, [], 'the kit only uses HTML that kit.json lists, which atelier-tui draws');
});

// The same things done in the gallery, as the browser's tests do them (kit.test.mjs).
async function scriptTerminal() {
  const writes = [];
  const forms = await terminal({ kind: 'module', code: gallery }, { state: { tab: 'forms' } });
  const inside = (node) => {
    const out = [];
    const walk = (list) => {
      for (const n of list ?? []) {
        if (typeof n === 'string') continue;
        out.push(n);
        walk(n.c);
        for (const s of Object.values(n.s ?? {})) walk(s);
      }
    };
    walk([node]);
    return out;
  };
  const press = (t, label, within) => {
    const scope = within ? inside(t.find(within)) : t.all();
    const b = scope.find((n) => n.t === 'Button' && t.text(n) === label);
    assert.ok(b, `there's a ${label} button`);
    assert.ok(t.dispatch(b, 'press'));
  };
  const approval = (n) => n.t === 'Approval';
  press(forms, 'Done');
  const note = forms.find((n) => n.t === 'TextArea' && n.p?.placeholder === 'A note for the agent (optional)');
  forms.dispatch(note, 'change', 'Tighter hook');
  press(forms, 'Approve', approval);
  press(forms, 'Undo', approval);
  writes.push(...forms.posts.filter((m) => m.type === 'set-state'));

  const words = await terminal({ kind: 'module', code: gallery }, { state: { tab: 'words' } });
  const bar = words.find((n) => n.t === 'Tabs');
  words.dispatch(bar, 'select', 'core');
  const table = words.find((n) => n.t === 'Table');
  words.dispatch(table, 'sortBy', table.p.columns.findIndex((c) => c.key === 'tests'));
  writes.push(...words.posts.filter((m) => m.type === 'set-state'));
  return { writes, words };
}

const strip = (v) => JSON.parse(JSON.stringify(v, (k, x) => (k === 'at' ? '…' : x)));

test('the terminal leaves what the browser leaves: marks, approvals, tabs', async () => {
  const { writes, words } = await scriptTerminal();
  const keys = writes.map((w) => w.key);
  assert.deepEqual(keys, ['needsYou', 'approval:cut-3', 'approval:cut-3', 'tab']);
  assert.equal(writes[0].value.steam.state, 'done');
  assert.deepEqual(strip(writes[1].value), { state: 'approved', note: 'Tighter hook', at: '…' });
  assert.equal(writes[2].value, null, 'Undo takes the mark back');
  assert.equal(writes[3].value, 'core');
  const table = words.find((n) => n.t === 'Table');
  const first = words.slot(table, `c:${table.p.rows[0].i}:0`);
  assert.equal(first, 'LIB-04', 'sorted by tests, fewest first');
});

test('a form is only sent once it passes its checks, in the terminal too', async () => {
  const t = await terminal({ kind: 'module', code: gallery }, { state: { tab: 'forms' } });
  const send = () => t.dispatch(t.find((n) => n.t === 'Button' && t.text(n) === 'Send'), 'press');
  send();
  assert.equal(t.posts.filter((m) => m.key === 'form:brief').length, 0);
  assert.equal(t.find((n) => n.t === 'TextInput').p.error, 'Say what the lane is for.');
  t.dispatch(t.find((n) => n.t === 'TextInput'), 'change', 'Make the grid faster');
  send();
  const sent = t.posts.find((m) => m.key === 'form:brief');
  assert.equal(sent.value.values.goal, 'Make the grid faster');
  assert.equal(sent.value.values.lane, 'ui');
  const action = t.posts.find((m) => m.type === 'action');
  assert.deepEqual(action.action, { type: 'startSession', prompt: 'Start the ui lane: Make the grid faster', mode: 'background' });
  assert.ok(t.find((n) => n.t === 'Button' && t.text(n) === 'Send again'));
});

test('the browser and the terminal write the same state for the same things done', { skip: chromeMissing }, async () => {
  const served = await harness(galleryFile);
  const chrome = await launch({ width: 1100, height: 900 });
  try {
    const open = async (state) => {
      await chrome.goto(`${served.url}?state=${encodeURIComponent(JSON.stringify(state))}`);
      await chrome.until('document.body.dataset.shown === "yes"', 20);
    };
    await open({ tab: 'forms' });
    await chrome.press('Done');
    await chrome.type('textarea[placeholder="A note for the agent (optional)"]', 'Tighter hook');
    await chrome.press('Approve');
    await chrome.js(`[...document.querySelectorAll('.at-ask')].find((a) => a.textContent.includes("Episode 3")).querySelector('button').click()`);
    const browser = await chrome.js(`window.__posted.filter((m) => m.type === 'set-state')`);
    await open({ tab: 'words' });
    await chrome.js(`[...document.querySelectorAll('[role=tab]')].find((t) => t.textContent.includes('Core')).click()`);
    browser.push(...(await chrome.js(`window.__posted.filter((m) => m.type === 'set-state' && !m.key.endsWith(':sort'))`)));
    const { writes } = await scriptTerminal();
    assert.deepEqual(strip(writes), strip(browser));
  } finally {
    await chrome.close();
    served.close();
  }
});

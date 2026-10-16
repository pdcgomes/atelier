// The viewer in a real browser, against a daemon of its own: the canvas runs
// in its sealed frame, what you do there reaches the state file, a new
// version replaces the old one where you were, and actions wait for you.

import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { PNG, daemon } from '../../daemon/test/helpers.mjs';
import { launch } from '../../../scripts/lib/chrome.mjs';

const chromeMissing = !existsSync(process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome') && 'Chrome is not installed';
const pause = (ms) => new Promise((done) => setTimeout(done, ms));

const release = (version) => `import { Panel, Stack, Stat, NeedsYou, Button, Image, Text, useAction, useState } from "atelier";
export const meta = { title: "Release 1.4" };
export default function Release() {
  const { startSession } = useAction();
  const [said, setSaid] = useState("");
  return <Stack>
    <Panel title="Release 1.4" info="${version}"><Stat label="Tests" value="1,269" tone="success" /></Panel>
    <NeedsYou id="steam" title="Upload the build to Steam" detail="Needs your login" />
    <Panel title="Ask an agent">
      <Button onClick={() => startSession({ prompt: "Write the release notes for 1.4" }).then((r) => setSaid(r.message))}>Write the notes</Button>
      <Text>{said ? "said: " + said : ""}</Text>
    </Panel>
    <Image path="../shot.png" alt="A shot" height={60} />
    <div style={{ height: 1600 }} />
    <Text>The end</Text>
  </Stack>;
}
`;

let d;
let chrome;
let frames = [];
let file;
let id;

/** The session of the frame on screen, once it shows `text`. */
async function frame(text, seconds = 20) {
  for (let i = 0; i < seconds * 10; i++) {
    const shown = await chrome.js('[...document.querySelectorAll("iframe")].find((f) => !f.classList.contains("av-frame-waiting"))?.name ?? ""');
    for (const s of [...frames].reverse()) {
      try {
        if (shown && (await chrome.js(`window.name === ${JSON.stringify(shown)} && document.body.innerText.includes(${JSON.stringify(text)})`, s))) return s;
      } catch {}
    }
    await pause(100);
  }
  throw new Error(`No frame on screen shows "${text}"`);
}

const stateFile = () => JSON.parse(readFileSync(join(d.project, '.atelier/release.state.json'), 'utf8'));

async function key(k) {
  const named = { Escape: 27, Enter: 13 }[k];
  const code = named ? k : /\d/.test(k) ? `Digit${k}` : `Key${k.toUpperCase()}`;
  const down = named ? { key: k, code, windowsVirtualKeyCode: named } : { key: k, text: k, code, windowsVirtualKeyCode: k.toUpperCase().charCodeAt(0) };
  await chrome.call('Input.dispatchKeyEvent', { type: 'keyDown', ...down }, undefined, 5).catch(() => {});
  // The key may have closed the frame it went to, which then never acknowledges its release.
  await chrome.call('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code }, undefined, 2).catch(() => {});
  await pause(150);
}

before(async () => {
  if (chromeMissing) return;
  const stub = new URL('../../daemon/test/fixtures/claude.mjs', import.meta.url).pathname;
  d = await daemon({ env: { ATELIER_CLAUDE: stub, ATELIER_STUB_LOG: join(process.env.TMPDIR ?? '/tmp', `atelier-viewer-stub-${process.pid}.jsonl`) } });
  await d.call('PUT', '/api/settings', { autoOpen: false, theme: 'tokyo-night', terminal: 'custom', terminalCommand: ['/usr/bin/true', '{script}'] });
  writeFileSync(join(d.project, 'shot.png'), PNG);
  file = d.write('.atelier/release.canvas.tsx', release('one'));
  d.write('.atelier/second.canvas.tsx', 'export const meta = { title: "Second" };\nexport default () => <div>The second canvas</div>;\n');
  const { body } = await d.call('POST', '/api/open', { path: file });
  id = body.canvas.id;
  chrome = await launch({ width: 1100, height: 700 });
  chrome.on((m) => {
    if (m.method === 'Target.attachedToTarget' && m.params.targetInfo.type === 'iframe') frames.push(m.params.sessionId);
    if (m.method === 'Target.detachedFromTarget') frames = frames.filter((s) => s !== m.params.sessionId);
  });
  await chrome.call('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: true });
  await chrome.goto(body.url);
});

after(async () => {
  await chrome?.close();
  await d?.stop();
});

test('the canvas runs in a sealed frame, with the bar around it', { skip: chromeMissing }, async () => {
  const s = await frame('1,269');
  assert.equal(await chrome.js('document.title'), 'Release 1.4 · Atelier');
  assert.equal(await chrome.js('document.querySelector("iframe").getAttribute("sandbox")'), 'allow-scripts');
  assert.equal(await chrome.js('[...document.querySelectorAll(".av-ws")].map((b) => b.textContent).join("|")'), '1Release 1.4|2Second');
  assert.equal(await chrome.js('origin', s), 'null', "the frame's origin is opaque");
  assert.equal(await chrome.js('(async () => { try { await fetch("/api/status"); return "reached"; } catch { return "blocked"; } })()', s), 'blocked');
  await pause(1000);
  assert.equal(await chrome.js('[...document.querySelectorAll("iframe")].map((f) => f.name).join()'), 'canvas-1', 'booted once, though the page and its first event both asked for it');
});

test('an image from the project reaches the frame', { skip: chromeMissing }, async () => {
  const s = await frame('1,269');
  await chrome.until('document.querySelector("img")?.naturalWidth > 0', 10, s);
  assert.match(await chrome.js('document.querySelector("img").src', s), /^blob:/);
});

test('what you do in the frame is kept in the state file', { skip: chromeMissing }, async () => {
  const s = await frame('1,269');
  await chrome.press('Done', s);
  for (let i = 0; i < 30 && !existsSync(join(d.project, '.atelier/release.state.json')); i++) await pause(100);
  assert.equal(stateFile().needsYou.steam.state, 'done');
});

test('a new version replaces the old one where you were, with what you did', { skip: chromeMissing }, async () => {
  const s = await frame('1,269');
  await chrome.js('scrollTo(0, 500); window.__old = true', s);
  try {
    await chrome.until(`JSON.parse(sessionStorage.getItem("scroll:${id}") ?? "[0, 0]")[1] === 500`, 10);
  } catch (e) {
    const viewer = await chrome.js(`JSON.stringify({ frames: [...document.querySelectorAll("iframe")].map((f) => f.name + " " + f.className), kept: sessionStorage.getItem("scroll:${id}") })`);
    const inside = await chrome.js('JSON.stringify({ name: window.name, y: scrollY, height: document.documentElement.scrollHeight, inner: innerHeight })', s).catch((x) => x.message);
    throw new Error(`${e.message}\nviewer: ${viewer}\nframe: ${inside}`);
  }
  writeFileSync(file, release('two'));
  const next = await frame('two');
  assert.equal(await chrome.js('Boolean(window.__old)', next), false, 'a new frame, not the old one changed');
  await chrome.until('document.querySelectorAll("iframe").length === 1 && !document.querySelector(".av-frame-waiting")', 10);
  assert.ok(Math.abs((await chrome.js('scrollY', next)) - 500) < 3, 'scrolled to where the last version was');
  assert.ok(await chrome.js('document.body.innerText.includes("Undo")', next), 'the Done mark is still there');
  assert.equal(await chrome.js('document.querySelectorAll("iframe").length'), 1, 'the old frame is gone');
});

test("a canvas that doesn't build leaves the last version up, and says why", { skip: chromeMissing }, async () => {
  writeFileSync(file, release('three').replace('<Stack>', '<Stack'));
  await chrome.until('document.querySelector(".av-strip")?.innerText.includes("doesn\'t build")', 10);
  await frame('two');
  writeFileSync(file, release('four'));
  await frame('four');
  await chrome.until('!document.querySelector(".av-strip")', 10);
});

test('an action waits in the confirm sheet, and can be turned down', { skip: chromeMissing }, async () => {
  const s = await frame('four');
  await chrome.press('Write the notes', s);
  await chrome.until('document.querySelector(".av-confirm-prompt")?.textContent === "Write the release notes for 1.4"', 5);
  await chrome.press('Cancel esc');
  await chrome.until('document.body.innerText.includes("said: You turned it down.")', 5, s);
  assert.equal(await chrome.js('document.querySelector(".av-confirm-prompt")'), null);
});

test('a confirmed action goes to the daemon', { skip: chromeMissing }, async () => {
  const s = await frame('four');
  await chrome.press('Write the notes', s);
  await chrome.until('document.querySelector(".av-confirm-prompt")', 5);
  await chrome.press('Start ⏎');
  assert.ok(await chrome.js('Boolean(document.querySelector(".av-confirm-prompt"))'), 'too soon after it opened: ignored');
  await pause(700);
  await chrome.press('Start ⏎');
  await chrome.until('!document.querySelector(".av-confirm-prompt")', 5);
  await chrome.until('document.body.innerText.includes("said: Started in a terminal.")', 5, s);
  await chrome.until('document.querySelector(".av-toast")?.textContent === "Started in a terminal."', 5);
});

test('a run started in the background can be followed in the runs drawer', { skip: chromeMissing }, async () => {
  const s = await frame('four');
  await chrome.press('Write the notes', s);
  await chrome.until('document.querySelector(".av-confirm-prompt")', 5);
  await chrome.js('[...document.querySelectorAll(".av-sheet label")].find((l) => l.textContent.includes("background")).click()');
  await pause(700);
  await chrome.press('Start ⏎');
  await chrome.until('document.body.innerText.includes("said: Started in the background.")', 5, s);
  await chrome.js('document.body.focus()');
  await key('r');
  await chrome.until('document.querySelector(".av-run")', 5);
  await chrome.until('document.querySelector(".av-run .at-badge")?.textContent.includes("done")', 10);
  assert.match(await chrome.js('document.querySelector(".av-steps").innerText'), /Read README\.md[\s\S]*Done: Write the release notes for 1\.4/);
  await key('Escape');
  await chrome.until('!document.querySelector(".av-run")', 5);
});

test('keys work from inside the frame: 2 switches canvas, t picks a theme', { skip: chromeMissing }, async () => {
  await frame('four');
  await chrome.js('document.querySelector("iframe").focus()');
  await key('2');
  await chrome.until('document.title === "Second · Atelier"', 5);
  await frame('The second canvas');
  await key('t');
  await chrome.until('document.querySelector(".av-filter")', 5);
  await chrome.type('.av-filter', 'latte');
  await chrome.call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  await chrome.call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter' });
  await chrome.until('!document.querySelector(".av-filter")', 5);
  for (let i = 0; i < 20 && JSON.parse(readFileSync(join(d.home, 'settings.json'), 'utf8')).theme !== 'catppuccin-latte'; i++) await pause(100);
  assert.equal(JSON.parse(readFileSync(join(d.home, 'settings.json'), 'utf8')).theme, 'catppuccin-latte');
  const s = await frame('The second canvas');
  await chrome.until('document.getElementById("at-theme")?.textContent.includes("color-scheme: light")', 5, s);
  await chrome.shot(join(d.root, 'latte.png'));
});

test("ooze's theme is in the picker, says where it's from, and colours the canvas", { skip: chromeMissing }, async () => {
  await frame('The second canvas');
  await key('t');
  await chrome.until('document.querySelector(".av-filter")', 5);
  await chrome.type('.av-filter', 'ooze');
  await chrome.until('[...document.querySelectorAll(".av-item")].some((li) => li.textContent.includes("dark · ooze"))', 5);
  await chrome.call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  await chrome.call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter' });
  await chrome.until('!document.querySelector(".av-filter")', 5);
  for (let i = 0; i < 20 && JSON.parse(readFileSync(join(d.home, 'settings.json'), 'utf8')).theme !== 'ooze'; i++) await pause(100);
  assert.equal(JSON.parse(readFileSync(join(d.home, 'settings.json'), 'utf8')).theme, 'ooze');
  const s = await frame('The second canvas');
  await chrome.until('["--panel: #1a1b26", "--info: #73daca", "--warning: #ff9e64"].every((v) => document.getElementById("at-theme")?.textContent.includes(v))', 5, s);
  await chrome.shot(join(d.root, 'ooze.png'));
});

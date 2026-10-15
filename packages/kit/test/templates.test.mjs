// Every template's example, drawn in a real browser in a dark theme and a
// light one, without an error.

import assert from 'node:assert/strict';
import { copyFileSync, existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { launch } from '../../../scripts/lib/chrome.mjs';
import { harness } from '../../../scripts/lib/harness.mjs';

const repo = new URL('../../../', import.meta.url).pathname;
const chromeMissing = !existsSync(process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome') && 'Chrome is not installed';
const names = readdirSync(join(repo, 'templates'), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
const dir = mkdtempSync(join(tmpdir(), 'atelier-template-views-'));
let chrome;

before(async () => {
  if (!chromeMissing) chrome = await launch({ width: 1100, height: 800 });
});
after(async () => {
  await chrome?.close();
  rmSync(dir, { recursive: true, force: true });
});

for (const name of names) {
  test(`the ${name} template draws its example`, { skip: chromeMissing }, async () => {
    const file = join(dir, `${name}.canvas.json`);
    copyFileSync(join(repo, 'templates', name, 'example.json'), file);
    const served = await harness(file);
    try {
      for (const theme of ['tokyo-night', 'catppuccin-latte']) {
        await chrome.goto(`${served.url}?theme=${theme}`);
        await chrome.until('document.body.dataset.shown', 20);
        assert.equal(await chrome.js('document.body.dataset.shown'), 'yes', `${name} in ${theme}`);
        assert.deepEqual(await chrome.js('window.__posted.filter((m) => m.type === "error").map((m) => m.message)'), []);
        assert.ok(await chrome.js('document.querySelector(".at-panel") !== null'));
      }
    } finally {
      served.close();
    }
  });
}

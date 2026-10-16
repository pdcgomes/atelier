#!/usr/bin/env node
// Screenshots a canvas in several themes, with the built runtime and a
// stand-in for the viewer (lib/harness.mjs), into build/gallery/. By default
// it's the kit's gallery, each of its tabs, in a dark theme and a light one.
//
//   node scripts/gallery.mjs [--canvas=examples/gallery/gallery.canvas.tsx]
//     [--themes=tokyo-night,catppuccin-latte | --themes=all] [--tabs=core,words] [--width=1100]

import { mkdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from './lib/chrome.mjs';
import { harness } from './lib/harness.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name, fallback) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? fallback;
const canvasFile = resolve(root, arg('canvas', 'examples/gallery/gallery.canvas.tsx'));
const allThemes = JSON.parse(readFileSync(join(root, 'packages/themes/themes.json'), 'utf8'));
const themeIds = arg('themes', 'tokyo-night,catppuccin-latte');
const themes = themeIds === 'all' ? allThemes.map((t) => t.id) : themeIds.split(',');
const tabs = arg('tabs', canvasFile.endsWith('gallery.canvas.tsx') ? 'core,words,media,charts,forms' : '').split(',').filter(Boolean);
const width = Number(arg('width', '1100'));
const out = resolve(root, arg('out', 'build/gallery'));
mkdirSync(out, { recursive: true });

const served = await harness(canvasFile);
const chrome = await launch({ width, height: 900 });
const shots = [];
try {
  for (const theme of themes) {
    for (const tab of tabs.length ? tabs : ['']) {
      await chrome.goto(`${served.url}?theme=${theme}&state=${encodeURIComponent(JSON.stringify(tab ? { tab } : {}))}`);
      await chrome.until('document.body.dataset.shown', 20);
      await new Promise((ok) => setTimeout(ok, 400));
      const shown = await chrome.js('document.body.dataset.shown');
      if (shown !== 'yes') console.log(`${theme} ${tab}: ${shown}`);
      const file = join(out, `${basename(canvasFile).replace(/\.canvas\.(tsx|json)$/, '')}-${theme}${tab ? `-${tab}` : ''}.png`);
      shots.push(await chrome.shot(file, { full: true }));
    }
  }
  const problems = chrome.logs.filter((l) => /^(error|exception)/.test(l));
  if (problems.length) console.log(problems.join('\n'));
} finally {
  await chrome.close();
  served.close();
}
console.log(shots.join('\n'));

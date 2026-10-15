#!/usr/bin/env node
// Screenshots a canvas in several themes, with the built runtime and a
// stand-in for the viewer, into build/gallery/. By default it's the kit's
// gallery, each of its tabs, in a dark theme and a light one.
//
//   node scripts/gallery.mjs [--canvas=examples/gallery/gallery.canvas.tsx]
//     [--themes=tokyo-night,catppuccin-latte | --themes=all] [--tabs=core,words,media] [--width=1100]

import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { deflateSync } from 'node:zlib';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile } from '../packages/daemon/src/compile.ts';
import { launch } from './lib/chrome.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name, fallback) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? fallback;
const canvasFile = join(root, arg('canvas', 'examples/gallery/gallery.canvas.tsx'));
const allThemes = JSON.parse(readFileSync(join(root, 'packages/themes/themes.json'), 'utf8'));
const themeIds = arg('themes', 'tokyo-night,catppuccin-latte');
const themes = themeIds === 'all' ? allThemes.map((t) => t.id) : themeIds.split(',');
const tabs = arg('tabs', canvasFile.endsWith('gallery.canvas.tsx') ? 'core,words,media,charts,forms' : '').split(',').filter(Boolean);
const width = Number(arg('width', '1100'));
const out = join(root, 'build/gallery');
mkdirSync(out, { recursive: true });

if (!existsSync(join(root, 'packages/daemon/dist/runtime.js'))) throw new Error('Run node scripts/build.mjs first.');
const runtime = readFileSync(join(root, 'packages/daemon/dist/runtime.js'), 'utf8');
const canvas = await compile(canvasFile);
const data = canvasFile.endsWith('.canvas.json') ? JSON.parse(readFileSync(canvasFile, 'utf8')) : null;

// A few images to show, made here so the gallery needs nothing on disk.
function png(w, h, [r, g, b], band) {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf) => {
    let c = 0xffffffff;
    for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, body) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(body.length);
    const tb = Buffer.concat([Buffer.from(type), body]);
    const c = Buffer.alloc(4);
    c.writeUInt32BE(crc(tb));
    return Buffer.concat([len, tb, c]);
  };
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const lit = (y > h * band && y < h * (band + 0.18)) || (x > w * 0.08 && x < w * 0.3 && y > h * 0.55 && y < h * 0.85);
      const o = y * (w * 3 + 1) + 1 + x * 3;
      raw[o] = lit ? Math.min(255, r + 70) : r;
      raw[o + 1] = lit ? Math.min(255, g + 70) : g;
      raw[o + 2] = lit ? Math.min(255, b + 70) : b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr.set([8, 2, 0, 0, 0], 8);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]).toString('base64');
}
const colours = [[122, 162, 247], [158, 206, 106], [224, 175, 104], [187, 154, 247], [125, 207, 255]];
const files = Object.fromEntries(colours.map((c, i) => [`/gallery/shot-${i + 1}.png`, png(480, 300, c, 0.15 + i * 0.1)]));

const page = `<!doctype html><html><head><meta charset="utf-8"><title>Gallery</title></head><body><div id="root"></div>
<script type="module">
const RUNTIME = ${JSON.stringify(runtime)};
const CANVAS = ${JSON.stringify(canvas.code)};
const DATA = ${JSON.stringify(data)};
const FILES = ${JSON.stringify(files)};
const THEMES = ${JSON.stringify(allThemes)};
const params = new URLSearchParams(location.search);
const theme = THEMES.find((t) => t.id === params.get('theme')) ?? THEMES[0];
const state = JSON.parse(params.get('state') || '{}');
const blob = (code) => URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
const reply = (m) => setTimeout(() => window.postMessage(m, '*'), 5);
const post = (m) => {
  if (m.type === 'file') {
    const b64 = FILES[m.path];
    reply(b64 ? { type: 'reply', id: m.id, ok: true, mime: 'image/png', bytes: Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer } : { type: 'reply', id: m.id, ok: false, message: "There's no such file." });
  } else if (m.type === 'action') reply({ type: 'reply', id: m.id, ok: true, message: 'Done' });
  else if (m.type === 'shown') document.body.dataset.shown = m.error ? 'error: ' + m.error : 'yes';
  else if (m.type === 'error') console.error('canvas:', m.message);
};
const rt = await import(blob(RUNTIME));
const kind = DATA ? { kind: 'template', template: DATA.template, data: DATA } : { kind: 'module', code: CANVAS };
await rt.start(post, { canvas: kind, state, theme }, (code) => import(blob(code)));
</script></body></html>`;

const server = createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(page);
}).listen(0, '127.0.0.1');
await new Promise((ok) => server.once('listening', ok));
const url = `http://127.0.0.1:${server.address().port}/`;

const chrome = await launch({ width, height: 900 });
const shots = [];
try {
  for (const theme of themes) {
    for (const tab of tabs.length ? tabs : ['']) {
      const state = tab ? { tab } : {};
      await chrome.goto(`${url}?theme=${theme}&state=${encodeURIComponent(JSON.stringify(state))}`);
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
  server.close();
}
console.log(shots.join('\n'));

// A stand-in for the viewer: serves one canvas with the built runtime, answers
// its requests for files from a few images made here, and records every
// message it sends in `window.__posted`, for the gallery and the kit's tests.

import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';
import { compile } from '../../packages/daemon/src/compile.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

export function png(w, h, [r, g, b], band) {
  const table = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf) => {
    let c = 0xffffffff;
    for (const byte of buf) c = table[(c ^ byte) & 0xff] ^ (c >>> 8);
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

export const colours = [[122, 162, 247], [158, 206, 106], [224, 175, 104], [187, 154, 247], [125, 207, 255]];

/** Serves `canvasFile` (a `.canvas.tsx`, or a template's `.canvas.json`). Open `url?theme=<id>&state=<json>`. */
export async function harness(canvasFile, { files = {} } = {}) {
  if (!existsSync(join(root, 'packages/daemon/dist/runtime.js'))) throw new Error('Run node scripts/build.mjs first.');
  const runtime = readFileSync(join(root, 'packages/daemon/dist/runtime.js'), 'utf8');
  const themes = JSON.parse(readFileSync(join(root, 'packages/themes/themes.json'), 'utf8'));
  const data = canvasFile.endsWith('.canvas.json') ? JSON.parse(readFileSync(canvasFile, 'utf8')) : null;
  const code = data ? '' : (await compile(canvasFile)).code;
  const images = { ...Object.fromEntries(colours.map((c, i) => [`/gallery/shot-${i + 1}.png`, png(480, 300, c, 0.15 + i * 0.1)])), ...files };
  const page = `<!doctype html><html><head><meta charset="utf-8"><title>Canvas</title></head><body><div id="root"></div>
<script type="module">
const RUNTIME = ${JSON.stringify(runtime)};
const CANVAS = ${JSON.stringify(code)};
const DATA = ${JSON.stringify(data)};
const FILES = ${JSON.stringify(images)};
const THEMES = ${JSON.stringify(themes)};
const params = new URLSearchParams(location.search);
const theme = THEMES.find((t) => t.id === params.get('theme')) ?? THEMES[0];
const state = JSON.parse(params.get('state') || '{}');
const sessions = JSON.parse(params.get('sessions') || '[]');
window.__posted = [];
const blob = (code) => URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
const reply = (m) => setTimeout(() => window.postMessage(m, '*'), 5);
const post = (m) => {
  window.__posted.push(m);
  if (m.type === 'file') {
    const b64 = FILES[m.path];
    reply(b64 ? { type: 'reply', id: m.id, ok: true, mime: 'image/png', bytes: Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer } : { type: 'reply', id: m.id, ok: false, message: "There's no such file." });
  } else if (m.type === 'action') reply({ type: 'reply', id: m.id, ok: true, message: 'Done' });
  else if (m.type === 'shown') document.body.dataset.shown = m.error ? 'error: ' + m.error : 'yes';
  else if (m.type === 'error') console.error('canvas:', m.message);
};
const rt = await import(blob(RUNTIME));
const canvas = DATA ? { kind: 'template', template: DATA.template, data: DATA } : { kind: 'module', code: CANVAS };
await rt.start(post, { canvas, state, theme, sessions }, (code) => import(blob(code)));
</script></body></html>`;
  const server = createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(page);
  }).listen(0, '127.0.0.1');
  await new Promise((ok) => server.once('listening', ok));
  return { url: `http://127.0.0.1:${server.address().port}/`, close: () => server.close() };
}

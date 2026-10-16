#!/usr/bin/env node
// Writes the canvases atelier-tui's conformance frames and its preview
// harness (`atelier-tui demo`) are drawn from, into build/terminal/fixtures/:
// every template's example, from the templates' registry so a new template
// is included without anyone listing it; the gallery, tab by tab; every
// component on its own; and the other example canvases, compiled as the
// daemon compiles them. The wireframes template's example and the other
// examples are written once for each of their tabs.
//
//   node scripts/fixtures.mjs                      all of them, afresh
//   node scripts/fixtures.mjs examples/x.canvas.tsx  only these examples

import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { metaTheme } from '../packages/daemon/src/check.ts';
import { compile } from '../packages/daemon/src/compile.ts';
import { schemas } from '../templates/schemas.ts';
import { colours, png } from './lib/harness.mjs';
import { terminal } from './lib/terminal.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'build/terminal/fixtures');
const only = process.argv.slice(2).map((p) => resolve(p));
mkdirSync(out, { recursive: true });
if (!only.length) for (const f of readdirSync(out).filter((f) => f.endsWith('.json'))) rmSync(join(out, f));

const registry = readFileSync(join(root, 'templates/index.ts'), 'utf8');
const names = [...registry.matchAll(/template\('([\w-]+)'/g)].map((m) => m[1]);

const write = (name, fixture) => writeFileSync(join(out, `${name}.json`), `${JSON.stringify(fixture)}\n`);

/** A canvas's tabs, as its first Tabs says once it's drawn. */
async function tabsOf(canvas, code) {
  const started = await terminal(code ? { kind: 'module', code } : canvas);
  return started.find((n) => n.t === 'Tabs')?.p.tabs ?? [];
}

/** The theme a canvas opens in, as the daemon says: its own, or its template's. */
const themeOf = (canvas, source) => (source ? metaTheme(source) : (canvas.data?.theme ?? schemas[canvas.template]?.theme));

/** A canvas once for each of its tabs: the first at every width, the rest at 120 columns. */
async function everyTab(name, group, canvas, code, source) {
  const tabs = await tabsOf(canvas, code);
  const theme = themeOf(canvas, source);
  const extra = { ...(theme ? { theme } : {}), ...(code ? { code } : {}) };
  write(name, { name, group, init: { canvas, state: {}, sessions: [] }, ...extra });
  for (const tab of tabs.slice(1)) write(`${name}-${tab}`, { name: `${name}-${tab}`, group, widths: [120], init: { canvas, state: { tab }, sessions: [] }, ...extra });
  return Math.max(1, tabs.length);
}

let written = 0;
if (!only.length) {
  for (const name of names) {
    const data = JSON.parse(readFileSync(join(root, 'templates', name, 'example.json'), 'utf8'));
    const canvas = { kind: 'template', template: name, data };
    if (name === 'wireframes') written += await everyTab(name, 'Templates', canvas);
    else (write(name, { name, group: 'Templates', init: { canvas, state: {}, sessions: [] }, ...(themeOf(canvas) ? { theme: themeOf(canvas) } : {}) }), written++);
  }

  // The gallery once for each of its tabs, since only the open tab is drawn.
  const galleryFile = join(root, 'examples/gallery/gallery.canvas.tsx');
  const gallery = await compile(galleryFile);
  const tabs = [...readFileSync(galleryFile, 'utf8').matchAll(/\{ id: '(\w+)', label: '[^']*',[^}\n]*content:/g)].map((m) => m[1]);
  for (const tab of tabs) write(`gallery-${tab}`, { name: `gallery-${tab}`, group: 'Gallery', init: { canvas: { kind: 'module' }, state: { tab }, sessions: [] }, code: gallery.code });

  // Every component on its own, from the components canvas.
  const componentsFile = join(root, 'examples/components/components.canvas.tsx');
  const components = await compile(componentsFile);
  const kit = JSON.parse(readFileSync(join(root, 'packages/kit/kit.json'), 'utf8'));
  const sampled = [...readFileSync(componentsFile, 'utf8').matchAll(/^ {2}(\w+): \(\) =>/gm)].map((m) => m[1]);
  for (const name of Object.keys(kit.components)) {
    if (!sampled.includes(name)) throw new Error(`examples/components/components.canvas.tsx has no sample of ${name}.`);
    write(`component-${name}`, { name: `component-${name}`, group: 'Components', part: kit.components[name].module, init: { canvas: { kind: 'module' }, state: { component: name }, sessions: [] }, code: components.code });
  }
  written += tabs.length + Object.keys(kit.components).length;
}

// The other example canvases there are.
const others = only.length
  ? only
  : readdirSync(join(root, 'examples'), { withFileTypes: true })
      .filter((d) => d.isDirectory() && !['gallery', 'components'].includes(d.name))
      .flatMap((dir) => readdirSync(join(root, 'examples', dir.name)).filter((f) => /\.canvas\.(tsx|json)$/.test(f)).map((f) => join(root, 'examples', dir.name, f)));
for (const path of others) {
  const name = `example-${basename(path).replace(/\.canvas\.(tsx|json)$/, '')}`;
  if (path.endsWith('.json')) {
    const data = JSON.parse(readFileSync(path, 'utf8'));
    written += await everyTab(name, 'Examples', { kind: 'template', template: data.template, data });
  } else {
    written += await everyTab(name, 'Examples', { kind: 'module' }, (await compile(path)).code, readFileSync(path, 'utf8'));
  }
}

// The images the gallery and the components show, made as the browser's harness makes them.
mkdirSync(join(out, 'files/gallery'), { recursive: true });
colours.forEach((c, i) => writeFileSync(join(out, `files/gallery/shot-${i + 1}.png`), Buffer.from(png(480, 300, c, 0.15 + i * 0.1), 'base64')));

console.log(`Wrote ${written} fixtures into ${out}.`);

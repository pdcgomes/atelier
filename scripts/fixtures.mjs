#!/usr/bin/env node
// Writes the canvases atelier-tui's conformance frames and its preview
// harness (`atelier-tui demo`) are drawn from, into build/terminal/fixtures/:
// every template's example, from the templates' registry so a new template
// is included without anyone listing it; the gallery, tab by tab; every
// component on its own; and the other example canvases, compiled as the
// daemon compiles them.
//
//   node scripts/fixtures.mjs

import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile } from '../packages/daemon/src/compile.ts';
import { colours, png } from './lib/harness.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'build/terminal/fixtures');
mkdirSync(out, { recursive: true });

const registry = readFileSync(join(root, 'templates/index.ts'), 'utf8');
const names = [...registry.matchAll(/template\('([\w-]+)'/g)].map((m) => m[1]);

const write = (name, fixture) => writeFileSync(join(out, `${name}.json`), `${JSON.stringify(fixture)}\n`);

for (const name of names) {
  const data = JSON.parse(readFileSync(join(root, 'templates', name, 'example.json'), 'utf8'));
  write(name, { name, group: 'Templates', init: { canvas: { kind: 'template', template: name, data }, state: {}, sessions: [] } });
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

// The other example canvases there are.
let examples = 0;
for (const dir of readdirSync(join(root, 'examples'), { withFileTypes: true }).filter((d) => d.isDirectory() && !['gallery', 'components'].includes(d.name))) {
  for (const file of readdirSync(join(root, 'examples', dir.name)).filter((f) => /\.canvas\.(tsx|json)$/.test(f))) {
    const path = join(root, 'examples', dir.name, file);
    const name = `example-${file.replace(/\.canvas\.(tsx|json)$/, '')}`;
    if (file.endsWith('.json')) {
      const data = JSON.parse(readFileSync(path, 'utf8'));
      write(name, { name, group: 'Examples', init: { canvas: { kind: 'template', template: data.template, data }, state: {}, sessions: [] } });
    } else {
      write(name, { name, group: 'Examples', init: { canvas: { kind: 'module' }, state: {}, sessions: [] }, code: (await compile(path)).code });
    }
    examples++;
  }
}

// The images the gallery and the components show, made as the browser's harness makes them.
mkdirSync(join(out, 'files/gallery'), { recursive: true });
colours.forEach((c, i) => writeFileSync(join(out, `files/gallery/shot-${i + 1}.png`), Buffer.from(png(480, 300, c, 0.15 + i * 0.1), 'base64')));

console.log(`Wrote ${names.length + tabs.length + Object.keys(kit.components).length + examples} fixtures into ${out}.`);

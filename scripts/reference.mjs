// Writes the canvas skill's reference: everything a canvas can import from
// "atelier", as one declaration file, from the kit's own declarations. The
// build runs it, so the skill never describes a kit that isn't there.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const types = join(root, 'packages/daemon/dist/types');
const out = join(root, 'plugin/claude-code/skills/canvas/reference/atelier.d.ts');

const MODULES = [
  ['layout', 'Layout'],
  ['text', 'Text'],
  ['markdown', 'Markdown'],
  ['media', 'Images and video, read from disk'],
  ['data', 'Data'],
  ['charts', 'Charts, drawn as SVG. Every chart has a title.'],
  ['forms', 'Forms, approvals and Needs you items'],
  ['hooks', 'Hooks'],
];

const tidy = (text) =>
  text
    .split('\n')
    .filter((line) => !/^import /.test(line) && line !== 'export {};')
    .join('\n')
    .replaceAll('import("react").JSX.Element', 'JSX.Element')
    .trim();

const bridge = readFileSync(join(types, 'packages/kit/src/bridge.d.ts'), 'utf8');
const shared = tidy(bridge.slice(0, bridge.indexOf('type Message')));
const theme = tidy(readFileSync(join(types, 'packages/themes/src/index.d.ts'), 'utf8').split('export declare const')[0]);

const parts = [
  `// What a canvas can import from "atelier", with every prop.
// Generated from the kit by scripts/reference.mjs; don't edit it by hand.
//
// A canvas may also import React's hooks from "atelier" or "react":
// useState, useEffect, useMemo, useRef, useCallback, useReducer, Fragment.

import type { CSSProperties, JSX, ReactNode } from 'react';`,
  `// ---- Tones, sessions and actions\n\n${shared}`,
  `// ---- The theme (useTheme)\n\n${theme}`,
  ...MODULES.map(([name, title]) => {
    let text = tidy(readFileSync(join(types, `packages/kit/src/${name}.d.ts`), 'utf8'));
    if (name === 'charts') text = text.replace('export declare function layout(', 'export declare function flowLayout(');
    if (name === 'markdown') text = text.replace(/\/\*\*[^]*?\*\/\nexport declare function inline[^\n]*\n?/, '').replace(/export declare function inline[^\n]*\n?/, '');
    return `// ---- ${title}\n\n${text}`;
  }),
];

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${parts.join('\n\n')}\n`);

// The templates: each one's README, and its example, which `atelier new` starts from.
const order = ['workstream', 'studio', 'room', 'board', 'checklist', 'review', 'compare', 'report'];
const templates = [
  `<!-- Generated from templates/*/README.md and example.json by scripts/reference.mjs; don't edit it by hand. -->

# The templates

A template canvas is \`.atelier/<name>.canvas.json\`: \`"template"\` names one of these, and the rest is its data, checked against its schema. \`atelier new <template> <name>\` starts one from its example. A custom canvas can draw a template's view and add to it: \`import { Workstream, type WorkstreamData } from "atelier/templates"\`, and \`<Workstream data={data} />\`; the views are ${order.map((n) => `\`${n[0].toUpperCase()}${n.slice(1)}\``).join(', ')}.`,
  ...order.map((name) => {
    const readme = readFileSync(join(root, 'templates', name, 'README.md'), 'utf8').trim().replace(/^# /, '## ');
    const example = readFileSync(join(root, 'templates', name, 'example.json'), 'utf8').trim();
    return `${readme}\n\n<details><summary>The example</summary>\n\n\`\`\`json\n${example}\n\`\`\`\n\n</details>`;
  }),
];
writeFileSync(join(dirname(out), 'templates.md'), `${templates.join('\n\n')}\n`);

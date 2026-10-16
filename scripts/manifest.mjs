#!/usr/bin/env node
// Writes packages/kit/kit.json: everything the kit has, which atelier-tui is
// checked against (tui/tests/parity.rs), so a component or a prop can't be
// added to the kit without the terminal drawing it.
//
// - components: every component the kit exports, with every prop in its
//   declaration, and whether the terminal composes it from other components
//   (it has no element of its own in packages/kit/src/terminal/kit.tsx);
// - hooks, helpers and React's re-exports;
// - messages: what a canvas can send the viewer;
// - html: the HTML the kit's own code and the templates use.
//
// The build runs it after the kit's declarations. `node scripts/manifest.mjs --check`
// says whether the committed file is current, without writing it.

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const types = join(root, 'packages/daemon/dist/types/packages/kit/src');
const out = join(root, 'packages/kit/kit.json');

/** The kit's exports, by kind, from its index. */
function exportsOf() {
  const index = readFileSync(join(root, 'packages/kit/src/index.ts'), 'utf8');
  const found = [];
  for (const m of index.matchAll(/^export \{([^}]*)\} from '([^']+)';/gm)) {
    const from = m[2];
    for (const part of m[1].split(',').map((s) => s.trim()).filter(Boolean)) {
      const [name, alias] = part.split(/\s+as\s+/);
      found.push({ name: alias ?? name, local: name, module: from.replace(/^\.\//, '').replace(/\.tsx?$/, '') });
    }
  }
  return found;
}

/** The text between a bracket at `start` and the one that closes it. */
function enclosed(text, start) {
  const open = text[start];
  const close = { '(': ')', '{': '}', '<': '>', '[': ']' }[open];
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === open) depth++;
    else if (text[i] === close && --depth === 0) return text.slice(start + 1, i);
  }
  return text.slice(start + 1);
}

/** The names of an object type's members, at its top level. */
function members(body) {
  const names = [];
  let depth = 0;
  const clean = body.replace(/\/\*[^]*?\*\//g, '');
  for (const line of clean.split('\n')) {
    const m = depth === 0 && /^\s*(?:readonly\s+)?([A-Za-z_$][\w$]*)\??\s*:/.exec(line);
    if (m) names.push(m[1]);
    for (const ch of line) {
      if (ch === '{' || ch === '(' || ch === '[') depth++;
      else if (ch === '}' || ch === ')' || ch === ']') depth--;
    }
  }
  return names;
}

const declarations = readdirSync(types)
  .filter((f) => f.endsWith('.d.ts'))
  .map((f) => readFileSync(join(types, f), 'utf8'))
  .join('\n');

/** An interface's members, with what it extends. */
function interfaceMembers(name, seen = new Set()) {
  if (seen.has(name)) return [];
  seen.add(name);
  const m = new RegExp(`(?:export )?interface ${name}(?:<[^>]*>)?(?:\\s+extends\\s+([^{]+))?\\s*\\{`).exec(declarations);
  if (!m) return null;
  const body = enclosed(declarations, m.index + m[0].length - 1);
  const own = members(body);
  const parents = (m[1] ?? '').split(',').map((s) => s.trim().replace(/<.*$/, '')).filter(Boolean);
  return [...parents.flatMap((p) => interfaceMembers(p, seen) ?? []), ...own];
}

/** The members of a type written in a parameter: interfaces, literals, and `&` of them. */
function typeMembers(text) {
  const parts = [];
  let depth = 0;
  let last = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if ('{(<['.includes(ch)) depth++;
    else if ('})>]'.includes(ch)) depth--;
    else if (ch === '&' && depth === 0) {
      parts.push(text.slice(last, i));
      last = i + 1;
    }
  }
  parts.push(text.slice(last));
  return parts.flatMap((part) => {
    const p = part.trim();
    if (p.startsWith('{')) return members(enclosed(p, 0));
    const name = /^([A-Za-z_$][\w$]*)/.exec(p)?.[1];
    return (name && interfaceMembers(name)) ?? [];
  });
}

/** Every prop a component's declaration takes. */
function propsOf(name) {
  const m = new RegExp(`export declare function ${name}\\s*(<[^(]*>)?\\(`).exec(declarations);
  if (!m) return null;
  const params = enclosed(declarations, m.index + m[0].length - 1).trim();
  if (!params) return [];
  let type;
  if (params.startsWith('{')) {
    const pattern = enclosed(params, 0);
    type = params.slice(pattern.length + 2).replace(/^\s*:\s*/, '');
    const fromType = typeMembers(type);
    if (fromType.length) return [...new Set(fromType)];
    return pattern.split(',').map((s) => s.trim().split(/[:=\s]/)[0]).filter(Boolean);
  }
  type = params.replace(/^[\w$]+\??\s*:\s*/, '');
  return [...new Set(typeMembers(type))];
}

export function manifest() {
  const terminal = readFileSync(join(root, 'packages/kit/src/terminal/kit.tsx'), 'utf8');
  const drawn = new Set([...terminal.matchAll(/\bel\(\s*'([A-Z]\w*)'/g)].map((m) => m[1]));
  const components = {};
  const hooks = [];
  const helpers = [];
  const react = [];
  for (const e of exportsOf()) {
    if (e.module === 'react') react.push(e.name);
    else if (/^use[A-Z]/.test(e.name)) hooks.push(e.name);
    else if (/^[a-z]/.test(e.name)) helpers.push(e.name);
    else {
      const props = propsOf(e.local);
      if (!props) throw new Error(`There's no declaration for ${e.name} in ${types}. Run the build first.`);
      components[e.name] = { module: e.module, props: props.sort(), composed: !drawn.has(e.name) };
    }
  }
  const sources = [join(root, 'packages/kit/src/markdown.tsx'), ...readdirSync(join(root, 'templates'), { recursive: true }).filter((f) => String(f).endsWith('.tsx')).map((f) => join(root, 'templates', String(f)))];
  // What a canvas can write by hand, and the Markdown's headings and lists, whose tags it builds.
  const html = new Set(['a', 'article', 'b', 'blockquote', 'br', 'code', 'div', 'em', 'figcaption', 'figure', 'footer', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hr', 'i', 'img', 'kbd', 'li', 'mark', 'ol', 'p', 'pre', 's', 'section', 'small', 'span', 'strong', 'table', 'tbody', 'td', 'th', 'thead', 'tr', 'u', 'ul']);
  for (const file of sources) for (const m of readFileSync(file, 'utf8').matchAll(/<([a-z][a-z0-9]*)[\s>/]/g)) html.add(m[1]);
  const bridge = readFileSync(join(root, 'packages/kit/src/bridge.ts'), 'utf8');
  const messages = [...new Set([...bridge.matchAll(/send\(\{[^}]*type: '([\w-]+)'/g), ...bridge.matchAll(/ask\(\{ type: '([\w-]+)'/g)].map((m) => m[1]))].sort();
  return {
    note: "Generated from the kit by scripts/manifest.mjs; don't edit it by hand. atelier-tui's tests check it draws all of it.",
    components,
    hooks: hooks.sort(),
    helpers: helpers.sort(),
    react: react.sort(),
    messages,
    html: [...html].sort(),
  };
}

export const manifestPath = out;
export const manifestText = () => `${JSON.stringify(manifest(), null, 2)}\n`;

/** Whether the committed kit.json is what the kit says now. */
export function current() {
  try {
    return readFileSync(out, 'utf8') === manifestText();
  } catch {
    return false;
  }
}

export function write() {
  writeFileSync(out, manifestText());
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (!process.argv.includes('--check')) write();
  else if (!current()) {
    console.error('packages/kit/kit.json is out of date: run `node scripts/build.mjs`, which writes it, and commit it.');
    process.exit(1);
  }
}

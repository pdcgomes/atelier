#!/usr/bin/env node
// Writes themes.json from the palettes in sources/:
//
// - sources/omarchy/<theme>.toml: Omarchy's palettes, its themes/<theme>/colors.toml
//   at the commit below (MIT; NOTICE has the licence). `--fetch` downloads them again.
// - sources/haunt.json: haunt's themes, each as the colours its app uses.
// - sources/ooze.json: ooze's palette (github.com/pdcgomes/ooze, src/theme.rs), the
//   Tokyo Night that ooze, sweep and haunt's hauntop share.
// - sources/cursor.json: the neutral greys and the UI font of Cursor's canvases,
//   which the wireframes template opens in.
//
// Each palette becomes the variables canvases use (docs/design.md, "Themes and the
// look"). A colour that doesn't reach its contrast (color.mjs, RULES) is moved away
// from its background just far enough to reach it. Where both sources have a theme,
// Omarchy's is kept.
//
//   node packages/themes/scripts/import.mjs [--fetch]

import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { CHART_LEAST, RULES, ensure, hex, mix, parse } from './color.mjs';

const OMARCHY = 'omacom/omarchy';
export const OMARCHY_COMMIT = '4c1b4cb3a94447aff39af98e2fcc0490a9fb32e7';
const OMARCHY_THEMES = [
  'tokyo-night', 'catppuccin', 'catppuccin-latte', 'ethereal', 'everforest', 'flexoki-light', 'gruvbox', 'hackerman',
  'kanagawa', 'last-horizon', 'lumon', 'lupine', 'matte-black', 'miasma', 'nord', 'osaka-jade', 'retro-82', 'ristretto',
  'rose-pine', 'solitude', 'starship', 'vantablack', 'white',
];
const NAMES = { 'rose-pine': 'Rosé Pine', 'retro-82': 'Retro 82' };

const here = new URL('..', import.meta.url).pathname;

async function fetchOmarchy() {
  mkdirSync(`${here}sources/omarchy`, { recursive: true });
  for (const theme of OMARCHY_THEMES) {
    const url = `https://raw.githubusercontent.com/${OMARCHY}/${OMARCHY_COMMIT}/themes/${theme}/colors.toml`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${url}: ${response.status}`);
    writeFileSync(`${here}sources/omarchy/${theme}.toml`, await response.text());
  }
}

/** The `key = "value"` lines of a colors.toml. */
function toml(text) {
  const out = {};
  for (const line of text.split('\n')) {
    const m = /^\s*([a-z_]+)\s*=\s*"([^"]*)"/.exec(line);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

function title(id) {
  return NAMES[id] ?? id.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
}

/** The variables, from colours named the way a palette names them. */
function settle(colors, dark) {
  // Palettes write `#FFFCF0` as well as `#fffcf0`.
  const c = Object.fromEntries(Object.entries(colors).map(([k, v]) => [k, Array.isArray(v) ? v.map((x) => hex(parse(x))) : hex(parse(v))]));
  for (const [key, on, least] of RULES) c[key] = ensure(c[key], on.map((k) => c[k]), least, dark);
  c.chart = c.chart.map((color) => ensure(color, [c.panel], CHART_LEAST, dark));
  return c;
}

function fromOmarchy(id, p) {
  const dark = p.mode !== 'light';
  const panel = p.background;
  const fg = p.foreground;
  const dim = p.dark_foreground ?? mix(fg, panel, 0.5);
  return {
    id,
    name: title(id),
    dark,
    source: 'omarchy',
    colors: settle(
      {
        bg: p.dark_background ?? mix(panel, '#000000', dark ? 0.25 : 0.05),
        panel,
        surface: p.lighter_background ?? mix(panel, fg, 0.06),
        border: p.muted ?? mix(panel, fg, 0.25),
        focus: p.accent ?? p.blue,
        text: fg,
        text2: mix(fg, dim, 0.4),
        text3: dim,
        selection: p.selection ?? mix(panel, p.accent ?? p.blue, 0.25),
        accent: p.accent ?? p.blue,
        success: p.green,
        warning: p.yellow,
        danger: p.red,
        info: p.cyan,
        chart: [p.accent ?? p.blue, p.green, p.yellow, p.magenta, p.cyan, p.orange ?? p.bright_yellow, p.red, p.bright_green ?? p.green],
      },
      dark,
    ),
  };
}

function fromHaunt({ id, name, light, colors: h }) {
  const dark = !light;
  return {
    id,
    name,
    dark,
    source: 'haunt',
    colors: settle(
      {
        bg: mix(h.bg, '#000000', dark ? 0.22 : 0.04),
        panel: h.bg,
        surface: h.surface,
        border: h.gutter,
        focus: h.blue,
        text: h.fg,
        text2: h.text,
        text3: h.muted,
        selection: h.selection,
        accent: h.blue,
        success: h.green,
        warning: h.yellow,
        danger: h.red,
        info: h.cyan,
        chart: [h.blue, h.green, h.yellow, h.purple, h.cyan, h.orange, h.red, h.text],
      },
      dark,
    ),
  };
}

/** ooze's colours in the parts ooze gives them: teal is its own, orange is what needs you, and the dimmest grey is for labels. */
function fromOoze({ id, name, colors: o }) {
  return {
    id,
    name,
    dark: true,
    source: 'ooze',
    colors: settle(
      {
        bg: mix(o.bg, '#000000', 0.22),
        panel: o.bg,
        surface: o.surface,
        border: o.gutter,
        focus: o.blue,
        text: o.fg,
        text2: o.text,
        text3: o.comment,
        selection: o.selection,
        accent: o.blue,
        success: o.green,
        warning: o.orange,
        danger: o.red,
        info: o.teal,
        chart: [o.teal, o.purple, o.yellow, o.blue, o.orange, o.green, o.cyan, o.red],
      },
      true,
    ),
  };
}

/** Cursor's canvases: the editor's greys, blue for the accent and for what's being built, and its UI font for all the text. */
function fromCursor({ id, name, font, colors: c }) {
  return {
    id,
    name,
    dark: true,
    source: 'cursor',
    font,
    colors: settle(
      {
        bg: c.bg,
        panel: c.panel,
        surface: c.surface,
        border: c.border,
        focus: c.blue,
        text: c.fg,
        text2: c.text,
        text3: c.muted,
        selection: c.selection,
        accent: c.blue,
        success: c.green,
        warning: c.yellow,
        danger: c.red,
        info: c.blue,
        chart: [c.blue, c.green, c.yellow, c.purple, c.cyan, c.orange, c.red, c.text],
      },
      true,
    ),
  };
}

if (process.argv.includes('--fetch')) await fetchOmarchy();

const omarchy = readdirSync(`${here}sources/omarchy`)
  .filter((f) => f.endsWith('.toml'))
  .map((f) => fromOmarchy(f.replace(/\.toml$/, ''), toml(readFileSync(`${here}sources/omarchy/${f}`, 'utf8'))))
  .sort((a, b) => (a.id === 'tokyo-night' ? -1 : b.id === 'tokyo-night' ? 1 : a.name.localeCompare(b.name)));
const ooze = JSON.parse(readFileSync(`${here}sources/ooze.json`, 'utf8')).map(fromOoze);
const cursor = JSON.parse(readFileSync(`${here}sources/cursor.json`, 'utf8')).map(fromCursor);
const taken = new Set([...omarchy, ...ooze, ...cursor].map((t) => t.id));
const haunt = JSON.parse(readFileSync(`${here}sources/haunt.json`, 'utf8'))
  .filter((t) => !taken.has(t.id))
  .map(fromHaunt);

const themes = [...omarchy, ...ooze, ...cursor, ...haunt];
writeFileSync(`${here}themes.json`, `${JSON.stringify(themes, null, 1)}\n`);
console.log(`${themes.length} themes: ${omarchy.length} from Omarchy, ${ooze.length} from ooze, ${cursor.length} from Cursor, ${haunt.length} from haunt.`);

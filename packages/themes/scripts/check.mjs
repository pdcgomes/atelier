#!/usr/bin/env node
// Checks that every theme in themes.json is complete and easy to read: each
// colour reaches the contrast color.mjs's RULES give it, on what it's shown on.
//
//   node packages/themes/scripts/check.mjs

import { readFileSync } from 'node:fs';
import { CHART_LEAST, RULES, contrast } from './color.mjs';

const KEYS = ['bg', 'panel', 'surface', 'border', 'focus', 'text', 'text2', 'text3', 'selection', 'accent', 'success', 'warning', 'danger', 'info'];
const themes = JSON.parse(readFileSync(new URL('../themes.json', import.meta.url), 'utf8'));

const problems = [];
const ids = new Set();
for (const theme of themes) {
  if (ids.has(theme.id)) problems.push(`${theme.id}: the id is used twice`);
  ids.add(theme.id);
  const c = theme.colors;
  const bad = KEYS.filter((k) => !/^#[0-9a-f]{6}$/.test(c[k] ?? ''));
  if (bad.length || c.chart?.length !== 8) {
    problems.push(`${theme.id}: missing or malformed ${[...bad, ...(c.chart?.length === 8 ? [] : ['chart'])].join(', ')}`);
    continue;
  }
  for (const [key, on, least] of RULES) {
    for (const bg of on) {
      const ratio = contrast(c[key], c[bg]);
      if (ratio < least - 0.005) problems.push(`${theme.id}: ${key} on ${bg} is ${ratio.toFixed(2)}:1, under ${least}:1`);
    }
  }
  c.chart.forEach((color, i) => {
    const ratio = contrast(color, c.panel);
    if (ratio < CHART_LEAST - 0.005) problems.push(`${theme.id}: chart ${i + 1} on panel is ${ratio.toFixed(2)}:1, under ${CHART_LEAST}:1`);
  });
}
if (themes[0]?.id !== 'tokyo-night') problems.push('Tokyo Night has to come first: it is the default');

if (problems.length) {
  console.log(problems.join('\n'));
  process.exit(1);
}
console.log(`All ${themes.length} themes pass.`);

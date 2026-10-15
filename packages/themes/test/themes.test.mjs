import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';
import { DEFAULT_THEME, cssVariables, themeById, themes } from '../src/index.ts';

test('every theme is complete and easy to read', () => {
  const out = execFileSync(process.execPath, [new URL('../scripts/check.mjs', import.meta.url).pathname], { encoding: 'utf8' });
  assert.match(out, /All \d+ themes pass/);
});

test("Omarchy's palettes come first, with Tokyo Night as the default", () => {
  assert.equal(themes[0].id, DEFAULT_THEME);
  assert.equal(themes.filter((t) => t.source === 'omarchy').length, 23);
  assert.ok(themes.some((t) => t.source === 'haunt'));
  assert.ok(themes.some((t) => !t.dark), 'there are light themes too');
});

test('a theme becomes the variables canvases use', () => {
  const css = cssVariables(themeById('catppuccin-latte'));
  for (const name of ['--bg', '--panel', '--text-2', '--text-3', '--accent', '--chart-1', '--chart-8']) assert.ok(css.includes(`${name}:`), name);
  assert.match(css, /color-scheme: light/);
  assert.equal(themeById('no-such-theme').id, DEFAULT_THEME);
});

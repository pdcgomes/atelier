#!/usr/bin/env node
// Builds what the daemon serves and runs, into packages/daemon/dist/:
//
// - runtime.js: React, the kit and the templates' views, for the sealed frame;
// - terminal.js: the same, with the kit's terminal side, for atelier-tui's engine;
// - viewer.js and viewer.css: the page around it;
// - types/: the kit's declarations, which canvases are checked against,
//   and from them packages/kit/kit.json, which atelier-tui is checked against;
// - atelier.mjs: the daemon and the CLI.
//
//   node scripts/build.mjs [--watch]

import { build, context } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'packages/daemon/dist');
const watch = process.argv.includes('--watch');

// In terminal.js, whatever imports the browser's components (the templates'
// views, the Markdown) gets the terminal's instead.
const kitSrc = join(root, 'packages/kit/src');
const terminalSrc = join(kitSrc, 'terminal');
const toTerminal = new Map([
  [join(kitSrc, 'index.ts'), join(terminalSrc, 'index.ts')],
  ...['layout', 'text', 'media', 'data', 'charts', 'forms'].map((m) => [join(kitSrc, `${m}.tsx`), join(terminalSrc, 'kit.tsx')]),
]);
const terminalKit = {
  name: 'terminal-kit',
  setup(b) {
    b.onResolve({ filter: /^\.\.?\// }, (args) => {
      if (args.importer.startsWith(terminalSrc + '/')) return undefined;
      const target = toTerminal.get(resolve(args.resolveDir, args.path));
      return target ? { path: target } : undefined;
    });
  },
};

const builds = [
  {
    entryPoints: [join(terminalSrc, 'runtime.tsx')],
    outfile: join(dist, 'terminal.js'),
    format: 'iife',
    platform: 'browser',
    target: 'es2022',
    jsx: 'automatic',
    minify: true,
    legalComments: 'eof',
    define: { 'process.env.NODE_ENV': '"production"' },
    plugins: [terminalKit],
  },
  {
    entryPoints: [join(root, 'packages/kit/src/runtime.tsx')],
    outfile: join(dist, 'runtime.js'),
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    jsx: 'automatic',
    minify: true,
    legalComments: 'eof',
    define: { 'process.env.NODE_ENV': '"production"' },
  },
  existsSync(join(root, 'packages/viewer/src/main.tsx')) && {
    entryPoints: [join(root, 'packages/viewer/src/main.tsx')],
    outfile: join(dist, 'viewer.js'),
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    jsx: 'automatic',
    minify: true,
    legalComments: 'eof',
    define: { 'process.env.NODE_ENV': '"production"' },
  },
  existsSync(join(root, 'packages/daemon/src/cli.ts')) && {
    entryPoints: [join(root, 'packages/daemon/src/cli.ts')],
    outfile: join(dist, 'atelier.mjs'),
    format: 'esm',
    platform: 'node',
    target: 'node22',
    jsx: 'automatic',
    packages: 'external',
    alias: { '@atelier/themes': join(root, 'packages/themes/src/index.ts') },
  },
].filter(Boolean);

mkdirSync(dist, { recursive: true });
if (watch) {
  for (const options of builds) await (await context({ bundle: true, logLevel: 'info', ...options })).watch();
} else {
  await Promise.all(builds.map((options) => build({ bundle: true, logLevel: 'warning', ...options })));
  // The kit's declarations, which canvases are type checked against.
  rmSync(join(dist, 'types'), { recursive: true, force: true });
  execFileSync(join(root, 'node_modules/.bin/tsc'), ['-p', join(root, 'packages/kit/tsconfig.types.json')], { stdio: 'inherit' });
  await import('./reference.mjs');
  // What atelier-tui is checked against: every component, prop and message the kit has.
  const manifest = await import('./manifest.mjs');
  manifest.write();
  cpSync(manifest.manifestPath, join(dist, 'kit.json'));
  if (existsSync(join(root, 'packages/viewer/static'))) cpSync(join(root, 'packages/viewer/static'), join(dist, 'static'), { recursive: true });
  writeFileSync(join(dist, 'BUILT'), `${new Date().toISOString()}\n`);
  console.log(`Built into ${dist}.`);
}

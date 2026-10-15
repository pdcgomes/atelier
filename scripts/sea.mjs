#!/usr/bin/env node
// Builds the single binary, build/sea/atelier, with Node's single executable
// applications: the command and daemon in one script, carrying the viewer,
// the runtime, the kit's types, React's types, and esbuild's and TypeScript's
// native compilers for this platform as assets.
//
// The binary is built on an official Node.js from nodejs.org, which has the
// fuse a single executable needs (Homebrew's hasn't): $ATELIER_SEA_NODE, or
// build/node/node-<version>-<platform>-<arch>/bin/node.
//
//   node scripts/sea.mjs

import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'build/sea');
const dist = join(root, 'packages/daemon/dist');
const require = createRequire(join(root, 'package.json'));

execFileSync(process.execPath, [join(root, 'scripts/build.mjs')], { stdio: 'inherit' });
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

await build({
  entryPoints: [join(root, 'packages/daemon/src/sea-main.ts')],
  outfile: join(out, 'atelier.cjs'),
  bundle: true,
  format: 'cjs',
  platform: 'node',
  target: 'node22',
  jsx: 'automatic',
  alias: { '@atelier/themes': join(root, 'packages/themes/src/index.ts') },
  logLevel: 'error',
});

const assets = {};
const add = (folder, prefix, keep = () => true) => {
  for (const name of readdirSync(folder)) {
    const file = join(folder, name);
    if (statSync(file).isDirectory()) add(file, `${prefix}/${name}`, keep);
    else if (keep(name)) assets[`${prefix}/${name}`] = file;
  }
};
for (const name of ['runtime.js', 'viewer.js']) assets[`dist/${name}`] = join(dist, name);
add(join(dist, 'static'), 'dist/static');
add(join(dist, 'types'), 'dist/types');
const types = (name) => dirname(require.resolve(`${name}/package.json`));
for (const name of ['@types/react', '@types/react-dom', 'csstype']) add(types(name), `types/node_modules/${name}`, (f) => f.endsWith('.d.ts') || f === 'package.json');
assets['bin/esbuild'] = join(types('esbuild'), '..', '@esbuild', `${process.platform}-${process.arch}`, 'bin/esbuild');
// The native tsc reads its lib.*.d.ts files from beside it.
const { default: getExePath } = await import(pathToFileURL(join(types('typescript'), 'lib/getExePath.js')).href);
add(dirname(getExePath()), 'bin');

const config = join(out, 'sea-config.json');
writeFileSync(
  config,
  JSON.stringify({ main: join(out, 'atelier.cjs'), output: join(out, 'atelier'), disableExperimentalSEAWarning: true, useCodeCache: false, useSnapshot: false, assets }, null, 2),
);
const base = process.env.ATELIER_SEA_NODE ?? join(root, `build/node/node-${process.version}-${process.platform}-${process.arch}/bin/node`);
if (!existsSync(base)) {
  throw new Error(`The binary is built on an official Node.js, which has the fuse it needs. Put ${process.version} for ${process.platform}-${process.arch} from https://nodejs.org/dist/${process.version}/ at ${base}, or point ATELIER_SEA_NODE at one.`);
}
execFileSync(base, ['--build-sea', config], { stdio: 'inherit' });
if (process.platform === 'darwin') execFileSync('codesign', ['--sign', '-', '--force', join(out, 'atelier')], { stdio: 'inherit' });
const size = statSync(join(out, 'atelier')).size;
console.log(`Built ${relative(process.cwd(), join(out, 'atelier'))}: ${(size / 1048576).toFixed(0)} MB, with ${Object.keys(assets).length} files inside.`);

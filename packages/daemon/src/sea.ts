// In the single binary, what the npm package has as files (the viewer, the
// runtime, the kit's types, React's types, and esbuild's and TypeScript's
// native compilers) is carried as assets. They're unpacked once per version
// into ~/.atelier/bin/<version>, and the daemon is pointed at them.

import { chmodSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

export function unpack(version: string): void {
  const sea = createRequire(__filename)('node:sea') as typeof import('node:sea');
  if (!sea.isSea()) return;
  const home = process.env.ATELIER_HOME ?? join(homedir(), '.atelier');
  const dir = join(home, 'bin', version);
  const done = join(dir, '.unpacked');
  if (!existsSync(done)) {
    for (const key of sea.getAssetKeys()) {
      const file = join(dir, key);
      mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
      writeFileSync(file, Buffer.from(sea.getRawAsset(key) as ArrayBuffer));
      if (key === 'bin/esbuild' || key === 'bin/tsc') chmodSync(file, 0o755);
    }
    writeFileSync(done, `${new Date().toISOString()}\n`);
  }
  process.env.ATELIER_DIST ??= join(dir, 'dist');
  process.env.ESBUILD_BINARY_PATH ??= join(dir, 'bin/esbuild');
  process.env.ATELIER_TSC ??= join(dir, 'bin/tsc');
  process.env.ATELIER_TYPES ??= join(dir, 'types/node_modules');
}

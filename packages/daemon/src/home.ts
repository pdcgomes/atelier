// The daemon's own folder, ~/.atelier (or $ATELIER_HOME), and the files in it.

import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const HOME = process.env.ATELIER_HOME ?? join(homedir(), '.atelier');

export const paths = {
  /** Its port, its token and its process. Only you can read it. */
  daemon: join(HOME, 'daemon.json'),
  settings: join(HOME, 'settings.json'),
  /** The project roots it knows. */
  projects: join(HOME, 'projects.json'),
  sessions: join(HOME, 'sessions.json'),
  /** Messages waiting for sessions. */
  inbox: join(HOME, 'inbox.json'),
  /** Canvases that belong to no project. */
  canvases: join(HOME, 'canvases'),
  runs: join(HOME, 'runs'),
  launch: join(HOME, 'launch'),
  cache: join(HOME, 'cache'),
  log: join(HOME, 'daemon.log'),
};

export function ensureHome() {
  for (const dir of [HOME, paths.canvases, paths.runs, paths.launch, paths.cache]) mkdirSync(dir, { recursive: true, mode: 0o700 });
}

export function readJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as T;
  } catch {
    return fallback;
  }
}

/** Writes a file whole or not at all: to a temporary file beside it, then renamed over it. */
export function writeAtomic(file: string, text: string, mode = 0o644) {
  mkdirSync(dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(temp, text, { mode });
  chmodSync(temp, mode);
  renameSync(temp, file);
}

export function writeJson(file: string, value: unknown, mode = 0o644) {
  writeAtomic(file, `${JSON.stringify(value, null, 2)}\n`, mode);
}

/**
 * Where the built viewer, runtime and kit types are: beside this file once
 * it's bundled into dist/atelier.mjs, or in ../dist when run from src/.
 */
export const DIST = (() => {
  if (process.env.ATELIER_DIST) return process.env.ATELIER_DIST;
  const here = dirname(fileURLToPath(import.meta.url));
  return existsSync(join(here, 'runtime.js')) ? here : join(here, '..', 'dist');
})();

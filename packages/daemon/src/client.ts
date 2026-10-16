// How the CLI, the hooks and the MCP server reach the daemon: through
// ~/.atelier/daemon.json, starting it when it isn't running.

import { spawn } from 'node:child_process';
import { openSync } from 'node:fs';
import { createRequire } from 'node:module';
import { ensureHome, paths, readJson } from './home.ts';
import { installed } from './install.ts';
import type { DaemonInfo } from './server.ts';

export interface Client {
  info: DaemonInfo;
  call<T = unknown>(method: string, path: string, body?: unknown): Promise<T>;
}

const pause = (ms: number) => new Promise((done) => setTimeout(done, ms));

function clientFor(info: DaemonInfo): Client {
  return {
    info,
    async call(method, path, body) {
      const res = await fetch(`http://127.0.0.1:${info.port}${path}`, {
        method,
        headers: { authorization: `Bearer ${info.token}`, 'content-type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (!res.ok && res.status !== 422) throw new Error(data.error ?? `The daemon answered ${res.status}.`);
      return data;
    },
  };
}

async function alive(info: DaemonInfo | null): Promise<boolean> {
  if (!info) return false;
  try {
    const res = await fetch(`http://127.0.0.1:${info.port}/api/status`, { headers: { authorization: `Bearer ${info.token}` }, signal: AbortSignal.timeout(1500) });
    return res.ok;
  } catch {
    return false;
  }
}

/** The command that runs the daemon: this script again, or this binary when it's a single executable. */
export async function daemonCommand(): Promise<[string, string[]]> {
  if (isSea()) return [process.execPath, ['daemon']];
  return [process.execPath, [...process.execArgv, process.argv[1], 'daemon']];
}

/** Whether this is the single binary. */
export function isSea(): boolean {
  try {
    const require = createRequire(typeof __filename === 'string' ? __filename : import.meta.url);
    return (require('node:sea') as typeof import('node:sea')).isSea();
  } catch {
    return false;
  }
}

/** The running daemon, started in the background first if `start` and it isn't running. */
export async function connect({ start = true } = {}): Promise<Client | null> {
  const info = readJson<DaemonInfo | null>(paths.daemon, null);
  if (await alive(info)) return clientFor(info!);
  if (!start) return null;
  // Installed, the daemon is launchd's to start: one started here could be
  // inside an agent's sandbox, and couldn't open a browser or a terminal.
  if (installed()) {
    for (let i = 0; i < 100; i++) {
      await pause(100);
      const next = readJson<DaemonInfo | null>(paths.daemon, null);
      if (await alive(next)) return clientFor(next!);
    }
  }
  ensureHome();
  const [cmd, args] = await daemonCommand();
  const log = openSync(paths.log, 'a');
  spawn(cmd, args, { detached: true, stdio: ['ignore', log, log], env: process.env }).unref();
  for (let i = 0; i < 100; i++) {
    await pause(100);
    const next = readJson<DaemonInfo | null>(paths.daemon, null);
    if (next && next.pid !== info?.pid && (await alive(next))) return clientFor(next);
  }
  throw new Error(`The daemon didn't start. Its log is ${paths.log}.`);
}

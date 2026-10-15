// How the CLI, the hooks and the MCP server reach the daemon: through
// ~/.atelier/daemon.json, starting it when it isn't running.

import { spawn } from 'node:child_process';
import { openSync } from 'node:fs';
import { ensureHome, paths, readJson } from './home.ts';
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
async function daemonCommand(): Promise<[string, string[]]> {
  try {
    const sea = await import('node:sea');
    if (sea.isSea()) return [process.execPath, ['daemon']];
  } catch {}
  return [process.execPath, [...process.execArgv, process.argv[1], 'daemon']];
}

/** The running daemon, started in the background first if `start` and it isn't running. */
export async function connect({ start = true } = {}): Promise<Client | null> {
  const info = readJson<DaemonInfo | null>(paths.daemon, null);
  if (await alive(info)) return clientFor(info!);
  if (!start) return null;
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

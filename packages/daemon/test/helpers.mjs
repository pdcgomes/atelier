// A daemon of its own for each test file: in a temporary home, on a port of
// its own, with a project to show canvases from.

import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const cli = new URL('../src/cli.ts', import.meta.url).pathname;
const pause = (ms) => new Promise((done) => setTimeout(done, ms));

export const PNG = Buffer.from('89504e470d0a1a0a0000000d4948445200000001000000010806000000', 'hex');

export async function daemon({ env = {} } = {}) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'atelier-test-')));
  const home = join(root, 'home');
  const project = join(root, 'project');
  mkdirSync(join(project, '.atelier'), { recursive: true });
  const proc = spawn(process.execPath, [cli, 'daemon', '--port', '0'], {
    env: { ...process.env, ATELIER_HOME: home, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  proc.stdout.on('data', (d) => (output += d));
  proc.stderr.on('data', (d) => (output += d));
  let info;
  for (let i = 0; i < 100 && !info; i++) {
    await pause(100);
    if (existsSync(join(home, 'daemon.json'))) info = JSON.parse(readFileSync(join(home, 'daemon.json'), 'utf8'));
  }
  if (!info) throw new Error(`The daemon didn't start:\n${output}`);
  const base = `http://127.0.0.1:${info.port}`;
  const call = async (method, path, body, headers = {}) => {
    const res = await fetch(base + path, {
      method,
      headers: { authorization: `Bearer ${info.token}`, 'content-type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: 'manual',
    });
    const type = res.headers.get('content-type') ?? '';
    return { status: res.status, headers: res.headers, body: type.includes('json') ? await res.json() : Buffer.from(await res.arrayBuffer()) };
  };
  /** Collects the daemon's server-sent events. */
  const events = async () => {
    const res = await fetch(`${base}/api/events`, { headers: { authorization: `Bearer ${info.token}` } });
    const seen = [];
    const reader = res.body.getReader();
    let text = '';
    (async () => {
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          text += new TextDecoder().decode(value);
          let i;
          while ((i = text.indexOf('\n\n')) >= 0) {
            const chunk = text.slice(0, i);
            text = text.slice(i + 2);
            const type = /^event: (.*)$/m.exec(chunk)?.[1];
            const data = /^data: (.*)$/m.exec(chunk)?.[1];
            if (type) seen.push({ type, data: JSON.parse(data) });
          }
        }
      } catch {}
    })();
    return {
      seen,
      async next(type, test = () => true, seconds = 5) {
        const start = seen.length;
        for (let i = 0; i < seconds * 20; i++) {
          const found = seen.slice(start).find((e) => e.type === type && test(e.data)) ?? seen.find((e) => e.type === type && test(e.data) && e.late);
          if (found) return found.data;
          await pause(50);
        }
        throw new Error(`No ${type} event; saw ${seen.map((e) => e.type).join(', ')}`);
      },
      close: () => reader.cancel(),
    };
  };
  const write = (rel, text) => {
    const file = join(project, rel);
    mkdirSync(join(file, '..'), { recursive: true });
    writeFileSync(file, text);
    return file;
  };
  return {
    info,
    base,
    home,
    root,
    project,
    call,
    events,
    write,
    output: () => output,
    async stop() {
      proc.kill('SIGTERM');
      await pause(150);
      rmSync(root, { recursive: true, force: true });
    },
  };
}

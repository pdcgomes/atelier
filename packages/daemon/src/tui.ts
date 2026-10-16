// atelier-tui, the viewer in the terminal (tui/ in this repository): finding
// it, and running it for `atelier tui`.

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

export const INSTALL_TUI = 'cargo install --git https://github.com/pdcgomes/atelier atelier-tui --locked';

/** Where atelier-tui is: `ATELIER_TUI`, the PATH, or where cargo and Homebrew put programs. */
export function tuiBinary(): string | null {
  if (process.env.ATELIER_TUI) return process.env.ATELIER_TUI;
  const dirs = [...(process.env.PATH ?? '').split(':').filter(Boolean), join(homedir(), '.cargo/bin'), '/opt/homebrew/bin', '/usr/local/bin'];
  for (const dir of dirs) {
    const file = join(dir, 'atelier-tui');
    if (existsSync(file)) return file;
  }
  return null;
}

/** `atelier tui [canvas] [options]`: the viewer in this terminal, on a canvas if one is named. */
export async function runTui(args: string[]) {
  const bin = tuiBinary();
  if (!bin) throw new Error(`atelier-tui isn't installed. It's built with Rust, by:\n\n  ${INSTALL_TUI}`);
  const { connect } = await import('./client.ts');
  await connect();
  const passed = args.map((a, i) => (!a.startsWith('-') && (i === 0 || !args[i - 1].startsWith('--')) && /\.canvas\.(tsx|json)$/.test(a) ? resolve(a) : a));
  const code = await new Promise<number>((done) => {
    const child = spawn(bin, passed, { stdio: 'inherit' });
    child.once('error', (e) => {
      console.error(`atelier-tui didn't start: ${e.message}`);
      done(1);
    });
    child.once('exit', (c) => done(c ?? 0));
  });
  process.exitCode = code;
}

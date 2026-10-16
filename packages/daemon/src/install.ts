// `atelier install` and `atelier uninstall`: a LaunchAgent that keeps the
// daemon running in your own login session. A daemon started from inside an
// agent's sandbox, as the plugin's hooks start one when none is running,
// inherits the sandbox, which won't let it open your browser or a terminal.
// Run both in your own Terminal.

import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, userInfo } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { HOME, ensureHome, paths } from './home.ts';

export const LABEL = 'local.atelier.daemon';

export function plistPath(): string {
  return join(homedir(), 'Library', 'LaunchAgents', `${LABEL}.plist`);
}

/** Whether the LaunchAgent is installed, so the daemon is launchd's to start. */
export function installed(): boolean {
  return process.platform === 'darwin' && existsSync(plistPath());
}

function xml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** The LaunchAgent: the daemon's command, kept running, logging where it always does. */
export function launchAgent(program: string, args: string[], env: Record<string, string>): string {
  const strings = (list: string[]) => list.map((a) => `<string>${xml(a)}</string>`).join('');
  const vars = Object.entries(env)
    .map(([k, v]) => `<key>${xml(k)}</key><string>${xml(v)}</string>`)
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>${strings([program, ...args])}</array>
  <key>EnvironmentVariables</key>
  <dict>${vars}</dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ProcessType</key><string>Interactive</string>
  <key>StandardOutPath</key><string>${xml(paths.log)}</string>
  <key>StandardErrorPath</key><string>${xml(paths.log)}</string>
</dict>
</plist>
`;
}

function launchctl(...args: string[]) {
  return spawnSync('launchctl', args, { encoding: 'utf8' });
}

function target(): string {
  return `gui/${userInfo().uid}`;
}

/**
 * Installs the LaunchAgent and starts the daemon from it, in place of one
 * already running. `command` is how this atelier runs its daemon. Your PATH
 * goes with it, so the daemon finds `claude`, `node` and your terminal.
 */
export async function install(command: [string, string[]], stopRunning: () => Promise<void>): Promise<string> {
  if (process.platform !== 'darwin') throw new Error('atelier install sets up a macOS LaunchAgent, so it only works on a Mac.');
  ensureHome();
  const env: Record<string, string> = { PATH: process.env.PATH ?? '/usr/bin:/bin:/usr/sbin:/sbin' };
  if (process.env.ATELIER_HOME) env.ATELIER_HOME = HOME;
  if (process.env.ATELIER_CLAUDE) env.ATELIER_CLAUDE = process.env.ATELIER_CLAUDE;
  try {
    mkdirSync(join(homedir(), 'Library', 'LaunchAgents'), { recursive: true });
    writeFileSync(plistPath(), launchAgent(command[0], command[1], env));
  } catch (e) {
    throw new Error(`Can't write ${plistPath()} (${(e as Error).message}). Run atelier install in your own Terminal, not in an agent's shell.`);
  }
  await stopRunning();
  launchctl('bootout', `${target()}/${LABEL}`);
  const started = launchctl('bootstrap', target(), plistPath());
  if (started.status !== 0) {
    throw new Error(`launchctl couldn't start the daemon: ${(started.stderr || started.stdout).trim()}. Run atelier install in your own Terminal, not in an agent's shell.`);
  }
  return plistPath();
}

/** Stops the daemon launchd runs, and takes the LaunchAgent away. */
export function uninstall(): boolean {
  if (!existsSync(plistPath())) return false;
  launchctl('bootout', `${target()}/${LABEL}`);
  rmSync(plistPath(), { force: true });
  return true;
}

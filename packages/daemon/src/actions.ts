// What a canvas can ask for, once you've confirmed it in the viewer: Claude
// Code started or resumed in a terminal tab or in the background, a message
// for a session, a file opened in your editor.
//
// Nothing here goes through a shell's parsing but the launch scripts, which
// quote what they're given and read a prompt from a file beside them.

import { spawn, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { appendFileSync, existsSync, mkdirSync, readdirSync, realpathSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { join, sep } from 'node:path';
import { expand, foldersFor } from './files.ts';
import { paths, readJson, writeJson } from './home.ts';
import type { CanvasInfo, Library } from './library.ts';
import type { Sessions } from './sessions.ts';
import { loadSettings, type Settings } from './settings.ts';

export type Action =
  | { type: 'startSession'; prompt: string; mode?: 'terminal' | 'background' }
  | { type: 'openSession'; id: string }
  | { type: 'tell'; session: string; text: string }
  | { type: 'openFile'; path: string; line?: number }
  | { type: 'openUrl'; url: string };

export interface ActionResult {
  ok: boolean;
  message: string;
  session?: string;
  run?: string;
}

export interface RunStep {
  at: number;
  kind: 'text' | 'tool' | 'result' | 'error' | 'system';
  text: string;
}

/** A background run of Claude Code that a canvas started. */
export interface Run {
  id: string;
  canvas?: string;
  project: string;
  prompt: string;
  status: 'running' | 'done' | 'failed' | 'stopped';
  started: number;
  ended?: number;
  session?: string;
  steps: RunStep[];
  result?: string;
  cost?: number;
}

export interface Context {
  sessions: Sessions;
  library: Library;
}

const claude = () => process.env.ATELIER_CLAUDE ?? 'claude';

/** The environment for what the daemon starts, without the single binary's own settings. */
function ownEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  for (const key of ['ATELIER_DIST', 'ESBUILD_BINARY_PATH', 'ATELIER_TSC', 'ATELIER_TYPES']) delete env[key];
  return env;
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KEEP_STEPS = 400;
const sh = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

function firstLine(text: string) {
  return clip(text.split('\n').map((l) => l.trim()).find(Boolean) ?? '', 90);
}

/** Starts a program apart from the daemon, and says whether it could. */
function launch(cmd: string, args: string[], cwd?: string): Promise<string | null> {
  return new Promise((done) => {
    const child = spawn(cmd, args, { cwd, detached: true, stdio: 'ignore' });
    child.once('error', (e) => done(`${cmd} didn't start: ${e.message}`));
    child.once('spawn', () => {
      child.unref();
      done(null);
    });
  });
}

// Terminal tabs

function tidyLaunchFolder() {
  try {
    const day = Date.now() - 86_400_000;
    for (const name of readdirSync(paths.launch)) {
      const file = join(paths.launch, name);
      if (statSync(file).mtimeMs < day) unlinkSync(file);
    }
  } catch {}
}

/**
 * Writes the script a terminal tab runs: it goes to the project and runs
 * Claude Code (or `program`) with `args`, and with the prompt read from a
 * file beside it. `--` comes before the prompt, so a prompt can't be taken
 * for an option.
 */
export function launchScript(project: string, args: string[], prompt?: string, program = claude()): string {
  mkdirSync(paths.launch, { recursive: true, mode: 0o700 });
  tidyLaunchFolder();
  const id = randomUUID();
  const lines = ['#!/bin/sh', `# Written by Atelier, ${new Date().toISOString()}.`, `cd ${sh(project)} || exit 1`];
  let command = [program, ...args].map(sh).join(' ');
  if (prompt !== undefined) {
    const file = join(paths.launch, `${id}.prompt`);
    writeFileSync(file, prompt, { mode: 0o600 });
    command += ` -- "$(cat ${sh(file)})"`;
  }
  lines.push(`exec ${command}`);
  const script = join(paths.launch, `${id}.command`);
  writeFileSync(script, `${lines.join('\n')}\n`, { mode: 0o700 });
  return script;
}

const appleString = (s: string) => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

/** Opens a terminal running the script, in the terminal you picked in the settings. */
export function openTerminal(script: string, settings: Settings): Promise<string | null> {
  if (settings.terminal === 'custom' && settings.terminalCommand?.length) {
    const [cmd, ...rest] = settings.terminalCommand;
    return launch(cmd, rest.includes('{script}') ? rest.map((a) => (a === '{script}' ? script : a)) : [...rest, script]);
  }
  if (process.platform !== 'darwin') return launch('x-terminal-emulator', ['-e', script]);
  switch (settings.terminal) {
    case 'iterm':
      return launch('osascript', ['-e', 'tell application "iTerm"', '-e', 'activate', '-e', `create window with default profile command ${appleString(script)}`, '-e', 'end tell']);
    case 'terminal':
      return launch('open', ['-a', 'Terminal', script]);
    default:
      return launch('open', ['-na', 'Ghostty', '--args', '-e', script]);
  }
}

// Background runs

class Runs extends EventEmitter {
  private all = new Map<string, Run>();
  private children = new Map<string, ChildProcess>();
  private saving = new Map<string, NodeJS.Timeout>();

  constructor() {
    super();
    if (!existsSync(paths.runs)) return;
    for (const name of readdirSync(paths.runs)) {
      if (!name.endsWith('.json')) continue;
      const run = readJson<Run | null>(join(paths.runs, name), null);
      if (!run?.id) continue;
      if (run.status === 'running') run.status = 'stopped';
      this.all.set(run.id, run);
    }
  }

  list(): Run[] {
    return [...this.all.values()].sort((a, b) => b.started - a.started).slice(0, 50);
  }

  get(id: string): Run | undefined {
    return this.all.get(id);
  }

  private save(run: Run) {
    clearTimeout(this.saving.get(run.id));
    this.saving.set(
      run.id,
      setTimeout(() => {
        this.saving.delete(run.id);
        writeJson(join(paths.runs, `${run.id}.json`), run);
      }, 250),
    );
  }

  private step(run: Run, kind: RunStep['kind'], text: string) {
    const step = { at: Date.now(), kind, text };
    run.steps.push(step);
    if (run.steps.length > KEEP_STEPS) run.steps.splice(0, run.steps.length - KEEP_STEPS);
    this.emit('step', run.id, step);
    this.save(run);
  }

  private finish(run: Run, status: Run['status']) {
    if (run.status !== 'running') return;
    run.status = status;
    run.ended = Date.now();
    this.children.delete(run.id);
    this.save(run);
    this.emit('change');
  }

  /** Runs Claude Code in the background with the prompt, a new session or `resume`d. */
  start(options: { project: string; prompt: string; canvas?: string; resume?: string; sessions: Sessions }): Run {
    const session = options.resume ?? randomUUID();
    const run: Run = { id: randomUUID(), canvas: options.canvas, project: options.project, prompt: options.prompt, status: 'running', started: Date.now(), session, steps: [] };
    this.all.set(run.id, run);
    mkdirSync(paths.runs, { recursive: true });
    const log = join(paths.runs, `${run.id}.jsonl`);
    const args = ['-p', '--output-format', 'stream-json', '--verbose', ...(options.resume ? ['--resume', options.resume] : ['--session-id', session])];
    const child = spawn(claude(), args, { cwd: options.project, stdio: ['pipe', 'pipe', 'pipe'], env: { ...ownEnv(), ATELIER_RUN: run.id } });
    this.children.set(run.id, child);
    options.sessions.started({ id: session, project: options.project, title: firstLine(options.prompt), kind: 'background', status: 'working' });
    this.emit('change');

    child.once('error', (e) => {
      this.step(run, 'error', `Claude Code didn't start: ${e.message}. Is \`${claude()}\` on the daemon's PATH?`);
      this.finish(run, 'failed');
    });
    child.stdin.on('error', () => {});
    child.stdin.end(options.prompt);

    let buffer = '';
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      appendFileSync(log, chunk);
      buffer += chunk;
      let i;
      while ((i = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, i).trim();
        buffer = buffer.slice(i + 1);
        if (line) this.read(run, line);
      }
    });
    let errors = '';
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk: string) => {
      errors = (errors + chunk).slice(-4000);
    });
    child.once('close', (code, signal) => {
      if (buffer.trim()) this.read(run, buffer.trim());
      if (run.status === 'running') {
        if (signal || code) {
          const why = errors.trim().split('\n').slice(-6).join('\n');
          this.step(run, 'error', why || `Claude Code stopped${signal ? ` (${signal})` : ` with exit code ${code}`}.`);
        }
        this.finish(run, signal ? 'stopped' : code ? 'failed' : 'done');
      }
      // Messages left while it ran, which no Stop hook of its own handed over, carry it on.
      const left = options.sessions.hook('Stop', { session_id: session, cwd: options.project });
      if (left.length && !signal) this.start({ ...options, prompt: left.join('\n\n'), resume: session });
    });
    return run;
  }

  /** One line of Claude Code's stream-json output, as steps. */
  private read(run: Run, line: string) {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(line);
    } catch {
      return this.step(run, 'system', clip(line, 400));
    }
    if (typeof msg.session_id === 'string') run.session = msg.session_id;
    const content = ((msg.message as { content?: unknown })?.content ?? []) as Record<string, unknown>[];
    switch (msg.type) {
      case 'system':
        if (msg.subtype === 'init') this.step(run, 'system', `Started${msg.model ? ` with ${msg.model}` : ''}, in ${msg.cwd ?? run.project}.`);
        return;
      case 'assistant':
        for (const part of Array.isArray(content) ? content : []) {
          if (part.type === 'text' && typeof part.text === 'string' && part.text.trim()) this.step(run, 'text', clip(part.text.trim(), 2000));
          if (part.type === 'tool_use') this.step(run, 'tool', `${part.name} ${clip(describeInput(part.input), 200)}`.trim());
        }
        return;
      case 'user':
        for (const part of Array.isArray(content) ? content : []) {
          if (part.type === 'tool_result' && part.is_error) this.step(run, 'error', clip(textOf(part.content), 400));
        }
        return;
      case 'result': {
        run.result = typeof msg.result === 'string' ? msg.result : undefined;
        if (typeof msg.total_cost_usd === 'number') run.cost = msg.total_cost_usd;
        this.step(run, msg.is_error ? 'error' : 'result', clip(run.result ?? String(msg.subtype ?? 'Finished.'), 4000));
        this.finish(run, msg.is_error ? 'failed' : 'done');
        return;
      }
    }
  }

  stop(id: string): boolean {
    const child = this.children.get(id);
    if (!child) return false;
    child.kill('SIGTERM');
    return true;
  }
}

function describeInput(input: unknown): string {
  if (!input || typeof input !== 'object') return '';
  const i = input as Record<string, unknown>;
  for (const key of ['file_path', 'command', 'pattern', 'url', 'path', 'description', 'query', 'prompt']) {
    if (typeof i[key] === 'string') return String(i[key]).split('\n')[0];
  }
  return '';
}

function textOf(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map((c) => (typeof c?.text === 'string' ? c.text : '')).join(' ');
  return '';
}

export const runs = new Runs();
export type { Runs };

// Files

/** The editor's arguments for a file, at a line where the editor can go to one. */
function editorArgs(editor: string, file: string, line: number | undefined, directory: boolean): [string, string[]] {
  const name = editor.split('/').pop() ?? editor;
  if (editor === 'open') {
    if (process.platform !== 'darwin') return ['xdg-open', [file]];
    // -t opens a file in your text editor rather than running it, which `open` does for scripts and apps.
    return ['open', directory ? [file] : ['-t', file]];
  }
  if (line && ['cursor', 'code', 'code-insiders', 'windsurf'].includes(name)) return [editor, ['-g', `${file}:${line}`]];
  if (line && ['zed', 'subl', 'idea', 'webstorm'].includes(name)) return [editor, [`${file}:${line}`]];
  if (line && ['vim', 'nvim', 'emacs', 'nano'].includes(name)) return [editor, [`+${line}`, file]];
  return [editor, [file]];
}

/** A file a canvas names, if it's somewhere a canvas may point to. */
function allowedFile(canvas: CanvasInfo, path: string, library: Library): string {
  const wanted = expand(path, foldersFor(canvas.path));
  let real: string;
  try {
    real = realpathSync(wanted);
  } catch {
    throw new Error(`There's no ${path}.`);
  }
  const inside = library.allowedRoots().some((root) => real === root || real.startsWith(root + sep));
  if (!inside) throw new Error(`${path} is outside the projects Atelier knows, so a canvas can't open it.`);
  return real;
}

// Actions

async function terminal(project: string, args: string[], prompt: string | undefined, what: string): Promise<ActionResult> {
  const script = launchScript(project, args, prompt);
  const failed = await openTerminal(script, loadSettings());
  return failed ? { ok: false, message: failed } : { ok: true, message: what };
}

export async function runAction(canvas: CanvasInfo, action: Action, { sessions, library }: Context): Promise<ActionResult> {
  try {
    switch (action.type) {
      case 'startSession': {
        if (typeof action.prompt !== 'string' || !action.prompt.trim()) return { ok: false, message: 'Starting a session needs a prompt.' };
        if (action.mode === 'background') {
          const run = runs.start({ project: canvas.project, prompt: action.prompt, canvas: canvas.id, sessions });
          return { ok: true, message: 'Started in the background. Press r to follow it.', session: run.session, run: run.id };
        }
        const id = randomUUID();
        const result = await terminal(canvas.project, ['--session-id', id], action.prompt, 'Started in a terminal.');
        if (result.ok) sessions.started({ id, project: canvas.project, title: firstLine(action.prompt), kind: 'terminal', status: 'working' });
        return { ...result, session: result.ok ? id : undefined };
      }
      case 'openSession': {
        if (!UUID.test(action.id ?? '')) return { ok: false, message: "That isn't a session's id." };
        const project = sessions.get(action.id)?.project || canvas.project;
        return { ...(await terminal(project, ['--resume', action.id], undefined, 'Opened in a terminal.')), session: action.id };
      }
      case 'tell': {
        if (!UUID.test(action.session ?? '')) return { ok: false, message: "That isn't a session's id." };
        if (typeof action.text !== 'string' || !action.text.trim()) return { ok: false, message: 'A message needs some text.' };
        const session = sessions.get(action.session);
        if (session?.status === 'working') {
          sessions.leave(action.session, action.text);
          return { ok: true, message: 'It gets this when its turn ends.', session: action.session };
        }
        const run = runs.start({ project: session?.project || canvas.project, prompt: action.text, canvas: canvas.id, resume: action.session, sessions });
        return { ok: true, message: 'Resumed in the background with your message. Press r to follow it.', session: action.session, run: run.id };
      }
      case 'openFile': {
        const file = allowedFile(canvas, action.path, library);
        const settings = loadSettings();
        const [cmd, args] = editorArgs(settings.editor, file, action.line, statSync(file).isDirectory());
        const failed = await launch(cmd, args);
        return failed ? { ok: false, message: failed } : { ok: true, message: `Opened ${action.path}.` };
      }
      case 'openUrl':
        return { ok: false, message: 'The viewer opens web pages itself.' };
    }
    return { ok: false, message: "That isn't an action Atelier knows." };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}
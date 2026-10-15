// The canvases the daemon knows: those in each project's .atelier/ folder and
// in ~/.atelier/canvases. It watches those folders, keeps each canvas's build
// until one of its files changes, and says when a canvas or its state changes.

import { createHash } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, statSync, watch, type FSWatcher } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { CompileError, compile } from './compile.ts';
import { paths, readJson, writeJson } from './home.ts';
import { readState } from './state.ts';

export interface CanvasInfo {
  id: string;
  path: string;
  /** The project root it's in, or ~/.atelier for one that belongs to none. */
  project: string;
  name: string;
  kind: 'tsx' | 'template';
  template?: string;
  title: string;
  /** When its file last changed, in milliseconds. */
  modified: number;
}

export type Built =
  | { kind: 'module'; code: string; version: string }
  | { kind: 'template'; template: string; data: unknown; version: string }
  | { kind: 'problem'; problems: { file: string; line: number; column: number; message: string }[]; version: string };

export const FOLDER = '.atelier';
const CANVAS = /\.canvas\.(tsx|json)$/;

export function canvasId(path: string) {
  return createHash('sha1').update(resolve(path)).digest('hex').slice(0, 12);
}

/** The project root a canvas belongs to: the folder holding its .atelier folder. */
export function projectOf(path: string): string | null {
  const dir = dirname(resolve(path));
  return basename(dir) === FOLDER ? dirname(dir) : null;
}

function titleOf(path: string, kind: CanvasInfo['kind']): { title?: string; template?: string } {
  try {
    const text = readFileSync(path, 'utf8');
    if (kind === 'template') {
      const data = JSON.parse(text);
      return { title: typeof data.title === 'string' ? data.title : undefined, template: typeof data.template === 'string' ? data.template : undefined };
    }
    const m = /export\s+const\s+meta\s*=\s*\{[^}]*?\btitle\s*:\s*(['"`])((?:(?!\1).)*)\1/s.exec(text);
    return { title: m?.[2] };
  } catch {
    return {};
  }
}

function humanise(name: string) {
  const words = name.replace(/[-_]+/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export class Library extends EventEmitter {
  private projects = new Set<string>();
  private watchers = new Map<string, FSWatcher>();
  private builds = new Map<string, { built: Built; inputs: string[] }>();
  private pending = new Map<string, NodeJS.Timeout>();
  private canvases = new Map<string, CanvasInfo>();
  private writing = new Set<string>();

  constructor() {
    super();
    for (const root of readJson<string[]>(paths.projects, [])) if (existsSync(root)) this.projects.add(root);
  }

  start() {
    mkdirSync(paths.canvases, { recursive: true });
    this.rescan();
    // A project's .atelier folder can appear at any time; look for new ones now and then.
    setInterval(() => this.rescan(), 5000).unref();
  }

  stop() {
    for (const w of this.watchers.values()) w.close();
    this.watchers.clear();
  }

  /** Adds a project root, and says whether it was new. */
  addProject(root: string): boolean {
    let real: string;
    try {
      real = realpathSync(root);
    } catch {
      return false;
    }
    if (this.projects.has(real)) return false;
    this.projects.add(real);
    writeJson(paths.projects, [...this.projects]);
    this.rescan();
    return true;
  }

  roots(): string[] {
    return [...this.projects];
  }

  /** The folders files may be shown from: every project, and the daemon's own folder. */
  allowedRoots(): string[] {
    return [...this.projects, realpathSync(paths.canvases.replace(/\/canvases$/, ''))];
  }

  folders(): { folder: string; project: string }[] {
    return [...[...this.projects].map((p) => ({ folder: join(p, FOLDER), project: p })), { folder: paths.canvases, project: dirname(paths.canvases) }];
  }

  list(): CanvasInfo[] {
    return [...this.canvases.values()].sort((a, b) => b.modified - a.modified);
  }

  byId(id: string): CanvasInfo | undefined {
    return this.canvases.get(id);
  }

  byPath(path: string): CanvasInfo | undefined {
    return this.canvases.get(canvasId(path));
  }

  /** Marks a state file as being written by the daemon itself, so its change isn't reported back. */
  quietly(file: string, ms = 400) {
    this.writing.add(file);
    setTimeout(() => this.writing.delete(file), ms).unref();
  }

  rescan() {
    const seen = new Set<string>();
    for (const { folder, project } of this.folders()) {
      if (!existsSync(folder)) continue;
      this.watch(folder);
      for (const name of readdirSync(folder)) {
        if (!CANVAS.test(name)) continue;
        const path = join(folder, name);
        seen.add(canvasId(path));
        this.refresh(path, project, false);
      }
    }
    let gone = false;
    for (const id of this.canvases.keys()) {
      if (!seen.has(id)) {
        this.canvases.delete(id);
        this.builds.delete(id);
        gone = true;
      }
    }
    if (gone) this.emit('list');
  }

  private watch(folder: string) {
    if (this.watchers.has(folder)) return;
    try {
      const w = watch(folder, (_event, name) => name && this.changed(folder, String(name)));
      w.on('error', () => {
        w.close();
        this.watchers.delete(folder);
      });
      this.watchers.set(folder, w);
    } catch {}
  }

  private changed(folder: string, name: string) {
    const file = join(folder, name);
    clearTimeout(this.pending.get(file));
    this.pending.set(
      file,
      setTimeout(() => {
        this.pending.delete(file);
        if (/\.state\.json$/.test(name)) {
          if (this.writing.has(file)) return;
          const canvas = [...this.canvases.values()].find((c) => c.path.replace(CANVAS, '.state.json') === file);
          if (canvas) this.emit('state', canvas.id, readState(canvas.path));
          return;
        }
        if (/\.events\.jsonl$/.test(name)) return;
        if (CANVAS.test(name)) {
          const project = this.folders().find((f) => f.folder === folder)?.project ?? dirname(folder);
          if (!existsSync(file)) return this.rescan();
          this.refresh(file, project, true);
        }
        // A helper beside a canvas: rebuild the canvases made from it.
        for (const [id, entry] of this.builds) {
          if (entry.inputs.includes(file) && !CANVAS.test(name)) {
            this.builds.delete(id);
            this.emit('canvas', id);
          }
        }
      }, 80),
    );
  }

  private refresh(path: string, project: string, announce: boolean) {
    const id = canvasId(path);
    let modified = 0;
    try {
      modified = statSync(path).mtimeMs;
    } catch {
      return;
    }
    const before = this.canvases.get(id);
    if (before && before.modified === modified && !announce) return;
    const kind = path.endsWith('.json') ? 'template' : 'tsx';
    const { title, template } = titleOf(path, kind);
    const name = basename(path).replace(CANVAS, '');
    this.canvases.set(id, { id, path, project, name, kind, template, title: title ?? humanise(name), modified });
    if (before?.modified !== modified) this.builds.delete(id);
    if (!before) this.emit('list');
    else if (before.modified !== modified) {
      this.emit('list');
      this.emit('canvas', id);
    }
  }

  /** The canvas built, or a template's data, kept until its files change. */
  async build(id: string): Promise<Built | null> {
    const canvas = this.canvases.get(id);
    if (!canvas) return null;
    const kept = this.builds.get(id);
    if (kept) return kept.built;
    const hash = (s: string) => createHash('sha1').update(s).digest('hex').slice(0, 16);
    let built: Built;
    let inputs = [canvas.path];
    if (canvas.kind === 'template') {
      const text = readFileSync(canvas.path, 'utf8');
      try {
        const data = JSON.parse(text);
        built = { kind: 'template', template: String(data.template ?? ''), data, version: hash(text) };
      } catch (e) {
        built = { kind: 'problem', problems: [{ file: canvas.path, line: 1, column: 1, message: (e as Error).message }], version: hash(text) };
      }
    } else {
      try {
        const compiled = await compile(canvas.path);
        inputs = compiled.inputs;
        built = { kind: 'module', code: compiled.code, version: hash(compiled.code) };
      } catch (e) {
        if (!(e instanceof CompileError)) throw e;
        built = { kind: 'problem', problems: e.problems, version: hash(e.message) };
      }
    }
    this.builds.set(id, { built, inputs });
    return built;
  }
}

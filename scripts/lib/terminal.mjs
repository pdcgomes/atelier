// terminal.js, as atelier-tui's engine runs it, in a fresh V8 context
// without Intl, timers or a DOM, for the kit's tests: start a canvas, find
// elements in its tree, call their handlers, and read what it sent.

import { transformSync } from 'esbuild';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

export const NOW = Date.parse('2026-10-16T09:00:00Z');

/** Starts a canvas: `{ kind: 'template', template, data }` or `{ kind: 'module', code }`. */
export async function terminal(canvas, { state = {}, sessions = [], now = NOW } = {}) {
  const posts = [];
  const timers = new Map();
  const logs = [];
  const host = {
    post: (json) => posts.push(JSON.parse(json)),
    timer: (id, ms) => timers.set(id, ms),
    cancel: (id) => timers.delete(id),
    now: () => now,
    log: (level, text) => logs.push([level, text]),
    locale: 'en-GB',
  };
  const context = vm.createContext({ __host: host });
  vm.runInContext('delete globalThis.Intl;', context);
  vm.runInContext(readFileSync(join(root, 'packages/daemon/dist/terminal.js'), 'utf8'), context, { filename: 'terminal.js' });
  const T = context.__terminal;
  const settle = () => {
    for (let round = 0; round < 64; round++) {
      const due = [...timers].filter(([, ms]) => ms <= 50).map(([id]) => id);
      if (!due.length) break;
      for (const id of due) {
        timers.delete(id);
        T.fire(id);
      }
    }
  };
  const { kind, ...rest } = canvas;
  T.start(JSON.stringify({ canvas: kind === 'template' ? { kind, ...rest } : { kind }, state, sessions }));
  if (kind === 'module') {
    // atelier-tui evaluates the module as a module; here it's turned into a script that hands back its exports.
    const { code } = transformSync(canvas.code, { format: 'iife', globalName: '__canvas' });
    vm.runInContext(code, context, { filename: 'canvas.js' });
    T.mount(context.__canvas);
  }
  settle();
  let tree = JSON.parse(T.take() ?? '[]');
  const refresh = () => {
    settle();
    const next = T.take();
    if (next) tree = JSON.parse(next);
    return tree;
  };
  const all = () => {
    const out = [];
    const walk = (list, parent) => {
      for (const n of list ?? []) {
        if (typeof n === 'string') continue;
        out.push(n);
        walk(n.c, n);
        for (const slot of Object.values(n.s ?? {})) walk(slot, n);
      }
    };
    walk(refresh());
    return out;
  };
  /** The text a node shows: its own and its children's, without slots. */
  const text = (n) => (typeof n === 'string' ? n : (n.c ?? []).map(text).join(''));
  const slot = (n, name) => (n.s?.[name] ?? []).map((c) => (typeof c === 'string' ? c : text(c) + Object.values(c.s ?? {}).flat().map(text).join(''))).join('');
  return {
    tree: refresh,
    all,
    text,
    slot,
    find: (pred) => all().find(pred),
    findAll: (pred) => all().filter(pred),
    dispatch(node, name, ...args) {
      const ok = T.dispatch(node.id, name, JSON.stringify(args));
      refresh();
      return ok;
    },
    receive(message) {
      T.receive(JSON.stringify(message));
      refresh();
    },
    posts,
    logs,
    error: () => T.error(),
  };
}

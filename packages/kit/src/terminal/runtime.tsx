// What runs in atelier-tui's engine for each canvas: React, React DOM, the
// kit's terminal side and the templates' views, the same code the browser's
// frame runs (packages/kit/src/runtime.tsx), rendering into a host document
// whose tree atelier-tui reads and draws.

import './install.ts';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as ReactDOMClient from 'react-dom/client';
import * as jsxRuntime from 'react/jsx-runtime';
import { flushSync } from 'react-dom';
import * as kit from './index.ts';
import * as templateViews from '../../../../templates/index.ts';
import { connect, receive as toBridge, report, type Session } from '../bridge.ts';
import type { Theme } from '@atelier/themes';
import { doc, fire, host, root } from './env.ts';
import { Reader } from './tree.ts';
import type { HostElement } from './dom.ts';

(globalThis as Record<string, unknown>).__atelier = {
  react: React,
  'react/jsx-runtime': jsxRuntime,
  'react-dom': ReactDOM,
  'react-dom/client': ReactDOMClient,
  atelier: kit,
  'atelier/templates': templateViews,
};

export type Canvas = { kind: 'module' } | { kind: 'template'; template: string; data: unknown };

export interface Init {
  canvas: Canvas;
  state?: Record<string, unknown>;
  sessions?: Session[];
  theme?: Theme;
}

let failed: string | null = null;
function fail(message: string) {
  failed ??= message;
  report(message);
}

class Boundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    fail(`${error.message}${info.componentStack ? `\n${info.componentStack.split('\n').slice(0, 6).join('\n')}` : ''}`);
  }
  render() {
    return this.state.error ? React.createElement('at-Problem', { p: { title: 'This canvas stopped with an error', message: this.state.error.message } }) : this.props.children;
  }
}

const reader = new Reader();
let reactRoot: ReactDOMClient.Root | null = null;

function render(element: React.ReactNode) {
  reactRoot ??= ReactDOMClient.createRoot(root as unknown as Element, {
    onUncaughtError: (e) => fail((e as Error)?.message ?? String(e)),
    onRecoverableError: () => {},
  });
  flushSync(() => reactRoot!.render(React.createElement(Boundary, null, element)));
}

function problem(message: string) {
  fail(message);
  render(React.createElement('at-Problem', { p: { title: "This canvas didn't start", message } }));
}

/** Starts a canvas: a template now, or a module once its code is mounted. */
export function start(json: string) {
  const init = JSON.parse(json) as Init;
  connect((message) => host.post(JSON.stringify(message)), init);
  if (init.canvas.kind !== 'template') return;
  const template = templateViews.templates[init.canvas.template];
  if (!template) return problem(`There's no template called "${init.canvas.template}".`);
  const View = template.View as React.ComponentType<{ data: unknown }>;
  render(React.createElement(View, { data: init.canvas.data }));
}

/** Mounts a module canvas, from its namespace, once the host has evaluated its code. */
export function mount(mod: Record<string, unknown>) {
  const Component = mod?.default as React.ComponentType | undefined;
  if (typeof Component !== 'function' && typeof Component !== 'object') return problem('A canvas has to export a React component as its default export.');
  render(React.createElement(Component as React.ComponentType));
}

/** A message from the host, as the viewer sends a frame: state, sessions, the theme, a reply. */
export function receive(json: string) {
  const message = JSON.parse(json);
  flushSync(() => toBridge(message));
}

function click(target: HostElement) {
  let stopped = false;
  const event = {
    type: 'click',
    target,
    srcElement: target,
    currentTarget: root,
    bubbles: true,
    cancelable: true,
    defaultPrevented: false,
    timeStamp: host.now(),
    button: 0,
    buttons: 0,
    detail: 1,
    isTrusted: true,
    preventDefault() {
      this.defaultPrevented = true;
    },
    stopPropagation() {
      stopped = true;
    },
    get cancelBubble() {
      return stopped;
    },
  };
  const listeners = [...(root.listeners.get('click') ?? [])];
  const ordered = [...listeners.filter((l) => root.capture.has(l)), ...listeners.filter((l) => !root.capture.has(l))];
  flushSync(() => {
    for (const listen of ordered) listen(event);
  });
}

/** Calls a handler on an element on screen: a kit element's, by its name, or an HTML element's click. */
export function dispatch(id: number, name: string, args: string = '[]'): boolean {
  const el = reader.live.get(id);
  if (!el) return false;
  if (el.tagName.startsWith('at-')) {
    const fn = (el.p as Record<string, unknown> | undefined)?.[name];
    if (typeof fn !== 'function') return false;
    const list = JSON.parse(args) as unknown[];
    flushSync(() => (fn as (...a: unknown[]) => void)(...list));
    return true;
  }
  if (name !== 'click') return false;
  click(el);
  return true;
}

/** The tree as JSON when it has changed since it was last taken, or null. */
export function take(): string | null {
  if (!doc.dirty) return null;
  return JSON.stringify(reader.read(doc, root));
}

export function error(): string | null {
  return failed;
}

(globalThis as Record<string, unknown>).__terminal = { start, mount, receive, dispatch, take, fire, error };

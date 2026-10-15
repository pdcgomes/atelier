// What runs in the sealed frame: React, the kit and the templates' views.
// The frame's page imports this from a blob URL, then hands it the canvas.

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as ReactDOMClient from 'react-dom/client';
import * as jsxRuntime from 'react/jsx-runtime';
import { cssVariables, type Theme } from '@atelier/themes';
import * as kit from './index.ts';
import * as templateViews from '../../../templates/index.ts';
import { connect, receive, report, type Session } from './bridge.ts';
import { css } from './styles.ts';

// A compiled canvas finds what it imports here (packages/daemon/src/compile.ts).
(globalThis as Record<string, unknown>).__atelier = {
  react: React,
  'react/jsx-runtime': jsxRuntime,
  'react-dom': ReactDOM,
  'react-dom/client': ReactDOMClient,
  atelier: kit,
  'atelier/templates': templateViews,
};

export type Canvas = { kind: 'module'; code: string } | { kind: 'template'; template: string; data: unknown };

export interface Init {
  canvas: Canvas;
  state?: Record<string, unknown>;
  sessions?: Session[];
  theme?: Theme;
  scroll?: [number, number];
}

type Post = (message: { type: string; [key: string]: unknown }) => void;

class Boundary extends React.Component<{ children: React.ReactNode; onError: (e: Error) => void }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.props.onError(new Error(`${error.message}${info.componentStack ? `\n${info.componentStack.split('\n').slice(0, 6).join('\n')}` : ''}`));
  }
  render() {
    return this.state.error ? <pre className="at-problem">{`This canvas stopped with an error:\n\n${this.state.error.message}`}</pre> : this.props.children;
  }
}

function applyTheme(theme: Theme | undefined) {
  if (!theme) return;
  let style = document.getElementById('at-theme');
  if (!style) {
    style = document.createElement('style');
    style.id = 'at-theme';
    document.head.append(style);
  }
  style.textContent = `:root { ${cssVariables(theme)} }`;
}

const pause = (ms: number) => new Promise((done) => setTimeout(done, ms));

/** Waits for the canvas's first paint, then for it to be tall enough to scroll back to where the last version was. */
async function settle(root: HTMLElement, scroll?: [number, number]) {
  for (let waited = 0; !root.childElementCount && waited < 2000; waited += 25) await pause(25);
  await pause(30);
  const [x, y] = scroll ?? [0, 0];
  for (let tries = 0; tries < 60 && (x || y); tries++) {
    scrollTo(x, y);
    if (Math.abs(scrollX - x) < 2 && Math.abs(scrollY - y) < 2) break;
    await pause(25);
  }
}

/**
 * Starts the canvas. `load` imports a module from its code, the way the
 * frame found that works (a blob URL, or a data URL where blob URLs can't be
 * imported).
 */
export async function start(post: Post, init: Init, load: (code: string) => Promise<Record<string, unknown>>) {
  let failed: string | null = null;
  const fail = (message: string) => {
    failed ??= message;
    report(message);
  };
  const style = document.createElement('style');
  style.textContent = css;
  document.head.append(style);
  applyTheme(init.theme);
  connect(post, init);
  addEventListener('message', (e) => {
    if (e.source !== parent) return;
    const message = e.data ?? {};
    if (message.type === 'theme') applyTheme(message.theme);
    receive(message);
  });
  addEventListener('error', (e) => fail(e.message));
  addEventListener('unhandledrejection', (e) => fail(String(e.reason?.message ?? e.reason)));

  // The viewer's keys, which it can't hear while the canvas has focus.
  addEventListener('keydown', (e) => {
    const target = e.target as HTMLElement | null;
    const typing = target?.closest?.('input, textarea, select, [contenteditable]:not([contenteditable="false"])');
    if (e.defaultPrevented || typing || e.metaKey || e.ctrlKey || e.altKey) return;
    if (/^[0-9tr/?]$/.test(e.key) || e.key === 'Escape') post({ type: 'key', key: e.key });
  });

  let scrolled = 0;
  addEventListener('scroll', () => {
    clearTimeout(scrolled);
    scrolled = window.setTimeout(() => post({ type: 'scroll', x: scrollX, y: scrollY }), 120);
  }, { passive: true });

  const root = document.getElementById('root')!;
  try {
    let element: React.ReactNode;
    if (init.canvas.kind === 'module') {
      const mod = await load(init.canvas.code);
      const Component = mod.default as React.ComponentType | undefined;
      if (typeof Component !== 'function' && typeof Component !== 'object') throw new Error('A canvas has to export a React component as its default export.');
      element = <Component />;
    } else {
      const template = templateViews.templates[init.canvas.template];
      if (!template) throw new Error(`There's no template called "${init.canvas.template}".`);
      const View = template.View as React.ComponentType<{ data: unknown }>;
      element = <View data={init.canvas.data} />;
    }
    ReactDOMClient.createRoot(root).render(<Boundary onError={(e) => fail(e.message)}>{element}</Boundary>);
    await settle(root, init.scroll);
  } catch (e) {
    fail((e as Error)?.message ?? String(e));
    root.innerHTML = '';
    const pre = document.createElement('pre');
    pre.className = 'at-problem';
    pre.textContent = `This canvas didn't start:\n\n${failed}`;
    root.append(pre);
  }
  post({ type: 'shown', error: failed });
}

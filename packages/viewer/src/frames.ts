// The sealed frames a canvas runs in. A new version of a canvas boots in a
// hidden frame and replaces the one on screen once it has drawn, scrolled to
// where you were, so a reload doesn't flash or jump.
//
// Every message is checked against the frame it came from: a canvas can only
// talk to the viewer about itself.

import type { Theme } from '@atelier/themes';
import type { Session } from './types.ts';

type Message = { type?: unknown; id?: unknown; [key: string]: unknown };

export interface Init {
  canvas: { kind: 'module'; code: string } | { kind: 'template'; template: string; data: unknown };
  state: Record<string, unknown>;
  sessions: Session[];
  theme: Theme;
  scroll: [number, number];
}

type Reply = { ok: boolean; message?: string; [key: string]: unknown };
type ActionReply = { ok: boolean; message: string; session?: string; run?: string };

export interface FrameHandlers {
  setState(key: string, value: unknown): void;
  file(path: string): Promise<{ mime: string; bytes: ArrayBuffer }>;
  action(action: unknown): Promise<ActionReply>;
  scroll(x: number, y: number): void;
  error(message: string): void;
  shown(error: string | null): void;
  key(key: string): void;
}

let runtime: Promise<string> | null = null;

function loadRuntime() {
  runtime ??= fetch('/runtime.js', { cache: 'no-cache' }).then((res) => {
    if (!res.ok) {
      runtime = null;
      throw new Error("The canvas runtime didn't load.");
    }
    return res.text();
  });
  return runtime;
}

export class FrameHost {
  private container: HTMLElement;
  private handlers: FrameHandlers;
  private current: HTMLIFrameElement | null = null;
  private pending: HTMLIFrameElement | null = null;
  private inits = new WeakMap<HTMLIFrameElement, () => Init>();
  private timer = 0;

  constructor(container: HTMLElement, handlers: FrameHandlers) {
    this.container = container;
    this.handlers = handlers;
    addEventListener('message', this.listen);
  }

  destroy() {
    removeEventListener('message', this.listen);
    this.clear();
  }

  /** Boots a canvas in a new frame; `init` is read when the frame is ready, so it has the latest state. */
  show(init: () => Init) {
    this.pending?.remove();
    const frame = document.createElement('iframe');
    frame.setAttribute('sandbox', 'allow-scripts');
    frame.setAttribute('referrerpolicy', 'no-referrer');
    frame.title = 'Canvas';
    frame.className = this.current ? 'av-frame av-frame-waiting' : 'av-frame';
    this.inits.set(frame, init);
    frame.src = '/frame.html';
    this.pending = frame;
    this.container.append(frame);
    clearTimeout(this.timer);
    // A canvas that never says it has drawn is shown anyway, so it can say what's wrong.
    this.timer = window.setTimeout(() => frame === this.pending && this.promote(frame), 8000);
  }

  /** Sends the canvas on screen (and one on its way) news: state, sessions, the theme. */
  post(message: { type: string; [key: string]: unknown }) {
    for (const frame of [this.current, this.pending]) frame?.contentWindow?.postMessage(message, '*');
  }

  clear() {
    clearTimeout(this.timer);
    this.current?.remove();
    this.pending?.remove();
    this.current = this.pending = null;
  }

  focus() {
    this.current?.focus();
  }

  private promote(frame: HTMLIFrameElement) {
    if (frame !== this.pending) return;
    clearTimeout(this.timer);
    this.current?.remove();
    this.current = frame;
    this.pending = null;
    frame.classList.remove('av-frame-waiting');
  }

  private listen = (e: MessageEvent) => {
    const frame = [this.current, this.pending].find((f) => f && e.source === f.contentWindow);
    if (!frame || !e.data || typeof e.data !== 'object') return;
    const message = e.data as Message;
    const source = e.source as Window;
    const reply = (body: Reply, transfer: Transferable[] = []) => source.postMessage({ type: 'reply', id: message.id, ...body }, '*', transfer);
    const onScreen = frame === this.current;

    switch (message.type) {
      case 'ready': {
        const init = this.inits.get(frame);
        if (!init) return;
        this.inits.delete(frame);
        loadRuntime().then(
          (code) => source.postMessage({ type: 'boot', runtime: code, init: init() }, '*'),
          (failure: Error) => this.handlers.error(failure.message),
        );
        return;
      }
      case 'shown': {
        const wasPending = frame === this.pending;
        this.promote(frame);
        if (wasPending) this.handlers.shown(typeof message.error === 'string' ? message.error : null);
        return;
      }
      case 'error':
        return this.handlers.error(String(message.message ?? 'The canvas stopped with an error.').slice(0, 4000));
      case 'scroll':
        if (onScreen) this.handlers.scroll(Number(message.x) || 0, Number(message.y) || 0);
        return;
      case 'key':
        if (onScreen && typeof message.key === 'string') this.handlers.key(message.key);
        return;
      case 'set-state':
        if (typeof message.key === 'string' && message.key && message.key.length <= 200) this.handlers.setState(message.key, message.value);
        return;
      case 'file':
        if (typeof message.path !== 'string' || message.path.length > 4096) return reply({ ok: false, message: 'A file is asked for by its path.' });
        this.handlers.file(message.path).then(
          ({ mime, bytes }) => reply({ ok: true, mime, bytes }, [bytes]),
          (failure: Error) => reply({ ok: false, message: failure.message }),
        );
        return;
      case 'action':
        this.handlers.action(message.action).then(
          (result) => reply({ ...result }),
          (failure: Error) => reply({ ok: false, message: failure.message }),
        );
        return;
    }
  };
}

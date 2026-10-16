// The tree atelier-tui draws, read off the host document after React has
// rendered into it. Kit elements carry their props as JSON, the React nodes
// in their props as named slots, and the names of their handlers; HTML keeps
// the few attributes a terminal can use.

import { COMMENT, ELEMENT, TEXT, type HostDocument, type HostElement, type HostNode, type HostText } from './dom.ts';

export type Out = string | Element;

export interface Element {
  /** A kit component's name, a part of one (`Problem`), or an HTML tag. */
  t: string;
  id: number;
  p?: Record<string, unknown>;
  c?: Out[];
  s?: Record<string, Out[]>;
  /** The handlers it has, which `dispatch` calls by name. */
  h?: string[];
}

const ATTRIBUTES = ['class', 'title', 'href', 'src', 'alt', 'colspan', 'start', 'datetime', 'role'];
const MAX_DEPTH = 24;

/** Plain data from a prop: no functions, no React elements, nothing that isn't JSON. */
export function clean(value: unknown, depth = 0): unknown {
  if (value == null) return null;
  if (typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'function' || typeof value === 'symbol') return undefined;
  if (depth > MAX_DEPTH) return null;
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.toISOString() : null;
  if (Array.isArray(value)) return value.map((v) => clean(v, depth + 1) ?? null);
  if (typeof value === 'object') {
    if ('$$typeof' in (value as object)) return null;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const c = clean(v, depth + 1);
      if (c !== undefined) out[k] = c;
    }
    return out;
  }
  return null;
}

function reactProps(el: HostElement): Record<string, unknown> | null {
  for (const key of Object.keys(el)) if (key.startsWith('__reactProps$')) return (el as unknown as Record<string, Record<string, unknown>>)[key];
  return null;
}

export class Reader {
  /** The elements on screen by id, for handlers to find. */
  live = new Map<number, HostElement>();

  read(doc: HostDocument, root: HostElement): Out[] {
    this.live.clear();
    doc.dirty = false;
    return this.children(root);
  }

  private children(node: HostNode): Out[] {
    const out: Out[] = [];
    for (const child of node.childNodes) out.push(...this.node(child));
    return out;
  }

  private node(node: HostNode): Out[] {
    if (node.nodeType === TEXT) {
      const text = (node as HostText).nodeValue;
      return text ? [text] : [];
    }
    if (node.nodeType === COMMENT || node.nodeType !== ELEMENT) return [];
    const el = node as HostElement;
    this.live.set(el.id, el);
    if (el.tagName === 'at-slot') return this.children(el);
    if (el.tagName.startsWith('at-')) return [this.kit(el)];
    return [this.html(el)];
  }

  private kit(el: HostElement): Element {
    const out: Element = { t: el.tagName.slice(3), id: el.id };
    const props = (el.p ?? {}) as Record<string, unknown>;
    const p: Record<string, unknown> = {};
    const handlers: string[] = [];
    for (const [k, v] of Object.entries(props)) {
      if (typeof v === 'function') handlers.push(k);
      else {
        const c = clean(v);
        if (c !== undefined && c !== null) p[k] = c;
      }
    }
    if (Object.keys(p).length) out.p = p;
    if (handlers.length) out.h = handlers;
    const c: Out[] = [];
    for (const child of el.childNodes) {
      if (child.nodeType === ELEMENT && (child as HostElement).tagName === 'at-slot') {
        const slot = child as HostElement;
        this.live.set(slot.id, slot);
        const name = String((slot.p as { n?: string } | undefined)?.n ?? '');
        const content = this.children(slot);
        if (name && content.length) (out.s ??= {})[name] = content;
      } else c.push(...this.node(child));
    }
    if (c.length) out.c = c;
    return out;
  }

  private html(el: HostElement): Element {
    const out: Element = { t: el.tagName.toLowerCase(), id: el.id };
    const p: Record<string, unknown> = {};
    for (const name of ATTRIBUTES) {
      const v = el.getAttribute(name);
      if (v != null) p[name] = v;
    }
    const style: Record<string, string> = {};
    for (const [k, v] of Object.entries(el.style)) if (typeof v === 'string' || typeof v === 'number') style[k] = String(v);
    if (Object.keys(style).length) p.style = style;
    if (Object.keys(p).length) out.p = p;
    const props = reactProps(el);
    if (props && typeof props.onClick === 'function') out.h = ['click'];
    const c = this.children(el);
    if (c.length) out.c = c;
    return out;
  }
}

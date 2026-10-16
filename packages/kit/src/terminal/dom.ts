// A document for React DOM to render into, in the terminal's engine, which
// has no DOM of its own. It holds just what React DOM touches; the tree it
// ends up with is what atelier-tui draws (see tree.ts).

export const ELEMENT = 1;
export const TEXT = 3;
export const COMMENT = 8;
export const DOCUMENT = 9;

type Listener = (event: unknown) => void;

export class HostNode {
  nodeType: number;
  nodeName: string;
  parentNode: HostNode | null = null;
  childNodes: HostNode[] = [];
  ownerDocument: HostDocument;

  constructor(type: number, name: string, doc: HostDocument | null) {
    this.nodeType = type;
    this.nodeName = name;
    this.ownerDocument = doc ?? (this as unknown as HostDocument);
  }

  get parentElement(): HostNode | null {
    return this.parentNode?.nodeType === ELEMENT ? this.parentNode : null;
  }
  get firstChild() {
    return this.childNodes[0] ?? null;
  }
  get lastChild() {
    return this.childNodes[this.childNodes.length - 1] ?? null;
  }
  get nextSibling(): HostNode | null {
    const list = this.parentNode?.childNodes;
    return list ? (list[list.indexOf(this) + 1] ?? null) : null;
  }
  get previousSibling(): HostNode | null {
    const list = this.parentNode?.childNodes;
    return list ? (list[list.indexOf(this) - 1] ?? null) : null;
  }

  appendChild<T extends HostNode>(child: T): T {
    child.parentNode?.removeChild(child);
    child.parentNode = this;
    this.childNodes.push(child);
    this.ownerDocument.touch();
    return child;
  }

  insertBefore<T extends HostNode>(child: T, before: HostNode | null): T {
    if (!before) return this.appendChild(child);
    child.parentNode?.removeChild(child);
    const at = this.childNodes.indexOf(before);
    child.parentNode = this;
    this.childNodes.splice(at < 0 ? this.childNodes.length : at, 0, child);
    this.ownerDocument.touch();
    return child;
  }

  removeChild<T extends HostNode>(child: T): T {
    const at = this.childNodes.indexOf(child);
    if (at >= 0) this.childNodes.splice(at, 1);
    child.parentNode = null;
    this.ownerDocument.touch();
    return child;
  }

  append(...nodes: HostNode[]) {
    for (const n of nodes) this.appendChild(n);
  }

  contains(other: HostNode | null): boolean {
    for (let n = other; n; n = n.parentNode) if (n === this) return true;
    return false;
  }

  getRootNode(): HostNode {
    let n: HostNode = this;
    while (n.parentNode) n = n.parentNode;
    return n;
  }

  get textContent(): string {
    return this.childNodes.map((c) => c.textContent).join('');
  }
  set textContent(text: string) {
    for (const c of this.childNodes) c.parentNode = null;
    this.childNodes = [];
    if (text) this.appendChild(this.ownerDocument.createTextNode(String(text)));
    this.ownerDocument.touch();
  }
}

export class HostText extends HostNode {
  private value: string;
  constructor(text: string, doc: HostDocument) {
    super(TEXT, '#text', doc);
    this.value = text;
  }
  get nodeValue() {
    return this.value;
  }
  set nodeValue(text: string) {
    this.value = String(text);
    this.ownerDocument.touch();
  }
  get data() {
    return this.value;
  }
  set data(text: string) {
    this.nodeValue = text;
  }
  override get textContent() {
    return this.value;
  }
  override set textContent(text: string) {
    this.nodeValue = text;
  }
}

export class HostComment extends HostNode {
  nodeValue: string;
  constructor(text: string, doc: HostDocument) {
    super(COMMENT, '#comment', doc);
    this.nodeValue = text;
  }
  override get textContent() {
    return '';
  }
}

class Style {
  [name: string]: unknown;
  setProperty(name: string, value: string) {
    this[name] = value;
  }
  removeProperty(name: string) {
    delete this[name];
  }
  getPropertyValue(name: string) {
    return String(this[name] ?? '');
  }
}

export class HostElement extends HostNode {
  tagName: string;
  localName: string;
  namespaceURI: string;
  attributes = new Map<string, string>();
  style = new Style();
  listeners = new Map<string, Set<Listener>>();
  capture = new Set<Listener>();
  private props: unknown = undefined;
  id = 0;

  constructor(tag: string, doc: HostDocument, ns = 'http://www.w3.org/1999/xhtml') {
    super(ELEMENT, tag.toUpperCase(), doc);
    this.tagName = tag;
    this.localName = tag;
    this.namespaceURI = ns;
    this.id = doc.nextId();
  }

  /** A kit element's props, which the terminal kit sets as one property. */
  get p(): unknown {
    return this.props;
  }
  set p(value: unknown) {
    this.props = value;
    this.ownerDocument.touch();
  }

  setAttribute(name: string, value: unknown) {
    this.attributes.set(name, String(value));
    this.ownerDocument.touch();
  }
  setAttributeNS(_ns: string | null, name: string, value: unknown) {
    this.setAttribute(name, value);
  }
  getAttribute(name: string) {
    return this.attributes.get(name) ?? null;
  }
  hasAttribute(name: string) {
    return this.attributes.has(name);
  }
  removeAttribute(name: string) {
    this.attributes.delete(name);
    this.ownerDocument.touch();
  }
  removeAttributeNS(_ns: string | null, name: string) {
    this.removeAttribute(name);
  }

  addEventListener(type: string, listener: Listener, options?: boolean | { capture?: boolean }) {
    let set = this.listeners.get(type);
    if (!set) this.listeners.set(type, (set = new Set()));
    set.add(listener);
    if (options === true || (typeof options === 'object' && options?.capture)) this.capture.add(listener);
  }
  removeEventListener(type: string, listener: Listener) {
    this.listeners.get(type)?.delete(listener);
    this.capture.delete(listener);
  }
  dispatchEvent(event: { type: string }) {
    for (const listen of this.listeners.get(event.type) ?? []) listen(event);
    return true;
  }

  get children() {
    return this.childNodes.filter((c) => c.nodeType === ELEMENT);
  }
  get childElementCount() {
    return this.children.length;
  }
  get className() {
    return this.attributes.get('class') ?? '';
  }
  set className(value: string) {
    this.setAttribute('class', value);
  }
  get innerHTML() {
    return '';
  }
  set innerHTML(_html: string) {
    this.textContent = '';
  }
  focus() {
    this.ownerDocument.activeElement = this;
  }
  blur() {
    if (this.ownerDocument.activeElement === this) this.ownerDocument.activeElement = this.ownerDocument.body;
  }
}

export class HostDocument extends HostNode {
  documentElement: HostElement;
  head: HostElement;
  body: HostElement;
  activeElement: HostElement | null = null;
  defaultView: unknown = globalThis;
  private counter = 0;
  dirty = true;

  constructor() {
    super(DOCUMENT, '#document', null);
    this.documentElement = new HostElement('html', this);
    this.head = new HostElement('head', this);
    this.body = new HostElement('body', this);
    this.appendChild(this.documentElement);
    this.documentElement.append(this.head, this.body);
    this.activeElement = this.body;
  }

  nextId() {
    return ++this.counter;
  }
  touch() {
    this.dirty = true;
  }

  createElement(tag: string) {
    return new HostElement(tag, this);
  }
  createElementNS(ns: string, tag: string) {
    return new HostElement(tag, this, ns);
  }
  createTextNode(text: string) {
    return new HostText(String(text), this);
  }
  createComment(text: string) {
    return new HostComment(String(text), this);
  }
  getElementById() {
    return null;
  }
  addEventListener() {}
  removeEventListener() {}
}

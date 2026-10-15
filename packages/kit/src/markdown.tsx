// Markdown, rendered as React elements, never as HTML, so nothing in it can
// run. Headings, paragraphs, emphasis, code, links, images, lists (with
// tasks), quotes, tables and rules.

import { Fragment, type ReactNode } from 'react';
import { Code, Link } from './text.tsx';
import { Image } from './media.tsx';

const LIST = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;

export function Markdown({ children }: { children: string }) {
  return <div className="at-md">{blocks(String(children ?? '').replace(/\r\n?/g, '\n').split('\n'))}</div>;
}

function blocks(lines: string[]): ReactNode[] {
  const out: ReactNode[] = [];
  let i = 0;
  const key = () => out.length;
  while (i < lines.length) {
    const line = lines[i];
    const fence = /^\s*(```|~~~)\s*([\w+-]*)/.exec(line);
    if (fence) {
      const body: string[] = [];
      for (i++; i < lines.length && !lines[i].trim().startsWith(fence[1]); i++) body.push(lines[i]);
      i++;
      out.push(
        <Code key={key()} block lang={fence[2] || undefined}>
          {body.join('\n')}
        </Code>,
      );
    } else if (!line.trim()) {
      i++;
    } else if (/^#{1,6}\s/.test(line)) {
      const [, hashes, text] = /^(#{1,6})\s+(.*?)\s*#*$/.exec(line) ?? ['', '#', line];
      const Tag = (`h${Math.min(4, hashes.length)}` as 'h1');
      out.push(<Tag key={key()}>{inline(text)}</Tag>);
      i++;
    } else if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
      out.push(<hr key={key()} />);
      i++;
    } else if (/^\s*\|/.test(line) && i + 1 < lines.length && /^\s*\|?\s*:?-{3,}/.test(lines[i + 1])) {
      const rows: string[] = [];
      for (; i < lines.length && /^\s*\|/.test(lines[i]); i++) rows.push(lines[i]);
      out.push(table(rows, key()));
    } else if (LIST.test(line)) {
      const items: string[] = [];
      for (; i < lines.length && (LIST.test(lines[i]) || (/^\s{2,}\S/.test(lines[i]) && items.length)); i++) items.push(lines[i]);
      out.push(list(items, key()));
    } else if (/^\s*>/.test(line)) {
      const quote: string[] = [];
      for (; i < lines.length && /^\s*>/.test(lines[i]); i++) quote.push(lines[i].replace(/^\s*>\s?/, ''));
      out.push(<blockquote key={key()}>{blocks(quote)}</blockquote>);
    } else {
      const para: string[] = [];
      for (; i < lines.length && lines[i].trim() && !/^\s*(```|~~~|#{1,6}\s|>|\|)/.test(lines[i]) && !LIST.test(lines[i]); i++) para.push(lines[i].trim());
      out.push(
        <p key={key()}>
          {para.map((p, n) => (
            <Fragment key={n}>
              {n > 0 && (para[n - 1].endsWith('  ') ? <br /> : ' ')}
              {inline(p)}
            </Fragment>
          ))}
        </p>,
      );
    }
  }
  return out;
}

function list(lines: string[], k: number): ReactNode {
  type Item = { text: string; depth: number; children: Item[] };
  const root: Item = { text: '', depth: -1, children: [] };
  const stack = [root];
  for (const raw of lines) {
    const m = LIST.exec(raw);
    if (!m) {
      const last = stack[stack.length - 1];
      last.text += ` ${raw.trim()}`;
      continue;
    }
    const depth = Math.floor(m[1].replace(/\t/g, '  ').length / 2);
    const item: Item = { text: m[3], depth, children: [] };
    while (stack.length > 1 && stack[stack.length - 1].depth >= depth) stack.pop();
    stack[stack.length - 1].children.push(item);
    stack.push(item);
  }
  const ordered = /^\s*\d/.test(lines[0]);
  const render = (items: Item[], key: number | string): ReactNode => {
    const Tag = ordered ? 'ol' : 'ul';
    return (
      <Tag key={key}>
        {items.map((it, n) => {
          const task = /^\[( |x|X)\]\s+(.*)$/.exec(it.text);
          return (
            <li key={n} style={task ? { listStyle: 'none', marginLeft: -18 } : undefined}>
              {task ? (
                <>
                  <span className={task[1] === ' ' ? 'at-text-3' : 'at-t-success at-toned'}>{task[1] === ' ' ? '☐' : '☑'}</span> {inline(task[2])}
                </>
              ) : (
                inline(it.text)
              )}
              {it.children.length > 0 && render(it.children, `${key}-${n}`)}
            </li>
          );
        })}
      </Tag>
    );
  };
  return render(root.children, k);
}

function table(rows: string[], k: number): ReactNode {
  const cells = (r: string) => r.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
  const [head, rule, ...body] = rows.map(cells);
  const align = rule.map((c) => (c.endsWith(':') ? (c.startsWith(':') ? 'center' : 'right') : 'left'));
  return (
    <div key={k} className="at-table-wrap">
      <table className="at-table">
        <thead>
          <tr>
            {head.map((c, n) => (
              <th key={n} style={{ textAlign: align[n] as 'left' }}>
                {inline(c)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((r, n) => (
            <tr key={n}>
              {r.map((c, m) => (
                <td key={m} style={{ textAlign: align[m] as 'left' }}>
                  {inline(c)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const INLINE = /(`[^`]+`)|(!\[[^\]]*\]\([^)\s]+\))|(\[[^\]]+\]\([^)\s]+\))|(\*\*[^*]+\*\*|__[^_]+__)|(\*[^*\s][^*]*\*|_[^_\s][^_]*_)|(https?:\/\/[^\s<>()]+[^\s<>().,;:!?])/g;

/** Inline Markdown: code, images, links, bold, italics and bare web links. */
export function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let n = 0;
  for (const m of text.matchAll(INLINE)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const [whole, code, image, link, bold, italic, url] = m;
    const k = n++;
    if (code) out.push(<Code key={k}>{code.slice(1, -1)}</Code>);
    else if (image) {
      const [, alt, target] = /^!\[([^\]]*)\]\(([^)\s]+)\)$/.exec(image)!;
      out.push(/^https?:/.test(target) ? <Link key={k} href={target}>{alt || target}</Link> : <Image key={k} path={target} alt={alt} />);
    } else if (link) {
      const [, label, target] = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(link)!;
      const local = target.startsWith('/') || target.startsWith('~/') || target.startsWith('./') || target.startsWith('file://');
      const [path, line] = target.replace(/^file:\/\//, '').split(/#L|:(?=\d+$)/);
      out.push(
        local ? (
          <Link key={k} path={path} line={line ? Number(line) : undefined}>
            {inline(label)}
          </Link>
        ) : (
          <Link key={k} href={target}>
            {inline(label)}
          </Link>
        ),
      );
    } else if (bold) out.push(<strong key={k}>{inline(bold.slice(2, -2))}</strong>);
    else if (italic) out.push(<em key={k}>{inline(italic.slice(1, -1))}</em>);
    else if (url) out.push(<Link key={k} href={url}>{url}</Link>);
    else out.push(whole);
    last = m.index + whole.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

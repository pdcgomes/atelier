// `atelier check`: whether a canvas builds, type checks, follows the rules,
// and, for a template, matches its schema. Each problem has a place and a
// message, for the agent that wrote the canvas to fix.

import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { validate } from '../../kit/src/schema.ts';
import { schemas } from '../../../templates/schemas.ts';
import { themes } from '../../themes/src/index.ts';
import { CompileError, compile } from './compile.ts';
import { DIST, paths, writeJson } from './home.ts';

export interface Problem {
  file: string;
  line: number;
  column: number;
  message: string;
  /** Which check found it. */
  kind: 'compile' | 'types' | 'colour' | 'json' | 'template';
}

export interface Checked {
  ok: boolean;
  problems: Problem[];
}

const resolveFrom = (name: string) => createRequire(import.meta.url).resolve(name);

/** The native TypeScript compiler: the single binary's own, or found the way TypeScript's `tsc` finds it. */
async function tscPath(): Promise<string[]> {
  if (process.env.ATELIER_TSC) return [process.env.ATELIER_TSC];
  const pkg = dirname(resolveFrom('typescript/package.json'));
  try {
    const { default: getExePath } = await import(pathToFileURL(join(pkg, 'lib/getExePath.js')).href);
    return [getExePath()];
  } catch {
    return [process.execPath, join(pkg, 'bin/tsc')];
  }
}

function typesFor(name: string) {
  return process.env.ATELIER_TYPES ? join(process.env.ATELIER_TYPES, name) : dirname(resolveFrom(`${name}/package.json`));
}

/** Runs TypeScript over the canvas, against the kit's types and React's. */
async function typeCheck(file: string): Promise<Problem[]> {
  const kitTypes = join(DIST, 'types/packages/kit/src/index.d.ts');
  if (!existsSync(kitTypes)) return [];
  const react = typesFor('@types/react');
  const reactDom = typesFor('@types/react-dom');
  const dir = join(paths.cache, 'check', createHash('sha1').update(file).digest('hex').slice(0, 12));
  writeJson(join(dir, 'tsconfig.json'), {
    compilerOptions: {
      target: 'ES2022',
      module: 'ESNext',
      moduleResolution: 'bundler',
      jsx: 'react-jsx',
      strict: true,
      noEmit: true,
      skipLibCheck: true,
      allowImportingTsExtensions: true,
      resolveJsonModule: true,
      lib: ['ES2023', 'DOM', 'DOM.Iterable'],
      types: [],
      paths: {
        atelier: [kitTypes],
        'atelier/templates': [join(DIST, 'types/templates/index.d.ts')],
        '@atelier/themes': [join(DIST, 'types/packages/themes/src/index.d.ts')],
        react: [join(react, 'index.d.ts')],
        'react/jsx-runtime': [join(react, 'jsx-runtime.d.ts')],
        'react-dom': [join(reactDom, 'index.d.ts')],
        'react-dom/client': [join(reactDom, 'client.d.ts')],
      },
    },
    files: [file],
  });
  const [cmd, ...pre] = await tscPath();
  const { output, failed } = await new Promise<{ output: string; failed: boolean }>((done) => {
    execFile(cmd, [...pre, '-p', join(dir, 'tsconfig.json'), '--pretty', 'false'], { cwd: dir, timeout: 60_000, maxBuffer: 8 << 20, env: { PATH: process.env.PATH ?? '' } }, (e, stdout, stderr) =>
      done({ output: `${stdout}${stderr}`, failed: Boolean(e) }),
    );
  });
  const problems: Problem[] = [];
  for (const line of output.split('\n')) {
    const m = /^(.+?)\((\d+),(\d+)\): error TS\d+: (.*)$/.exec(line.trim());
    if (m) problems.push({ file: resolve(dir, m[1]), line: Number(m[2]), column: Number(m[3]), message: m[4], kind: 'types' });
    else if (problems.length && /^\s{2,}\S/.test(line)) problems[problems.length - 1].message += `\n${line.trimEnd()}`;
  }
  // TypeScript failing without saying where is the check not running, which mustn't pass for no problems.
  if (failed && !problems.length) {
    const why = output.trim().split('\n').slice(0, 3).join('\n') || `${cmd} didn't run`;
    problems.push({ file, line: 1, column: 1, message: `The type check couldn't run: ${why}`, kind: 'types' });
  }
  return problems;
}

/** The string literals in a module's source, with where each starts. */
export function strings(source: string): { value: string; line: number; column: number }[] {
  const out: { value: string; line: number; column: number }[] = [];
  let line = 1;
  let col = 1;
  let i = 0;
  const advance = (n = 1) => {
    for (let k = 0; k < n && i < source.length; k++, i++) {
      if (source[i] === '\n') (line++, (col = 1));
      else col++;
    }
  };
  while (i < source.length) {
    const c = source[i];
    const next = source[i + 1];
    if (c === '/' && next === '/') {
      while (i < source.length && source[i] !== '\n') advance();
    } else if (c === '/' && next === '*') {
      advance(2);
      while (i < source.length && !(source[i] === '*' && source[i + 1] === '/')) advance();
      advance(2);
    } else if (c === '"' || c === "'" || c === '`') {
      const [l, k] = [line, col];
      advance();
      let value = '';
      while (i < source.length && source[i] !== c) {
        if (source[i] === '\\') {
          value += source[i + 1] ?? '';
          advance(2);
        } else if (c === '`' && source[i] === '$' && source[i + 1] === '{') {
          // The code inside a template literal's ${} isn't part of the string.
          let depth = 0;
          do {
            if (source[i] === '{') depth++;
            if (source[i] === '}') depth--;
            advance();
          } while (i < source.length && depth > 0);
          value += '\u0000';
        } else if (c !== '`' && source[i] === '\n') {
          break;
        } else {
          value += source[i];
          advance();
        }
      }
      advance();
      out.push({ value, line: l, column: k });
    } else advance();
  }
  return out;
}

const WHOLE = /^\s*(#[0-9a-f]{6}([0-9a-f]{2})?|#(?=[0-9a-f]{0,3}[a-f])[0-9a-f]{3,4}|(rgb|rgba|hsl|hsla|oklch|oklab|lab|lch|hwb)\([^)]*\))\s*$/i;
const IN_CSS = /(^|[;{\s])(color|background(-color)?|border(-[a-z]+)?-color|border|fill|stroke|outline(-color)?|box-shadow|text-shadow)\s*:\s*[^;]*?(#[0-9a-f]{3,8}\b|(rgb|rgba|hsl|hsla|oklch)\()/i;

/** Colours written into the source, which should come from the theme instead. */
export function colourLiterals(file: string, source: string): Problem[] {
  return strings(source)
    .filter((s) => WHOLE.test(s.value) || IN_CSS.test(s.value))
    .map((s) => ({
      file,
      line: s.line,
      column: s.column,
      message: `"${s.value.trim().slice(0, 40)}" is a colour. Use the theme's instead: a tone prop (accent, success, warning, danger, info, muted) or a variable such as var(--accent) or var(--chart-2).`,
      kind: 'colour' as const,
    }));
}

function lineOf(text: string, key: string): number {
  const at = text.search(new RegExp(`"${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\s*:`));
  return at < 0 ? 1 : text.slice(0, at).split('\n').length;
}

function checkTemplate(file: string): Problem[] {
  const text = readFileSync(file, 'utf8');
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (e) {
    const at = /position (\d+)/.exec((e as Error).message);
    const before = at ? text.slice(0, Number(at[1])) : '';
    return [{ file, line: before.split('\n').length, column: before.length - before.lastIndexOf('\n'), message: (e as Error).message, kind: 'json' }];
  }
  const name = (data as { template?: unknown })?.template;
  if (typeof name !== 'string' || !schemas[name]) {
    return [{ file, line: 1, column: 1, message: `"template" has to name one of the templates: ${Object.keys(schemas).join(', ') || 'none yet'}.`, kind: 'template' }];
  }
  const theme = (data as { theme?: unknown }).theme;
  const themed = theme === undefined ? [] : themeProblems(file, text, theme);
  return [...themed, ...validate(schemas[name].schema, data).map((p) => ({ file, line: lineOf(text, p.path.split(/[.[]/).pop() ?? ''), column: 1, message: p.message, kind: 'template' as const }))];
}

/** A canvas's own theme, which has to be one Atelier has. */
function themeProblems(file: string, text: string, theme: unknown): Problem[] {
  if (typeof theme === 'string' && themes.some((t) => t.id === theme)) return [];
  return [{ file, line: lineOf(text, 'theme'), column: 1, message: `"theme" has to name one of the themes \`atelier themes\` lists, such as "cursor" or "tokyo-night", not ${JSON.stringify(theme)}.`, kind: 'template' }];
}

export async function check(file: string): Promise<Checked> {
  const path = resolve(file);
  if (!existsSync(path)) return { ok: false, problems: [{ file: path, line: 1, column: 1, message: "There's no such file.", kind: 'compile' }] };
  if (path.endsWith('.canvas.json')) {
    const problems = checkTemplate(path);
    return { ok: problems.length === 0, problems };
  }
  try {
    const built = await compile(path);
    const problems: Problem[] = [];
    for (const input of built.inputs) problems.push(...colourLiterals(input, readFileSync(input, 'utf8')));
    const source = readFileSync(path, 'utf8');
    const theme = metaTheme(source);
    if (theme !== undefined) problems.push(...themeProblems(path, source, theme));
    problems.push(...(await typeCheck(path)));
    return { ok: problems.length === 0, problems };
  } catch (e) {
    if (e instanceof CompileError) return { ok: false, problems: e.problems.map((p) => ({ ...p, kind: 'compile' as const })) };
    throw e;
  }
}

/** The theme a TSX canvas names in its `meta`, if it names one. */
export function metaTheme(source: string): string | undefined {
  return /export\s+const\s+meta\s*=\s*\{[^}]*?\btheme\s*:\s*(['"`])((?:(?!\1).)*)\1/s.exec(source)?.[2];
}

export function describe(problems: Problem[], from = process.cwd()): string {
  return problems.map((p) => `${p.file.startsWith(from) ? p.file.slice(from.length + 1) : p.file}:${p.line}:${p.column}: ${p.message}`).join('\n');
}

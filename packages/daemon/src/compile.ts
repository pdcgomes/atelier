// Compiles a TSX canvas into one ES module with esbuild. What it imports from
// the kit and React is read from what the frame's runtime has already loaded
// (packages/kit/src/runtime.tsx), so a canvas is small and loads at once.

import { build, type Message, type Plugin } from 'esbuild';
import { dirname, relative, resolve, sep } from 'node:path';

/** The modules a canvas may import, and the name the runtime gives each. */
export const PROVIDED = ['atelier', 'atelier/templates', 'react', 'react/jsx-runtime', 'react-dom', 'react-dom/client'];

export interface CompileProblem {
  file: string;
  line: number;
  column: number;
  message: string;
}

export interface Compiled {
  code: string;
  /** Every file the canvas is made of, so a change to any of them rebuilds it. */
  inputs: string[];
}

export class CompileError extends Error {
  readonly problems: CompileProblem[];
  constructor(problems: CompileProblem[]) {
    super(problems.map((p) => `${p.file}:${p.line}:${p.column}: ${p.message}`).join('\n'));
    this.problems = problems;
  }
}

function provided(): Plugin {
  return {
    name: 'atelier-provided',
    setup(b) {
      b.onResolve({ filter: /.*/ }, (args) => {
        if (args.kind === 'entry-point') return undefined;
        if (PROVIDED.includes(args.path)) return { path: args.path, namespace: 'atelier-provided' };
        if (args.path.startsWith('.')) {
          const target = resolve(args.resolveDir, args.path);
          const folder = (args.pluginData as { folder?: string } | undefined)?.folder ?? args.resolveDir;
          const root = b.initialOptions.absWorkingDir ?? folder;
          if (relative(root, target).startsWith('..') || target.split(sep).includes('node_modules')) {
            return { errors: [{ text: `A canvas can only import files beside it in its folder, not "${args.path}".` }] };
          }
          return undefined;
        }
        return { errors: [{ text: `A canvas can only import from "atelier", "react" and files beside it, not "${args.path}".` }] };
      });
      b.onLoad({ filter: /.*/, namespace: 'atelier-provided' }, (args) => ({
        contents: `module.exports = globalThis.__atelier[${JSON.stringify(args.path)}];`,
        loader: 'js',
      }));
    },
  };
}

function problems(messages: Message[], fallback: string): CompileProblem[] {
  return messages.map((m) => ({
    file: m.location?.file ? resolve(m.location.file) : fallback,
    line: m.location?.line ?? 1,
    column: (m.location?.column ?? 0) + 1,
    message: m.text,
  }));
}

/** Compiles the canvas at `file`. Throws a `CompileError` with each problem if it doesn't build. */
export async function compile(file: string): Promise<Compiled> {
  const folder = dirname(file);
  try {
    const result = await build({
      entryPoints: [file],
      absWorkingDir: folder,
      bundle: true,
      write: false,
      format: 'esm',
      platform: 'browser',
      target: 'es2022',
      jsx: 'automatic',
      loader: { '.tsx': 'tsx', '.ts': 'ts', '.jsx': 'jsx', '.js': 'js', '.json': 'json' },
      metafile: true,
      logLevel: 'silent',
      legalComments: 'none',
      plugins: [provided()],
    });
    const inputs = Object.keys(result.metafile.inputs)
      .filter((p) => !p.startsWith('atelier-provided:'))
      .map((p) => resolve(folder, p));
    return { code: result.outputFiles[0].text, inputs };
  } catch (e) {
    const failure = e as { errors?: Message[] };
    if (failure.errors) throw new CompileError(problems(failure.errors, file));
    throw e;
  }
}

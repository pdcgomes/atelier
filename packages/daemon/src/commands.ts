// The commands for agents and their hooks: new, templates, hook and mcp.

import { appendFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { schemas } from '../../../templates/schemas.ts';
import { check, describe, type Problem } from './check.ts';
import { connect, type Client } from './client.ts';
import { paths } from './home.ts';
import { FOLDER } from './library.ts';
import { eventsSince, readState, type StateEvent } from './state.ts';
import { VERSION } from './server.ts';

const CANVAS_FILE = /\.canvas\.(tsx|json)$/;
const pause = (ms: number) => new Promise((done) => setTimeout(done, ms));

/** The project a folder is in: the nearest folder above it with a .atelier or .git folder. */
export function projectRoot(from: string): string {
  for (let dir = resolve(from); ; dir = dirname(dir)) {
    if (existsSync(join(dir, FOLDER)) || existsSync(join(dir, '.git'))) return dir;
    if (dirname(dir) === dir) return resolve(from);
  }
}

function humanise(name: string) {
  const words = name.replace(/[-_]+/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

const STARTER = (title: string) => `import { Panel, Stack, Row, Stat, Text, useCanvasState } from "atelier";

export const meta = { title: ${JSON.stringify(title)} };

export default function Canvas() {
  const [count, setCount] = useCanvasState("count", 0);
  return (
    <Stack>
      <Panel title=${JSON.stringify(title)} info="a new canvas">
        <Row>
          <Stat label="Clicks" value={count} tone="accent" />
        </Row>
        <Text tone="secondary">Edit .atelier/ to change this canvas; it reloads as you save.</Text>
        <button className="at-button" onClick={() => setCount(count + 1)}>Click</button>
      </Panel>
    </Stack>
  );
}
`;

async function newCanvas(args: string[]) {
  const [kind, name] = args.filter((a) => !a.startsWith('--'));
  if (!kind || !name) throw new Error('Say which template and what to call it: atelier new workstream plan (or atelier new custom <name>). `atelier templates` lists them.');
  if (!/^[a-z0-9][a-z0-9_-]*$/i.test(name)) throw new Error('A canvas name is letters, digits, dashes and underscores, like release-plan.');
  if (kind !== 'custom' && !schemas[kind]) throw new Error(`There's no template called "${kind}". \`atelier templates\` lists them.`);
  const folder = join(projectRoot(process.cwd()), FOLDER);
  const file = join(folder, kind === 'custom' ? `${name}.canvas.tsx` : `${name}.canvas.json`);
  if (existsSync(file) && !args.includes('--force')) throw new Error(`${relative(process.cwd(), file)} is already there. Add --force to start it again.`);
  mkdirSync(folder, { recursive: true });
  const title = humanise(name);
  if (kind === 'custom') writeFileSync(file, STARTER(title));
  else writeFileSync(file, `${JSON.stringify({ ...schemas[kind].example, template: kind, title }, null, 2)}\n`);
  console.log(`Started ${relative(process.cwd(), file) || file}.`);
  if (args.includes('--no-open')) return;
  const client = await connect();
  const opened = await client!.call<{ shown: boolean; opened: boolean; url: string }>('POST', '/api/open', { path: file });
  console.log(opened.shown ? (opened.opened ? 'Opened in your browser.' : 'Shown in the viewer.') : `Open ${opened.url}`);
}

function listTemplates() {
  const names = Object.keys(schemas);
  const width = Math.max(8, ...names.map((n) => n.length)) + 2;
  for (const name of names) console.log(`${name.padEnd(width)}${schemas[name].description}`);
  console.log(`${'custom'.padEnd(width)}Anything else: a TSX canvas of your own, made from the kit.`);
}

// Hooks

async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) return '';
  let text = '';
  for await (const chunk of process.stdin) text += chunk;
  return text;
}

function hookLog(message: string) {
  try {
    appendFileSync(join(dirname(paths.log), 'hook.log'), `${new Date().toISOString()} ${message}\n`);
  } catch {}
}

/** Whether a path is a canvas, or a file beside one that only the viewer may write. */
function atelierFile(path: string): 'canvas' | 'viewer-only' | null {
  if (!path.includes(`/${FOLDER}/`)) return null;
  if (CANVAS_FILE.test(path)) return 'canvas';
  if (/\.(state\.json|events\.jsonl)$/.test(path)) return 'viewer-only';
  return null;
}

function canvasesIn(project: string): string[] {
  const folder = join(project, FOLDER);
  if (!existsSync(folder)) return [];
  return readdirSync(folder).filter((n) => CANVAS_FILE.test(n)).sort();
}

type HookOutput = Record<string, unknown> | null;

/**
 * What a hook does, for each event. SessionStart starts the daemon and tells
 * the agent what canvases there are; PostToolUse checks a canvas the agent
 * wrote; Stop hands over messages left for the session. Nothing here may
 * stop Claude Code from working, so every failure is quiet.
 */
export async function runHook(event: string, input: Record<string, unknown>, client: Client | null): Promise<HookOutput> {
  const cwd = typeof input.cwd === 'string' ? input.cwd : process.cwd();
  let news: string[] = [];
  if (client) {
    const answer = await client.call<{ messages: string[]; news?: string[] }>('POST', '/api/hook', { event, input });
    const messages = answer.messages;
    news = answer.news ?? [];
    if (event === 'Stop' && (messages.length || news.length)) {
      const parts: string[] = [];
      if (messages.length) parts.push(`These messages came for you from an Atelier canvas:\n\n${messages.map((m, i) => `${i + 1}. ${m}`).join('\n\n')}`);
      if (news.length) parts.push(`The user did this on your canvases:\n${news.map((n) => `- ${n}`).join('\n')}`);
      // As context rather than a block, the turn carries on with it beside what other hooks hand over, such as haunt's.
      return {
        hookSpecificOutput: {
          hookEventName: 'Stop',
          additionalContext: `While you were working:\n\n${parts.join('\n\n')}\n\nCarry on with them, and bring the canvases up to date.`,
        },
      };
    }
  }
  const caughtUp = news.length
    ? `Since you last heard, the user did this on your Atelier canvases:\n${news.map((n) => `- ${n}`).join('\n')}\nFold it into the canvases, and act on anything it asks of you.`
    : '';
  if (event === 'UserPromptSubmit' && caughtUp) {
    return { hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: caughtUp } };
  }
  if (event === 'SessionStart') {
    const names = canvasesIn(projectRoot(cwd));
    if (!names.length && !caughtUp) return null;
    const known = names.length
      ? `This project has Atelier canvases in ${FOLDER}/: ${names.join(', ')}. What the user has done on them (marks, approvals, answers) is in each canvas's .state.json; read it with the canvas_state tool or \`atelier state\`.`
      : '';
    return { hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: [known, caughtUp].filter(Boolean).join('\n\n') } };
  }
  if (event === 'PostToolUse') {
    const toolInput = (input.tool_input ?? {}) as Record<string, unknown>;
    const file = typeof toolInput.file_path === 'string' ? resolve(cwd, toolInput.file_path) : null;
    const kind = file && atelierFile(file);
    if (!file || !kind) return null;
    if (kind === 'viewer-only') {
      return {
        decision: 'block',
        reason: `${relative(cwd, file)} is written only by the Atelier viewer, from what the user does on the canvas. Put back what was there, and change the canvas file instead. To read the user's answers, use canvas_state.`,
      };
    }
    if (!existsSync(file)) return null;
    const result = client ? await client.call<{ ok: boolean; problems: Problem[]; shown: { shown: boolean } | null }>('POST', '/api/check', { path: file, show: true }) : await check(file);
    if (!result.ok) {
      return {
        decision: 'block',
        reason: `atelier check found problems in ${relative(cwd, file)}:\n\n${describe(result.problems, cwd)}\n\nFix them; the viewer shows the canvas as soon as it builds.`,
      };
    }
    const shown = 'shown' in result && result.shown?.shown;
    return {
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext: `Atelier checked ${relative(cwd, file)}: no problems. ${shown ? "It's on screen in the viewer." : 'The user can see it with `atelier open`.'}`,
      },
    };
  }
  return null;
}

async function hook(args: string[]) {
  let output: HookOutput = null;
  try {
    const text = await readStdin();
    const input = (text.trim() ? JSON.parse(text) : {}) as Record<string, unknown>;
    const event = args[0] ?? String(input.hook_event_name ?? '');
    if (!event) throw new Error('A hook says which event it is: atelier hook <event>.');
    const start = event === 'SessionStart' || event === 'PostToolUse';
    const client = process.env.ATELIER_NO_DAEMON ? null : await connect({ start }).catch((e: Error) => (hookLog(`${event}: ${e.message}`), null));
    output = await runHook(event, input, client);
  } catch (e) {
    hookLog(`hook ${args[0] ?? ''}: ${(e as Error).message}`);
  }
  if (output) process.stdout.write(`${JSON.stringify(output)}\n`);
}

// MCP: newline-delimited JSON-RPC over standard input and output.

const TOOLS = [
  {
    name: 'canvas_open',
    description: 'Shows an Atelier canvas to the user: in the viewer if it is open, otherwise in their browser. Leave out path to open the viewer on every canvas.',
    inputSchema: { type: 'object', properties: { path: { type: 'string', description: 'The canvas file, like .atelier/release.canvas.tsx or .atelier/plan.canvas.json.' } } },
  },
  {
    name: 'canvas_check',
    description: "Builds and checks a canvas: compile errors, type errors against the kit, colour literals, and a template's data against its schema. Returns each problem with its line.",
    inputSchema: { type: 'object', properties: { path: { type: 'string', description: 'The canvas file.' } }, required: ['path'] },
  },
  {
    name: 'canvas_state',
    description: "What the user has done on a canvas: its state (marks, approvals, form answers, the tab they're on) and the changes since a time.",
    inputSchema: {
      type: 'object',
      properties: { path: { type: 'string', description: 'The canvas file.' }, since: { type: 'string', description: 'Only changes after this time, in ISO 8601.' } },
      required: ['path'],
    },
  },
  {
    name: 'canvas_list',
    description: 'Lists the canvases in this project, or in every project Atelier knows.',
    inputSchema: { type: 'object', properties: { all: { type: 'boolean', description: 'Every project, not just this one.' } } },
  },
  {
    name: 'canvas_wait',
    description:
      'Waits for the user to answer on a canvas: submit a form, approve or hold, mark a Needs you item. Returns what they did, or says it timed out. Use it after showing a canvas that asks the user something, then carry on with the answer.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'The canvas file.' },
        keys: {
          type: 'array',
          items: { type: 'string' },
          description: 'State keys, or the starts of keys, to wait for: "form:brief", "approval:", "needsYou". Leave out for any answer (not tabs, drafts or sorting).',
        },
        since: { type: 'string', description: 'Count answers after this ISO 8601 time. Leave out to wait for the next one.' },
        timeout_seconds: { type: 'number', description: 'How long to wait, up to 3600. 600 if left out.' },
      },
      required: ['path'],
    },
  },
];

type ToolResult = { content: { type: 'text'; text: string }[]; isError?: boolean };
const text = (t: string, isError = false): ToolResult => ({ content: [{ type: 'text', text: t }], ...(isError ? { isError: true } : {}) });

function summarise(events: StateEvent[]) {
  return events.map((e) => `${e.at}  ${e.key} = ${JSON.stringify(e.value)}`).join('\n');
}

export async function callTool(name: string, args: Record<string, unknown>, base: string, signal?: AbortSignal): Promise<ToolResult> {
  const file = typeof args.path === 'string' ? resolve(base, args.path) : undefined;
  const needFile = () => {
    if (!file) throw new Error('Say which canvas: its path, like .atelier/release.canvas.tsx.');
    if (!CANVAS_FILE.test(file)) throw new Error(`${file} isn't a canvas: canvases are named <name>.canvas.tsx or <name>.canvas.json, in a project's ${FOLDER} folder.`);
    return file;
  };
  switch (name) {
    case 'canvas_open': {
      const client = await connect();
      const r = await client!.call<{ shown: boolean; opened: boolean; url: string }>('POST', '/api/open', file ? { path: needFile() } : {});
      return text(r.shown ? (r.opened ? 'Opened in the browser.' : 'Shown in the viewer.') : 'The viewer is not open, and opening the browser is turned off. The user can run `atelier open`.');
    }
    case 'canvas_check': {
      const r = await check(needFile());
      return r.ok ? text('No problems.') : text(describe(r.problems, base), true);
    }
    case 'canvas_state': {
      const f = needFile();
      const since = typeof args.since === 'string' ? args.since : undefined;
      const events = eventsSince(f, since);
      return text(`State:\n${JSON.stringify(readState(f), null, 2)}\n\n${since ? `Changes since ${since}` : 'Changes'}:\n${summarise(events) || 'none'}`);
    }
    case 'canvas_list': {
      const client = await connect({ start: false });
      const here = projectRoot(base);
      if (!client) {
        const names = canvasesIn(here);
        return text(names.length ? names.map((n) => join(here, FOLDER, n)).join('\n') : `No canvases in ${here}.`);
      }
      const { canvases } = await client.call<{ canvases: { path: string; title: string; kind: string; template?: string; project: string }[] }>('GET', '/api/canvases');
      const shown = args.all ? canvases : canvases.filter((c) => c.project === here);
      return text(shown.map((c) => `${c.title}  (${c.template ?? 'custom'})  ${c.path}`).join('\n') || `No canvases in ${here}.`);
    }
    case 'canvas_wait': {
      const f = needFile();
      const client = await connect();
      const { canvas } = await client!.call<{ canvas: { id: string } }>('POST', '/api/open', { path: f, show: false });
      const keys = Array.isArray(args.keys) ? args.keys.filter((k): k is string => typeof k === 'string') : [];
      const since = typeof args.since === 'string' ? args.since : new Date().toISOString();
      const limit = Math.min(3600, Math.max(1, Number(args.timeout_seconds ?? 600))) * 1000;
      const end = Date.now() + limit;
      // In short waits, as fetch gives up on an answer after five minutes.
      while (Date.now() < end && !signal?.aborted) {
        const seconds = Math.max(1, Math.min(240, Math.ceil((end - Date.now()) / 1000)));
        const q = new URLSearchParams({ id: canvas.id, since, timeout: String(seconds) });
        if (keys.length) q.set('keys', keys.join(','));
        const r = await client!.call<{ events: StateEvent[]; state: Record<string, unknown>; timedOut: boolean }>('GET', `/api/wait?${q}`);
        if (!r.timedOut) return text(`The user answered:\n${summarise(r.events)}\n\nThe canvas's state now:\n${JSON.stringify(r.state, null, 2)}`);
      }
      return text(signal?.aborted ? 'Stopped waiting.' : `No answer in ${Math.round(limit / 1000)} seconds. The canvas is still there; wait again, or carry on and read its state later.`);
    }
  }
  return text(`There's no tool called ${name}.`, true);
}

const PROTOCOLS = ['2025-06-18', '2025-03-26', '2024-11-05'];

async function mcp() {
  const base = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
  const running = new Map<string | number, AbortController>();
  const send = (message: unknown) => process.stdout.write(`${JSON.stringify(message)}\n`);
  const answer = async (msg: { id?: string | number; method?: string; params?: Record<string, unknown> }) => {
    const { id, method, params = {} } = msg;
    const reply = (result: unknown) => id !== undefined && send({ jsonrpc: '2.0', id, result });
    const fail = (code: number, message: string) => id !== undefined && send({ jsonrpc: '2.0', id, error: { code, message } });
    switch (method) {
      case 'initialize': {
        const asked = String(params.protocolVersion ?? '');
        return reply({
          protocolVersion: PROTOCOLS.includes(asked) ? asked : PROTOCOLS[0],
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: 'atelier', version: VERSION },
          instructions: 'Atelier shows canvases to the user, live, and tells you what they do on them. Write canvases in the project\'s .atelier folder (the canvas skill says how), then canvas_open to show one and canvas_wait to wait for an answer.',
        });
      }
      case 'ping':
        return reply({});
      case 'tools/list':
        return reply({ tools: TOOLS });
      case 'tools/call': {
        const controller = new AbortController();
        if (id !== undefined) running.set(id, controller);
        try {
          reply(await callTool(String(params.name), (params.arguments ?? {}) as Record<string, unknown>, base, controller.signal));
        } catch (e) {
          reply(text((e as Error).message, true));
        } finally {
          if (id !== undefined) running.delete(id);
        }
        return;
      }
      case 'notifications/cancelled':
        running.get((params as { requestId: string | number }).requestId)?.abort();
        return;
      default:
        if (method?.startsWith('notifications/')) return;
        return fail(-32601, `There's no method ${method}.`);
    }
  };
  let buffer = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk: string) => {
    buffer += chunk;
    let i;
    while ((i = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, i).trim();
      buffer = buffer.slice(i + 1);
      if (!line) continue;
      let msg;
      try {
        msg = JSON.parse(line);
      } catch {
        send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: "That isn't JSON." } });
        continue;
      }
      answer(msg).catch((e: Error) => process.stderr.write(`atelier mcp: ${e.message}\n`));
    }
  });
  await new Promise<void>((done) => process.stdin.on('end', () => done()));
  // Let answers on their way finish, then go.
  for (let i = 0; i < 50 && running.size; i++) await pause(100);
  process.exit(0);
}

export const commands: Record<string, (args: string[]) => Promise<void>> = {
  new: newCanvas,
  templates: async () => listTemplates(),
  hook,
  mcp,
};

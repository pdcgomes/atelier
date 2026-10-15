#!/usr/bin/env node
// A stand-in for Claude Code in the tests. It records how it was run in
// $ATELIER_STUB_LOG and, with -p, answers in stream-json the way Claude Code
// does. A prompt with FAIL in it fails; one with SLOW takes its time.

import { appendFileSync } from 'node:fs';

const args = process.argv.slice(2);
const print = args.includes('-p');
let stdin = '';
if (print) for await (const chunk of process.stdin) stdin += chunk;
const after = (flag) => (args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined);
const session = after('--session-id') ?? after('--resume') ?? 'none';
appendFileSync(process.env.ATELIER_STUB_LOG, `${JSON.stringify({ args, cwd: process.cwd(), stdin, run: process.env.ATELIER_RUN ?? null })}\n`);
if (!print) process.exit(0);

const say = (msg) => process.stdout.write(`${JSON.stringify({ session_id: session, ...msg })}\n`);
say({ type: 'system', subtype: 'init', cwd: process.cwd(), model: 'stub' });
say({ type: 'assistant', message: { content: [{ type: 'text', text: `Working on: ${stdin}` }] } });
say({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Read', input: { file_path: 'README.md' } }] } });
if (stdin.includes('SLOW')) await new Promise((done) => setTimeout(done, 20_000));
if (stdin.includes('FAIL')) {
  process.stderr.write('Something went wrong in the stub.\n');
  process.exit(3);
}
say({ type: 'result', subtype: 'success', is_error: false, result: `Done: ${stdin}`, total_cost_usd: 0.01 });

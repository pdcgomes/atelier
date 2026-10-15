// The Claude Code plugin: its files are what Claude Code expects, the
// skill's examples pass the check it describes, and its reference covers
// the whole kit.

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';

const repo = new URL('../../../', import.meta.url).pathname;
const plugin = join(repo, 'plugin/claude-code');
const root = realpathSync(mkdtempSync(join(tmpdir(), 'atelier-plugin-')));
process.env.ATELIER_HOME = join(root, 'home');
const { check, describe } = await import('../src/check.ts');
after(() => rmSync(root, { recursive: true, force: true }));

const json = (path) => JSON.parse(readFileSync(join(plugin, path), 'utf8'));

test("the plugin's manifest, hooks and MCP server are where Claude Code looks", () => {
  const manifest = json('.claude-plugin/plugin.json');
  assert.equal(manifest.name, 'atelier');
  assert.equal(manifest.version, JSON.parse(readFileSync(join(repo, 'packages/daemon/package.json'), 'utf8')).version);
  const { hooks } = json('hooks/hooks.json');
  assert.deepEqual(Object.keys(hooks).sort(), ['Notification', 'PostToolUse', 'SessionEnd', 'SessionStart', 'Stop', 'UserPromptSubmit']);
  for (const [event, entries] of Object.entries(hooks)) {
    for (const entry of entries) for (const h of entry.hooks) assert.equal(h.command, `"\${CLAUDE_PLUGIN_ROOT}/bin/atelier" hook ${event}`);
  }
  assert.equal(hooks.PostToolUse[0].matcher, 'Write|Edit|MultiEdit');
  assert.deepEqual(json('.mcp.json').mcpServers.atelier, { command: '${CLAUDE_PLUGIN_ROOT}/bin/atelier', args: ['mcp'] });
  assert.ok(statSync(join(plugin, 'bin/atelier')).mode & 0o111, 'the launcher can be run');
});

test('the launcher runs the command it is pointed at', () => {
  const out = execFileSync(join(plugin, 'bin/atelier'), ['--version'], { env: { ...process.env, ATELIER_BIN: join(repo, 'packages/daemon/bin/atelier.mjs') }, encoding: 'utf8' });
  assert.equal(out.trim(), '0.1.0');
});

test("the skill's examples pass the check", async () => {
  const skill = readFileSync(join(plugin, 'skills/canvas/SKILL.md'), 'utf8');
  assert.match(skill, /^---\nname: canvas\ndescription: .+\n---\n/);
  const blocks = [...skill.matchAll(/```tsx\n([^]*?)```/g)].map((m) => m[1]);
  assert.ok(blocks.length > 0);
  const folder = join(root, 'project/.atelier');
  mkdirSync(folder, { recursive: true });
  for (const [i, code] of blocks.entries()) {
    const file = join(folder, `example-${i}.canvas.tsx`);
    writeFileSync(file, code);
    const result = await check(file);
    assert.equal(result.ok, true, describe(result.problems));
  }
});

test('the reference declares everything the kit exports', () => {
  const reference = readFileSync(join(plugin, 'skills/canvas/reference/atelier.d.ts'), 'utf8');
  const index = readFileSync(join(repo, 'packages/kit/src/index.ts'), 'utf8');
  const names = [...index.matchAll(/^export (type )?\{([^}]+)\} from '\.\/[^']+'/gm)].flatMap((m) => m[2].split(',').map((n) => n.trim().split(/\s+as\s+/).pop()));
  assert.ok(names.length > 60);
  for (const name of names) assert.match(reference, new RegExp(`(function|interface|type|const) ${name}\\b`), `${name} is missing`);
});

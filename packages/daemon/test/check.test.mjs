import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';

const root = realpathSync(mkdtempSync(join(tmpdir(), 'atelier-check-')));
process.env.ATELIER_HOME = join(root, 'home');
const { check } = await import('../src/check.ts');
const cli = new URL('../src/cli.ts', import.meta.url).pathname;
after(() => rmSync(root, { recursive: true, force: true }));

const folder = join(root, 'project/.atelier');
mkdirSync(folder, { recursive: true });
const canvas = (name, text) => {
  const file = join(folder, `${name}.canvas.tsx`);
  writeFileSync(file, text);
  return file;
};

test('a good canvas passes', async () => {
  const file = canvas(
    'good',
    `import { Panel, Stat, useCanvasState, BarChart } from "atelier";
import { useMemo } from "react";
export default function Good() {
  const [count, setCount] = useCanvasState("count", 0);
  const data = useMemo(() => [{ label: "a", value: count }], [count]);
  return <Panel title="Good" info={<button onClick={() => setCount(count + 1)}>add</button>}>
    <Stat label="Count" value={count} tone="success" />
    <BarChart title="Counts" categories={data.map((d) => d.label)} series={[{ name: "count", values: data.map((d) => d.value) }]} />
  </Panel>;
}
`,
  );
  const result = await check(file);
  assert.deepEqual(result.problems, []);
  assert.equal(result.ok, true);
});

test('a syntax error is a compile problem, with its line', async () => {
  const result = await check(canvas('syntax', 'export default function S() {\n  const x = ;\n  return <div>{x}</div>;\n}\n'));
  assert.equal(result.ok, false);
  assert.equal(result.problems[0].kind, 'compile');
  assert.equal(result.problems[0].line, 2);
});

test("an import the canvas can't have is a compile problem", async () => {
  const result = await check(canvas('imports', 'import fs from "node:fs";\nexport default () => <div>{String(fs)}</div>;\n'));
  assert.equal(result.problems[0].kind, 'compile');
  assert.match(result.problems[0].message, /atelier/);
});

test("a prop the kit hasn't got is a type problem", async () => {
  const result = await check(
    canvas('types', 'import { Stat } from "atelier";\nexport default function T() {\n  return <Stat label="x" value={1} tone="purple" />;\n}\n'),
  );
  assert.equal(result.ok, false);
  const types = result.problems.filter((p) => p.kind === 'types');
  assert.equal(types.length, 1);
  assert.equal(types[0].line, 3);
  assert.match(types[0].message, /purple/);
  assert.equal(types[0].file, join(folder, 'types.canvas.tsx'));
});

test("colours come from the theme, so a hex in a canvas is a problem", async () => {
  const result = await check(
    canvas('colour', 'export default function C() {\n  return <div style={{ color: "#ff0066", background: "var(--panel)" }}>hi</div>;\n}\n'),
  );
  assert.deepEqual(result.problems.map((p) => [p.kind, p.line]), [['colour', 2]]);
});

test('a template canvas has to name a template', async () => {
  const bad = join(folder, 'bad.canvas.json');
  writeFileSync(bad, '{\n  "title": "x",\n}\n');
  assert.equal((await check(bad)).problems[0].kind, 'json');
  const unknown = join(folder, 'unknown.canvas.json');
  writeFileSync(unknown, '{"template": "nope"}');
  assert.equal((await check(unknown)).problems[0].kind, 'template');
});

test("a type check that can't run is a problem, not a pass", () => {
  const file = canvas('unchecked', 'export default function U() {\n  return <div />;\n}\n');
  let out = '';
  let status = 0;
  try {
    execFileSync(process.execPath, [cli, 'check', file], { env: { ...process.env, ATELIER_TSC: '/usr/bin/false' }, encoding: 'utf8' });
  } catch (e) {
    status = e.status;
    out = e.stdout;
  }
  assert.equal(status, 1);
  assert.match(out, /The type check couldn't run/);
});

test('atelier check prints the problems and fails', () => {
  const file = canvas('cli', 'export default function C() {\n  return <div style={{ color: "rgb(1, 2, 3)" }} />;\n}\n');
  let out = '';
  let status = 0;
  try {
    execFileSync(process.execPath, [cli, 'check', file], { env: process.env, cwd: join(root, 'project'), encoding: 'utf8' });
  } catch (e) {
    status = e.status;
    out = e.stdout;
  }
  assert.equal(status, 1);
  assert.match(out, /^\.atelier\/cli\.canvas\.tsx:2:\d+: /m);
  const good = execFileSync(process.execPath, [cli, 'check', join(folder, 'good.canvas.tsx')], { env: process.env, encoding: 'utf8' });
  assert.match(good, /good\.canvas\.tsx/);
});

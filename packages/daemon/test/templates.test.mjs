// The templates: each has its schema, view, example and README, its example
// passes the check, and a custom canvas can use its view.

import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';

const repo = new URL('../../../', import.meta.url).pathname;
const root = realpathSync(mkdtempSync(join(tmpdir(), 'atelier-templates-')));
process.env.ATELIER_HOME = join(root, 'home');
const { check, describe } = await import('../src/check.ts');
const { schemas } = await import('../../../templates/schemas.ts');
const { validate } = await import('../../kit/src/schema.ts');
after(() => rmSync(root, { recursive: true, force: true }));
const folder = join(root, 'project/.atelier');
mkdirSync(folder, { recursive: true });

const NAMES = ['workstream', 'studio', 'room', 'board', 'checklist', 'review', 'compare', 'report'];

test('every template has its schema, view, example and README', () => {
  assert.deepEqual(Object.keys(schemas), NAMES);
  for (const name of NAMES) {
    for (const file of ['schema.ts', 'view.tsx', 'example.json', 'README.md']) assert.ok(existsSync(join(repo, 'templates', name, file)), `${name}/${file}`);
    assert.match(readFileSync(join(repo, 'templates', name, 'README.md'), 'utf8'), new RegExp(`atelier new ${name} `));
  }
  const folders = readdirSync(join(repo, 'templates'), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  assert.deepEqual(folders.sort(), [...NAMES].sort(), 'no template folder left out of the registry');
});

test("every example passes its schema and the check", async () => {
  for (const name of NAMES) {
    const example = JSON.parse(readFileSync(join(repo, 'templates', name, 'example.json'), 'utf8'));
    assert.equal(example.template, name);
    assert.deepEqual(validate(schemas[name].schema, example), [], name);
    const file = join(folder, `${name}.canvas.json`);
    writeFileSync(file, JSON.stringify(example));
    const result = await check(file);
    assert.equal(result.ok, true, describe(result.problems));
  }
});

test("a template's problems say where they are", async () => {
  const file = join(folder, 'bad.canvas.json');
  writeFileSync(file, JSON.stringify({ template: 'workstream', title: 'x', goal: 'y', status: '', plan: [{ id: 'a', step: 'b', status: 'finished' }] }, null, 2));
  const result = await check(file);
  assert.equal(result.ok, false);
  assert.match(result.problems[0].message, /plan\[0\]\.status should be one of .*"done"/);
  assert.equal(result.problems[0].kind, 'template');
});

test("a custom canvas can use a template's view, and is checked against its data", async () => {
  const good = join(folder, 'mine.canvas.tsx');
  writeFileSync(
    good,
    `import { Stack, Panel, Text } from "atelier";
import { Workstream, type WorkstreamData } from "atelier/templates";
const data: WorkstreamData = { title: "Mine", goal: "A goal", status: "Going" };
export default function Mine() {
  return <Stack><Workstream data={data} /><Panel title="More"><Text>Added below it.</Text></Panel></Stack>;
}
`,
  );
  const ok = await check(good);
  assert.equal(ok.ok, true, describe(ok.problems));
  const bad = join(folder, 'wrong.canvas.tsx');
  writeFileSync(bad, 'import { Workstream } from "atelier/templates";\nexport default () => <Workstream data={{ title: 1 }} />;\n');
  const wrong = await check(bad);
  assert.equal(wrong.ok, false);
  assert.equal(wrong.problems[0].kind, 'types');
});

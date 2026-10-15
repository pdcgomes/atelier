// Every component in the kit, for the gallery's screenshots in each theme
// (scripts/gallery.mjs). The images are the gallery harness's own.

import {
  Badge,
  Calendar,
  Code,
  DiffView,
  Divider,
  Gallery,
  Grid,
  Heading,
  Image,
  KeyValue,
  Kbd,
  Lanes,
  Link,
  Markdown,
  Meter,
  Panel,
  Row,
  Section,
  Split,
  Stack,
  Stat,
  Stats,
  Table,
  Tabs,
  Text,
  Time,
  Timeline,
  Tree,
} from 'atelier';

export const meta = { title: 'The kit' };

const HOUR = 3600_000;
const now = Date.now();

const rows = [
  { id: 'LIB-01', task: 'Scan the library on launch', owner: 'Engine', state: 'done', tests: 43 },
  { id: 'LIB-02', task: 'Thumbnails in the grid', owner: 'UI', state: 'doing', tests: 18 },
  { id: 'LIB-03', task: 'Culling with picks and rejects', owner: 'UI', state: 'you', tests: 7 },
  { id: 'LIB-04', task: 'A million photos under a second', owner: 'Performance', state: 'todo', tests: 0 },
];
const TONES = { done: 'success', doing: 'accent', you: 'warning', todo: 'muted' } as const;

function Core() {
  return (
    <Stack gap={14}>
      <Grid min={300}>
        <Panel title="Release 1.4" info="updated 5m ago" keys={['r refresh']}>
          <Stats>
            <Stat label="Tests" value={1269} tone="success" hint="none failing" trend={[1180, 1201, 1222, 1240, 1255, 1269]} />
            <Stat label="Waiting on you" value="2" tone="warning" />
            <Stat label="Open bugs" value="5" delta="−3 today" deltaTone="success" />
          </Stats>
        </Panel>
        <Panel title="Progress" focus>
          <Stack gap={10}>
            <Meter label="Milestone 1" value={82} tone="success" />
            <Meter label="Milestone 2" value={41} />
            <Meter label="Blocks" value={63} tone="info" blocks />
            <Meter label="By state" value={0} max={20} show="value" segments={[{ value: 9, tone: 'success', label: 'done' }, { value: 5, tone: 'accent', label: 'doing' }, { value: 2, tone: 'warning', label: 'you' }]} />
          </Stack>
        </Panel>
      </Grid>

      <Panel title="Rows" info={<Badge tone="accent">4</Badge>}>
        <Table
          columns={[
            { key: 'id', label: 'ID', width: 80 },
            { key: 'task', label: 'Task' },
            { key: 'owner', label: 'Owner' },
            { key: 'state', label: 'State', render: (r) => <Badge tone={TONES[r.state as keyof typeof TONES]} dot>{r.state}</Badge> },
            { key: 'tests', label: 'Tests', align: 'right' },
          ]}
          rows={rows}
          filter
          rowTone={(r) => TONES[r.state as keyof typeof TONES]}
          actions={[{ label: 'Open', onClick: () => {} }]}
        />
      </Panel>

      <Split>
        <Panel title="Log">
          <Timeline
            items={[
              { at: now - 12 * 60_000, title: 'Merged the grid', who: 'UI programmer', body: 'Thumbnails load as they scroll in; 18 tests.', tone: 'success' },
              { at: now - 2 * HOUR, title: 'A question for you', who: 'Producer', body: 'Picks or stars for culling?', tone: 'warning' },
              { at: now - 26 * HOUR, title: 'Started the library', who: 'Engine programmer' },
            ]}
          />
        </Panel>
        <Panel title="Details">
          <KeyValue items={{ Branch: <Code>library/catalog</Code>, Commit: <Code>2442f9d</Code>, Updated: <Time at={now - 5 * 60_000} />, Owner: 'You', Docs: <Link path="/docs/plan.md">plan.md</Link> }} />
        </Panel>
      </Split>

      <Panel title="Lanes">
        <Lanes
          lanes={[
            { title: 'Ready', tone: 'accent', items: [{ title: 'Sidecar files', detail: 'Read .xmp beside each photo' }, { title: 'Keywords' }] },
            { title: 'Doing', tone: 'info', items: [{ title: 'Thumbnails', detail: 'UI programmer', badge: <Badge tone="info">2h</Badge> }] },
            { title: 'Blocked', tone: 'danger', items: [{ title: 'Import from Lightroom', detail: 'Waits on DEC-12', tone: 'danger' }] },
          ]}
        />
      </Panel>
    </Stack>
  );
}

function Words() {
  return (
    <Grid min={320}>
      <Panel title="Text">
        <Stack gap={8}>
          <Heading level={1} info="H1">The library</Heading>
          <Heading level={2} info="3 of 5">Milestones</Heading>
          <Heading level={3}>Waiting on you</Heading>
          <Text>Ordinary text, in the theme's colour.</Text>
          <Text tone="secondary">Secondary text, for what's less important.</Text>
          <Text tone="muted" size="sm">The dimmest text, for notes.</Text>
          <Row gap={6}>
            {(['default', 'accent', 'success', 'warning', 'danger', 'info', 'muted'] as const).map((t) => (
              <Badge key={t} tone={t}>{t}</Badge>
            ))}
          </Row>
          <Row gap={6}>
            <Badge tone="success" variant="solid">solid</Badge>
            <Badge tone="info" variant="outline">outline</Badge>
            <Badge tone="warning" dot>dot</Badge>
            <Text as="span">Press <Kbd>t</Kbd> for themes.</Text>
          </Row>
        </Stack>
      </Panel>
      <Panel title="Markdown">
        <Markdown>{`## What changed\n\nThe grid is **faster** and *quieter*, with \`thumbnails\` loading as they scroll in. See [the plan](/docs/plan.md).\n\n- [x] Thumbnails\n- [ ] Culling\n  - picks and rejects\n\n| Check | Result |\n| --- | ---: |\n| Tests | 1,269 |\n| Load | 0.8 s |\n\n> A quote, for what someone said.\n\n\`\`\`ts\nconst grid = new Grid({ lazy: true });\n\`\`\``}</Markdown>
      </Panel>
      <Panel title="Code and diffs">
        <Stack gap={10}>
          <Code block lang="shell">{'npm run build && atelier open .atelier/release.canvas.tsx'}</Code>
          <DiffView title="src/grid.ts" diff={'@@ -1,4 +1,4 @@\n const size = 240;\n-const lazy = false;\n+const lazy = true;\n export function grid() {}'} />
        </Stack>
      </Panel>
      <Panel title="Tree">
        <Tree
          items={[
            { label: 'Phase 1: Prove it', badge: <Badge tone="success">done</Badge>, children: [{ label: 'M1 Vertical slice', detail: '35 of 39' }, { label: 'M2 Pre-production', detail: 'signed off' }] },
            { label: 'Phase 2: Build it', children: [{ label: 'M3 Organising' }, { label: 'M4 Files', open: false, children: [{ label: 'Import' }] }] },
          ]}
        />
      </Panel>
    </Grid>
  );
}

function Media() {
  return (
    <Stack gap={14}>
      <Grid min={300}>
        <Panel title="Image">
          <Image path="/gallery/shot-1.png" alt="A screenshot of the grid" caption="The grid, with thumbnails" />
        </Panel>
        <Panel title="Missing">
          <Image path="/gallery/not-there.png" alt="An image that isn't there" caption="What a missing image looks like" />
        </Panel>
      </Grid>
      <Panel title="Gallery" info="click one">
        <Gallery
          images={[1, 2, 3, 4, 5].map((n) => ({ path: `/gallery/shot-${n}.png`, alt: `Shot ${n}`, caption: `Shot ${n}` }))}
          height={110}
        />
      </Panel>
      <Panel title="Calendar">
        <Calendar
          month="2026-10"
          events={[
            { date: '2026-10-05', title: 'Episode 1', tone: 'success' },
            { date: '2026-10-12', title: 'Episode 2', tone: 'success' },
            { date: '2026-10-15', title: 'Episode 3 cut', tone: 'warning' },
            { date: '2026-10-19', title: 'Episode 3' },
            { date: '2026-10-26', title: 'Episode 4' },
          ]}
        />
      </Panel>
    </Stack>
  );
}

export default function Kit() {
  return (
    <Stack gap={16}>
      <Row justify="between">
        <Heading level={1} info="Atelier's kit">Every component</Heading>
        <Text tone="muted" size="sm">One canvas, in every theme</Text>
      </Row>
      <Divider label="core" />
      <Tabs
        tabs={[
          { id: 'core', label: 'Core', content: <Core /> },
          { id: 'words', label: 'Words', content: <Words /> },
          { id: 'media', label: 'Media', badge: <Badge tone="info">5</Badge>, content: <Media /> },
        ]}
      />
      <Section title="A section that folds away" count="3" info="open">
        <Text tone="secondary">Sections keep long canvases tidy.</Text>
      </Section>
    </Stack>
  );
}

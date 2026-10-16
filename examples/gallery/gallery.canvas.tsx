// Every component in the kit, for the gallery's screenshots in each theme
// (scripts/gallery.mjs). The images are the gallery harness's own.

import {
  Approval,
  Badge,
  BarChart,
  Button,
  Calendar,
  Checkbox,
  DonutChart,
  FlowDiagram,
  Form,
  Gantt,
  Heatmap,
  Histogram,
  LineChart,
  NeedsYou,
  Radio,
  Rating,
  ScatterChart,
  Select,
  Slider,
  Sparkline,
  TextArea,
  TextInput,
  Toggle,
  useCanvasState,
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
  Video,
  Wireframe,
  Region,
  Notes,
  Marker,
  Status,
  StatusLegend,
  Placeholder,
  SideList,
  Field,
  Segmented,
  Chip,
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
            <Meter label="Done, by state" value={9} max={20} show="value" segments={[{ value: 9, tone: 'success', label: 'done' }, { value: 5, tone: 'accent', label: 'doing' }, { value: 2, tone: 'warning', label: 'you' }]} />
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
        <Panel title="Video">
          <Video path="/gallery/clip.mp4" caption="A clip, read from disk" />
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

const WEEKS = ['W36', 'W37', 'W38', 'W39', 'W40', 'W41', 'W42'];

function Charts() {
  return (
    <Grid min={420}>
      <Panel title="Bars">
        <BarChart
          title="Tests by area"
          caption="Passing tests at each milestone's close"
          categories={['Engine', 'UI', 'Network', 'Audio', 'Tools']}
          series={[
            { name: 'M1', values: [43, 120, 12, 30, 18] },
            { name: 'M2', values: [88, 260, 54, 61, 40] },
          ]}
        />
      </Panel>
      <Panel title="Stacked, across">
        <BarChart
          title="Rows by state"
          horizontal
          stacked
          categories={['M1 Vertical slice', 'M2 Pre-production', 'M3 Organising']}
          series={[
            { name: 'Done', values: [14, 9, 2], tone: 'success' },
            { name: 'Built', values: [21, 3, 1], tone: 'info' },
            { name: 'To do', values: [4, 0, 11], tone: 'muted' },
          ]}
        />
      </Panel>
      <Panel title="Lines">
        <LineChart
          title="Frame time, p95"
          caption="Milliseconds, on the build Mac"
          x={WEEKS}
          unit=" ms"
          series={[
            { name: 'Grid', values: [24, 21, 19, 17, 16.5, 15, 14.2] },
            { name: 'Viewer', values: [12, 12.5, 11, 10.8, 10, 9.6, 9.1] },
          ]}
        />
      </Panel>
      <Panel title="Area">
        <LineChart title="Photos indexed" x={WEEKS} area series={[{ name: 'Photos', values: [12_000, 64_000, 180_000, 420_000, 610_000, 880_000, 1_020_000] }]} />
      </Panel>
      <Panel title="Ring">
        <DonutChart
          title="Where the time went"
          center={<span>42h</span>}
          unit="h"
          segments={[
            { label: 'Building', value: 21 },
            { label: 'Reviewing', value: 9 },
            { label: 'Waiting on you', value: 7, tone: 'warning' },
            { label: 'Fixing', value: 5, tone: 'danger' },
          ]}
        />
      </Panel>
      <Panel title="Spread">
        <Histogram title="Thumbnail load times" unit=" ms" values={[12, 14, 15, 15, 16, 18, 19, 21, 22, 22, 23, 25, 27, 31, 34, 38, 44, 52, 61, 90]} />
      </Panel>
      <Panel title="Scatter">
        <ScatterChart
          title="Size against load time"
          xLabel="Megapixels"
          yLabel="ms"
          series={[
            { name: 'JPEG', points: [{ x: 12, y: 18 }, { x: 24, y: 31 }, { x: 33, y: 40 }, { x: 45, y: 52 }, { x: 61, y: 70 }] },
            { name: 'RAW', points: [{ x: 12, y: 44 }, { x: 24, y: 71 }, { x: 33, y: 96 }, { x: 45, y: 120 }, { x: 61, y: 166 }] },
          ]}
        />
      </Panel>
      <Panel title="Heatmap">
        <Heatmap
          title="Commits by day and hour"
          rows={['Mon', 'Tue', 'Wed', 'Thu', 'Fri']}
          columns={['8', '10', '12', '14', '16', '18', '20', '22']}
          values={[
            [1, 4, 2, 6, 5, 3, 1, 0],
            [2, 6, 3, 7, 8, 4, 2, 1],
            [0, 3, 5, 9, 7, 6, 3, 2],
            [1, 2, 4, 5, 6, 8, 5, 4],
            [3, 5, 2, 3, 2, 1, 0, 0],
          ]}
        />
      </Panel>
      <Panel title="Plan">
        <Gantt
          title="Milestones"
          today="2026-10-15"
          tasks={[
            { label: 'M1 Vertical slice', start: '2026-09-21', end: '2026-10-10', tone: 'success', progress: 1 },
            { label: 'M2 Pre-production', start: '2026-10-01', end: '2026-10-18', progress: 0.7 },
            { label: 'M3 Organising', start: '2026-10-12', end: '2026-11-02', tone: 'info', progress: 0.15 },
            { label: 'M4 Files', start: '2026-10-26', end: '2026-11-20', tone: 'muted' },
          ]}
        />
      </Panel>
      <Panel title="Loops">
        <Stack gap={8}>
          <FlowDiagram
            title="The studio's loop"
            current="review"
            nodes={[
              { id: 'brief', label: 'Brief' },
              { id: 'work', label: 'Role agent works' },
              { id: 'review', label: 'Lead reviews' },
              { id: 'qa', label: 'QA' },
              { id: 'gate', label: 'Your gate', tone: 'warning' },
            ]}
            edges={[
              { from: 'brief', to: 'work' },
              { from: 'work', to: 'review' },
              { from: 'review', to: 'qa' },
              { from: 'qa', to: 'gate' },
              { from: 'review', to: 'work', label: 'changes' },
              { from: 'qa', to: 'work', label: 'fails' },
            ]}
          />
          <Row>
            <Text size="sm" tone="muted">Sparklines:</Text>
            <Sparkline title="Tests" values={[3, 5, 4, 7, 6, 9, 11]} />
            <Sparkline title="Bugs" values={[9, 7, 8, 5, 4, 4, 2]} tone="danger" />
            <Sparkline title="Load" values={[2, 4, 3, 6, 5, 7, 8, 6, 9]} tone="info" blocks />
          </Row>
        </Stack>
      </Panel>
    </Grid>
  );
}

function Forms() {
  const [mode, setMode] = useCanvasState('mode', 'terminal');
  return (
    <Grid min={380}>
      <Panel title="A brief">
        <Form
          name="brief"
          initial={{ lane: 'ui', priority: 3 }}
          validate={(v) => (String(v.goal ?? '').trim() ? {} : { goal: 'Say what the lane is for.' })}
          start={{ prompt: 'Start the {{lane}} lane: {{goal}}', mode: 'background' }}
        >
          <TextInput name="goal" label="Goal" placeholder="What the lane should deliver" />
          <Select name="lane" label="Lane" options={[{ value: 'ui', label: 'UI' }, { value: 'engine', label: 'Engine' }, { value: 'audio', label: 'Audio' }]} />
          <Radio name="size" label="Size" options={['Small', 'Medium', 'Large']} />
          <Slider name="priority" label="Priority" min={1} max={5} />
          <Rating name="confidence" label="Confidence" />
          <TextArea name="notes" label="Notes" placeholder="Anything the agent should know" />
          <Checkbox name="tests" label="Write tests first" />
          <Toggle name="night" label="Work through the night" />
        </Form>
      </Panel>
      <Stack gap={12}>
        <Panel title="Needs you" info="2 open">
          <Stack gap={8}>
            <NeedsYou id="steam" title="Sign the Steamworks agreement" detail="In Steamworks, under Legal. It takes about ten minutes." unblocks="The store page and the depots" blocking />
            <NeedsYou id="token" title="Add the Cloudflare token" detail="Put it in .env.local as CF_TOKEN." command="echo CF_TOKEN=... >> .env.local" />
          </Stack>
        </Panel>
        <Panel title="Approve">
          <Approval id="cut-3" title="Episode 3's cut" detail="38 seconds, with the new hook." />
        </Panel>
        <Panel title="Buttons">
          <Stack gap={10}>
            <Row gap={8}>
              <Button variant="solid" tone="accent" kbd="⏎">Start</Button>
              <Button>Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button tone="danger">Stop</Button>
              <Button disabled>Disabled</Button>
              <Button size="sm" tone="success">Small</Button>
            </Row>
            <Radio label="Run new agents" options={[{ value: 'terminal', label: 'In a terminal' }, { value: 'background', label: 'In the background' }]} value={mode} onChange={setMode} />
          </Stack>
        </Panel>
      </Stack>
    </Grid>
  );
}

function Wireframes() {
  const [view, setView] = useCanvasState('wireframe-view', 'All');
  return (
    <Stack gap={16}>
      <StatusLegend counts={{ built: 3, building: 1, planned: 1, later: 1 }} />
      <Wireframe toolbar={<Segmented items={['All', 'Chosen', 'Left out']} active={view} onChange={setView} />} columns="170px minmax(0, 1fr) 230px" caption="The Import window, as a card goes in">
        <Region n={1} label="From" status="built">
          <SideList
            items={[
              { label: 'EOS R5 card', count: '1,204', selected: true },
              { label: 'Already in the library', count: '312', depth: 1, dim: true },
              { label: 'Z 6 card', count: '640' },
              { separator: true, label: '' },
              { label: 'Add a folder…', dim: true },
            ]}
          />
        </Region>
        <Region n={2} label="Photos" status="built">
          <Stack gap={6}>
            <Row gap={6}>
              {Array.from({ length: 8 }, (_, i) => (
                <Placeholder key={i} w={54} selected={i < 2} badge={i === 3 ? '★4' : undefined} dim={i === 7} />
              ))}
            </Row>
            <Text size="sm" tone="muted">892 to import · the 312 already imported are left out</Text>
          </Stack>
        </Region>
        <Stack gap={8}>
          <Region n={3} label="To" status="building">
            <Field name="To" value="Archive › Photos" />
            <Field name="Folders" value="{date:yyyy}/{date:yyyy-MM-dd}" wrap />
            <Field name="Example" value="2026/2026-10-06/IMG_0001.CR3" tone="muted" />
            <Row gap={6}>
              <Button variant="solid">Import 892</Button>
              <Kbd>⏎</Kbd>
            </Row>
          </Region>
          <Region n={4} label="Preset" status="planned" dashed>
            <Row gap={6}>
              <Chip>Client day</Chip>
              <Chip dim>None</Chip>
            </Row>
            <Checkbox label="Raw files only" />
          </Region>
        </Stack>
      </Wireframe>
      <Notes
        items={[
          { n: 1, title: 'Sources', text: 'Cards as they go in and any folder added, each with its count; photos already imported are counted apart.', status: 'built' },
          { n: 2, title: 'The photos', text: 'Newest first from their embedded previews, chosen, rated and flagged before anything is copied.', status: 'built' },
          { n: 3, title: 'Where they go', text: 'Destination, folder and name templates with a live example from the first chosen photo.', status: 'building' },
          { n: 4, title: 'Metadata presets', text: "A preset's ticked fields applied as the photos are copied; shown when a preset is picked.", status: 'planned' },
        ]}
      />
      <Row gap={24} align="start">
        <Wireframe frame="phone" caption="On the phone: the strip and its ruler">
          <Region n={5} label="Photo" status="later" grow>
            <Placeholder>Swipe to the next photo</Placeholder>
          </Region>
          <Region n={6} label="Ruler" status="you">
            <Slider label="Exposure" min={-5} max={5} value={1} />
          </Region>
        </Wireframe>
        <Stack gap={8}>
          <Heading level={3}>Shapes, drawn to scale</Heading>
          <Row gap={14} align="end">
            <Placeholder w={80} ratio="4:5" inset={[0.05, 0.27, 0.9, 0.5]} caption="White 4:5" />
            <Placeholder w={90} ratio="1:1" inset={[0.05, 0.2, 0.9, 0.6]} caption="Square" />
            <Placeholder w={60} ratio="9:16" inset={[0.04, 0.35, 0.92, 0.3]} caption="Story 9:16" />
          </Row>
          <StatusLegend meanings={{ built: 'Merged and tested; it shows in the app.', building: 'An agent is building it now.', planned: 'In the plan for this release.', later: 'After this release.', you: 'Waiting on a decision of yours.' }} />
          <Text size="sm" tone="secondary">
            Region <Marker n={2} /> is <Status status="built" />, and <Marker n={6} /> <Status status="you" label="waits on your call" />.
          </Text>
        </Stack>
      </Row>
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
          { id: 'charts', label: 'Charts', content: <Charts /> },
          { id: 'forms', label: 'Forms', content: <Forms /> },
          { id: 'wireframes', label: 'Wireframes', content: <Wireframes /> },
        ]}
      />
      <Section title="A section that folds away" count="3" info="open">
        <Text tone="secondary">Sections keep long canvases tidy.</Text>
      </Section>
    </Stack>
  );
}

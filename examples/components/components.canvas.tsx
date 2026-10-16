// Every component in the kit on its own, one at a time: `component` in the
// canvas's state picks which. atelier-tui's preview harness (`atelier-tui
// demo`) and its conformance frames draw each one from here, and the kit's
// tests fail when a component has no sample.

import {
  Approval,
  Badge,
  BarChart,
  Button,
  Calendar,
  Checkbox,
  Code,
  DiffView,
  Divider,
  DonutChart,
  FlowDiagram,
  Form,
  Gallery,
  Gantt,
  Grid,
  Heading,
  Heatmap,
  Histogram,
  Image,
  KeyValue,
  Kbd,
  Lanes,
  LineChart,
  Link,
  Markdown,
  Meter,
  NeedsYou,
  Panel,
  Radio,
  Rating,
  Row,
  ScatterChart,
  Section,
  Select,
  Slider,
  Sparkline,
  Split,
  Stack,
  Stat,
  Stats,
  Table,
  Tabs,
  Text,
  TextArea,
  TextInput,
  Time,
  Timeline,
  Toggle,
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
  useCanvasState,
} from 'atelier';

export const meta = { title: 'Every component, one at a time' };

const HOUR = 3600_000;
const now = Date.now();
const card = (title: string) => (
  <Panel title={title}>
    <Text tone="secondary">A panel inside it.</Text>
  </Panel>
);

const SAMPLES: Record<string, () => JSX.Element> = {
  Stack: () => (
    <Stack gap={8}>
      <Text>First, then</Text>
      <Text tone="secondary">second, one under the other.</Text>
    </Stack>
  ),
  Row: () => (
    <Row gap={8}>
      <Badge tone="success">ready</Badge>
      <Badge tone="warning">waiting</Badge>
      <Text as="span">side by side, wrapping when there isn't room</Text>
    </Row>
  ),
  Grid: () => (
    <Grid min={220}>
      {card('One')}
      {card('Two')}
      {card('Three')}
    </Grid>
  ),
  Split: () => (
    <Split>
      {card('Two parts')}
      {card('One part')}
    </Split>
  ),
  Divider: () => <Divider label="between things" />,
  Panel: () => (
    <Panel title="Release 1.4" info="updated 5m ago" keys={['r refresh']} tone="accent">
      <Text>Its title is set into its border, like a window in a tiling window manager.</Text>
    </Panel>
  ),
  Tabs: () => (
    <Tabs
      stateKey="sample-tab"
      tabs={[
        { id: 'one', label: 'Overview', content: <Text>The first tab.</Text> },
        { id: 'two', label: 'Plan', badge: <Badge tone="info">2</Badge>, content: <Text>The second tab.</Text> },
      ]}
    />
  ),
  Section: () => (
    <Section title="A section that folds away" count="2" info="open">
      <Text tone="secondary">Its content.</Text>
    </Section>
  ),
  Heading: () => (
    <Stack gap={6}>
      <Heading level={1} info="H1">The library</Heading>
      <Heading level={2} info="3 of 5">Milestones</Heading>
      <Heading level={3}>Waiting on you</Heading>
    </Stack>
  ),
  Text: () => (
    <Stack gap={4}>
      <Text>Ordinary text.</Text>
      <Text tone="secondary">Secondary text.</Text>
      <Text tone="muted" size="sm">The dimmest text.</Text>
      <Text tone="muted" size="xs">The smallest print, for a chart's scale.</Text>
      <Text tabular>Digits one width: 1,204 · 31,400</Text>
      <Text tone="success" weight="bold">Bold, in a tone.</Text>
      <Text italic truncate>Cut to one line with an ellipsis when it's too long to fit on one line, however wide the screen.</Text>
    </Stack>
  ),
  Code: () => (
    <Stack gap={8}>
      <Text>
        Inline: <Code>npm test</Code>
      </Text>
      <Code block lang="shell">{'npm run build\natelier open .atelier/release.canvas.tsx'}</Code>
    </Stack>
  ),
  Kbd: () => (
    <Text>
      Press <Kbd>t</Kbd> for themes and <Kbd>?</Kbd> for the keys.
    </Text>
  ),
  Link: () => (
    <Row gap={12}>
      <Link path="/docs/plan.md">The plan</Link>
      <Link href="https://example.com/tracker">The tracker</Link>
    </Row>
  ),
  Time: () => (
    <Text>
      Merged <Time at={now - 12 * 60_000} />, started <Time at={now - 26 * HOUR} />.
    </Text>
  ),
  Markdown: () => (
    <Markdown>{`## What changed\n\nThe grid is **faster** and *quieter*, with \`thumbnails\` loading as they scroll in.\n\n- [x] Thumbnails\n- [ ] Culling\n\n| Check | Result |\n| --- | ---: |\n| Tests | 1,269 |\n\n> A quote.`}</Markdown>
  ),
  Image: () => <Image path="/gallery/shot-1.png" alt="A screenshot of the grid" caption="The grid, with thumbnails" />,
  Gallery: () => <Gallery images={[1, 2, 3].map((n) => ({ path: `/gallery/shot-${n}.png`, alt: `Shot ${n}`, caption: `Shot ${n}` }))} height={90} />,
  Video: () => <Video path="/gallery/clip.mp4" caption="A clip, read from disk" />,
  Table: () => (
    <Table
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'task', label: 'Task' },
        { key: 'tests', label: 'Tests', align: 'right' },
      ]}
      rows={[
        { id: 'LIB-01', task: 'Scan the library', tests: 43 },
        { id: 'LIB-02', task: 'Thumbnails in the grid', tests: 18 },
      ]}
      rowTone={(r) => (r.tests > 20 ? 'success' : 'accent')}
      actions={[{ label: 'Open', onClick: () => {} }]}
      filter
    />
  ),
  Stat: () => <Stat label="Tests" value={1269} tone="success" delta="+12" deltaTone="success" hint="none failing" trend={[1180, 1201, 1222, 1240, 1269]} />,
  Stats: () => (
    <Stats>
      <Stat label="Tests" value={1269} tone="success" />
      <Stat label="Waiting on you" value="2" tone="warning" />
      <Stat label="Open bugs" value="5" />
    </Stats>
  ),
  Badge: () => (
    <Row gap={6}>
      <Badge>default</Badge>
      <Badge tone="accent">accent</Badge>
      <Badge tone="success" variant="solid">solid</Badge>
      <Badge tone="info" variant="outline">outline</Badge>
      <Badge tone="warning" dot>dot</Badge>
    </Row>
  ),
  Meter: () => (
    <Stack gap={8}>
      <Meter label="Milestone 1" value={82} tone="success" />
      <Meter label="Blocks" value={63} tone="info" blocks />
      <Meter label="By state" value={9} max={20} show="value" segments={[{ value: 9, tone: 'success' }, { value: 5, tone: 'accent' }, { value: 2, tone: 'warning' }]} />
      <Meter label="Thin" value={40} height={3} />
      <Meter label="In shades of ink" value={100} show="none" segments={[{ value: 55, shade: 0.55 }, { value: 30, shade: 0.3 }, { value: 15, shade: 0.12 }]} />
    </Stack>
  ),
  KeyValue: () => <KeyValue items={{ Branch: <Code>library/catalog</Code>, Commit: <Code>2442f9d</Code>, Owner: 'You' }} />,
  Timeline: () => (
    <Timeline
      items={[
        { at: now - 12 * 60_000, title: 'Merged the grid', who: 'UI programmer', body: 'Thumbnails load as they scroll in.', tone: 'success' },
        { at: now - 2 * HOUR, title: 'A question for you', who: 'Producer', tone: 'warning' },
      ]}
    />
  ),
  Lanes: () => (
    <Lanes
      lanes={[
        { title: 'Ready', items: [{ title: 'Sidecar files', detail: 'Read .xmp beside each photo' }] },
        { title: 'Blocked', tone: 'danger', items: [{ title: 'Import from Lightroom', badge: <Badge tone="danger">DEC-12</Badge> }] },
      ]}
    />
  ),
  Calendar: () => (
    <Calendar
      month="2026-10"
      events={[
        { date: '2026-10-05', title: 'Episode 1', tone: 'success' },
        { date: '2026-10-15', title: 'Episode 3 cut', tone: 'warning' },
      ]}
    />
  ),
  Tree: () => <Tree items={[{ label: 'Phase 1', badge: <Badge tone="success">done</Badge>, children: [{ label: 'M1 Vertical slice', detail: '35 of 39' }] }, { label: 'Phase 2', open: false, children: [{ label: 'M3' }] }]} />,
  DiffView: () => <DiffView title="src/grid.ts" diff={'@@ -1,3 +1,3 @@\n const size = 240;\n-const lazy = false;\n+const lazy = true;'} />,
  BarChart: () => <BarChart title="Tests by area" categories={['Engine', 'UI', 'Network']} series={[{ name: 'M1', values: [43, 120, 12] }, { name: 'M2', values: [88, 260, 54] }]} />,
  LineChart: () => <LineChart title="Frame time, p95" x={['W1', 'W2', 'W3', 'W4', 'W5']} unit=" ms" series={[{ name: 'Grid', values: [24, 21, 19, 17, 14] }]} />,
  Sparkline: () => (
    <Stack gap={8}>
      <Row>
        <Text as="span" tone="muted">Tests</Text>
        <Sparkline title="Tests" values={[3, 5, 4, 7, 6, 9, 11]} />
      </Row>
      <Row>
        <Text as="span" tone="muted">Photos a second, from 0, paused</Text>
        <Sparkline title="Photos a second" values={[38, 42, 41, 44, 2, 0, 1, 40, 43, 42]} min={0} max={50} shade={[4, 6]} />
      </Row>
    </Stack>
  ),
  DonutChart: () => <DonutChart title="Where the time went" center={<span>42h</span>} unit="h" segments={[{ label: 'Building', value: 21 }, { label: 'Reviewing', value: 9 }, { label: 'Waiting on you', value: 7, tone: 'warning' }]} />,
  Histogram: () => <Histogram title="Load times" unit=" ms" values={[12, 14, 15, 16, 18, 21, 22, 25, 31, 38, 44, 61]} />,
  ScatterChart: () => <ScatterChart title="Size against load time" xLabel="Megapixels" yLabel="ms" series={[{ name: 'JPEG', points: [{ x: 12, y: 18 }, { x: 24, y: 31 }, { x: 45, y: 52 }] }]} />,
  Heatmap: () => <Heatmap title="Commits by day" rows={['Mon', 'Tue']} columns={['8', '10', '12', '14']} values={[[1, 4, 2, 6], [2, 6, 3, 7]]} />,
  Gantt: () => (
    <Gantt
      title="Milestones"
      today="2026-10-15"
      tasks={[
        { label: 'M1', start: '2026-09-21', end: '2026-10-10', tone: 'success', progress: 1 },
        { label: 'M2', start: '2026-10-01', end: '2026-10-25', progress: 0.5 },
      ]}
    />
  ),
  FlowDiagram: () => (
    <FlowDiagram
      title="The loop"
      current="review"
      nodes={[{ id: 'brief', label: 'Brief' }, { id: 'work', label: 'Work' }, { id: 'review', label: 'Review' }, { id: 'gate', label: 'Your gate', tone: 'warning' }]}
      edges={[{ from: 'brief', to: 'work' }, { from: 'work', to: 'review' }, { from: 'review', to: 'gate' }, { from: 'review', to: 'work', label: 'changes' }]}
    />
  ),
  Button: () => (
    <Row gap={8}>
      <Button variant="solid" tone="accent" kbd="⏎">Start</Button>
      <Button>Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button tone="danger">Stop</Button>
      <Button disabled>Disabled</Button>
    </Row>
  ),
  TextInput: () => <TextInput stateKey="sample-input" label="Goal" placeholder="What the lane should deliver" hint="A sentence is enough." />,
  TextArea: () => <TextArea stateKey="sample-area" label="Notes" placeholder="Anything the agent should know" />,
  Select: () => <Select stateKey="sample-select" label="Lane" options={['UI', 'Engine', 'Audio']} placeholder="Pick one" />,
  Checkbox: () => <Checkbox stateKey="sample-check" label="Write tests first" />,
  Toggle: () => <Toggle stateKey="sample-toggle" label="Work through the night" />,
  Radio: () => <Radio stateKey="sample-radio" label="Size" options={['Small', 'Medium', 'Large']} />,
  Slider: () => <Slider stateKey="sample-slider" label="Priority" min={1} max={5} />,
  Rating: () => <Rating stateKey="sample-rating" label="Confidence" />,
  Form: () => (
    <Form name="sample" validate={(v) => (String(v.goal ?? '').trim() ? {} : { goal: 'Say what it is for.' })}>
      <TextInput name="goal" label="Goal" placeholder="What it should deliver" />
      <Checkbox name="tests" label="Write tests first" />
    </Form>
  ),
  Approval: () => <Approval id="sample-cut" title="Episode 3's cut" detail="38 seconds, with the new hook." />,
  NeedsYou: () => <NeedsYou id="sample-token" title="Add the Cloudflare token" detail="Put it in .env.local as CF_TOKEN." command="echo CF_TOKEN=... >> .env.local" blocking />,
  Wireframe: () => (
    <Wireframe toolbar={<Segmented items={['Library', 'Develop']} active="Library" />} columns="170px minmax(0, 1fr)" padding={12} caption="The library's window, drawn on its own columns">
      <Region n={1} label="Folders" status="built">
        <SideList items={[{ label: 'All photos', count: '1,204', selected: true }, { label: '2026', count: '892', depth: 1 }]} />
      </Region>
      <Region n={2} label="Grid" status="building">
        <Row gap={6}>
          {[0, 1, 2, 3].map((i) => (
            <Placeholder key={i} w={54} selected={i === 0} />
          ))}
        </Row>
      </Region>
    </Wireframe>
  ),
  Region: () => (
    <Stack gap={8}>
      <Region n={3} label="Destination" status="planned">
        <Field name="To" value="Archive › Photos" />
      </Region>
      <Region n={4} label="Preset" status="later" dashed>
        <Text size="sm" tone="secondary">Shown on demand, so its border is dashed.</Text>
      </Region>
      <Region n={5} status="built" padding={3}>
        <Button variant="solid">Import</Button>
      </Region>
    </Stack>
  ),
  Notes: () => (
    <Notes
      items={[
        { n: 1, title: 'Folders', text: 'Every folder with its count; the one selected fills the grid.', status: 'built' },
        { n: 2, title: 'Grid', text: 'Thumbnails load as they scroll in, newest first.', status: 'building' },
      ]}
    />
  ),
  Marker: () => (
    <Text>
      Region <Marker n={1} /> is the sidebar, and <Marker n={2} /> the grid.
    </Text>
  ),
  Status: () => (
    <Row gap={14}>
      <Status status="built" />
      <Status status="building" />
      <Status status="planned" />
      <Status status="later" />
      <Status status="you" label="Waits on your call" />
    </Row>
  ),
  StatusLegend: () => (
    <Stack gap={10}>
      <StatusLegend counts={{ built: 6, building: 2, planned: 4 }} />
      <StatusLegend meanings={{ built: 'Merged and tested; it shows in the app.', planned: 'In the plan for this release.' }} />
    </Stack>
  ),
  Placeholder: () => (
    <Row gap={10} align="end">
      <Placeholder w={62} caption="IMG_0001.CR3" badge="★4" selected />
      <Placeholder w={62} dim caption="Rejected" />
      <Placeholder w={80} ratio="4:5" inset={[0.05, 0.27, 0.9, 0.5]} caption="White 4:5" />
      <Placeholder w={140} h={64}>A photo</Placeholder>
    </Row>
  ),
  SideList: () => (
    <SideList
      title="Catalog"
      status="built"
      items={[
        { label: 'All photos', count: '1,204' },
        { label: 'Picks', count: '86', tone: 'success', selected: true },
        { separator: true, label: '' },
        { label: 'Recently deleted', count: '12', dim: true },
      ]}
      note="Counts are made up."
    />
  ),
  Field: () => (
    <Stack gap={2}>
      <Field name="To" value="Archive › Photos" />
      <Field name="Folders" value="{date:yyyy}/{date:yyyy-MM-dd}" wrap />
      <Field name="Example" value="2026/2026-10-06/IMG_0001.CR3" tone="muted" />
    </Stack>
  ),
  Segmented: () => {
    const [view, setView] = useCanvasState('sample-segmented', 'All');
    return <Segmented items={['All', 'Chosen', 'Left out']} active={view} onChange={setView} />;
  },
  Chip: () => (
    <Row gap={6}>
      <Chip>Plain</Chip>
      <Chip dim>Paper</Chip>
      <Chip dim>Grey</Chip>
    </Row>
  ),
};

/** The components there are samples of, in the order they're shown. */
export const components = Object.keys(SAMPLES);

export default function Components() {
  const [name] = useCanvasState('component', components[0]);
  const Sample = SAMPLES[name];
  return (
    <Stack gap={12}>
      <Heading level={1} info={`${components.indexOf(name) + 1} of ${components.length}`}>
        {name}
      </Heading>
      {Sample ? <Sample /> : <Text tone="danger">There's no sample of {name}.</Text>}
    </Stack>
  );
}

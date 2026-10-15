import { Approval, Badge, DiffView, DonutChart, Link, Markdown, Panel, Row, Section, Split, Stack, Stat, Stats, Table, Tabs, Text, useCanvasState } from '../../packages/kit/src/index.ts';
import type { ApprovalMark, Tab, Tone } from '../../packages/kit/src/index.ts';
import { Header, Log, NeedsYouList, Updated, some } from '../shared.tsx';
import type { Review } from './schema.ts';

type Finding = Review['findings'][number];

const SEVERITIES = ['critical', 'high', 'medium', 'low', 'note'] as const;
const SEVERITY_TONE: Record<Finding['severity'], Tone> = { critical: 'danger', high: 'danger', medium: 'warning', low: 'info', note: 'muted' };
const STATUS_TONE: Record<NonNullable<Finding['status']>, Tone> = { open: 'warning', fixed: 'success', accepted: 'success', declined: 'muted' };
const REVIEWER_TONE = { waiting: 'muted', reviewing: 'info', done: 'success' } as const;

function Where({ f }: { f: Finding }) {
  if (!f.file) return null;
  return (
    <Link path={f.file} line={f.line}>
      {f.file}
      {f.line ? `:${f.line}` : ''}
    </Link>
  );
}

function YourCall({ f }: { f: Finding }) {
  const [mark] = useCanvasState<ApprovalMark | null>(`approval:${f.id}`, null);
  if (!mark) return <Text tone="muted" size="sm">no call yet</Text>;
  return <Badge tone={mark.state === 'approved' ? 'success' : 'muted'}>{mark.state === 'approved' ? 'fix it' : 'leave it'}</Badge>;
}

function FindingDetail({ f }: { f: Finding }) {
  const closed = f.status && f.status !== 'open';
  return (
    <Section
      title={
        <Row gap={8}>
          <Badge tone={SEVERITY_TONE[f.severity]}>{f.severity}</Badge>
          <span>{f.title}</span>
          {f.status && <Badge tone={STATUS_TONE[f.status]}>{f.status}</Badge>}
        </Row>
      }
      open={!closed && (f.severity === 'critical' || f.severity === 'high')}
      stateKey={`finding:${f.id}`}
    >
      <Stack gap={10}>
        <Row gap={10}>
          <Where f={f} />
          {f.by && <Text tone="muted" size="sm">found by {f.by}</Text>}
        </Row>
        <Markdown>{f.detail}</Markdown>
        {f.proposal && (
          <Stack gap={2}>
            <Text tone="muted" size="sm" weight="medium">Proposed</Text>
            <Markdown>{f.proposal}</Markdown>
          </Stack>
        )}
        {f.diff && <DiffView diff={f.diff} title={f.file} />}
        {!closed && <Approval id={f.id} title="Your call" labels={{ approve: 'Fix it', hold: 'Leave it' }} />}
      </Stack>
    </Section>
  );
}

export function ReviewView({ data }: { data: Review }) {
  const open = data.findings.filter((f) => !f.status || f.status === 'open');
  const bySeverity = SEVERITIES.map((s) => ({ severity: s, n: open.filter((f) => f.severity === s).length })).filter((x) => x.n > 0);
  const order = (f: Finding) => SEVERITIES.indexOf(f.severity) + (f.status && f.status !== 'open' ? 10 : 0);
  const sorted = [...data.findings].sort((a, b) => order(a) - order(b));
  const overview = (
    <Stack gap={14}>
      <NeedsYouList items={data.needsYou} />
      <Split ratio={[2, 1]}>
        <Panel title="Findings" info={`${open.length} open of ${data.findings.length}`}>
          <Stack gap={6}>
            {sorted.map((f) => (
              <FindingDetail key={f.id} f={f} />
            ))}
          </Stack>
        </Panel>
        <Stack gap={14}>
          {bySeverity.length > 0 && <DonutChart title="Open findings by severity" segments={bySeverity.map((x) => ({ label: x.severity, value: x.n, tone: SEVERITY_TONE[x.severity] }))} center={<span>{open.length}</span>} height={150} />}
          {some(data.reviewers) && (
            <Panel title="Reviewers" info={`${data.reviewers.filter((r) => r.status === 'done').length} of ${data.reviewers.length} done`}>
              <Stack gap={6}>
                {data.reviewers.map((r) => (
                  <Row key={r.name} gap={8} justify="between">
                    <Stack gap={0}>
                      <Text as="span">{r.name}</Text>
                      {(r.focus || r.note) && <Text tone="muted" size="sm" as="span">{[r.focus, r.note].filter(Boolean).join(' · ')}</Text>}
                    </Stack>
                    <Badge tone={REVIEWER_TONE[r.status]} dot>{r.status}</Badge>
                  </Row>
                ))}
              </Stack>
            </Panel>
          )}
        </Stack>
      </Split>
    </Stack>
  );
  const table = (
    <Table
      columns={[
        { key: 'severity', label: 'Severity', width: 100, render: (f) => <Badge tone={SEVERITY_TONE[f.severity]}>{f.severity}</Badge>, sortBy: (f) => SEVERITIES.indexOf(f.severity) },
        { key: 'title', label: 'Finding' },
        { key: 'file', label: 'Where', render: (f) => <Where f={f} />, sortBy: (f) => f.file ?? '' },
        { key: 'status', label: 'Status', width: 100, render: (f) => (f.status ? <Badge tone={STATUS_TONE[f.status]}>{f.status}</Badge> : <Badge tone="warning">open</Badge>) },
        { key: 'call', label: 'Your call', width: 110, render: (f) => <YourCall f={f} />, sortable: false },
      ]}
      rows={sorted}
      rowTone={(f) => (f.status && f.status !== 'open' ? undefined : SEVERITY_TONE[f.severity])}
      filter
      stateKey="findings"
    />
  );
  const tabs: Tab[] = [
    { id: 'findings', label: 'Findings', badge: open.length, content: overview },
    { id: 'table', label: 'Table', content: table },
    ...(some(data.log) ? [{ id: 'log', label: 'Log', content: <Log entries={data.log} /> }] : []),
  ];
  return (
    <Stack gap={14}>
      <Header title={data.title} info={<Updated at={data.updated} />} links={data.links}>
        {data.subject && <Text tone="muted" size="sm">{data.subject}</Text>}
        <Text tone="secondary">{data.summary}</Text>
        <Stats min={120}>
          {SEVERITIES.map((s) => (
            <Stat key={s} label={s} value={open.filter((f) => f.severity === s).length} tone={open.some((f) => f.severity === s) ? SEVERITY_TONE[s] : 'muted'} />
          ))}
        </Stats>
      </Header>
      <Tabs tabs={tabs} />
    </Stack>
  );
}

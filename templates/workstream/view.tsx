import { Badge, Grid, Lanes, Meter, Panel, Sparkline, Stack, Stat, Stats, Table, Tabs, Text } from '../../packages/kit/src/index.ts';
import type { Tab, Tone } from '../../packages/kit/src/index.ts';
import { Agents, Decisions, Header, Log, NeedsYouList, Updated, some } from '../shared.tsx';
import type { Workstream } from './schema.ts';

type Step = NonNullable<Workstream['plan']>[number];

const STEP_TONE: Record<Step['status'], Tone> = { 'not started': 'muted', 'in progress': 'info', done: 'success', blocked: 'danger', dropped: 'muted' };

function Progress({ plan }: { plan: Step[] }) {
  const counted = plan.filter((p) => p.status !== 'dropped');
  const n = (status: Step['status']) => counted.filter((p) => p.status === status).length;
  return (
    <Meter
      value={n('done')}
      max={counted.length}
      label={`${n('done')} of ${counted.length} steps done`}
      show="percent"
      segments={[
        { value: n('done'), tone: 'success', label: 'done' },
        { value: n('in progress'), tone: 'info', label: 'in progress' },
        { value: n('blocked'), tone: 'danger', label: 'blocked' },
      ]}
    />
  );
}

function Plan({ plan }: { plan: Step[] }) {
  return (
    <Panel title="Plan" info={`${plan.length} steps`}>
      <Table
        columns={[
          { key: 'step', label: 'Step', render: (p) => (
            <Stack gap={2}>
              <span>{p.step}</span>
              {p.detail && <Text tone="secondary" size="sm">{p.detail}</Text>}
              {p.note && <Text tone={p.status === 'blocked' ? 'danger' : 'muted'} size="sm">{p.note}</Text>}
            </Stack>
          ) },
          { key: 'doneWhen', label: 'Done when', render: (p) => <Text tone="secondary" size="sm">{p.doneWhen ?? ''}</Text> },
          { key: 'ref', label: 'Ref', width: 110, render: (p) => (p.ref ? <code className="at-code">{p.ref}</code> : null) },
          { key: 'status', label: 'Status', width: 120, render: (p) => <Badge tone={STEP_TONE[p.status]}>{p.status}</Badge> },
        ]}
        rows={plan}
        rowTone={(p) => (p.status === 'in progress' ? 'info' : p.status === 'blocked' ? 'danger' : undefined)}
      />
    </Panel>
  );
}

function Measurements({ items }: { items: NonNullable<Workstream['measurements']> }) {
  return (
    <Stack gap={12}>
      <Stats>
        {items.map((m) => {
          const over = m.budget !== undefined && (m.better === 'higher' ? m.value < m.budget : m.value > m.budget);
          return (
            <Stat
              key={m.label}
              label={m.label}
              value={`${m.value}${m.unit ?? ''}`}
              tone={m.budget === undefined ? 'default' : over ? 'danger' : 'success'}
              hint={m.budget !== undefined ? `budget ${m.budget}${m.unit ?? ''}${m.note ? ` · ${m.note}` : ''}` : m.note}
              trend={m.history}
            />
          );
        })}
      </Stats>
      <Grid min={260}>
        {items
          .filter((m) => some(m.history) && m.history.length > 1)
          .map((m) => (
            <Panel key={m.label} title={m.label} info={`${m.history!.length} runs`}>
              <Sparkline title={`${m.label}, oldest first`} values={m.history!} height={40} />
            </Panel>
          ))}
      </Grid>
    </Stack>
  );
}

export function WorkstreamView({ data }: { data: Workstream }) {
  const plan = data.plan ?? [];
  const overview = (
    <Stack gap={14}>
      <NeedsYouList items={data.needsYou} />
      {(some(data.ready) || some(data.blocked)) && (
        <Lanes
          lanes={[
            ...(some(data.ready) ? [{ title: 'Ready', tone: 'success' as Tone, items: data.ready.map((r) => ({ title: r.title, detail: r.detail })) }] : []),
            ...(some(data.blocked) ? [{ title: 'Blocked', tone: 'danger' as Tone, items: data.blocked.map((b) => ({ title: b.title, detail: b.detail, badge: <Badge tone="danger">{b.blockedBy}</Badge> })) }] : []),
          ]}
        />
      )}
      <Log entries={data.log} limit={3} title="Latest" />
    </Stack>
  );
  const tabs: Tab[] = [
    { id: 'overview', label: 'Overview', content: overview },
    ...(some(plan) ? [{ id: 'plan', label: 'Plan', badge: `${plan.filter((p) => p.status === 'done').length}/${plan.length}`, content: <Plan plan={plan} /> }] : []),
    ...(some(data.measurements) ? [{ id: 'measurements', label: 'Measurements', content: <Measurements items={data.measurements} /> }] : []),
    ...(some(data.decisions) ? [{ id: 'decisions', label: 'Decisions', badge: data.decisions.length, content: <Decisions decisions={data.decisions} /> }] : []),
    ...(some(data.log) ? [{ id: 'log', label: 'Log', content: <Log entries={data.log} /> }] : []),
    ...(some(data.agents) ? [{ id: 'agents', label: 'Agents', content: <Agents agents={data.agents} /> }] : []),
  ];
  return (
    <Stack gap={14}>
      <Header title={data.title} info={<Updated at={data.updated} />} links={data.links}>
        <Text>{data.goal}</Text>
        {data.status && <Text tone="secondary">{data.status}</Text>}
        {some(plan) && <Progress plan={plan} />}
      </Header>
      <Tabs tabs={tabs} />
    </Stack>
  );
}

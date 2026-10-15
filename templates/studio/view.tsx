import { Badge, FlowDiagram, Grid, Heading, Meter, Panel, Row, Section, Split, Stack, Table, Tabs, Text } from '../../packages/kit/src/index.ts';
import type { Tab, Tone } from '../../packages/kit/src/index.ts';
import { Agents, Decisions, Header, Log, NeedsYouList, Updated, some } from '../shared.tsx';
import type { Studio } from './schema.ts';

type Milestone = Studio['milestones'][number];
type Item = Milestone['groups'][number]['items'][number];

const STATUS: Record<Milestone['status'], { label: string; tone: Tone }> = {
  active: { label: 'in progress', tone: 'info' },
  waiting: { label: 'waiting on you', tone: 'warning' },
  next: { label: 'next', tone: 'muted' },
  later: { label: 'later', tone: 'muted' },
  done: { label: 'done', tone: 'success' },
};

const STATE: Record<Item['state'], { mark: string; tone: Tone; label: string }> = {
  done: { mark: '✓', tone: 'success', label: 'done' },
  doing: { mark: '◐', tone: 'info', label: 'in progress' },
  you: { mark: '▲', tone: 'warning', label: 'waiting on you' },
  todo: { mark: '○', tone: 'muted', label: 'to do' },
};

const itemsOf = (m: Milestone) => m.groups.flatMap((g) => g.items);
const count = (items: Item[], state: Item['state']) => items.filter((i) => i.state === state).length;
const current = (m: Milestone) => m.status === 'active' || m.status === 'waiting';

function Progress({ items, label }: { items: Item[]; label?: string }) {
  const done = count(items, 'done');
  return (
    <Meter
      value={done}
      max={items.length || 1}
      label={label ?? `${done} of ${items.length}`}
      segments={[
        { value: done, tone: 'success', label: 'done' },
        { value: count(items, 'doing'), tone: 'info', label: 'in progress' },
        { value: count(items, 'you'), tone: 'warning', label: 'waiting on you' },
      ]}
    />
  );
}

function Legend() {
  return (
    <Row gap={12}>
      {(['done', 'doing', 'you', 'todo'] as const).map((s) => (
        <Text key={s} tone={STATE[s].tone} size="sm">
          {STATE[s].mark} {STATE[s].label}
        </Text>
      ))}
    </Row>
  );
}

function Tile({ m }: { m: Milestone }) {
  const s = STATUS[m.status];
  return (
    <Panel title={`${m.id} · ${m.name}`} info={<Badge tone={s.tone}>{s.label}</Badge>} tone={current(m) ? s.tone : undefined}>
      <Stack gap={6}>
        <Progress items={itemsOf(m)} />
        {m.gate && <Text tone="muted" size="sm">Gate: {m.gate}</Text>}
      </Stack>
    </Panel>
  );
}

function Roadmap({ data }: { data: Studio }) {
  const phases = some(data.phases) ? data.phases : [{ id: '', name: '', note: undefined }];
  const inPhase = (id: string) => data.milestones.filter((m) => (id ? m.phase === id : true));
  return (
    <Stack gap={10}>
      <Grid min={240} gap={14}>
        {phases.map((p) => (
          <Stack key={p.id || 'all'} gap={10}>
            {p.name && (
              <Stack gap={2}>
                <Heading level={3}>{p.name}</Heading>
                {p.note && <Text tone="secondary" size="sm">{p.note}</Text>}
              </Stack>
            )}
            {inPhase(p.id).map((m) => (
              <Tile key={m.id} m={m} />
            ))}
          </Stack>
        ))}
      </Grid>
      {data.later && <Text tone="muted" size="sm">{data.later}</Text>}
    </Stack>
  );
}

function Items({ items }: { items: Item[] }) {
  return (
    <Stack gap={4}>
      {items.map((i, n) => (
        <Row key={n} gap={8} align="start" wrap={false}>
          <Text tone={STATE[i.state].tone} as="span">{STATE[i.state].mark}</Text>
          <Stack gap={0}>
            <Text tone={i.state === 'done' ? 'secondary' : 'default'} as="span">{i.title}</Text>
            {i.state === 'you' && <Text tone="warning" size="sm" as="span">waiting on you{i.note ? `: ${i.note}` : ''}</Text>}
            {i.state !== 'you' && i.note && <Text tone="muted" size="sm" as="span">{i.note}</Text>}
          </Stack>
        </Row>
      ))}
    </Stack>
  );
}

function Detail({ m }: { m: Milestone }) {
  const s = STATUS[m.status];
  return (
    <Panel title={`${m.id} · ${m.name}`} info={<Badge tone={s.tone}>{s.label}</Badge>}>
      <Stack gap={8}>
        <Progress items={itemsOf(m)} />
        {m.groups.map((g) => {
          const done = count(g.items, 'done');
          return (
            <Section key={g.name} title={g.name} count={`${done} of ${g.items.length}`} open={current(m) && done < g.items.length} stateKey={`group:${m.id}:${g.name}`}>
              <Stack gap={6}>
                {g.note && <Text tone="muted" size="sm">{g.note}</Text>}
                <Items items={g.items} />
              </Stack>
            </Section>
          );
        })}
        {m.gate && <Text tone="muted" size="sm">Gate: {m.gate}</Text>}
      </Stack>
    </Panel>
  );
}

function Now({ now }: { now: NonNullable<Studio['now']> }) {
  return (
    <Panel title="Now" tone="accent">
      <Stack gap={10}>
        <Heading level={2}>{now.doing}</Heading>
        {now.detail && <Text tone="secondary">{now.detail}</Text>}
        {(now.waiting || now.next) && (
          <Grid min={260} gap={14}>
            {now.waiting && (
              <Stack gap={2}>
                <Text tone="warning" size="sm" weight="medium">Waiting on you</Text>
                <Text>{now.waiting}</Text>
              </Stack>
            )}
            {now.next && (
              <Stack gap={2}>
                <Text tone="muted" size="sm" weight="medium">Next checkpoint with you</Text>
                <Text>{now.next}</Text>
              </Stack>
            )}
          </Grid>
        )}
      </Stack>
    </Panel>
  );
}

function TheStudio({ data }: { data: Studio }) {
  return (
    <Stack gap={14}>
      {data.flow && <FlowDiagram title={data.flow.title} caption={data.flow.note} nodes={data.flow.nodes} edges={data.flow.edges} current={data.flow.current} />}
      {some(data.roles) && (
        <Panel title="Roles" info={`${data.roles.filter((r) => r.active).length} working`}>
          <Table
            columns={[
              { key: 'role', label: 'Role', width: 170 },
              { key: 'owns', label: 'Owns' },
              { key: 'reviewer', label: 'Reviewed by', width: 170, render: (r) => r.reviewer ?? '' },
              { key: 'now', label: 'Now', render: (r) => r.now ?? '' },
            ]}
            rows={data.roles}
            rowTone={(r) => (r.active ? 'info' : undefined)}
          />
        </Panel>
      )}
      <Agents agents={data.agents} />
    </Stack>
  );
}

export function StudioView({ data }: { data: Studio }) {
  const all = data.milestones.flatMap(itemsOf);
  const live = data.milestones.filter(current);
  const ahead = data.milestones.filter((m) => !current(m));
  const board = (
    <Stack gap={14}>
      {data.now && <Now now={data.now} />}
      <NeedsYouList items={data.needsYou} />
      <Roadmap data={data} />
      {live.length > 0 && (
        <Grid min={320} gap={14}>
          {live.map((m) => (
            <Detail key={m.id} m={m} />
          ))}
        </Grid>
      )}
    </Stack>
  );
  const tabs: Tab[] = [
    { id: 'board', label: 'Board', content: board },
    ...(ahead.length ? [{ id: 'milestones', label: 'Every milestone', badge: data.milestones.length, content: <Grid min={320} gap={14}>{data.milestones.map((m) => <Detail key={m.id} m={m} />)}</Grid> }] : []),
    ...(data.flow || some(data.roles) || some(data.agents) ? [{ id: 'studio', label: 'Studio', content: <TheStudio data={data} /> }] : []),
    ...(some(data.decisions) || some(data.log)
      ? [{ id: 'record', label: 'Decisions and log', content: <Split ratio={[1, 1]}><Decisions decisions={data.decisions} /><Log entries={data.log} /></Split> }]
      : []),
  ];
  return (
    <Stack gap={14}>
      <Header title={data.title} info={<Updated at={data.updated} />} links={data.links}>
        <Text tone="secondary">{data.summary}</Text>
        <Progress items={all} label={`All of it: ${all.length ? Math.round((count(all, 'done') / all.length) * 100) : 0}% done, ${count(all, 'done')} of ${all.length}`} />
        <Legend />
      </Header>
      <Tabs tabs={tabs} />
    </Stack>
  );
}

import { Approval, Badge, Calendar, Code, Gallery, Grid, KeyValue, Lanes, Link, Panel, Row, Split, Stack, Stat, Stats, Table, Tabs, Text, Time } from '../../packages/kit/src/index.ts';
import type { Tab, Tone } from '../../packages/kit/src/index.ts';
import { toTime } from '../../packages/kit/src/util.ts';
import { Decisions, Header, Log, NeedsYouList, Updated, some } from '../shared.tsx';
import type { Room } from './schema.ts';

type Piece = Room['pieces'][number];
type Channel = NonNullable<Piece['channels']>[number];

const CHANNEL_TONE: Record<Channel['state'], Tone> = { draft: 'muted', scheduled: 'info', posted: 'success', skipped: 'muted', failed: 'danger' };

const stageIndex = (room: Room, p: Piece) => {
  const i = room.stages.indexOf(p.stage);
  return i < 0 ? room.stages.length : i;
};
const finished = (room: Room, p: Piece) => room.stages.length > 0 && p.stage === room.stages[room.stages.length - 1];

function Channels({ channels }: { channels?: Channel[] }) {
  if (!some(channels)) return null;
  return (
    <Row gap={6}>
      {channels.map((c) => {
        const badge = (
          <Badge tone={CHANNEL_TONE[c.state]} dot>
            {c.name}: {c.state}
            {c.at ? <> <Time at={c.at} /></> : null}
          </Badge>
        );
        return c.link ? (
          <Link key={c.name} href={c.link}>
            {badge}
          </Link>
        ) : (
          <span key={c.name}>{badge}</span>
        );
      })}
    </Row>
  );
}

function PieceCard({ room, piece }: { room: Room; piece: Piece }) {
  const meta: [string, string][] = [['Stage', piece.stage]];
  if (piece.kind) meta.push(['Kind', piece.kind]);
  if (piece.owner) meta.push(['Owner', piece.owner]);
  return (
    <Panel title={piece.title} info={piece.due ? <Time at={piece.due} /> : piece.stage} tone={finished(room, piece) ? 'success' : undefined}>
      <Stack gap={10}>
        {piece.detail && <Text tone="secondary">{piece.detail}</Text>}
        {some(piece.images) && <Gallery images={piece.images} columns={Math.min(3, piece.images.length)} height={150} />}
        {piece.copy && (
          <Code block wrap lang="the words">
            {piece.copy}
          </Code>
        )}
        <KeyValue items={meta} columns={2} />
        <Channels channels={piece.channels} />
        {some(piece.numbers) && (
          <Stats min={110}>
            {piece.numbers.map((n) => (
              <Stat key={n.label} label={n.label} value={n.value.toLocaleString()} />
            ))}
          </Stats>
        )}
        {piece.approve && <Approval id={piece.id} title={`Approve ${piece.title}`} detail={piece.copy ? 'Approving keeps the words above as they are now.' : undefined} />}
      </Stack>
    </Panel>
  );
}

export function RoomView({ data }: { data: Room }) {
  const open = data.pieces.filter((p) => !finished(data, p)).sort((a, b) => (a.due ? toTime(a.due) : Infinity) - (b.due ? toTime(b.due) : Infinity) || stageIndex(data, b) - stageIndex(data, a));
  const dated = data.pieces.filter((p) => p.due);
  const overview = (
    <Stack gap={14}>
      {some(data.metrics) && (
        <Stats>
          {data.metrics.map((m) => (
            <Stat key={m.label} label={m.label} value={`${m.value.toLocaleString()}${m.unit ?? ''}`} delta={m.delta} deltaTone={m.delta?.startsWith('-') ? 'danger' : 'success'} trend={m.trend} />
          ))}
        </Stats>
      )}
      <NeedsYouList items={data.needsYou} />
      {open.length > 0 && (
        <Stack gap={8}>
          <Text tone="muted" size="sm" weight="medium">UP NEXT</Text>
          <Grid min={320} gap={14}>
            {open.slice(0, 3).map((p) => (
              <PieceCard key={p.id} room={data} piece={p} />
            ))}
          </Grid>
        </Stack>
      )}
      <Log entries={data.log} limit={3} title="Latest" />
    </Stack>
  );
  const pipeline = (
    <Lanes
      lanes={data.stages.map((stage, i) => ({
        title: stage,
        tone: (i === data.stages.length - 1 ? 'success' : i === 0 ? 'muted' : 'info') as Tone,
        items: data.pieces
          .filter((p) => p.stage === stage)
          .map((p) => ({ title: p.title, detail: [p.kind, p.owner].filter(Boolean).join(' · ') || undefined, badge: p.due ? <Time at={p.due} /> : undefined })),
      }))}
    />
  );
  const tabs: Tab[] = [
    { id: 'overview', label: 'Overview', content: overview },
    { id: 'pipeline', label: 'Pipeline', content: pipeline },
    {
      id: 'pieces',
      label: 'Every piece',
      badge: data.pieces.length,
      content: (
        <Grid min={320} gap={14}>
          {[...data.pieces].sort((a, b) => stageIndex(data, a) - stageIndex(data, b)).map((p) => (
            <PieceCard key={p.id} room={data} piece={p} />
          ))}
        </Grid>
      ),
    },
    ...(dated.length
      ? [
          {
            id: 'calendar',
            label: 'Calendar',
            content: (
              <Split ratio={[3, 2]}>
                <Calendar events={dated.map((p) => ({ date: new Date(toTime(p.due!)).toISOString().slice(0, 10), title: p.title, tone: (finished(data, p) ? 'success' : 'info') as Tone }))} month={new Date(toTime(open.find((p) => p.due)?.due ?? dated[0].due!)).toISOString().slice(0, 7)} weekStart={1} />
                <Table
                  columns={[
                    { key: 'due', label: 'When', width: 120, render: (p) => <Time at={p.due!} />, sortBy: (p) => toTime(p.due!) },
                    { key: 'title', label: 'Piece' },
                    { key: 'stage', label: 'Stage', width: 110, render: (p) => <Badge tone={finished(data, p) ? 'success' : 'default'}>{p.stage}</Badge> },
                  ]}
                  rows={[...dated].sort((a, b) => toTime(a.due!) - toTime(b.due!))}
                  dense
                />
              </Split>
            ),
          },
        ]
      : []),
    ...(some(data.roles)
      ? [{ id: 'roles', label: 'Roles', content: <Panel title="Roles"><Table columns={[{ key: 'role', label: 'Role', width: 160 }, { key: 'does', label: 'Does' }, { key: 'now', label: 'Now', render: (r) => r.now ?? '' }]} rows={data.roles} /></Panel> }]
      : []),
    ...(some(data.decisions) || some(data.log)
      ? [{ id: 'record', label: 'Decisions and log', content: <Split ratio={[1, 1]}><Decisions decisions={data.decisions} /><Log entries={data.log} /></Split> }]
      : []),
  ];
  return (
    <Stack gap={14}>
      <Header title={data.title} info={<Updated at={data.updated} />} links={data.links}>
        <Text tone="secondary">{data.summary}</Text>
        <Row gap={6}>
          {data.stages.map((stage) => {
            const n = data.pieces.filter((p) => p.stage === stage).length;
            return (
              <Badge key={stage} tone={n ? 'accent' : 'muted'} variant={n ? 'soft' : 'outline'}>
                {stage} {n}
              </Badge>
            );
          })}
        </Row>
      </Header>
      <Tabs tabs={tabs} />
    </Stack>
  );
}

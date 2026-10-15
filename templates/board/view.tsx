import { Badge, Lanes, Row, Stack, Table, Tabs, Text, Time } from '../../packages/kit/src/index.ts';
import type { Tab } from '../../packages/kit/src/index.ts';
import { toTime } from '../../packages/kit/src/util.ts';
import { Header, Log, NeedsYouList, Updated, some } from '../shared.tsx';
import type { Board } from './schema.ts';

type Card = Board['columns'][number]['cards'][number];

function CardBadges({ card }: { card: Card }) {
  const parts = [
    card.due && <Time key="due" at={card.due} />,
    card.ref && <code key="ref" className="at-code">{card.ref}</code>,
    ...(card.tags ?? []).map((t) => <Badge key={t}>{t}</Badge>),
  ].filter(Boolean);
  return parts.length ? <Row gap={4}>{parts}</Row> : null;
}

export function BoardView({ data }: { data: Board }) {
  const rows = data.columns.flatMap((c) => c.cards.map((card) => ({ ...card, column: c.title })));
  const lanes = (
    <Lanes
      lanes={data.columns.map((c) => ({
        title: c.limit && c.cards.length > c.limit ? `${c.title} · over ${c.limit}` : c.title,
        tone: c.limit && c.cards.length > c.limit ? 'danger' : c.tone,
        items: c.cards.map((card) => ({
          title: card.title,
          detail: [card.detail, card.owner].filter(Boolean).join(' · ') || undefined,
          badge: <CardBadges card={card} />,
          tone: card.tone,
        })),
      }))}
    />
  );
  const list = (
    <Table
      columns={[
        { key: 'title', label: 'Card', render: (r) => <Stack gap={2}><span>{r.title}</span>{r.detail && <Text tone="secondary" size="sm">{r.detail}</Text>}</Stack> },
        { key: 'column', label: 'Column', width: 130, render: (r) => <Badge>{r.column}</Badge> },
        { key: 'owner', label: 'Owner', width: 130, render: (r) => r.owner ?? '' },
        { key: 'due', label: 'Due', width: 110, render: (r) => (r.due ? <Time at={r.due} /> : null), sortBy: (r) => (r.due ? toTime(r.due) : Infinity) },
        { key: 'ref', label: 'Ref', width: 100, render: (r) => r.ref ?? '' },
      ]}
      rows={rows}
      rowTone={(r) => r.tone}
      filter
      stateKey="list"
      empty="No cards yet."
    />
  );
  const tabs: Tab[] = [
    { id: 'board', label: 'Board', content: <Stack gap={14}><NeedsYouList items={data.needsYou} />{lanes}</Stack> },
    { id: 'list', label: 'List', badge: rows.length, content: list },
    ...(some(data.log) ? [{ id: 'log', label: 'Log', content: <Log entries={data.log} /> }] : []),
  ];
  return (
    <Stack gap={14}>
      <Header title={data.title} info={<Updated at={data.updated} />} links={data.links}>
        {data.summary && <Text tone="secondary">{data.summary}</Text>}
        <Row gap={6}>
          {data.columns.map((c) => (
            <Badge key={c.title} tone={c.tone ?? 'default'}>
              {c.title} {c.cards.length}
            </Badge>
          ))}
        </Row>
      </Header>
      <Tabs tabs={tabs} />
    </Stack>
  );
}

import { Badge, BarChart, Form, Grid, Image, Panel, Radio, Stack, Table, Text, TextArea, Time, useCanvasState } from '../../packages/kit/src/index.ts';
import type { Submission } from '../../packages/kit/src/index.ts';
import { Header, Log, Updated, some } from '../shared.tsx';
import type { Compare } from './schema.ts';

type Option = Compare['options'][number];

function List({ items, mark, tone }: { items?: string[]; mark: string; tone: 'success' | 'danger' }) {
  if (!some(items)) return null;
  return (
    <Stack gap={3}>
      {items.map((p, i) => (
        <Text key={i} size="sm" as="div">
          <Text tone={tone} as="span">{mark}</Text> {p}
        </Text>
      ))}
    </Stack>
  );
}

/** Each option's total: its scores times their criteria's weights, out of 5. */
function totals(data: Compare): Map<string, number> {
  const criteria = data.criteria ?? [];
  const weight = (name: string) => criteria.find((c) => c.name === name)?.weight ?? 1;
  const all = criteria.reduce((n, c) => n + (c.weight ?? 1), 0);
  return new Map(
    data.options.map((o) => {
      const sum = (o.scores ?? []).reduce((n, s) => n + s.score * weight(s.criterion), 0);
      return [o.id, all ? sum / all : 0];
    }),
  );
}

export function CompareView({ data }: { data: Compare }) {
  const [pick] = useCanvasState<Submission | null>('form:pick', null);
  const scored = some(data.criteria) && data.options.some((o) => some(o.scores));
  const total = totals(data);
  const recommended = data.recommendation?.option;
  const picked = pick?.values.option as string | undefined;
  const nameOf = (id?: string) => data.options.find((o) => o.id === id)?.name ?? id;
  const card = (o: Option) => (
    <Panel
      key={o.id}
      title={o.name}
      info={
        <>
          {o.id === picked && <Badge tone="success">your pick</Badge>} {o.id === recommended && <Badge tone="accent">recommended</Badge>}
          {scored && <span> {total.get(o.id)!.toFixed(1)} of 5</span>}
        </>
      }
      tone={o.id === picked ? 'success' : o.id === recommended ? 'accent' : undefined}
    >
      <Stack gap={8}>
        {o.image && <Image path={o.image.path} alt={o.image.alt} height={160} fit="cover" />}
        <Text>{o.summary}</Text>
        {o.cost && <Text tone="muted" size="sm">Cost: {o.cost}</Text>}
        <List items={o.pros} mark="+" tone="success" />
        <List items={o.cons} mark="−" tone="danger" />
      </Stack>
    </Panel>
  );
  return (
    <Stack gap={14}>
      <Header title={data.title} info={<Updated at={data.updated} />} links={data.links}>
        <Text weight="medium">{data.question}</Text>
        {data.context && <Text tone="secondary">{data.context}</Text>}
      </Header>
      <Grid min={260} gap={14}>
        {data.options.map(card)}
      </Grid>
      {scored && (
        <Panel title="Against the criteria" info="scores from 0 to 5">
          <Stack gap={14}>
            <Table
              columns={[
                { key: 'name', label: 'Criterion', render: (c) => <Stack gap={0}><span>{c.name}</span>{c.note && <Text tone="muted" size="sm" as="span">{c.note}</Text>}</Stack> },
                { key: 'weight', label: 'Weight', align: 'right', width: 80, render: (c) => c.weight ?? 1 },
                ...data.options.map((o) => ({
                  key: o.id,
                  label: o.name,
                  align: 'right' as const,
                  render: (c: NonNullable<Compare['criteria']>[number]) => {
                    const s = o.scores?.find((x) => x.criterion === c.name);
                    return s ? <span title={s.note}>{s.score}</span> : <Text tone="muted" as="span">–</Text>;
                  },
                  sortable: false,
                })),
              ]}
              rows={data.criteria!}
            />
            <BarChart title="Weighted score, out of 5" categories={data.options.map((o) => o.name)} series={[{ name: 'score', values: data.options.map((o) => Number(total.get(o.id)!.toFixed(2))) }]} horizontal height={40 + data.options.length * 34} />
          </Stack>
        </Panel>
      )}
      {data.recommendation && (
        <Panel title="Recommended" tone="accent">
          <Text>
            <b>{nameOf(recommended)}</b>: {data.recommendation.why}
          </Text>
        </Panel>
      )}
      <Panel title="Your pick" info={pick ? <>sent <Time at={pick.at} /></> : undefined} tone={pick ? 'success' : 'warning'}>
        <Form name="pick" initial={{ option: recommended ?? '' }} validate={(v): Record<string, string> => (v.option ? {} : { option: 'Pick one' })} submitLabel={pick ? 'Change my pick' : 'Send my pick'}>
          <Radio name="option" label="Which one" options={data.options.map((o) => ({ value: o.id, label: o.name }))} />
          <TextArea name="why" label="Why, or what would change your mind" rows={3} />
        </Form>
      </Panel>
      {some(data.log) && <Log entries={data.log} />}
    </Stack>
  );
}

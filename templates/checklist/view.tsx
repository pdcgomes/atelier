import { Badge, Checkbox, Code, Link, Meter, Panel, Row, Section, Stack, Text, Time, useCanvasState } from '../../packages/kit/src/index.ts';
import { Header, Log, Updated, some } from '../shared.tsx';
import type { Checklist } from './schema.ts';

type Item = Checklist['groups'][number]['items'][number];
type Checks = Record<string, boolean | null>;

export function ChecklistView({ data }: { data: Checklist }) {
  const [checks, setChecks] = useCanvasState<Checks>('checks', {});
  const ticked = (i: Item) => Boolean(i.done || checks[i.id]);
  const all = data.groups.flatMap((g) => g.items);
  const done = all.filter(ticked).length;
  const requiredLeft = all.filter((i) => i.required && !ticked(i)).length;
  return (
    <Stack gap={14}>
      <Header title={data.title} info={<Updated at={data.updated} />} links={data.links}>
        {data.summary && <Text tone="secondary">{data.summary}</Text>}
        <Meter value={done} max={all.length || 1} label={`${done} of ${all.length} done${requiredLeft ? `, ${requiredLeft} required left` : ''}`} tone={requiredLeft ? 'warning' : 'success'} />
        {data.due && (
          <Text tone="muted" size="sm">
            Due <Time at={data.due} /> ({new Date(data.due).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })})
          </Text>
        )}
      </Header>
      {data.groups.map((g) => {
        const left = g.items.filter((i) => !ticked(i));
        return (
          <Panel key={g.name} title={g.name} info={left.length ? `${left.length} left` : 'all done'} tone={left.length ? undefined : 'success'}>
            <Stack gap={10}>
              {g.note && <Text tone="muted" size="sm">{g.note}</Text>}
              {g.items.filter((i) => !ticked(i)).map((i) => (
                <ItemRow key={i.id} item={i} checked={false} onChange={(v) => setChecks((c) => ({ ...c, [i.id]: v || null }))} />
              ))}
              {g.items.some(ticked) && (
                <Section title="Done" count={g.items.filter(ticked).length} stateKey={`done:${g.name}`}>
                  <Stack gap={6}>
                    {g.items.filter(ticked).map((i) => (
                      <ItemRow key={i.id} item={i} checked onChange={(v) => setChecks((c) => ({ ...c, [i.id]: v || null }))} />
                    ))}
                  </Stack>
                </Section>
              )}
            </Stack>
          </Panel>
        );
      })}
      {some(data.log) && <Log entries={data.log} />}
    </Stack>
  );
}

function ItemRow({ item, checked, onChange }: { item: Item; checked: boolean; onChange: (v: boolean) => void }) {
  const label = (
    <Row gap={6}>
      <span>{item.title}</span>
      {item.required && !checked && <Badge tone="warning">required</Badge>}
      {item.who === 'agent' && <Badge tone="info">agent</Badge>}
      {item.done && <Badge tone="success">checked by the agent</Badge>}
      {item.due && !checked && <Badge><Time at={item.due} /></Badge>}
    </Row>
  );
  return (
    <Stack gap={4}>
      {item.done ? (
        <Row gap={8}>
          <Text tone="success" as="span">✓</Text>
          {label}
        </Row>
      ) : (
        <Checkbox label={label} value={checked} onChange={onChange} />
      )}
      {!checked && (item.detail || item.command || item.link) && (
        <div style={{ paddingLeft: 24 }}>
          <Stack gap={4}>
            {item.detail && <Text tone="secondary" size="sm">{item.detail}</Text>}
            {item.command && <Code block lang="shell">{item.command}</Code>}
            {item.link && <Link path={item.link.path} href={item.link.href}>{item.link.label}</Link>}
          </Stack>
        </div>
      )}
    </Stack>
  );
}

// The views of the parts most templates have: links, Needs you items, the
// log, decisions and agents.

import type { ReactNode } from 'react';
import { Badge, Link, NeedsYou, Panel, Row, Section, Stack, Table, Text, Time, Timeline, useAction, useCanvasState, useNow, useSessions } from '../packages/kit/src/index.ts';
import type { NeedsYouMark, Tone } from '../packages/kit/src/index.ts';
import { ago, toTime } from '../packages/kit/src/util.ts';
import type { AgentData, DecisionData, LinkData, LogData, NeedsYouData } from './parts.ts';
/** A list's parts only when it has some. */
export const some = <T,>(list: T[] | undefined): list is T[] => Array.isArray(list) && list.length > 0;

export function Links({ links }: { links?: LinkData[] }) {
  if (!some(links)) return null;
  return (
    <Row gap={14}>
      {links.map((l) => (
        <Link key={l.label} path={l.path} href={l.href}>
          {l.label}
        </Link>
      ))}
    </Row>
  );
}

export function Updated({ at }: { at?: string }) {
  const now = useNow(30_000);
  return at ? <span title={new Date(toTime(at)).toLocaleString()}>updated {ago(toTime(at), now)}</span> : null;
}

/** Needs you: open items first, blocking ones on top, and what's settled folded underneath. */
export function NeedsYouList({ items, title = 'Needs you' }: { items?: NeedsYouData[]; title?: string }) {
  const [marks] = useCanvasState<Record<string, NeedsYouMark | null>>('needsYou', {});
  if (!some(items)) return null;
  const settled = (i: NeedsYouData) => i.done || (marks[i.id] && marks[i.id]!.state !== 'asked');
  const open = items.filter((i) => !i.done).sort((a, b) => Number(Boolean(b.blocking)) - Number(Boolean(a.blocking)));
  const done = items.filter((i) => i.done);
  const waiting = items.filter((i) => !settled(i)).length;
  return (
    <Panel title={title} info={waiting ? `${waiting} open` : 'nothing open'} tone={waiting ? 'warning' : undefined}>
      <Stack gap={8}>
        {open.map((i) => (
          <NeedsYou key={i.id} {...i} />
        ))}
        {!open.length && <Text tone="muted">Nothing needs you now.</Text>}
        {done.length > 0 && (
          <Section title="Done" count={done.length} stateKey="needsYou:done-open">
            <Stack gap={8}>
              {done.map((i) => (
                <NeedsYou key={i.id} {...i} />
              ))}
            </Stack>
          </Section>
        )}
      </Stack>
    </Panel>
  );
}

export function Log({ entries, limit, title = 'Log' }: { entries?: LogData[]; limit?: number; title?: string }) {
  if (!some(entries)) return null;
  const sorted = [...entries].sort((a, b) => toTime(b.at) - toTime(a.at));
  return (
    <Panel title={title} info={limit && entries.length > limit ? `latest ${limit} of ${entries.length}` : `${entries.length}`}>
      <Timeline items={sorted.map((e) => ({ at: e.at, title: e.text, who: e.who }))} limit={limit} />
    </Panel>
  );
}

export function Decisions({ decisions }: { decisions?: DecisionData[] }) {
  if (!some(decisions)) return null;
  const sorted = [...decisions].sort((a, b) => toTime(b.at) - toTime(a.at));
  return (
    <Panel title="Decisions" info={`${decisions.length}`}>
      <Table
        columns={[
          { key: 'at', label: 'When', width: 110, render: (d) => <Time at={d.at} />, sortBy: (d) => toTime(d.at) },
          { key: 'decision', label: 'Decision' },
          { key: 'why', label: 'Why' },
          { key: 'by', label: 'By', width: 110, render: (d) => (d.by ? <Badge>{d.by}</Badge> : null) },
        ]}
        rows={sorted}
        stateKey="decisions"
      />
    </Panel>
  );
}

const SESSION_TONE: Record<string, Tone> = { working: 'info', waiting: 'warning', idle: 'muted', ended: 'muted' };

/** The agents that worked on it, with what each is doing now, and a button to carry each on. */
export function Agents({ agents, title = 'Agents' }: { agents?: AgentData[]; title?: string }) {
  const sessions = useSessions();
  const { openSession } = useAction();
  if (!some(agents)) return null;
  const live = (id: string) => sessions.find((x) => x.id === id);
  const working = agents.filter((a) => live(a.id)?.status === 'working').length;
  return (
    <Panel title={title} info={working ? `${working} working` : `${agents.length}`}>
      <Table
        columns={[
          { key: 'title', label: 'Session' },
          { key: 'role', label: 'Role', width: 160 },
          { key: 'note', label: 'Where it is', render: (a) => a.note ?? '' },
          {
            key: 'status',
            label: 'Now',
            width: 110,
            render: (a) => {
              const s = live(a.id);
              return s ? <Badge tone={SESSION_TONE[s.status]} dot>{s.status}</Badge> : <Text tone="muted">not seen</Text>;
            },
            sortBy: (a) => live(a.id)?.status ?? 'zz',
          },
        ]}
        rows={agents}
        actions={[{ label: 'Open', onClick: (a) => void openSession({ id: a.id }) }]}
      />
    </Panel>
  );
}

/** A heading for a template's canvas: its title, a line under it, and its links. */
export function Header({ title, info, children, links }: { title: string; info?: ReactNode; children?: ReactNode; links?: LinkData[] }) {
  return (
    <Panel title={title} info={info} focus>
      <Stack gap={8}>
        {children}
        <Links links={links} />
      </Stack>
    </Panel>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <Text tone="muted">{children}</Text>;
}

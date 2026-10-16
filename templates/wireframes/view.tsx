import type { ReactNode } from 'react';
import {
  Button,
  Checkbox,
  Chip,
  Divider,
  Field,
  Form,
  Grid,
  Heading,
  Kbd,
  Markdown,
  Marker,
  Notes,
  Panel,
  Placeholder,
  Radio,
  Region,
  Row,
  Segmented,
  SideList,
  Slider,
  Stack,
  Status,
  StatusLegend,
  Table,
  Tabs,
  Text,
  TextArea,
  TextInput,
  Wireframe,
} from '../../packages/kit/src/index.ts';
import type { Tab, WireframeStatus } from '../../packages/kit/src/index.ts';
import { STATUS_ORDER, StatusLabels } from '../../packages/kit/src/logic.ts';
import { Links, Updated, some } from '../shared.tsx';
import type { ContentData, DrawingData, RegionData, Wireframes } from './schema.ts';

type Question = NonNullable<Wireframes['questions']>[number];
type Screen = Wireframes['screens'][number];

const MEANINGS: Record<WireframeStatus, string> = {
  built: 'Merged and tested; it shows in the app.',
  building: 'An agent is building it now.',
  planned: 'In the plan for this release; its engine may exist without its screen.',
  later: 'After this release.',
  you: 'Waiting on a decision or a measurement of yours.',
};

const READING = 'Boxes are regions, numbers point to the notes under each wireframe, and names and counts are made up. Every region says where it stands:';

const isStatus = (v: string): v is WireframeStatus => (STATUS_ORDER as string[]).includes(v);

/** The segmented control, chips, buttons and keys a region or a toolbar has, inline. */
function Inline({ c }: { c: ContentData }) {
  return (
    <>
      {c.segmented && <Segmented items={c.segmented.items} active={c.segmented.active} />}
      {c.chips?.map((ch, i) => (
        <Chip key={`chip-${i}`} dim={ch.dim}>{ch.label}</Chip>
      ))}
      {c.buttons?.map((b, i) => (
        <Button key={`button-${i}`} variant={b.primary ? 'solid' : 'outline'}>
          {b.label}
        </Button>
      ))}
      {c.keys?.map((k) => (
        <Kbd key={k}>{k}</Kbd>
      ))}
    </>
  );
}

/** A region's content, always in this order; `blocks` draws more content after it, block by block. */
function Content({ c }: { c: ContentData & { blocks?: ContentData[] } }) {
  const inline = Boolean(c.segmented || some(c.chips) || some(c.buttons) || some(c.keys));
  return (
    <>
      {c.text && <Text size="sm" tone="secondary">{c.text}</Text>}
      {c.lists?.map((l, i) => (
        <SideList key={`list-${i}`} title={l.title} status={l.status} items={l.items} note={l.note} />
      ))}
      {some(c.fields) && (
        <Stack gap={0}>
          {c.fields.map((f, i) => (
            <Field key={i} name={f.name} value={f.value} tone={f.muted ? 'muted' : undefined} wrap={f.wrap} />
          ))}
        </Stack>
      )}
      {some(c.tiles) && (
        <Row gap={6} align="end">
          {c.tiles.map((t, i) => (
            <Placeholder key={i} w={t.w} h={t.h} ratio={t.ratio} caption={t.caption} badge={t.badge} selected={t.selected} dim={t.dim} inset={t.inset?.length === 4 ? (t.inset as [number, number, number, number]) : undefined}>
              {t.label}
            </Placeholder>
          ))}
        </Row>
      )}
      {some(c.sliders) && (
        <Stack gap={4}>
          {c.sliders.map((sl, i) => (
            <Slider key={i} label={sl.label} min={sl.min} max={sl.max} value={sl.value ?? sl.min ?? 0} unit={sl.unit} />
          ))}
        </Stack>
      )}
      {some(c.checks) && (
        <Stack gap={2}>
          {c.checks.map((ch, i) => (
            <Checkbox key={i} label={ch.label} value={Boolean(ch.checked)} />
          ))}
        </Stack>
      )}
      {some(c.inputs) && (
        <Stack gap={4}>
          {c.inputs.map((inp, i) => (
            <TextInput key={i} label={inp.label} value={inp.value ?? ''} placeholder={inp.placeholder} />
          ))}
        </Stack>
      )}
      {inline && (
        <Row gap={6}>
          <Inline c={c} />
        </Row>
      )}
      {c.table && <Table headers={c.table.headers} rows={c.table.rows} dense />}
      {c.note && <Text size="sm" tone="muted">{c.note}</Text>}
      {c.blocks?.map((b, i) => (
        <Content key={`block-${i}`} c={b} />
      ))}
    </>
  );
}

/** A region; one with no number, label or status draws no border, and stacks what's in it into one column. */
function RegionView({ r }: { r: RegionData }) {
  const inner = r.regions?.map((sub, i) => <RegionView key={`region-${i}`} r={sub} />);
  const body = (
    <Stack gap={r.n != null || r.label || r.status || r.dashed ? 6 : 8}>
      <Content c={r} />
      {inner}
    </Stack>
  );
  if (r.n == null && !r.label && !r.status && !r.dashed) return body;
  return (
    <Region n={r.n} label={r.label} status={r.status} dashed={r.dashed} grow={r.grow}>
      {body}
    </Region>
  );
}

/** A screen drawn from its data: its frame, its columns and the regions on them. */
function Drawing({ d }: { d: DrawingData }) {
  const regions = (d.regions ?? []).map((r, i) => <RegionView key={i} r={r} />);
  const toolbar = d.toolbar ? (
    <>
      <Inline c={d.toolbar} />
      {d.toolbar.text && <Text as="span" size="sm" tone="secondary">{d.toolbar.text}</Text>}
    </>
  ) : undefined;
  const toolbarEnd = d.toolbarEnd ? (
    <>
      {d.toolbarEnd.text && <Text as="span" size="sm" tone="secondary">{d.toolbarEnd.text}</Text>}
      <Inline c={d.toolbarEnd} />
    </>
  ) : undefined;
  if (some(d.above) || some(d.below)) {
    return (
      <Wireframe frame={d.frame} toolbar={toolbar} toolbarEnd={toolbarEnd} caption={d.caption} gap={d.gap}>
        {d.above?.map((r, i) => <RegionView key={`above-${i}`} r={r} />)}
        {d.columns ? (
          <Wireframe frame="none" columns={d.columns} gap={d.gap}>
            {regions}
          </Wireframe>
        ) : (
          regions
        )}
        {d.below?.map((r, i) => <RegionView key={`below-${i}`} r={r} />)}
      </Wireframe>
    );
  }
  return (
    <Wireframe frame={d.frame} toolbar={toolbar} toolbarEnd={toolbarEnd} caption={d.caption} columns={d.columns} gap={d.gap}>
      {regions}
    </Wireframe>
  );
}

/** A screen's drawings, phones that follow one another side by side, each with its notes; `custom` draws those it has by their id. */
function Drawings({ list, custom }: { list: DrawingData[]; custom?: Record<string, ReactNode> }) {
  const draw = (d: DrawingData, key?: number) => (d.id && custom?.[d.id] !== undefined ? <Stack key={key}>{custom[d.id]}</Stack> : <Drawing key={key} d={d} />);
  const groups: DrawingData[][] = [];
  for (const d of list) {
    const last = groups[groups.length - 1];
    if (d.frame === 'phone' && last?.[0].frame === 'phone' && !d.title) last.push(d);
    else groups.push([d]);
  }
  return (
    <Stack gap={22}>
      {groups.map((g, i) => {
        const notes = g.flatMap((d) => d.notes ?? []);
        return (
          <Stack key={i} gap={14}>
            {(g[0].title || g[0].summary) && (
              <Stack gap={4}>
                {g[0].title && <Heading level={3}>{g[0].title}</Heading>}
                {g[0].summary && <Text tone="secondary" size="sm">{g[0].summary}</Text>}
              </Stack>
            )}
            {g.length > 1 ? (
              <Row gap={18} align="start">
                {g.map((d, j) => draw(d, j))}
              </Row>
            ) : (
              draw(g[0])
            )}
            {notes.length > 0 && <Notes items={notes} columns={g[0].notesColumns} />}
          </Stack>
        );
      })}
    </Stack>
  );
}

type TableData = NonNullable<Screen['tables']>[number];
type SectionData = NonNullable<Screen['sections']>[number];

function TableView({ t }: { t: TableData }) {
  return (
    <Stack gap={8}>
      {t.title && <Heading level={3}>{t.title}</Heading>}
      {t.text && <Text tone="secondary" size="sm">{t.text}</Text>}
      <Table headers={t.headers} rows={t.rows.map((row) => row.map((cell) => (isStatus(cell) ? <Status status={cell} /> : cell)))} />
      {t.note && <Text tone="muted" size="sm">{t.note}</Text>}
    </Stack>
  );
}

function SectionView({ sec }: { sec: SectionData }) {
  return (
    <Stack gap={8}>
      <Heading level={3}>{sec.title}</Heading>
      <Markdown>{sec.text}</Markdown>
    </Stack>
  );
}

function ScreenTab({ screen, drawings }: { screen: Screen; drawings?: Record<string, ReactNode> }) {
  const drawing = drawings?.[screen.id];
  return (
    <Stack gap={18}>
      <Stack gap={6}>
        <Heading level={2}>{screen.title ?? screen.name}</Heading>
        {screen.summary && <Text tone="secondary">{screen.summary}</Text>}
      </Stack>
      {drawing ?? (some(screen.drawings) && <Drawings list={screen.drawings} custom={drawings} />)}
      {some(screen.notes) && <Notes items={screen.notes} columns={screen.notesColumns} />}
      {screen.tables?.map((t, i) => (
        <TableView key={i} t={t} />
      ))}
      {screen.sections?.map((sec) => (
        <SectionView key={sec.title} sec={sec} />
      ))}
    </Stack>
  );
}

function OverviewTab({ data, open, used }: { data: Wireframes; open: number; used: WireframeStatus[] }) {
  const meanings = Object.fromEntries(used.map((s) => [s, data.statuses?.[s]?.meaning ?? MEANINGS[s]]));
  return (
    <Stack gap={22}>
      {(data.overview?.title || data.overview?.text) && (
        <Stack gap={6}>
          {data.overview.title && <Heading level={2}>{data.overview.title}</Heading>}
          {data.overview.text && <Text tone="secondary">{data.overview.text}</Text>}
        </Stack>
      )}
      {some(data.flow) && (
        <Grid min={170} gap={10} style={{ alignItems: 'stretch' }}>
          {data.flow.map((f, i) => (
            <Panel key={f.title} className="at-wf-card">
              <Stack gap={6}>
                <Row gap={6} wrap={false}>
                  <Marker n={i + 1} />
                  <Text size="sm" weight="medium">{f.title}</Text>
                </Row>
                <Text tone="secondary" size="sm">{f.text}</Text>
                <Status status={f.status} />
              </Stack>
            </Panel>
          ))}
        </Grid>
      )}
      <Grid columns="minmax(0, 1.2fr) minmax(0, 1fr)" gap={24}>
        <Stack gap={10}>
          {some(data.principles) && (
            <>
              <Heading level={3}>{data.principlesTitle ?? 'What makes it work'}</Heading>
              <Stack gap={8}>
                {data.principles.map((p) => (
                  <Grid key={p.title} columns="10px minmax(0, 1fr)" gap={8}>
                    <Text tone="muted" size="sm">•</Text>
                    <Text size="sm">
                      <Text as="span" size="sm" weight="medium">{`${p.title}.`}</Text> <Text as="span" tone="secondary" size="sm">{p.text}</Text>
                    </Text>
                  </Grid>
                ))}
              </Stack>
            </>
          )}
        </Stack>
        <Stack gap={10}>
          <Heading level={3}>Reading these wireframes</Heading>
          <Text tone="secondary" size="sm">{data.reading ?? READING}</Text>
          <StatusLegend meanings={meanings} />
          {open > 0 && (
            <Panel className="at-wf-callout">
              <Stack gap={2}>
                <Text size="sm" weight="medium">{open === 1 ? 'A question for you' : `${open} questions for you`}</Text>
                <Text size="sm" tone="secondary">The Questions tab lists the choices these wireframes leave open. Your answers decide how the parts still to come are built.</Text>
              </Stack>
            </Panel>
          )}
        </Stack>
      </Grid>
      {data.overview?.tables?.map((t, i) => (
        <TableView key={i} t={t} />
      ))}
      {data.overview?.sections?.map((sec) => (
        <SectionView key={sec.title} sec={sec} />
      ))}
    </Stack>
  );
}

/** Your answer to a question: one of its options, or something else, with a note, sent under `form:question:` and its id. */
function Answer({ q }: { q: Question }) {
  const options = [...(q.options ?? []).map((_, i) => String.fromCharCode(65 + i)), 'Something else'].map((label) => ({ value: label.length === 1 ? label : 'other', label }));
  return (
    <Form
      name={`question:${q.id}`}
      validate={(v): Record<string, string> => (v.option || String(v.note ?? '').trim() ? {} : { option: 'Pick one, or say what you would like' })}
      submitLabel="Send my answer"
    >
      <Radio name="option" label="Your answer" options={options} />
      <TextArea name="note" rows={2} placeholder="Why, or what you'd like instead (optional)" />
    </Form>
  );
}

function QuestionsTab({ questions, intro }: { questions: Question[]; intro?: string }) {
  const open = questions.filter((q) => !q.answer);
  const answered = questions.filter((q) => q.answer);
  return (
    <Stack gap={18}>
      {open.length > 0 && (
        <Stack gap={6}>
          <Heading level={2}>What these wireframes leave for you</Heading>
          <Text tone="secondary">{intro ?? "Each changes parts that aren't built yet, or a default. Answer here, or say which you'd like and anything you'd change on the other tabs."}</Text>
        </Stack>
      )}
      {open.map((q, i) => (
        <Stack key={q.id} gap={14}>
          <Grid columns="18px minmax(0, 1fr)" gap={10}>
            <Marker n={i + 1} />
            <Stack gap={6}>
              <Text weight="medium">{q.title}</Text>
              {q.now && <Text tone="secondary" size="sm">{q.now}</Text>}
              {some(q.options) && (
                <Stack gap={3}>
                  {q.options.map((o, j) => (
                    <Text key={j} size="sm">
                      <Text as="span" tone="muted" size="sm">{`${String.fromCharCode(65 + j)}. `}</Text>
                      {o}
                    </Text>
                  ))}
                </Stack>
              )}
              {q.lean && <Text tone="muted" size="sm">{`My lean: ${q.lean}`}</Text>}
              <Answer q={q} />
            </Stack>
          </Grid>
          <Divider />
        </Stack>
      ))}
      {answered.length > 0 && (
        <Stack gap={8}>
          <Heading level={3}>Answered</Heading>
          {answered.map((q) => (
            <Text key={q.id} size="sm">
              <Text as="span" size="sm" weight="medium">{q.title}</Text> <Text as="span" tone="secondary" size="sm">{q.answer}</Text>
            </Text>
          ))}
        </Stack>
      )}
    </Stack>
  );
}

/**
 * How many regions are in each status: one for each note, or each numbered
 * region of a drawing on a screen with no notes at all.
 */
function counts(data: Wireframes): Partial<Record<WireframeStatus, number>> {
  const out: Partial<Record<WireframeStatus, number>> = {};
  const add = (s?: WireframeStatus) => s && (out[s] = (out[s] ?? 0) + 1);
  const walk = (r: RegionData) => {
    if (r.n != null) add(r.status);
    r.regions?.forEach((x) => walk(x as RegionData));
  };
  for (const screen of data.screens) {
    const drawings = screen.drawings ?? [];
    const noted = some(screen.notes) || drawings.some((d) => some(d.notes));
    screen.notes?.forEach((n) => add(n.status));
    for (const d of drawings) {
      if (some(d.notes)) d.notes.forEach((n) => add(n.status));
      else if (!noted) [...(d.above ?? []), ...(d.regions ?? []), ...(d.below ?? [])].forEach(walk);
    }
  }
  return out;
}

/** The statuses the canvas uses anywhere: its regions and notes, its steps and its tables. */
function usedStatuses(data: Wireframes, counted: Partial<Record<WireframeStatus, number>>): WireframeStatus[] {
  const seen = new Set<WireframeStatus>(Object.keys(counted) as WireframeStatus[]);
  data.flow?.forEach((f) => seen.add(f.status));
  for (const t of [...data.screens.flatMap((sc) => sc.tables ?? []), ...(data.overview?.tables ?? [])]) for (const row of t.rows) for (const cell of row) if (isStatus(cell)) seen.add(cell);
  const used = STATUS_ORDER.filter((s) => seen.has(s));
  return used.length ? used : STATUS_ORDER;
}

/**
 * The wireframes template's view. A custom canvas can draw a screen itself
 * with `drawings`, by the screen's id, and add `tabs` before Questions.
 */
export function WireframesView({ data, drawings, tabs: extra }: { data: Wireframes; drawings?: Record<string, ReactNode>; tabs?: Tab[] }) {
  const labels = Object.fromEntries(STATUS_ORDER.flatMap((s) => (data.statuses?.[s]?.label ? [[s, data.statuses[s]!.label!]] : [])));
  const questions = data.questions ?? [];
  const open = questions.filter((q) => !q.answer);
  const counted = counts(data);
  const used = usedStatuses(data, counted);
  const tabs: Tab[] = [
    { id: 'overview', label: 'Overview', content: <OverviewTab data={data} open={open.length} used={used} /> },
    ...data.screens.map((screen) => ({ id: screen.id, label: screen.name, content: <ScreenTab screen={screen} drawings={drawings} /> })),
    ...(extra ?? []),
    ...(questions.length ? [{ id: 'questions', label: 'Questions', badge: open.length || undefined, content: <QuestionsTab questions={questions} intro={data.questionsIntro} /> }] : []),
  ];
  return (
    <StatusLabels.Provider value={labels}>
      <Stack gap={18} className="at-wf-page">
        <Stack gap={6}>
          <Heading level={1} info={<Updated at={data.updated} />}>{data.title}</Heading>
          <Text tone="secondary">{data.intro}</Text>
          <StatusLegend counts={counted} shown={used} />
          <Links links={data.links} />
        </Stack>
        <Tabs tabs={tabs} />
      </Stack>
    </StatusLabels.Provider>
  );
}

import { BarChart, DonutChart, Gallery, LineChart, Markdown, Panel, Stack, Stat, Stats, Table, Text } from '../../packages/kit/src/index.ts';
import { Header, Links, Updated, some } from '../shared.tsx';
import type { Report } from './schema.ts';

type Section = Report['sections'][number];

function ReportSection({ section, n }: { section: Section; n: number }) {
  return (
    <Panel title={`${n}. ${section.title}`}>
      <Stack gap={12}>
        {section.body && <Markdown>{section.body}</Markdown>}
        {section.bars && <BarChart {...section.bars} />}
        {section.lines && <LineChart {...section.lines} />}
        {section.donut && <DonutChart {...section.donut} />}
        {section.table && <Table headers={section.table.headers} rows={section.table.rows} />}
        {some(section.images) && <Gallery images={section.images} columns={Math.min(3, section.images.length)} />}
      </Stack>
    </Panel>
  );
}

export function ReportView({ data }: { data: Report }) {
  return (
    <Stack gap={14}>
      <Header title={data.title} info={data.period ?? <Updated at={data.updated} />}>
        <Text>{data.summary}</Text>
      </Header>
      {some(data.stats) && (
        <Stats>
          {data.stats.map((s) => (
            <Stat key={s.label} {...s} />
          ))}
        </Stats>
      )}
      {data.sections.map((section, i) => (
        <ReportSection key={section.title} section={section} n={i + 1} />
      ))}
      {some(data.sources) && (
        <Panel title="Sources">
          <Links links={data.sources} />
        </Panel>
      )}
    </Stack>
  );
}

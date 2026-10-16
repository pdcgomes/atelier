import { BarChart, Chip, Grid, Heatmap, LineChart, Meter, Panel, Region, Row, SideList, Sparkline, Stack, Stat, Table, Text, Wireframe } from "atelier";
import { Wireframes, type WireframesData } from "atelier/templates";

export const meta = { title: "Charts across Tally: wireframes", theme: "cursor" };

type Note = { n: number; title: string; text: string; status: "built" | "building" | "planned" | "later" | "you" };

// ---------------------------------------------------------------- the notes

const MONTH_NOTES: Note[] = [
  {
    n: 1,
    title: "The month as steps",
    text: "Paid spend as solid steps; each renewal still to come a dashed step labelled on its date; top-ups and usage a band; the budget a line labelled at the left. The sentence says “about on budget, ±£24” when the gap sits inside the band. It needs a forecast for usage-billed services (Vercel and Neon overages, TURN relays) at their last fortnight's pace, which the plan promises and the code doesn't do yet.",
    status: "built",
  },
  { n: 2, title: "Budgets by group", text: "One bar per group with a budget: spent, committed, the forecast's range and the budget tick. Group budgets are loaded today but not drawn.", status: "built" },
  { n: 3, title: "Needs you", text: "Unchanged, and the only place amber appears on the page.", status: "built" },
  {
    n: 4,
    title: "Three figures",
    text: "The stat strip keeps three: committed a month, variable so far, and the run rate with its twelve-month line. Credit runway is in Needs you when it matters; agent value moves to Agents.",
    status: "built",
  },
  {
    n: 5,
    title: "What would change the bill",
    text: "Worth a look as bars: each suggestion typed, sized by what it's worth, pounds a month in ink where it's money, share of a busy week in grey where it's capacity. Each opens its card; the sentences move into the card.",
    status: "built",
  },
  { n: 6, title: "Limits", text: "As now, with a tick where an even pace would be today and the reset time at the end of the bar.", status: "built" },
  {
    n: 7,
    title: "Twelve months back, three ahead",
    text: "Committed and variable in two tones, the three months ahead outlined, the budget a line and 1 November marked. A month's bar opens its bridge from the month before.",
    status: "built",
  },
  { n: 8, title: "Why this month differs", text: "On demand from a month's bar: last month's total, each service's change as a step, this month's forecast.", status: "built" },
  { n: 9, title: "Coming up", text: "The list of the next 30 days, as now, with a rule at the month's end where the budget resets.", status: "built" },
  { n: 10, title: "Projects", text: "The table with its six-month lines, unchanged; Agents this week moves to the Agents page.", status: "built" },
];

const PLAYBOOK_NOTES: Note[] = [
  {
    n: 1,
    title: "The headline, as a sentence",
    text: "In the unit that changes: share of a busy week the flagged habits use, the commits that would buy, and pounds only when it changes a plan or extra usage. List-price dollars sit under it, labelled.",
    status: "built",
  },
  {
    n: 2,
    title: "This week, try",
    text: "Three actions picked from the flagged habits, each a line, its expected effect and Trying it. A try is dated, and the date is marked on that habit's trend so you can see whether it worked. Needs a small table of tries.",
    status: "built",
  },
  {
    n: 3,
    title: "What each habit frees",
    text: "One bar per habit in share of a busy week, the halving assumption written under it. Idle and cache figures no longer overlap, so the bars add up; the total is the headline's.",
    status: "built",
  },
  {
    n: 4,
    title: "Where the waste is",
    text: "A row per project, a column per habit, each cell the waste as share of a busy week with the raw figure under it; ink tints, ▲ where worse than your average, totals at the ends. Hidden on phones, where the tiles carry it.",
    status: "built",
  },
  { n: 5, title: "A tile per habit", text: "The same tile wherever a habit appears: name, figure and which way is better, its spark in ink, what fixing it frees, its top fix.", status: "built" },
  {
    n: 6,
    title: "An opened habit",
    text: "A full-width panel under the tiles (?habit=rewrites): each project's line over eight weeks with your tries marked, and the practices as a ranked checklist; why and sources open from each.",
    status: "built",
  },
];

const AGENTS_NOTES: Note[] = [
  {
    n: 1,
    title: "Work against what the plan holds",
    text: "Each week's Claude work at list prices; only the part above the plan is drawn dark. While capacity is assumed it's a band from half to twice (sensitivity() already computes it), becoming a line once readings measure it. Labels on the first and last weeks only, so it fits a phone.",
    status: "built",
  },
  {
    n: 2,
    title: "What a budget buys, as steps",
    text: "Monthly pounds along a real pounds axis, the share of a busy week kept up the side. Plan-only steps solid, steps that buy extra usage shaded, so extra usage can be weighed against the next tier; your agent budget a vertical line.",
    status: "built",
  },
  { n: 3, title: "Use this in the forecast", text: "Choosing a step sets the plans the Overview's months ahead are forecast on, so November's bill follows the decision.", status: "built" },
  {
    n: 4,
    title: "Agent value, honestly labelled",
    text: "Moved from the Overview: each week's use as a share of each plan, the limit at 100%; work per pound kept as a small figure marked “at list prices, not money spent”.",
    status: "built",
  },
  { n: 5, title: "Habits", text: "The same habit tiles as the Playbook, each opening its habit there.", status: "built" },
  { n: 6, title: "Capacity table and habits by project", text: "The tables stay below the charts, for the figures behind them.", status: "built" },
];

const DRILL_NOTES: Note[] = [
  {
    n: 1,
    title: "A project's months by service",
    text: "Six months of the project's costs: direct charges solid, its share of shared plans hatched and labelled “share of Max by work at list prices”, since that share rises when other projects go quiet.",
    status: "built",
  },
  { n: 2, title: "Agent work", text: "Where its agent money goes and its habits, now drawn with the shared habit tiles.", status: "built" },
  {
    n: 3,
    title: "Services, sorted",
    text: "Horizontal bars of this month's pounds, largest first, each with a six-month spark on one shared scale, so a one-off renewal doesn't look as big as Claude.",
    status: "built",
  },
  {
    n: 4,
    title: "The Ledger's month",
    text: "A bar per day split by status (confirmed, expected, not recognised), committed and variable in two tones; a bar filters the table to that day (question 5).",
    status: "built",
  },
];

const ACROSS_NOTES: Note[] = [
  {
    n: 1,
    title: "One chart kit",
    text: "The charts in src/ui/charts.tsx gain steps, bands, a bridge and horizontal bars, with labels drawn in HTML over the SVG so they stay readable at phone width.",
    status: "built",
  },
  {
    n: 2,
    title: "Show as table",
    text: "Each chart has a <desc> with its sentence and a Show as table under it (a details element, no JavaScript), for screen readers and for checking figures.",
    status: "built",
  },
  { n: 3, title: "Too little data", text: "No forecast band before five days of the month, no trend before three weeks, no grid before two projects; a faint outline says when it will appear.", status: "built" },
  { n: 4, title: "Contrast", text: "--muted is darkened to pass 4.5:1 on panels for captions under 12px, and text on amber stays dark rather than white.", status: "built" },
  {
    n: 5,
    title: "Phones",
    text: "Order: the month, Needs you, what would change the bill, then the rest. Tiles stack as rows; the waste grid is left to the tiles; week charts label the first and last weeks.",
    status: "built",
  },
  {
    n: 6,
    title: "Drill-downs are links",
    text: "Bars, tiles and grid cells are links or buttons with visible focus and aria-expanded, so a keyboard can open everything a pointer can.",
    status: "built",
  },
];

// ---------------------------------------------------------------- the data

const data: WireframesData = {
  title: "Charts across Tally: wireframes",
  intro:
    "A picture first on every page, the words a click away. Revised after a financial review and a UX review, approved and built on 11 October (4c1f9d2). Drawn from its loaders and the sample month.",
  updated: "2026-10-16T09:30:00+01:00",
  overview: {
    tables: [
      {
        title: "What the reviews changed",
        text: "A financial review and a UX review read the first draft independently. Where they agreed, the change is made; where they differed, it's a question.",
        headers: ["Review", "Found", "Now"],
        rows: [
          ["Financial", "The forecast's straight line hid the £110 renewal on the 17th and showed no range", "Steps per renewal, a band for estimates, a committed floor; the header says “about on budget, ±£X”"],
          ["Financial and UX", "The Playbook's “$1,240 possible saving” read as cash on a flat plan", "Leads with share of a busy week freed; pounds only where a plan or extra usage changes"],
          ["Financial", "Nothing showed November's switch or any month past this one", "Spend by month carries on three months ahead, committed and variable, with the budget line"],
          ["UX", "The Overview's main ask, what could be saved, was still text", "Worth a look becomes bars by what each is worth, typed, each opening its card"],
          ["UX", "The Overview grew to eleven panels", "Four rows: the month, savings and limits, months and coming up, projects; agent value moves to Agents"],
          ["Financial", "The donut mixed spent and forecast and repeated the month bars", "Cut; the month's change is a bridge from last month, opened from the month bars"],
          ["Financial", "Group budgets were loaded but never drawn", "A bar per group under the burn-up: spent, committed, forecast, budget"],
          ["Financial and UX", "The budget curve sat on an uneven axis, the budget a horizontal line", "A step chart on a pounds axis, your budget a vertical line, extra-usage steps shaded"],
          ["Financial and UX", "Assumed plan capacity was drawn as exact lines", "Bands from half to twice until readings measure it; only the work above a plan is coloured"],
          ["UX", "Amber everywhere; the agents colour is the accent orange, near danger", "Ink tints for the grid with ▲ marks; amber only for Needs you items (and a question on the agents colour)"],
          ["UX", "Opened cards would be the same wall of text", "This week, try: three actions; an opened habit is a panel of per-project lines and a checklist"],
          ["UX", "Hover-only labels, no text for screen readers, thin data", "Drawn labels, a table behind each chart, thresholds before trends and forecasts show"],
        ],
      },
    ],
  },
  reading:
    "Boxes are regions, numbers point to the notes under each wireframe, dashed boxes show on demand. Figures are illustrative, close to the sample month's; the charts show shapes, not your data. Every region says where it stands:",
  statuses: {
    built: { label: "Built", meaning: "In the app today, drawn so the new charts can be seen beside it." },
    building: { label: "Being built", meaning: "An agent is building it now." },
    planned: { label: "Planned", meaning: "From data Tally loads or can derive; not built yet." },
    later: { label: "Later", meaning: "After this pass." },
    you: { label: "Waits on you", meaning: "Waiting on an answer in Questions." },
  },
  flow: [
    { title: "See the month", text: "Spend as steps against the budget: what's paid, what's committed, and the range of what's still uncertain.", status: "built" },
    { title: "See what would change the bill", text: "Suggestions as bars by what they're worth, in pounds a month where it's money and in capacity where it isn't.", status: "built" },
    { title: "See the months ahead", text: "Spend by month carries on three months forward, committed and variable, so November's switch shows.", status: "built" },
    { title: "Try a change", text: "The Playbook names three things to try this week; a try is marked on its habit's trend line.", status: "built" },
    { title: "Check the detail", text: "A project, service or month of the Ledger has its chart above its rows, and every chart has a table behind it.", status: "built" },
  ],
  principles: [
    {
      title: "Three units, never mixed",
      text: "Pounds for money paid or committed; share of a plan's capacity for habits on a flat plan; list-price dollars only as a labelled second figure, never on an axis beside pounds.",
    },
    { title: "Committed before variable", text: "Every money chart splits subscriptions you're committed to from usage and top-ups, the part habits and caps can move." },
    { title: "Steps, not slopes", text: "Money lands on renewal days, so cumulative spend is drawn as steps with each renewal labelled, and estimates as a range." },
    { title: "Assumptions look like assumptions", text: "Capacity that isn't measured yet is a band from half to twice, turning into a line once readings measure it." },
    {
      title: "Colour carries meaning",
      text: "Categories of spend, habits, kinds of suggestion and states of money each keep one colour on every chart and table; amber and red stay for what needs you, and a cell worse than your average gets a ▲ as well as its tint.",
    },
    {
      title: "Readable without hover",
      text: "Labels are drawn, not hidden in tooltips; each chart carries its sentence and a Show as table behind it, and a chart with too little data waits rather than guessing.",
    },
  ],
  screens: [
    {
      id: "month",
      name: "The month",
      title: "The month at a glance",
      summary: "Four rows in reading order: the month and what needs you; what would change the bill and the limits; the months either side and what's coming; then projects.",
      notes: MONTH_NOTES,
    },
    {
      id: "playbook",
      name: "Playbook",
      title: "The Playbook",
      summary: "It opens on what the habits cost you in capacity and three things to try; the practices' text sits in an opened habit, behind each step.",
      notes: PLAYBOOK_NOTES,
    },
    {
      id: "agents",
      name: "Agents",
      summary: "The capacity table and the budget panel become two charts that make November's decision, with the tables kept below for the figures.",
      notes: AGENTS_NOTES,
    },
    {
      id: "drill",
      name: "Projects, services, Ledger",
      title: "Projects, services and the Ledger",
      summary: "Each detail page gets one chart above its rows, so the shape comes before the figures.",
      notes: DRILL_NOTES,
    },
    {
      id: "across",
      name: "Across every page",
      summary: "What the reviews asked of every chart, whichever page it's on.",
      notes: ACROSS_NOTES,
    },
  ],
  questionsIntro: "Each changes how the charts are built. Say which you'd like, or anything you'd change on the other tabs.",
  questions: [
    {
      id: "burn-up-header",
      title: "Does the burn-up replace the budget bar in the header?",
      now: "Both reviews agree, provided it's drawn as steps with renewals labelled and estimates as a range.",
      options: ["Replace the bar with the stepped burn-up, the sentence above it saying “about on budget, ±£X” when the gap is inside the range", "Keep the bar and put the burn-up in a panel below"],
      lean: "Replace it: it answers the same question, shows the renewal still to land, and fixes the labels that collide today.",
      answer: "Replace the bar with the stepped burn-up. Direction approved on 11 October, going with the lean.",
    },
    {
      id: "opened-habit",
      title: "How does an opened Playbook habit show?",
      now: "Drawn as a full-width panel under the row of cards, with ?habit= in the address so the Overview and Agents can link straight to it.",
      options: ["A full-width panel under the cards on a wide screen, opening in place on a phone", "The card growing in place everywhere"],
      lean: "The panel: a card growing in a row of five makes the row jump, and a link that opens one habit is useful from other pages.",
      answer: "A full-width panel under the tiles, opening in place on a phone. Direction approved on 11 October, going with the lean.",
    },
    {
      id: "one-suggestion",
      title: "Do Worth a look and the Playbook's habits become one kind of suggestion?",
      now: "They overlap today: the Overview's “Cut the re-writes after a pause” is also the Playbook's first habit.",
      options: ["One suggestion with a type (plan fit, habit, idle spend, spend change) and what it's worth, shown on both pages", "Keep them apart: Worth a look for money, the Playbook for habits"],
      lean: "One kind: the Overview's savings bars and the Playbook's cards then show the same figures and open the same card.",
      answer: "One kind of suggestion, shown on both pages. Direction approved on 11 October, going with the lean.",
    },
    {
      id: "agents-colour",
      title: "Should the agents category stop using the accent orange?",
      now: "Agents, the biggest category, is drawn in --c-agents, the same hue as the accent and close to danger red, so the largest bar looks like a warning.",
      options: ["Move agents to a deep teal from Plinth's range, keeping orange for the accent", "Keep it, and rely on amber appearing only for Needs you items"],
      lean: "Move it: the reviews found the largest bar on every chart read as something wrong.",
      answer: "Move agents to a deep teal from Plinth's range. Direction approved on 11 October, going with the lean.",
    },
    {
      id: "ledger-month",
      title: "The Ledger's month: bars by status or the burn-up again?",
      now: "The reviewers differ: the Ledger is for checking charges (financial) and its chart shouldn't need two axes (UX).",
      options: ["A bar per day, split by status (confirmed, expected, not recognised), committed and variable in two tones", "The Overview's stepped burn-up with a tick per charge"],
      lean: "Bars by status: the Ledger's job is checking charges, and a second burn-up repeats the Overview.",
      answer: "Bars per day split by status. Direction approved on 11 October, going with the lean.",
    },
    {
      id: "chart-kit",
      title: "Hand-drawn charts or a chart library?",
      now: "Tally draws server-rendered SVG in the palette; the revisions need steps, bands, a bridge and HTML labels on top.",
      options: ["Keep drawing them, as one small kit in src/ui/charts.tsx with drawn labels and a table fallback", "Add a library (Recharts or visx), installed from your own terminal"],
      lean: "Keep drawing them: no dependency, no client JavaScript for static charts, and dark mode already works.",
      answer: "Keep drawing them, as one small kit. Direction approved on 11 October, going with the lean.",
    },
  ],
};

// ---------------------------------------------------------------- shared pieces

const WEEKS = ["17 Aug", "24 Aug", "31 Aug", "7 Sep", "14 Sep", "21 Sep", "28 Sep", "5 Oct"];

/** The page's name and what it covers, in the window's toolbar. */
function PageHead({ title, detail }: { title: string; detail: string }) {
  return (
    <>
      <Text as="span" weight="bold">
        {title}
      </Text>
      <Text as="span" size="sm" tone="muted">
        {detail}
      </Text>
    </>
  );
}

/** A habit, the same everywhere: its name, figure with the better direction, an eight-week spark, what fixing it frees, and its top fix. */
function HabitTile({ name, figure, better, trend, frees, fix, open }: { name: string; figure: string; better: "↑" | "↓"; trend: number[]; frees: string; fix: string; open?: boolean }) {
  return (
    <Panel title={name} focus={open} padding={8}>
      <Stack gap={4}>
        <Row gap={8} align="end" justify="between" wrap={false}>
          <Text size="lg" weight="bold">
            {figure}
            <Text as="span" size="sm" tone="muted">{`  ${better} better`}</Text>
          </Text>
          <Sparkline title={`${name}, eight weeks`} values={trend} tone="default" width={64} height={20} />
        </Row>
        <Text size="sm" tone="secondary">
          {frees}
        </Text>
        <Text size="sm" tone="muted">{`Top fix: ${fix}`}</Text>
        <Text size="sm" tone="secondary">
          {open ? "▾ Open" : "▸ Open"}
        </Text>
      </Stack>
    </Panel>
  );
}

const HABITS = {
  rewrites: { name: "Re-writes after a pause", figure: "17%", better: "↓" as const, trend: [22, 21, 23, 20, 19, 18, 18, 17], frees: "Frees 13% of a week", fix: "breaks under an hour" },
  opus: { name: "Opus on subagents", figure: "100%", better: "↓" as const, trend: [100, 100, 100, 100, 100, 100, 100, 100], frees: "Frees 6% of a week", fix: "model: sonnet in agents" },
  cache: { name: "Cache hit", figure: "93%", better: "↑" as const, trend: [90, 91, 92, 92, 93, 92, 93, 93], frees: "Frees 2% of a week", fix: "don't switch model mid-task" },
  chats: { name: "Long chats", figure: "8%", better: "↓" as const, trend: [11, 10, 11, 9, 9, 8, 8, 8], frees: "Can't be put in capacity", fix: "/clear between tasks" },
};

// ---------------------------------------------------------------- the month

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const PAID_STEPS: [number, number][] = [
  [1, 0],
  [2, 12],
  [4, 38],
  [7, 71],
  [9, 90],
  [10, 128],
  [11, 146],
];
const RENEWALS: [number, number][] = [
  [11, 146],
  [17, 256],
  [24, 292],
];
const stepAt = (steps: [number, number][], d: number) => steps.filter(([day]) => day <= d).at(-1)?.[1] ?? 0;

/** Cumulative pounds this month as steps: paid, renewals still to come, the high end of the estimates, and the budget. */
function StepBurnUp() {
  const paid = DAYS.map((d) => (d <= 11 ? stepAt(PAID_STEPS, d) : Number.NaN));
  const committed = DAYS.map((d) => (d >= 11 ? stepAt(RENEWALS, d) : Number.NaN));
  const high = DAYS.map((d) => (d >= 11 ? stepAt(RENEWALS, d) + Math.round(((d - 11) / 20) * 48) : Number.NaN));
  return (
    <LineChart
      title="Spent this month, cumulative pounds"
      height={170}
      x={DAYS.map((d) => `${d} Oct`)}
      series={[
        { name: "Paid", values: paid, tone: "default" },
        { name: "Renewals to come", values: committed, tone: "info" },
        { name: "With top-ups and usage, up to", values: high, tone: "muted" },
        { name: "Budget £320", values: DAYS.map(() => 320), tone: "accent" },
      ]}
      caption="Claude Max 5x £110 on the 17th; Cursor Pro+ £36 on the 24th; top-ups and usage could add £0 to £48."
    />
  );
}

/** A group's budget as one bar: spent, committed, the forecast's range; the budget in words. */
function GroupBar({ name, spent, committed, high, budget }: { name: string; spent: number; committed: number; high: number; budget: number }) {
  const max = Math.max(budget, high) * 1.1;
  return (
    <Grid columns="92px minmax(0, 1fr) 96px" gap={8}>
      <Text size="sm">{name}</Text>
      <Meter
        value={high}
        max={max}
        show="none"
        segments={[
          { value: spent, tone: "default", label: `Spent £${spent}` },
          { value: committed - spent, tone: "info", label: `Committed £${committed}` },
          { value: high - committed, tone: "muted", label: `Forecast up to £${high}` },
        ]}
      />
      <Text size="sm" tone="secondary">{`£${committed} of £${budget}`}</Text>
    </Grid>
  );
}

type Saving = { type: string; title: string; worth: string; size: number; capacity?: boolean };

const SAVINGS: Saving[] = [
  { type: "Plan fit", title: "Cursor Pro holds a typical month", worth: "£18 a month", size: 100 },
  { type: "Idle spend", title: "Let tidepool-demo.dev lapse", worth: "£1 a month", size: 6 },
  { type: "Habit", title: "Halve the re-writes after a pause", worth: "13% of a week", size: 70, capacity: true },
  { type: "Habit", title: "Sonnet on subagents", worth: "6% of a week", size: 35, capacity: true },
];

/** Suggestions as bars by what each is worth: pounds a month where it's money, capacity where it isn't. */
function SavingBars() {
  return (
    <Stack gap={5}>
      {SAVINGS.map((s) => (
        <Grid key={s.title} columns="minmax(0, 1.3fr) minmax(0, 1fr) 84px" gap={8}>
          <Stack gap={0}>
            <Text size="sm" tone="muted">
              {s.type}
            </Text>
            <Text size="sm" truncate>
              {s.title}
            </Text>
          </Stack>
          <Meter value={s.size} show="none" tone={s.capacity ? "muted" : "default"} />
          <Text size="sm" tone="secondary">
            {s.worth}
          </Text>
        </Grid>
      ))}
    </Stack>
  );
}

const LIMITS: { label: string; now: number; at: number; pace: number; reset: string; warn: boolean }[] = [
  { label: "Weekly limit", now: 74, at: 93, pace: 58, reset: "Wed 07:00", warn: true },
  { label: "Cursor usage pool", now: 38, at: 61, pace: 33, reset: "24 Oct", warn: false },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan"];
const COMMITTED = [48, 48, 55, 55, 62, 62, 68, 68, 80, 224, 246, 246, 246];
const VARIABLE = [10, 58, 12, 16, 18, 20, 24, 28, 52, 92, 60, 60, 60];
const ahead = (i: number) => i >= 10;

function MonthsAhead() {
  return (
    <BarChart
      title="Spend by month, pounds"
      height={170}
      stacked
      categories={MONTHS}
      series={[
        { name: "Committed", values: COMMITTED.map((v, i) => (ahead(i) ? 0 : v)), tone: "default" },
        { name: "Variable", values: VARIABLE.map((v, i) => (ahead(i) ? 0 : v)), tone: "muted" },
        { name: "Committed, forecast", values: COMMITTED.map((v, i) => (ahead(i) ? v : 0)), tone: "info" },
        { name: "Variable, forecast", values: VARIABLE.map((v, i) => (ahead(i) ? v : 0)), tone: "accent" },
      ]}
      caption="Budget £320 a month. Team plans from 1 Nov: November to January forecast at about £306 a month."
    />
  );
}

function Bridge() {
  return (
    <BarChart
      title="From September to October's forecast, pounds"
      horizontal
      categories={["September", "Max 5x", "OpenAI", "Vercel", "Neon", "API top-up", "October"]}
      series={[{ name: "Change", values: [132, 110, 36, 27, 25, -14, 316], tone: "default" }]}
      caption="September £132; Max 5x adds £110, OpenAI £36, Vercel £27 and Neon £25; a smaller API top-up saves £14; October's forecast is £316."
    />
  );
}

function TheMonth() {
  return (
    <Wireframe toolbar={<PageHead title="Overview" detail="October 2026" />} gap={10}>
      <Wireframe frame="none" columns="minmax(0, 1.35fr) minmax(0, 1fr)" gap={10}>
        <Stack gap={8}>
          <Region n={1} label="This month" status="built">
            <Text size="lg" weight="bold">
              £146 spent so far.
            </Text>
            <Text size="sm" tone="secondary">
              £292 committed by the 31st, about on budget (±£24).
            </Text>
            <StepBurnUp />
          </Region>
          <Region n={2} label="Budgets by group" status="built">
            <Stack gap={5}>
              <GroupBar name="Studio" spent={98} committed={205} high={228} budget={230} />
              <GroupBar name="Side projects" spent={48} committed={87} high={112} budget={90} />
              <Text size="sm" tone="muted">
                Spent, committed, then the forecast's range.
              </Text>
            </Stack>
          </Region>
        </Stack>
        <Stack gap={8}>
          <Region n={3} label="Needs you" status="built">
            <SideList
              items={[
                { label: "Claude's weekly limit is nearly used up", tone: "warning" },
                { label: "Side projects are on course to pass their £90", tone: "warning" },
                { label: "Anthropic API credit lasts about 9 more days", tone: "warning" },
                { label: "3 card charges aren't recognised", tone: "muted" },
              ]}
            />
          </Region>
          <Region n={4} label="Three figures" status="built">
            <Grid columns={3} gap={8}>
              <Stat label="Committed a month" value="£224" hint="subscriptions" />
              <Stat label="Variable so far" value="£68" hint="usage and top-ups" />
              <Stack gap={2}>
                <Stat label="Run rate" value="£284" hint="£3,410 a year" />
                <Sparkline title="Spend by month, twelve months" values={[58, 106, 67, 71, 80, 82, 92, 96, 132, 316]} tone="default" width={80} height={18} />
              </Stack>
            </Grid>
          </Region>
        </Stack>
      </Wireframe>
      <Wireframe frame="none" columns="minmax(0, 1.35fr) minmax(0, 1fr)" gap={10}>
        <Region n={5} label="What would change the bill" status="built">
          <SavingBars />
          <Text size="sm" tone="muted">
            Ink: pounds a month off the bill. Grey: share of a busy week freed on the plan you have.
          </Text>
        </Region>
        <Region n={6} label="Limits" status="built">
          <Stack gap={8}>
            {LIMITS.map((l) => (
              <Stack key={l.label} gap={3}>
                <Row gap={6} align="center" justify="between">
                  <Text size="sm" weight="bold">
                    {l.label}
                  </Text>
                  <Text size="sm" tone="muted">{`${l.now}% → ${l.at}%`}</Text>
                </Row>
                <Meter
                  value={l.at}
                  show="none"
                  segments={[
                    { value: l.now, tone: l.warn ? "warning" : "default", label: `Now ${l.now}%` },
                    { value: l.at - l.now, tone: "muted", label: `By the reset ${l.at}%` },
                  ]}
                />
                <Text size="sm" tone="muted">{`Even pace today ${l.pace}% · resets ${l.reset}`}</Text>
              </Stack>
            ))}
          </Stack>
        </Region>
      </Wireframe>
      <Wireframe frame="none" columns="minmax(0, 1.35fr) minmax(0, 1fr)" gap={10}>
        <Stack gap={8}>
          <Region n={7} label="Twelve months back, three ahead" status="built">
            <MonthsAhead />
          </Region>
          <Region n={8} label="Why October differs · opened from its bar" status="built" dashed>
            <Bridge />
          </Region>
        </Stack>
        <Region n={9} label="Coming up" status="built">
          <Table
            dense
            headers={["When", "What", "Pounds"]}
            rows={[
              ["17 Oct", "Claude Max 5x", "£110"],
              ["19 Oct", "Anthropic API top-up, estimate", "£25"],
              ["24 Oct", "Cursor Pro+", "£36"],
              ["— 31 Oct", "October's budget ends", ""],
              ["1 Nov", "Vercel Pro", "£22"],
              ["1 Nov", "Neon Scale", "£19"],
            ]}
          />
        </Region>
      </Wireframe>
      <Region n={10} label="Projects" status="built">
        <Text size="sm" tone="muted">
          The table with six-month lines and Claude share, as now.
        </Text>
      </Region>
    </Wireframe>
  );
}

// ---------------------------------------------------------------- the Playbook

const PROJECTS = ["Kiln", "Plinth", "Bramble", "Signal Desk"];
const WASTE_HABITS = ["Re-writes", "Opus subs", "Cache", "Long chats"];
const WASTE_SHORT = ["Rewr", "Opus", "Cache", "Chats"];
const WASTE: { v: number; raw: string; worse?: boolean }[][] = [
  [{ v: 7, raw: "22%", worse: true }, { v: 4, raw: "100%", worse: true }, { v: 1, raw: "92%" }, { v: 0, raw: "13%", worse: true }],
  [{ v: 3, raw: "17%" }, { v: 2, raw: "75%", worse: true }, { v: 0, raw: "96%" }, { v: 0, raw: "5%" }],
  [{ v: 2, raw: "20%", worse: true }, { v: 0, raw: "0%" }, { v: 1, raw: "90%", worse: true }, { v: 0, raw: "4%" }],
  [{ v: 1, raw: "11%" }, { v: 0, raw: "–" }, { v: 0, raw: "95%" }, { v: 0, raw: "12%", worse: true }],
];

/** Projects against habits: the tints as a heatmap, then each cell's figure, its raw figure with ▲ where worse than your average, and the totals. */
function WasteGrid() {
  const total = (cells: { v: number }[]) => cells.reduce((s, c) => s + c.v, 0);
  return (
    <Stack gap={6}>
      <Grid columns="240px minmax(0, 1fr)" gap={12}>
        <Heatmap title="Waste, share of a week" rows={PROJECTS} columns={WASTE_SHORT} values={WASTE.map((r) => r.map((c) => c.v))} unit="%" tone="default" />
        <Stack gap={4}>
          <Text size="sm" tone="secondary">
            Ink tints: the darker the cell, the more of a busy week that habit wastes in that project.
          </Text>
          <Text size="sm" tone="muted">
            Re-writes after a pause, Opus on subagents, cache misses and long chats; the figures are in the table below.
          </Text>
        </Stack>
      </Grid>
      <Table
        dense
        headers={["", ...WASTE_HABITS, "Total"]}
        rows={[
          ...WASTE.map((r, i) => [PROJECTS[i], ...r.map((c) => `${c.v > 0 ? `${c.v}%` : "·"}  ${c.worse ? "▲ " : ""}${c.raw}`), `${total(r)}%`]),
          ["All", ...WASTE_HABITS.map((_, j) => `${total(WASTE.map((r) => r[j]))}%`), "21%"],
        ]}
      />
    </Stack>
  );
}

function ThePlaybook() {
  return (
    <Wireframe toolbar={<PageHead title="Playbook" detail="checked against Anthropic's and Cursor's docs on 10 Oct" />} gap={10}>
      <Wireframe frame="none" columns="minmax(0, 1fr) minmax(0, 1fr)" gap={10}>
        <Region n={1} label="The headline" status="built">
          <Text size="lg" weight="bold">
            Three habits use about 21% of a busy week.
          </Text>
          <Text size="sm" tone="secondary">
            Fixing them frees room for about 45 more commits a week; with them fixed, a typical week would stay inside Max 5x without extra usage, about £40 a month less.
          </Text>
          <Text size="sm" tone="muted">
            At list prices that work is worth $1,240 over 30 days, not money you'd get back on a flat plan.
          </Text>
        </Region>
        <Region n={2} label="This week, try" status="built">
          <Stack gap={5}>
            {(
              [
                ["Put subagents on Sonnet", "frees about 6% of a week", true],
                ["Breaks under an hour, or /clear first", "fewer re-writes after a pause", false],
                ["Long builds in the background", "subagents stop re-writing", false],
              ] as [string, string, boolean][]
            ).map(([action, effect, trying]) => (
              <Grid key={action} columns="minmax(0, 1fr) auto" gap={6}>
                <Stack gap={0}>
                  <Text size="sm" weight="bold">
                    {action}
                  </Text>
                  <Text size="sm" tone="muted">
                    {effect}
                  </Text>
                </Stack>
                <Chip dim={!trying}>{trying ? "Trying · 8 Oct" : "Try it"}</Chip>
              </Grid>
            ))}
          </Stack>
        </Region>
      </Wireframe>
      <Wireframe frame="none" columns="minmax(0, 0.9fr) minmax(0, 1.3fr)" gap={10}>
        <Region n={3} label="What each habit frees" status="built">
          <BarChart
            title="Share of a busy week freed"
            horizontal
            categories={["Re-writes after a pause", "Opus on subagents", "Cache misses"]}
            series={[{ name: "Share of a busy week freed", values: [13, 6, 2], tone: "default" }]}
            unit="%"
            caption="Re-writes halved, last 30 days."
          />
        </Region>
        <Region n={4} label="Where the waste is" status="built">
          <WasteGrid />
          <Text size="sm" tone="muted">
            Waste as share of a busy week; beside it the project's figure, ▲ worse than your average.
          </Text>
        </Region>
      </Wireframe>
      <Region n={5} label="A tile per habit" status="built">
        <Grid columns={4} gap={8}>
          <HabitTile {...HABITS.rewrites} open />
          <HabitTile {...HABITS.opus} />
          <HabitTile {...HABITS.cache} />
          <HabitTile {...HABITS.chats} />
        </Grid>
      </Region>
      <Region n={6} label="Re-writes after a pause · opened" status="built" dashed>
        <Grid columns="minmax(0, 1fr) minmax(0, 1fr)" gap={12}>
          <LineChart
            title="Re-writes after a pause, by week"
            height={160}
            x={WEEKS}
            series={[
              { name: "Kiln", values: [26, 25, 27, 24, 23, 22, 20, 19] },
              { name: "Bramble", values: [20, 21, 19, 20, 19, 19, 18, 18] },
              { name: "All projects", values: [22, 21, 23, 20, 19, 18, 18, 17], tone: "default" },
              { name: "Target", values: WEEKS.map(() => 10), tone: "muted" },
            ]}
            unit="%"
            caption="Share of each project's agent work spent re-writing after a pause; a try is marked on its date."
          />
          <Stack gap={6}>
            {["Breaks under an hour, or /clear before a longer one", "Short, self-contained subagent tasks", "Keep usage credits off; promptCacheTtl 1h if you use them", "Long builds in the background"].map((practice, i) => (
              <Grid key={practice} columns="16px minmax(0, 1fr) auto" gap={6}>
                <Text size="sm" tone="muted">{`${i + 1}`}</Text>
                <Text size="sm">
                  {practice}
                  <Text as="span" size="sm" tone="muted">
                    {" · ▸ why and sources"}
                  </Text>
                </Text>
                <Chip dim>Claude Code</Chip>
              </Grid>
            ))}
          </Stack>
        </Grid>
      </Region>
    </Wireframe>
  );
}

// ---------------------------------------------------------------- Agents

const WORK = [410, 560, 1050, 830, 1180, 2950, 960, 1090];
const CAPACITY = 1200;
const LADDER_X = Array.from({ length: 37 }, (_, i) => i * 10);
const plansAlone = (e: number) => (e < 20 ? 0 : e < 110 ? 6 : e < 220 ? 34 : 55);
const withExtra = (e: number) => (e < 20 ? 0 : e < 110 ? 6 : e < 160 ? 34 : e < 290 ? 55 : e < 360 ? 78 : 100);

function TheAgents() {
  return (
    <Wireframe toolbar={<PageHead title="Agents" detail="the last eight weeks" />} gap={10}>
      <Wireframe frame="none" columns="minmax(0, 1fr) minmax(0, 1fr)" gap={10}>
        <Region n={1} label="Claude work against what Max 5x holds" status="built">
          <BarChart
            title="Claude work per week, list-price dollars"
            height={170}
            stacked
            categories={WEEKS}
            series={[
              { name: "Within the plan", values: WORK.map((v) => Math.min(v, CAPACITY)), tone: "muted" },
              { name: "Above the plan", values: WORK.map((v) => Math.max(0, v - CAPACITY)), tone: "default" },
            ]}
            caption="Max 5x assumed to hold $1,200 a week, anywhere from $600 to $2,400 until November's readings; only the week of 21 September goes beyond the band."
          />
        </Region>
        <Stack gap={8}>
          <Region n={2} label="What a budget buys" status="built">
            <LineChart
              title="Share of a busy week kept, by monthly pounds"
              height={170}
              area
              x={LADDER_X.map((e) => `£${e}`)}
              series={[
                { name: "Plans alone", values: LADDER_X.map(plansAlone), tone: "default" },
                { name: "With extra usage", values: LADDER_X.map(withExtra), tone: "muted" },
              ]}
              unit="%"
              caption="Pro £20 keeps 6%; Max 5x £110 keeps 34%; Max 5x with £50 of extra usage keeps 55%, as Max 20x at £220 does; £360 keeps all of it. Your agent budget, £150, keeps 34%."
            />
          </Region>
          <Region n={3} label="Use this in the forecast" status="built" dashed>
            <Row gap={6} align="center">
              <Chip>Max 5x · £110</Chip>
              <Text size="sm" tone="muted">
                sets November to January on the Overview
              </Text>
            </Row>
          </Region>
        </Stack>
      </Wireframe>
      <Wireframe frame="none" columns="minmax(0, 1fr) minmax(0, 1fr)" gap={10}>
        <Region n={4} label="Each week as a share of the plan" status="built">
          <BarChart
            title="Share of Max 5x used"
            height={140}
            categories={WEEKS}
            series={[{ name: "Share of Max 5x used", values: [34, 47, 88, 69, 98, 100, 80, 91], tone: "default" }]}
            unit="%"
            caption="Share of the weekly limit used; the limit is 100%. 11× the plan's price in work, at list prices, not money spent."
          />
        </Region>
        <Region n={5} label="Habits" status="built">
          <Grid columns={2} gap={8}>
            <HabitTile {...HABITS.rewrites} />
            <HabitTile {...HABITS.opus} />
          </Grid>
        </Region>
      </Wireframe>
      <Region n={6} label="Capacity table · habits by project" status="built">
        <Text size="sm" tone="muted">
          The tables as now, below the charts that draw them.
        </Text>
      </Region>
    </Wireframe>
  );
}

// ---------------------------------------------------------------- Projects, services and the Ledger

const SERVICES: { name: string; pounds: number; months: number[] }[] = [
  { name: "Claude", pounds: 110, months: [18, 20, 22, 28, 36, 110] },
  { name: "OpenAI", pounds: 52, months: [9, 11, 10, 14, 28, 52] },
  { name: "Cursor", pounds: 36, months: [18, 18, 18, 18, 18, 36] },
  { name: "Vercel", pounds: 27, months: [12, 12, 12, 12, 12, 27] },
  { name: "Neon", pounds: 25, months: [0, 0, 0, 0, 11, 25] },
];

function TheDetail() {
  return (
    <Grid columns="minmax(0, 1fr) minmax(0, 1fr)" gap={12}>
      <Wireframe toolbar={<PageHead title="Kiln" detail="Studio" />} gap={10}>
        <Region n={1} label="Six months by service" status="built">
          <BarChart
            title="Kiln's months, pounds"
            height={170}
            stacked
            categories={["May", "Jun", "Jul", "Aug", "Sep", "Oct"]}
            series={[
              { name: "Share of Claude Max (by work)", values: [8, 10, 12, 26, 52, 78], tone: "muted" },
              { name: "OpenAI, direct", values: [3, 2, 4, 5, 7, 10], tone: "info" },
              { name: "Vercel, direct", values: [0, 0, 0, 0, 0, 4], tone: "accent" },
            ]}
            caption="The Max share is hatched in the app: it's a split of a flat plan by work at list prices."
          />
        </Region>
        <Region n={2} label="Agent work" status="built">
          <Text size="sm" tone="muted">
            Where it goes and its habits, with the shared habit tiles.
          </Text>
        </Region>
      </Wireframe>
      <Stack gap={12}>
        <Wireframe toolbar={<PageHead title="Services" detail="October, largest first" />}>
          <Region n={3} label="Services, sorted" status="built">
            <Stack gap={5}>
              {SERVICES.map((s) => (
                <Grid key={s.name} columns="56px minmax(0, 1fr) 40px 70px" gap={8}>
                  <Text size="sm">{s.name}</Text>
                  <Meter value={s.pounds} max={110} show="none" tone="default" />
                  <Text size="sm">{`£${s.pounds}`}</Text>
                  <Sparkline title={`${s.name}, six months`} values={s.months} tone="default" width={70} height={18} />
                </Grid>
              ))}
              <Text size="sm" tone="muted">
                Pounds this month; in the app the sparks share one scale.
              </Text>
            </Stack>
          </Region>
        </Wireframe>
        <Wireframe toolbar={<PageHead title="Ledger" detail="October 2026" />}>
          <Region n={4} label="The month by day, by status" status="built">
            <BarChart
              title="Charged each day of October, pounds"
              height={140}
              stacked
              categories={Array.from({ length: 11 }, (_, i) => `${i + 1}`)}
              series={[
                { name: "Confirmed", values: [0, 12, 0, 26, 0, 0, 33, 0, 19, 38, 0], tone: "default" },
                { name: "Expected", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 18], tone: "muted" },
                { name: "Not recognised", values: [0, 0, 0, 3, 0, 0, 6, 0, 0, 5, 0], tone: "warning" },
              ]}
            />
          </Region>
        </Wireframe>
      </Stack>
    </Grid>
  );
}

// ---------------------------------------------------------------- the canvas

export default function TallyCharts() {
  return (
    <Wireframes
      data={data}
      drawings={{
        month: <TheMonth />,
        playbook: <ThePlaybook />,
        agents: <TheAgents />,
        drill: <TheDetail />,
      }}
    />
  );
}

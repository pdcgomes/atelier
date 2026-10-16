import type { ReactNode } from "react";
import {
  BarChart,
  Button,
  Chip,
  Grid,
  Heading,
  LineChart,
  Meter,
  Placeholder,
  Region,
  Row,
  Segmented,
  Select,
  SideList,
  Sparkline,
  Stack,
  Stat,
  Table,
  Text,
  TextInput,
  Wireframe,
  useCanvasState,
} from "atelier";
import type { Tone } from "atelier";
import { Wireframes, type WireframesData } from "atelier/templates";

export const meta = { title: "Tally: wireframes", theme: "cursor" };

type Note = { n: number; title: string; text: string; status: "built" | "building" | "planned" | "later" | "you" };

// ---------------------------------------------------------------- the notes

const SHELL_NOTES: Note[] = [
  { n: 1, title: "Navigation", text: "Seven screens, with counts beside Projects and Services and the inbox's count on Import in the accent, as it needs you.", status: "built" },
  { n: 2, title: "Sources", text: "Every connector from the registry plus the collector and the last statement, each with when it last reported; amber when stale or a sync left warnings, red when one failed.", status: "built" },
  { n: 3, title: "Theme and account", text: "System, Light or Dark from one set of colour variables; below it the signed-in account and Sign out, or Local, no sign-in in development.", status: "built" },
  { n: 4, title: "Page header", text: "The screen's title and a line of context; on the Overview, the month and Add charge.", status: "built" },
  { n: 5, title: "Panels", text: "A grid of panels, each titled with a short line of what it counts; the screens' own tabs draw them.", status: "built" },
  { n: 6, title: "Sign in", text: "Google through Neon Auth; the page explains sign-in failures and lists configuration problems instead of failing silently. Needs Neon Auth on the deployed app.", status: "building" },
  { n: 7, title: "Not allowed", text: "Any account other than TALLY_ALLOWED_EMAIL is signed out at once and sees this, with nothing of Tally shown.", status: "building" },
  { n: 8, title: "Phone width", text: "One column with the panels in the same order; wide tables scroll within their panel.", status: "built" },
  { n: 9, title: "Phone navigation", text: "A Menu pill at the bottom, within a thumb's reach, as Bramble does it: the seven screens as tiles, the inbox count, the theme and Sign out.", status: "built" },
];

const MONTH_TOP_NOTES: Note[] = [
  { n: 1, title: "The month in a sentence", text: "Spent so far, the forecast against budget, then what's been charged and what's still to come by name and date. The bar shows spent, forecast and the budget line.", status: "built" },
  { n: 2, title: "Needs you", text: "Every check that wants a decision, most urgent first, each with one action. Twelve checks feed it; the table below lists them.", status: "built" },
  { n: 3, title: "Figures", text: "Run rate, due in 30 days, agent work at list prices against plans, and each AI credit's runway, amber under 14 days.", status: "built" },
  { n: 4, title: "Spend by month", text: "Twelve months stacked by category, in Plinth's category colours; the rest of this month, still to come, is faded.", status: "built" },
  { n: 5, title: "Limits", text: "The three that matter most: any running out first, then each plan's main limit, with All 5 linking to Agents.", status: "built" },
];

const MONTH_REST_NOTES: Note[] = [
  { n: 6, title: "Projects", text: "Running and building costs for each, the change on last month, six months as a sparkline and its share of Claude.", status: "built" },
  { n: 7, title: "Worth a look", text: "Up to five suggestions, most worth first, with All 7 for the rest; each with its evidence and what it's worth. Snooze a week or Dismiss is remembered.", status: "built" },
  { n: 8, title: "Agents this week", text: "Each project's share of Claude use, and the three habit measures against the study's figures.", status: "built" },
  { n: 9, title: "Coming up", text: "Renewals and expected top-ups in the next 30 days, with amounts; an estimated top-up says so.", status: "built" },
];

const PROJECT_NOTES: Note[] = [
  { n: 1, title: "Waiting for a project", text: "Resources the connectors find that aren't linked, such as a new Vercel project; linking one sends its usage to that project.", status: "built" },
  { n: 2, title: "All projects", text: "Running costs (hosting, databases, product AI, domains) apart from building costs (its share of Claude and Cursor), commits and when the last one landed.", status: "built" },
  { n: 3, title: "Add a project", text: "A name and a group; most projects arrive from the Vercel connector instead.", status: "built" },
  { n: 4, title: "Headline figures", text: "This month projected, last month, commits and its share of Claude this week.", status: "built" },
  { n: 5, title: "By service", text: "Its share of each service this month, as bars, projected to month end.", status: "built" },
  { n: 6, title: "Six months and group", text: "Total per month as a line, and the group it belongs to, which the plan-fit suggestion reads.", status: "built" },
  { n: 7, title: "Linked at providers", text: "Vercel projects, OpenAI projects, Anthropic workspaces and Neon projects whose usage counts towards it, each with Unlink.", status: "built" },
  { n: 8, title: "Repos", text: "The GitHub remotes whose agent usage and commits count, from the repo rules in Settings.", status: "built" },
  { n: 11, title: "Agent work", text: "The project's last 30 days: work at list prices, cost per commit against your average, sessions and commits; where the money goes; each habit beside your overall figure; and what to change, ranked by what it would save.", status: "built" },
  { n: 9, title: "Groups", text: "Each group's projected cost this month against its budget, set in Settings; a group heading over joins Needs you.", status: "built" },
  { n: 10, title: "Repos with no project", text: "Repos the collector has seen that no rule maps, each with a suggested project (joining one it extends, as kiln-codecs joins Kiln) and group, created and mapped in one go. Local folders start unticked and stay out of Needs you.", status: "built" },
];

const SERVICE_NOTES: Note[] = [
  { n: 1, title: "Add a service", text: "A name, the kind of service and its website. Adding a name that exists returns it, confirming it if it was only suggested.", status: "built" },
  { n: 2, title: "Add a plan", text: "Recurring, usage-based, prepaid credit or a free tier, with price, currency, next renewal, how its cost is split (shared, by usage, one project, or fixed shares), and the service it's billed through, such as Inngest through Vercel.", status: "built" },
  { n: 3, title: "Found in your repos", text: "Services seen in the projects' code, to confirm or dismiss; adding a plan confirms one too.", status: "built" },
  { n: 4, title: "By kind of service", text: "Agents, AI APIs, Hosting, Database, Background jobs, Email, Domains, Networking, Tools; each with this month and 12 months, each plan with its price, renewal, split and limits.", status: "built" },
  { n: 5, title: "Edit a plan", text: "Opens in the row: price, currency, next renewal, split, how it's billed and the free-tier allowance; Cancel plan sits beside it, and a cancelled plan stops writing expected charges.", status: "built" },
  { n: 6, title: "Record a balance", text: "For prepaid credit: what the provider shows as left, as of now. Runway is that balance plus top-ups since, less usage since, at the last 14 days' burn.", status: "built" },
];

const AGENT_NOTES: Note[] = [
  { n: 1, title: "Limits", text: "Each limit now and at its reset, from your readings; with no reading today, usage since the last one gives an estimate, and the note says so. A window that has reset says that.", status: "built" },
  { n: 2, title: "Habits", text: "The study's three measures over the last 7 days, on Claude Code's real tokens, against its figures.", status: "built" },
  { n: 3, title: "Save a reading", text: "Percent used and reset time, as Claude Code's /usage or Cursor's dashboard shows them; readings are what the forecast learns from.", status: "built" },
  { n: 4, title: "By project", text: "Claude Code and Cursor at list prices, share, commits and cost per commit; Cursor's replayed figures carry an asterisk.", status: "built" },
  { n: 5, title: "By model", text: "Calls, cache reads and writes, output, and the list-price total, per model and tool.", status: "built" },
  { n: 6, title: "Collector", text: "When the Mac last reported, and how to run it. It works and its output is saved locally; it sends to Tally once Tally is deployed.", status: "building" },
  { n: 7, title: "Cost per commit over time", text: "Weekly, over the last twelve weeks: each week's agent work at list prices over its commits, for the busiest projects, and dashed for all of them.", status: "built" },
  { n: 10, title: "Habits by project", text: "The last 30 days, one row per project: its work, where the money goes (cache writes, reads, output, input), cache hit, idle re-writes, calls past 200K, Opus on subagents and cost per commit, amber where it's worse than your overall figure, and its best change with what it would save, linked to the Playbook's steps for it. Each project's page has the same in full.", status: "built" },
  { n: 9, title: "What a budget buys", text: "A monthly figure in; the Claude and Cursor plans that keep the most of a busy week out, with what's left buying extra usage. A ladder of budgets, habits as capacity, and what it rests on: measured from readings, or an assumed figure you can edit, with what half or twice it would mean.", status: "built" },
  { n: 8, title: "Capacity and cost", text: "Every plan Claude and Cursor sell against the last eight weeks: a typical and a busy week, when a busy week runs out, and what it gives up in commits, the main group kept first. Pairs of plans and extra usage are priced too, and the cheapest that holds a busy week is suggested.", status: "built" },
];

const LEDGER_NOTES: Note[] = [
  { n: 1, title: "Month", text: "One month at a time, with the previous and next; the header totals paid and expected.", status: "built" },
  { n: 2, title: "Add a charge", text: "For anything a statement won't bring, or before it does: date, service and plan, amount and currency, the pounds figure for foreign ones, kind and a note.", status: "built" },
  { n: 3, title: "Charges", text: "Every charge with its source; an expected one can be marked paid or deleted, a statement one is undone from Import.", status: "built" },
  { n: 4, title: "Filters", text: "By service and by project; with a project, each charge shows its share by the plans' splits, and the totals count only that.", status: "built" },
];

const IMPORT_NOTES: Note[] = [
  { n: 1, title: "Import a statement", text: "Twelve UK formats read with no help (Monzo, Starling, Revolut, Chase, Barclays, Barclaycard, HSBC, Lloyds and Halifax, NatWest, Nationwide, Santander, First Direct, Amex): the header found past any preamble, or named when missing; money-in, fee and status columns; CR and DR as directions. Previewed before anything is saved, and each bank's columns remembered.", status: "built" },
  { n: 2, title: "Inbox", text: "Card charges no rule recognises: assign one to a service or plan, or to a New service… named in place, and save a rule; or mark it Not a project cost, always if you like.", status: "built" },
  { n: 3, title: "Recently imported", text: "Matched and ignored rows; Undo puts a row back in the inbox and an expected charge it confirmed back to expected.", status: "built" },
  { n: 4, title: "Cursor usage", text: "Cursor's export from its dashboard: each day's real cost scales the replay's estimates, or lands as not attributed where there's no replay.", status: "built" },
  { n: 5, title: "Rules", text: "Card descriptor to service, or to ignore, lowest number first; the seeded ones at 50, yours at 40 so they win.", status: "built" },
];

const SETTINGS_NOTES: Note[] = [
  { n: 1, title: "Connectors", text: "One row per connector in the registry: what it brings, its keys (set or not, and where to create each), the last sync and its warnings, Sync now and Turn off.", status: "building" },
  { n: 2, title: "Budgets", text: "The month's budget and one for each group of projects; empty removes one.", status: "built" },
  { n: 3, title: "Model prices", text: "List prices per million tokens, dated; adding a price re-prices stored agent usage from its date.", status: "built" },
  { n: 4, title: "Repo rules", text: "Which project a GitHub remote's agent usage and commits count towards, so worktrees and a new Mac need nothing.", status: "built" },
  { n: 5, title: "Remembered banks", text: "On the Import page, beside Rules: each bank's columns, date format and sign, how often it's been used, renamed or forgotten.", status: "built" },
];

const SCENES_NOTES: Note[] = [
  { n: 1, title: "Daily sync", text: "Vercel Cron calls the sync route at 05:00 UTC with CRON_SECRET; each switched-on, configured connector runs, then the month's expected charges are written.", status: "building" },
  { n: 2, title: "The collector", text: "Hourly from launchd on the Mac. Daily totals only, never prompts or code; the server prices them from the model prices in force that day.", status: "building" },
  { n: 3, title: "A statement", text: "From the file to a charge or the inbox, as on the Import tab.", status: "built" },
  { n: 4, title: "From charges to projects", text: "Charges split by each plan's rule; usage decides the shares, never the totals.", status: "built" },
];

// ---------------------------------------------------------------- the data

const data: WireframesData = {
  title: "Tally: wireframes",
  intro:
    "Every screen and flow in Tally, drawn from the app as merged on trunk (c41f9a2), the plan in docs/plans and the demo data, checked screen by screen in a browser. Saturday 10 October 2026, updated with your answers, the budget view, the evening's additions and the overnight pass.",
  updated: "2026-10-11T08:20:00+01:00",
  reading:
    "Boxes are regions, numbers point to the notes under each wireframe, and the figures are the demo month's, not yours. The sidebar is drawn once, on The shell, and left out of the other screens. Every region says where it stands:",
  statuses: {
    built: { label: "Built", meaning: "Merged on trunk and tested; it works locally on the demo data." },
    building: {
      label: "Built, waits on deploy",
      meaning: "Merged and tested against recorded responses, but it needs Vercel, Neon or a provider key before it runs for real.",
    },
    planned: { label: "Planned", meaning: "In the plan, not built yet." },
    later: { label: "Later", meaning: "After the first deploy." },
    you: { label: "Waits on you", meaning: "Waiting on a decision or a measurement of yours." },
  },
  flow: [
    { title: "Sign in", text: "With Google, as the one allowed account; any other is signed out before anything shows.", status: "building" },
    { title: "Read the month", text: "A sentence says what's been spent and where the month is heading, with the budget bar and Needs you beside it.", status: "built" },
    { title: "Clear what needs you", text: "Unrecognised card charges, unlinked projects, low credit and limits about to run out, each with its action.", status: "built" },
    { title: "Keep the catalogue true", text: "Services and plans, statements imported monthly, a charge typed in when nothing else brings it.", status: "built" },
    { title: "Watch the agents", text: "Limits forecast from readings, which plan holds your busy weeks at the least cost and what a cheaper one gives up, habits and cost per commit.", status: "built" },
    { title: "Let data come in", text: "Provider syncs at 05:00 every day and the collector hourly on the Mac, with nothing typed.", status: "building" },
  ],
  principles: [
    { title: "Spend comes only from charges", text: "Usage from providers and the collector splits charges between projects and feeds forecasts; it never adds to spend." },
    { title: "The answer before the chart", text: "Each screen opens on a sentence or a figure that answers its question, and the detail sits below it." },
    { title: "Red and amber are for you", text: "Colour marks only what needs a decision; everything else is ink on paper, in Plinth's palette, light or dark." },
    { title: "Nothing counted twice", text: "Plans write expected charges that a statement row confirms; rows are hashed, so importing the same file again adds nothing." },
    { title: "Estimates say so", text: "Cursor's replayed figures carry an asterisk and a limit estimated from usage says it is, until a real figure replaces them." },
    { title: "One file per provider", text: "Settings, the sidebar, splits and runway read the connector registry, so a new provider changes nothing else." },
  ],
  screens: [
    {
      id: "shell",
      name: "The shell",
      title: "The shell and sign-in",
      summary: "The frame every screen sits in, and the two pages anyone sees before it.",
      notes: SHELL_NOTES,
      tables: [
        {
          title: "Who gets in",
          headers: ["Setup", "What happens", "Status"],
          rows: [
            ["Development, TALLY_AUTH_DEV_BYPASS=1", "No sign-in; the sidebar says Local, no sign-in. Ignored in production.", "built"],
            ["Missing or bad Neon Auth settings", "The sign-in page lists each problem, such as a cookie secret under 32 characters.", "built"],
            ["Signed in as TALLY_ALLOWED_EMAIL, verified", "In, to the page asked for.", "building"],
            ["Signed in as anyone else", "Signed out at once, shown Not allowed.", "building"],
            ["/api/ingest and /api/cron", "No session; a bearer token (the collector) or CRON_SECRET (Vercel Cron), compared in constant time.", "building"],
          ],
        },
      ],
    },
    {
      id: "month",
      name: "The month at a glance",
      summary: "The Overview: an answer first, then what needs you, then the detail. Two wireframes, the top of the page and the rest.",
      drawings: [
        { id: "month-top", notes: MONTH_TOP_NOTES },
        { id: "month-rest", notes: MONTH_REST_NOTES },
      ],
      tables: [
        {
          title: "What lands in Needs you",
          headers: ["Check", "Tone", "Action", "Status"],
          rows: [
            ["A limit runs out before it resets", "Red", "See options", "built"],
            ["A limit will be 90% used or more by its reset", "Amber", "See options", "built"],
            ["The month's forecast is over budget", "Amber", "See what's due", "built"],
            ["A group of projects is heading over its budget", "Amber", "See projects", "built"],
            ["AI credit runs out within 14 days", "Amber, red at 2 days or fewer", "Log a top-up", "built"],
            ["An expected charge hasn't shown on a statement a week after its date", "Amber", "Check it", "built"],
            ["Card charges no rule recognises", "Neutral", "Sort them", "built"],
            ["A provider project or workspace isn't linked to a project", "Neutral", "Link it", "built"],
            ["Agent work in a repo with no repo rule", "Neutral", "Add a rule", "built"],
            ["A renewal or trial ends within 14 days", "Neutral", "Review it", "built"],
            ["No statement imported for 35 days", "Neutral", "Import one", "built"],
            ["The collector hasn't reported for 26 hours", "Amber", "Check the Mac", "built"],
          ],
        },
        {
          title: "What Worth a look suggests, most worth first",
          headers: ["Rule", "When", "Status"],
          rows: [
            ["Plan fit from capacity: the cheapest plan, pair of plans or extra usage that holds a busy week", "Your readings have measured what the plan holds, and a cheaper option fits or the current one runs short", "built"],
            ["Plan fit from one window: a separate plan for side projects, or capped extra usage", "Until capacity is measured: a limit runs out before its reset and side projects are 15% or more of its use", "built"],
            ["Plan fit from one window: run fewer agents at once, or upgrade", "Until capacity is measured: a limit runs out with side projects under 15% of its use", "built"],
            ["Habit: run builds in the background", "Idle cache re-writes are 10% or more of agent use", "built"],
            ["Idle spend: let a renewal lapse", "A project with no commits in 60 days has a renewal coming", "built"],
            ["Spend change", "A service cost at least half as much again as last month, and £10 more", "built"],
            ["Habit: more than three agents running at once", "Needs concurrency, which the collector doesn't measure yet", "later"],
          ],
        },
      ],
    },
    {
      id: "projects",
      name: "Projects",
      summary: "What each project costs to run and to build, and the page for one project.",
      notes: PROJECT_NOTES,
      tables: [
        {
          title: "How a project's cost is worked out",
          headers: ["Split on the plan", "How the charge divides", "Example"],
          note: "Shares divide by largest remainder, so the parts always add up to the charge to the penny.",
          rows: [
            ["A project", "All of it to that project", "Render Standard to Bramble"],
            ["By usage", "In proportion to measured usage that month: provider usage, or agent usage for Claude and Cursor", "Claude Max 5x, by each repo's Claude Code use"],
            ["Fixed shares", "Set percentages, chosen on the plan form; what they leave stays shared", "A domain shared by two projects"],
            ["Shared overhead", "Kept as Shared, not spread", "Vercel Pro"],
          ],
        },
      ],
    },
    {
      id: "services",
      name: "Services",
      summary: "Everything you pay for or use for free, with its plans. New services can be added here or straight from the Import inbox.",
      notes: SERVICE_NOTES,
      tables: [
        {
          title: "The four kinds of plan",
          headers: ["Kind", "What it records", "How the forecast treats it"],
          rows: [
            ["Recurring", "Price, currency, monthly or yearly, next renewal", "An expected charge on each renewal, confirmed when the statement row arrives"],
            ["Usage-based", "Nothing fixed; the invoice is the figure", "This month at the last 14 days' pace"],
            ["Prepaid credit", "Balances you record and top-ups from statements", "Runway in days, and a top-up of the usual size when it runs out before month end"],
            ["Free tier", "The allowance, in words", "Nothing, until a charge appears"],
          ],
        },
      ],
    },
    {
      id: "agents",
      name: "Agents",
      summary: "What the agents cost against what they'd cost at list prices, how close each limit is, and the habits that drive it.",
      notes: AGENT_NOTES,
      tables: [
        {
          title: "Where the agent figures come from",
          headers: ["Source", "What it gives", "Measured or estimated", "Status"],
          note: "The value of 1% of a limit comes from two readings in the same window and the usage measured between them. Daily totals make the estimate coarse, so it's used only for weekly and monthly limits, and only when no reading was taken today.",
          rows: [
            ["Claude Code logs", "Every call's tokens, model, subagent or main, working folder; de-duplicated by message", "Measured", "built"],
            ["Cursor's local history", "The study's replay, call by call, calibrated to recorded context sizes; matches its Python exactly", "Estimated", "built"],
            ["Cursor usage CSV", "Each day's real cost, replacing the replay's total; the replay's shares still split it", "Measured", "built"],
            ["Git", "Commits per day on each repo's main branch", "Measured", "built"],
            ["Your readings", "Percent used and reset time for each limit", "Measured", "built"],
            ["Claude Code's limits, read locally", "Readings without typing them, if Claude Code exposes them", "Measured", "later"],
          ],
        },
      ],
    },
    {
      id: "ledger",
      name: "Ledger",
      summary: "Every charge, the only place spend comes from.",
      notes: LEDGER_NOTES,
      tables: [
        {
          title: "Where a charge comes from",
          headers: ["Source", "Written by", "Becomes paid when"],
          note: "Every charge stores its pounds figure beside the original amount and currency; usage costs keep six decimal places, and money is held as whole pence and cents.",
          rows: [
            ["Expected", "A recurring plan's schedule, 35 days ahead, on each daily sync, with a line for each plan billed through it", "A statement row matches it: same service, within 6 days and 15%, or for a charge with usage lines, enough to cover its fixed part"],
            ["Statement", "A matched statement row, or one assigned from the inbox", "It is paid"],
            ["Manual", "Add a charge", "It is paid"],
            ["Provider", "A connector's invoices", "A statement row confirms it, as for expected"],
          ],
        },
      ],
    },
    {
      id: "import",
      name: "Import",
      summary: "Statements and Cursor's usage export. Clicked through end to end in a browser with a Revolut export on 10 October.",
      drawings: [{ id: "import-window", notes: IMPORT_NOTES }, { id: "import-playground" }],
      tables: [
        {
          title: "What happens to each row",
          headers: ["Step", "What it does"],
          rows: [
            ["Hash", "Account, date, amount and description; a row seen before is counted and skipped"],
            ["Money in", "Refunds and transfers in are left out and counted in the preview"],
            ["Rules", "The first rule whose text the descriptor contains, lowest number first"],
            ["Match", "An expected or provider charge for that service within 6 days and 15% is confirmed, not duplicated"],
            ["Otherwise", "A new charge for a recognised service, or the inbox for an unknown one"],
          ],
        },
      ],
    },
    {
      id: "settings",
      name: "Settings",
      summary: "Connections, the budget, prices and the rules that map work to projects.",
      notes: SETTINGS_NOTES,
      tables: [
        {
          title: "Connectors",
          headers: ["Connector", "Brings", "Key", "Status"],
          note: "Every connector is tested against recorded responses; none has been run against its live API yet, which the sandbox can't reach. The first deploy's Sync now is that test.",
          rows: [
            ["Vercel", "Projects; billed usage per project where the plan exposes it", "TALLY_VERCEL_TOKEN, optional team ID", "building"],
            ["OpenAI", "Daily cost per project", "TALLY_OPENAI_ADMIN_KEY", "building"],
            ["Anthropic API", "Daily cost per workspace", "TALLY_ANTHROPIC_ADMIN_KEY (organisation accounts only)", "building"],
            ["Neon", "Projects, daily compute and storage", "TALLY_NEON_API_KEY, optional org ID", "building"],
            ["IONOS", "Each domain's renewal date, and whether it's set to lapse; a domain with no plan is a warning", "TALLY_IONOS_API_KEY", "building"],
            ["Cloudflare", "Subscriptions and their renewals, billing history, TURN egress priced past 1,000 GB and read against it", "TALLY_CLOUDFLARE_API_TOKEN and account ID", "building"],
            ["Exchange rates", "ECB reference rates", "None", "building"],
            ["Render, Fly.io, GitHub, Stripe, R2 and Workers", "Each from plans and statements until it has a connector; Render isn't worth one yet", "Per connector", "later"],
          ],
        },
      ],
    },
    {
      id: "scenes",
      name: "Behind the scenes",
      summary: "The flows nobody clicks: how data arrives each day and how a charge becomes each project's cost.",
      notes: SCENES_NOTES,
    },
  ],
  questions: [
    {
      id: "vercel-billing",
      title: "Do Neon and Inngest bill you directly, or on Vercel's invoice?",
      now: "Tally treats them as separate services with their own statement lines. If they come through the Vercel Marketplace, they arrive inside Vercel's charge instead.",
      options: [
        "Directly: each has its own card charge and merchant rule, as now",
        "Through Vercel: split Vercel's charge into lines for each, and match on Vercel's descriptor",
      ],
      lean: "Check one Vercel invoice first; the ledger can split a charge into lines either way, so only the rules and the Neon connector's role change.",
      answer: "Inngest through Vercel, Neon directly. Vercel's monthly charge is split into lines for Vercel Pro and Inngest, the fixed plan at its price and the usage plan taking the rest; Neon keeps its own card charge and merchant rule.",
    },
    {
      id: "next-connector",
      title: "Which provider gets a connector next?",
      now: "Vercel, OpenAI, Anthropic, Neon and exchange rates are built. Render, Inngest, IONOS and Cloudflare come in from plans and statements only.",
      options: ["Render: services and instance types, to price them", "Cloudflare: subscriptions, R2 and TURN usage", "IONOS: domains and renewal dates"],
      lean: "Render, as it's the next paid service with a usable API; IONOS has no public billing API, and TURN is free for now.",
      answer: "IONOS, then Cloudflare; Render isn't worth one yet. IONOS does have a Domains API, which gives each domain and its renewal date.",
    },
    {
      id: "group-budgets",
      title: "Budgets for groups or projects, as well as the month?",
      now: "One monthly budget, £250 in the demo. The database already holds group and project budgets; the screens don't set them yet.",
      options: ["The month only, as now", "Add one per group (Studio, Sideline)", "Add one per project"],
      lean: "Per group: it answers whether side projects are worth a second plan without making eight budgets to keep up.",
      answer: "Yes: a budget per group alongside the month's.",
    },
    {
      id: "suggestion-count",
      title: "How many suggestions does the Overview show?",
      now: "All of them under Worth a look: seven in the demo, which makes it the longest column on the page.",
      options: ["All, as now", "The top three by money at stake, with All 7 linking to a full list, as Limits does"],
      lean: "The top three: the rest stay a click away, and the page keeps its order of answer, Needs you, then detail.",
      answer: "Up to five, by money at stake, with the rest a click away.",
    },
    {
      id: "second-plan",
      title: "Should Tally suggest a second Claude plan for side projects?",
      now: "The plan-fit suggestion offers it, priced from measured use, with a line to check Anthropic's terms before acting on it.",
      options: ["Keep it, with the terms line", "Offer only an upgrade or capped extra usage", "Offer it only once you confirm the terms allow it"],
      lean: "Keep it with the terms line until you've read them; the evidence is what's useful, and the choice stays yours.",
      answer: "Keep it, and go further: from the measured volume of work, which changes, show the cheapest way to meet it, and what a cheaper option would cost in output.",
    },
    {
      id: "undo-rule",
      title: "Does undoing an inbox row also remove the rule it saved?",
      now: "Undo puts the row back and leaves the rule, which then sorts the next statement's matching rows; it's removed from Rules by hand.",
      options: ["Keep the rule, as now", "Remove the rule too, if no other row has matched it since"],
      lean: "Remove it when nothing else has matched: an undo usually means the rule was wrong too.",
      answer: "Remove it, unless another row has matched it since.",
    },
    {
      id: "phone-nav",
      title: "How does a phone move between screens?",
      now: "At phone width the sidebar is hidden and nothing replaces it, so only the page you open on is reachable.",
      options: ["A menu button in the header that opens the seven screens as a sheet", "A bar of five tabs along the bottom, with Ledger and Settings under More"],
      lean: "The menu button: phones are for a glance at the Overview and the occasional reading, and a sheet keeps every screen one tap away without a permanent bar.",
      answer: "A Menu pill at the bottom, as Bramble does it, opening the screens as tiles with the theme and the account.",
    },
    {
      id: "ledger-filters",
      title: "Ledger filters: which ones?",
      now: "The ledger moves a month at a time. The plan also lists filters by service, project and source.",
      options: ["Service and project", "Service, project and source, as planned", "Month only, with search"],
      lean: "Service and project; source matters only when checking an import, and the Import page already shows that.",
      answer: "Service and project, with each charge's share when a project is chosen.",
    },
  ],
};

// ---------------------------------------------------------------- building blocks

type Level = "ok" | "warn" | "danger";

const LEVEL_TONE: Record<Level, Tone> = { ok: "default", warn: "warning", danger: "danger" };

function Crumb({ children }: { children: string }) {
  return (
    <Text as="span" size="sm" tone="secondary">
      {children}
    </Text>
  );
}

function Mini({ children, tone = "secondary" }: { children: ReactNode; tone?: Tone | "secondary" }) {
  return (
    <Text size="sm" tone={tone}>
      {children}
    </Text>
  );
}

/** A budget or limit bar: what's used, solid, and what's projected by the end, lighter. */
function Bar({ used, projected, level = "ok" }: { used: number; projected?: number; level?: Level }) {
  const u = Math.min(used, 100);
  const p = Math.min(projected ?? used, 100);
  return <Meter value={u} max={100} show="none" segments={[{ value: u, tone: LEVEL_TONE[level] }, ...(p > u ? [{ value: p - u, tone: "muted" as Tone }] : [])]} />;
}

/** Rows of a table inside a wireframe, its columns as wide as the screen's: a number in pixels, or what's left. */
function MiniTable({ widths, head, rows, right = [] }: { widths: (number | undefined)[]; head?: string[]; rows: string[][]; right?: number[] }) {
  const columns = widths.map((width, i) => ({ key: `c${i}`, label: head?.[i] ?? "", width, align: right.includes(i) ? ("right" as const) : undefined, sortable: false }));
  return <Table dense columns={columns} rows={rows.map((r) => Object.fromEntries(r.map((cell, i) => [`c${i}`, cell])))} />;
}

/** A form control at the width the screen gives it: a select, or a field to type in. */
function Input({ label, value, placeholder, select }: { label?: string; value?: string; placeholder?: string; select?: boolean }) {
  return select ? <Select label={label} options={[value ?? ""]} value={value} /> : <TextInput label={label} value={value ?? ""} placeholder={placeholder} />;
}

function Btn({ children, primary }: { children: string; primary?: boolean }) {
  return (
    <Button size="sm" variant={primary ? "solid" : "outline"}>
      {children}
    </Button>
  );
}

/** A Needs you row: a tone dot, the title and detail, the action on the right. */
function NeedRow({ level, title, detail, action }: { level: Level | "info"; title: string; detail: string; action: string }) {
  return (
    <Grid columns="12px minmax(0, 1fr) 96px" gap={7}>
      <Text as="span" tone={level === "info" ? "muted" : LEVEL_TONE[level]}>
        ●
      </Text>
      <Stack gap={0}>
        <Text size="sm" weight="bold">
          {title}
        </Text>
        <Mini tone="muted">{detail}</Mini>
      </Stack>
      <Mini>{`${action} →`}</Mini>
    </Grid>
  );
}

/** A limit as the Overview and Agents draw it: label, now → at reset, the bar and its note. */
function LimitRow({ label, plan, now, at, level, note }: { label: string; plan: string; now: number; at?: number; level: Level; note: string }) {
  return (
    <Stack gap={3}>
      <Grid columns="minmax(0, 1fr) 80px" gap={6}>
        <Text size="sm">
          <Text as="span" size="sm" weight="bold">
            {label}
          </Text>
          <Text as="span" size="sm" tone="muted">{`  ${plan}`}</Text>
        </Text>
        <Mini tone={level === "ok" ? "secondary" : LEVEL_TONE[level]}>{at !== undefined ? `${now}% → ${at}%` : `${now}%`}</Mini>
      </Grid>
      <Bar used={now} projected={at} level={level} />
      <Mini tone={level === "danger" ? "danger" : "muted"}>{note}</Mini>
    </Stack>
  );
}

/** A screen's main area under its header: the title, its meta line and any controls on the right. */
function PageHead({ title, meta, right }: { title: string; meta?: string; right?: ReactNode }) {
  return (
    <Row gap={8} align="center" justify="between">
      <Row gap={8} align="baseline">
        <Text weight="bold">{title}</Text>
        {meta ? <Mini tone="muted">{meta}</Mini> : null}
      </Row>
      {right ? <Row gap={6}>{right}</Row> : null}
    </Row>
  );
}

/** A pipeline's steps, each a card with the arrow to the next. */
function Pipe({ steps }: { steps: { title: string; detail: string }[] }) {
  return (
    <Grid columns={steps.map(() => "minmax(0, 1fr)").join(" 14px ")} gap={4}>
      {steps.flatMap((s, i) => {
        const card = (
          <Region key={s.title}>
            <Stack gap={3}>
              <Text size="sm" weight="bold">
                {s.title}
              </Text>
              <Mini tone="muted">{s.detail}</Mini>
            </Stack>
          </Region>
        );
        return i < steps.length - 1
          ? [
              card,
              <Text key={`to-${i}`} tone="muted">
                →
              </Text>,
            ]
          : [card];
      })}
    </Grid>
  );
}

// ---------------------------------------------------------------- the shell and sign-in

function TheShell() {
  return (
    <Stack gap={12}>
      <Wireframe toolbar={<Crumb>tally-desk.vercel.app</Crumb>} columns="180px minmax(0, 1fr)" gap={8}>
        <Stack gap={8}>
          <Region n={1} label="Tally" status="built">
            <SideList
              items={[
                { label: "Overview", selected: true },
                { label: "Projects", count: "8" },
                { label: "Services", count: "12" },
                { label: "Agents" },
                { label: "Ledger" },
                { label: "Import", count: "2", tone: "accent" },
                { label: "Settings" },
              ]}
            />
          </Region>
          <Region n={2} label="Sources" status="built">
            <SideList
              items={[
                { label: "Vercel", count: "06:00", tone: "muted" },
                { label: "OpenAI", count: "06:00", tone: "muted" },
                { label: "Anthropic API", count: "06:00", tone: "muted" },
                { label: "Neon", count: "06:00", tone: "muted" },
                { label: "Collector", count: "11:52", tone: "muted" },
                { label: "Statement", count: "today", tone: "muted" },
              ]}
            />
          </Region>
          <Region n={3} status="built">
            <Stack gap={5}>
              <Segmented items={["System", "Light", "Dark"]} active="System" />
              <Mini tone="muted">rowan@… · Sign out</Mini>
            </Stack>
          </Region>
        </Stack>
        <Stack gap={8}>
          <Region n={4} label="Header" status="built">
            <Grid columns="minmax(0, 1fr) 110px 110px" gap={6}>
              <Text weight="bold">Overview</Text>
              <Input value="October 2026" />
              <Btn primary>+ Add charge</Btn>
            </Grid>
          </Region>
          <Region n={5} label="Panels" status="built">
            <Grid columns="minmax(0, 1.3fr) minmax(0, 1fr)" gap={6}>
              {["The month", "Needs you", "Spend by month", "Limits"].map((t) => (
                <Placeholder key={t} h={64}>
                  {t}
                </Placeholder>
              ))}
            </Grid>
          </Region>
        </Stack>
      </Wireframe>
      <Grid columns="minmax(0, 1fr) minmax(0, 1fr) 230px" gap={12}>
        <Region n={6} label="Sign in" status="building">
          <Stack gap={6}>
            <Text weight="bold">Your costs are private.</Text>
            <Mini>Sign in with the Google account Tally was set up for.</Mini>
            <Row>
              <Btn primary>Continue with Google</Btn>
            </Row>
            <Mini tone="muted">One allowed account. Any other is signed out straight away.</Mini>
          </Stack>
        </Region>
        <Region n={7} label="Not allowed" status="building">
          <Stack gap={6}>
            <Text weight="bold">This account can't open Tally.</Text>
            <Mini>Tally has a single user, and the Google account you used isn't theirs, so you were signed out straight away.</Mini>
            <Row>
              <Btn>Use a different account</Btn>
            </Row>
          </Stack>
        </Region>
        <Region n={8} label="Phone" status="built">
          <Wireframe frame="phone" gap={5}>
            <Grid columns="minmax(0, 1fr) 16px" gap={6}>
              <Mini>Overview</Mini>
              <Mini tone="muted">◐</Mini>
            </Grid>
            <Region n={9} status="built">
              <Mini tone="muted">Menu ② → Overview · Projects · Services · Agents · Ledger · Import · Settings · theme · Sign out</Mini>
            </Region>
            <Text size="sm" weight="bold">
              £96 spent so far.
            </Text>
            <Bar used={38} projected={100} level="danger" />
            {["Needs you · 5", "Run rate £214", "Spend by month", "Limits"].map((t) => (
              <Placeholder key={t} h={24}>
                {t}
              </Placeholder>
            ))}
          </Wireframe>
        </Region>
      </Grid>
    </Stack>
  );
}

// ---------------------------------------------------------------- the month at a glance

const MONTHS = ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"];

const SPEND = [
  { name: "Agents", values: [30, 30, 45, 45, 60, 60, 75, 75, 90, 120, 120, 0] },
  { name: "AI APIs", values: [12, 10, 18, 25, 20, 31, 22, 28, 35, 30, 48, 55] },
  { name: "Hosting", values: [16, 16, 18, 22, 19, 21, 24, 26, 25, 29, 31, 30] },
  { name: "Database", values: [4, 4, 5, 6, 6, 7, 8, 8, 9, 9, 11, 10] },
  { name: "Domains", values: [28, 11, 0, 0, 64, 0, 0, 0, 0, 0, 0, 1] },
  { name: "Still to come", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 172], tone: "muted" as Tone },
];

function MonthTop() {
  return (
    <Wireframe toolbar={<Crumb>Overview · October 2026</Crumb>} gap={8}>
      <Grid columns="minmax(0, 1fr) minmax(0, 1fr)" gap={8}>
        <Region n={1} label="The month" status="built">
          <Stack gap={4}>
            <Mini tone="muted">October 2026 · as of 10 Oct</Mini>
            <Text size="lg" weight="bold">
              £96 spent so far.
            </Text>
            <Mini tone="default">On track for £268, £18 over your £250 budget.</Mini>
            <Mini tone="muted">So far: plans and usage (£41), an OpenAI top-up (£31) and an Anthropic API top-up (£24). Still to come: Claude Max 5x on 17 Oct (£75) and Cursor Pro+ on 25 Oct (£45).</Mini>
            <Bar used={38} projected={100} level="danger" />
            <Row justify="between">
              <Mini tone="muted">£96 spent</Mini>
              <Mini tone="muted">£268 forecast · £250 budget</Mini>
            </Row>
          </Stack>
        </Region>
        <Region n={2} label="Needs you · 5" status="built">
          <Stack gap={6}>
            <NeedRow level="danger" title="Claude's weekly limit runs out on Sunday" detail="Around 18:40, 15 hours before it resets. Kiln is 64%." action="See options" />
            <NeedRow level="warn" title="October is heading £18 over budget" detail="Forecast £268 against £250." action="See what's due" />
            <NeedRow level="warn" title="Anthropic API credit lasts about 4 more days" detail="$6 left. Signal Desk uses 72% of it." action="Log a top-up" />
            <NeedRow level="info" title="2 card charges aren't recognised" detail="GOOGLE*CLOUD 9KD2MP £3.40 and 1 more" action="Sort them" />
            <NeedRow level="info" title="New Vercel project: kiln-docs" detail="Not linked to a project yet." action="Link it" />
          </Stack>
        </Region>
      </Grid>
      <Region n={3} label="Figures" status="built">
        <Grid columns="repeat(5, minmax(0, 1fr))" gap={10}>
          <Stat label="Run rate" value="£214" hint="a month" />
          <Stat label="Due in 30 days" value="£188" hint="Claude Max 5x is the largest" />
          <Stat label="Agent work at API prices" value="$2,140" hint="13× the subscriptions" />
          <Stat label="OpenAI credit" value="33 days" hint="$48 left" />
          <Stat label="Anthropic API credit" value="4 days" hint="$6 left" tone="warning" />
        </Grid>
      </Region>
      <Grid columns="minmax(0, 1.6fr) minmax(0, 1fr)" gap={8}>
        <Region n={4} label="Spend by month" status="built">
          <BarChart title="Spend by month" categories={MONTHS} series={SPEND} stacked height={130} caption="Agents · AI APIs · Hosting · Database · Domains, in pounds; the rest of October still to come" />
        </Region>
        <Region n={5} label="Limits · All 5 →" status="built">
          <Stack gap={8}>
            <LimitRow label="Weekly limit" plan="Claude Max 5x" now={58} at={112} level="danger" note="Runs out Sunday around 18:40, 15 hours before it resets." />
            <LimitRow label="Cursor models pool" plan="Cursor Pro+" now={33} at={59} level="ok" note="On track for about 59% by the reset, Sun 25 Oct." />
            <LimitRow label="Five-hour window" plan="Claude Max 5x" now={0} level="ok" note="Reset at 11:00; no reading since." />
          </Stack>
        </Region>
      </Grid>
    </Wireframe>
  );
}

function MonthRest() {
  return (
    <Wireframe toolbar={<Crumb>Overview · further down</Crumb>} columns="minmax(0, 1.6fr) minmax(0, 1fr)" gap={8}>
      <Region n={6} label="Projects · All 8 →" status="built">
        <MiniTable
          widths={[undefined, 50, 50, 50, 60, 50]}
          head={["Project", "Running", "Building", "Total", "vs last", "Claude"]}
          right={[1, 2, 3, 4, 5]}
          rows={[
            ["Kiln", "£0", "£61", "£61", "+£58", "64%"],
            ["Signal Desk", "£44", "£6", "£50", "+£31", "9%"],
            ["Bramble", "£27", "£8", "£35", "+£12", "8%"],
            ["Tidewater", "£15", "£5", "£20", "+£14", "6%"],
            ["Plinth", "£6", "£11", "£17", "+£9", "11%"],
            ["Shared", "£33", "£0", "£33", "+£21", ""],
          ]}
        />
      </Region>
      <Region n={7} label="Worth a look · top 5 · All 7 →" status="built">
        <Stack gap={6}>
          <Stack gap={2}>
            <Heading level={3}>Plan fit</Heading>
            <Text size="sm" weight="bold">
              Max 5x runs short in a busy week
            </Text>
            <Mini tone="muted">A busy week needs about 121% of it, so it runs out around day 6; side projects drop to 49% of their pace. A second Max 5x for them holds it for £75 more.</Mini>
            <Mini tone="muted">Snooze a week · Dismiss · Compare options →</Mini>
          </Stack>
          <Stack gap={2}>
            <Heading level={3}>Habit</Heading>
            <Text size="sm" weight="bold">
              Run builds in the background
            </Text>
            <Mini tone="muted">Cache re-written after idle waits is 26% of agent use; the study measured 41%.</Mini>
          </Stack>
          <Mini tone="muted">Idle spend · Spend change · 5 more</Mini>
        </Stack>
      </Region>
      <Region n={8} label="Agents this week" status="built">
        <Stack gap={4}>
          <Bar used={64} projected={100} />
          <Mini tone="muted">Kiln 64% · Plinth 11% · Signal Desk 9% · Bramble 8% · Tidewater 6%</Mini>
          <MiniTable
            widths={[undefined, 40]}
            right={[1]}
            rows={[
              ["Cache re-written after idle waits", "26%"],
              ["Main-chat calls past 200K tokens", "7%"],
              ["Opus on subagents", "12%"],
            ]}
          />
        </Stack>
      </Region>
      <Region n={9} label="Coming up · 30 days" status="built">
        <MiniTable
          widths={[60, undefined, 48]}
          right={[2]}
          rows={[
            ["17 Oct", "Claude Max 5x", "£75"],
            ["19 Oct", "Anthropic API top-up, estimate", "£24"],
            ["25 Oct", "Cursor Pro+", "£45"],
            ["1 Nov", "Vercel Pro", "£16"],
            ["4 Nov", "tidewater.radio", "£28"],
          ]}
        />
      </Region>
    </Wireframe>
  );
}

// ---------------------------------------------------------------- projects

function GroupBudget({ name, spent, budget, used }: { name: string; spent: string; budget: string; used: number }) {
  return (
    <Stack gap={3}>
      <Grid columns="minmax(0, 1fr) 100px" gap={6}>
        <Mini tone="default">{name}</Mini>
        <Mini>{`${spent} of ${budget}`}</Mini>
      </Grid>
      <Bar used={used} />
    </Stack>
  );
}

function ServiceBar({ name, used, amount }: { name: string; used: number; amount: string }) {
  return (
    <Grid columns="70px minmax(0, 1fr) 40px" gap={6}>
      <Mini tone="default">{name}</Mini>
      <Bar used={used} />
      <Mini>{amount}</Mini>
    </Grid>
  );
}

function TheProjects() {
  return (
    <Stack gap={18}>
      <Wireframe toolbar={<Crumb>Projects · October 2026, projected</Crumb>} gap={8}>
        <Region n={10} label="Repos with no project" status="built">
          <Stack gap={4}>
            <MiniTable
              widths={[22, undefined, 50, 56, undefined, 90]}
              head={["", "Repo", "Work", "Commits", "Project", "Group"]}
              right={[2, 3]}
              rows={[
                ["☑", "rowanhale/kiln-codecs", "$52", "14", "Kiln", "Studio"],
                ["☑", "rowanhale/paper-moth", "$19", "6", "Paper Moth", "Sideline"],
                ["☐", "src", "$1", "–", "Src", "Sideline"],
              ]}
            />
            <Mini tone="muted">Create projects and map the ticked repos</Mini>
          </Stack>
        </Region>
        <Region n={9} label="Groups · Budgets →" status="built">
          <Grid columns="minmax(0, 1fr) minmax(0, 1fr)" gap={14}>
            <Stack gap={3}>
              <GroupBudget name="Studio" spent="£61" budget="£120" used={51} />
              <Mini tone="muted">£59 left</Mini>
            </Stack>
            <Stack gap={3}>
              <GroupBudget name="Sideline" spent="£118" budget="£150" used={79} />
              <Mini tone="muted">£32 left</Mini>
            </Stack>
          </Grid>
        </Region>
        <Region n={1} label="Waiting for a project" status="built">
          <Grid columns="minmax(0, 1fr) 170px 70px" gap={6}>
            <Mini tone="default">Vercel project kiln-docs</Mini>
            <Input value="Choose a project" select />
            <Btn>Link</Btn>
          </Grid>
        </Region>
        <Region n={2} label="All projects · 8 active" status="built">
          <MiniTable
            widths={[undefined, 90, 50, 50, 50, 64, 54, 70]}
            head={["Project", "Group", "Running", "Building", "Total", "vs last", "Commits", "Last commit"]}
            right={[2, 3, 4, 5, 6]}
            rows={[
              ["Kiln", "Studio", "£0", "£61", "£61", "+£58", "164", "today"],
              ["Signal Desk", "Sideline", "£44", "£6", "£50", "+£31", "41", "today"],
              ["Bramble", "Sideline", "£27", "£8", "£35", "+£12", "23", "yesterday"],
              ["Plinth", "Sideline", "£6", "£11", "£17", "+£9", "77", "today"],
              ["Ticker", "Sideline", "£0", "£0", "£0", "−£7", "–", "none recorded"],
              ["Shared", "Vercel Pro and unsplit costs", "£33", "£0", "£33", "", "", ""],
            ]}
          />
        </Region>
        <Region n={3} label="Add a project" status="built">
          <Grid columns="minmax(0, 1fr) minmax(0, 1fr) 100px" gap={6}>
            <Input label="Name" placeholder="Harbour" />
            <Input label="Group" placeholder="Sideline" />
            <Btn primary>Add project</Btn>
          </Grid>
        </Region>
      </Wireframe>
      <Wireframe toolbar={<Crumb>Projects › Kiln</Crumb>} gap={8}>
        <PageHead
          title="Kiln"
          meta="Studio"
          right={
            <>
              <Btn>All projects</Btn>
              <Btn>Archive</Btn>
            </>
          }
        />
        <Region n={4} status="built">
          <Grid columns="repeat(4, minmax(0, 1fr))" gap={10}>
            <Stat label="This month, projected" value="£61" hint="£0 running · £61 building" />
            <Stat label="Last month" value="£3" hint="+£58 this month" />
            <Stat label="Commits this month" value="164" hint="last today" />
            <Stat label="Share of Claude this week" value="64%" hint="of agent use at list prices" />
          </Grid>
        </Region>
        <Grid columns="minmax(0, 1.6fr) minmax(0, 1fr)" gap={8}>
          <Region n={5} label="This month by service" status="built">
            <Stack gap={5}>
              <ServiceBar name="Claude" used={82} amount="£50" />
              <ServiceBar name="Cursor" used={18} amount="£11" />
            </Stack>
          </Region>
          <Region n={6} label="Six months" status="built">
            <Stack gap={5}>
              <Sparkline title="Kiln's monthly total, six months" values={[0, 0, 0, 1, 3, 61]} />
              <Grid columns="minmax(0, 1fr) 60px" gap={6}>
                <Input value="Studio" />
                <Btn>Save</Btn>
              </Grid>
            </Stack>
          </Region>
        </Grid>
        <Region n={11} label="Agent work · last 30 days" status="built">
          <Stack gap={4}>
            <Mini tone="default">$6,480 · $7 per commit (your average $5) · 912 commits</Mini>
            <Mini tone="muted">Where it goes: cache writes 46% · cache reads 44% · output 10%</Mini>
            <Mini tone="muted">Idle re-writes 35% (you: 33%) · Opus on subagents 100% · cache hit 94%</Mini>
            <Mini tone="default">1. Run long commands in the background · about $1,310 · 2. Put subagents on Sonnet</Mini>
          </Stack>
        </Region>
        <Grid columns="minmax(0, 1fr) minmax(0, 1fr) 150px" gap={8}>
          <Region n={7} label="Linked at providers" status="built">
            <Grid columns="90px minmax(0, 1fr) 70px" gap={6}>
              <Mini tone="muted">Vercel project</Mini>
              <Mini tone="default">kiln</Mini>
              <Btn>Unlink</Btn>
            </Grid>
          </Region>
          <Region n={8} label="Repos" status="built">
            <Stack gap={2}>
              <Mini>github.com/rowanhale/kiln</Mini>
              <Mini>github.com/rowanhale/kiln-release</Mini>
            </Stack>
          </Region>
          <Stack />
        </Grid>
      </Wireframe>
    </Stack>
  );
}

// ---------------------------------------------------------------- services

const PLAN_COLUMNS = [110, 100, 124, 76, undefined, 60];

function TheServices() {
  return (
    <Wireframe toolbar={<Crumb>Services · 12 in use · plans come to about £146 a month before usage</Crumb>} gap={8}>
      <Region n={1} label="Add a service" status="built">
        <Grid columns="minmax(0, 1.2fr) 110px minmax(0, 1.4fr) 100px" gap={6}>
          <Input label="Name" placeholder="Sentry" />
          <Input label="Kind of service" value="Tools" select />
          <Input label="Website (optional)" placeholder="https://sentry.io" />
          <Btn primary>Add service</Btn>
        </Grid>
      </Region>
      <Region n={2} label="Add a plan" status="built">
        <Grid columns="minmax(0, 1.2fr) minmax(0, 1fr) 80px 70px 56px 48px 80px 90px 76px" gap={6}>
          <Input label="Service" value="Render" select />
          <Input label="Plan" placeholder="Pro, or a domain" />
          <Input label="Kind" value="Recurring" select />
          <Input label="Renews" value="Monthly" select />
          <Input label="Price" placeholder="25.00" />
          <Input label="Currency" value="USD" select />
          <Input label="Next renewal" placeholder="dd/mm/yyyy" />
          <Input label="Split" value="Shared overhead" select />
          <Btn primary>Add plan</Btn>
        </Grid>
      </Region>
      <Region n={3} label="Found in your repos" status="built">
        <MiniTable
          widths={[150, undefined, 60, 64]}
          rows={[
            ["Cloudflare Workers and R2", "Tidewater's server; Plinth's media from its second phase.", "I use it", "Not mine"],
            ["Resend", "Found in Bramble and Plinth.", "I use it", "Not mine"],
            ["Stripe", "Found in Bramble and Plinth; fees come out of payouts.", "I use it", "Not mine"],
          ]}
        />
      </Region>
      <Region n={4} label="Agents · AI APIs · Background jobs · Domains …" status="built">
        <Stack gap={6}>
          <Mini tone="muted">Agents · £0 this month · £750 over 12 months</Mini>
          <MiniTable
            widths={PLAN_COLUMNS}
            rows={[
              ["Claude Max 5x", "$100 a month", "Renews 17 Oct", "By usage", "Weekly limit, Five-hour window, Weekly limit, Sonnet", "Edit"],
              ["Cursor Pro+", "$60 a month", "Renews 25 Oct", "By usage", "Cursor models pool, Third-party models pool", "Edit"],
            ]}
          />
          <Mini tone="muted">AI APIs · £55 this month · £334 over 12 months</Mini>
          <MiniTable
            widths={PLAN_COLUMNS}
            rows={[
              ["Anthropic API", "Prepaid", "$6 left · 4 days", "By usage", "", "Balance"],
              ["OpenAI", "Prepaid", "$48 left · 33 days", "By usage", "", "Balance"],
            ]}
          />
          <Mini tone="muted">Background jobs · £4 this month</Mini>
          <MiniTable widths={PLAN_COLUMNS} rows={[["Inngest Pro", "Usage", "", "By usage", "Billed through Vercel", "Edit"]]} />
          <Mini tone="muted">Domains · £1 this month · £104 over 12 months</Mini>
          <MiniTable
            widths={PLAN_COLUMNS}
            rows={[
              ["kiln-editor.dev", "£11 a year", "Renews 3 Dec", "Kiln", "", "Edit"],
              ["bramble.fm", "£64 a year", "Renews 8 Mar", "Bramble", "", "Edit"],
            ]}
          />
        </Stack>
      </Region>
      <Grid columns="minmax(0, 1.5fr) minmax(0, 1fr)" gap={8}>
        <Region n={5} label="Edit · Claude Max 5x" status="built" dashed>
          <Grid columns="64px 64px 96px 96px 56px 104px" gap={6}>
            <Input value="100.00" />
            <Input value="USD" select />
            <Input value="17/11/2026" />
            <Input value="By usage" select />
            <Btn primary>Save</Btn>
            <Btn>Cancel plan</Btn>
          </Grid>
        </Region>
        <Region n={6} label="Balance · Anthropic API" status="built" dashed>
          <Grid columns="minmax(0, 1fr) minmax(0, 1fr) 56px" gap={6}>
            <Input label="Left now" value="6.00" />
            <Input label="Currency" value="USD" select />
            <Btn primary>Save</Btn>
          </Grid>
        </Region>
      </Grid>
    </Wireframe>
  );
}

// ---------------------------------------------------------------- agents

const WEEKS = ["W30", "W31", "W32", "W33", "W34", "W35", "W36", "W37", "W38", "W39", "W40", "W41"];

function TheAgents() {
  return (
    <Wireframe toolbar={<Crumb>Agents · $2,140 of agent work at list prices, for £120 in plans</Crumb>} gap={8}>
      <Grid columns="minmax(0, 1.6fr) minmax(0, 1fr)" gap={8}>
        <Region n={1} label="Limits · now → at reset" status="built">
          <Stack gap={8}>
            <LimitRow label="Weekly limit" plan="Claude Max 5x" now={58} at={112} level="danger" note="Runs out on Sunday around 18:40, 15 hours before it resets. Resets Mon 12 Oct, 10:00." />
            <LimitRow label="Cursor models pool" plan="Cursor Pro+" now={33} at={59} level="ok" note="On track for about 59% by the reset. Resets Sun 25 Oct, 01:00." />
            <LimitRow label="Five-hour window" plan="Claude Max 5x" now={0} level="ok" note="Reset at 11:00; no reading since." />
            <LimitRow label="Third-party models pool" plan="Cursor Pro+" now={4} at={8} level="ok" note="On track for about 8% by the reset." />
            <LimitRow label="Weekly limit, Sonnet" plan="Claude Max 5x" now={22} at={37} level="ok" note="Estimated from agent usage since your reading on Fri 9 Oct, 21:30. On track for about 37%." />
          </Stack>
        </Region>
        <Stack gap={8}>
          <Region n={2} label="Habits · last 7 days" status="built">
            <MiniTable
              widths={[undefined, 40]}
              right={[1]}
              rows={[
                ["Cache re-written after idle waits (study: 41%)", "26%"],
                ["Main-chat calls past 200K tokens", "7%"],
                ["Opus on subagents (Sonnet costs half)", "12%"],
              ]}
            />
          </Region>
          <Region n={6} label="Collector · runs on your Mac" status="building">
            <Stack gap={3}>
              <Mini tone="default">Last report 11:52.</Mini>
              <Mini tone="muted">Reads Claude Code's logs, Cursor's local history and git, and sends daily totals only.</Mini>
            </Stack>
          </Region>
        </Stack>
      </Grid>
      <Region n={3} label="Save a reading" status="built">
        <Grid columns="minmax(0, 1.4fr) 70px 150px 100px" gap={6}>
          <Input label="Limit" value="Claude Max 5x: Weekly limit" select />
          <Input label="Used (%)" placeholder="58" />
          <Input label="Resets (London time)" value="12/10/2026, 10:00" />
          <Btn primary>Save reading</Btn>
        </Grid>
      </Region>
      <Grid columns="minmax(0, 1.3fr) minmax(0, 1fr)" gap={8}>
        <Region n={4} label="By project · this month" status="built">
          <MiniTable
            widths={[undefined, 60, 50, 56, 44, 56, 60]}
            head={["Project", "Claude Code", "Cursor", "Total", "Share", "Commits", "Per commit"]}
            right={[1, 2, 3, 4, 5, 6]}
            rows={[
              ["Kiln", "$1,302", "$41*", "$1,343", "64%", "164", "$8.19"],
              ["Plinth", "$224", "$9*", "$233", "11%", "77", "$3.03"],
              ["Signal Desk", "$183", "$6*", "$189", "9%", "41", "$4.61"],
              ["Bramble", "$165", "$5*", "$170", "8%", "23", "$7.39"],
            ]}
          />
        </Region>
        <Region n={5} label="By model" status="built">
          <MiniTable
            widths={[undefined, 50, 50, 60]}
            head={["Model", "Calls", "Output", "List price"]}
            right={[1, 2, 3]}
            rows={[
              ["claude-opus-5-5", "7,910", "5.8M", "$1,290"],
              ["claude-sonnet-5-5", "5,120", "3.9M", "$760"],
              ["composer-2.5 (Cursor)", "1,650", "6.1M", "$90"],
            ]}
          />
        </Region>
      </Grid>
      <Region n={9} label="What a budget buys" status="built">
        <Stack gap={5}>
          <Grid columns="50px 70px 70px 70px minmax(0, 1fr)" gap={6}>
            <Text size="sm" weight="bold">
              For £
            </Text>
            <Input value="150" />
            <Text size="sm" weight="bold">
              a month
            </Text>
            <Btn primary>Show</Btn>
            <Stack />
          </Grid>
          <Text size="sm" weight="bold">
            Claude Max 5x with £20 of extra usage and Cursor Pro+ keep 84% of your pace in a busy week, 90% in a typical one: about 171 of 204 commits a week.
          </Text>
          <MiniTable
            widths={[64, undefined, 56, 64, 90]}
            head={["A month", "Plans", "Busy", "Typical", "Commits"]}
            right={[2, 3, 4]}
            rows={[
              ["£30", "Claude Pro and Cursor Pro", "18%", "20%", "37 of 204"],
              ["£120", "Claude Max 5x and Cursor Pro+", "79%", "86%", "161 of 204"],
              ["£195", "Max 5x for Studio, Max 5x for the rest, and Cursor Pro+", "93%", "95%", "190 of 204"],
              ["£270", "Max 20x for Studio, Max 5x for the rest, and Cursor Pro+", "100%", "100%", "204 of 204"],
            ]}
          />
          <Mini tone="muted">Habits: halving idle cache re-writes gives back about 12% of a busy week, 24 commits. Rests on: Max 5x holds $1,180 a week, measured; before readings, an assumed $1,250 you can edit, with half and twice shown.</Mini>
        </Stack>
      </Region>
      <Region n={8} label="Capacity and cost" status="built">
        <Stack gap={5}>
          <Text size="sm" weight="bold">
            Max 5x runs short in a busy week; a second Max 5x for the rest holds it for £75 more a month.
          </Text>
          <Mini tone="muted">Claude, from 7 weeks of work: a typical week is $1,290 at list prices, a busy one $1,430.</Mini>
          <MiniTable
            widths={[undefined, 56, 56, 84, undefined]}
            head={["Option", "A month", "Typical", "Busy week", "In a busy week it gives up"]}
            right={[1, 2, 3]}
            rows={[
              ["Claude Pro", "£15", "9×", "11×, day 1", "Stops 6 side projects; Kiln at 14% of its pace"],
              ["Max 5x (now)", "£75", "109%", "121%, day 6", "Side projects at 49% of their pace (about 38 commits a week)"],
              ["Max 5x, and Pro for the rest", "£90", "101%", "112%, day 6", "Side projects at 71% of their pace"],
              ["Max 5x, and Max 5x for the rest (suggested)", "£150", "62%", "68%", "Nothing"],
              ["Max 5x with extra usage", "£262", "109%", "121%", "Nothing; about £187 a month on top"],
            ]}
          />
          <Mini tone="muted">Cursor: waits for two readings of Pro+'s pool a day apart.</Mini>
        </Stack>
      </Region>
      <Region n={10} label="Habits by project · last 30 days" status="built">
        <MiniTable
          widths={[undefined, 60, 56, 44, 44, 60, undefined]}
          head={["Project", "Work", "Cache hit", "Idle", "200K+", "Opus subs", "Best change"]}
          right={[1, 2, 3, 4, 5]}
          rows={[
            ["kiln", "$6,480", "94%", "35%", "0%", "100%", "Run long commands in the background · about $1,310"],
            ["arcade-bolt", "$1,720", "96%", "22%", "0%", "100%", "Put subagents on Sonnet · about $540"],
            ["tidewater", "$1,190", "92%", "39%", "0%", "100%", "Run long commands in the background · about $260"],
            ["All projects", "$10,240", "94%", "33%", "0%", "100%", ""],
          ]}
        />
      </Region>
      <Region n={7} label="Cost per commit over time" status="built">
        <LineChart
          title="Cost per commit, by week"
          x={WEEKS}
          unit="$"
          height={120}
          caption="Agent work at list prices over commits, for the busiest projects; All projects in grey"
          series={[
            { name: "Kiln", values: [11.2, 10.4, 9.8, 10.1, 9.2, 8.7, 8.9, 8.1, 7.6, 7.9, 7.3, 7.1] },
            { name: "Signal Desk", values: [6.1, 5.8, 5.9, 5.2, 5.4, 5.0, 4.8, 4.9, 4.6, 4.4, 4.7, 4.5] },
            { name: "Plinth", values: [4.2, 4.0, 3.9, 3.6, 3.7, 3.4, 3.3, 3.1, 3.2, 3.0, 2.9, 3.0] },
            { name: "All projects", values: [7.4, 7.0, 6.8, 6.5, 6.2, 5.9, 5.8, 5.5, 5.3, 5.2, 5.0, 4.9], tone: "muted" },
          ]}
        />
      </Region>
    </Wireframe>
  );
}

// ---------------------------------------------------------------- ledger

function TheLedger() {
  return (
    <Wireframe toolbar={<Crumb>Ledger</Crumb>} gap={8}>
      <PageHead
        title="Ledger"
        meta="October 2026"
        right={
          <>
            <Btn>← September</Btn>
            <Btn>November →</Btn>
          </>
        }
      />
      <Region n={2} label="Add a charge" status="built">
        <Grid columns="90px minmax(0, 1.4fr) 60px 56px 64px 96px minmax(0, 1fr) 56px" gap={6}>
          <Input label="Date" value="10/10/2026" />
          <Input label="Service and plan" value="Render · Standard" select />
          <Input label="Amount" placeholder="25.00" />
          <Input label="Currency" value="USD" select />
          <Input label="In pounds" placeholder="18.75" />
          <Input label="Kind" value="Subscription" select />
          <Input label="Note" />
          <Btn primary>Add</Btn>
        </Grid>
      </Region>
      <Grid columns="minmax(0, 1fr) 160px" gap={8}>
        <Region n={3} label="Charges · £96.40 paid · £120.00 expected" status="built">
          <MiniTable
            widths={[60, undefined, 90, 76, 70, 64, 96]}
            head={["Date", "Service", "Kind", "Source", "Charged", "Pounds", ""]}
            right={[4, 5]}
            rows={[
              ["25 Oct", "Cursor · Pro+", "Subscription", "Expected", "$60.00", "£45.00", "Paid · Delete"],
              ["17 Oct", "Claude · Max 5x", "Subscription", "Expected", "$100.00", "£75.00", "Paid · Delete"],
              ["6 Oct", "Framer", "Subscription", "Statement", "$20.00", "£15.07", ""],
              ["4 Oct", "Anthropic API · Prepaid credit", "Top-up", "Statement", "$32.00", "£24.10", ""],
              ["2 Oct", "Vercel · Pro", "Subscription", "Statement", "$27.40", "£20.63", ""],
              ["1 Oct", "Neon · Scale", "Usage", "Statement", "$12.80", "£9.64", ""],
            ]}
          />
        </Region>
        <Stack gap={8}>
          <Region n={1} label="Month" status="built">
            <Mini>← September · November →</Mini>
          </Region>
          <Region n={4} label="Filters" status="built">
            <Stack gap={4}>
              <Input value="All services" select />
              <Input value="Bramble" select />
            </Stack>
          </Region>
        </Stack>
      </Grid>
    </Wireframe>
  );
}

// ---------------------------------------------------------------- import, with the rule playground

const SEED_RULES: [string, string][] = [
  ["CLAUDE.AI", "Claude"],
  ["ANTHROPIC", "Anthropic API"],
  ["CURSOR", "Cursor"],
  ["OPENAI", "OpenAI"],
  ["VERCEL", "Vercel"],
  ["RENDER.COM", "Render"],
  ["NEON", "Neon"],
  ["INNGEST", "Inngest"],
  ["IONOS", "IONOS"],
  ["CLOUDFLARE", "Cloudflare"],
  ["FLY.IO", "Fly.io"],
  ["GITHUB", "GitHub"],
];

const DESCRIPTORS = [
  "VERCEL INC. COVINA USA",
  "ANTHROPIC SAN FRANCISCO",
  "FRAMER B.V. AMSTERDAM",
  "PADDLE.NET* TABLEPLUS",
  "GOOGLE*CLOUD 9KD2MP",
  "LINEAR.APP",
  "WAITROSE 0613",
  "1&1 IONOS 0800",
];

function suggestPattern(description: string): string {
  const text = description.trim().toUpperCase();
  const processor = /^[^*\d]+\*\s?[A-Z][A-Z.&-]*(?![A-Z0-9])/.exec(text);
  if (processor) return processor[0];
  const first = /^\S+/.exec(text)?.[0] ?? text;
  return first.length >= 4 ? first : (/^\S+\s+\S+/.exec(text)?.[0] ?? text);
}

function suggestName(description: string): string {
  const processors = new Set(["PADDLE", "PADDLE.NET", "SQ", "PAYPAL", "STRIPE"]);
  const parts = suggestPattern(description)
    .split("*")
    .map((p) => p.trim())
    .filter(Boolean);
  const words = (parts.length > 1 && processors.has(parts[0]) ? parts.slice(1) : parts).join(" ").split(/\s+/);
  return words
    .map((w) => w.replace(/\.(COM|NET|APP|IO|AI|DEV|CO|UK)$/, ""))
    .map((w) => (w.length <= 3 && /^[A-Z]+$/.test(w) ? w : w.charAt(0) + w.slice(1).toLowerCase()))
    .join(" ");
}

/** Illustrative: a descriptor a seeded rule recognises is matched; any other waits in the inbox with a suggested rule and name. */
function RulePlayground() {
  const [picked, setPicked] = useCanvasState<string>("descriptor", DESCRIPTORS[2]);
  const rule = SEED_RULES.find(([p]) => picked.toUpperCase().includes(p));
  return (
    <Stack gap={10}>
      <Heading level={3}>Try the inbox's suggestions</Heading>
      <Text size="sm" tone="secondary">
        Click a card descriptor. One a seeded rule recognises is matched as it's imported; any other waits in the inbox with a suggested rule and, for New service…, a name. Illustrative: the same logic as the app, on made-up rows.
      </Text>
      <Row gap={6} wrap>
        {DESCRIPTORS.map((d) => (
          <Chip key={d} selected={picked === d} onClick={() => setPicked(d)}>
            {d}
          </Chip>
        ))}
      </Row>
      <Region>
        {rule ? (
          <Stack gap={3}>
            <Text size="sm" weight="bold">
              Matched on import
            </Text>
            <Mini>{`The rule ${rule[0]} → ${rule[1]} recognises it, so it confirms ${rule[1]}'s expected charge if one is within 6 days and 15%, or becomes a new charge.`}</Mini>
          </Stack>
        ) : (
          <Stack gap={6}>
            <Text size="sm" weight="bold">
              Waits in the inbox
            </Text>
            <Grid columns="150px 110px 90px 110px 120px 72px" gap={6}>
              <Input value="New service…" select />
              <Input value={suggestName(picked)} />
              <Input value="Tools" select />
              <Mini>and always for</Mini>
              <Input value={suggestPattern(picked)} />
              <Btn>Assign</Btn>
            </Grid>
            <Mini tone="muted">The rule keeps the merchant and drops the reference, city and country after it; for a payment processor it keeps the product after the asterisk.</Mini>
          </Stack>
        )}
      </Region>
    </Stack>
  );
}

function ImportWindow() {
  return (
    <Wireframe toolbar={<Crumb>Import · last statement 18 min ago (revolut)</Crumb>} gap={8}>
      <Region n={1} label="Import a statement" status="built">
        <Stack gap={6}>
          <Grid columns="minmax(0, 1.4fr) minmax(0, 1fr) 110px" gap={6}>
            <Input label="Statement (CSV)" value="revolut-2026-10.csv" />
            <Input label="Account" value="revolut" />
            <Btn primary>Import 7 rows</Btn>
          </Grid>
          <Grid columns="repeat(6, minmax(0, 1fr))" gap={6}>
            <Input label="Date" value="Completed Date" select />
            <Input label="Description" value="Description" select />
            <Input label="Amount (£)" value="Amount" select />
            <Input label="Currency" value="Currency" select />
            <Input label="Original amount" value="Orig. amount" select />
            <Input label="Original currency" value="Orig. currency" select />
          </Grid>
          <Mini tone="muted">7 payments out, 2 payments in left out. First few:</Mini>
          <MiniTable
            widths={[60, undefined, 64, 64]}
            right={[2, 3]}
            rows={[
              ["2 Oct", "VERCEL INC. COVINA USA", "£20.63", "$27.40"],
              ["4 Oct", "ANTHROPIC SAN FRANCISCO", "£24.10", "$32.00"],
              ["6 Oct", "FRAMER B.V. AMSTERDAM", "£15.07", "$20.00"],
            ]}
          />
        </Stack>
      </Region>
      <Region n={2} label="Inbox · 2 card charges no rule recognises" status="built">
        <Stack gap={5}>
          <Grid columns="48px minmax(0, 1fr) 56px" gap={6}>
            <Mini tone="muted">6 Oct</Mini>
            <Text size="sm" weight="bold">
              FRAMER B.V. AMSTERDAM
            </Text>
            <Mini>£15.07</Mini>
          </Grid>
          <Grid columns="minmax(0, 1fr) 170px" gap={6}>
            <Grid columns="150px 90px 80px 96px 90px 72px" gap={6}>
              <Input value="New service…" select />
              <Input value="Framer" />
              <Input value="Tools" select />
              <Mini>☑ always for</Mini>
              <Input value="FRAMER" />
              <Btn>Assign</Btn>
            </Grid>
            <Btn>Not a project cost</Btn>
          </Grid>
        </Stack>
      </Region>
      <Grid columns="minmax(0, 1.3fr) minmax(0, 1fr)" gap={8}>
        <Region n={3} label="Recently imported" status="built">
          <MiniTable
            widths={[60, undefined, 68, 60, 52]}
            right={[3]}
            rows={[
              ["7 Oct", "IONOS CLOUD LTD", "matched", "£0.95", "Undo"],
              ["5 Oct", "WAITROSE 0613", "ignored", "£31.80", "Undo"],
              ["4 Oct", "ANTHROPIC SAN FRANCISCO", "matched", "£24.10", "Undo"],
              ["2 Oct", "VERCEL INC. COVINA USA", "matched", "£20.63", "Undo"],
            ]}
          />
        </Region>
        <Stack gap={8}>
          <Region n={4} label="Cursor usage" status="built">
            <Stack gap={4}>
              <Grid columns="minmax(0, 1fr) 70px" gap={6}>
                <Input placeholder="Cursor usage export (CSV)" />
                <Btn>Import</Btn>
              </Grid>
              <Mini tone="muted">cursor.com/dashboard → Usage → Export</Mini>
            </Stack>
          </Region>
          <Region n={5} label="Rules" status="built">
            <MiniTable
              widths={[28, undefined, 70]}
              rows={[
                ["40", "FRAMER → Framer", "Remove"],
                ["40", "WAITROSE → ignore", "Remove"],
                ["50", "VERCEL → Vercel", "Remove"],
              ]}
            />
          </Region>
        </Stack>
      </Grid>
    </Wireframe>
  );
}

// ---------------------------------------------------------------- settings

function TheSettings() {
  return (
    <Wireframe toolbar={<Crumb>Settings</Crumb>} gap={8}>
      <Region n={1} label="Connectors · 1 of 7 syncing daily at 05:00 UTC" status="building">
        <MiniTable
          widths={[110, undefined, undefined, 120, 130]}
          rows={[
            ["Vercel", "Projects, so new ones show to be linked; billed usage per project", "TALLY_VERCEL_TOKEN not set", "Last sync 06:00", "Sync now · Turn off"],
            ["OpenAI", "Daily API cost per project, to split top-ups and work out runway", "TALLY_OPENAI_ADMIN_KEY not set", "Last sync 06:00", "Sync now · Turn off"],
            ["Anthropic API", "Daily API cost per workspace", "TALLY_ANTHROPIC_ADMIN_KEY not set", "Last sync 06:00", "Sync now · Turn off"],
            ["Neon", "Projects and daily compute and storage, priced at the plan's rates", "TALLY_NEON_API_KEY not set", "Last sync 06:00", "Sync now · Turn off"],
            ["IONOS", "Domains and when each renews", "TALLY_IONOS_API_KEY not set", "", "Sync now · Turn off"],
            ["Cloudflare", "Subscriptions, billing history, TURN egress", "TALLY_CLOUDFLARE_API_TOKEN not set", "", "Sync now · Turn off"],
            ["Exchange rates", "Daily ECB rates from dollars and euros to pounds", "No key needed", "", "Sync now · Turn off"],
          ]}
        />
      </Region>
      <Grid columns="170px minmax(0, 1fr)" gap={8}>
        <Stack gap={8}>
          <Region n={2} label="Budgets" status="built">
            <Stack gap={4}>
              <Input label="Each month (£)" value="250" />
              <Input label="Studio (£)" value="120" />
              <Input label="Sideline (£)" value="150" />
              <Row>
                <Btn primary>Save</Btn>
              </Row>
            </Stack>
          </Region>
          <Region n={5} label="Remembered banks (on Import)" status="built">
            <Mini tone="muted">revolut · Completed Date, Description, Amount</Mini>
          </Region>
        </Stack>
        <Region n={3} label="Model prices · per million tokens" status="built">
          <MiniTable
            widths={[undefined, 84, 52, 64, 64, 56]}
            head={["Model", "From", "Input", "Cache write", "Cache read", "Output"]}
            right={[2, 3, 4, 5]}
            rows={[
              ["claude-opus-5-5", "2026-10-08", "$4.00", "$5.00", "$0.20", "$20.00"],
              ["claude-sonnet-5-5", "2026-10-08", "$2.00", "$2.50", "$0.10", "$10.00"],
              ["claude-haiku-5-5", "2026-10-08", "$0.10", "$0.125", "$0.01", "$0.50"],
              ["composer-2.5", "2026-10-08", "$0.50", "$0.50", "$0.20", "$2.50"],
            ]}
          />
        </Region>
      </Grid>
      <Region n={4} label="Repo rules" status="built">
        <MiniTable
          widths={[undefined, 140, 64]}
          rows={[
            ["github.com/rowanhale/kiln", "→ Kiln", "Remove"],
            ["github.com/rowanhale/kiln-release", "→ Kiln", "Remove"],
            ["github.com/rowanhale/signal-desk", "→ Signal Desk", "Remove"],
            ["github.com/rowanhale/bramble-web", "→ Bramble", "Remove"],
          ]}
        />
      </Region>
    </Wireframe>
  );
}

// ---------------------------------------------------------------- behind the scenes

function TheScenes() {
  return (
    <Stack gap={12}>
      <Region n={1} label="Daily sync · 05:00 UTC" status="building">
        <Pipe
          steps={[
            { title: "Vercel Cron", detail: "/api/cron/sync, CRON_SECRET" },
            { title: "Runner", detail: "Date window: a backfill first, then an overlap; credentials; the run log" },
            { title: "Each connector's sync()", detail: "Fetches and validates with Zod; plan-gated endpoints become warnings" },
            { title: "Writes", detail: "Resources, usage, invoices, balances, limits, rates, prices; idempotent" },
            { title: "Expected charges", detail: "Each recurring plan's next charge, written ahead" },
          ]}
        />
      </Region>
      <Region n={2} label="The collector · hourly on the Mac" status="building">
        <Pipe
          steps={[
            { title: "launchd", detail: "install-launchd.sh, or npm run collect" },
            { title: "Read", detail: "Claude Code logs; Cursor's replay at most every 20 hours; git" },
            { title: "Daily totals", detail: "Per repo, day, model and role; idle re-writes and large-context calls" },
            { title: "Ingest", detail: "POST /api/ingest/agent-usage with TALLY_INGEST_TOKEN" },
            { title: "Priced", detail: "Longest model prefix, the price in force that day; projects from repo rules" },
          ]}
        />
      </Region>
      <Region n={3} label="A statement" status="built">
        <Pipe
          steps={[
            { title: "CSV", detail: "Any bank's export; columns mapped once" },
            { title: "Rows", detail: "Money out only; hashed so none is added twice" },
            { title: "Rules", detail: "Descriptor to service, or ignore" },
            { title: "Match", detail: "An expected charge within 6 days and 15% is confirmed" },
            { title: "Charge or inbox", detail: "A new charge, or a row for you to sort" },
          ]}
        />
      </Region>
      <Region n={4} label="From charges to projects" status="built">
        <Pipe
          steps={[
            { title: "Charge", detail: "The amount paid, in pounds and its own currency" },
            { title: "Lines", detail: "One per service and plan it covers, such as Inngest on Vercel's charge" },
            { title: "Split", detail: "A project, fixed shares, by usage, or shared" },
            { title: "Usage", detail: "Provider usage and agent usage set the shares" },
            { title: "Project cost", detail: "Running and building, to the penny" },
          ]}
        />
      </Region>
    </Stack>
  );
}

// ---------------------------------------------------------------- the canvas

export default function TallyWireframes() {
  return (
    <Wireframes
      data={data}
      drawings={{
        shell: <TheShell />,
        "month-top": <MonthTop />,
        "month-rest": <MonthRest />,
        projects: <TheProjects />,
        services: <TheServices />,
        agents: <TheAgents />,
        ledger: <TheLedger />,
        "import-window": <ImportWindow />,
        "import-playground": <RulePlayground />,
        settings: <TheSettings />,
        scenes: <TheScenes />,
      }}
    />
  );
}

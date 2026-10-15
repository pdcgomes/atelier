---
name: canvas
description: Shows the user live canvases in their browser with Atelier — plans, workstreams, reviews, comparisons, dashboards, charts and forms — and reads back what they do on them (marks, approvals, answers). Use when work has many moving parts to track, when results are easier to see than to read (tables, charts, images, diffs), when you need structured answers or sign-off from the user, or when you run a loop of agents the user should steer. Also use whenever you create or edit a file in a .atelier/ folder.
---

# Canvases with Atelier

A canvas is a file in the project's `.atelier/` folder that Atelier shows the user, live, in their browser. You write it; they look, mark things done, approve or hold, fill in forms and start agents from it. What they do is kept beside the canvas, where you read it.

Use a canvas when the user would rather see the work than scroll through it:

- **Work with many parts:** a release, a migration, a build with lanes of tasks. Show what's done, what's next, what's blocked and what needs them.
- **Results:** benchmark tables, charts, screenshots and renders, before-and-after diffs, review findings.
- **Questions with structure:** a brief to fill in, options to pick between, a cut to approve.
- **Loops of agents:** what each one is doing, and buttons to start, resume or message them.

Keep one canvas per piece of work, and update it in place as things change: it reloads in front of the user and keeps their marks, their tab and where they'd scrolled to. Don't make a canvas for something one paragraph answers.

## Two kinds of canvas

**From a template:** `.atelier/<name>.canvas.json`, data only. Prefer a template when one fits: it's less to write, it's checked against its schema, and it looks the same each time. `atelier new <template> <name>` starts one from its example.

| Template | For |
| --- | --- |
| `workstream` | One line of work: goal, plan steps, Needs you, ready and blocked, decisions, log, measurements |
| `studio` | A studio of agents making something big: milestones by phase, every deliverable's state, roles, how work moves, agents |
| `room` | Pieces (posts, videos, articles, releases) moving through stages to approval and out to channels, with the schedule |
| `board` | Columns of cards, with a list that sorts and filters |
| `checklist` | Groups of things to tick, for a release or a launch; the user ticks, you mark what you've checked |
| `review` | Findings by severity, with where, what's proposed and a diff, and the user's call on each |
| `compare` | Options side by side, scored against weighted criteria, with a recommendation and the user's pick |
| `report` | Headline numbers, then sections of text with charts, tables and images, and sources |

`reference/templates.md`, beside this file, has every template's fields and a whole example of each. Read the one you use before writing its data.

**Custom:** `.atelier/<name>.canvas.tsx`, a React component built from the kit. Use it for anything the templates don't cover. It can draw a template's view and add to it: `import { Workstream, type WorkstreamData } from "atelier/templates"`.

Name canvases for what they're about: `release-1-4.canvas.tsx`, `onboarding-review.canvas.json`. Times (`updated`, a log entry's `at`) are ISO with the time zone, taken from the clock with `date -Iseconds`, never guessed: the canvas shows how long ago they were.

## Writing a custom canvas

```tsx
import { Panel, Stack, Row, Stat, Table, NeedsYou, BarChart, Badge } from "atelier";

export const meta = { title: "Release 1.4" };

const checks = [
  { name: "Unit tests", state: "passed", minutes: 4 },
  { name: "Visual diffs", state: "failed", minutes: 9 },
];

export default function Release() {
  return (
    <Stack>
      <Panel title="Release 1.4" info="3 of 5 steps">
        <Row>
          <Stat label="Tests" value="1,269" tone="success" />
          <Stat label="Waiting on you" value={1} tone="warning" />
        </Row>
      </Panel>
      <NeedsYou id="store" title="Upload the build to the store" detail="Needs your login." blocking />
      <Panel title="Checks">
        <Table
          columns={[
            { key: "name", label: "Check" },
            { key: "state", label: "State", render: (r) => <Badge tone={r.state === "passed" ? "success" : "danger"}>{r.state}</Badge> },
            { key: "minutes", label: "Minutes", align: "right" },
          ]}
          rows={checks}
        />
      </Panel>
      <BarChart title="Minutes per check" categories={checks.map((c) => c.name)} series={[{ name: "minutes", values: checks.map((c) => c.minutes) }]} unit=" min" />
    </Stack>
  );
}
```

The rules, which `atelier check` enforces:

- The default export is a React component. `export const meta = { title }` names the canvas in the viewer.
- Import only from `"atelier"`, `"atelier/templates"` and `"react"`, and from `.ts`/`.tsx` files beside the canvas in `.atelier/`. There are no packages and no network: a canvas can't fetch anything. Put the data in the file, or in a helper file beside it.
- Colours come from the theme. Use `tone` props (`accent`, `success`, `warning`, `danger`, `info`, `muted`) and, in `style`, the theme's variables: `var(--text)`, `var(--text-2)`, `var(--text-3)`, `var(--panel)`, `var(--surface)`, `var(--border)`, `var(--accent)`, `var(--chart-1)` to `var(--chart-8)`. Hex, `rgb()` and named colours are refused, so every theme the user picks works.
- Images, videos, PDFs and Markdown are read from disk by path: absolute, `~/…`, or relative to the project's root (the folder with `.atelier` in it), as in `docs/plan.md` or `art/keeper.png`. Never embed them.
- Every chart needs a `title`.

`reference/atelier.d.ts`, beside this file, has every component and every prop. Read it before using a component you haven't used yet.

## The kit, in brief

- **Layout:** `Stack`, `Row`, `Grid`, `Split`, `Divider`, `Panel` (a titled box: `title`, `info`, `keys`, `tone`), `Tabs` (`tabs={[{ id, label, content }]}`), `Section` (folds away).
- **Text:** `Heading`, `Text` (`tone`, `size`), `Markdown`, `Code` (inline, or `block` with a copy button), `Kbd`, `Link` (`href` for the web, `path` for a file), `Time`.
- **Media:** `Image` (`path`, `alt`), `Gallery` (opens full size), `Video`.
- **Data:** `Table` (sorts, filters, row tones, row actions), `Stat`/`Stats`, `Badge`, `Meter`, `KeyValue`, `Timeline`, `Lanes` (columns of cards), `Calendar`, `Tree`, `DiffView`.
- **Charts:** `BarChart`, `LineChart`, `Sparkline`, `DonutChart`, `Histogram`, `ScatterChart`, `Heatmap`, `Gantt`, `FlowDiagram` (steps with loops back).
- **Answers from the user:** `Form` with `TextInput`, `TextArea`, `Select`, `Radio`, `Checkbox`, `Toggle`, `Slider`, `Rating`; `Approval` (approve or hold, with a note); `NeedsYou` (something only they can do: Done, Skip, or Ask the agent); `Button`.
- **Hooks:** `useCanvasState(key, initial)` keeps a value in the canvas's state; `useForm`, `useAction`, `useSessions`, `useTheme`, `useNow`.

## What the user does, and how you hear about it

Everything the user does on a canvas is kept in `<name>.state.json` beside it, and each change is appended to `<name>.events.jsonl` with its time. **Never write either file**; only the viewer does. Read them:

- the `canvas_state` tool, or `atelier state .atelier/<name>.canvas.tsx [--since <time>]`;
- where things are kept: a submitted `Form name="brief"` under `form:brief` (`{ values, at }`), an `Approval id="cut-2"` under `approval:cut-2` (`{ state: "approved" | "held", note, at }`), `NeedsYou` items under `needsYou` by id (`{ state: "done" | "skipped" | "asked", at }`), a checklist's ticks under `checks` by item id, and anything you keep with `useCanvasState` under its key. `null` is a mark the user took back with Undo.

When you need an answer before going on, wait for it:

1. Write the canvas with the question: a `Form`, an `Approval`, a `NeedsYou` item.
2. `canvas_open` to put it in front of the user, and tell them in a sentence what you need.
3. `canvas_wait` with the canvas's path and the keys you're waiting for (`["form:brief"]`, `["approval:"]`). It returns their answer, or says it timed out; wait again or carry on.
4. Act on the answer, then update the canvas so it shows what happened: mark the item done, show the result.

When you see on a canvas that the user marked something done, fold it in: show it as done (`NeedsYou` has a `done` prop for that), and move on to what it unblocked.

## Actions

`useAction()` gives a canvas `startSession({ prompt, mode })`, `openSession({ id })`, `tell({ session, text })`, `openFile({ path, line })` and `openUrl({ url })`. Each one is shown to the user with its prompt, and runs only if they confirm it. `startSession` runs Claude Code in the project, in a terminal tab (`mode: "terminal"`, the default) or in the background with its steps in the viewer (`"background"`). `tell` gives a working session the message when its turn ends. `useSessions()` lists the sessions with their status, so a canvas can show who is working on what.

A `Form` with `start={{ prompt: "Write the brief for {{goal}}" }}` starts an agent with the answers, and `NeedsYou` with `ask={{ prompt }}` offers "Ask the agent".

## Checking

After you write a canvas, the plugin checks it: a build, a type check against the kit, and the rules above. Problems come back to you with their lines; fix them, and the canvas appears as soon as it builds. You can check one yourself with `canvas_check` or `atelier check <file>`. A canvas that passes is shown to the user.

# Workstream

One line of work, kept up to date as it moves: its goal and where it stands, the plan's steps with what "done" means for each, what needs you, what's ready to start or blocked and by what, the decisions made and why, a log to catch up from, and measurements against their budgets.

```sh
atelier new workstream search
```

**The agent** keeps the data current in the same turn as each event: a step starts or lands, a measurement comes in, something needs you, a decision is made. Decisions and the log are history: entries are added, not rewritten. Only what was checked goes in.

**You** answer the Needs you items on the canvas with Done, Skip or Ask the agent. They're kept under `needsYou` in the canvas's state; the agent folds each into the data (`done: true`, and a `detail` that starts "Done:" with what came of it).

| Field | What it holds |
| --- | --- |
| `title`, `goal`, `status`, `updated` | What it's for, where it stands, and when that was written |
| `links` | Files (`path`) and web pages (`href`): the plan, the tracker |
| `needsYou` | What only you can do: `title`, `detail`, what it `unblocks`, `blocking`, a `command` to copy, `done` |
| `plan` | Steps with `id`, `step`, `detail`, `doneWhen`, `ref` and `status`: `not started`, `in progress`, `done`, `blocked` or `dropped` |
| `ready`, `blocked` | Work that could start now, and work waiting on something (`blockedBy`) |
| `decisions` | `at`, `decision`, `why` and `by` |
| `log` | `at`, `text` and `who`, newest shown first |
| `measurements` | `label`, `value`, `unit`, `budget`, which way is `better`, and earlier values in `history` |
| `agents` | Claude Code sessions by `id`, with their `title`, `role` and a `note`; the canvas shows what each is doing now |

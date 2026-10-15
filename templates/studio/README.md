# Studio

A studio of agents making something big, a game, an app, a site, run like a production. It shows the whole thing's progress, what's being made now and what waits on you, the milestones by phase with each one's gate, every deliverable and its state, the roles and who reviews whom, how a deliverable moves through the studio, the agents' sessions, and the decisions and log.

```sh
atelier new studio production
```

**The agent**, usually a producer agent briefing the others, keeps the data current: an item's `state` as it moves (`todo`, `doing`, `you` when it waits on you, `done`), a milestone's `status`, the `now` panel, a log entry for each thing that lands. An item is `done` only once it has passed its review.

**You** answer the Needs you items, and pick up any session from the Agents table, which shows what each is doing now.

| Field | What it holds |
| --- | --- |
| `title`, `summary`, `updated`, `links` | The production, where it stands, and its documents |
| `now` | `doing`, its `detail`, what's `waiting` on you, and the `next` checkpoint |
| `needsYou` | What only you can do, as in the workstream template |
| `phases` | `id`, `name`, `note`: the roadmap's columns |
| `milestones` | `id`, `name`, `phase`, `gate`, `status` (`active`, `waiting`, `next`, `later`, `done`) and `groups` of `items` with a `state` |
| `later` | What comes after the last milestone |
| `flow` | How a deliverable moves: `nodes`, `edges` (a `label` on the ones going back), and the `current` step |
| `roles` | `role`, what it `owns`, its `reviewer`, what it's doing `now`, and `active` |
| `agents`, `decisions`, `log` | As in the workstream template |

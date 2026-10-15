<!-- Generated from templates/*/README.md and example.json by scripts/reference.mjs; don't edit it by hand. -->

# The templates

A template canvas is `.atelier/<name>.canvas.json`: `"template"` names one of these, and the rest is its data, checked against its schema. `atelier new <template> <name>` starts one from its example. A custom canvas can draw a template's view and add to it: `import { Workstream, type WorkstreamData } from "atelier/templates"`, and `<Workstream data={data} />`; the views are `Workstream`, `Studio`, `Room`, `Board`, `Checklist`, `Review`, `Compare`, `Report`.

## Workstream

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
| `stats` | Headline numbers: `label`, `value` (as written) and `tone` |
| `needsYou` | What only you can do: `title`, `detail`, what it `unblocks`, `blocking`, a `command` to copy, `done` |
| `plan` | Steps with `id`, `step`, `detail`, `doneWhen`, `ref` and `status`: `not started`, `in progress`, `done`, `blocked` or `dropped` |
| `ready`, `blocked` | Work that could start now, and work waiting on something (`blockedBy`) |
| `decisions` | `at`, `decision`, `why` and `by` |
| `log` | `at`, `text` and `who`, newest shown first |
| `measurements` | `label`, `value`, `unit`, `budget`, which way is `better`, and earlier values in `history` |
| `charts` | Measured comparisons as bar charts: `title`, a `caption` saying what it's measured against, `categories`, `series`, `unit`, `horizontal` |
| `agents` | Claude Code sessions by `id`, with their `title`, `role` and a `note`; the canvas shows what each is doing now |

<details><summary>The example</summary>

```json
{
  "template": "workstream",
  "title": "Search in the library",
  "goal": "Find any photo in the library by its words: the file name, the camera, the keywords and the text in the picture, as you type.",
  "status": "The index is built and searching works in the app; ranking and the empty states are next. One decision waits on you.",
  "updated": "2026-10-15T09:40:00+01:00",
  "links": [
    { "label": "The plan", "path": "docs/plans/search.md" },
    { "label": "The tracker", "href": "https://github.com/example/library/issues/42" }
  ],
  "stats": [
    { "label": "Photos in the test library", "value": "50,000" },
    { "label": "Tests", "value": "214 passing", "tone": "success" }
  ],
  "needsYou": [
    {
      "id": "pick-ranking",
      "title": "Pick how results are ranked",
      "detail": "Newest first, or best match first with the newest breaking ties. The Measurements tab has both on the test library.",
      "unblocks": "Step 4, ranking",
      "blocking": true,
      "ask": { "prompt": "Compare the two rankings on my own library and recommend one." }
    },
    {
      "id": "try-search",
      "title": "Try searching your own library",
      "detail": "Open the app's latest build and search for a few photos you know. Say what you expected to find and didn't.",
      "command": "npm run app -- --library ~/Pictures/Library"
    },
    {
      "id": "api-key",
      "title": "Add the text-recognition key",
      "detail": "Done: added on 14 October; the text in pictures is now indexed.",
      "done": true
    }
  ],
  "plan": [
    { "id": "index", "step": "Build the index", "detail": "File names, camera, keywords and dates, updated as photos are imported.", "doneWhen": "A 50,000-photo library is indexed in under a minute", "ref": "#38", "status": "done" },
    { "id": "ocr", "step": "Index the text in pictures", "doneWhen": "Signs and documents are found by their words", "ref": "#39", "status": "done" },
    { "id": "search", "step": "Search as you type", "doneWhen": "Results in under 50 ms on the test library", "ref": "#40", "status": "in progress", "note": "Works in the app; the timings are on the Measurements tab" },
    { "id": "ranking", "step": "Rank the results", "doneWhen": "The ranking you pick, with tests", "ref": "#41", "status": "blocked", "note": "Waits on your pick in Needs you" },
    { "id": "empty", "step": "Empty and loading states", "status": "not started" },
    { "id": "smart-albums", "step": "Smart albums from a search", "status": "dropped", "note": "Moved to the next release" }
  ],
  "ready": [
    { "title": "Empty and loading states", "detail": "The designs are in the plan" }
  ],
  "blocked": [
    { "title": "Rank the results", "blockedBy": "Your pick", "detail": "Both rankings are built behind a setting" }
  ],
  "decisions": [
    { "at": "2026-10-13T10:00:00+01:00", "decision": "Keep the index in SQLite, with its full-text search", "why": "Fast enough on the test library, and nothing new to install", "by": "Measured" },
    { "at": "2026-10-14T16:20:00+01:00", "decision": "Smart albums wait for the next release", "why": "Search first, so it can be tried on its own", "by": "Owner" }
  ],
  "log": [
    { "at": "2026-10-15T09:40:00+01:00", "text": "Search as you type works in the app. On the test library a search takes 18 ms at the median and 41 ms at worst. Both rankings are behind a setting for your pick.", "who": "Agent" },
    { "at": "2026-10-14T18:05:00+01:00", "text": "The text in pictures is indexed now the key is in: 3,120 photos with text, found by their words.", "who": "Agent" },
    { "at": "2026-10-13T11:30:00+01:00", "text": "The index is built: 50,000 photos in 38 seconds, 22 MB on disk.", "who": "Agent" }
  ],
  "measurements": [
    { "label": "Search, median", "value": 18, "unit": " ms", "budget": 50, "better": "lower", "history": [64, 41, 27, 22, 18] },
    { "label": "Search, worst", "value": 41, "unit": " ms", "budget": 50, "better": "lower", "history": [180, 96, 60, 48, 41] },
    { "label": "Indexing 50,000 photos", "value": 38, "unit": " s", "budget": 60, "better": "lower", "note": "on a 2023 laptop" }
  ],
  "charts": [
    {
      "title": "Results a search finds, by ranking",
      "caption": "Twenty searches on the test library, against the photos you'd expect",
      "categories": ["Found first", "In the top five", "Not found"],
      "series": [
        { "name": "Newest first", "values": [6, 13, 1] },
        { "name": "Best match", "values": [14, 19, 1] }
      ]
    }
  ],
  "agents": [
    { "id": "4f0c2b6e-8a1d-4c3e-9b7a-2d5e6f708192", "title": "Search: the index and as you type", "role": "Engineer", "note": "Building the ranking setting" }
  ]
}
```

</details>

## Studio

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

<details><summary>The example</summary>

```json
{
  "template": "studio",
  "title": "Harbour Lights",
  "summary": "A puzzle game about a lighthouse keeper, made by a studio of agents. Pre-production is signed off; the vertical slice is half done.",
  "updated": "2026-10-15T09:30:00+01:00",
  "links": [
    { "label": "How the studio works", "path": "docs/studio.md" },
    { "label": "Design doc", "path": "docs/design.md" },
    { "label": "Art bible", "path": "docs/art-bible.md" }
  ],
  "now": {
    "doing": "The vertical slice: the first island, from the boat to the lamp",
    "detail": "The island's three puzzles are playable; its art is in review and its music is being written. 412 tests, none failing.",
    "waiting": "Your pick of the keeper's three designs, and a playtest of the first puzzle.",
    "next": "The slice, end to end, on Friday 23 October."
  },
  "needsYou": [
    { "id": "keeper-design", "title": "Pick the keeper's design", "detail": "Three designs are in art/keeper/: A is the old sailor, B the young apprentice, C the retired engineer.", "unblocks": "The keeper's animation", "blocking": true },
    { "id": "playtest-1", "title": "Playtest the first puzzle", "detail": "About ten minutes. Say where you got stuck and where it was too easy.", "command": "npm run play -- --level island-1" }
  ],
  "phases": [
    { "id": "p1", "name": "Prove it", "note": "Pre-production and a slice that shows the game" },
    { "id": "p2", "name": "Make it", "note": "Every island, the story and the sound" },
    { "id": "p3", "name": "Ship it", "note": "Polish, the stores and launch" }
  ],
  "milestones": [
    {
      "id": "M1", "name": "Pre-production", "phase": "p1", "status": "done", "gate": "The bibles signed off by you",
      "groups": [
        { "name": "Bibles", "items": [
          { "title": "Game design bible", "state": "done" },
          { "title": "Art bible", "state": "done" },
          { "title": "Sound bible", "state": "done" }
        ] }
      ]
    },
    {
      "id": "M2", "name": "Vertical slice", "phase": "p1", "status": "active", "gate": "The first island, finished, played by you end to end",
      "groups": [
        { "name": "Puzzles", "items": [
          { "title": "Light the lamp", "state": "done" },
          { "title": "The tide gates", "state": "done" },
          { "title": "The fog bell", "state": "doing", "note": "The bell's timing is being tuned" }
        ] },
        { "name": "Art", "note": "Reviewed by the art director against the art bible", "items": [
          { "title": "The island's backgrounds", "state": "doing" },
          { "title": "The keeper", "state": "you", "note": "pick a design" },
          { "title": "The boat", "state": "todo" }
        ] },
        { "name": "Sound", "items": [
          { "title": "The island's theme", "state": "doing" },
          { "title": "Waves, wind and the bell", "state": "todo" }
        ] }
      ]
    },
    {
      "id": "M3", "name": "Every island", "phase": "p2", "status": "next", "gate": "Five islands, each played through by QA",
      "groups": [{ "name": "Islands", "items": [
        { "title": "The second island", "state": "todo" },
        { "title": "The third island", "state": "todo" },
        { "title": "The fourth and fifth islands", "state": "todo" }
      ] }]
    },
    {
      "id": "M4", "name": "Launch", "phase": "p3", "status": "later", "gate": "On the stores, with its trailer",
      "groups": [{ "name": "Release", "items": [
        { "title": "Store pages", "state": "todo" },
        { "title": "The trailer", "state": "todo" }
      ] }]
    }
  ],
  "later": "After launch: a sixth island in winter, and a level editor.",
  "flow": {
    "title": "How every deliverable moves",
    "note": "Leads review against the bibles",
    "nodes": [
      { "id": "brief", "label": "Brief" },
      { "id": "work", "label": "Role agent works" },
      { "id": "review", "label": "Lead reviews" },
      { "id": "integrate", "label": "Integrate" },
      { "id": "qa", "label": "QA" },
      { "id": "gate", "label": "Your gate" }
    ],
    "edges": [
      { "from": "brief", "to": "work" },
      { "from": "work", "to": "review" },
      { "from": "review", "to": "integrate" },
      { "from": "integrate", "to": "qa" },
      { "from": "qa", "to": "gate" },
      { "from": "review", "to": "work", "label": "changes" },
      { "from": "qa", "to": "work", "label": "fails" }
    ],
    "current": "review"
  },
  "roles": [
    { "role": "Producer", "owns": "The board, the briefs, integration", "reviewer": "You", "now": "Briefing the second island", "active": true },
    { "role": "Game designer", "owns": "Puzzles, difficulty, the levels", "reviewer": "You", "now": "Tuning the fog bell", "active": true },
    { "role": "Art director", "owns": "The art bible, every approval of art", "reviewer": "You", "now": "Reviewing the island's backgrounds", "active": true },
    { "role": "Artist", "owns": "Backgrounds, the keeper, the boat", "reviewer": "Art director", "now": "Waiting on your pick of the keeper" },
    { "role": "Composer", "owns": "Themes and the sound", "reviewer": "Producer, you", "now": "The island's theme", "active": true },
    { "role": "Engineer", "owns": "The engine, tools and builds", "reviewer": "QA" },
    { "role": "QA", "owns": "Tests and playtests", "reviewer": "Producer", "now": "412 tests, none failing" }
  ],
  "agents": [
    { "id": "0b6f4a1e-2c3d-4e5f-8a9b-0c1d2e3f4a5b", "title": "The producer, with you", "role": "Producer", "note": "Where your decisions are asked" },
    { "id": "1c7a5b2f-3d4e-4f60-9b0c-1d2e3f4a5b6c", "title": "M2: the fog bell", "role": "Game designer", "note": "Tuning its timing" },
    { "id": "2d8b6c3a-4e5f-4071-8c1d-2e3f4a5b6c7d", "title": "M2: the island's backgrounds", "role": "Artist", "note": "Delivered; in review" }
  ],
  "decisions": [
    { "at": "2026-10-08T11:00:00+01:00", "decision": "Five islands, not eight", "why": "Each island finished to the slice's standard, rather than more of them rougher", "by": "Owner" },
    { "at": "2026-10-12T15:30:00+01:00", "decision": "The puzzles never need fast fingers", "why": "It's a calm game; timing puzzles are about watching, not reflexes", "by": "Owner" }
  ],
  "log": [
    { "at": "2026-10-15T09:30:00+01:00", "text": "The tide gates puzzle is done and merged, with its tests. The fog bell is playable; its timing is being tuned.", "who": "Game designer" },
    { "at": "2026-10-14T17:00:00+01:00", "text": "Three designs for the keeper are in for your pick.", "who": "Artist" },
    { "at": "2026-10-13T10:15:00+01:00", "text": "Pre-production signed off by you: the three bibles.", "who": "Producer" }
  ]
}
```

</details>

## Room

A room, run like a small agency, where pieces of work move through stages to your approval and out to their channels: posts and videos, articles, newsletters, releases. It shows what's up next with its images and its words, the pipeline by stage, every piece, the schedule on a calendar, the numbers, the roles, and the decisions and log.

```sh
atelier new room launch-posts
```

**The agent** moves each piece through the `stages` you name, writes its `copy`, adds its `images` (paths on disk, never embedded), records each channel's `state` and link once it's out, and its `numbers` as they come in.

**You** approve or hold each piece marked `approve` on its card, with a note. The mark is kept under `approval:<id>` (`{ state: "approved" | "held", note, at }`); the agent moves an approved piece on, and treats a held one as a Needs you item with your note. An approval stands for the words as they were when you gave it; when the agent changes them, it asks again.

| Field | What it holds |
| --- | --- |
| `title`, `summary`, `updated`, `links` | The room, where it stands, and its plans |
| `stages` | The stages in order; the last one is where finished pieces go |
| `pieces` | `id`, `title`, `stage`, `kind`, `due`, `owner`, `detail`, `images` (`path`, `alt`, `caption`), `copy`, `approve`, `channels` (`name`, `state`, `at`, `link`) and `numbers` (`label`, `value`) |
| `metrics` | The room's numbers: `label`, `value`, `unit`, `delta`, `trend` |
| `roles` | `role`, what it `does`, and what it's doing `now` |
| `needsYou`, `decisions`, `log` | As in the workstream template |

<details><summary>The example</summary>

```json
{
  "template": "room",
  "title": "Launch posts",
  "summary": "Ten short videos for the 2.0 launch, one feature each, posted twice a week from Tuesday 27 October. Every cut and every caption is approved here before it goes out.",
  "updated": "2026-10-15T10:00:00+01:00",
  "links": [
    { "label": "The campaign plan", "path": "plans/launch-posts.md" },
    { "label": "Copy rules", "path": "plans/copy-rules.md" }
  ],
  "stages": ["idea", "storyboard", "in review", "approved", "scheduled", "posted"],
  "pieces": [
    {
      "id": "e01", "title": "Search as you type", "stage": "in review", "kind": "video", "due": "2026-10-27T18:00:00+00:00", "owner": "Producer",
      "detail": "Fifteen seconds: a library of 50,000 photos, found by one word.",
      "copy": "Find any photo by its words, as you type. Free on Mac and Windows: link in bio.\n\n#photography #photoediting #lightroom",
      "approve": true,
      "channels": [{ "name": "Instagram", "state": "draft" }, { "name": "TikTok", "state": "draft" }]
    },
    {
      "id": "e02", "title": "Masks in one click", "stage": "storyboard", "kind": "video", "due": "2026-10-30T18:00:00+00:00", "owner": "Producer",
      "detail": "The sky selected and darkened, before and after."
    },
    {
      "id": "e03", "title": "Presets you can read", "stage": "idea", "kind": "video", "due": "2026-11-03T18:00:00+00:00"
    },
    {
      "id": "teaser", "title": "The teaser", "stage": "posted", "kind": "video", "due": "2026-10-13T18:00:00+01:00", "owner": "Producer",
      "copy": "2.0 is coming on 27 October. Free on Mac and Windows: link in bio.",
      "channels": [
        { "name": "Instagram", "state": "posted", "at": "2026-10-13T18:00:00+01:00", "link": "https://www.instagram.com/" },
        { "name": "TikTok", "state": "posted", "at": "2026-10-13T18:20:00+01:00" }
      ],
      "numbers": [{ "label": "Views", "value": 4820 }, { "label": "Saves", "value": 96 }, { "label": "Follows", "value": 31 }]
    }
  ],
  "metrics": [
    { "label": "Followers", "value": 1284, "delta": "+31", "trend": [1190, 1201, 1222, 1240, 1253, 1284] },
    { "label": "Views this week", "value": 6120, "delta": "+38%" },
    { "label": "Downloads this week", "value": 412, "delta": "+12%" }
  ],
  "roles": [
    { "role": "Strategist", "does": "The calendar, and what each week's results change", "now": "The first two weeks are planned" },
    { "role": "Producer", "does": "Every video, from its storyboard to its render", "now": "E01's cut is with you" },
    { "role": "Copywriter", "does": "Hooks, captions, alt text and replies, to the copy rules" },
    { "role": "Scheduler", "does": "Posts each approved piece at its time" },
    { "role": "Analyst", "does": "Each post's numbers at 48 hours and at 7 days" }
  ],
  "needsYou": [
    { "id": "approve-e01", "title": "Approve E01's cut and caption", "detail": "Watch the cut in video/out/e01.mp4, then approve or hold it on its card.", "blocking": true, "unblocks": "Scheduling E01 for the 27th" },
    { "id": "tiktok-login", "title": "Log in to TikTok Studio once", "detail": "So the scheduler can see what's scheduled there." }
  ],
  "decisions": [
    { "at": "2026-10-10T12:00:00+01:00", "decision": "Twice a week, Tuesday and Friday at six", "why": "The teaser's numbers were best in the evening", "by": "Measured" }
  ],
  "log": [
    { "at": "2026-10-15T10:00:00+01:00", "text": "E01's cut is rendered and its caption written; both are with you.", "who": "Producer" },
    { "at": "2026-10-14T19:00:00+01:00", "text": "The teaser at 24 hours: 4,820 views, 96 saves and 31 follows.", "who": "Analyst" }
  ]
}
```

</details>

## Board

Columns of cards, To do, Doing, In review, Done or whatever the work needs, with a list of every card that sorts and filters. A column can have a `limit`; going over it is shown.

```sh
atelier new board release
```

**The agent** moves cards between columns as their state changes. **You** answer any Needs you items.

| Field | What it holds |
| --- | --- |
| `title`, `summary`, `updated`, `links` | The board, a line about it, and its documents |
| `columns` | `title`, `tone`, `limit`, and `cards`: `id`, `title`, `detail`, `owner`, `tags`, `due`, `tone` and `ref` |
| `needsYou`, `log` | As in the workstream template |

<details><summary>The example</summary>

```json
{
  "template": "board",
  "title": "Release 1.4",
  "summary": "What's left for 1.4, by state. In review is limited to three, so reviews keep up.",
  "updated": "2026-10-15T09:00:00+01:00",
  "columns": [
    {
      "title": "To do", "tone": "muted",
      "cards": [
        { "id": "notes", "title": "Release notes", "owner": "Writer", "due": "2026-10-20" },
        { "id": "screens", "title": "New store screenshots", "tags": ["store"] }
      ]
    },
    {
      "title": "Doing", "tone": "info",
      "cards": [
        { "id": "export", "title": "Export to WebP", "detail": "Quality slider and metadata", "owner": "Engineer", "ref": "#212" },
        { "id": "a11y", "title": "Keyboard navigation in the library", "owner": "Engineer", "ref": "#219" }
      ]
    },
    {
      "title": "In review", "tone": "warning", "limit": 3,
      "cards": [
        { "id": "crash", "title": "Fix the crash on import", "owner": "Engineer", "ref": "#230", "tone": "danger", "tags": ["crash"] }
      ]
    },
    {
      "title": "Done", "tone": "success",
      "cards": [
        { "id": "dark", "title": "Dark mode for the editor", "ref": "#198" },
        { "id": "speed", "title": "Faster thumbnails", "detail": "Twice as fast on a large library", "ref": "#205" }
      ]
    }
  ],
  "needsYou": [
    { "id": "sign", "title": "Sign the macOS build", "detail": "The build is in dist/; it needs your developer certificate.", "command": "npm run sign -- dist/Library.app" }
  ]
}
```

</details>

## Checklist

A checklist in groups, for a release, a launch, an onboarding: what's left in each group, what's required, who does each item, and a command or a link where it helps.

```sh
atelier new checklist release
```

**You** tick items as you do them; ticks are kept under `checks` in the canvas's state, by the item's id (`{ "fee": true }`; `null` once you untick one). **The agent** reads them, and marks items it has checked itself with `done: true`, which ticks them whatever the state says.

| Field | What it holds |
| --- | --- |
| `title`, `summary`, `due`, `updated`, `links` | The checklist, when it's due, and its documents |
| `groups` | `name`, `note`, and `items`: `id`, `title`, `detail`, `command`, `link`, `required`, `who` (`you` or `agent`), `done` and `due` |
| `log` | As in the workstream template |

<details><summary>The example</summary>

```json
{
  "template": "checklist",
  "title": "Store release",
  "summary": "Everything between a release candidate and the button that publishes it.",
  "due": "2026-10-26T12:00:00+00:00",
  "updated": "2026-10-15T08:30:00+01:00",
  "groups": [
    {
      "name": "The build",
      "items": [
        { "id": "tests", "title": "Every test passes on the release branch", "who": "agent", "required": true, "done": true },
        { "id": "versions", "title": "The version is 1.4.0 everywhere", "detail": "The app, the installer and the about box", "who": "agent", "required": true, "done": true },
        { "id": "smoke", "title": "Open the app on a clean machine", "detail": "Import a folder, edit a photo, export it.", "who": "you", "required": true }
      ]
    },
    {
      "name": "The store",
      "note": "The store's own checks take a day, so these come first.",
      "items": [
        { "id": "fee", "title": "Pay the developer fee", "who": "you", "required": true, "due": "2026-10-20", "link": { "label": "The store's dashboard", "href": "https://example.com/dashboard" } },
        { "id": "screens", "title": "Upload the screenshots", "detail": "Five, from store/screens/", "who": "you" },
        { "id": "text", "title": "Store text approved", "who": "you", "required": true }
      ]
    },
    {
      "name": "Launch day",
      "items": [
        { "id": "publish", "title": "Publish", "who": "you", "required": true, "command": "npm run release -- --publish" },
        { "id": "announce", "title": "Post the announcement", "who": "agent" }
      ]
    }
  ],
  "log": [
    { "at": "2026-10-15T08:30:00+01:00", "text": "The tests and the versions are checked on the release branch.", "who": "Agent" }
  ]
}
```

</details>

## Review

A review's findings, by severity: where each one is (a link opens the file at its line), what's wrong and why it matters, what's proposed and the diff, who found it and its status, with the reviewers' progress beside them.

```sh
atelier new review sync-engine
```

**The agent**, or a team of reviewing agents, adds findings as they're found and updates each one's `status` (`open`, `fixed`, `accepted`, `declined`). **You** make the call on each open finding with Fix it or Leave it, and a note. The call is kept under `approval:<id>` (`approved` is fix it, `held` is leave it).

| Field | What it holds |
| --- | --- |
| `title`, `subject`, `summary`, `updated`, `links` | The review, what it reviewed, and its documents |
| `reviewers` | `name`, `focus`, `status` (`waiting`, `reviewing`, `done`) and a `note` |
| `findings` | `id`, `severity` (`critical`, `high`, `medium`, `low`, `note`), `title`, `file`, `line`, `detail` and `proposal` in Markdown, `diff`, `status` and `by` |
| `needsYou`, `log` | As in the workstream template |

<details><summary>The example</summary>

```json
{
  "template": "review",
  "title": "Review of the sync engine",
  "subject": "Pull request #312: two-way sync with the cloud library",
  "summary": "Three reviewers read the change. One finding blocks the merge: a deleted photo can come back after a sync. The rest are small.",
  "updated": "2026-10-15T11:10:00+01:00",
  "reviewers": [
    { "name": "Correctness", "focus": "conflicts and data loss", "status": "done" },
    { "name": "Security", "focus": "tokens and what's sent", "status": "done" },
    { "name": "Performance", "focus": "large libraries", "status": "reviewing", "note": "timing a 50,000-photo sync" }
  ],
  "findings": [
    {
      "id": "resurrect", "severity": "critical", "title": "A photo deleted on one machine comes back after a sync",
      "file": "src/sync/merge.ts", "line": 88,
      "detail": "When a photo is deleted on one machine and edited on another before they sync, the edit wins and the photo is restored. The deletion isn't kept as a record, so the merge can't tell a deletion from a photo it hasn't seen yet.",
      "proposal": "Keep a deletion as a **tombstone** for 30 days, and let a deletion win over an older edit.",
      "diff": "--- a/src/sync/merge.ts\n+++ b/src/sync/merge.ts\n@@ -85,7 +85,9 @@\n   for (const remote of changes) {\n     const local = index.get(remote.id);\n-    if (!local) index.add(remote);\n+    if (tombstones.has(remote.id) && tombstones.get(remote.id)! > remote.edited) continue;\n+    if (!local) index.add(remote);\n     else if (remote.edited > local.edited) index.update(remote);\n   }",
      "status": "open", "by": "Correctness"
    },
    {
      "id": "token-log", "severity": "medium", "title": "The access token is written to the debug log",
      "file": "src/sync/client.ts", "line": 41,
      "detail": "With debug logging on, each request is logged with its headers, the token among them.",
      "proposal": "Leave the `authorization` header out of what's logged.",
      "status": "open", "by": "Security"
    },
    {
      "id": "retry", "severity": "low", "title": "A failed upload is retried at once, forever",
      "file": "src/sync/upload.ts", "line": 120,
      "detail": "Retry with a growing wait, and stop after five tries with a message.",
      "status": "fixed", "by": "Correctness"
    },
    {
      "id": "naming", "severity": "note", "title": "`doSync` could say what it does",
      "file": "src/sync/index.ts", "line": 12,
      "detail": "`syncOnce` or `pullThenPush` would read better.",
      "status": "declined", "by": "Correctness"
    }
  ],
  "needsYou": [
    { "id": "merge-call", "title": "Decide whether #312 merges before the fix", "detail": "The critical finding is behind a setting that's off by default. Merging now lets the rest be tried; waiting keeps main clean.", "blocking": true }
  ],
  "log": [
    { "at": "2026-10-15T11:10:00+01:00", "text": "Correctness and security are done: one critical finding, one medium, one low (fixed) and a note.", "who": "Reviewers" }
  ]
}
```

</details>

## Compare

Options side by side for a decision: what each one is, its pros and cons and cost, an image where it helps, scores against criteria that count for more or less, the agent's recommendation, and your pick.

```sh
atelier new compare storage
```

**The agent** lays out the options and scores them from 0 to 5 against the `criteria`; each option's total is its scores weighted by the criteria, out of 5. **You** send your pick with the form at the bottom. It's kept under `form:pick` (`{ values: { option, why }, at }`), so an agent waiting with `canvas_wait` on `form:pick` carries on with it.

| Field | What it holds |
| --- | --- |
| `title`, `question`, `context`, `updated`, `links` | The decision, and what it depends on |
| `criteria` | `name`, `weight` (1 if left out) and a `note` |
| `options` | `id`, `name`, `summary`, `pros`, `cons`, `cost`, `image` (`path`, `alt`) and `scores` (`criterion`, `score`, `note`) |
| `recommendation` | The `option`'s id, and `why` |
| `log` | As in the workstream template |

<details><summary>The example</summary>

```json
{
  "template": "compare",
  "title": "Where the photos live",
  "question": "Which storage should the cloud library use?",
  "context": "About 2 TB to start, growing by 50 GB a month. Reads matter more than writes: every thumbnail and every edit opens a file.",
  "updated": "2026-10-15T10:30:00+01:00",
  "criteria": [
    { "name": "Cost at 2 TB", "weight": 3 },
    { "name": "Speed of a read", "weight": 2, "note": "a full-size photo, from Europe" },
    { "name": "How hard it is to leave", "weight": 2 },
    { "name": "Work to set up", "weight": 1 }
  ],
  "options": [
    {
      "id": "s3", "name": "Amazon S3", "summary": "The standard, with every tool built for it.",
      "pros": ["Every library and tool supports it", "Lifecycle rules move old photos to cheaper storage"],
      "cons": ["Paying to read files out adds up with thumbnails"],
      "cost": "about $46 a month, plus reads",
      "scores": [
        { "criterion": "Cost at 2 TB", "score": 2 },
        { "criterion": "Speed of a read", "score": 4 },
        { "criterion": "How hard it is to leave", "score": 3 },
        { "criterion": "Work to set up", "score": 4 }
      ]
    },
    {
      "id": "r2", "name": "Cloudflare R2", "summary": "Speaks S3's language, and reading files out is free.",
      "pros": ["No charge for reads", "The same code as S3"],
      "cons": ["Fewer regions to choose from"],
      "cost": "about $30 a month",
      "scores": [
        { "criterion": "Cost at 2 TB", "score": 5 },
        { "criterion": "Speed of a read", "score": 4 },
        { "criterion": "How hard it is to leave", "score": 4 },
        { "criterion": "Work to set up", "score": 4 }
      ]
    },
    {
      "id": "nas", "name": "A machine of our own", "summary": "A storage server in a rack we rent.",
      "pros": ["Cheapest once it's paid for", "Nobody else's terms"],
      "cons": ["Backups, disks and outages are ours", "Slow for anyone far away"],
      "cost": "about $1,800 up front, then $40 a month",
      "scores": [
        { "criterion": "Cost at 2 TB", "score": 3 },
        { "criterion": "Speed of a read", "score": 2 },
        { "criterion": "How hard it is to leave", "score": 5 },
        { "criterion": "Work to set up", "score": 1 }
      ]
    }
  ],
  "recommendation": { "option": "r2", "why": "the cheapest at our size because thumbnails read so much, with the same code as S3, so leaving stays easy." }
}
```

</details>

## Report

A report to read top to bottom: the finding in a sentence, the headline numbers, then numbered sections, each with its text in Markdown and, where they help, a bar chart, a line chart, a donut, a table or images, and the sources at the end.

```sh
atelier new report performance
```

**The agent** writes it from what it measured or found, and keeps every number traceable to a source. Charts need a `title`, as everywhere in Atelier; say in it what's measured and in what unit.

| Field | What it holds |
| --- | --- |
| `title`, `summary`, `period`, `updated` | The report, its finding, and what it covers |
| `stats` | `label`, `value` (as written), `tone`, `delta`, `deltaTone`, `hint` and `trend` |
| `sections` | `title`, `body` in Markdown, and any of `bars` (`title`, `categories`, `series`), `lines` (`title`, `x`, `series`), `donut` (`title`, `segments`), `table` (`headers`, `rows`) and `images` |
| `sources` | Files (`path`) and web pages (`href`) |

<details><summary>The example</summary>

```json
{
  "template": "report",
  "title": "Performance after 1.4",
  "summary": "1.4 opens the library twice as fast and exports a third faster. Memory is flat. One regression: the first launch after an update is slower, while the cache is rebuilt.",
  "period": "1.3.2 against 1.4.0, on the test library",
  "stats": [
    { "label": "Opening the library", "value": "1.1 s", "tone": "success", "delta": "−52%", "deltaTone": "success", "trend": [2.4, 2.3, 1.9, 1.4, 1.1] },
    { "label": "Exporting 100 photos", "value": "38 s", "tone": "success", "delta": "−31%", "deltaTone": "success" },
    { "label": "Memory, editing", "value": "610 MB", "delta": "+2%", "deltaTone": "muted" },
    { "label": "First launch after an update", "value": "9.4 s", "tone": "warning", "delta": "+6.1 s", "deltaTone": "danger", "hint": "once, while the cache is rebuilt" }
  ],
  "sections": [
    {
      "title": "Opening the library",
      "body": "Thumbnails are read from one file instead of one file each, so opening the library no longer waits on thousands of small reads. The gain is largest on the biggest libraries.",
      "bars": { "title": "Seconds to open, by library size", "categories": ["1,000 photos", "10,000", "50,000"], "series": [{ "name": "1.3.2", "values": [0.4, 1.2, 2.4], "tone": "muted" }, { "name": "1.4.0", "values": [0.3, 0.6, 1.1], "tone": "accent" }], "unit": " s" }
    },
    {
      "title": "Over the release",
      "body": "Each nightly build from the branch, opening the 50,000-photo library.",
      "lines": { "title": "Seconds to open 50,000 photos, nightly", "x": ["1 Oct", "4 Oct", "7 Oct", "10 Oct", "13 Oct"], "series": [{ "name": "open", "values": [2.4, 2.3, 1.9, 1.4, 1.1] }], "unit": " s", "area": true }
    },
    {
      "title": "Where an export's time goes",
      "donut": { "title": "Share of an export's time, 1.4.0", "segments": [{ "label": "decoding", "value": 41 }, { "label": "the edits", "value": 33 }, { "label": "encoding", "value": 21 }, { "label": "writing", "value": 5 }] }
    },
    {
      "title": "The regression",
      "body": "The first launch after an update rebuilds the thumbnail cache in the new format: **9.4 s** on the 50,000-photo library, once. A fix that rebuilds it in the background is planned for 1.4.1.",
      "table": { "headers": ["Library", "1.3.2", "1.4.0, first launch", "1.4.0, after"], "rows": [["1,000 photos", "0.4 s", "0.9 s", "0.3 s"], ["50,000 photos", "3.3 s", "9.4 s", "1.1 s"]] }
    }
  ],
  "sources": [
    { "label": "The benchmark script", "path": "bench/run.ts" },
    { "label": "Raw results", "path": "bench/results/1.4.0.json" }
  ]
}
```

</details>

# Room

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

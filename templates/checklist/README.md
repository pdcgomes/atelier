# Checklist

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

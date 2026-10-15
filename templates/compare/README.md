# Compare

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

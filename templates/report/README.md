# Report

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

# Review

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

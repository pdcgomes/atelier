# Board

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

# Wireframes

An app's screens drawn before all of them exist, and kept true to the code as the work lands: the user's path through them, one tab for each area with its regions drawn where they sit, numbered and marked built, being built, planned, later or waiting on you, the notes keyed to those numbers, and the questions only you can answer, with what's there now, the options and the agent's lean.

```sh
atelier new wireframes import
```

**The agent** draws each screen from the design, the tracker and the code as merged, and changes a region's status in the same turn as the work behind it lands. A status is only what's true: built is merged and tested. **You** answer each open question on the Questions tab, by picking an option or saying what you'd like instead. The answer is kept under `form:question:<id>` (`{ values: { option, note }, at }`, `option` being `A`, `B`, `C` or `other`); the agent records it as the question's `answer`, which moves it under Answered, and redraws what it changes.

A wireframes canvas opens in the Cursor theme, the greys and UI font of Cursor's canvases, unless it names another with `"theme"`; the user can pick another for it in the viewer with `t`. A custom canvas names it in its `meta`: `export const meta = { title, theme: "cursor" }`.

A region's content is drawn in one order whatever order it's written in: `text`, `lists`, `fields`, `tiles`, `sliders`, `checks`, `inputs`, then `segmented`, `chips`, `buttons` and `keys` on one line, `table` and `note`; `blocks` adds more content after it, block by block, for another order, and the regions inside it come last. A region with no number, label or status draws no border: it stacks its content and the regions in it into one column, as a column of the screen holding several regions does. A custom canvas can draw a screen the data can't describe, such as a playground, and keep the rest: `<Wireframes data={data} drawings={{ window: <MyDrawing /> }} tabs={[...]} />`, from `atelier/templates`. A drawing given by a screen's id takes the place of all of its `drawings`, under its heading and summary; the screen's `notes`, `tables` and `sections` still follow it, and its `notes` count in the legend. A drawing given by the `id` of one of a screen's `drawings` takes the place of that one alone, which keeps its `title`, `summary` and `notes` and needs no `regions`: a screen of several drawings, each with its notes. The legend shows only the statuses the canvas uses.

| Field | What it holds |
| --- | --- |
| `title`, `intro`, `updated`, `links` | What's drawn, what it's drawn from, and when that was written |
| `overview` | A `title` and `text` to open the Overview with, and `tables` and `sections` to close it |
| `reading`, `statuses` | How to read the wireframes, and for each status (`built`, `building`, `planned`, `later`, `you`) the canvas's own `label` and what it `meaning` here |
| `flow` | The user's path, three to six steps: `title`, `text` and `status` |
| `principles`, `principlesTitle` | What makes the design work: `title` and `text`; and their heading, "What makes it work" unless said |
| `screens` | One tab each: `id`, `name` (the tab's label), a longer `title`, `summary`, `drawings`, `notes` and `notesColumns` for the whole screen, `tables` (`title`, `text` before it, `headers`, `rows`, `note` after it; a cell that's a status's name shows as that status) and `sections` (`title`, `text` in Markdown) |
| `drawings` | `id`, `title`, `summary`, `frame` (`window`, `phone` or `none`), `toolbar` and `toolbarEnd`, `columns` (CSS, such as `"170px minmax(0, 1fr) 230px"`), `regions`, full-width regions `above` and `below`, `caption`, `notes` (`n`, `title`, `text`, `status`) and `notesColumns`; phones one after another sit side by side |
| `regions` | `n`, `label`, `status`, `dashed` (shown on demand), `grow`, `regions` inside it, content, and `blocks` of more content |
| `questions`, `questionsIntro` | `id`, `title`, `now`, `options`, `lean`, and `answer` once you've answered (`now` and `options` may go once it is); and the sentence that opens the tab |

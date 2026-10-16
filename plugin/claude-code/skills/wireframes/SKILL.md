---
name: wireframes
description: Draws a screen or a feature's UI as an Atelier wireframes canvas, with an overview of the user's path, one tab per area with its regions drawn where they sit, each numbered and marked built, being built, planned, later or waiting on you, notes keyed to the numbers, and the questions only the user can answer, which they answer on the canvas. Use when designing a screen, a window or a set of panels before building them, when asked for wireframes or mockups, when showing what's built and what's planned in a UI, or when collecting the user's decisions on a UI.
---

# Wireframes with Atelier

A wireframes canvas shows how a screen looks and works before all of it exists: each region drawn where it sits, marked with where it stands, explained in a note, and the choices only the user can make set out as questions they answer on the canvas. It's the design's picture, kept true to the code as the work lands.

Read the canvas skill (`../canvas/SKILL.md`) first: its rules apply, and its `reference/templates.md` has the template's fields and a whole example under Wireframes, and `reference/atelier.d.ts` every component and prop.

## Where, and which kind

- **The look:** wireframes open in Atelier's Cursor theme, the neutral greys and UI font of Cursor's canvases, whatever theme the user's other canvases are in; the user can pick another for the canvas with `t`. A template canvas gets it by default; a TSX canvas names it in its `meta`, as below.
- `.atelier/<feature>-wireframes.canvas.json` or `.canvas.tsx` in the project, `<feature>` a short kebab-case name (`import-wireframes`, `library-wireframes`). One canvas per feature or family of screens. A workstream canvas links to it, and its open questions can go on the workstream's Needs you too.
- **The template, as JSON,** when every screen can be described by regions and their content: lists, tiles, fields, chips, keys, segmented controls, sliders, checkboxes, inputs, buttons, tables and text. Start from its example: `atelier new wireframes <feature>-wireframes`.
- **A TSX canvas** when a screen needs a drawing the content can't describe: a domain's own cell (a photo with its stars and flags, a phone's strip), a playground, a chart, columns inside a region, or a line with parts pushed apart. Keep the data the template takes, draw those screens with the kit's wireframe components, and hand them over by the screen's id. Given by the screen's id, a drawing takes the place of all the screen's `drawings`, under its heading and summary; put its notes in the screen's `notes`, which follow it, are counted in the legend, and come before its `tables` and `sections`. For a screen of several drawings, each with its own notes, list them in the screen's `drawings` with an `id`, a `title` and their `notes`, and no `regions`, and give each one's drawing by that `id`. `tabs` adds tabs before Questions:

```tsx
import { Placeholder, Region, Row, Segmented, SideList, Wireframe, useCanvasState } from "atelier";
import { Wireframes, type WireframesData } from "atelier/templates";

export const meta = { title: "The library: wireframes", theme: "cursor" };

const data: WireframesData = {
  title: "The library: wireframes",
  intro: "The library's window, from the design and what's merged on main. 16 October 2026.",
  flow: [
    { title: "Open a folder", text: "Its photos fill the grid, newest first.", status: "built" },
    { title: "Cull", text: "Pick and reject with the keys, without leaving the grid.", status: "building" },
  ],
  screens: [
    {
      id: "window",
      name: "The window",
      summary: "Folders on the left, the photos on the right.",
      notes: [
        { n: 1, title: "Folders", text: "Every folder with its count; the one selected fills the grid.", status: "built" },
        { n: 2, title: "The grid", text: "Thumbnails load as they scroll in; the toolbar switches to the loupe.", status: "building" },
      ],
    },
  ],
  questions: [
    {
      id: "loupe-key",
      title: "Which key opens the loupe?",
      now: "Space does, as in Finder's Quick Look.",
      options: ["Space, as now", "E, as Lightroom Classic does"],
      lean: "Space: it's what a Mac user tries first.",
    },
  ],
};

function TheWindow() {
  const [view, setView] = useCanvasState("view", "Grid");
  return (
    <Wireframe toolbar={<Segmented items={["Grid", "Loupe"]} active={view} onChange={setView} />} columns="200px minmax(0, 1fr)">
        <Region n={1} label="Folders" status="built">
          <SideList items={[{ label: "All photos", count: "1,204", selected: true }, { label: "2026", count: "892", depth: 1 }]} />
        </Region>
        <Region n={2} label={view} status="building">
          <Row gap={6}>
            {[0, 1, 2, 3].map((i) => (
              <Placeholder key={i} w={62} selected={i === 0} badge={i === 1 ? "★4" : undefined} />
            ))}
          </Row>
        </Region>
    </Wireframe>
  );
}

export default function Library() {
  return <Wireframes data={data} drawings={{ window: <TheWindow /> }} />;
}
```

## Start

1. Gather what it's drawn from: the design document, the tracker's rows, the code as merged (`git log`), and the app it follows, if any. Note what each region's status rests on.
2. Write `title`, `intro` (what it's drawn from, and the date), `updated` (from `date -Iseconds` when you draw it; when you redraw something drawn before, the time its content was last true), the `flow`, the `principles`, and the `statuses`' meanings in the project's words. `overview` can open the Overview with a heading and a paragraph, and close it with tables.
3. One screen for each area, each with its drawings, notes and tables; then the questions.
4. Tell the user in a sentence what it shows and what you need from them.

## The tabs

- **Overview:** the user's path as three to six steps, each with its status; what makes the design work, three to six points with a title and a sentence; and how to read the wireframes, with what each status means here. It points to the questions while any are open.
- **One tab per area:** a window, a panel set, a sheet, a flow. Each opens with its name and a sentence, then the drawings, each followed by its notes, then what doesn't draw well: a table of keys, the tokens a field takes, the states a control goes through. In a table, a cell that's just a status's name (`built`) shows as that status.
- **Questions:** each choice the wireframes leave open, and under them the ones answered.

## Drawing a wireframe

- **The real layout, in proportion.** A window with its toolbar, or a phone, and the regions on the screen's real columns: `columns: "170px minmax(0, 1fr) 230px"`. A terminal keeps those proportions at 8 pixels a column. Draw what the user sees, not the code's structure. Full-width rows go in `above` and `below`.
- **Every region numbered, labelled and marked.** `n`, a short `label` and a `status`, and the notes under the drawing use the same numbers: what the region does and why, the tracker row or decision it comes from, and its status. A drawing with more than about ten regions splits into two.
- **Real content.** Real labels, menu names, keys, templates and values, and plausible counts, saying once in the reading note that counts are made up. No placeholder text and no "TBD" box: a region not yet designed isn't drawn, it's a question.
- **Dashed** (`dashed: true`) for what shows on demand: a sheet, a popover, a menu.
- **In JSON,** a region's content is drawn in one order whatever order it's written in (the template's README lists it), `blocks` adds more after it, and a region with no number, label or status draws no border: it stacks its content and the regions in it into one column of the screen.
- **In TSX,** the components are `Wireframe` (`frame` window, phone or none, `toolbar` and `toolbarEnd`, `caption`, `columns`, `gap`, and `padding` for the room inside, 10 pixels unless you say), `Region` (`padding` 3 to 6 for a compact one, such as a lone button's), `Notes`, `Placeholder` (a photo, a thumbnail, a card; `inset` draws the photo inside its border, `dashed` a proposal, `onClick` a thumbnail to press; without `w` it takes the width there is), `SideList` (a sidebar's rows or a menu; `onSelect` makes rows pressable), `Field`, `Segmented`, `Chip` (`selected`, `onClick`), `Marker`, `Status` and `StatusLegend`. Inside a drawing, the kit's own `Text size="sm"` (`xs` for a chart's scale or a caption), `Heading level={3}` (a caption), `Kbd`, `Button`, `TextInput`, `Select`, `Checkbox`, `Toggle`, `Slider`, `Rating`, `Meter` and a dense `Table` take the drawing's sizes, and stay live.
- **Only the kit's components.** No hand-written HTML, styles or SVG: atelier-tui draws the same canvas in a terminal from the kit's components alone. An icon is a text glyph (▸ ◉ ✎ ⚑ ★ ⌘), a picture a `Placeholder`, a colour label a `●` in a tone (`<Text as="span" tone="danger">●</Text>`, or a `SideList` row's `tone`): red is `danger`, yellow `warning`, green `success`, blue `info`, and `accent` or `muted` for any other.
- **Inside a drawing,** the kit's charts (`BarChart`, `LineChart`, `Sparkline`, `Histogram`, `DonutChart`, `Heatmap`, `Meter`, `Stat`) stand in for a screen's charts; each needs a `title`. A `Sparkline` with `width="100%"` fills its column, `min` and `max` fix its scale, and `shade` marks a stretch such as a pause; a `Meter`'s `height` makes a thin bar, and a segment's `shade` (0 to 1) draws it in that share of ink, for a neutral bar in parts. `Text`'s `tabular` lines up a column of numbers. Charts have no reference lines or dashed forecasts, so say those in the caption. A menu is a dashed `Region` holding a `SideList`, with `separator` rows and each item's key in `count`. To point at something inside a region, nest a small numbered `Region` around it, or put a `Marker` beside it. A `Field`'s name is cut past about eleven characters in a terminal. `Text`'s tones are `default`, `secondary`, `muted`, `accent`, `success`, `warning`, `danger` and `info`. A `Chip` that's chosen is `selected`.
- **A playground,** in TSX, where a behaviour is easier to feel than to read: the toolbar's `Segmented` with `onChange`, a `Slider` that moves a `Placeholder`'s `inset`. Keep it self-contained (`useCanvasState`, data inline) and say it's illustrative.

## Statuses

Every region, step and note carries one of five, and each must be true when it's written:

- **Built** (`built`): merged where it ships and tested; checked in `git log` and the tracker.
- **Being built** (`building`): an agent is building it now.
- **Planned** (`planned`): in the tracker for this release; its engine may exist without its screen, and the note says so.
- **Later** (`later`): after this release.
- **Waits on you** (`you`): waiting on the user's decision or measurement, the note saying which.

`statuses` rewords any of them for the project, such as `{ "building": { "label": "Built, waits on deploy" } }`; the legend and the reading list show only the statuses the canvas uses. Never mark built what isn't merged, and say plainly what hasn't been tried in the app.

## Questions

- **Only choices whose answer changes what's built next:** a layout, a default, what a key does. Not taste, and not what the design already settles.
- **Each one:** the question as its `title`; `now`, what's built or designed today; two or three `options`, shown as A, B and C; and `lean`, your recommendation and why, in a sentence.
- **The user answers on the Questions tab:** a choice and a note, kept under `form:question:<id>` as `{ values: { option, note }, at }`, `option` being `"A"`, `"B"`, `"C"` or `"other"`. You hear it beside their next prompt or when your turn ends; to wait for it, `canvas_wait` on `["form:question:"]`.
- **When they answer:** set the question's `answer` to what they chose, in a sentence, so it moves under Answered. Record the decision where it belongs (the design document, the tracker's row, a workstream's decisions), brief the agents building those parts, and redraw the regions it changes.

## Keep it current

- When work lands, in the same turn: the regions' and notes' statuses, any region that came out differently from its drawing, and `updated`.
- A region added to the design gets its box and its note; one dropped is taken out, its note saying where it went if it moved.
- The check runs after each write; fix what it reports. `atelier-tui --snapshot .atelier/<name>.canvas.json --width 120` shows how it reads in a terminal.

## Style

Plain, complete sentences in the project's voice, calm and precise, with no superlatives. Colour only from the statuses; neutral boxes; the canvas skill's rules throughout.

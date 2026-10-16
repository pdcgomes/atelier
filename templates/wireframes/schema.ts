import { s, type Infer } from '../../packages/kit/src/schema.ts';
import { link, tone } from '../parts.ts';

export const description =
  "An app's screens drawn as wireframes before all of them exist: the user's path through them, one tab per area with its numbered regions and the notes keyed to them, each marked built, being built, planned, later or waiting on you, and the questions left for you to answer on the canvas.";

/** Wireframes open in Cursor's look: its greys, and its UI font for all the text. */
export const theme = 'cursor';

export const status = s.enum(['built', 'building', 'planned', 'later', 'you']);

const listItem = s.object({
  label: s.string(),
  /** On the right: a count, a key. */
  count: s.optional(s.string()),
  depth: s.optional(s.number()),
  selected: s.optional(s.boolean()),
  dim: s.optional(s.boolean()),
  tone: s.optional(tone),
  /** A line between groups, as in a menu. */
  separator: s.optional(s.boolean()),
});

/** What a region holds, drawn in this order, then `blocks`, then the regions inside it. */
const content = {
  /** A line of the region's text. */
  text: s.optional(s.string()),
  /** Dimmer text, such as a count or a hint. */
  note: s.optional(s.string()),
  /** A sidebar's sections or a menu: each with an optional title and status, its rows and a note. */
  lists: s.optional(s.array(s.object({ title: s.optional(s.string()), status: s.optional(status), items: s.array(listItem), note: s.optional(s.string()) }))),
  /** Stand-ins for photos, thumbnails, cards: `w` and `h` in pixels, or `w` and a `ratio` such as "4:5". */
  tiles: s.optional(
    s.array(
      s.object({
        w: s.optional(s.number()),
        h: s.optional(s.number()),
        ratio: s.optional(s.string()),
        /** Written in it. */
        label: s.optional(s.string()),
        caption: s.optional(s.string()),
        badge: s.optional(s.string()),
        selected: s.optional(s.boolean()),
        dim: s.optional(s.boolean()),
        /** A rectangle inside it, as fractions [x, y, width, height]: the photo inside its border. */
        inset: s.optional(s.array(s.number())),
      }),
    ),
  ),
  /** Labelled values, as an inspector's rows. */
  fields: s.optional(s.array(s.object({ name: s.string(), value: s.string(), muted: s.optional(s.boolean()), wrap: s.optional(s.boolean()) }))),
  chips: s.optional(s.array(s.object({ label: s.string({ min: 1 }), dim: s.optional(s.boolean()) }))),
  /** Keys, as on a keyboard: "⌘K", "⏎". */
  keys: s.optional(s.array(s.string({ min: 1 }))),
  segmented: s.optional(s.object({ items: s.array(s.string()), active: s.optional(s.string()) })),
  sliders: s.optional(s.array(s.object({ label: s.string(), value: s.optional(s.number()), min: s.optional(s.number()), max: s.optional(s.number()), unit: s.optional(s.string()) }))),
  checks: s.optional(s.array(s.object({ label: s.string({ min: 1 }), checked: s.optional(s.boolean()) }))),
  inputs: s.optional(s.array(s.object({ label: s.optional(s.string()), value: s.optional(s.string()), placeholder: s.optional(s.string()) }))),
  buttons: s.optional(s.array(s.object({ label: s.string({ min: 1 }), primary: s.optional(s.boolean()) }))),
  table: s.optional(s.object({ headers: s.array(s.string()), rows: s.array(s.array(s.string())) })),
};

const contentObject = s.object(content);

/** More content after a region's own, block by block, for an order other than the usual one. */
const blocks = { blocks: s.optional(s.array(contentObject)) };

/** A region's own fields; it can hold regions of its own, down to three levels. */
const regionFields = {
  n: s.optional(s.number()),
  label: s.optional(s.string()),
  status: s.optional(status),
  /** Shown on demand: a sheet, a popover, a menu. */
  dashed: s.optional(s.boolean()),
  /** Takes the height left in a phone. */
  grow: s.optional(s.boolean()),
  ...content,
  ...blocks,
};

const deepest = s.object(regionFields);
const middle = s.object({ ...regionFields, regions: s.optional(s.array(deepest)) });
export const region = s.object({ ...regionFields, regions: s.optional(s.array(middle)) });

export const note = s.object({ n: s.number(), title: s.string({ min: 1 }), text: s.string(), status: s.optional(status) });

const drawing = s.object({
  /** A custom canvas draws this one itself when it gives a drawing by this id; its title, summary and notes stay. */
  id: s.optional(s.string()),
  title: s.optional(s.string()),
  summary: s.optional(s.string()),
  /** A window with its toolbar (the default), a phone, or no frame. Phones side by side share their notes. */
  frame: s.optional(s.enum(['window', 'phone', 'none'])),
  /** What the window's toolbar holds, and what sits at its right: a segmented control, chips, keys, text. */
  toolbar: s.optional(contentObject),
  toolbarEnd: s.optional(contentObject),
  caption: s.optional(s.string()),
  /** The screen's own columns, as CSS: "170px minmax(0, 1fr) 230px". */
  columns: s.optional(s.string()),
  gap: s.optional(s.number()),
  /** Full-width regions above the columns, such as a toolbar's row. */
  above: s.optional(s.array(region)),
  regions: s.optional(s.array(region)),
  /** Full-width regions below the columns, such as a filmstrip. */
  below: s.optional(s.array(region)),
  notes: s.optional(s.array(note)),
  /** How many columns the notes take: 2 unless said. */
  notesColumns: s.optional(s.number()),
});

/** A table: what doesn't draw well, such as keys, the tokens a field takes, the states a control goes through. */
const table = s.object({
  title: s.optional(s.string()),
  /** Said before the table, and after it. */
  text: s.optional(s.string()),
  note: s.optional(s.string()),
  headers: s.array(s.string()),
  rows: s.array(s.array(s.string())),
});

const section = s.object({ title: s.string({ min: 1 }), text: s.string() });

const words = s.object({ label: s.optional(s.string()), meaning: s.optional(s.string()) });

export const schema = s.object({
  title: s.string({ min: 1 }),
  /** What it's drawn from and when: the design, the tracker, the code as merged. */
  intro: s.string(),
  updated: s.optional(s.time()),
  links: s.optional(s.array(link)),
  /** A heading and a paragraph to open the Overview with, and tables and sections to close it. */
  overview: s.optional(s.object({ title: s.optional(s.string()), text: s.optional(s.string()), tables: s.optional(s.array(table)), sections: s.optional(s.array(section)) })),
  /** How to read the wireframes, before the statuses' meanings. */
  reading: s.optional(s.string()),
  /** The canvas's own words for each status, and what each means here. */
  statuses: s.optional(s.object({ built: s.optional(words), building: s.optional(words), planned: s.optional(words), later: s.optional(words), you: s.optional(words) })),
  /** The user's path through the screens, three to six steps. */
  flow: s.optional(s.array(s.object({ title: s.string({ min: 1 }), text: s.string(), status: status }))),
  /** What makes the design work, three to six. */
  principles: s.optional(s.array(s.object({ title: s.string({ min: 1 }), text: s.string() }))),
  /** The principles' heading: "What makes it work" unless said. */
  principlesTitle: s.optional(s.string()),
  /** One tab each: an area of the screen, a window, a flow. */
  screens: s.array(
    s.object({
      id: s.string({ min: 1 }),
      /** The tab's label, and the screen's heading unless it has a `title`. */
      name: s.string({ min: 1 }),
      title: s.optional(s.string()),
      summary: s.optional(s.string()),
      drawings: s.optional(s.array(drawing)),
      /** Notes for the whole screen, drawn after its drawings: those of a drawing a custom canvas draws itself. */
      notes: s.optional(s.array(note)),
      notesColumns: s.optional(s.number()),
      /** What doesn't draw well: keys, the tokens a field takes, the states a control goes through. A cell that's just a status's name shows as that status. */
      tables: s.optional(s.array(table)),
      /** More to say, in Markdown. */
      sections: s.optional(s.array(section)),
    }),
  ),
  /** The sentence that opens the Questions tab. */
  questionsIntro: s.optional(s.string()),
  /** The choices the wireframes leave open. The user answers on the canvas; set `answer` once it's recorded. */
  questions: s.optional(
    s.array(
      s.object({
        id: s.string({ min: 1 }),
        title: s.string({ min: 1 }),
        /** What's built or designed today. */
        now: s.optional(s.string()),
        options: s.optional(s.array(s.string())),
        /** Your recommendation and why, in a sentence. */
        lean: s.optional(s.string()),
        answer: s.optional(s.string()),
      }),
    ),
  ),
});

export type Wireframes = Infer<typeof schema>;
export type RegionData = Infer<typeof region>;
export type DrawingData = Infer<typeof drawing>;
export type ContentData = Infer<typeof contentObject>;

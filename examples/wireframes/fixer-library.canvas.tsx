import {
  Button,
  Chip,
  Code,
  Field,
  Grid,
  Heading,
  Kbd,
  Marker,
  Panel,
  Placeholder,
  Region,
  Row,
  Segmented,
  SideList,
  Slider,
  Sparkline,
  Stack,
  Status,
  Table,
  Text,
  TextInput,
  Wireframe,
  useCanvasState,
} from "atelier";
import type { Tone } from "atelier";
import { Wireframes, type WireframesData } from "atelier/templates";

export const meta = { title: "The Library: wireframes", theme: "cursor" };

type Note = { n: number; title: string; text: string; status: "built" | "building" | "planned" | "later" | "you" };

// ---------------------------------------------------------------- the data

const WINDOW_NOTES: Note[] = [
  {
    n: 1,
    title: "One window, two modules",
    text: "Library and Develop share the window, each built once; G, E, C, N and D, ⌥⌘1 and ⌥⌘2 switch within a frame, carrying the source, selection and filter across. The title names the source and its count.",
    status: "built",
  },
  {
    n: 2,
    title: "Sources",
    text: "Folders is built, with offline volumes browsable from the index. The Library entries (Library Health only while it has findings), Collections and Keywords join it; every entry is a source the grid, filter and filmstrip treat alike.",
    status: "planned",
  },
  {
    n: 3,
    title: "The filter bar (\\)",
    text: "Text, Attribute and Metadata sections over one query, with sorts, saved filters, a filter kept per source and a lock across sources. Typing is about three times over its budget for now; an agent fixes that after culling.",
    status: "built",
  },
  {
    n: 4,
    title: "The grid",
    text: "Sizes from 80 to 400 points, three cell styles (J), a rubber band, stars, flag, label and mark on each cell. A thumbnail shows the edit, with ••• while Fixer renders it.",
    status: "built",
  },
  {
    n: 5,
    title: "Moments and stacks",
    text: "Bursts and raw and JPEG pairs fold into one cell with a count; the library finds them already (CAT-33). Group By moment, day, folder, camera, lens or orientation puts a header over each group with its count and its picks (CAT-45). The library's half is built, groups opening and closing in lists with them; the headers come after the grid's budgets.",
    status: "planned",
  },
  {
    n: 6,
    title: "The toolbar",
    text: "Grid and loupe, cell style, thumbnail size, Develop and Show in Finder, each naming its key in its tooltip.",
    status: "built",
  },
  {
    n: 7,
    title: "Photo info",
    text: "The active photo's file, capture settings and badges.",
    status: "built",
  },
  {
    n: 8,
    title: "Metadata and keywords",
    text: "IPTC fields with presets, applied keywords, completion from the keyword list and nine keyword sets on ⌥1 to ⌥9. The library side of both is built (CAT-23, CAT-24); the panels aren't.",
    status: "planned",
  },
  {
    n: 9,
    title: "The filmstrip",
    text: "The same filmstrip as Develop's, with the same selection and place; it says how many photos a filter leaves out.",
    status: "built",
  },
];

const COMPARE_NOTES: Note[] = [
  {
    n: 1,
    title: "The loupe",
    text: "The photo from the store's preview at once, its rating, flag, label and mark under it, and the filmstrip below. Held arrow keys move without a blank frame.",
    status: "built",
  },
  {
    n: 2,
    title: "Judging tools",
    text: "Sensor clipping and a raw histogram, since a raw's embedded JPEG hides clipping; focus peaking, the camera's focus point, and a loupe that follows the pointer at 100 to 400% (CAT-42).",
    status: "planned",
  },
  {
    n: 3,
    title: "Compare (C) and Survey (N)",
    text: "Compare: the select and a candidate side by side, the candidate stepping on with the arrow keys and promoted with a key. Survey: several frames at once, each dropped with a click until one is left (CAT-17).",
    status: "planned",
  },
  {
    n: 4,
    title: "Proposals",
    text: "The sharpest frame of each burst at the camera's focus point, drawn dashed until you accept it, never touching a frame you decided (CAT-46). Whether it's in 1.0 waits on three of your culled shoots.",
    status: "you",
  },
];

const TAG_NOTES: Note[] = [
  {
    n: 1,
    title: "Keywords on the selection",
    text: "Type to add, completed from the keyword list with counts and synonyms; nine sets on ⌥1 to ⌥9; a painter that sprays a keyword on whatever you click. Each a batch with Undo, saved in each photo's sidecar as a full path (CAT-23).",
    status: "planned",
  },
  {
    n: 2,
    title: "The keyword list",
    text: "A tree with counts, renamed, moved and merged in one step, rewriting the sidecars; drag photos onto a keyword; Lightroom Classic's keyword file in and out without loss.",
    status: "planned",
  },
  {
    n: 3,
    title: "Metadata presets",
    text: "Photo Mechanic's template: only the fields ticked, each replacing, appending or prefixing; codes like \\venue\\ expanded from a file of replacements, for captions on deadline (CAT-24).",
    status: "planned",
  },
  {
    n: 4,
    title: "Collections",
    text: "Sets and collections saved in each photo's sidecar by path, so moving photos never breaks them; smart collections are saved queries; drag photos in or use the target collection (CAT-26).",
    status: "planned",
  },
];

const FILE_NOTES: Note[] = [
  {
    n: 1,
    title: "Import",
    text: "A card browsed from its own previews before anything is copied, culled with the same keys; photos already in the library skipped; folder and name templates; a backup that's a real copy; every copy read back and matched before the card is safe to erase (CAT-31).",
    status: "planned",
  },
  {
    n: 2,
    title: "Rename and move",
    text: "One naming grammar with a live preview of every name, collisions numbered in capture order, empty tokens flagged; a raw, its JPEG, its sidecar and other apps' .xmp go together; journaled, so a forced quit loses nothing; Undo (CAT-29, CAT-30).",
    status: "planned",
  },
  {
    n: 3,
    title: "Library Health",
    text: "Duplicates, raw and JPEG pairs under a rule you pick, damaged files, wrong extensions and missing photos; each a source in the grid, with proposals drawn apart from your own flags and acted on only as one batch to the Trash with Undo (CAT-44). The checks are built in the library and the command line, all but missing photos; this group in the Library panel comes once culling is out of the app.",
    status: "planned",
  },
  {
    n: 4,
    title: "Recently Trashed",
    text: "What Fixer moved to the Trash, put back by photo or by batch after Undo is gone, while the files are still in the Trash. Built in the library and the command line; its source in the app is planned.",
    status: "planned",
  },
];

const data: WireframesData = {
  title: "The Library: wireframes",
  intro: "How Fixer's library looks and works, from what's built on the catalog-ui branch and what the design and the tracker plan for 1.0. 6 October 2026.",
  updated: "2026-10-16T09:40:00+01:00",
  overview: {
    title: "From a million photos to the few you keep",
    text: "The Library is Lightroom Classic's Library module, rebuilt so nothing waits on a disk. You choose a source, narrow it with a query, fold the repeats, cull at a key press, and describe what's left. Each step works by key, by mouse and from the command palette (DSN-23).",
  },
  principlesTitle: "What makes it work at a million photos",
  questionsIntro: "Each changes panels that aren't built yet, or a default, not the library underneath. Say which you'd like, or anything you'd change on the other tabs.",
  reading: "Boxes are regions, numbers point to the notes under each wireframe, and photo counts are made up. Every region says where it stands:",
  statuses: {
    built: { label: "Built", meaning: "On the catalog-ui branch and tested; most of it shows in Fixer's preview build." },
    building: { label: "Being built", meaning: "An agent is building it now." },
    planned: { label: "Planned for 1.0", meaning: "In the tracker for 1.0; its engine often exists already, without its panel." },
    later: { label: "After 1.0", meaning: "After 1.0, by decision DSN-21." },
    you: { label: "Waits on you", meaning: "Waiting on a measurement or a decision of yours." },
  },
  flow: [
    {
      title: "Choose a source",
      text: "A folder, a collection, a smart collection, All Photographs, Previous Import, or a card before it's imported. Every source works the same way and keeps its own view.",
      status: "built",
    },
    {
      title: "Narrow it with one query",
      text: "Type words, or click flags, stars, labels and metadata columns with counts. Every click writes the same query you could type, as you type, over a million photos.",
      status: "built",
    },
    {
      title: "Fold and group",
      text: "Bursts and raw and JPEG pairs fold into one cell. A shoot splits into moments at its pauses, each showing how many photos it has and how many are picked.",
      status: "planned",
    },
    {
      title: "Cull at a key press",
      text: "Stars, flags, labels and marks on the whole selection, with Undo, moving to the next photo. The loupe, Compare and Survey for close calls.",
      status: "building",
    },
    {
      title: "Describe and file",
      text: "Keywords, captions and presets, collections, renames and moves: each change one batch on any number of photos, undone in one step.",
      status: "planned",
    },
  ],
  principles: [
    {
      title: "One query language for everything",
      text: "The filter bar, the command palette, smart collections and fixer library search share one grammar. A field added to it can be searched, saved and scripted everywhere at once.",
    },
    {
      title: "Counts before you click",
      text: "Every metadata column and completion shows how many photos it would leave, so you see where a filter leads before you take it.",
    },
    {
      title: "Repeats folded away",
      text: "A burst of 20 is one cell until you open it, and a raw and its JPEG are one photo, so a shoot of 3,000 frames reads as a few hundred decisions.",
    },
    {
      title: "Nothing waits on the photos' disk",
      text: "Search, counts, thumbnails and culling come from the index and the preview store on this Mac, so a spinning disk or a NAS doesn't slow the grid.",
    },
    {
      title: "Every change one batch with Undo",
      text: "Rating 10,000 photos, renaming them or moving them to the Trash is one step to take back.",
    },
  ],
  screens: [
    {
      id: "window",
      name: "The window",
      summary:
        "The Library module as the catalog-ui branch lays it out today (the grid, the filter bar, the toolbar, the filmstrip, Folders and Photo info), with the panels the plan adds. The numbers point to the notes below.",
      notes: WINDOW_NOTES,
      notesColumns: 3,
    },
    {
      id: "finding",
      name: "Finding photos",
      title: "One query, many faces",
      summary:
        "The filter bar is a query editor: the attribute row, the metadata columns, the chips and the rules all read and write the text of one query, so a beginner can click and an expert can type, and both see the other's form. Built (CAT-04, CAT-19); the rule form is in the engine, its panel is planned.",
      tables: [
        {
          title: "The language, as built",
          headers: ["Fields", "Written", "What it does"],
          rows: [
            ["Free text", "tram night", "Name, folder, keywords, title, caption, camera, lens"],
            ["rating, flag, label", "rating>=3  -flag:reject  label:red,blue", "Comparisons, negation, lists"],
            ["kw", 'kw:Birds  kw:"Places/Portugal"', "A parent matches its children; synonyms too"],
            ["date", "date:2024-06..2024-08  date:last:30d", "Ranges and relative dates"],
            ["camera, lens, iso, f, focal, shutter", "lens:35  iso<=800  f:1.4..2.8", "Substrings, numbers, ranges"],
            ["folder, name, type, has", 'in:"Trips/2024"  type:raw  has:gps', "Where it is, what it is, what it has"],
            ["missing, offline, edited", "offline:yes  edited:no", "States, from the index"],
            ["Groups", "(camera:Z6 OR camera:X-T5) -kw:Test", "AND by default, OR, -, parentheses"],
          ],
        },
        {
          title: "How it grows",
          text: "A field added to the grammar is at once searchable, completable, savable in smart collections and presets, runnable from ⌘K and scriptable from the command line. Counting it in a metadata column also needs a column in the index's column store. What's arriving:",
          headers: ["What", "Written, or what it needs", "Status"],
          rows: [
            ["Custom labels, collections", 'label:"Second look"  collection:Portfolio', "built"],
            ["IPTC Core's fields", "creator:Lobo  city:Lisbon  countrycode:PT", "built"],
            ["Traits: named queries", "is:long-exposure  is:panorama  is:low-light  is:no-location", "built"],
            ["Smart collections as sources", "Any saved query, kept current, showing stacks", "built"],
            ["Orientation as a filter", "orientation:portrait", "built"],
            ["A time of day in dates", "date:2025-06-14T14:03..2025-06-14T14:41", "built"],
            ["Text without its accents", "sao finds São Paulo, zurich finds Zürich (DSN-27)", "built"],
            ["Names with a typo, or by their letters in order", "landscpae finds Landscapes, in completion and the palette (CAT-19, CAT-20)", "planned"],
            ["Wide Open, Telephoto, Ultra Wide", "Need the lens's widest aperture and 35 mm-equivalent focal length", "planned"],
            ["People, things in photos, near-duplicates", "person:Rita  similar:DSC_0412", "later"],
            ["Words in plain language", "“birds at the beach last summer”, drafted into a query you can edit", "later"],
          ],
        },
      ],
    },
    {
      id: "culling",
      name: "Culling",
      title: "Culling at a key press",
      summary:
        "The keys are Lightroom Classic's, so switchers keep their hands. In Library they act on the whole selection, as one batch with Undo; in Develop, on the photo. Being built now (CAT-13).",
      notes: COMPARE_NOTES,
      tables: [
        {
          title: "Keys",
          headers: ["Keys", "What it does", "Where", "Status"],
          rows: [
            ["1 2 3 4 5 0", "Set stars, or none", "The whole selection in Library; the photo in Develop", "building"],
            ["[ ]", "One star less, one more", "As above", "building"],
            ["P X U", "Pick, reject, unflag", "As above", "building"],
            ["6 7 8 9", "Red, yellow, green, blue", "Purple and your own labels from the Photo menu and ⌘K", "building"],
            ["B", "Mark (the quick collection)", "As above", "building"],
            ["⇧ + any", "…and go to the next photo", "Auto Advance (Photo menu) does it for every key", "building"],
            ["⌘Z ⇧⌘Z", "Undo and redo the whole batch", "10,000 photos are one step", "building"],
            ["G E C N", "Grid, loupe, Compare, Survey", "C and N show the loupe until CAT-17", "built"],
            ["← →", "Next and previous, held to fly", "No blank frames in the grid and filmstrip", "built"],
            ["Z Space", "Fit and 1:1 in the loupe", "Click and drag to pan", "built"],
          ],
        },
      ],
    },
    {
      id: "keywords",
      name: "Keywords and metadata",
      title: "Describing many photos at once",
      summary:
        "The library can already do all of this to any number of photos, with Undo, from the command line; what's left is its panels. Every change goes into each photo's sidecar, so other Macs and a rebuilt index never lose it, and into standard XMP when you turn that on.",
      notes: TAG_NOTES,
    },
    {
      id: "files",
      name: "Import, files and health",
      title: "Getting photos in, and keeping them in order",
      summary:
        "The library side of each is built and tested at scale, and runs today from fixer library on the command line; these are the windows and panels still to come.",
      notes: FILE_NOTES,
    },
  ],
  questions: [
    {
      id: "search-place",
      title: "Where does search live?",
      now: "As built, the filter bar is Lightroom Classic's: hidden until \\, with Text, Attribute and Metadata sections you open.",
      options: [
        "Keep Lightroom's bar as built, for people switching from Classic",
        "A search field always on screen above the grid, with chips; the attribute row and metadata columns open from it",
      ],
      lean: "The second, keeping \\ and the sections: at a million photos, typing is the fastest way in. Both edit the same query, so it changes only the bar's layout.",
    },
    {
      id: "auto-advance",
      title: "Is Auto Advance on while culling?",
      now: "⇧ with a rating key moves to the next photo; Auto Advance (the Photo menu) makes every key do it.",
      options: ["Off, as Lightroom Classic ships", "On in the loupe, as Photo Mechanic culls"],
      lean: "On in the loupe, off in the grid, where a key acts on a selection.",
    },
    {
      id: "b-key",
      title: "What does B do?",
      now: "The design gives B to the mark, Fixer's quick collection, shown in Library › Marked.",
      options: ["The mark, as designed", "Add to the target collection when one is set, as Lightroom Classic does, the mark otherwise"],
      lean: "Lightroom's behaviour: switchers expect it, and with no target set it's the same as the mark.",
    },
    {
      id: "moments-default",
      title: "Are new shoots grouped into moments?",
      now: "Group By is a choice on any source, kept with its view.",
      options: ["Only when chosen", "By moment by default for Previous Import and cards"],
      lean: "By moment for imports and cards, since that's when there's a shoot to cull.",
    },
    {
      id: "search-scope",
      title: "Does typing search the source or the whole library?",
      now: "As in Lightroom Classic, the filter bar narrows the source on screen: a folder, a collection, or All Photographs to search everything.",
      options: [
        "The source, as Lightroom Classic does; choosing All Photographs searches everything",
        "The source, with the field offering the whole library's count beside it (\"Search all 1,042,318\") and ⌘K searching everything from anywhere",
      ],
      lean: "The second: finding a photo again is the most common search in a large library, and it shouldn't need a detour through All Photographs.",
    },
  ],
};

// ---------------------------------------------------------------- cells

type Label = "red" | "yellow" | "green" | "blue" | "purple";

const LABEL_TONE: Record<Label, Tone> = { red: "danger", yellow: "warning", green: "success", blue: "info", purple: "accent" };

function Dot({ label }: { label: Label }) {
  return (
    <Text as="span" tone={LABEL_TONE[label]}>
      ●
    </Text>
  );
}

type ThumbProps = {
  w?: number;
  rating?: number;
  flag?: "pick" | "reject";
  label?: Label;
  mark?: boolean;
  edited?: "shown" | "rendering";
  stack?: number;
  selected?: boolean;
  proposal?: boolean;
  badges?: boolean;
  onClick?: () => void;
};

/** A photo's cell: the thumbnail, its stack's count and edit in the corner, its stars, flag, label and mark under it. */
function Thumb({ w = 62, rating = 0, flag, label, mark, edited, stack, selected, proposal, badges = true, onClick }: ThumbProps) {
  const corner = [stack ? `[${stack}]` : "", edited === "rendering" ? "•••" : edited === "shown" ? "✎" : ""].filter(Boolean).join(" ");
  const caption = badges ? (
    <>
      {"★".repeat(rating) || "·"}
      {flag === "pick" ? " ⚑" : flag === "reject" ? " ✕" : ""}
      {label ? " " : ""}
      {label ? <Dot label={label} /> : null}
      {mark ? " •" : ""}
    </>
  ) : undefined;
  return <Placeholder w={w} selected={selected} dashed={proposal} dim={flag === "reject"} badge={corner || undefined} caption={caption} onClick={onClick} />;
}

function GroupHeader({ title, detail, warn }: { title: string; detail: string; warn?: boolean }) {
  return (
    <Text size="sm">
      <Text as="span" tone="muted">
        {"▾ "}
      </Text>
      <Text as="span" weight="bold">
        {title}
      </Text>
      {"  "}
      <Text as="span" tone={warn ? "default" : "muted"}>
        {detail}
      </Text>
    </Text>
  );
}

/** The nine keywords of a set, on ⌥1 to ⌥9, three to a row. */
function KeywordSet() {
  const words = ["Street", "Night", "Tram", "Food", "Market", "River", "Church", "Tiles", "Bridge"];
  return (
    <Grid columns={3} gap={3}>
      {[0, 1, 2].map((col) => (
        <SideList key={col} items={[0, 1, 2].map((row) => ({ label: words[row * 3 + col], count: `⌥${row * 3 + col + 1}` }))} />
      ))}
    </Grid>
  );
}

// ---------------------------------------------------------------- the window

const GRID_ROW_A: ThumbProps[] = [
  { rating: 3, flag: "pick", stack: 9, selected: true },
  { rating: 0 },
  { rating: 4, label: "red", edited: "shown" },
  { rating: 0, flag: "reject" },
  { rating: 2, stack: 2 },
  { rating: 5, flag: "pick", mark: true, selected: true },
  { rating: 0, edited: "rendering" },
];

const GRID_ROW_B: ThumbProps[] = [
  { rating: 0, stack: 14 },
  { rating: 1 },
  { rating: 0 },
  { rating: 3, label: "green" },
  { rating: 0, stack: 6 },
  { rating: 0, flag: "reject" },
  { rating: 2 },
];

function TheWindow() {
  return (
    <Wireframe
      toolbar={
        <>
          <Marker n={1} />
          <Segmented items={["Library", "Develop"]} active="Library" />
          <Text as="span" size="sm" tone="secondary">
            Pictures › 2024 › Lisbon
          </Text>
          <Text as="span" size="sm" tone="muted">
            1,284 photos
          </Text>
        </>
      }
      toolbarEnd={
        <>
          <Text as="span" size="sm" tone="muted">
            Command palette
          </Text>
          <Kbd>⌘K</Kbd>
        </>
      }
      gap={8}
    >
      <Wireframe frame="none" columns="196px minmax(0, 1fr) 214px" gap={8}>
        <Region n={2} label="Sources">
          <Stack gap={10}>
            <SideList
              title="Library"
              status="planned"
              items={[
                { label: "All Photographs", count: "1,042,318" },
                { label: "Previous Import", count: "412" },
                { label: "Marked", count: "36" },
                { label: "Rejected", count: "1,920" },
                { label: "Library Health", count: "5" },
                { label: "Recently Trashed", count: "12" },
              ]}
              note="Library Health shows only while a check has findings"
            />
            <SideList
              title="Folders"
              status="built"
              items={[
                { label: "Macintosh HD" },
                { label: "Pictures", count: "48,210", depth: 1 },
                { label: "2024", count: "9,914", depth: 2 },
                { label: "Lisbon", count: "1,284", depth: 3, selected: true },
                { label: "Porto", count: "2,107", depth: 3 },
                { label: "T7 Shield", count: "812,004" },
                { label: "NAS, offline", count: "182,100", dim: true },
              ]}
            />
            <SideList
              title="Collections"
              status="planned"
              items={[
                { label: "Clients" },
                { label: "Acme", depth: 1 },
                { label: "Selects", count: "64", depth: 2 },
                { label: "Portfolio", count: "120" },
                { label: "⚙ Five stars this year", count: "842" },
              ]}
            />
            <SideList
              title="Keywords"
              status="planned"
              items={[
                { label: "Places", count: "31,880" },
                { label: "Portugal", count: "9,402", depth: 1 },
                { label: "Lisbon", count: "3,402", depth: 2 },
                { label: "Birds", count: "12,055" },
                { label: "Wedding", count: "40,118" },
              ]}
            />
          </Stack>
        </Region>

        <Stack gap={8}>
          <Region n={3} label="Filter bar" status="built">
            <Stack gap={6}>
              <Row gap={6} align="center">
                <Text size="sm" tone="muted">
                  Library Filter:
                </Text>
                <Segmented items={["Text", "Attribute", "Metadata", "None"]} active="Text" />
                <Text size="sm">214 of 1,284</Text>
                <Text size="sm" tone="muted">
                  Sort: Capture time ↑ · Presets ▾ · Lock
                </Text>
              </Row>
              <Row gap={5} align="center">
                <Chip>kw:Lisbon</Chip>
                <Chip>rating&gt;=3</Chip>
                <Chip>-flag:reject</Chip>
                <Code>tram▏</Code>
              </Row>
              <Row gap={10} align="center">
                <Text size="sm">
                  <Text as="span" tone="muted">
                    {"Flag "}
                  </Text>
                  {"⚑ ✕ ○"}
                </Text>
                <Text size="sm">
                  <Text as="span" tone="muted">
                    {"Rating ≥ "}
                  </Text>
                  {"★★★"}
                </Text>
                <Text size="sm">
                  <Text as="span" tone="muted">
                    {"Label "}
                  </Text>
                  {(["red", "yellow", "green", "blue", "purple"] as Label[]).map((l) => (
                    <Dot key={l} label={l} />
                  ))}
                </Text>
                <Text size="sm">
                  <Text as="span" tone="muted">
                    {"Kind "}
                  </Text>
                  {"Raw · JPEG · HEIC"}
                </Text>
                <Text size="sm" tone="muted">
                  Edited · Missing · Offline
                </Text>
              </Row>
              <Grid min={100} gap={5}>
                <SideList
                  title="Date"
                  items={[
                    { label: "2024", count: "1,284" },
                    { label: "June", count: "802", selected: true },
                    { label: "14 June", count: "211" },
                  ]}
                />
                <SideList
                  title="Camera"
                  items={[
                    { label: "Nikon Z 6", count: "702", selected: true },
                    { label: "Fujifilm X-T5", count: "582" },
                  ]}
                />
                <SideList
                  title="Lens"
                  items={[
                    { label: "24-70 f/2.8", count: "410" },
                    { label: "35 f/1.4", count: "292" },
                  ]}
                />
                <SideList
                  title="Keyword"
                  items={[
                    { label: "Tram", count: "41" },
                    { label: "Night", count: "18" },
                  ]}
                />
              </Grid>
            </Stack>
          </Region>
          <Region n={4} label="Grid" status="built">
            <Stack gap={6}>
              <Region n={5} label="Group by moment" status="planned">
                <Slider label="Tighter to looser" value={45} min={0} max={100} />
              </Region>
              <GroupHeader title="Morning at Graça" detail="09:12 to 09:58 · 96 photos · 3 picks" />
              <Row gap={8} wrap>
                {GRID_ROW_A.map((t, i) => (
                  <Thumb key={`a${i}`} {...t} />
                ))}
              </Row>
              <GroupHeader title="Tram 28" detail="11:40 to 12:05 · 58 photos · no pick yet" warn />
              <Row gap={8} wrap>
                {GRID_ROW_B.map((t, i) => (
                  <Thumb key={`b${i}`} {...t} />
                ))}
              </Row>
              <GroupHeader title="Lunch at the market" detail="12:31 to 13:16 · 60 photos · 1 pick" />
              <Row gap={8} wrap>
                {GRID_ROW_A.slice()
                  .reverse()
                  .map((t, i) => (
                    <Thumb key={`c${i}`} {...t} selected={false} />
                  ))}
              </Row>
            </Stack>
          </Region>
          <Region n={6} label="Toolbar" status="built">
            <Row gap={8} align="center">
              <Segmented items={["Grid G", "Loupe E", "Compare C", "Survey N"]} active="Grid G" />
              <Text size="sm" tone="muted">
                Cell style J
              </Text>
              <Text size="sm" tone="muted">
                Develop D · Show in Finder ⌘R
              </Text>
            </Row>
            <Slider label="Thumbnail size" value={35} min={0} max={100} />
          </Region>
        </Stack>

        <Stack gap={8}>
          <Region n={7} label="Photo info" status="built">
            <Field name="File" value="DSC_0412.ARW" />
            <Field name="Taken" value="14 Jun 2024 09:31:07.42" />
            <Field name="Camera" value="Nikon Z 6" />
            <Field name="Lens" value="24-70 f/2.8 at 35 mm" />
            <Field name="Exposure" value="1/250 s · f/2.8 · ISO 400" />
            <Field name="Size" value="6048 × 4024 · 24.5 MB" />
            <Field name="">
              {"★★★ ⚑ "}
              <Dot label="red" />
            </Field>
          </Region>
          <Region n={8} label="Metadata" status="planned">
            <Field name="Preset" value="Lisbon trip ▾" />
            <Field name="Title" value="Tram 28" />
            <Field name="Caption" value="Climbing to Graça" />
            <Field name="Creator" value="Rita Lobo" />
            <Field name="Location" value="Graça, Lisbon, PT" />
          </Region>
          <Region label="Keywords" status="planned">
            <Stack gap={6}>
              <Row gap={4}>
                <Chip>Lisbon ×</Chip>
                <Chip>Tram ×</Chip>
                <Chip>Places/Portugal ×</Chip>
              </Row>
              <TextInput placeholder="Add keywords…" />
              <Text size="sm" tone="muted">
                Keyword set: Travel ▾
              </Text>
              <KeywordSet />
            </Stack>
          </Region>
        </Stack>
      </Wireframe>
      <Region n={9} label="Filmstrip" status="built">
        <Row gap={10} align="center">
          <Text size="sm" tone="muted">
            12 of 40 photos
          </Text>
          <Row gap={5}>
            {Array.from({ length: 14 }, (_, i) => (
              <Thumb key={i} w={44} badges={false} selected={i === 3} />
            ))}
          </Row>
        </Row>
      </Region>
    </Wireframe>
  );
}

// ---------------------------------------------------------------- finding photos

type TermGroup = "flag" | "rating" | "label" | "kind" | "date" | "camera" | "keyword";

type Term = { id: string; group: TermGroup; text: string; label: string; share: number };

const TERMS: Term[] = [
  { id: "pick", group: "flag", text: "flag:pick", label: "Picked", share: 0.08 },
  { id: "noreject", group: "flag", text: "-flag:reject", label: "Not rejected", share: 0.9 },
  { id: "r3", group: "rating", text: "rating>=3", label: "3 stars or more", share: 0.18 },
  { id: "r5", group: "rating", text: "rating:5", label: "5 stars", share: 0.02 },
  { id: "red", group: "label", text: "label:red", label: "Red", share: 0.03 },
  { id: "green", group: "label", text: "label:green", label: "Green", share: 0.04 },
  { id: "raw", group: "kind", text: "type:raw", label: "Raw", share: 0.7 },
  { id: "y2024", group: "date", text: "date:2024", label: "2024", share: 0.11 },
  { id: "jun", group: "date", text: "date:2024-06", label: "June 2024", share: 0.012 },
  { id: "z6", group: "camera", text: 'camera:"Z 6"', label: "Nikon Z 6", share: 0.31 },
  { id: "xt5", group: "camera", text: 'camera:"X-T5"', label: "Fujifilm X-T5", share: 0.22 },
  { id: "birds", group: "keyword", text: "kw:Birds", label: "Birds", share: 0.012 },
  { id: "lisbon", group: "keyword", text: "kw:Lisbon", label: "Lisbon", share: 0.003 },
];

const GROUP_TITLE: Record<TermGroup, string> = {
  flag: "Flag",
  rating: "Rating",
  label: "Label",
  kind: "Kind",
  date: "Date",
  camera: "Camera",
  keyword: "Keyword",
};

const ATTRIBUTE_GROUPS: TermGroup[] = ["flag", "rating", "label", "kind"];
const COLUMN_GROUPS: TermGroup[] = ["date", "camera", "keyword"];
const TOTAL = 1042318;
const count = (n: number) => n.toLocaleString("en-GB");

function useQuery() {
  const [chosen, setChosen] = useCanvasState<string[]>("query", ["noreject", "r3", "birds"]);
  const toggle = (id: string) => setChosen((previous) => (previous.includes(id) ? previous.filter((x) => x !== id) : [...previous, id]));
  const byGroup = new Map<TermGroup, Term[]>();
  for (const term of TERMS) {
    if (!chosen.includes(term.id)) continue;
    byGroup.set(term.group, [...(byGroup.get(term.group) ?? []), term]);
  }
  const parts: string[] = [];
  let share = 1;
  for (const [, terms] of byGroup) {
    parts.push(terms.length === 1 ? terms[0].text : `(${terms.map((t) => t.text).join(" OR ")})`);
    share *= Math.min(1, terms.reduce((sum, t) => sum + t.share, 0));
  }
  return { chosen, toggle, byGroup, text: parts.join(" "), count: Math.max(0, Math.round(TOTAL * share)) };
}

/** Illustrative: the attribute row, the metadata columns, the chips, the text and the rules, all one query. */
function QueryPlayground() {
  const q = useQuery();
  return (
    <Stack gap={14}>
      <Panel padding={6}>
        <Row gap={6} align="center">
          {[...q.byGroup.values()].map((terms) => (
            <Chip key={terms.map((t) => t.id).join("+")} onClick={() => terms.forEach((t) => q.toggle(t.id))}>
              {`${terms.length === 1 ? terms[0].text : `(${terms.map((t) => t.text).join(" OR ")})`} ×`}
            </Chip>
          ))}
          {q.text === "" ? (
            <Text size="sm" tone="muted">
              Search all photographs
            </Text>
          ) : null}
          <Text size="sm" tone="secondary">{`${count(q.count)} of ${count(TOTAL)}`}</Text>
        </Row>
      </Panel>
      <Wireframe frame="none" columns="minmax(0, 1fr) minmax(0, 1fr)" gap={18}>
        <Stack gap={10}>
          <Heading level={3}>Attribute row: one click per term</Heading>
          {ATTRIBUTE_GROUPS.map((group) => (
            <Row key={group} gap={6} align="center">
              <Text size="sm" tone="muted">
                {GROUP_TITLE[group]}
              </Text>
              {TERMS.filter((t) => t.group === group).map((t) => (
                <Chip key={t.id} dim={!q.chosen.includes(t.id)} onClick={() => q.toggle(t.id)}>
                  {t.label}
                </Chip>
              ))}
            </Row>
          ))}
          <Heading level={3}>Metadata columns: choices in a column join with OR</Heading>
          <Grid columns={3} gap={8}>
            {COLUMN_GROUPS.map((group) => (
              <SideList
                key={group}
                title={GROUP_TITLE[group]}
                items={TERMS.filter((t) => t.group === group).map((t) => ({ label: t.label, count: count(Math.round(TOTAL * t.share)), selected: q.chosen.includes(t.id) }))}
                onSelect={(label) => {
                  const term = TERMS.find((t) => t.group === group && t.label === label);
                  if (term) q.toggle(term.id);
                }}
              />
            ))}
          </Grid>
        </Stack>
        <Stack gap={10}>
          <Heading level={3}>The same query, typed</Heading>
          <Code block copy={false} wrap>
            {q.text || "(nothing: every photo)"}
          </Code>
          <Heading level={3}>As rules, for groups and exceptions</Heading>
          <Panel padding={8}>
            <Stack gap={4}>
              <Text size="sm" tone="muted">
                Photos matching all of these:
              </Text>
              {[...q.byGroup.entries()].map(([group, terms]) => (
                <Field
                  key={group}
                  name={GROUP_TITLE[group]}
                  value={`${terms.length > 1 ? "any of " : ""}${terms.map((t) => t.label).join(", ")}${terms.some((t) => t.text.startsWith("-")) ? " (an exception)" : ""}`}
                />
              ))}
              {q.byGroup.size === 0 ? (
                <Text size="sm" tone="muted">
                  No rules: every photo
                </Text>
              ) : null}
            </Stack>
          </Panel>
          <Heading level={3}>And everywhere else</Heading>
          <Stack gap={4}>
            <Text size="sm">Save as Smart Collection… keeps it current as photos change</Text>
            <Text size="sm">Filter presets, and a lock that keeps it as you change folders</Text>
            <Text size="sm">
              {"⌘K runs it from anywhere; "}
              <Code>fixer library search</Code>
              {" takes the same text"}
            </Text>
          </Stack>
        </Stack>
      </Wireframe>
      <Text size="sm" tone="muted">
        Illustrative: click the choices on the left, and the chips, the typed text and the rules follow. Counts are made up.
      </Text>
    </Stack>
  );
}

function Completion({ title, typed, rows }: { title: string; typed: string; rows: [string, string, string?][] }) {
  return (
    <Stack gap={6}>
      <Heading level={3}>{title}</Heading>
      <TextInput value={`${typed}▏`} />
      <SideList
        items={rows.map(([text, n, note], i) => ({ label: note ? `${text}  ${note}` : text, count: n, selected: i === 0 }))}
        note="Tab takes the first; ↓ and ↑ move through them"
      />
    </Stack>
  );
}

function Finding() {
  return (
    <Stack gap={24}>
      <QueryPlayground />
      <Wireframe frame="none" columns="minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)" gap={20}>
        <Completion
          title="Typing a field: completed from the index"
          typed="kw:bi"
          rows={[
            ["kw:Birds", "12,055"],
            ["kw:Birds/Gulls", "1,203"],
            ["kw:Birds/Storks", "211"],
            ["kw:Bikes", "88"],
          ]}
        />
        <Completion
          title="Typing words: fields and traits offered"
          typed="long"
          rows={[
            ["is:long-exposure", "2,301", "trait: a second or more"],
            ["lens:Long", "14"],
            ["Longboat_014.NEF", "1", "a file"],
          ]}
        />
        <Stack gap={6}>
          <Heading level={3}>When nothing matches</Heading>
          <Region label="Empty grid" status="built">
            <Stack gap={8}>
              <Text size="sm" weight="bold">
                No photos match these filters
              </Text>
              <Text size="sm" tone="secondary">
                Without camera:"X-T5", 1,204 photos would.
              </Text>
              <Row gap={6}>
                <Button size="sm" variant="solid">
                  Remove camera:"X-T5"
                </Button>
                <Button size="sm" variant="outline">
                  Clear all
                </Button>
              </Row>
            </Stack>
          </Region>
          <Text size="sm" tone="muted">
            One count per term, worked out as you type, so an empty grid always says what's in its way.
          </Text>
        </Stack>
      </Wireframe>
    </Stack>
  );
}

// ---------------------------------------------------------------- culling

/** Illustrative: a star key on a selection rates all of it, as one batch that one Undo takes back. */
function RatePlayground() {
  const [selected, setSelected] = useCanvasState<number[]>("cull-selection", [1, 2, 4]);
  const [ratings, setRatings] = useCanvasState<number[]>("cull-ratings", [0, 0, 0, 0, 0, 0]);
  const [before, setBefore] = useCanvasState<number[] | null>("cull-before", null);
  const [last, setLast] = useCanvasState<string>("cull-last", "");
  const rate = (n: number) => {
    setBefore(ratings);
    setRatings(ratings.map((r, i) => (selected.includes(i) ? n : r)));
    setLast(`${n} star${n === 1 ? "" : "s"} on ${selected.length} photo${selected.length === 1 ? "" : "s"}`);
  };
  const undo = () => {
    if (before) setRatings(before);
    setBefore(null);
    setLast("");
  };
  const toggle = (i: number) => setSelected((previous) => (previous.includes(i) ? previous.filter((x) => x !== i) : [...previous, i]));
  return (
    <Stack gap={10}>
      <Heading level={3}>Try it: rate a selection</Heading>
      <Text size="sm" tone="secondary">
        Click photos to select them, then a star key. The whole selection changes at once, and one Undo takes it all back. Illustrative.
      </Text>
      <Row gap={8} wrap>
        {ratings.map((r, i) => (
          <Thumb key={i} w={60} rating={r} selected={selected.includes(i)} onClick={() => toggle(i)} />
        ))}
      </Row>
      <Row gap={5} align="center">
        {[0, 1, 2, 3, 4, 5].map((n) => (
          <Button key={n} size="sm" variant="outline" onClick={() => rate(n)}>
            {String(n)}
          </Button>
        ))}
        <Text size="sm" tone="muted">{`${selected.length} selected`}</Text>
      </Row>
      {last ? (
        <Row gap={10} align="center">
          <Text size="sm">{last}</Text>
          <Button size="sm" variant="ghost" kbd="⌘Z" onClick={undo}>
            Undo
          </Button>
        </Row>
      ) : null}
    </Stack>
  );
}

function Moments() {
  const [by, setBy] = useCanvasState("cull-group-by", "Moment");
  return (
    <Stack gap={10}>
      <Heading level={3}>Moments: a shoot in pieces you can finish</Heading>
      <Text size="sm" tone="secondary">
        A wedding of 3,000 frames splits at its pauses into moments, each with how many photos and picks it has; "Moments without a pick: 3" is a filter. One Tighter–Looser control moves the boundaries (CAT-45: the library's half built, the grid's
        planned).
      </Text>
      <Region label="Group by" status="planned">
        <Stack gap={6}>
          <Segmented items={["None", "Moment", "Day", "Camera"]} active={by} onChange={setBy} />
          <Slider label="Tighter to looser" value={40} min={0} max={100} />
          <GroupHeader title="Ceremony" detail="14:02 to 14:35 · 312 photos · 6 picks" />
          <GroupHeader title="Confetti" detail="14:36 to 14:41 · 188 photos · no pick yet" warn />
          <GroupHeader title="Portraits by the river" detail="15:10 to 15:52 · 406 photos · 11 picks" />
        </Stack>
      </Region>
    </Stack>
  );
}

function Culling() {
  return (
    <Stack gap={24}>
      <Wireframe frame="none" columns="minmax(0, 1.3fr) minmax(0, 1fr)" gap={24}>
        <RatePlayground />
        <Moments />
      </Wireframe>
      <Stack gap={14}>
        <Heading level={3}>Close calls</Heading>
        <Wireframe frame="none" columns="minmax(0, 1fr) minmax(0, 1fr)" gap={16}>
          <Region n={1} label="Loupe (E)" status="built">
            <Stack gap={6}>
              <Text size="sm" tone="secondary">
                DSC_0412.ARW · 143 of 412 · 1/250 s f/2.8 ISO 400
              </Text>
              <Wireframe frame="none" columns="minmax(0, 1fr) 190px" gap={8}>
                <Placeholder h={170} caption="The photo at Fit, from the store's preview">
                  ⌖ the camera's focus point
                </Placeholder>
                <Region n={2} label="Judging" status="planned">
                  <Stack gap={4}>
                    <Sparkline title="Raw histogram" values={[3, 8, 15, 24, 20, 12, 7, 5, 10, 4]} blocks />
                    <Text size="sm" tone="muted">
                      Clipping · Peaking · Loupe 100–400%
                    </Text>
                  </Stack>
                </Region>
              </Wireframe>
              <Text size="sm">
                {"★★★ ⚑ "}
                <Dot label="red" />
                <Text as="span" tone="secondary">
                  {"  ·  Auto Advance on"}
                </Text>
              </Text>
            </Stack>
          </Region>
          <Region n={3} label="Compare (C) and Survey (N)" status="planned">
            <Stack gap={8}>
              <Grid columns={2} gap={6}>
                <Placeholder h={96} selected>
                  Select
                </Placeholder>
                <Placeholder h={96}>Candidate → next</Placeholder>
              </Grid>
              <Row gap={6} wrap>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <Thumb key={i} w={52} rating={i === 2 ? 4 : 0} proposal={i === 4} />
                ))}
              </Row>
              <Text size="sm" tone="muted">
                <Marker n={4} />
                {" The dashed frame: a proposal, the sharpest of the burst  "}
                <Status status="you" />
              </Text>
            </Stack>
          </Region>
        </Wireframe>
      </Stack>
    </Stack>
  );
}

// ---------------------------------------------------------------- keywords and metadata

function Tagging() {
  return (
    <Stack gap={14}>
      <Wireframe frame="none" columns="minmax(0, 1fr) minmax(0, 1.1fr) minmax(0, 1fr)" gap={14}>
        <Region n={1} label="Keywords panel" status="planned">
          <Stack gap={6}>
            <Text size="sm" tone="muted">
              On 120 selected photos
            </Text>
            <Row gap={4}>
              <Chip>Lisbon ×</Chip>
              <Chip>Tram ×</Chip>
              <Chip dim>Night (on 18 of 120) ×</Chip>
            </Row>
            <TextInput value="tra▏" />
            <SideList
              items={[
                { label: "Tram", count: "402", selected: true },
                { label: "Travel", count: "8,211" },
                { label: "Trains/Steam", count: "31" },
                { label: "Transport (synonym of Tram)" },
              ]}
            />
            <Text size="sm" tone="muted">
              Set: Travel ▾ · Painter
            </Text>
            <KeywordSet />
          </Stack>
        </Region>
        <Region n={3} label="Metadata, with a preset" status="planned">
          <Stack gap={8}>
            <Field name="Preset" value="Acme · client day ▾" />
            <Table
              dense
              headers={["Field", "Value", "Mode"]}
              rows={[
                ["☑ Title", "Acme launch", "Replace"],
                ["☑ Caption", "\\who\\ at \\venue\\, Lisbon", "Append"],
                ["☑ Creator", "Rita Lobo", "Replace"],
                ["☐ Copyright", "© 2026 Rita Lobo", ""],
                ["☑ City", "Lisbon", "Replace"],
                ["☑ Country", "Portugal · PT", "Replace"],
              ]}
            />
            <Row gap={6} align="center">
              <Button size="sm" variant="solid">
                Apply to 120 photos
              </Button>
              <Text size="sm" tone="muted">
                One batch, one Undo
              </Text>
            </Row>
          </Stack>
        </Region>
        <Stack gap={12}>
          <Region n={2} label="Keyword list" status="planned">
            <SideList
              items={[
                { label: "Places", count: "31,880" },
                { label: "Portugal", count: "9,402", depth: 1 },
                { label: "Lisbon", count: "3,402", depth: 2, selected: true },
                { label: "Porto", count: "2,980", depth: 2 },
                { label: "Birds", count: "12,055" },
                { label: "Gulls", count: "1,203", depth: 1 },
              ]}
              note="Drag photos onto a keyword; ⌥-drag to move a keyword"
            />
          </Region>
          <Region n={4} label="Collections" status="planned">
            <SideList
              items={[
                { label: "Clients" },
                { label: "Acme", depth: 1 },
                { label: "Selects ◎ target", count: "64", depth: 2, selected: true },
                { label: "Portfolio", count: "120" },
                { label: "⚙ Picked, not yet edited", count: "418" },
              ]}
              note="⚙ marks a smart collection: a saved query"
            />
          </Region>
        </Stack>
      </Wireframe>
    </Stack>
  );
}

// ---------------------------------------------------------------- import, files and health

function Files() {
  return (
    <Stack gap={14}>
      <Region n={1} label="Import window" status="planned">
        <Wireframe frame="none" columns="170px minmax(0, 1fr) 230px" gap={10}>
          <Stack gap={6}>
            <SideList
              title="From"
              items={[
                { label: "EOS R5 card", count: "1,204", selected: true },
                { label: "Already in the library", count: "312", depth: 1, dim: true },
                { label: "Z 6 card", count: "640" },
              ]}
            />
            <Text size="sm" tone="muted">
              Browse and cull before copying
            </Text>
          </Stack>
          <Stack gap={6}>
            <Row gap={6} wrap>
              {Array.from({ length: 14 }, (_, i) => (
                <Thumb key={i} w={50} rating={i === 3 ? 4 : 0} flag={i === 6 ? "reject" : undefined} selected={i < 2} />
              ))}
            </Row>
            <Text size="sm" tone="muted">
              892 to import · the 312 already imported are left out
            </Text>
          </Stack>
          <Stack gap={4}>
            <Field name="To" value="T7 Shield › Photos" />
            <Field name="Folders" value="{date:yyyy}/{date:yyyy-MM-dd} {text:shoot}" wrap />
            <Field name="Names" value="{date:yyyyMMdd-HHmmss.SS}-{camera|lower}" wrap />
            <Field name="Example" value="2026/2026-10-06 Acme/20261006-143012.42-canon eos r5.CR3" tone="muted" wrap />
            <Field name="Backup" value="☑ NAS › Backups" />
            <Field name="Raw only" value="☐" />
            <Field name="Preset" value="Acme · client day" />
            <Row gap={6}>
              <Button size="sm" variant="solid">
                Import 892 photos
              </Button>
            </Row>
            <Text size="sm" tone="muted">
              Then: Verified 892 of 892 · safe to erase · Eject
            </Text>
          </Stack>
        </Wireframe>
      </Region>
      <Wireframe frame="none" columns="minmax(0, 1.15fr) minmax(0, 1fr)" gap={14}>
        <Region n={2} label="Rename 412 photos" status="planned">
          <Stack gap={8}>
            <Row gap={4} align="center">
              <Chip>date:yyyyMMdd</Chip>
              <Text size="sm">-</Text>
              <Chip>text:shoot</Chip>
              <Text size="sm">-</Text>
              <Chip>sequence:4</Chip>
            </Row>
            <Table
              dense
              headers={["Now", "→ Renamed", ""]}
              rows={[
                ["DSC_0412.ARW", "20240614-lisbon-0001.ARW", ""],
                ["DSC_0412.JPG", "20240614-lisbon-0001.JPG", "with its raw"],
                ["DSC_0413.ARW", "20240614-lisbon-0002.ARW", ""],
                ["IMG_8810.CR3", "20240614-lisbon-0003-2.CR3", "name taken"],
              ]}
            />
            <Row gap={6} align="center">
              <Button size="sm" variant="solid">
                Rename
              </Button>
              <Text size="sm" tone="muted">
                Sidecars and .xmp follow · Undo
              </Text>
            </Row>
          </Stack>
        </Region>
        <Stack gap={12}>
          <Region n={3} label="Library Health" status="planned">
            <Stack gap={6}>
              <SideList
                title="Needs a decision"
                items={[
                  { label: "Duplicates", count: "14 groups" },
                  { label: "Raw and JPEG pairs: keep both ▾", count: "2,310" },
                  { label: "Damaged files", count: "3" },
                  { label: "Wrong extensions", count: "2" },
                  { label: "Missing photos", count: "18" },
                ]}
                note="The group goes away once every check is empty"
              />
              <Row gap={6}>
                <Button size="sm" variant="solid">
                  Move 14 copies to the Trash
                </Button>
                <Button size="sm" variant="outline">
                  Keep Anyway
                </Button>
              </Row>
            </Stack>
          </Region>
          <Region n={4} label="Recently Trashed" status="planned">
            <Table
              dense
              headers={["Trashed", "When", ""]}
              rows={[
                [
                  "DSC_0102.ARW and its JPEG",
                  "Today 11:20",
                  <Button key="a" size="sm" variant="ghost">
                    Put Back
                  </Button>,
                ],
                [
                  "Folder: Tests",
                  "Yesterday",
                  <Button key="b" size="sm" variant="ghost">
                    Put Back
                  </Button>,
                ],
              ]}
            />
          </Region>
        </Stack>
      </Wireframe>
    </Stack>
  );
}

// ---------------------------------------------------------------- the canvas

export default function LibraryWireframes() {
  return (
    <Wireframes
      data={data}
      drawings={{
        window: <TheWindow />,
        finding: <Finding />,
        culling: <Culling />,
        keywords: <Tagging />,
        files: <Files />,
      }}
    />
  );
}

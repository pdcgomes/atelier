import {
  Button,
  Chip,
  Grid,
  Heading,
  Placeholder,
  Region,
  Row,
  Segmented,
  SideList,
  Slider,
  Sparkline,
  Stack,
  Text,
  TextInput,
  Wireframe,
  useCanvasState,
} from "atelier";
import type { SideListItem } from "atelier";
import type { ReactNode } from "react";
import { Wireframes, type WireframesData } from "atelier/templates";

export const meta = { title: "Before / After against any state: wireframes", theme: "cursor" };

type Status = "built" | "building" | "planned" | "later" | "you";
type Note = { n: number; title: string; text: string; status: Status };

// ---------------------------------------------------------------- the data

const COMPARE_NOTES: Note[] = [
  {
    n: 1,
    title: "Snapshots",
    text: "+ or ⌘N keeps the edit as a snapshot named by the date and time; a click applies one as a History step, and its menu has Delete Snapshot.",
    status: "built",
  },
  {
    n: 2,
    title: "Original, first and fixed",
    text: "The photo with none of your edits: what the Before shows today and what Reset All applies. It can't be renamed or deleted; question 2 asks what a click on it does.",
    status: "later",
  },
  {
    n: 3,
    title: "Marked as the Before",
    text: "The row the Before came from carries a Before tag, in History as in Snapshots, so the panel says what the split compares with.",
    status: "later",
  },
  {
    n: 4,
    title: "History",
    text: "This session's steps, newest first, with the values they changed, and earlier sessions below. A click goes to a step, as now; its menu is on the next tab.",
    status: "built",
  },
  {
    n: 5,
    title: "The diagonal split",
    text: "Drag the line to uncover as much of the Before as you want, which is the slider the thread asks for; double-click centres it, and zoom and pan move both halves together.",
    status: "built",
  },
  {
    n: 6,
    title: "The Before, named",
    text: "The state's name in place of Before, with the glyph of the panel it came from: Original, a snapshot's name, a step as History names it, or Edit at 10:42 for an edit pinned with Copy After's Settings to Before.",
    status: "later",
  },
  { n: 7, title: "After", text: "The edit as it is now, labelled as it is today.", status: "built" },
  {
    n: 8,
    title: "Before / After",
    text: "The toggle (\\) and, beside it, the menu of layouts. The menu gains the snapshots and the Copy and Swap commands, drawn on the next tab.",
    status: "built",
  },
];

const CHOOSING_NOTES: Note[] = [
  {
    n: 1,
    title: "A snapshot's menu",
    text: "Compare with Current sets the Before to the snapshot and shows the comparison, or changes the Before in place if it's showing: the suggestion's Compare, named for what it compares with. On Original it's the only item.",
    status: "planned",
  },
  {
    n: 2,
    title: "Rename…",
    text: "Snapshots are named by the date and time they were made and can't be renamed, and their names now show on the photo. Not in the suggestion or the tracker.",
    status: "later",
  },
  {
    n: 3,
    title: "A History step's menu",
    text: "The same item on every step, an earlier session's included, to compare with the edit as it was yesterday. Steps have no menu today, and a click still goes to the step.",
    status: "planned",
  },
  {
    n: 4,
    title: "The Before / After menu",
    text: "Today it lists the three layouts, the one in use checked; choosing one shows Before / After in it.",
    status: "built",
  },
  {
    n: 5,
    title: "Compare with",
    text: "Original and each snapshot, the Before in use checked. A Before from History or a pin shows here too, by its name, so the menu always says what's compared.",
    status: "later",
  },
  {
    n: 6,
    title: "Copy and Swap",
    text: "Lightroom Classic's three commands and keys. Copy After's Settings to Before is the pin: the edit as it is now becomes the Before, so the split shows only what changes next. Copy Before's Settings to After applies the Before as a History step, which ⌘Z undoes; Swap does both at once.",
    status: "planned",
  },
  {
    n: 7,
    title: "The command palette",
    text: "⌘K already picks a layout, a snapshot or a History step. Compare with entries for Original and each snapshot, and the three commands, join them under Before / After.",
    status: "later",
  },
];

const data: WireframesData = {
  title: "Before / After against any state: wireframes",
  intro:
    "How the Before could show a snapshot, a History step or the edit as it was a few minutes ago, not only the original. Drawn from the suggestion on issue #552, CMP-14's plan for Before/After, and Before/After, Snapshots and History as they are in Fixer today. 9 October 2026.",
  updated: "2026-10-16T09:30:00+01:00",
  reading:
    "Boxes are regions, numbers point to the notes under each wireframe, and dashed boxes show on demand, such as a menu. The photos are placeholders, and names, values and times are made up. Every region says where it stands:",
  statuses: {
    built: { label: "Built", meaning: "In the app today, merged and tested." },
    planned: {
      label: "In the tracker",
      meaning: "Part of CMP-14, Before/After as Lightroom has it: proposed for Phase 2 and not started.",
    },
    later: {
      label: "Suggested",
      meaning: "New with the suggestion on #552 or with these wireframes: not in the tracker until it's accepted.",
    },
  },
  flow: [
    {
      title: "Compare with the original",
      text: "\\ shows the original, the photo with none of your edits, against the edit: full frame, side by side or split diagonally.",
      status: "built",
    },
    {
      title: "Choose another state",
      text: "Right-click a snapshot, Original or a History step and choose Compare with Current.",
      status: "planned",
    },
    {
      title: "See both, named",
      text: "Before and After show together, and the Before's label says which state it shows.",
      status: "later",
    },
    {
      title: "Pin where you are",
      text: "Copy After's Settings to Before keeps the edit as it is now, so the split shows only what you change next.",
      status: "planned",
    },
    {
      title: "Keep one",
      text: "Copy Before's Settings to After brings the Before back as a History step; Swap trades the two.",
      status: "planned",
    },
  ],
  principles: [
    {
      title: "Original until you choose",
      text: "Someone who never picks a Before sees what they see today: the photo with none of their edits.",
    },
    {
      title: "Chosen where the states are",
      text: "Snapshots and History steps each have Compare with Current in their own menu; the Before / After menu and ⌘K list the snapshots as well.",
    },
    {
      title: "Always named",
      text: "The Before's label says which state it shows, so a Before chosen earlier is never taken for the original.",
    },
    {
      title: "A copy of the settings",
      text: "Choosing a state copies its settings, as Lightroom's Copy Snapshot Settings to Before does: deleting the snapshot or clearing History leaves the Before as it is.",
    },
    {
      title: "Lined up and rendered once",
      text: "The engine already renders any edit as the Before, in the After's crop and geometry so the halves meet, and keeps it cached while you edit.",
    },
  ],
  questionsIntro:
    "Each changes parts that aren't built yet, or a default. Say which you'd like, or anything you'd change on the other tabs.",
  overview: {
    tables: [
      {
        title: "From the thread to the wireframes",
        headers: ["In the thread on #552", "In these wireframes"],
        rows: [
          [
            "Comparing with the original raw is of limited use; comparing with a few steps earlier, or with a snapshot, is what helps.",
            "Compare with Current on every History step and snapshot (Choosing the Before, 1 and 3).",
          ],
          [
            "A darktable-style slider, dragged to show part of the earlier state beside the current one.",
            "The diagonal split, dragged across the photo, as built (The compare view, 5); a vertical line is question 4.",
          ],
          [
            "Keep the original as the default, with a way to pin or bump the baseline.",
            "Original stays the default; Copy After's Settings to Before pins the edit as it is now (Choosing the Before, 6).",
          ],
          [
            "An Original placeholder in the snapshot list.",
            "Original, first and fixed in Snapshots (The compare view, 2); what a click on it does is question 2.",
          ],
          [
            "Compare in the snapshot list's menu: it opens the compare view, or switches the Before if it's open.",
            "Compare with Current, which does both (Choosing the Before, 1).",
          ],
          ["Compare opens the diagonal split.", "Question 1."],
          ["The Before label replaced by the snapshot's name.", "The Before's label names the state it shows (The compare view, 6)."],
        ],
      },
    ],
  },
  screens: [
    {
      id: "compare",
      name: "The compare view",
      summary:
        "The editor once Compare with Current has been chosen on a snapshot: the snapshot as the Before, split diagonally against the edit, and named on the photo.",
      drawings: [
        { id: "compare-window", notes: COMPARE_NOTES },
        {
          id: "compare-layouts",
          title: "The Before named in each layout",
          summary: "The three layouts are built and stay as they are. What's suggested is the label: it says which state the Before shows, where today it says Before.",
        },
      ],
      tables: [
        {
          title: "What the Before's label says",
          headers: ["The Before came from", "Its label", "For example"],
          rows: [
            ["Nothing chosen", "Original", "Original"],
            ["A snapshot", "The snapshot's name", "9 Oct 2026 at 10:27"],
            ["A History step", "The step, as History names it", "Exposure: 0.00 → +0.50"],
            ["A step from an earlier session", "The step and its session", "Highlights: 0 → −30, Yesterday at 18:40"],
            ["Copy After's Settings to Before", "The time it was copied", "Edit at 10:42"],
            ["Swap Before and After Settings", "The time the edit was swapped out", "Edit at 10:45"],
          ],
        },
      ],
    },
    {
      id: "choosing",
      name: "Choosing the Before",
      summary:
        "Compare with Current is in the menu of each snapshot, of Original and of each History step, and the Before / After menu and ⌘K list the same choices. Each sets the Before and shows the comparison, or changes the Before in place when it's already showing.",
      notes: CHOOSING_NOTES,
      tables: [
        {
          title: "Keys",
          headers: ["Keys", "What it does", "Status"],
          rows: [
            ["\\", "Show or hide Before / After, in the layout used last", "built"],
            ["Y, ⇧Y", "Show Before / After, then the next or previous layout", "built"],
            ["⌘N", "Create a snapshot", "built"],
            ["⌥⇧⌘→", "Copy After's Settings to Before: pin the edit as it is now", "planned"],
            ["⌥⇧⌘←", "Copy Before's Settings to After, as a History step", "planned"],
            ["⌥⇧⌘↑", "Swap Before and After Settings", "planned"],
            ["Double-click the split's line", "Centre it", "built"],
          ],
          note: "CMP-14 also lets side by side be left and right or top and bottom by choice, rather than by the photo's shape; these wireframes leave the layouts as they are.",
        },
        {
          title: "What happens when",
          headers: ["When", "The Before"],
          rows: [
            ["You choose a state while Before / After is hidden", "It's set, and Before / After shows, in the layout question 1 settles"],
            ["You choose one while it's showing", "It changes in place; the layout and the split's position stay"],
            ["You apply a snapshot, undo, or go to another step", "It stays; only the After changes"],
            ["You delete its snapshot or clear History", "It stays, with its name: it holds a copy of the settings"],
            ["You crop, rotate or straighten", "It follows: the Before always takes the After's geometry, as it does now"],
            ["You go to another photo", "It's kept or put back to Original, as question 3 settles"],
            ["You choose Original", "It's back to what it is today"],
          ],
        },
      ],
    },
    {
      id: "try",
      name: "Try it",
      summary:
        "A working model of the flow on the other tabs, to feel rather than read: choose a Before, move the split, make edits, pin the edit and swap.",
    },
  ],
  questions: [
    {
      id: "compare-layout",
      title: "What does Compare with Current open?",
      now: "\\ shows the Before in the layout used last, which starts as Full Frame: the Before alone, in place of the edit.",
      options: [
        "Diagonal Split every time, as the suggestion has it",
        "The layout in use, unless it's Full Frame; then Diagonal Split",
        "The layout in use, Full Frame included",
      ],
      lean: "B: comparing means seeing both at once, so it never opens on the Before alone, and someone who works side by side stays there.",
    },
    {
      id: "original-row",
      title: "Is Original a row in Snapshots, and what does a click on it do?",
      now: "Snapshots lists those made with + or ⌘N, and iCloud's conflicting copies; a click applies one as a History step. Original is what Reset All (⇧⌘R) applies.",
      options: [
        "A row, first and fixed, that a click applies like any snapshot: the same as Reset All, undone with ⌘Z",
        "A row, but a click compares with it instead of applying it",
        "No row: Original is chosen from the Before / After menu and ⌘K",
      ],
      lean: "A: it behaves like the rows around it, as the suggestion has it, and its menu's Compare with Current is how the Before goes back to it.",
    },
    {
      id: "before-lasts",
      title: "How long does a chosen Before last?",
      now: "The Before is always the Original, so there's nothing to keep.",
      options: [
        "While the photo is open: going to another photo puts it back to Original",
        "For each photo until Fixer quits, so going to another photo and back keeps it",
        "Saved with the edit in the sidecar, so it's there next time and on another Mac",
      ],
      lean: "B: checking a photo against its neighbours and coming back keeps the choice, the label always names it, and the sidecar format stays as it is.",
    },
    {
      id: "vertical-split",
      title: "Does the split also come vertical?",
      now: "The split runs parallel to the photo's diagonal and is dragged across it, which can uncover any part of the photo; double-click centres it.",
      options: [
        "Diagonal only, as now",
        "Vertical and horizontal splits as well, chosen in the layout menu, as Lightroom's Split modes and darktable's snapshots draw them",
      ],
      lean: "A for now: the suggestion opens on the diagonal split, and a vertical line can follow with CMP-14's left/right and top/bottom choice if it's missed.",
    },
  ],
};

// ---------------------------------------------------------------- the photo and its bar

/** Where a Before came from, as the glyph beside its row and on its label. */
const GLYPH = { original: "■", snapshot: "□", step: "○", session: "●", pin: "⌖" } as const;
type GlyphKind = keyof typeof GLYPH;

type Layout = "full" | "side" | "split";
type Shown = { glyph: GlyphKind; name: string; amount: number };

const LAYOUTS: { id: Layout; title: string; glyph: string }[] = [
  { id: "full", title: "Full Frame", glyph: "⧉" },
  { id: "side", title: "Side by Side", glyph: "◫" },
  { id: "split", title: "Diagonal Split", glyph: "◩" },
];

const clamp01 = (x: number) => Math.min(Math.max(x, 0), 1);

/** The Before's corner of the diagonal split, as an inset of the same area: 0 at the top-left corner, 1 the whole photo. */
function beforeCorner(position: number): [number, number, number, number] {
  const p = clamp01(position);
  const side = Math.sqrt(p <= 0.5 ? 2 * p * p : 1 - 2 * (1 - p) * (1 - p));
  return [0, 0, side, side];
}

/** How much of the edit a side holds, in five steps. */
function strength(amount: number): string {
  const k = Math.round(clamp01(amount) * 5);
  return "▰".repeat(k) + "▱".repeat(5 - k);
}

/** The photo in one of the three layouts, or the edit alone while Before / After is hidden. `measured` writes each side's share of the edit under it. */
function Photo({
  layout,
  showing = true,
  before,
  after,
  position = 0.5,
  measured,
}: {
  layout: Layout;
  showing?: boolean;
  before: Shown;
  after: number;
  position?: number;
  measured?: boolean;
}) {
  const name = `${GLYPH[before.glyph]} ${before.name}`;
  const m = (label: string, amount: number) => (measured ? `${label} ${strength(amount)}` : undefined);
  if (!showing) return <Placeholder ratio="3:2" caption={m("The edit", after)} />;
  if (layout === "full") {
    return (
      <Placeholder ratio="3:2" caption={m("Before", before.amount)}>
        {`Before  ${name}`}
      </Placeholder>
    );
  }
  if (layout === "side") {
    return (
      <Grid columns={2} gap={6}>
        <Placeholder ratio="3:2" caption={m("Before", before.amount)}>
          {name}
        </Placeholder>
        <Placeholder ratio="3:2" caption={m("After", after)}>
          After
        </Placeholder>
      </Grid>
    );
  }
  return (
    <Placeholder
      ratio="3:2"
      inset={beforeCorner(position)}
      badge="After"
      caption={measured ? `Before ${strength(before.amount)}  ╱  After ${strength(after)}` : "The shaded corner is the Before; the line ╱ is dragged across"}
    >
      {name}
    </Placeholder>
  );
}

/** The capsules under the photo: zoom, Before / After with its menu, the clipping and assessment toggles, and the render time. */
function CanvasBar({ layout }: { layout: Layout }) {
  const glyph = LAYOUTS.find((l) => l.id === layout)?.glyph ?? "◩";
  return (
    <Row gap={8} align="center" justify="center">
      <Segmented items={["Fit", "Fill", "1:1", "2:1"]} active="Fit" />
      <Text as="span" size="sm" tone="muted">
        38%
      </Text>
      <Chip>{`${glyph} ▾`}</Chip>
      <Text as="span" size="sm" tone="secondary">
        △ ◎ ◌
      </Text>
      <Text as="span" size="sm" tone="muted">
        8.4 ms
      </Text>
    </Row>
  );
}

// ---------------------------------------------------------------- the compare view

const CHOSEN_SNAPSHOT: Shown = { glyph: "snapshot", name: "9 Oct 2026 at 10:27", amount: 0.4 };

function TheWindow() {
  return (
    <Wireframe
      toolbar={
        <>
          <Text as="span" size="sm">
            DSCF4127.RAF
          </Text>
          <Text as="span" size="sm" tone="muted">
            Fujifilm X-T5
          </Text>
          <Text as="span" size="sm" tone="muted">
            Open Folder · Export
          </Text>
          <Segmented items={["Before / After", "Filmstrip"]} active="Before / After" />
        </>
      }
      toolbarEnd={
        <Text as="span" size="sm" tone="muted">
          Theme · Feedback
        </Text>
      }
      columns="236px minmax(0, 1fr) 176px"
    >
      <Stack gap={8}>
        <Region>
          <SideList items={[{ label: "▸ Navigator" }, { label: "▸ Folders" }, { label: "▸ Recipes" }]} />
        </Region>
        <Region n={1} label="Snapshots" status="built">
          <Stack gap={4}>
            <Region n={2} label="Original" status="later">
              <SideList items={[{ label: "■ Original" }]} />
            </Region>
            <SideList items={[{ label: "□ 8 Oct 2026 at 18:52" }]} />
            <Region n={3} label="Before tag" status="later">
              <SideList items={[{ label: "□ 9 Oct 2026 at 10:27", count: "Before" }]} />
            </Region>
          </Stack>
        </Region>
        <Region n={4} label="History" status="built">
          <SideList
            items={[
              { label: "○ Contrast", count: "0 → +20", selected: true },
              { label: "○ Shadows", count: "0 → +35" },
              { label: "○ Exposure", count: "0.00 → +0.50" },
              { label: "○ Open" },
              { label: "▸ ● Yesterday at 18:40", count: "14 steps", dim: true },
            ]}
          />
        </Region>
      </Stack>
      <Region n={5} label="The photo, split diagonally" status="built">
        <Stack gap={8}>
          <Photo layout="split" before={CHOSEN_SNAPSHOT} after={0.82} />
          <Grid columns={2} gap={8}>
            <Region n={6} label="The Before, named" status="later">
              <Chip>□ 9 Oct 2026 at 10:27</Chip>
            </Region>
            <Region n={7} label="After" status="built">
              <Chip>After</Chip>
            </Region>
          </Grid>
          <Region n={8} label="Before / After" status="built">
            <CanvasBar layout="split" />
          </Region>
        </Stack>
      </Region>
      <Region label="Develop panels" status="built">
        <Stack gap={6}>
          <Sparkline title="Histogram" values={[2, 5, 12, 11, 15, 18, 13, 9, 11, 7, 4, 2]} blocks />
          <Text size="sm" tone="muted">
            Edit · Crop · Heal · Red Eye · Masking
          </Text>
          <Heading level={3}>Basic</Heading>
          <Slider label="Exposure" value={0.5} min={-5} max={5} step={0.05} />
          <Slider label="Contrast" value={20} min={-100} max={100} />
          <Slider label="Highlights" value={-30} min={-100} max={100} />
          <Slider label="Shadows" value={35} min={-100} max={100} />
          <Slider label="Whites" value={10} min={-100} max={100} />
          <Slider label="Blacks" value={-8} min={-100} max={100} />
        </Stack>
      </Region>
    </Wireframe>
  );
}

function TheLayouts() {
  return (
    <Wireframe frame="none" columns="minmax(0, 1fr) minmax(0, 1.4fr) minmax(0, 1fr)" gap={14}>
      <Stack gap={6}>
        <Heading level={3}>Full Frame</Heading>
        <Photo layout="full" before={CHOSEN_SNAPSHOT} after={0.82} />
        <Text size="sm" tone="secondary">
          The Before replaces the edit, and the pill at the top names it.
        </Text>
      </Stack>
      <Stack gap={6}>
        <Heading level={3}>Side by Side</Heading>
        <Photo layout="side" before={CHOSEN_SNAPSHOT} after={0.82} />
        <Text size="sm" tone="secondary">
          Each pane is labelled at its top, the Before by its name.
        </Text>
      </Stack>
      <Stack gap={6}>
        <Heading level={3}>Diagonal Split</Heading>
        <Photo layout="split" before={CHOSEN_SNAPSHOT} after={0.82} position={0.42} />
        <Text size="sm" tone="secondary">
          The Before's name at the top left, After at the bottom right.
        </Text>
      </Stack>
    </Wireframe>
  );
}

// ---------------------------------------------------------------- choosing the Before

/** A menu, dashed as everything that shows on demand is. */
function Menu({ children }: { children: ReactNode }) {
  return <Region dashed>{children}</Region>;
}

function Choosing() {
  return (
    <Wireframe frame="none" columns="minmax(0, 1fr) minmax(0, 1fr)" gap={14}>
      <Region n={1} label="A snapshot's menu" status="planned">
        <Stack gap={4}>
          <SideList items={[{ label: "■ Original" }, { label: "□ 8 Oct 2026 at 18:52", selected: true }]} />
          <Menu>
            <Stack gap={4}>
              <SideList items={[{ label: "Compare with Current" }, { label: "", separator: true }]} />
              <Region n={2} label="Rename…" status="later" />
              <SideList items={[{ label: "Delete Snapshot" }]} />
            </Stack>
          </Menu>
          <SideList items={[{ label: "□ 9 Oct 2026 at 10:27", count: "Before" }]} />
          <Heading level={3}>Right-clicking Original</Heading>
          <Menu>
            <SideList items={[{ label: "Compare with Current" }]} />
          </Menu>
        </Stack>
      </Region>
      <Region n={3} label="A History step's menu" status="planned">
        <Stack gap={4}>
          <SideList
            items={[
              { label: "○ Contrast", count: "0 → +20", selected: true },
              { label: "○ Shadows", count: "0 → +35" },
              { label: "○ Exposure", count: "0.00 → +0.50" },
            ]}
          />
          <Menu>
            <SideList items={[{ label: "Compare with Current" }]} />
          </Menu>
          <SideList
            items={[
              { label: "○ Open" },
              { label: "▾ ● Yesterday at 18:40", count: "14 steps", dim: true },
              { label: "○ Highlights", count: "0 → −30", depth: 1 },
              { label: "○ Whites", count: "0 → +10", depth: 1 },
              { label: "○ Open", depth: 1 },
            ]}
          />
        </Stack>
      </Region>
      <Region n={4} label="The Before / After menu" status="built">
        <Stack gap={8}>
          <Menu>
            <Stack gap={4}>
              <SideList items={[{ label: "Full Frame" }, { label: "Side by Side" }, { label: "✓ Diagonal Split" }]} />
              <Region n={5} label="Compare with" status="later">
                <SideList items={[{ label: "■ Original" }, { label: "□ 8 Oct 2026 at 18:52" }, { label: "✓ □ 9 Oct 2026 at 10:27" }]} />
              </Region>
              <Region n={6} label="Copy and Swap" status="planned">
                <SideList
                  items={[
                    { label: "Copy After's Settings to Before", count: "⌥⇧⌘→" },
                    { label: "Copy Before's Settings to After", count: "⌥⇧⌘←" },
                    { label: "Swap Before and After Settings", count: "⌥⇧⌘↑" },
                  ]}
                />
              </Region>
            </Stack>
          </Menu>
          <CanvasBar layout="split" />
        </Stack>
      </Region>
      <Region n={7} label="The command palette" status="later">
        <Stack gap={6}>
          <TextInput value="compare▏" />
          <SideList
            items={[
              { label: "◩ Diagonal Split", count: "Before / After", selected: true },
              { label: "◫ Side by Side", count: "Before / After" },
              { label: "□ Compare with 9 Oct 2026 at 10:27", count: "Before / After" },
              { label: "■ Compare with Original", count: "Before / After" },
              { label: "Copy After's Settings to Before", count: "⌥⇧⌘→  Before / After" },
            ]}
          />
          <Text size="sm" tone="muted">
            The layouts are in the palette today; the rest is new.
          </Text>
        </Stack>
      </Region>
    </Wireframe>
  );
}

// ---------------------------------------------------------------- try it

type Source = Shown & { id: string };
type PlayStep = { id: string; title: string; value?: string; amount: number };

const PLAY_SNAPSHOTS: Source[] = [
  { id: "original", glyph: "original", name: "Original", amount: 0 },
  { id: "snap-1", glyph: "snapshot", name: "8 Oct 2026 at 18:52", amount: 0.22 },
  { id: "snap-2", glyph: "snapshot", name: "9 Oct 2026 at 10:27", amount: 0.48 },
];

const PLAY_HISTORY: PlayStep[] = [
  { id: "step-4", title: "Contrast", value: "0 → +20", amount: 0.7 },
  { id: "step-3", title: "Shadows", value: "0 → +35", amount: 0.6 },
  { id: "step-2", title: "Exposure", value: "0.00 → +0.50", amount: 0.48 },
  { id: "step-1", title: "Open", amount: 0.3 },
];

const PLAY_EDITS: { title: string; value: string; change: number }[] = [
  { title: "Clarity", value: "0 → +15", change: 0.12 },
  { title: "Highlights", value: "0 → −30", change: 0.1 },
  { title: "Exposure", value: "+0.50 → +0.30", change: -0.2 },
  { title: "Vibrance", value: "0 → +20", change: 0.1 },
  { title: "Whites", value: "0 → +10", change: 0.08 },
  { title: "Texture", value: "0 → +12", change: 0.06 },
];

const stepName = (step: PlayStep) => (step.value ? `${step.title}: ${step.value}` : step.title);

function clock(minutes: number): string {
  const m = 40 + minutes;
  return `${10 + Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
}

/** One row of Snapshots or History, pressed for its menu. */
function PlayRow({ glyph, label, value, current, isBefore, onOpen }: { glyph: GlyphKind; label: string; value?: string; current?: boolean; isBefore?: boolean; onOpen: () => void }) {
  const count = [value, isBefore ? "Before" : ""].filter(Boolean).join(" · ");
  const item: SideListItem = { label: `${GLYPH[glyph]} ${label}`, count: count || undefined, selected: current };
  return <SideList items={[item]} onSelect={onOpen} />;
}

function PlayMenu({ snapshot, onCompare }: { snapshot: boolean; onCompare: () => void }) {
  const items: SideListItem[] = snapshot
    ? [{ label: "Compare with Current" }, { label: "", separator: true }, { label: "Rename…", dim: true }, { label: "Delete Snapshot", dim: true }]
    : [{ label: "Compare with Current" }];
  return (
    <Menu>
      <SideList items={items} onSelect={(label) => label === "Compare with Current" && onCompare()} />
    </Menu>
  );
}

/** Illustrative: the flow with made-up snapshots, steps and scripted edits, following the leans on the Questions tab. */
function Playground() {
  const [steps, setSteps] = useCanvasState<PlayStep[]>("try:history", PLAY_HISTORY);
  const [before, setBefore] = useCanvasState<Source>("try:before", PLAY_SNAPSHOTS[0]);
  const [showing, setShowing] = useCanvasState("try:showing", false);
  const [layout, setLayout] = useCanvasState<Layout>("try:layout", "full");
  const [position, setPosition] = useCanvasState("try:split", 50);
  const [menu, setMenu] = useCanvasState<string | null>("try:menu", null);
  const [edits, setEdits] = useCanvasState("try:edits", 0);
  const [minutes, setMinutes] = useCanvasState("try:minutes", 2);
  const after = steps[0].amount;

  const compare = (source: Source) => {
    setBefore(source);
    setShowing(true);
    if (layout === "full") setLayout("split");
    setMenu(null);
  };
  const toggleMenu = (id: string) => setMenu((openId) => (openId === id ? null : id));
  const push = (title: string, amount: number, value?: string) => {
    setSteps((previous) => [{ id: `step-${previous.length + 1}`, title, value, amount: clamp01(amount) }, ...previous]);
    setMinutes((m) => m + 1);
  };
  const pinned = (amount: number): Source => ({ id: "pinned", glyph: "pin", name: `Edit at ${clock(minutes)}`, amount });
  const edit = () => {
    const next = PLAY_EDITS[edits % PLAY_EDITS.length];
    push(next.title, after + next.change, next.value);
    setEdits((n) => n + 1);
  };
  const swap = () => {
    setBefore(pinned(after));
    push("Swap Before and After Settings", before.amount);
  };
  const startOver = () => {
    setSteps(PLAY_HISTORY);
    setBefore(PLAY_SNAPSHOTS[0]);
    setShowing(false);
    setLayout("full");
    setPosition(50);
    setMenu(null);
    setEdits(0);
    setMinutes(2);
  };

  const status = !showing
    ? `Before / After is hidden; the Before is ${before.name}.`
    : layout === "full"
      ? `Showing the Before alone: ${before.name}.`
      : `Comparing ${before.name} with the edit as it is now, at ${stepName(steps[0])}.`;

  return (
    <Stack gap={12}>
      <Wireframe frame="none" columns="236px minmax(0, 600px)" gap={12}>
        <Stack gap={8}>
          <Region label="Snapshots">
            <Stack gap={0}>
              {PLAY_SNAPSHOTS.map((s) => (
                <Stack key={s.id} gap={2}>
                  <PlayRow glyph={s.glyph} label={s.name} isBefore={before.id === s.id} onOpen={() => toggleMenu(s.id)} />
                  {menu === s.id ? <PlayMenu snapshot={s.id !== "original"} onCompare={() => compare(s)} /> : null}
                </Stack>
              ))}
            </Stack>
          </Region>
          <Region label="History">
            <Stack gap={0}>
              {steps.map((step, i) => (
                <Stack key={step.id} gap={2}>
                  <PlayRow glyph="step" label={step.title} value={step.value} current={i === 0} isBefore={before.id === step.id} onOpen={() => toggleMenu(step.id)} />
                  {menu === step.id ? (
                    <PlayMenu snapshot={false} onCompare={() => compare({ id: step.id, glyph: "step", name: stepName(step), amount: step.amount })} />
                  ) : null}
                </Stack>
              ))}
            </Stack>
          </Region>
        </Stack>
        <Stack gap={10}>
          <Photo layout={layout} showing={showing} before={before} after={after} position={position / 100} measured />
          {showing && layout === "split" ? (
            <Row gap={8} align="center">
              <Slider label="The split" value={position} min={0} max={100} unit="%" onChange={setPosition} />
              <Button size="sm" variant="ghost" onClick={() => setPosition(50)}>
                Centre
              </Button>
            </Row>
          ) : null}
          <Row gap={6} align="center">
            <Button variant={showing ? "solid" : "outline"} kbd={"\\"} onClick={() => setShowing((s) => !s)}>
              Before / After
            </Button>
            <Segmented
              items={LAYOUTS.map((l) => l.title)}
              active={showing ? LAYOUTS.find((l) => l.id === layout)?.title : undefined}
              onChange={(title) => {
                setLayout(LAYOUTS.find((l) => l.title === title)?.id ?? "split");
                setShowing(true);
              }}
            />
          </Row>
          <Row gap={6} wrap>
            <Button variant="solid" onClick={edit}>
              Make an edit
            </Button>
            <Button variant="outline" onClick={() => setBefore(pinned(after))}>
              Copy After's Settings to Before
            </Button>
            <Button variant="outline" onClick={() => push("Copy Before's Settings to After", before.amount)}>
              Copy Before's Settings to After
            </Button>
            <Button variant="outline" onClick={swap}>
              Swap
            </Button>
            <Button variant="ghost" onClick={startOver}>
              Start over
            </Button>
          </Row>
          <Text size="sm" tone="secondary">
            {status}
          </Text>
        </Stack>
      </Wireframe>
      <Text size="sm" tone="muted">
        Illustrative. Click a row for its menu; in the app a right-click opens it, and a click applies a snapshot or goes to a step. The slider moves the split, as dragging across the photo does, and Centre puts it back, as a double-click on the line does. Compare with Current opens Diagonal Split when the layout is Full Frame, as question 1 leans. The photo is a placeholder: the bars under it show how much of the edit each side holds, and the edits are scripted.
      </Text>
    </Stack>
  );
}

// ---------------------------------------------------------------- the canvas

export default function BeforeAfterWireframes() {
  return (
    <Wireframes
      data={data}
      drawings={{
        "compare-window": <TheWindow />,
        "compare-layouts": <TheLayouts />,
        choosing: <Choosing />,
        try: <Playground />,
      }}
    />
  );
}

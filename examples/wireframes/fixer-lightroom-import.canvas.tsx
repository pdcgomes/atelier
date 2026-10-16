import { Button, Chip, Grid, Meter, Panel, Region, Row, Sparkline, Stack, Tabs, Text, Wireframe, useEffect, useState } from "atelier";
import { Wireframes, type WireframesData } from "atelier/templates";
import type { ReactNode } from "react";

export const meta = { title: "Import from Lightroom Classic: wireframes", theme: "cursor" };

type Note = { n: number; title: string; text: string; status: "built" | "building" | "planned" | "later" | "you" };

// ---------------------------------------------------------------- the data

const FOUND_NOTES: Note[] = [
  {
    n: 1,
    title: "The catalog",
    text: "Lightroom Classic's catalog where Lightroom keeps it (its preferences' recent catalogs, then ~/Pictures/Lightroom), with its photos, folders and when it was last opened; Choose… for another or a copy. Review… goes on to Review. It's read from a copy, never changed.",
    status: "building",
  },
  { n: 2, title: "Presets", text: "Camera Raw's Settings folder: presets and their groups, imported as recipes as Lightroom › Recipes does today (RCP-14), on their own.", status: "building" },
  { n: 3, title: "Profiles", text: "The photographer's Adobe camera and lens profiles: used on this Mac only, never copied or shipped (DSN-44, CNV-18, OPT-09).", status: "building" },
  { n: 4, title: "What each has done", text: "Once a card is imported it says what came across, so the window works as a checklist for moving from Lightroom.", status: "planned" },
];

const REVIEW_NOTES: Note[] = [
  { n: 1, title: "Headline counts", text: "Photos found of the catalog's, those that change, folders to add first and photos not found; today these are lines of the report's text (LightroomReport).", status: "planned" },
  { n: 2, title: "Root folders", text: "Each root with where it is now and its state, Locate… for one that moved and Allow Access… for one the App Sandbox can't read, the disk's name and kind beside it.", status: "built" },
  { n: 3, title: "What comes across", text: "A bar per field Lightroom gives, its first, stronger part replacing a value the library has: what the report's \"coming across\" lines say, read at a glance.", status: "planned" },
  { n: 4, title: "Edits", text: "Step 9's Edits section as one bar: edits that convert fully, with approximations, and with settings left out, each reason with its count beneath.", status: "building" },
  { n: 5, title: "What stays behind", text: "Virtual copies, stacks, map places and Lightroom's own collections, each with why, as the report's \"not coming across\".", status: "planned" },
  { n: 6, title: "Import", text: "Names what it does: Import 48,212 Photos, adding 2 folders first. Lightroom's value replaces the library's where it has one; Undo Import takes it all back.", status: "built" },
];

const IMPORTING_NOTES: Note[] = [
  { n: 1, title: "Stages", text: "Read the catalog, add and index the folders the library lacks, write each photo once, done: each with its time once done. Today a sentence says which.", status: "planned" },
  {
    n: 2,
    title: "How far, how fast, how long",
    text: "Photos done of total; the bar split into the import's parts of 10,000, since Stop ends at the end of a part; the rate and time left from the last minute, shown once steady; time so far.",
    status: "planned",
  },
  { n: 3, title: "Throughput", text: "Photos a second over the last ten minutes, a pause shaded and named: a stalled import looks stalled, a slow one steady.", status: "planned" },
  { n: 4, title: "Done, now, next", text: "What's finished, the part and folder being written, and what's left, so the whole import reads in one line each.", status: "planned" },
  { n: 5, title: "Folders", text: "Each root folder with its own small bar, done, under way or waiting, on its disk.", status: "planned" },
  { n: 6, title: "Why it's slow or paused", text: "Low Power Mode or heat pausing the indexing, and photos on a spinning disk read and written one file at a time, in folder order (IMP-28).", status: "planned" },
  { n: 7, title: "Details", text: "The log, closed: its last line shows. Opened on the Details tab.", status: "planned" },
  { n: 8, title: "Stop", text: "Ends after the part being written, as today; closing the window lets the import carry on.", status: "built" },
];

const RESULT_NOTES: Note[] = [
  { n: 1, title: "Done", text: "What came across, field by field, the time it took, and the sidecars that couldn't be written with why; Undo Import, as today.", status: "planned" },
  { n: 2, title: "Stopped", text: "How many parts were written and what Import Again brings; Undo Import takes back what was written.", status: "planned" },
  { n: 3, title: "Failed", text: "Why in words (a disk disconnected, the library closed), what was kept, and both ways on; today the error's own text.", status: "planned" },
  { n: 4, title: "Taken back", text: "The import undone, each photo as it was, with Import to start again.", status: "planned" },
];

const DETAILS_NOTES: Note[] = [
  {
    n: 1,
    title: "The log",
    text: "Each stage's start and end with its count and time, pauses and why, parts written, problems; Copy for a report or a bug, Report Text for the report's lines as the CLI prints them (today's text view).",
    status: "planned",
  },
];

const data: WireframesData = {
  title: "Import from Lightroom Classic: wireframes",
  intro:
    "How File › Import from Lightroom Classic… looks and works once it's built around its progress: drawn from the window on main (IMP-12, a71c3e58b), step 9's Edits section and one write per photo (CNV-08, cnv-08/catalog-edits), CNV-19's first screen, and IMP-27 and IMP-28. 16 October 2026; approved by the owner the same day, each question answered with its lean.",
  updated: "2026-10-16T09:40:00+01:00",
  reading: "Boxes are regions, numbers point to the notes under each wireframe, and counts, folders and times are made up. Every region says where it stands:",
  statuses: {
    built: { label: "Built", meaning: "Merged and tested; it shows in the app." },
    building: { label: "Being built", meaning: "An agent is building it now." },
    planned: { label: "Planned", meaning: "In the tracker for this release; its engine may exist without its panel." },
    later: { label: "Later, or waits on you", meaning: "After this release, or waiting on a measurement or a decision of yours." },
  },
  flow: [
    { title: "See what's on the Mac", text: "The window opens on what it found: the catalog, Camera Raw's presets and the Adobe profiles, each imported on its own.", status: "building" },
    { title: "Review what comes across", text: "Headline counts, the root folders and where each is, each field as a bar, the edits, and what stays behind, before anything is written.", status: "planned" },
    { title: "Watch it import", text: "Which stage it's in, how far along, how fast and how long is left, what's done, what's now and what's next, and why when it's slow or paused.", status: "planned" },
    { title: "See what was done, or take it back", text: "What came across and what didn't, with Undo Import; a stopped or failed import says what it kept.", status: "planned" },
  ],
  principles: [
    { title: "Where it is, at a glance", text: "A rail of stages and one bar answer what's happening and how far along it is, before any number is read." },
    { title: "How long, honestly", text: "Rate and time left come from the last minute of work, appear once they're steady, and give way to Paused when nothing moves." },
    { title: "Why, when it's slow or stopped", text: "The window says when Low Power Mode or heat pauses work, and when the photos are on a spinning disk, and what that means." },
    { title: "Charts only where they answer something", text: "What comes across as bars, the import's parts in its bar, throughput over time; nothing decorative." },
    { title: "Detail on demand", text: "A timestamped log one click away, copied in one go for a report, for whoever wants to know what happened." },
  ],
  screens: [
    {
      id: "found",
      name: "Found",
      title: "What's on this Mac",
      summary: "The window's first screen (CNV-19): what Fixer found of Lightroom's, each imported on its own. CNV-19's agent builds it to this drawing once approved, with the components the other tabs use.",
      notes: FOUND_NOTES,
    },
    {
      id: "review",
      name: "Review",
      title: "Review what comes across",
      summary: "After the catalog is read and before anything is written: the report as a picture, its text in Details.",
      notes: REVIEW_NOTES,
    },
    {
      id: "importing",
      name: "Importing",
      title: "Watch it import",
      summary: 'The screen while the import runs: the answer to "where is it, how long is left, and why so slow?" without reading the log.',
      notes: IMPORTING_NOTES,
      tables: [
        {
          title: "Time left",
          headers: ["When", "What shows", "Status"],
          rows: [
            ["The first 10 seconds of a stage, or before 1% of it", "The rate and time left are left out; the bar and counts show", "Planned"],
            ["Steady", '"42 a second · about 12 minutes left", from the last minute\'s rate, rounded: less than a minute, minutes, then hours and minutes', "Planned"],
            ["Nothing done for 10 seconds while the Mac pauses work", '"Paused" and why, in place of the rate and time left', "Planned"],
            ["Stop pressed", '"Stopping after this part" with the part\'s own count', "Built"],
          ],
        },
      ],
    },
    {
      id: "result",
      name: "Result",
      title: "See what was done, or take it back",
      summary: "The four ways an import ends, each saying what the library now holds and what can be done next.",
      notes: RESULT_NOTES,
    },
    {
      id: "details",
      name: "Details",
      title: "Details and notices",
      summary: "The log behind the picture, and the notices that say why work is slow or paused.",
      notes: DETAILS_NOTES,
      notesColumns: 1,
      tables: [
        {
          title: "Notices",
          headers: ["When", "What it says", "Status"],
          rows: [
            ["Indexing paused by Low Power Mode", "Paused: Low Power Mode is on. Plug in or turn it off in System Settings › Battery, and the import carries on.", "Planned"],
            ["Indexing paused by heat", "Paused while the Mac cools down; the import carries on by itself.", "Planned"],
            ["Photos on a spinning disk", "Photos on LaCie, a spinning disk: Fixer reads and writes one file at a time, in folder order, which is quickest for it.", "Planned"],
            ["A root folder's disk disconnected", "LaCie was disconnected: connect it and Import Again brings the rest.", "Planned"],
            ["Sidecars that can't be written", "3 sidecars couldn't be written: the folder is read-only (Show).", "Built"],
          ],
        },
      ],
    },
    {
      id: "playground",
      name: "Playground",
      summary:
        "An illustrative import of 48,212 photos, 12,400 of them in folders the library doesn't have yet, half a minute a tick. The rates are made up until IMP-28 measures them; they show how the screen behaves, not how fast Fixer is.",
    },
  ],
  questionsIntro: "Each changes parts that aren't built yet, or a default. Say which you'd like, or anything you'd change on the other tabs.",
  questions: [
    {
      id: "progress-closed",
      title: "Where does progress show once the window is closed?",
      now: "Closing the window lets the import carry on, and nothing shows it until the window is opened again.",
      options: [
        "Nowhere until it ends, then a notification",
        "The library toolbar's activity, as moving files shows there, with a click that opens the window",
        "The Dock icon's progress bar",
      ],
      lean: "B: the toolbar already shows the library's long work, and it's where a photographer looks while they keep culling.",
      answer: "Approved (16 October): the library toolbar's activity, with a click that opens the window.",
    },
    {
      id: "review-estimate",
      title: "Does the Review screen estimate how long the import will take?",
      now: "No estimate is given before or during the import.",
      options: ["No estimate until it's running, then the time left from what's measured", "An estimate on Review from the photo count and the disk's kind"],
      lean: "A for now, and B once IMP-28's measurements give a model for each kind of disk that holds up.",
      answer: "Approved (16 October): no estimate until it's running; one on Review once IMP-28's measurements give a model that holds up.",
    },
    {
      id: "indexing-stage",
      title: "Is indexing the new folders a stage of its own?",
      now: 'The status line says "Adding the catalog\'s folders: N of M photos indexed…" with the same bar as the import.',
      options: ["A stage of its own on the rail, with its own rate and time left", "Folded into one Preparing stage before writing"],
      lean: "A: on a slow disk it can be the longest part, and it's the part that pauses in Low Power Mode.",
      answer: "Approved (16 October): a stage of its own, with its own rate and time left.",
    },
    {
      id: "throughput-chart",
      title: "Does the throughput chart earn its place?",
      now: "Nothing shows the speed.",
      options: ["A small chart of photos a second over the last ten minutes, pauses marked", "Only the rate as a number"],
      lean: "A: it tells a stalled import from a slow, steady one at a glance, which is what the photographer who waited hours couldn't see.",
      answer: "Approved (16 October): a small chart of photos a second over the last ten minutes, pauses marked.",
    },
    {
      id: "log-open",
      title: "Does the log start open or closed?",
      now: "The report is always shown as text; there's no log.",
      options: ["Closed, remembering how it was left", "Open"],
      lean: "A: most people want the picture, and those who open it once get it open from then on.",
      answer: "Approved (16 October): closed, remembering how it was left.",
    },
    {
      id: "show-imported",
      title: "What does Show Imported Photos open, once the import ends?",
      now: "Nothing: the library has no source that lists a set of photos (step 9 notes the same for the Edits section's Show Photos).",
      options: ["Leave it out until the library has such a source", 'A collection the import makes, "From Lightroom Classic, 16 October"', "A search for the photos changed today"],
      lean: "A: a collection the user didn't ask for would need tidying, and a search would catch other changes.",
      answer: "Approved (16 October): left out until the library has a source that lists a set of photos.",
    },
  ],
};

// ---------------------------------------------------------------- parts the screens share

const count = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

function WindowTitle() {
  return (
    <Text as="span" size="sm" weight="medium" tone="secondary">
      Import from Lightroom Classic
    </Text>
  );
}

/** What's in it, stacked `by` pixels apart and lowered by as much: level with a taller neighbour in its row, or further from a region's head. */
function Lower({ by, children }: { by: number; children: ReactNode }) {
  return (
    <Stack gap={by}>
      <Stack />
      {children}
    </Stack>
  );
}

/** A full-width line under a window's regions: what it says on the left, its numbered action on the right. */
function Foot({ text, children }: { text: string; children: ReactNode }) {
  return (
    <Row gap={8} justify="between">
      <Text size="sm" tone="muted">
        {text}
      </Text>
      {children}
    </Row>
  );
}

type Stage = { label: string; detail: string; state: "done" | "now" | "next" };

/** The import's stages, left to right, each done, under way or to come. */
function Stages({ stages }: { stages: Stage[] }) {
  return (
    <Grid columns={`repeat(${stages.length}, minmax(0, 1fr))`} gap={6}>
      {stages.map((s) => (
        <Stack key={s.label} gap={3}>
          <Meter value={s.state === "next" ? 0 : 100} tone="default" show="none" height={3} segments={s.state === "now" ? [{ value: 100, shade: 0.44 }] : undefined} />
          <Row gap={5} wrap={false}>
            <Text size="xs" tone="muted">
              {s.state === "done" ? "✓" : s.state === "now" ? "●" : "○"}
            </Text>
            <Text size="sm" weight={s.state === "now" ? "medium" : "normal"} tone={s.state === "next" ? "muted" : "default"}>
              {s.label}
            </Text>
          </Row>
          <Text size="xs" tone="muted" truncate>
            {s.detail}
          </Text>
        </Stack>
      ))}
    </Grid>
  );
}

/** A bar of `done` out of 1, in `parts` parts side by side: the import's parts of 10,000. */
function Parts({ done, parts }: { done: number; parts: number }) {
  return (
    <Grid columns={parts} gap={2}>
      {Array.from({ length: parts }, (_, i) => (
        <Meter key={i} value={Math.max(0, Math.min(1, done * parts - i)) * 100} show="none" height={8} />
      ))}
    </Grid>
  );
}

/** Photos a second over time, the newest last, with the scale's top and bottom beside it, a pause shaded, and what it shows under it. */
function Throughput({ points, paused, caption }: { points: number[]; paused?: [number, number]; caption: string }) {
  const top = Math.max(1, ...points) * 1.15;
  return (
    <Stack gap={3}>
      <Grid columns="26px minmax(0, 1fr)" gap={4}>
        <Stack gap={10}>
          <Row justify="end">
            <Text size="xs" tone="muted">
              {String(Math.round(top))}
            </Text>
          </Row>
          <Row justify="end">
            <Text size="xs" tone="muted">
              0
            </Text>
          </Row>
        </Stack>
        <Sparkline title="Photos a second" values={points} tone="default" width="100%" height={46} min={0} max={top} shade={paused} />
      </Grid>
      <Grid columns="26px minmax(0, 1fr)" gap={4}>
        <Stack />
        <Text size="xs" tone="muted">
          {caption}
        </Text>
      </Grid>
    </Stack>
  );
}

/** How far the write is: photos done of all of them, the import's parts, then how fast and how long. */
function Progress({ value, of, percent, done, parts, children }: { value: string; of: string; percent: string; done: number; parts: number; children: ReactNode }) {
  return (
    <Stack gap={6}>
      <Row justify="between" align="start">
        <Lower by={2}>
          <Row gap={8} align="end">
            <Text size="lg">{value}</Text>
            <Text size="sm" tone="muted">
              {of}
            </Text>
          </Row>
        </Lower>
        <Text size="lg">{percent}</Text>
      </Row>
      <Parts done={done} parts={parts} />
      <Row gap={12}>{children}</Row>
    </Stack>
  );
}

// ---------------------------------------------------------------- Found (CNV-19)

/** What Fixer found of one kind: how many, what they are, where, and what can be done with them. */
function Find({ total, what, where, children }: { total: string; what: string; where: string; children: ReactNode }) {
  return (
    <Stack gap={10}>
      <Stack gap={4}>
        <Text size="lg">{total}</Text>
        <Text size="sm" tone="secondary">
          {what}
        </Text>
        <Text size="sm" tone="muted">
          {where}
        </Text>
      </Stack>
      <Row gap={6}>{children}</Row>
    </Stack>
  );
}

function Found() {
  return (
    <Wireframe toolbar={<WindowTitle />} gap={12} padding={12}>
      <Wireframe frame="none" columns="repeat(3, minmax(0, 1fr))" gap={10}>
        <Region n={1} label="Catalog" status="building">
          <Find total="51,030" what="photos in 6 root folders" where="Lightroom Catalog.lrcat · ~/Pictures/Lightroom · opened 12 October">
            <Button variant="solid">Review…</Button>
            <Button>Choose…</Button>
          </Find>
        </Region>
        <Region n={2} label="Presets" status="building">
          <Find total="214" what="presets in 18 groups" where="Camera Raw's Settings folder">
            <Button>Import Presets</Button>
          </Find>
        </Region>
        <Region n={3} label="Profiles" status="building">
          <Find total="143" what="31 camera profiles for your 4 cameras, 112 lens profiles" where="Used on this Mac only">
            <Button>Use Profiles</Button>
          </Find>
        </Region>
      </Wireframe>
      <Region n={4} label="Done" status="planned" dashed>
        <Text size="sm" tone="secondary">
          Presets: 214 imported into Recipes › Lightroom, 16 October
        </Text>
      </Region>
    </Wireframe>
  );
}

// ---------------------------------------------------------------- Review

const GLANCE: [string, string][] = [
  ["48,212", "photos found, of 51,030"],
  ["31,400", "change in the library"],
  ["2 folders", "added first, 12,400 photos"],
  ["2,818", "not found where Lightroom had them"],
];

const ROOTS: [string, string, string?][] = [
  ["/Volumes/LaCie/Photos 2018", "In the library: 9,812 of 9,812 found"],
  ["/Volumes/LaCie/Photos 2019", "Added first: 12,400 photos"],
  ["~/Pictures/2020 to 2024", "In the library: 26,000 of 26,102 found"],
  ["/Volumes/Archive/Scans → /Volumes/Archive 2", "Moved: found where you said", "Locate…"],
  ["/Volumes/Old Drive/Travel", "On a disk that isn't connected", "Locate…"],
];

const FIELDS: { name: string; total: number; replacing?: number }[] = [
  { name: "Ratings", total: 31204, replacing: 2100 },
  { name: "Picks, rejects", total: 4590, replacing: 120 },
  { name: "Labels", total: 6900, replacing: 410 },
  { name: "Keywords", total: 21030 },
  { name: "Collections", total: 14200 },
  { name: "Titles, captions", total: 2330, replacing: 64 },
  { name: "Locations", total: 3050, replacing: 12 },
];

const MOST = Math.max(...FIELDS.map((f) => f.total));

/** A field's bar: its photos, the part that replaces a value the library has drawn stronger. */
function FieldBar({ name, total, replacing = 0 }: { name: string; total: number; replacing?: number }) {
  return (
    <Grid columns="88px minmax(0, 1fr) 132px" gap={8}>
      <Row justify="end">
        <Text size="sm" tone="secondary">
          {name}
        </Text>
      </Row>
      <Lower by={5.5}>
        <Meter
          value={total}
          max={MOST}
          show="none"
          height={7}
          segments={[
            { value: replacing, tone: "default", label: `${count(replacing)} replace` },
            { value: total - replacing, shade: 0.25, label: `${count(total - replacing)} new` },
          ]}
        />
      </Lower>
      <Text size="sm" tone="muted" tabular>
        {`${count(total)}${replacing ? ` · ${count(replacing)} replace` : ""}`}
      </Text>
    </Grid>
  );
}

function Review() {
  return (
    <Wireframe toolbar={<WindowTitle />} toolbarEnd={<Chip>Lightroom Catalog · read in 2.4 s</Chip>} gap={0} padding={0}>
      <Wireframe frame="none" padding={12}>
        <Region n={1} label="At a glance" status="planned">
          <Grid columns="repeat(4, minmax(0, 1fr))" gap={10}>
            {GLANCE.map(([value, label]) => (
              <Stack key={label} gap={2}>
                <Text size="lg">{value}</Text>
                <Text size="sm" tone="muted">
                  {label}
                </Text>
              </Stack>
            ))}
          </Grid>
        </Region>
        <Region n={2} label="Root folders" status="built">
          <Stack gap={6}>
            <Stack gap={4}>
              {ROOTS.map(([path, state, action]) => (
                <Grid key={path} columns="minmax(0, 1fr) 210px 92px" gap={10}>
                  <Lower by={action ? 3 : 0}>
                    <Text size="sm" tone="secondary" truncate>
                      {path}
                    </Text>
                  </Lower>
                  <Lower by={action ? 3 : 0}>
                    <Text size="sm" tone="muted">
                      {state}
                    </Text>
                  </Lower>
                  {action ? (
                    <Row>
                      <Button>{action}</Button>
                    </Row>
                  ) : null}
                </Grid>
              ))}
            </Stack>
            <Text size="sm" tone="muted">
              LaCie: external, spinning disk · Archive 2: external SSD
            </Text>
          </Stack>
        </Region>
        <Wireframe frame="none" columns="minmax(0, 1.4fr) minmax(0, 1fr)" gap={10}>
          <Region n={3} label="What comes across" status="planned">
            <Stack gap={4}>
              {FIELDS.map((f) => (
                <FieldBar key={f.name} {...f} />
              ))}
              <Text size="sm" tone="muted">
                4,812 keywords with their hierarchy and synonyms; 86 collections in 12 sets; 9 of 11 smart collections
              </Text>
            </Stack>
          </Region>
          <Stack gap={10}>
            <Region n={4} label="Edits" status="building">
              <Stack gap={4}>
                <Meter
                  value={35200}
                  max={35200}
                  show="none"
                  height={8}
                  segments={[
                    { value: 22100, shade: 0.55, label: "22,100 fully" },
                    { value: 9800, shade: 0.3, label: "9,800 approximated" },
                    { value: 3300, shade: 0.12, label: "3,300 with settings left out" },
                  ]}
                />
                <Text size="sm" tone="muted">
                  22,100 fully · 9,800 approximated · 3,300 with settings left out (masks 2,900, Lens Blur 140, …)
                </Text>
              </Stack>
            </Region>
            <Region n={5} label="Stays behind" status="planned">
              <Stack gap={2}>
                <Text size="sm" tone="secondary">
                  1,204 virtual copies
                </Text>
                <Text size="sm" tone="secondary">
                  312 stacks · 880 map places
                </Text>
                <Text size="sm" tone="muted">
                  Why, for each, in Details
                </Text>
              </Stack>
            </Region>
          </Stack>
        </Wireframe>
      </Wireframe>
      <Wireframe frame="none" padding="9px 10px 8px">
        <Foot text="Lightroom's value replaces the library's where it has one. Undo Import takes it all back.">
          <Region n={6} status="built" padding={3}>
            <Button variant="solid">Import 48,212 Photos</Button>
          </Region>
        </Foot>
      </Wireframe>
    </Wireframe>
  );
}

// ---------------------------------------------------------------- Importing

const SPEED = [0, 31, 40, 43, 41, 44, 42, 39, 42, 44, 43, 41, 42, 2, 0, 0, 1, 38, 42, 43, 41, 42, 44, 42];

const STEPS: [string, string, string][] = [
  ["Done", "Part 1: 10,000 photos", "Keyword list and collections defined"],
  ["Now", "Part 2: 8,240 of 10,000", "In LaCie › Photos 2019"],
  ["Next", "Parts 3 to 5: 28,212 photos", "In 3 folders, then the library's lists"],
];

const FOLDERS: [string, number, string][] = [
  ["LaCie › Photos 2018", 1, "9,812 ✓"],
  ["LaCie › Photos 2019", 0.67, "8,240 of 12,300"],
  ["Pictures › 2020 to 2024", 0, "26,000 waiting"],
];

function ImportingWindow({ paused }: { paused: boolean }) {
  return (
    <Wireframe toolbar={<WindowTitle />} toolbarEnd={<Chip>Lightroom Catalog</Chip>} gap={0} padding={0}>
      <Wireframe frame="none" padding={12}>
        <Region n={1} label="Stages" status="planned">
          <Stages
            stages={[
              { label: "Read the catalog", detail: "2.4 s", state: "done" },
              { label: "Add 2 folders", detail: "12,400 photos indexed in 11 min", state: "done" },
              { label: "Write", detail: "18,240 of 48,212 photos", state: "now" },
              { label: "Done", detail: "about 12 minutes", state: "next" },
            ]}
          />
        </Region>
        <Wireframe frame="none" columns="minmax(0, 1.5fr) minmax(0, 1fr)" gap={10}>
          <Region n={2} label="Writing Lightroom's fields" status="planned">
            <Progress value="18,240" of="of 48,212 photos · part 2 of 5" percent="38%" done={0.378} parts={5}>
              <Text size="sm" tone="secondary">
                {paused ? "Paused" : "42 a second"}
              </Text>
              <Text size="sm" tone="secondary">
                {paused ? "Low Power Mode is on" : "about 12 minutes left"}
              </Text>
              <Text size="sm" tone="muted">
                7 min 12 s so far
              </Text>
            </Progress>
          </Region>
          <Region n={3} label="Photos a second" status="planned">
            <Throughput points={SPEED} paused={[13, 16]} caption="Last 10 minutes · shaded: paused, Low Power Mode" />
          </Region>
        </Wireframe>
        <Region n={4} label="Done · now · next" status="planned">
          <Grid columns="repeat(3, minmax(0, 1fr))" gap={10}>
            {STEPS.map(([title, what, where]) => (
              <Stack key={title} gap={2}>
                <Text size="sm" weight="medium" tone="secondary">
                  {title}
                </Text>
                <Text size="sm" tone="secondary">
                  {what}
                </Text>
                <Text size="sm" tone="muted">
                  {where}
                </Text>
              </Stack>
            ))}
          </Grid>
        </Region>
        <Wireframe frame="none" columns="minmax(0, 1.5fr) minmax(0, 1fr)" gap={10}>
          <Region n={5} label="Folders" status="planned">
            <Stack gap={4}>
              {FOLDERS.map(([name, done, label]) => (
                <Grid key={name} columns="minmax(0, 1fr) 90px 104px" gap={10}>
                  <Text size="sm" tone="secondary" truncate>
                    {name}
                  </Text>
                  <Lower by={7}>
                    <Meter value={done * 100} show="none" height={4} />
                  </Lower>
                  <Text size="sm" tone="muted">
                    {label}
                  </Text>
                </Grid>
              ))}
            </Stack>
          </Region>
          <Region n={6} label="Notice" status="planned">
            <Text size="sm" tone="secondary">
              {paused
                ? "Paused: Low Power Mode is on. Plug in or turn it off in System Settings › Battery, and the import carries on."
                : "Photos on LaCie, a spinning disk: Fixer reads and writes one file at a time, in folder order, which is quickest for it."}
            </Text>
          </Region>
        </Wireframe>
        <Region n={7} label="Details" status="planned" dashed>
          <Text size="sm" tone="muted">
            › 10:41:12 Part 1 of 5 written: 10,000 photos in 3 min 58 s
          </Text>
        </Region>
      </Wireframe>
      <Wireframe frame="none" padding="8px 10px">
        <Foot text="You can close this window: the import carries on.">
          <Region n={8} status="built" padding={3}>
            <Button>Stop</Button>
          </Region>
        </Foot>
      </Wireframe>
    </Wireframe>
  );
}

function Importing() {
  return (
    <Tabs
      stateKey="importing-state"
      tabs={[
        { id: "running", label: "Running on a spinning disk", content: <ImportingWindow paused={false} /> },
        { id: "paused", label: "Paused by Low Power Mode", content: <ImportingWindow paused /> },
      ]}
    />
  );
}

// ---------------------------------------------------------------- Result

const ENDS: { n: number; label: string; title: string; lines: string[]; buttons: string[] }[] = [
  {
    n: 1,
    label: "Done",
    title: "Imported 48,212 photos from “Lightroom Catalog” in 41 minutes",
    lines: ["✓ 31,204 ratings, 4,590 picks and rejects, 6,900 labels", "✓ 21,030 photos' keywords, 14,200 in collections", "✓ 31,900 edits, 3,300 with settings left out", "3 sidecars couldn't be written: the folder is read-only"],
    buttons: ["Undo Import", "Done"],
  },
  {
    n: 2,
    label: "Stopped",
    title: "Stopped after part 3 of 5: 30,000 of 48,212 photos",
    lines: ["The other 18,212 aren't changed.", "Import Again brings them; Undo Import takes back the 30,000."],
    buttons: ["Undo Import", "Import Again"],
  },
  {
    n: 3,
    label: "Failed",
    title: "The import stopped in part 4: LaCie was disconnected",
    lines: ["The 30,000 photos written before are kept.", "Connect LaCie and Import Again, or Undo Import."],
    buttons: ["Undo Import", "Import Again"],
  },
  { n: 4, label: "Taken back", title: "The import is taken back: 48,212 photos as they were", lines: ["Edits made since in Fixer are kept."], buttons: ["Import"] },
];

function Result() {
  return (
    <Wireframe frame="none" columns="repeat(2, minmax(0, 1fr))" gap={10}>
      {ENDS.map((end) => (
        <Region key={end.n} n={end.n} label={end.label} status="planned" grow>
          <Lower by={6}>
            <Text weight="medium">{end.title}</Text>
            <Stack gap={2}>
              {end.lines.map((line) => (
                <Text key={line} size="sm" tone="secondary">
                  {line}
                </Text>
              ))}
            </Stack>
            <Row gap={6}>
              {end.buttons.map((label, i) => (
                <Button key={label} variant={i === end.buttons.length - 1 ? "solid" : "outline"}>
                  {label}
                </Button>
              ))}
            </Row>
          </Lower>
        </Region>
      ))}
    </Wireframe>
  );
}

// ---------------------------------------------------------------- Details and notices

const LOG: [string, string][] = [
  ["10:22:02", "Read “Lightroom Catalog” (Lightroom Classic 13): 51,030 photos, 6 root folders, in 2.4 s"],
  ["10:22:05", "Added 2 folders to Folders: LaCie › Photos 2019, LaCie › Photos 2019 Scans"],
  ["10:24:40", "Paused: Low Power Mode is on"],
  ["10:25:52", "Carried on: Low Power Mode is off"],
  ["10:33:10", "Indexed 12,400 photos in 11 min 5 s, 19 a second, on LaCie (spinning disk)"],
  ["10:33:12", "Found 48,212 of the catalog's photos; 2,818 not found (the first 20 listed below)"],
  ["10:37:10", "Part 1 of 5 written: 10,000 photos in 3 min 58 s; keyword list and collections defined"],
  ["10:41:12", "Part 2 of 5 written: 10,000 photos in 4 min 2 s"],
  ["10:41:13", "3 sidecars couldn't be written: /Volumes/LaCie/Photos 2019/Locked is read-only"],
];

function Details() {
  return (
    <Region n={1} label="Details, opened" status="planned">
      <Stack gap={8}>
        <Stack gap={2}>
          {LOG.map(([time, text]) => (
            <Grid key={time + text} columns="62px minmax(0, 1fr)" gap={8}>
              <Text size="sm" tone="muted">
                {time}
              </Text>
              <Text size="sm" tone="secondary">
                {text}
              </Text>
            </Grid>
          ))}
        </Stack>
        <Row gap={6}>
          <Button>Copy</Button>
          <Button>Report Text</Button>
        </Row>
      </Stack>
    </Region>
  );
}

// ---------------------------------------------------------------- Playground

const DISKS: Record<string, { label: string; index: number; write: number }> = {
  ssd: { label: "Internal SSD", index: 900, write: 520 },
  external: { label: "External SSD", index: 420, write: 300 },
  spinning: { label: "2.5-inch spinning disk", index: 19, write: 42 },
};

const TO_INDEX = 12400;
const TO_WRITE = 48212;
const SECONDS_A_TICK = 30;

const minutes = (s: number) => (s < 60 ? "less than a minute" : s < 3600 ? `about ${Math.round(s / 60)} minutes` : `about ${Math.floor(s / 3600)} h ${Math.round((s % 3600) / 60)} min`);

/** Illustrative: an import on the disk chosen, with Low Power Mode pausing the indexing, half a minute a tick. */
function Playground() {
  const [disk, setDisk] = useState("spinning");
  const [lowPower, setLowPower] = useState(false);
  const [running, setRunning] = useState(false);
  const [time, setTime] = useState(0);
  const [indexed, setIndexed] = useState(0);
  const [written, setWritten] = useState(0);
  const [rates, setRates] = useState<number[]>([]);
  const speed = DISKS[disk];
  const indexing = indexed < TO_INDEX;
  const finished = written >= TO_WRITE;
  useEffect(() => {
    if (!running || finished) return;
    const timer = setInterval(() => {
      const jitter = 0.85 + Math.random() * 0.3;
      let rate = 0;
      if (indexing) {
        rate = lowPower ? 0 : speed.index * jitter;
        setIndexed((v) => Math.min(TO_INDEX, v + rate * SECONDS_A_TICK));
      } else {
        rate = speed.write * jitter;
        setWritten((v) => Math.min(TO_WRITE, v + rate * SECONDS_A_TICK));
      }
      setTime((t) => t + SECONDS_A_TICK);
      setRates((r) => [...r.slice(-23), rate]);
    }, 250);
    return () => clearInterval(timer);
  }, [running, finished, indexing, lowPower, speed]);
  const reset = () => {
    setRunning(false);
    setTime(0);
    setIndexed(0);
    setWritten(0);
    setRates([]);
  };
  const recent = rates.slice(-4);
  const rate = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : 0;
  const left = indexing ? (TO_INDEX - indexed) / Math.max(speed.index, 1) + TO_WRITE / speed.write : (TO_WRITE - written) / Math.max(rate, 1);
  const paused = running && indexing && lowPower;
  const steady = rates.length >= 2 && !paused;
  const stageDone = indexing ? indexed / TO_INDEX : written / TO_WRITE;
  return (
    <Stack gap={14}>
      <Row gap={6}>
        {Object.entries(DISKS).map(([id, d]) => (
          <Chip
            key={id}
            selected={disk === id}
            onClick={() => {
              setDisk(id);
              reset();
            }}
          >
            {d.label}
          </Chip>
        ))}
        <Chip selected={lowPower} onClick={() => setLowPower(!lowPower)}>
          Low Power Mode
        </Chip>
      </Row>
      <Row gap={8}>
        <Button variant="solid" onClick={() => setRunning(!running)}>
          {running ? "Pause the simulation" : finished ? "Finished" : "Play"}
        </Button>
        <Button onClick={reset}>Reset</Button>
      </Row>
      <Wireframe frame="none">
        <Panel>
          <Stack gap={10}>
            <Stages
              stages={[
                { label: "Read the catalog", detail: "2.4 s", state: "done" },
                { label: "Add 2 folders", detail: indexing ? `${count(indexed)} of 12,400 indexed` : "12,400 indexed", state: indexing ? "now" : "done" },
                { label: "Write", detail: `${count(written)} of 48,212`, state: indexing ? "next" : finished ? "done" : "now" },
                { label: "Done", detail: finished ? minutes(time) : "", state: finished ? "done" : "next" },
              ]}
            />
            <Wireframe frame="none" columns="minmax(0, 1.5fr) minmax(0, 1fr)" gap={12}>
              <Progress
                value={count(indexing ? indexed : written)}
                of={indexing ? "of 12,400 photos indexed" : `of 48,212 photos written · part ${Math.min(5, Math.floor(written / 10000) + 1)} of 5`}
                percent={`${Math.floor(stageDone * 100)}%`}
                done={stageDone}
                parts={indexing ? 1 : 5}
              >
                {finished ? (
                  <Text size="sm" tone="secondary">{`Imported 48,212 photos in ${minutes(time).replace("about ", "")}`}</Text>
                ) : paused ? (
                  <Text size="sm" tone="secondary">
                    Paused: Low Power Mode is on
                  </Text>
                ) : steady ? (
                  <>
                    <Text size="sm" tone="secondary">{`${Math.round(rate)} a second`}</Text>
                    <Text size="sm" tone="secondary">{`${minutes(left)} left`}</Text>
                  </>
                ) : (
                  <Text size="sm" tone="muted">
                    {running ? "Working out the rate…" : "Press Play"}
                  </Text>
                )}
                <Text size="sm" tone="muted">{`${minutes(time).replace("about ", "")} so far`}</Text>
              </Progress>
              {rates.length >= 2 ? <Throughput points={rates} caption="Photos a second, last 12 simulated minutes" /> : null}
            </Wireframe>
            {disk === "spinning" && !finished ? (
              <Text size="sm" tone="secondary">
                Photos on a spinning disk: Fixer reads and writes one file at a time, in folder order, which is quickest for it.
              </Text>
            ) : null}
          </Stack>
        </Panel>
      </Wireframe>
    </Stack>
  );
}

// ---------------------------------------------------------------- the canvas

export default function LightroomImportWireframes() {
  return (
    <Wireframes
      data={data}
      drawings={{
        found: <Found />,
        review: <Review />,
        importing: <Importing />,
        result: <Result />,
        details: <Details />,
        playground: <Playground />,
      }}
    />
  );
}


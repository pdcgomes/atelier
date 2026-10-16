import { Chip, Grid, Placeholder, Region, Row, Slider, Stack, Text, Wireframe } from "atelier";
import { Wireframes, type WireframesData } from "atelier/templates";
import type { ReactNode } from "react";

export const meta = { title: "Fixer on iPhone: wireframes", theme: "cursor" };

// ---------------------------------------------------------------- the data

const data: WireframesData = {
  title: "Fixer on iPhone: wireframes",
  intro:
    "How the iPhone app could look and work, from the design study's notes (PHN-11): the Mac editor distilled for a phone, Lightroom for iPhone, eight other iPhone editors, five interaction concepts and the design critic's review. Nothing here is built yet beyond the harness's foundations. Drawn on 13 October 2026, with your first three answers; the decisions they raise are CHC-40 to CHC-46 in the tracker, from docs/research/mobile-findings.md.",
  updated: "2026-10-13T17:30:00+01:00",
  reading:
    "Each phone is drawn at half its size, a standard iPhone of 402 by 874 points in portrait. Boxes are regions, numbers point to the notes under each drawing, and photo counts are made up. Every region says where it stands:",
  statuses: {
    built: { label: "In the harness", meaning: "Drawn by the harness on device screens, on the Mac and the iPhone (PHN-12, PHN-13)." },
    building: { label: "Being built", meaning: "An agent is building it now." },
    planned: { label: "To prototype", meaning: "Proposed by the study, for the concept prototypes (PHN-14)." },
    later: { label: "Later", meaning: "Comes after the prototypes." },
    you: { label: "Waits on you", meaning: "Waits on a decision of yours." },
  },
  flow: [
    { title: "Open on Photos", text: "The iPhone's own library, its albums and filters; nothing is imported first.", status: "planned" },
    { title: "Tap to edit", text: "The photo zooms from the grid into the editor, Photos' preview first, then Fixer's render.", status: "planned" },
    { title: "Move between modules", text: "Eight modules in fixed places; how you move between them is what the prototypes compare.", status: "later" },
    { title: "Set a value", text: "One full-width ruler, a tick at the default, a slower drag for fine steps, typing for exact values.", status: "planned" },
    { title: "Done, then the next photo", text: "Swipe to the next photo at Fit, or Done back to the grid; where the edit is kept is your decision.", status: "you" },
  ],
  principles: [
    { title: "The photo stays large", text: "While a control shows, the photo keeps at least half the screen's height, and a tap on it hides everything." },
    { title: "One thumb, the bottom third", text: "Modules, adjustments and values sit under the photo; the top holds only what's used between edits." },
    { title: "Positions never move", text: "The modules, each module's adjustments and a mask's adjustments keep their places, so they can be learnt." },
    {
      title: "Nothing cut, depth by layers",
      text: "All 116 of the Mac's capabilities have a place: 12 one tap away, 74 inside a module, 26 behind search or More, 4 on iPad and Mac only.",
    },
    { title: "Lightroom's names and ranges", text: "Every slider is the Mac's, with its range, default and units, so an edit means the same on both." },
    { title: "Every gesture has a button", text: "Gestures are shortcuts; VoiceOver and Voice Control users always have a visible path." },
  ],
  screens: [
    {
      id: "gallery",
      name: "The gallery",
      summary: "The app opens on the iPhone's Photos library, with its albums and filters, as you asked; a tap opens a photo to edit.",
      notes: [
        {
          n: 1,
          title: "Albums",
          text: "The Photos library's own albums and smart albums: Recents, Favourites, RAW, Portrait, the photographer's albums. Nothing is imported first; Lightroom for iPhone copies each photo into its own library on the first edit, which the study recommends not doing.",
          status: "planned",
        },
        {
          n: 2,
          title: "Filters",
          text: "One row of filters the library can answer at once: RAW (ProRAW included), Edited in Fixer, Favourites, and the star ratings Photos has added, if the platform note confirms other apps can read them.",
          status: "planned",
        },
        {
          n: 3,
          title: "The grid",
          text: "Photos' thumbnails, a RAW badge and a dot for photos with a Fixer edit; a photo whose original is in iCloud downloads when opened, with its progress.",
          status: "planned",
        },
        {
          n: 4,
          title: "Library access",
          text: "With limited access, a line says how many photos Fixer can see and how to choose more. Whether the edit is kept in Photos, in a sidecar or both decides what the dot means.",
          status: "you",
        },
        {
          n: 5,
          title: "Tap to edit",
          text: "The photo zooms from its place in the grid into the editor, Photos' preview first, Fixer's render when it's ready; under Reduce Motion it cross-fades.",
          status: "planned",
        },
      ],
    },
    {
      id: "bar",
      name: "Bar and ruler",
      title: "Bar and ruler (concept A)",
      summary:
        "The familiar concept, held still: eight modules along the bottom, a strip of adjustments above them and one large ruler. Ranked first by the design critic, 33 of 40.",
      notes: [
        {
          n: 1,
          title: "Top bar",
          text: "Done, Undo and Redo, the photo's place in its album (opens a filmstrip), before and after, and More. The critic found eight buttons don't fit an iPhone SE and Undo is out of reach one-handed on the largest phones: see the Questions.",
          status: "you",
        },
        {
          n: 2,
          title: "Photo",
          text: "60% of the screen with every control showing (526 of 874 points); a 2:3 portrait photo fills 53%. A tap hides the controls; press and hold shows the before.",
          status: "planned",
        },
        {
          n: 3,
          title: "Adjustments",
          text: "The module's adjustments in eight fixed slots, each ring showing how far it has moved, as Apple Photos' buttons do. A group (Curve, Mixer) swaps the strip for its contents, with Back first.",
          status: "planned",
        },
        {
          n: 4,
          title: "Ruler",
          text: "One ruler the width of the screen with the Mac's ranges and units: relative drags, a tick at the default, ten times finer as the finger moves up off it, a tap on the value to type one, a double-tap to reset.",
          status: "planned",
        },
        {
          n: 5,
          title: "Modules",
          text: "Eight fixed slots: Looks, Light, Colour, Effects, Crop, Masks, Remove and Detail (with Optics). Each keeps 46.9 points on an iPhone SE; a dot marks one with edits.",
          status: "planned",
        },
        {
          n: 6,
          title: "Layers, each a switch",
          text: "Pull the strip up into the module's list of sliders (the Slider sheet, with a visible grabber); a sideways drag on the photo to edit, off by default; Find a Slider by name, as ⌘K on the Mac.",
          status: "planned",
        },
      ],
    },
    {
      id: "sheet",
      name: "Slider sheet",
      title: "Slider sheet (concept B)",
      summary:
        "Lightroom's model: a module opens its list of sliders in a sheet. The critic proposes it as the second prototype, the baseline the others are judged against.",
      notes: [
        {
          n: 1,
          title: "Photo",
          text: "At the sheet's medium height the photo keeps 41% of the screen (356 points), and a 2:3 portrait photo 23%; on an iPhone SE, 225 points. Its compact height keeps 68%.",
          status: "planned",
        },
        {
          n: 2,
          title: "Sliders in a sheet",
          text: "A module opens its sliders as a list in a sheet with three heights, as Lightroom for iPhone and Darkroom do; several related values are set without switching.",
          status: "planned",
        },
        {
          n: 3,
          title: "Modules",
          text: "The same eight fixed modules as Bar and ruler, so the two prototypes differ only in how a value is reached.",
          status: "planned",
        },
      ],
    },
    {
      id: "compass",
      name: "Flick compass",
      title: "Flick compass (concept D)",
      summary:
        "A marking menu, from interface research, that none of the studied editors uses: the new concept, recommended for a prototype by the interaction designer and for a stroke rig first by the critic.",
      notes: [
        { n: 1, title: "Photo", text: "66% of the screen with the ring closed; the ring covers the photo's bottom edge only while it's open.", status: "planned" },
        {
          n: 2,
          title: "Hub and ring",
          text: "A tap on the hub opens the eight modules at fixed compass directions, then the module's eight adjustments; a flick toward Light, then Exposure, picks it without the ring. The directions are Bar and ruler's map: Looks left, Light up-left, Colour up, Effects up-right, Crop right, Masks down-right, Remove down, Detail down-left.",
          status: "planned",
        },
        {
          n: 3,
          title: "Ruler",
          text: "The same ruler as Bar and ruler, under the hub; the critic notes its drag sits directly above the home indicator.",
          status: "planned",
        },
        {
          n: 4,
          title: "What's unproven",
          text: "Whether people move from tapping to flicking, and how accurately a thumb flicks eight directions. The critic would measure both with a small stroke-recording rig before a full build.",
          status: "later",
        },
      ],
    },
    {
      id: "masks",
      name: "Masks and crop",
      summary: "Parts every concept shares, drawn here in Bar and ruler: darkening a sky with a Sky mask, and cropping to 4:5.",
      notes: [
        {
          n: 1,
          title: "The mask's pill",
          text: "Making or choosing a mask enters its context: a pill names it at the photo's bottom edge, and × or a tap outside every mask leaves it.",
          status: "planned",
        },
        {
          n: 2,
          title: "The same places",
          text: "In a mask, Light, Colour, Effects and Detail edit the mask, with every adjustment where it is for the whole photo; Looks, Crop and Remove dim in place. One map is learnt, and masks reuse it.",
          status: "planned",
        },
        {
          n: 3,
          title: "Masks' first level",
          text: "The mask list first, then Sky, Subject, Background, Brush, Linear and Radial in fixed slots, and More for People, Objects, Landscape, Depth Range, the ranges and presets.",
          status: "planned",
        },
        {
          n: 4,
          title: "Crop",
          text: "Original, 1:1, 4:5 and 9:16, then Ratios, Rotate, Geometry (Upright and Transform) and ⋯; tapping the selected ratio turns it. Angle is always on the ruler, as Photos keeps its straighten dial under the photo.",
          status: "planned",
        },
      ],
    },
    {
      id: "compare",
      name: "Compare",
      title: "The five concepts compared",
      summary:
        "From the interaction designer's counts and the design critic's scores, in docs/research/notes/PHN-interaction-concepts.md. Each task starts with the photo just opened, on Looks.",
      tables: [
        {
          text: "Score is the critic's, of 40; Photo, the photo's share of a standard iPhone's screen; then the taps and drags for each task: brighten and warm, darken the sky, crop to 4:5 and straighten, and set Shadows and Orange Luminance.",
          headers: ["Concept", "Score", "Photo", "Brighten, warm", "Darken the sky", "Crop 4:5, straighten", "Shadows, Orange Lum."],
          rows: [
            ["A: Bar and ruler", "33", "60%", "2 taps, 2 drags", "2 taps, 1 drag", "2 taps, 2 drags", "6 taps, 2 drags"],
            ["E: My sliders", "28", "57%", "0 taps, 2 drags", "2 taps, 1 drag", "2 taps, 2 drags", "2 taps, 2 drags, typing"],
            ["B: Slider sheet", "26", "41% at medium height", "2 taps, 2 drags", "2 taps, 1 drag", "2 taps, 2 drags", "4 taps, 2 drags"],
            ["D: Flick compass, flicking", "26", "66%", "0 taps, 4 drags", "0 taps, 2 drags", "0 taps, 3 drags", "2 taps, 4 drags"],
            ["D: Flick compass, tapping", "26", "66%", "6 taps, 2 drags", "3 taps, 1 drag", "3 taps, 2 drags", "8 taps, 2 drags"],
            ["C: The photo is the control", "24", "72%", "2 taps, 2 drags", "2 taps, 1 drag", "2 taps, 2 drags", "3 taps, 3 drags"],
          ],
          note: "What the counts say: for everyday edits the structure barely changes the count; it changes how much photo is left, how much is learnt and how much is hidden. The concepts part ways on the less common adjustments, such as the fourth task.",
        },
      ],
      sections: [
        {
          title: "What each prototype measures",
          text: "The same four tasks in each, on the phone: time, taps and drags, wrong modules opened, accidental changes and where the thumb lands, on an iPhone SE and the largest iPhone, with each hand, over three short sessions; and the strip at the accessibility text sizes. For the compass, also the share of selections flicked without the ring, and each direction's error rate.",
        },
      ],
    },
  ],
  questionsIntro: "Each changes parts that aren't built yet, or a default. Say which you'd like, or anything you'd change on the other tabs.",
  questions: [
    {
      id: "prototypes",
      title: "Which concepts become prototypes? (CHC-44)",
      now: "The interaction designer recommends Bar and ruler with optional layers, against the Flick compass. The design critic ranks Bar and ruler first (33 of 40), then My sliders (28), the Slider sheet and the Flick compass (26 each), and would build the Slider sheet as the second prototype, testing the compass first with a small stroke-recording rig.",
      options: [
        "Bar and ruler with layers, and the Flick compass in full",
        "Bar and ruler with layers, and the Slider sheet; the compass as a small stroke rig first",
        "Bar and ruler with layers only",
      ],
      lean: "B: the Slider sheet is Lightroom's model, the baseline the others are judged against, and the rig answers whether thumbs flick accurately before the compass costs a full build.",
      answer: "All five, each to try: Bar and ruler, the Slider sheet, the photo as the control, the Flick compass and My sliders (CHC-44, 13 October).",
    },
    {
      id: "module-bar",
      title: "Eight modules in a fixed bar, with Optics inside Detail and Auto inside Looks? (CHC-45)",
      now: "The distiller proposed an Auto button and nine modules; ten slots on an iPhone SE leave 37.5 points each, under the 44-point minimum, so the bar would scroll.",
      options: ["Eight fixed slots: Looks, Light, Colour, Effects, Crop, Masks, Remove, Detail", "Nine modules and Auto, in a bar that scrolls"],
      lean: "A: every module stays in sight and in place on every iPhone, and nothing is cut.",
      answer: "Eight fixed modules, with Optics inside Detail and Auto inside Looks (CHC-45, 13 October).",
    },
    {
      id: "edit-store",
      title: "Where does the edit of a Photos photo live? (CHC-40)",
      now: "Photos keeps one short edit per photo, with no images, and asks permission on every save; Lightroom for iPhone copies each photo into its own library instead, and reviewers ask for a round trip.",
      options: [
        "Both: the full sidecar in Fixer's iCloud Drive container, and a compact edit with a rendered version written into Photos on Done",
        "Photos only, as adjustment data",
        "Fixer's sidecar only, exporting copies to Photos",
      ],
      lean: "A: Photos shows the edit and can revert it, and the sidecar keeps masks and history and carries the edit to the Mac.",
      answer: "Both: the sidecar in Fixer's iCloud Drive container as the source of truth, and a compact edit with a rendered version in Photos on Done (CHC-40, 13 October).",
    },
    {
      id: "module-opens-on",
      title: "Does a module open on its first adjustment, or the last one used?",
      now: "The concepts open on the last one used; the critic found the same tap then sets different adjustments.",
      options: ["Always its first adjustment (Light opens on Exposure)", "The last one used, per module"],
      lean: "A: the same tap does the same thing every time, which is what muscle memory needs.",
    },
    {
      id: "sideways-swipe",
      title: "What does a sideways swipe on the photo do?",
      now: "At Fit and outside the tools, the concepts move to the next photo; a horizontal drag that edits is an optional layer, off by default.",
      options: ["The next photo, as Darkroom and Photomator do", "Edit the selected adjustment, as Snapseed does"],
      lean: "A: moving through an album is the common case, and the ruler already edits.",
    },
    {
      id: "undo-place",
      title: "Where does Undo go, within reach of the thumb?",
      now: "Undo and Redo are in the top bar, out of reach one-handed on the largest iPhones; iOS's three-finger swipe also undoes.",
      options: ["Beside the ruler, with Redo on a long press", "On a two-finger tap on the photo, as Photomator does", "Only in the top bar and iOS's swipe"],
      lean: "A: a visible button where the thumb already is; the two-finger tap can be tried as an extra in the prototypes.",
    },
    {
      id: "mask-lands",
      title: "Where does making a mask land?",
      now: "Making a Sky mask lands in its Light with Exposure on the ruler, since a mask is a context in which Light, Colour, Effects and Detail edit the mask.",
      options: ["In the mask's Light, ready to adjust", "In Masks, with the mask's own controls"],
      lean: "A, tested in the prototypes: most masks are made to change their exposure first.",
    },
    {
      id: "looks-apply",
      title: "Does Looks apply a look when the finger lifts after scrolling?",
      now: "Scrolling the strip previews the look at its centre; the concepts apply it on lift, and tapping it again puts its Amount on the ruler.",
      options: ["Apply on lift, as the concepts do", "Preview while scrolling, apply on a tap"],
      lean: "B: scrolling to look shouldn't change the edit; Undo isn't needed to browse.",
    },
    {
      id: "landscape",
      title: "Is editing in landscape part of the first prototypes?",
      now: "The concepts move the controls into a column on the thumb's side in landscape.",
      options: ["Portrait first, landscape after the concept is chosen", "Both from the start"],
      lean: "A: the concepts differ in portrait; landscape follows the chosen one.",
    },
  ],
};

// ---------------------------------------------------------------- the editor's parts, shared by the concepts

function TopBar({ n }: { n?: number }) {
  return (
    <Region n={n} label="Top bar" status="planned">
      <Row gap={6} align="center" justify="between" wrap={false}>
        <Text size="sm">
          {"Done "}
          <Text as="span" tone="muted">
            ↩ ↪ 12/340
          </Text>
        </Text>
        <Text size="sm" tone="muted">
          B/A ⋯
        </Text>
      </Row>
    </Region>
  );
}

/** The photo being edited: the height the controls leave, its share of the screen written in it. */
function Photo({ n, share, badge, inset }: { n?: number; share: string; badge?: string; inset?: [number, number, number, number] }) {
  return (
    <Region n={n} label="Photo" status="planned" grow>
      <Placeholder badge={badge} inset={inset}>
        {share}
      </Placeholder>
    </Region>
  );
}

const MODULES = ["Lk", "Li", "Co", "Ef", "Cr", "Ma", "Re", "De"];

function ModuleBar({ n, active, mask }: { n?: number; active: string; mask?: boolean }) {
  return (
    <Region n={n} label={mask ? "Modules, editing the mask" : "Modules"} status="planned">
      <Row gap={4} justify="between" wrap={false}>
        {MODULES.map((m) =>
          m === active ? (
            <Text key={m} size="sm" weight="bold">
              {m}
            </Text>
          ) : (
            <Text key={m} size="sm" tone="muted">
              {m}
            </Text>
          ),
        )}
      </Row>
    </Region>
  );
}

/** A strip of eight slots, each adjustment a round button; the selected one lit. */
function Strip({ n, slots, selected }: { n?: number; slots: string[]; selected: string }) {
  return (
    <Region n={n} label="Adjustments" status="planned">
      <Row gap={3}>
        {slots.map((s) => (
          <Chip key={s} selected={s === selected} dim={s !== selected}>
            {s}
          </Chip>
        ))}
      </Row>
    </Region>
  );
}

/** The value, and the ruler's ticks with the default lit at the centre. */
function Ruler({ n, label, value }: { n?: number; label: string; value: string }) {
  return (
    <Region n={n} label="Ruler" status="planned">
      <Stack gap={2} align="center">
        <Text size="sm">{`${label}  ${value}`}</Text>
        <Text size="sm">
          <Text as="span" tone="muted">
            │╷╷╷╷│╷╷╷╷
          </Text>
          <Text as="span" tone="accent">
            ┃
          </Text>
          <Text as="span" tone="muted">
            ╷╷╷╷│╷╷╷╷│
          </Text>
        </Text>
      </Stack>
    </Region>
  );
}

const LIGHT = ["Exposure", "Contrast", "Highlights", "Shadows", "Whites", "Blacks"];

function LightSliders() {
  return (
    <Stack gap={4}>
      {LIGHT.map((s) =>
        s === "Exposure" ? (
          <Slider key={s} label={s} min={-5} max={5} step={0.05} value={0.4} />
        ) : (
          <Slider key={s} label={s} min={-100} max={100} value={0} />
        ),
      )}
    </Stack>
  );
}

const LIGHT_SLOTS = ["Exp", "Con", "Hil", "Sha", "Whi", "Bla", "Crv", "⋯"];

// ---------------------------------------------------------------- the gallery

function Gallery() {
  return (
    <Wireframe frame="phone" caption="The gallery, on Recents">
      <Region n={1} label="Album" status="planned">
        <Row gap={6} align="center" justify="between" wrap={false}>
          <Text size="sm" weight="bold">
            Recents ▾
          </Text>
          <Text size="sm" tone="muted">
            Select
          </Text>
        </Row>
      </Region>
      <Region n={2} label="Filters" status="planned">
        <Row gap={4}>
          <Chip>All</Chip>
          <Chip dim>RAW</Chip>
          <Chip dim>Edited</Chip>
          <Chip dim>★</Chip>
        </Row>
      </Region>
      <Region n={3} label="Photos" status="planned" grow>
        <Grid columns={4} gap={3}>
          {Array.from({ length: 24 }, (_, i) => (
            <Placeholder key={i} h={40} badge={i % 5 === 0 ? "RAW" : i % 7 === 3 ? "●" : undefined} />
          ))}
        </Grid>
      </Region>
      <Region n={4} label="Access" status="you" dashed>
        <Text size="sm" tone="muted">
          Fixer can see 1,204 photos · Choose more
        </Text>
      </Region>
    </Wireframe>
  );
}

// ---------------------------------------------------------------- the concepts

function PhoneRow({ children }: { children: ReactNode }) {
  return (
    <Row gap={28} align="start">
      {children}
    </Row>
  );
}

function BarAndRuler() {
  return (
    <PhoneRow>
      <Wireframe frame="phone" caption="Light, setting Exposure">
        <TopBar n={1} />
        <Photo n={2} share="60%" />
        <Strip n={3} slots={LIGHT_SLOTS} selected="Exp" />
        <Ruler n={4} label="Exposure" value="+0.40" />
        <ModuleBar n={5} active="Li" />
      </Wireframe>
      <Wireframe frame="phone" caption="The strip pulled up: Light's sliders">
        <TopBar />
        <Photo share="41%" />
        <Region n={6} label="Sliders" status="planned" dashed>
          <LightSliders />
        </Region>
        <ModuleBar active="Li" />
      </Wireframe>
    </PhoneRow>
  );
}

function SliderSheet() {
  return (
    <Wireframe frame="phone" caption="Light, the sheet at medium height">
      <TopBar />
      <Photo n={1} share="41%" />
      <Region n={2} label="Light" status="planned">
        <Stack gap={4}>
          <LightSliders />
          <Text size="sm">Curve ›</Text>
        </Stack>
      </Region>
      <ModuleBar n={3} active="Li" />
    </Wireframe>
  );
}

function FlickCompass() {
  const cell = (label: string) => (
    <Text size="sm" tone="secondary">
      {label}
    </Text>
  );
  return (
    <Wireframe frame="phone" caption="The ring open, as a newcomer sees it">
      <TopBar />
      <Photo n={1} share="66%" />
      <Region n={2} label="Hub" status="planned">
        <Grid columns={3} gap={6}>
          {cell("Light")}
          {cell("Colour")}
          {cell("Effects")}
          {cell("Looks")}
          <Chip selected>Li › Ex</Chip>
          {cell("Crop")}
          {cell("Detail")}
          {cell("Remove")}
          {cell("Masks")}
        </Grid>
      </Region>
      <Ruler n={3} label="Exposure" value="+0.40" />
    </Wireframe>
  );
}

function MasksAndCrop() {
  return (
    <PhoneRow>
      <Wireframe frame="phone" caption="A Sky mask, in its Light">
        <TopBar />
        <Photo share="sky tinted while made" badge="Sky 1 ×" />
        <Strip slots={LIGHT_SLOTS} selected="Exp" />
        <Ruler label="Exposure" value="−0.70" />
        <ModuleBar n={2} active="Li" mask />
      </Wireframe>
      <Wireframe frame="phone" caption="Masks' first level">
        <TopBar />
        <Photo n={1} share="60%" />
        <Strip n={3} slots={["List", "Sky", "Subj", "Bkgd", "Brush", "Lin", "Rad", "More"]} selected="Sky" />
        <Ruler label="Amount" value="100" />
        <ModuleBar active="Ma" />
      </Wireframe>
      <Wireframe frame="phone" caption="Crop at 4:5">
        <TopBar />
        <Photo share="crop frame and handles" inset={[0.1, 0.06, 0.8, 0.88]} />
        <Strip n={4} slots={["Orig", "1:1", "4:5", "9:16", "Ratio", "Rot", "Geom", "⋯"]} selected="4:5" />
        <Ruler label="Angle" value="−1.8°" />
        <ModuleBar active="Cr" />
      </Wireframe>
    </PhoneRow>
  );
}

// ---------------------------------------------------------------- the canvas

export default function IphoneWireframes() {
  return (
    <Wireframes
      data={data}
      drawings={{
        gallery: <Gallery />,
        bar: <BarAndRuler />,
        sheet: <SliderSheet />,
        compass: <FlickCompass />,
        masks: <MasksAndCrop />,
      }}
    />
  );
}

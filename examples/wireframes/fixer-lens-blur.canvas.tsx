import {
  Button,
  Checkbox,
  Chip,
  Field,
  Heading,
  LineChart,
  Meter,
  Panel,
  Placeholder,
  Region,
  Row,
  Segmented,
  SideList,
  Slider,
  Sparkline,
  Stack,
  Text,
  Wireframe,
} from "atelier";
import { Wireframes, type WireframesData } from "atelier/templates";

export const meta = { title: "Lens Blur wireframes (BLR-20)", theme: "cursor" };

type Note = { n: number; title: string; text: string; status: "built" | "building" | "planned" | "later" | "you" };

// ---------------------------------------------------------------- the notes

const PANEL_NOTES: Note[] = [
  {
    n: 1,
    title: "Apply, and the panel's eye",
    text: "Ticking Apply turns the blur on; the first time, the depth is estimated and the subject put in focus, the panel saying so. The header has the eye every Develop panel but Basic has, which turns a panel off and keeps its settings: two switches for one thing, question 6. BLR-24.",
    status: "later",
  },
  {
    n: 2,
    title: "Depth, and Use Device Depth",
    text: "Where the depth came from: estimated on this Mac by MoGe-2, or the photo's own while Use Device Depth is on, its default for a photo with depth. A camera's raw has none, so the box is dimmed, as White Balance's controls are for a file that can't take them. The last table lists what the line says. BLR-21; the iPhone's files with BLR-26.",
    status: "later",
  },
  {
    n: 3,
    title: "Amount",
    text: "0 to 100, default 50, scaling the blur linearly: at 100, a difference across the whole depth map blurs to 4% of the long edge, until the comparison with Lightroom calibrates it. The chart below draws it. BLR-24, rendered by BLR-22.",
    status: "later",
  },
  {
    n: 4,
    title: "Shape, Blades and Rotation",
    text: "Circle, Bubble, 5-Blade, Ring and Oval, left to right: a modern lens's disc, a brighter rim, five blades, a mirror lens's doughnut and an anamorphic oval. Blades (5 to 9) and Rotation, beyond Lightroom, while 5-Blade is chosen. The picker's form is question 4. BLR-24, rendered by BLR-22.",
    status: "later",
  },
  {
    n: 5,
    title: "Cat Eye",
    text: "0 to 100: clips each disc by a second circle offset towards the frame's centre, more towards the edges and corners, for any shape, centred on the uncropped frame where the lens's axis is. BLR-24, rendered by BLR-22.",
    status: "later",
  },
  {
    n: 6,
    title: "Boost",
    text: "0 to 100, default 50: raises what the blur gathers above a knee near the clip point, so clipped lights come back near their true brightness. Nothing detects lights, which keeps clear of Adobe's pending filing on detecting them. BLR-23.",
    status: "later",
  },
  {
    n: 7,
    title: "Grain",
    text: "0 to 100, default 100: the photo's own noise put back where the blur smoothed it, before Detail, so noise reduction treats it as the rest of the photo. Beyond Lightroom; its default is question 5. BLR-24, rendered by BLR-22.",
    status: "later",
  },
  {
    n: 8,
    title: "Focus",
    text: "Subject, the default, focuses on the subject's depth, between the 5th and 95th percentiles under a Subject mask; the target button turns Point focus on (question 2). The Focus Range's two ends sit over a histogram of the photo's depth, far on the left as in Depth Range masks (question 3). Dragging an end makes the range your own, so a paste keeps it. BLR-24.",
    status: "later",
  },
  {
    n: 9,
    title: "Visualize Depth",
    text: "The depth in colour over the photo, near warm and far cool, with the range in focus white while an end is dragged; the On the canvas tab draws it. BLR-24.",
    status: "later",
  },
  {
    n: 10,
    title: "Refine",
    text: "Focus and Blur brushes with a mask brush's Size, Feather, Flow and Auto Mask: Focus keeps a place sharp, Blur gives it at least a set blur, and a stroke keeps its strength when the focus moves. The design's rules use each stroke's amount, which Lightroom sets with an Amount slider and this panel has no control for yet. BLR-25, after counsel (DSN-31).",
    status: "later",
  },
];

const CANVAS_NOTES: Note[] = [
  {
    n: 1,
    title: "Visualize Depth",
    text: "The photo in colour by depth: warm near, cool far, and, while an end of the Focus Range is dragged, white for the depths inside it. Here the face is in the range, and the shoulders, a little nearer, are just outside it. BLR-24.",
    status: "later",
  },
  {
    n: 2,
    title: "Point focus",
    text: "With the target button on, a click moves the Focus Range to the depth under the point, and Focus on shows Point. The pill says what a click does, as the eyedropper's does, and Esc leaves it. Whether the button is needed is question 2. BLR-24.",
    status: "later",
  },
  {
    n: 3,
    title: "Area focus",
    text: "Dragging a rectangle moves the range to the depths under it, so a face and the hair around it come into focus at once. BLR-24.",
    status: "later",
  },
  {
    n: 4,
    title: "Focus and Blur brushes",
    text: "With a brush chosen under Refine, a drag paints with it. The ring shows Size, the dashed circle where Feather begins, and its label shows while either changes, as a mask brush's ring does. BLR-25, after counsel (DSN-31).",
    status: "later",
  },
  {
    n: 5,
    title: "The first estimate",
    text: "Ticking Apply the first time estimates the depth on this Mac: the depth line shows its progress, and the photo stays as it was until the depth is ready. Its time in Core ML is still to be measured; MoGe-2 L took 568 ms in PyTorch, under load. BLR-21.",
    status: "later",
  },
  {
    n: 6,
    title: "The model, once per Mac",
    text: "When MoGe-2 isn't on this Mac, Apply asks before anything downloads, with its size and licence, as AI masks ask; Settings › Models can remove it. Its size waits on the design's question on L, about 600 MB, or B, about 200 MB. BLR-21.",
    status: "later",
  },
];

// ---------------------------------------------------------------- the data

const data: WireframesData = {
  title: "Lens Blur wireframes (BLR-20)",
  intro:
    "The Lens Blur panel in Fixer's Develop and its tools on the photo, drawn from the design document of 14 October 2026 and the BLR-20 note. The feature was parked by the owner on 14 October 2026, since it needs more research and calibration: its rows, BLR-20 and BLR-21 to BLR-28, are Deferred, with their phase set to Later. These wireframes record the design for when it resumes, so every Lens Blur region is Later and the questions stay open; the refinement brushes (BLR-25) will also wait on counsel's patent search (DSN-31). The parts of the app drawn around them, the Develop window, its other panels, the tool strip and the photo, are Built.",
  updated: "2026-10-16T09:50:00+01:00",
  reading:
    "Boxes are regions, numbers point to the notes under each wireframe, and values and counts are made up. The inspector is drawn at its nominal width, 316 points, a pixel to a point. Every region says where it stands:",
  statuses: {
    built: {
      label: "Built",
      meaning: "On main today, as drawn: the Develop window, its panels and tool strip, the photo, and the patterns the panel borrows.",
    },
    building: { label: "Being built", meaning: "An agent is building it now; no part of Lens Blur is." },
    planned: { label: "Planned", meaning: "In the tracker for a release; a Lens Blur region moves here when its row is taken up again." },
    later: {
      label: "Later, or waits on you",
      meaning: "Deferred with the feature, parked on 14 October 2026 with its phase set to Later; the brushes also wait on counsel (DSN-31).",
    },
  },
  flow: [
    {
      title: "Apply",
      text: "Tick Apply in the Lens Blur panel. The first time, the depth is estimated on this Mac, or read from the photo when it has its own, and the subject is put in focus.",
      status: "later",
    },
    {
      title: "Choose the blur",
      text: "Amount sets how strong it is and Shape the discs lights make; Cat Eye pinches them towards the corners and Boost brightens them.",
      status: "later",
    },
    {
      title: "Set the focus",
      text: "On the subject by default, on a point you click or an area you drag, or with the Focus Range's two ends over the photo's depth.",
      status: "later",
    },
    {
      title: "Check it in colour",
      text: "Visualize Depth shows near warm and far cool, and the range in focus white while its ends are dragged.",
      status: "later",
    },
    {
      title: "Refine by hand",
      text: "Where the depth is wrong, paint with Focus to keep a strand of hair sharp, or with Blur to soften what was left sharp.",
      status: "later",
    },
  ],
  principles: [
    {
      title: "A lens's blur, where a lens makes it",
      text: "The blur is gathered from the photo in linear light, before lens correction and Transform, so lights keep their brightness and a crop or a rotation reshapes the discs as it would a real lens's.",
    },
    {
      title: "Lightroom's controls, and what it leaves out",
      text: "Every control Lightroom has, under its name, plus Blades, Rotation and Grain, which puts the photo's own noise back where the blur smoothed it away.",
    },
    {
      title: "The depth stays with the edit",
      text: "The map is estimated once, kept in the edit as a 16-bit image beside its masks, and estimated again only when you ask, so an edit renders the same on every Mac.",
    },
    {
      title: "One depth scale",
      text: "Focus is set on the Depth Range mask's scale, 0 far and 100 near, far on the left, over a histogram of the photo's own depth.",
    },
    {
      title: "The preview is the export",
      text: "The blur is drawn at the pyramid level that matches the screen, its discs scaled to it, and a test holds each level to the full-size render.",
    },
    {
      title: "Brushes that edit no depth",
      text: "Focus and Blur paint how sharp or how blurred a place is and keep it when the focus moves, to stay apart from Adobe's granted patent (US12586163B2).",
    },
  ],
  screens: [
    {
      id: "panel",
      name: "The panel",
      title: "The Lens Blur panel",
      summary:
        "Develop's inspector scrolled to Lens Blur, after the blur was applied to a portrait from a camera's raw file, with 5-Blade chosen and the focus on the subject. The panel is drawn after Effects, question 1's first option. Around it, the photo, the histogram and tool strip, the other panels and the footer are Built.",
      drawings: [{ id: "inspector", notes: PANEL_NOTES }, { id: "order" }],
      tables: [
        {
          title: "Lightroom's Lens Blur and this panel",
          headers: ["Control", "Lightroom", "This panel", "Row"],
          rows: [
            ["Apply", "A checkbox; on mobile, dragging Blur turns it on", "A checkbox that estimates the depth the first time (question 6)", "BLR-24"],
            ["Amount", "Blur Amount, 0 to 100, default 50", "The same, its scale calibrated against Lightroom's on the Bench task", "BLR-24, BLR-22"],
            ["Shape", "Circle, Bubble, 5-Blade, Ring and Oval", "The same five", "BLR-22"],
            ["Blades and Rotation", "Not offered", "5 to 9 blades at any angle, beyond Lightroom", "BLR-22"],
            ["Cat Eye", "A slider on desktop since December 2024, a button on mobile", "A slider, for any shape", "BLR-22"],
            ["Boost", "Brightens lights that a step of its own detects", "A gain above the clip point; nothing detects lights", "BLR-23"],
            ["Grain", "Not offered; users add Grain through a mask", "The photo's own noise put back, default 100, beyond Lightroom", "BLR-22"],
            ["Focus", "Subject Focus, and Point or Area Focus by a click or a drag", "Subject, and Point by a click or a drag (question 2)", "BLR-24"],
            ["Focus Range", "A box with two ends over a histogram", "Two ends over the photo's depth histogram (question 3)", "BLR-24"],
            ["Visualize Depth", "Near warm, far cool, focus white while adjusting", "The same", "BLR-24"],
            ["Use Device Depth", "Used whenever the photo has a depth map, unless turned off", "The same; the iPhone's files with BLR-26", "BLR-21, BLR-26"],
            [
              "Refine",
              "Focus and Blur brushes with Amount, Size, Feather, Flow and Auto Mask, desktop only, following the Focus Range",
              "Focus and Blur with Size, Feather, Flow and Auto Mask; a stroke keeps its strength when the focus moves",
              "BLR-25, DSN-31",
            ],
            [
              "Copy and presets",
              "Copying can find each photo's subject again; 12 Adaptive: Blur Background presets",
              "A Lens Blur group in Copy Settings that finds each photo's subject again; recipes carry it",
              "BLR-24",
            ],
            ["Lightroom's own edits", "crs:LensBlur in the XMP; the depth isn't stored", "Imported as settings, the depth made again", "BLR-27"],
          ],
        },
        {
          title: "What the depth line says",
          headers: ["The line", "When", "Row"],
          rows: [
            ["Downloading model… 42%", "The first Apply on a Mac without MoGe-2, once you choose Download", "BLR-21"],
            ["Estimating depth…, with its progress", "The first Apply on a photo, and Update Depth", "BLR-21"],
            ["Estimated on this Mac · MoGe-2 L", "A photo without depth of its own, a camera's raw among them", "BLR-21"],
            ["From the photo · iPhone Portrait", "Use Device Depth on, for a photo with depth", "BLR-21, BLR-26"],
            [
              "The photo has changed · Update Depth",
              "A Remove, Heal or Clone spot changed what the model sees; the depth stays until you update it, as AI masks do",
              "BLR-21",
            ],
          ],
        },
      ],
    },
    {
      id: "canvas",
      name: "On the canvas",
      summary:
        "What the photo shows while the panel is in use, one moment to each frame, on the same portrait. The photo and its click-to-zoom are Built; what's drawn over it here is Later.",
      drawings: [
        { id: "focus", title: "Seeing and setting the focus", notes: CANVAS_NOTES.slice(0, 3), notesColumns: 3 },
        { id: "refine", title: "Refining, and the first time", notes: CANVAS_NOTES.slice(3), notesColumns: 3 },
      ],
      tables: [
        {
          title: "Clicks and keys on the photo",
          headers: ["On the photo", "What it does", "Status"],
          rows: [
            ["Click", "Zooms between fit and 100%, as it does today", "built"],
            ["Click, with Point focus on", "Focuses on the depth under the point", "later"],
            ["Drag, with Point focus on", "Focuses on the depths under the rectangle", "later"],
            ["Esc", "Turns Point focus off, as it turns the eyedropper off", "later"],
            ["Drag, with a Refine brush chosen", "Paints with Focus or Blur", "later"],
          ],
        },
      ],
    },
  ],
  questionsIntro: "Each changes parts that aren't built yet, or a default. Say which you'd like, or anything you'd change on the other tabs.",
  questions: [
    {
      id: "panel-place",
      title: "Where does the Lens Blur panel sit among Develop's panels?",
      now: "The design doesn't place it, and the BLR-20 note doesn't record where Lightroom puts its own. Develop's nine panels follow Lightroom's order (PanelID): Basic, Tone Curve, Color Mixer, Color Grading, Detail, Lens Corrections, Transform, Effects, Calibration. The blur renders after Retouch and before Detail, and Effects already holds eight groups in 26 rows, Grain among them.",
      options: [
        "A panel of its own after Effects, before Calibration, with the panels that change a photo's character; nothing above it moves.",
        "A group inside Effects, beside Grain and Halation: no tenth panel, but Apply, the depth line and the canvas tools in the middle of a long panel, and Effects' eye turning both off.",
        "A panel of its own before Detail, in the order it renders: the blur first, then sharpening and noise reduction on the blurred photo.",
      ],
      lean: "A: it's an effect, and a panel of its own keeps its eye, its Edited chip and Solo Mode, which a group inside Effects would share.",
    },
    {
      id: "focus-click",
      title: "How is focus set on the photo?",
      now: "The design focuses on the depth under a click, or on the range under a dragged rectangle. In Develop a click on the photo is Lightroom's click-to-zoom, between fit and 100%. Tools that take a click on the photo, White Balance's eyedropper (W) and Point Color's, are turned on by a button in their panel, and a pill over the photo says what a click does and that Esc cancels.",
      options: [
        "A Point focus button beside Focus on, as the eyedropper is: while it's on, a click focuses on a point and a drag on an area, until Esc or the button again.",
        "A click or a drag on the photo focuses whenever the Lens Blur panel is expanded, and click-to-zoom waits until it's collapsed.",
        "Both: the button, and a click on the photo while the panel is expanded.",
      ],
      lean: "A: a panel can stay expanded for a whole session, so B and C would take click-to-zoom away for as long, and a button with its pill is how Develop already takes clicks on the photo.",
    },
    {
      id: "focus-range",
      title: "How is the Focus Range drawn?",
      now: "The design has two ends over a histogram of the photo's depth, on the Depth Range mask's scale (0 far, 100 near), the blur growing from each end as a lens's does. The Depth Range mask's bar has four handles (where the range starts, is full from, stops being full and ends) over a dark-to-light bar, Far on the left and Near on the right, a value field for each handle and no histogram. Lightroom writes four numbers for its range and shows a box with two ends.",
      options: [
        "Two ends over the histogram, as Lightroom's box: drag a side to move one end, or the box to move both.",
        "The Depth Range mask's four handles, reused: the inner two bound the focus and the outer two set where the blur reaches full strength, a blur that stops growing, unlike a lens's, and two more numbers in the edit.",
        "A, labelled as the Depth Range bar is: Far on the left, Near on the right and a value field for each end, so the two controls read as one scale (as drawn).",
      ],
      lean: "C: a lens has one range in focus and a blur that grows from its ends, so two ends are the whole model, and the mask's labels and fields make it plain the two share a scale.",
    },
    {
      id: "shape-picker",
      title: "How are the shapes chosen?",
      now: "The design has Lightroom's five shapes and adds Blades (5 to 9) and Rotation for the bladed one. A panel's rows are 280 points wide, 198 beside a label: five icons fit there and five names don't, which is why Upright's six buttons sit in two rows of three. Elsewhere in Develop a choice is a pop-up menu (Treatment, the mask brush, Healing's Mode) or, in Color Grading, a segmented control of icons.",
      options: [
        "Five icons in a segmented control, as Color Grading's view and Lightroom's buttons, each named in its tooltip; Blades and Rotation appear under it while 5-Blade is chosen.",
        "A pop-up menu of the five by name, as Treatment and Healing's Mode; Blades and Rotation appear under it while 5-Blade is chosen.",
        "A's icons, with Blades and Rotation always there and dimmed unless 5-Blade is chosen, so the rows below stay put while shapes are tried.",
      ],
      lean: "C: shapes are told apart by eye and tried one after another, so icons that change in one click suit them, and fixed rows keep Cat Eye and Boost from moving each time.",
    },
    {
      id: "grain-default",
      title: "Where does Grain start?",
      now: "The design puts the photo's own noise back into what the blur smoothed, from its noise model and in proportion to how much each pixel was blurred: Grain, 0 to 100, defaults to 100, the photo's own level. Lightroom has no such control and leaves users to add Grain through a mask. Effects already has a Grain group, a film grain added on top, under the same name.",
      options: [
        "At 100: the photo's own noise, as the design has it.",
        "Off, as Lightroom leaves it, the slider there for whoever wants the noise back.",
        "Always the photo's own noise and no slider, as Generative Remove's fills have it put back today.",
      ],
      lean: "A: a blurred area without the photo's noise looks pasted on, and the slider lets a smoother look be chosen; the name is worth a second look beside Effects' Grain.",
    },
    {
      id: "apply-or-eye",
      title: "Apply, or the panel's eye?",
      now: "The design has Lightroom's Apply checkbox, which also starts the depth's estimate the first time. Every Develop panel but Basic has an eye in its header that turns it off and keeps its settings (UI-12), so this panel would have two switches for one thing, as drawn.",
      options: [
        "Apply only until the blur is first applied, as a button that estimates the depth; from then on the eye turns it off and on, as in every other panel, and Lightroom's Active imports to the eye.",
        "Lightroom's Apply checkbox, and no eye on this panel, as Basic has none.",
        "Both, kept as one switch: ticking Apply opens the eye, and closing the eye clears Apply.",
      ],
      lean: "A: Develop keeps one way to turn a panel off, and Apply keeps the one job the eye can't do, asking for the depth.",
    },
  ],
};

// ---------------------------------------------------------------- Develop's inspector

/** PanelMetrics.inspectorNominal: the inspector's width in points, drawn a pixel to a point. */
const INSPECTOR = 316;

/** A Develop panel's header: chevron, symbol (◎), title, the Edited chip and the eye (◉). */
function PanelHeader({ title, open, edited }: { title: string; open?: boolean; edited?: number }) {
  return (
    <Row justify="between" align="center" gap={6}>
      <Text as="span" size="sm" weight="bold">
        {`${open ? "▾" : "▸"} ◎ ${title}`}
      </Text>
      <Row gap={6} align="center">
        {edited ? <Chip>{`Edited · ${edited}`}</Chip> : null}
        <Text as="span" size="sm" tone="muted">
          ◉
        </Text>
      </Row>
    </Row>
  );
}

function CollapsedPanel({ title, edited }: { title: string; edited?: number }) {
  return (
    <Panel padding={4}>
      <PanelHeader title={title} edited={edited} />
    </Panel>
  );
}

/** How much of the portrait lies at each depth, far (0) to near (100), in 20 bins: the wall, a bush, the face, the shoulders, a plant in front. */
const DEPTH_BINS = [0.56, 0.92, 0.87, 0.56, 0.3, 0.16, 0.19, 0.33, 0.27, 0.13, 0.05, 0.09, 0.49, 0.64, 0.32, 0.2, 0.06, 0.09, 0.14, 0.03];

/** The Focus Range: two ends over the photo's depth histogram, labelled as the Depth Range bar is. */
function FocusRange({ lower, upper }: { lower: number; upper: number }) {
  return (
    <Stack gap={3}>
      <Text size="sm" tone="secondary">
        Focus Range
      </Text>
      <Sparkline title="The photo's depth, far to near" values={DEPTH_BINS} width={200} blocks />
      <Meter
        value={100}
        show="none"
        segments={[
          { value: lower, tone: "muted", label: "Blurred, farther" },
          { value: upper - lower, tone: "info", label: "In focus" },
          { value: 100 - upper, tone: "muted", label: "Blurred, nearer" },
        ]}
      />
      <Row justify="between" align="center">
        <Chip>{String(lower)}</Chip>
        <Chip>{String(upper)}</Chip>
      </Row>
      <Row justify="between" align="center">
        <Text as="span" size="sm" tone="muted">
          Far
        </Text>
        <Text as="span" size="sm" tone="muted">
          Near
        </Text>
      </Row>
    </Stack>
  );
}

/** The Lens Blur panel, applied, with 5-Blade chosen and the focus on the subject. */
function LensBlurCard() {
  return (
    <Panel padding={4} focus>
      <Stack gap={4}>
        <Region n={1} label="Apply" status="later">
          <PanelHeader title="Lens Blur" open edited={7} />
          <Checkbox label="Apply" value />
        </Region>
        <Region n={2} label="Depth" status="later">
          <Field name="Depth">
            <Text size="sm">Estimated on this Mac · MoGe-2 L</Text>
          </Field>
          <Field name="">
            <Text as="span" size="sm" tone="muted">
              ☐ Use Device Depth
            </Text>
          </Field>
        </Region>
        <Region n={3} label="Amount" status="later">
          <Slider label="Amount" value={64} min={0} max={100} />
        </Region>
        <Region n={4} label="Shape" status="later">
          <Field name="Shape">
            <Segmented items={["●", "◍", "⬟", "○", "⬮"]} active="⬟" />
          </Field>
          <Slider label="Blades" value={5} min={5} max={9} />
          <Slider label="Rotation" value={18} min={0} max={360} unit="°" />
        </Region>
        <Region n={5} label="Cat Eye" status="later">
          <Slider label="Cat Eye" value={20} min={0} max={100} />
        </Region>
        <Region n={6} label="Boost" status="later">
          <Slider label="Boost" value={50} min={0} max={100} />
        </Region>
        <Region n={7} label="Grain" status="later">
          <Slider label="Grain" value={100} min={0} max={100} />
        </Region>
        <Region n={8} label="Focus" status="later">
          <Heading level={3}>Focus</Heading>
          <Field name="Focus on">
            <Row gap={6} align="center">
              <Button size="sm" variant="ghost" title="Point focus">
                ⌖
              </Button>
              <Segmented items={["Subject", "Point"]} active="Subject" />
            </Row>
          </Field>
          <FocusRange lower={62} upper={71} />
        </Region>
        <Region n={9} label="Visualize Depth" status="later">
          <Checkbox label="Visualize Depth" value={false} />
        </Region>
        <Region n={10} label="Refine" status="later">
          <Heading level={3}>Refine</Heading>
          <Field name="Brush">
            <Segmented items={["Focus", "Blur"]} active="Focus" />
          </Field>
          <Slider label="Size" value={40} min={0} max={100} />
          <Slider label="Feather" value={50} min={0} max={100} />
          <Slider label="Flow" value={60} min={0} max={100} />
          <Checkbox label="Auto Mask" value={false} />
        </Region>
      </Stack>
    </Panel>
  );
}

/** Develop's inspector, scrolled to Lens Blur: histogram and tool strip, the panels, the footer. */
function Inspector() {
  return (
    <Region label="Inspector" status="built">
      <Stack gap={6}>
        <Row>
          <Sparkline title="Histogram" values={[2, 5, 9, 14, 12, 8, 6, 9, 13, 17, 15, 10, 7, 9, 12, 8, 4, 2]} width={INSPECTOR - 40} blocks />
        </Row>
        <Row>
          <Segmented items={["☰", "⌗", "✚", "◉", "◌"]} active="☰" />
        </Row>
        <CollapsedPanel title="Effects" edited={2} />
        <LensBlurCard />
        <CollapsedPanel title="Calibration" />
        <Row gap={8}>
          <Button size="sm" variant="outline">
            Previous
          </Button>
          <Button size="sm" variant="outline">
            Reset
          </Button>
        </Row>
      </Stack>
    </Region>
  );
}

// ---------------------------------------------------------------- the photo

/** Where things sit in the portrait, as fractions [x, y, width, height] of the frame. */
const SUBJECT: [number, number, number, number] = [0.27, 0.24, 0.47, 0.76];
const POINT: [number, number, number, number] = [0.465, 0.32, 0.075, 0.11];
const AREA: [number, number, number, number] = [0.4, 0.225, 0.2, 0.41];
const RING: [number, number, number, number] = [0.495, 0.16, 0.135, 0.2];

const POINT_PILL = "Click to focus on a point, or drag over an area  ·  Esc to cancel";

/** Visualize Depth's colours, far on the left as on the Focus Range. */
function DepthLegend() {
  return (
    <Stack gap={2}>
      <Text size="sm">
        <Text as="span" tone="muted">
          {"Far "}
        </Text>
        <Text as="span" tone="info">
          ●
        </Text>
        <Text as="span" tone="accent">
          {" ●"}
        </Text>
        {" ○ "}
        <Text as="span" tone="warning">
          ●
        </Text>
        <Text as="span" tone="danger">
          {" ●"}
        </Text>
        <Text as="span" tone="muted">
          {" Near"}
        </Text>
      </Text>
      <Text size="sm" tone="muted">
        ○ white: in focus, while dragged
      </Text>
    </Stack>
  );
}

function PanelOrder() {
  return (
    <Stack gap={6}>
      <Heading level={3}>Where it could sit</Heading>
      <SideList
        items={[
          { label: "▸ Basic" },
          { label: "▸ Tone Curve" },
          { label: "▸ Color Mixer" },
          { label: "▸ Color Grading" },
          { label: "Lens Blur", count: "C", tone: "accent" },
          { label: "▸ Detail" },
          { label: "▸ Lens Corrections" },
          { label: "▸ Transform" },
          { label: "▸ Effects" },
          { label: "Lens Blur, as a group", count: "B", tone: "accent", depth: 1 },
          { label: "Lens Blur", count: "A", tone: "accent" },
          { label: "▸ Calibration" },
        ]}
        note="The nine panels are Built and follow Lightroom's order; the rows with a letter are question 1's options."
      />
    </Stack>
  );
}

/** Disc diameter against depth at Amount 50 with the range at 62 to 71: none inside the range, growing linearly from each end. */
function discAt(depth: number): number {
  if (depth < 62) return Math.round((62 - depth) * 0.02 * 100) / 100;
  if (depth > 71) return Math.round((depth - 71) * 0.02 * 100) / 100;
  return 0;
}

const DEPTHS = Array.from({ length: 101 }, (_, d) => d);

function BlurCurve() {
  return (
    <LineChart
      title="Blur disc against depth"
      x={DEPTHS}
      series={[{ name: "Disc diameter, % of the long edge", values: DEPTHS.map(discAt) }]}
      unit="%"
      yMin={0}
      yMax={1.4}
      caption="Depth on the map's scale along the bottom, 0 far and 100 near; the disc's diameter as a share of the long edge up the side, zero across the range in focus, 62 to 71. Illustrative, from the design's Controls table: at Amount 50 with the range at 62 to 71, nothing inside the range is blurred and the disc grows linearly from each end; at Amount 100 a difference across the whole map is 4% of the long edge. Amount's scale waits on the comparison with Lightroom."
    />
  );
}

// ---------------------------------------------------------------- the tabs' drawings

function ThePanel() {
  return (
    <Wireframe
      toolbar={
        <>
          <Text as="span" size="sm" tone="muted">
            Develop
          </Text>
          <Text as="span" size="sm">
            DSCF4127.RAF
          </Text>
        </>
      }
      columns={`minmax(0, 1fr) ${INSPECTOR}px`}
      caption="◎ stands for a panel's symbol, ◉ for its eye and ⌖ for the Point focus button. The tool strip's icons, named in their tooltips: Edit (D), Crop & Straighten (R), Healing (Q), Red Eye Correction and Masking (⇧W), Edit chosen. The shapes, left to right: Circle, Bubble, 5-Blade, Ring and Oval."
    >
      <Region label="The photo" status="built">
        <Placeholder w={660} ratio="3:2" inset={SUBJECT} caption="A portrait from a camera's raw, its subject sharp">
          ⬟ ⬟ a portrait, sharp, before 5-Blade discs ⬟
        </Placeholder>
        <Text size="sm" tone="muted">
          The photo is Built; the 5-Blade discs behind the sharp subject are the blur the panel would add.
        </Text>
      </Region>
      <Inspector />
    </Wireframe>
  );
}

function OrderAndCurve() {
  return (
    <Wireframe frame="none" columns="minmax(0, 230px) minmax(0, 1fr)" gap={32}>
      <PanelOrder />
      <BlurCurve />
    </Wireframe>
  );
}

function SeeingTheFocus() {
  return (
    <Wireframe frame="none" columns="minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)" gap={10}>
      <Region n={1} label="Visualize Depth" status="later">
        <Placeholder ratio="3:2" inset={SUBJECT} caption="Visualize Depth on">
          the face white, the shoulders warm, the wall cool
        </Placeholder>
        <DepthLegend />
      </Region>
      <Region n={2} label="Point focus" status="later">
        <Placeholder ratio="3:2" inset={POINT} caption="Point focus on">
          ⌖ a click on the face
        </Placeholder>
        <Text size="sm" tone="secondary">{`The pill over the photo: ${POINT_PILL}`}</Text>
      </Region>
      <Region n={3} label="Area focus" status="later">
        <Placeholder ratio="3:2" inset={AREA} caption="Point focus on">
          ⬚ a rectangle dragged over the face and hair
        </Placeholder>
        <Text size="sm" tone="secondary">{`The pill over the photo: ${POINT_PILL}`}</Text>
      </Region>
  </Wireframe>
);
}

function Refining() {
return (
  <Wireframe frame="none" columns={`minmax(0, 1fr) ${INSPECTOR}px`} gap={10}>
      <Region n={4} label="Focus and Blur brushes" status="later">
        <Placeholder ratio="3:2" inset={RING} caption="The ring is Size; a dashed circle inside it, where Feather begins.">
          <Chip>Size 40 · Feather 50</Chip>
        </Placeholder>
      </Region>
      <Stack gap={10}>
        <Region n={5} label="The first estimate" status="later">
          <Panel padding={4} focus>
            <Stack gap={4}>
              <PanelHeader title="Lens Blur" open edited={1} />
              <Checkbox label="Apply" value />
              <Field name="Depth">
                <Meter value={60} label="Estimating depth…" show="none" />
              </Field>
            </Stack>
          </Panel>
        </Region>
        <Region n={6} label="The model, once per Mac" status="later" dashed>
          <Stack gap={8}>
            <Panel padding={6}>
              <Stack gap={6}>
                <Text size="sm">
                  ⤓ Lens Blur uses MoGe-2 L, a 600 MB download. It runs on this Mac; your photos are never uploaded. You can remove it in Settings › Models. Its licence: MIT.
                </Text>
                <Row justify="between" align="center" gap={6}>
                  <Button size="sm" variant="ghost">
                    Read the licence
                  </Button>
                  <Row gap={6}>
                    <Button size="sm" variant="outline">
                      Not Now
                    </Button>
                    <Button size="sm" variant="solid">
                      Download
                    </Button>
                  </Row>
                </Row>
              </Stack>
            </Panel>
            <Text size="sm" tone="muted">
              After Download, the depth line:
            </Text>
            <Field name="Depth">
              <Meter value={42} label="Downloading model…" show="percent" />
            </Field>
          </Stack>
        </Region>
      </Stack>
    </Wireframe>
  );
}

// ---------------------------------------------------------------- the canvas

export default function LensBlurWireframes() {
  return <Wireframes data={data} drawings={{ inspector: <ThePanel />, order: <OrderAndCurve />, focus: <SeeingTheFocus />, refine: <Refining /> }} />;
}

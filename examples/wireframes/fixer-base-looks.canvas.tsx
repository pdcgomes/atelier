import {
  Chip,
  Field,
  Heading,
  Marker,
  Placeholder,
  Region,
  Row,
  SideList,
  Slider,
  Stack,
  Table,
  Text,
  TextInput,
  Wireframe,
  useCanvasState,
} from "atelier";
import type { SideListItem } from "atelier";
import { Wireframes, type WireframesData } from "atelier/templates";

export const meta = { title: "Base Looks and Recipes: wireframes", theme: "cursor" };

type Note = { n: number; title: string; text: string; status: "built" | "building" | "planned" | "later" | "you" };

// ---------------------------------------------------------------- the notes

const COLUMN_NOTES: Note[] = [
  { n: 1, title: "Navigator", text: "Unchanged.", status: "built" },
  { n: 2, title: "Folders", text: "Unchanged: the working set's folders.", status: "built" },
  {
    n: 3,
    title: "Base Looks",
    text: "A panel of its own between Folders and Recipes, in the order of the work, with the same header, collapse, Option-click and Expand All Panels as the others, and the symbol camera.filters (PNL-17).",
    status: "building",
  },
  { n: 4, title: "Recipes", text: "Presets only: the looks it listed (Film Stocks, Firmware Model, Fujifilm LUTs, imported LUTs) move to Base Looks (RUL-31).", status: "building" },
  { n: 5, title: "Snapshots and History", text: "Unchanged.", status: "built" },
  {
    n: 6,
    title: "Basic › Base Look",
    text: "Keeps its entries (decision 4), and since slice 1 chooses a look as the panel does. Its tooltip, which sent film looks and LUTs to the Recipes panel, points to Base Looks. Its Amount is the panel's Amount row.",
    status: "building",
  },
];

const BROWSE_NOTES: Note[] = [
  {
    n: 1,
    title: "The header's + menu",
    text: "Import LUT (.cube, .3dl or HaldCLUT)… with the open panel's input space accessory the Recipes panel uses today; Choose Camera Profiles…, as in Basic's menu (CLR-63); Get Fujifilm's LUTs…, the browser's link.",
    status: "building",
  },
  {
    n: 2,
    title: "Search Base Looks",
    text: "Names, summaries, makers and kinds: kodak, slide, negative, cinema, black and white. Profile, film, simulation and LUT list a whole kind, as Lightroom's words do in recipe search. Results are one list.",
    status: "building",
  },
  {
    n: 3,
    title: "The photo's look and its Amount",
    text: "Always shown while a photo is open, naming the look even when its folder is hidden. 0 to 200, the same value as Basic's Base Look Amount; a drag is one History step.",
    status: "building",
  },
  {
    n: 4,
    title: "Favorites",
    text: "Starred from a look's menu. Film stocks keep the stars the Film Looks window gave them; other looks are starred by their id.",
    status: "building",
  },
  {
    n: 5,
    title: "In This Photo and the camera profiles",
    text: "The look a DNG embeds, then the photo's camera's Adobe profiles where they're on this Mac (CLR-63, CLR-64), in Basic's menu's sections: Adobe Raw, Camera Matching, your own, and the creative groups inside Creative.",
    status: "building",
  },
  {
    n: 6,
    title: "Fixer, Film Styles and Film Stocks",
    text: "Fixer's six, the 15 Film Styles, then the 36 stocks with their icons by kind, each variant beside its stock, as Recipes › Film Stocks lists them today. The photo's look is highlighted where it's listed.",
    status: "building",
  },
  {
    n: 7,
    title: "Firmware Model, Fujifilm LUTs, Imported, Reproduction",
    text: "The 20 simulations while Settings' Experimental switch is on (never in the App Store build); Fujifilm's LUTs and the ones you imported, a cube marking each; installed looks no recipe uses; Fixer Reproduction.",
    status: "building",
  },
];

const SEARCH_NOTES: Note[] = [
  {
    n: 8,
    title: "Searching",
    text: "kodak finds Kodak's stocks, in the panel's order, each with its folder at the end of its row (question 4); nothing found shows No matching Base Looks.",
    status: "building",
  },
  {
    n: 9,
    title: "Right-click a look",
    text: "Add to Favorites or Remove from Favorites. A film stock adds Apply Without Grain, Halation and Bloom, previewing while it's highlighted. An imported look adds Show in Finder and Move to Trash (slice 3).",
    status: "building",
  },
  {
    n: 10,
    title: "Right-click Film Stocks",
    text: "Open Film Looks, the window of cards, as from the Window menu and ⇧⌘L. Hide, for every built-in folder, comes with slice 3.",
    status: "building",
  },
];

const RECIPES_NOTES: Note[] = [
  {
    n: 1,
    title: "Presets only",
    text: "Favorites, My Recipes and your lists, Essentials, Portrait, Landscape, Street, Film-inspired, Camera Recipes, Black & White, Night, Mood and Installed. Which recipes are looks is decided in one place, Recipe.isLook (slice 1).",
    status: "building",
  },
  {
    n: 2,
    title: "A row that sets a Base Look is marked",
    text: "Its look's icon where the look has one, as the moods show their film's today, and the Base Looks symbol otherwise; the tooltip says Also sets the Base Look: Chrome. 24 of the 39 starter recipes and all 20 moods are marked.",
    status: "building",
  },
  {
    n: 3,
    title: "The + menu",
    text: "Create Recipe from Current Edit… (⇧⌘N) and Import Recipe or Lightroom Preset…. LUTs import from Base Looks. A drop on either panel puts each file in the panel it belongs in, opening the folders it went to.",
    status: "building",
  },
  {
    n: 4,
    title: "Search finds recipes only",
    text: "No Base Looks heading after the recipes any more (PNL-9 reversed); Lightroom's words still work. When nothing matches, a second line says looks and film stocks are in Base Looks: searching velvia still finds the mood Velvia Landscapes, a preset.",
    status: "building",
  },
  {
    n: 5,
    title: "Right-click a recipe",
    text: "Add to Favorites, Apply Base Look Only for a recipe with a look, Export…, Duplicate to My Recipes. Your own and installed recipes add Show in Finder and Move to Trash, which replaces Delete Recipe (slice 3).",
    status: "building",
  },
];

const ELSEWHERE_NOTES: Note[] = [
  {
    n: 1,
    title: "⌘K › Base Look",
    text: "The panel's folders and looks, hidden folders left out, a favourite listed once under Favorites. Arrowing previews a look as a click applies it; ↵ applies it, a film stock with its grain, halation and bloom.",
    status: "building",
  },
  {
    n: 2,
    title: "⌘K › Recipes",
    text: "The presets the Recipes panel lists, in its sections. Without the split, film stocks would be on neither page.",
    status: "building",
  },
  {
    n: 3,
    title: "The Film Looks window",
    text: "A card's click chooses its film as the panel does, keeping the rest of Effects; the card showing the photo's film is the applied one, and the header's Amount is the Base Look's. ⌥ shows the photo on Fixer Color without the film.",
    status: "building",
  },
  {
    n: 4,
    title: "Drops on either panel",
    text: "Each file goes to the panel it belongs in, a recipe or preset to Recipes and a LUT to Base Looks, and the folders it went to open, as DRP-5's drop does.",
    status: "building",
  },
];

const MANAGE_NOTES: Note[] = [
  {
    n: 1,
    title: "Show in Finder",
    text: "Selects the file Fixer keeps: the recipe in Application Support/Fixer/Recipes, or Recipes/Installed. For an imported look it's the recipe that holds it; for a Lightroom preset, the recipe made from it.",
    status: "planned",
  },
  {
    n: 2,
    title: "Move to Trash",
    text: "Moves that file to the Trash, recoverable from there. The look stays in Looks/ so the edits that use it keep rendering, and no list shows it again: today a deleted LUT's look comes back under Installed in Basic's menu. The model is in slice 1.",
    status: "planned",
  },
  {
    n: 3,
    title: "Hide a built-in folder",
    text: "Takes the folder and its items out of its panel, its search and ⌘K. A photo with a hidden look keeps rendering, and the Amount row still names it. Your own lists aren't hidden; their recipes go to the Trash.",
    status: "planned",
  },
  {
    n: 4,
    title: "Showing them again",
    text: "Each panel's header menu, beside Expand All Panels, lists its hidden folders. Hidden folders are one preference for both panels (Recipes/hidden-folders.json), as Lightroom Classic's Manage Presets hides groups.",
    status: "planned",
  },
];

// ---------------------------------------------------------------- the data

const data: WireframesData = {
  title: "Base Looks and Recipes: wireframes",
  intro:
    "The left column's Base Looks panel and the Recipes panel as presets (RUL-31, PNL-17, PNL-18), drawn from the design (docs/plans/2026-10-16-looks-column-design.md), the owner's six decisions of 16 October 2026 and the code on the branch looks-column (the model, 4e91a0c; the panel, d17b5f2). Merged from two chats' drawings; the owner answered its questions the same day. 16 October 2026.",
  updated: "2026-10-16T09:50:00+01:00",
  reading:
    "Boxes are regions, numbers point to the notes under each wireframe, and the counts of Fixer's own looks and recipes are real; your recipes, imports and camera profiles are made up. In the lists, ▸ and ▾ are closed and open folders, ▮ a film's icon, ◎ the Base Looks symbol, ▣ an imported LUT, and ↖ the row under the pointer. Every region says where it stands:",
  statuses: {
    built: { label: "Built", meaning: "In the app on main today, as drawn." },
    building: { label: "Being built", meaning: "Being built on the branch looks-column now (slice 2), on slice 1's model (4e91a0c)." },
    planned: { label: "Planned", meaning: "In this work's later slices: removing and hiding (slice 3), then scenarios and docs (slice 4)." },
    later: { label: "Later", meaning: "After this work, as the design's Later says." },
    you: { label: "Waits on you", meaning: "Waiting on one of the questions; all of them are answered." },
  },
  flow: [
    { title: "Find the look", text: "Base Looks, under Folders: browse its folders, or search for kodak, slide or black and white.", status: "building" },
    {
      title: "Hover, then click",
      text: "Hover previews the look as a click applies it: one History step. A film stock brings its grain, halation and bloom, and nothing else.",
      status: "building",
    },
    { title: "Set its strength", text: "The panel's first row names the photo's look with its Amount, 0 to 200: the same value as Basic's.", status: "building" },
    {
      title: "Start from a preset",
      text: "Recipes, below, lists presets only. A row that also sets a Base Look shows that look's icon or the Base Looks symbol.",
      status: "building",
    },
    {
      title: "Keep the lists tidy",
      text: "Show in Finder and Move to Trash for your own recipes and imported looks; hide the built-in folders you don't use.",
      status: "planned",
    },
  ],
  principles: [
    { title: "The look first", text: "Base Looks sits above Recipes, in the order of the work: the look, then the edit." },
    {
      title: "One choice wherever a look is chosen",
      text: "The panel, Basic's menu and browser, the Film Looks window and ⌘K all apply a look as LookChoice does: a film stock with its own grain, halation and bloom, which leaving it takes away.",
    },
    { title: "Each look listed once", text: "Film stocks, the firmware model's simulations and imported LUTs move from Recipes to Base Looks; Recipes keeps the presets." },
    {
      title: "Nothing renders differently",
      text: "Edits keep their settings and their applied recipe, so there's no new process version. The CLI and the MCP server apply the film recipes as before.",
    },
    {
      title: "Nothing goes at once",
      text: "Move to Trash replaces Delete Recipe, which removed the file without asking; a look moved to the Trash keeps rendering in the edits that use it, listed nowhere.",
    },
  ],
  screens: [
    {
      id: "column",
      name: "The column",
      title: "The left column",
      summary:
        "Develop with Portra 400 chosen as the photo's look. Navigator, Folders, Base Looks, Recipes, Snapshots and History, from top to bottom, scrolling together under the Navigator.",
      notes: COLUMN_NOTES,
    },
    {
      id: "base-looks",
      name: "Base Looks",
      title: "The Base Looks panel",
      summary:
        "Browsing with CineStill 800T under the pointer, then searching for kodak with a stock's menu open. Hovering previews a look as a click applies it; a click is one History step.",
      drawings: [
        { id: "browse", title: "Browsing", notes: BROWSE_NOTES },
        { id: "search", title: "Searching", notes: SEARCH_NOTES },
      ],
      tables: [
        {
          title: "Search words that list a whole kind",
          headers: ["Word", "Lists", "Status"],
          rows: [
            ["profile, profiles", "The photo's camera profiles, In This Photo, Fixer's six and Reproduction", "building"],
            ["film", "The 36 film stocks and the 15 Film Styles", "building"],
            ["simulation", "The firmware model's simulations, the Fujifilm LUTs and the Film Styles", "building"],
            ["LUT, cube", "Fujifilm's LUTs and the ones you imported", "building"],
            ["slide, negative, cinema, black and white", "The stocks of that kind, from their format", "building"],
          ],
        },
      ],
    },
    {
      id: "recipes",
      name: "Recipes",
      title: "The Recipes panel, as presets",
      summary: "Browsing just after applying Golden Leak (left), and a search that finds nothing (right).",
      notes: RECIPES_NOTES,
    },
    {
      id: "elsewhere",
      name: "⌘K and Film Looks",
      title: "⌘K, the Film Looks window and drops",
      summary: "The other places a look is chosen choose it as the panel does.",
      notes: ELSEWHERE_NOTES,
    },
    {
      id: "manage",
      name: "Removing and hiding",
      title: "Removing and hiding (PNL-18)",
      summary: "The menus of each kind of row, and of a panel's header once Mood and Film Styles are hidden.",
      notes: MANAGE_NOTES,
      tables: [
        {
          title: "What each row offers",
          headers: ["Row", "Show in Finder", "Move to Trash", "Hide"],
          rows: [
            ["A recipe of yours: My Recipes and your lists", "Yes", "Yes", "No"],
            ["An installed recipe, or one made from a Lightroom preset", "Yes", "Yes", "No"],
            ["A bundled recipe: Essentials to Mood", "No", "No", "Its folder"],
            ["An imported LUT: Imported, Fujifilm LUTs", "The recipe that holds it", "Yes; its look keeps rendering", "No"],
            ["Fixer's looks, Film Styles, Film Stocks, Reproduction", "No", "No", "Its folder"],
            ["The firmware model's simulations", "No", "No", "Its folder"],
            ["Adobe's camera profiles", "No", "No", "Question 2"],
            ["An installed look no recipe uses", "Question 3", "Question 3", "No"],
          ],
        },
      ],
    },
    {
      id: "choosing",
      name: "Choosing a look",
      title: "What choosing a look applies",
      summary:
        "One choice in FixerRecipes, LookChoice, wherever a look is chosen (decisions 3, 6 and 7). A film stock sets its look, Black & White when it's monochrome, and its eight grain, halation and bloom settings, those it doesn't list at their defaults. A look that isn't a film, chosen over one, returns those eight to their defaults; chosen over a look that isn't a film, it leaves them. A colour look chosen in place of a monochrome one sets Color, and Black & White you chose on a colour look stays. Nothing else changes.",
      tables: [
        {
          title: "Where a look is chosen",
          headers: ["Where", "A click applies", "Hover previews", "Status"],
          rows: [
            ["The Base Looks panel: a click", "LookChoice: the look, a film's own grain, halation and bloom", "The look as a click applies it", "building"],
            ["Basic › Base Look menu", "LookChoice, since slice 1", "No, as today", "building"],
            ["Basic › Browse Base Looks…", "LookChoice", "The look as a click applies it", "building"],
            ["The Film Looks window (⇧⌘L)", "LookChoice; its header Amount becomes the Base Look's", "The film as a click applies it; ⌥ shows the photo before", "building"],
            ["⌘K › Base Looks", "LookChoice, for every look the panel lists, film stocks included", "As the panel", "building"],
            ["A recipe with a look, in Recipes", "The recipe, its look included (decision 2)", "The recipe", "built"],
            ["Apply Base Look Only, in a recipe's menu", "The look alone, without a film's grain", "The look alone, while highlighted", "building"],
            ["The CLI and the MCP server", "The bundled film recipes, as today", "", "built"],
          ],
        },
        {
          title: "Later, not in this work",
          headers: ["What", "Status"],
          rows: [
            ["One visual browser for every look, the Film Looks window grown to cover them all, in place of Basic's Browse Base Looks popover", "later"],
            ["A shorter Basic menu, if the panel makes it redundant", "later"],
          ],
        },
      ],
    },
  ],
  questions: [
    {
      id: "open-folders",
      title: "Which Base Looks folders start open?",
      now: "Built with A. Recipes opens Favorites, My Recipes and Essentials; Base Looks has up to twelve folders, Film Stocks alone 36 rows. An import opens the folder it went to.",
      options: [
        "Favorites, Fixer, and the folder holding the photo's look, opened again for each photo",
        "Favorites, In This Photo and Fixer, the rest closed",
        "Every folder open",
      ],
      lean: "A: the photo's look is in view without scrolling, a few starred stocks sit at the top, and the 36 stocks don't push Recipes off the screen.",
      answer: "A, as built: Favorites, Fixer and the folder holding the photo's look, that folder opening again for each photo. (16 October)",
    },
    {
      id: "mark-look",
      title: "How does the panel mark the photo's look in its folder?",
      now: "Built with A. The Amount row at the top names it either way; Basic's menu checks it, and History highlights its current step.",
      options: ["Its row highlighted, as History highlights the current step", "A checkmark after its name, as Basic's menu has", "Not marked: the Amount row names it"],
      lean: "A: it reads as the current choice without taking room, as the column's History already shows one.",
      answer: "A, as built: its row highlighted, as History highlights the current step. (16 October)",
    },
    {
      id: "creative-groups",
      title: "Where do Adobe's creative profile groups go?",
      now: "Built with A. Basic's menu nests Artistic, B&W, Modern and Vintage under Creative.",
      options: ["One Creative folder, holding a folder for each group, as the menu nests them", "Each creative group a folder of its own, beside Adobe Raw"],
      lean: "A: the panel stays as short as the menu, and reaching the film stocks doesn't mean scrolling past four Adobe folders.",
      answer: "A, as built: one Creative folder holding a folder for each group. (16 October)",
    },
    {
      id: "search-folder",
      title: "Does a search result show its folder?",
      now: 'Built with A. Searching "chrome" finds Chrome (Film Styles), Classic Chrome (Firmware Model), Kodachrome 64 (Film Stocks) and an imported CLASSIC CHROME LUT, which do different things.',
      options: ["Its folder at the end of its row, in the quieter colour", "Names only, as Recipes' results are"],
      lean: "A: the folder tells the kinds of chrome apart without hovering each.",
      answer: "A, as built: its folder at the end of its row, in the quieter colour. (16 October)",
    },
    {
      id: "hide-profiles",
      title: "Can Adobe's camera profile folders be hidden?",
      now: "The design lets built-in folders be hidden. Adobe Raw, Camera Matching and the creative groups come with Camera Raw on this Mac; your own profiles are files you chose.",
      options: ["Adobe Raw, Camera Matching and Creative hide as built-in folders do; your own profiles don't", "No camera profile folder can be hidden"],
      lean: "A: they're folders you didn't make, and someone who doesn't use Adobe's profiles shouldn't scroll past them on every photo.",
      answer: "A, for slice 3: Adobe Raw, Camera Matching and Creative hide as built-in folders do; your own profiles don't. (16 October)",
    },
    {
      id: "unused-looks",
      title: "What can you do with an installed look no recipe uses?",
      now: "Looks left by today's Delete Recipe are listed under Imported. Their files in Looks/ are named by their content and kept for the edits that use them.",
      options: [
        "Remove from Base Looks: listed nowhere afterwards, its file kept for its edits; no Show in Finder",
        "Show in Finder selects its file in Looks/, and Move to Trash lists it nowhere",
        "Nothing: they stay listed",
      ],
      lean: "A: Move to Trash would move nothing to the Trash, and a file named by its hash means nothing in Finder.",
      answer: "A, for slice 3: Remove from Base Looks, which lists it nowhere and keeps its file for its edits; no Show in Finder. (16 October)",
    },
    {
      id: "colour-after-mono",
      title: "Does a colour look chosen after a monochrome one set Color?",
      now: "Black & White stays on, as Basic's menu and the film recipes leave it today: Portra 400 chosen after Tri-X 400 renders Portra in black and white. Lightroom's colour profiles set Color.",
      options: ["Leave the treatment as it is, as today", "A colour look chosen in place of a monochrome one sets Color; Black & White you chose on a colour look stays"],
      lean: "B, as decision 6 does for a film's grain: what the monochrome look brought leaves with it, and what you chose stays. It's a change to LookChoice, made only once you've answered.",
      answer:
        "B: a colour look chosen in place of a monochrome one sets Color, as Lightroom's colour profiles do, and Black & White chosen on a colour look stays; LookChoice does it wherever a look is chosen. (16 October)",
    },
  ],
};

// ---------------------------------------------------------------- rows and menus

type Look = {
  label: string;
  depth?: number;
  folder?: boolean;
  open?: boolean;
  icon?: "film" | "looks";
  star?: boolean;
  cube?: boolean;
  current?: boolean;
  hover?: boolean;
  dim?: boolean;
  count?: string;
  /** A search result's folder, at the end of its row. */
  after?: string;
};

/** A panel's rows: folders with ▸ or ▾, looks with ▮ (a film) or ◎ (the Base Looks symbol), ★ and ▣ at the end, ↖ under the pointer. */
function rows(items: Look[]): SideListItem[] {
  return items.map((r) => ({
    label: `${r.folder ? (r.open ? "▾ " : "▸ ") : ""}${r.icon === "film" ? "▮ " : r.icon === "looks" ? "◎ " : ""}${r.label}${r.hover ? " ↖" : ""}`,
    count: r.count ?? r.after ?? (r.star ? "★" : r.cube ? "▣" : undefined),
    depth: r.depth,
    selected: r.current,
    dim: r.dim,
  }));
}

/** A menu's items: "—" a separator, "› " the highlighted one, a key after three spaces. */
function menu(items: string[]): SideListItem[] {
  return items.map((item) => {
    if (item === "—") return { label: "", separator: true };
    const [label, key] = item.replace(/^› /, "").split("   ");
    return { label, count: key, selected: item.startsWith("› ") };
  });
}

function PanelHeader({ title }: { title: string }) {
  return (
    <Row justify="between" align="center">
      <Heading level={3}>{`▾ ${title}`}</Heading>
      <Text size="sm" tone="secondary">
        +
      </Text>
    </Row>
  );
}

// ---------------------------------------------------------------- the column

function TheColumn() {
  return (
    <Wireframe
      toolbar={
        <Text as="span" size="sm" tone="muted">
          Develop · DSCF4127.RAF
        </Text>
      }
      columns="250px minmax(0, 1fr) 230px"
    >
      <Stack gap={8}>
        <Region n={1} label="Navigator" status="built">
          <Placeholder h={54} />
        </Region>
        <Region n={2} label="Folders" status="built">
          <SideList items={rows([{ label: "2026-10-12 Lisbon", folder: true }, { label: "2026-10-15 Studio", folder: true }])} />
        </Region>
        <Region n={3} label="Base Looks" status="building">
          <TextInput placeholder="Search Base Looks" />
          <Slider label="▮ Portra 400" value={100} min={0} max={200} />
          <SideList
            items={rows([
              { label: "Favorites", folder: true },
              { label: "Fixer", folder: true },
              { label: "Film Styles", folder: true },
              { label: "Film Stocks", folder: true },
              { label: "Fujifilm LUTs", folder: true },
              { label: "Reproduction", folder: true },
            ])}
          />
        </Region>
        <Region n={4} label="Recipes" status="building">
          <TextInput placeholder="Search Recipes" />
          <SideList
            items={rows([
              { label: "Favorites", folder: true },
              { label: "My Recipes", folder: true },
              { label: "Essentials", folder: true },
              { label: "Mood", folder: true },
            ])}
          />
        </Region>
        <Region n={5} label="Snapshots · History" status="built">
          <SideList items={rows([{ label: "Base Look  Portra 400" }, { label: "Import", dim: true }])} />
        </Region>
      </Stack>
      <Placeholder h={520}>The photo, in Portra 400</Placeholder>
      <Stack gap={8}>
        <Region n={6} label="Basic" status="building">
          <Field name="Base Look" value="Portra 400 ⌄" />
          <Slider label="Amount" value={100} min={0} max={200} />
        </Region>
      </Stack>
    </Wireframe>
  );
}

// ---------------------------------------------------------------- Base Looks

function BaseLooksBrowse() {
  return (
    <Wireframe frame="none" columns="minmax(0, 1fr) minmax(0, 1fr)" gap={14}>
      <Region label="Browsing" status="building">
        <Stack gap={6}>
          <Row gap={6}>
            <Marker n={1} />
            <Marker n={2} />
            <Marker n={3} />
          </Row>
          <PanelHeader title="Base Looks" />
          <TextInput placeholder="Search Base Looks" />
          <Slider label="▮ Portra 400" value={100} min={0} max={200} />
          <Marker n={4} />
          <SideList
            items={rows([
              { label: "Favorites", folder: true, open: true, count: "2" },
              { label: "Portra 400", depth: 1, icon: "film", star: true, current: true },
              { label: "Chrome", depth: 1, star: true },
            ])}
          />
          <Marker n={5} />
          <SideList
            items={rows([
              { label: "In This Photo", folder: true, count: "1" },
              { label: "Adobe Raw", folder: true, count: "6" },
              { label: "Camera Matching", folder: true, count: "9" },
              { label: "Creative", folder: true, count: "4" },
            ])}
          />
          <Marker n={6} />
          <SideList
            items={rows([
              { label: "Fixer", folder: true, open: true, count: "6" },
              { label: "Fixer Color", depth: 1 },
              { label: "Fixer Neutral", depth: 1 },
              { label: "Fixer Vivid", depth: 1 },
              { label: "Fixer Landscape", depth: 1 },
              { label: "Fixer Portrait", depth: 1 },
              { label: "Fixer Monochrome", depth: 1 },
              { label: "Film Styles", folder: true, count: "15" },
              { label: "Film Stocks", folder: true, open: true, count: "36" },
              { label: "Portra 160", depth: 1, icon: "film" },
              { label: "Portra 400", depth: 1, icon: "film", star: true, current: true },
              { label: "Portra 400 · +2", depth: 1, icon: "film" },
              { label: "Portra 800", depth: 1, icon: "film" },
              { label: "CineStill 800T", depth: 1, icon: "film", hover: true },
              { label: "CineStill 50D", depth: 1, icon: "film" },
            ])}
            note="CineStill 800T is under the pointer: the photo previews it with its halation and bloom, the vignette kept."
          />
          <Marker n={7} />
          <SideList
            items={rows([
              { label: "Firmware Model", folder: true, count: "20" },
              { label: "Fujifilm LUTs", folder: true, count: "10" },
              { label: "Imported", folder: true, open: true, count: "1" },
              { label: "Teal Night", depth: 1, cube: true },
              { label: "Reproduction", folder: true, count: "1" },
            ])}
          />
        </Stack>
      </Region>
      <Stack gap={10}>
        <Region n={1} label="The + menu" status="building" dashed>
          <SideList items={menu(["Import LUT (.cube, .3dl or HaldCLUT)…", "Choose Camera Profiles…", "—", "Get Fujifilm's LUTs…"])} />
        </Region>
      </Stack>
    </Wireframe>
  );
}

function BaseLooksSearch() {
  return (
    <Wireframe frame="none" columns="minmax(0, 1fr) minmax(0, 1fr)" gap={14}>
      <Stack gap={10}>
        <Region n={8} label="Searching" status="building">
          <TextInput value="kodak" />
          <Slider label="▮ Portra 400" value={100} min={0} max={200} />
          <SideList
            items={rows([
              { label: "Portra 160", icon: "film", after: "Film Stocks" },
              { label: "Portra 400", icon: "film", current: true, after: "Film Stocks" },
              { label: "Portra 800", icon: "film", after: "Film Stocks" },
              { label: "Ektar 100", icon: "film", after: "Film Stocks" },
              { label: "Gold 200", icon: "film", after: "Film Stocks" },
              { label: "UltraMax 400", icon: "film", after: "Film Stocks" },
              { label: "Vision3 500T · 2383", icon: "film", after: "Film Stocks" },
              { label: "Ektachrome E100", icon: "film", after: "Film Stocks" },
              { label: "Tri-X 400", icon: "film", hover: true, after: "Film Stocks" },
            ])}
            note="The rest scroll below."
          />
        </Region>
      </Stack>
      <Stack gap={10}>
        <Region n={9} label="Right-click Tri-X 400" status="building" dashed>
          <SideList
            items={menu(["Add to Favorites", "› Apply Without Grain, Halation and Bloom"])}
            note="Highlighted: the photo shows Tri-X 400 in black and white, without its grain."
          />
        </Region>
        <Region n={10} label="Right-click Film Stocks" status="building" dashed>
          <SideList items={menu(["Open Film Looks", "—", "Hide “Film Stocks”"])} />
        </Region>
      </Stack>
    </Wireframe>
  );
}

// ---------------------------------------------------------------- Recipes

function RecipesPanel() {
  return (
    <Wireframe frame="none" columns="minmax(0, 1fr) minmax(0, 1fr)" gap={14}>
      <Region label="Browsing" status="building">
        <Stack gap={6}>
          <Row gap={6}>
            <Marker n={1} />
            <Marker n={2} />
          </Row>
          <PanelHeader title="Recipes" />
          <TextInput placeholder="Search Recipes" />
          <Slider label="Amount" value={100} min={0} max={200} />
          <SideList
            items={rows([
              { label: "Favorites", folder: true, open: true, count: "1" },
              { label: "Golden Hour", depth: 1, star: true },
              { label: "My Recipes", folder: true, open: true, count: "2" },
              { label: "Client Warm", depth: 1 },
              { label: "Lisbon Chrome", depth: 1, icon: "looks" },
              { label: "Essentials", folder: true, open: true, count: "7" },
              { label: "Punchy", depth: 1, icon: "looks" },
              { label: "Clean & Bright", depth: 1 },
              { label: "Moody", depth: 1 },
              { label: "Portrait", folder: true, count: "4" },
              { label: "Landscape", folder: true, count: "4" },
              { label: "Street", folder: true, count: "4" },
              { label: "Film-inspired", folder: true, count: "6" },
              { label: "Camera Recipes", folder: true, count: "6" },
              { label: "Black & White", folder: true, count: "5" },
              { label: "Night", folder: true, count: "3" },
              { label: "Mood", folder: true, open: true, count: "20" },
              { label: "Golden Leak", depth: 1, icon: "film", hover: true },
              { label: "Summer '98", depth: 1, icon: "film" },
              { label: "Installed", folder: true, count: "2" },
            ])}
            note="Golden Leak's tooltip: Also sets the Base Look: Portra 400."
          />
        </Stack>
      </Region>
      <Stack gap={10}>
        <Region n={3} label="The + menu" status="building" dashed>
          <SideList items={menu(["Create Recipe from Current Edit…   ⇧⌘N", "Import Recipe or Lightroom Preset…"])} />
        </Region>
        <Region n={4} label="Searching" status="building">
          <TextInput value="t-max" />
          <SideList
            items={rows([
              { label: "No matching recipes", dim: true },
              { label: "Looks and film stocks are in Base Looks", dim: true },
            ])}
          />
        </Region>
        <Region n={5} label="Right-click Lisbon Chrome" status="building" dashed>
          <SideList items={menu(["Add to Favorites", "Apply Base Look Only", "Export…", "Duplicate to My Recipes", "—", "Show in Finder", "Move to Trash"])} />
        </Region>
      </Stack>
    </Wireframe>
  );
}

// ---------------------------------------------------------------- ⌘K, the Film Looks window and drops

function Elsewhere() {
  return (
    <Stack gap={12}>
      <Wireframe frame="none" columns="minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.3fr)" gap={12}>
        <Region n={1} label="⌘K › Base Look" status="building">
          <TextInput value="Base Look ›" />
          <SideList
            items={rows([
              { label: "Favorites", folder: true, open: true },
              { label: "Portra 400", depth: 1, icon: "film" },
              { label: "Fixer", folder: true, open: true },
              { label: "Fixer Color", depth: 1 },
              { label: "Film Stocks", folder: true, open: true },
              { label: "Ektar 100", depth: 1, icon: "film", current: true },
              { label: "Firmware Model", folder: true },
            ])}
            note="Highlighted: the photo previews Ektar 100 with its grain; ↵ applies it."
          />
        </Region>
        <Region n={2} label="⌘K › Recipes" status="building">
          <TextInput value="Recipes ›" />
          <SideList
            items={rows([
              { label: "Essentials", folder: true, open: true },
              { label: "Punchy", depth: 1 },
              { label: "Clean & Bright", depth: 1, current: true },
              { label: "Mood", folder: true, open: true },
              { label: "Golden Leak", depth: 1 },
            ])}
            note="No film stocks or LUTs: they're on the Base Look page."
          />
        </Region>
        <Region n={3} label="Window › Film Looks" status="building" dashed>
          <Text size="sm" weight="bold">
            Film Looks
          </Text>
          <Slider label="Portra 400" value={100} min={0} max={200} />
          <SideList
            items={rows([
              { label: "Portra 400 · applied", icon: "film", current: true },
              { label: "Ektar 100", icon: "film" },
              { label: "CineStill 800T", icon: "film", hover: true },
            ])}
            note="Cards drawn as rows here. Hovering CineStill 800T previews it, its halation and bloom included."
          />
        </Region>
      </Wireframe>
      <Region n={4} label="A drop on Base Looks or Recipes" status="building">
        <Row gap={18} align="center" wrap>
          {[
            ["Classic Chrome.cube", "Base Looks › Imported, opened"],
            ["Wedding.xmp", "Recipes › Lightroom, opened"],
            ["Street.fixerrecipe", "Recipes › Installed, opened"],
          ].map(([file, to]) => (
            <Text key={file} size="sm">
              {`${file} `}
              <Text as="span" tone="muted">
                {`→ ${to}`}
              </Text>
            </Text>
          ))}
        </Row>
      </Region>
    </Stack>
  );
}

// ---------------------------------------------------------------- Removing and hiding

function Manage() {
  return (
    <Wireframe frame="none" columns="minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)" gap={12}>
      <Region n={1} label="Right-click Lisbon Chrome" status="planned" dashed>
        <SideList items={menu(["Add to Favorites", "Apply Base Look Only", "Export…", "Duplicate to My Recipes", "—", "› Show in Finder", "Move to Trash"])} />
      </Region>
      <Region n={2} label="Right-click Teal Night" status="planned" dashed>
        <SideList items={menu(["Add to Favorites", "—", "Show in Finder", "› Move to Trash"])} note="An imported LUT in Base Looks › Imported." />
      </Region>
      <Region n={3} label="Right-click Mood" status="planned" dashed>
        <SideList items={menu(["› Hide “Mood”"])} />
      </Region>
      <Region n={4} label="The Recipes header's menu" status="planned" dashed>
        <SideList items={menu(["Expand All Panels", "Collapse All Panels", "—", "Show “Mood”"])} note="Base Looks' header lists its own: Show “Film Styles”." />
      </Region>
    </Wireframe>
  );
}

// ---------------------------------------------------------------- Choosing a look

type Film = { grain: number; halation: number; bloom: number };
type LookChoice = { name: string; film?: Film; mono?: boolean };

const LOOKS: LookChoice[] = [
  { name: "Portra 400", film: { grain: 20, halation: 8, bloom: 0 } },
  { name: "CineStill 800T", film: { grain: 26, halation: 70, bloom: 8 } },
  { name: "Tri-X 400", film: { grain: 37, halation: 5, bloom: 0 }, mono: true },
  { name: "Fixer Color" },
  { name: "Fixer Vivid" },
  { name: "Chrome" },
];

type Edit = { look: LookChoice; grain: number; halation: number; bloom: number; vignette: number; treatment: string; steps: string[] };

const START: Edit = { look: LOOKS[3], grain: 0, halation: 0, bloom: 0, vignette: -25, treatment: "Color", steps: ["Vignette  −25"] };

/** LookChoice, as built (LookChoice.apply): the film's three amounts stand for its eight settings. */
function choose(edit: Edit, look: LookChoice, withEffects = true): Edit {
  const next = { ...edit, look, steps: [`Base Look  ${look.name}${look.film && !withEffects ? ", without grain" : ""}`, ...edit.steps] };
  if (look.mono) next.treatment = "Black & White";
  else if (edit.look.mono) next.treatment = "Color";
  if (look.film && withEffects) {
    next.grain = look.film.grain;
    next.halation = look.film.halation;
    next.bloom = look.film.bloom;
  } else if (edit.look.film) {
    next.grain = 0;
    next.halation = 0;
    next.bloom = 0;
  }
  return next;
}

/** Illustrative: choosing looks one after another, and what each leaves on the photo. */
function Playground() {
  const [edit, setEdit] = useCanvasState<Edit>("choose-edit", START);
  return (
    <Region label="Try it" status="building">
      <Stack gap={10}>
        <Text size="sm" tone="secondary">
          Illustrative: the photo starts on Fixer Color with a vignette you set. Click looks to choose them, add grain of your own, or choose CineStill 800T without its effects, and
          watch what changes.
        </Text>
        <Row gap={6} wrap>
          {LOOKS.map((look) => (
            <Chip key={look.name} selected={edit.look.name === look.name} onClick={() => setEdit(choose(edit, look))}>
              {look.name}
            </Chip>
          ))}
          <Chip onClick={() => setEdit({ ...edit, grain: 30, steps: ["Grain Amount  30", ...edit.steps] })}>Grain Amount 30</Chip>
          <Chip onClick={() => setEdit(choose(edit, LOOKS[1], false))}>CineStill 800T, Apply Without Grain…</Chip>
          <Chip onClick={() => setEdit(START)}>Start again</Chip>
        </Row>
        <Wireframe frame="none" columns="minmax(0, 1fr) minmax(0, 1fr)" gap={16}>
          <Table
            dense
            headers={["Setting", "Now"]}
            rows={[
              ["Base Look", edit.look.name],
              ["Treatment", edit.treatment],
              ["Grain Amount", String(edit.grain)],
              ["Halation", String(edit.halation)],
              ["Bloom", String(edit.bloom)],
              ["Vignette", String(edit.vignette)],
            ]}
          />
          <Stack gap={2}>
            <Heading level={3}>History, newest first</Heading>
            {edit.steps.slice(0, 7).map((step, i) => (
              <Text key={`${i}-${step}`} size="sm" tone={i === 0 ? "default" : "muted"}>
                {step}
              </Text>
            ))}
          </Stack>
        </Wireframe>
        <Text size="sm" tone="muted">
          Grain, Halation and Bloom stand for the film's eight settings, each size, roughness and colour with them. Tri-X 400 then Portra 400 sets Color, as Lightroom's colour
          profiles do (decision 7).
        </Text>
      </Stack>
    </Region>
  );
}

// ---------------------------------------------------------------- the canvas

export default function BaseLooksWireframes() {
  return (
    <Wireframes
      data={data}
      drawings={{
        column: <TheColumn />,
        browse: <BaseLooksBrowse />,
        search: <BaseLooksSearch />,
        recipes: <RecipesPanel />,
        elsewhere: <Elsewhere />,
        manage: <Manage />,
        choosing: <Playground />,
      }}
    />
  );
}

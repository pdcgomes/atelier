import { Chip, Field, Grid, Heading, Kbd, Marker, Meter, Placeholder, Region, Row, Segmented, SideList, Slider, Stack, Text, Wireframe } from "atelier";
import { Wireframes, type WireframesData } from "atelier/templates";
import type { ReactNode } from "react";

export const meta = { title: "Shelf: wireframes", theme: "cursor" };

type Note = { n: number; title: string; text: string; status: "built" | "building" | "planned" | "later" | "you" };

// ---------------------------------------------------------------- the notes

const SAVING_NOTES: Note[] = [
  {
    n: 1,
    title: "The paste field",
    text: "Opens from + Add link in the top bar or from the empty library's field and takes any web link; tracking parameters, credentials and fragments are stripped before it's kept. Something that isn't a link says so in the panel.",
    status: "built",
  },
  {
    n: 2,
    title: "The ladder",
    text: "Placeholder, Recognised, Generic card and Enriched, ticked as the card climbs and struck through where a link passes a rung by. The panel asks after the save until resolution has run, for up to 40 seconds. Resolution is built and tested but hasn't run in the app yet: it needs Inngest and the worker deployed.",
    status: "built",
  },
  {
    n: 3,
    title: "The card",
    text: "Art, title, byline and year as they arrive, the link, and what its grammar says (Apple Music · album). The art is the provider's image until media ingest keeps a copy on R2.",
    status: "built",
  },
  {
    n: 4,
    title: "Done",
    text: "Says whether the link was new or already in the library, then closes the panel and refreshes the wall. Escape does the same. Closing onto the new card instead is a question.",
    status: "built",
  },
  {
    n: 5,
    title: "Add to a collection",
    text: "The prototype's chip per collection, here once collections exist in Phase 2. Whether any start ticked is a question.",
    status: "planned",
  },
  { n: 6, title: "Bookmarklet", text: "Opens /add?url=… in a small window, which saves and closes (docs/planning/08).", status: "planned" },
  {
    n: 7,
    title: "Share target",
    text: "The web app's manifest makes Share → Shelf work on Android and on iOS home-screen installs, before the native app.",
    status: "planned",
  },
  {
    n: 8,
    title: "Imports",
    text: "Letterboxd and Goodreads exports, Trakt, playlist links and GitHub stars, in chunks behind interactive saves; rows that fail are listed with a retry. Spotify playlists are a question.",
    status: "planned",
  },
  {
    n: 9,
    title: "Kiroku",
    text: "Kiroku Station calls the saves API with its item id as the idempotency key and only content facets; its threads map to collections and circles here.",
    status: "planned",
  },
  {
    n: 10,
    title: "Live connections",
    text: "Apple Music library, Trakt and GitHub stars kept in step on a schedule, in the second release.",
    status: "later",
  },
];

const STUDIO_NOTES: Note[] = [
  {
    n: 1,
    title: "The top bar",
    text: "Brand, the modes with their counts, + Add link and the account. Collections and Audience show but don't open yet. The prototype's collection picker comes with collections; its View, Analysis and Share menus aren't in the first release's plan.",
    status: "built",
  },
  {
    n: 2,
    title: "The wall",
    text: "Every save, newest first, as its art or a cover in its type's colour with its initials, with title and byline; a click opens the link for now. Whether it keeps each type's shape, as the prototype does, is a question.",
    status: "built",
  },
  {
    n: 3,
    title: "Search and filters",
    text: "Words over titles, people and notes, and the type layers as filters (docs/planning/01).",
    status: "planned",
  },
  {
    n: 4,
    title: "Layers",
    text: "Every medium with its count. Hiding a type, and dimming it with the prototype's weight slider, come with the filters.",
    status: "built",
  },
  {
    n: 5,
    title: "Library overview",
    text: "Curator, items, public collections, collections and curating since. The prototype's week in numbers (added, plays, buy clicks, new subscribers) waits for analytics.",
    status: "built",
  },
  {
    n: 6,
    title: "Timeline",
    text: "An empty track today. The prototype scrubs the library through time, issues and imports marked on it, a day or a week at a time; whether it's in the first release is a question.",
    status: "you",
  },
  {
    n: 7,
    title: "Details",
    text: "What Shelf knows about the selected save: the ladder, facts by type (artist, label, tracks; network, seasons; stars, language), a preview to play, and where to open, watch or buy it, affiliate links marked ◆. Compost, restorable for 90 days, is its action.",
    status: "planned",
  },
  {
    n: 8,
    title: "Sources",
    text: "Where this save came from, how the whole library arrived, and the imports with their state. Shelf never crawls, and says so.",
    status: "planned",
  },
  {
    n: 9,
    title: "Notes",
    text: "The curator's rating and note, the issues it appears in, and who wrote it: always the curator.",
    status: "planned",
  },
];

const COLLECTION_NOTES: Note[] = [
  {
    n: 1,
    title: "The collection picker",
    text: "All saves, Unsorted, or one collection, with its subscribers or Private; sub-collections sit under their parent (docs/planning/10). The wall and inspector follow it.",
    status: "planned",
  },
  {
    n: 2,
    title: "A collection on the wall",
    text: "Its saves in order, numbered, those queued for the next issue marked Queued for #28. Order is a fractional index, so moving one touches one row.",
    status: "planned",
  },
  {
    n: 3,
    title: "The issue preview",
    text: "The real render, web at 1,280 px or email at 600 px, in the collection's look; the last issue, or a sample layout before the first.",
    status: "planned",
  },
  {
    n: 4,
    title: "The roster",
    text: "Every collection with its shape, cadence and subscribers; issue collections show the next number and the picks queued against their target.",
    status: "planned",
  },
  {
    n: 5,
    title: "The collection",
    text: "Subscribers, open and click rates, the next send and the picks queued, then shape, cadence, visibility, the last issue, how subscribers receive it, the look and affiliate tags. Preview issue and Send test.",
    status: "planned",
  },
  {
    n: 6,
    title: "Suggestions",
    text: "Saves from the library that fit the collection's type and aren't in it yet, each added with +. Where the issue itself is written is a question.",
    status: "planned",
  },
];

const ORGANISING_NOTES: Note[] = [
  {
    n: 1,
    title: "Sources",
    text: "All saves, Unsorted and the collections, sub-collections under their parent one level deep, each with its own audience. A private parent is a folder only the curator sees.",
    status: "planned",
  },
  {
    n: 2,
    title: "Unsorted",
    text: "Every new save starts here and stays until a collection claims it. It's a place, with no badge, count or completion state; imports can be filtered apart so they don't bury the week's saves.",
    status: "planned",
  },
  {
    n: 3,
    title: "Suggested collection",
    text: "Unsorted saves that belong together, proposed as a new private collection; Not now is remembered. Patron, in the second release.",
    status: "later",
  },
  {
    n: 4,
    title: "Why it's here",
    text: "On a save's Details: each collection it's in and how it got there, by hand, a rule or auto-filing, with Move and Take out. What the curator placed is never moved, and what they took out is never put back.",
    status: "planned",
  },
  {
    n: 5,
    title: "Rules",
    text: "The surfacing rules (docs/planning/06) pointed at collections: a match on type, source, rating or Kiroku thread, filed at once or asked about first. Phase 3.",
    status: "planned",
  },
  {
    n: 6,
    title: "Waiting an hour",
    text: "A save filed automatically into a collection a circle or the public sees waits the same hour as a circle share, with Pull back.",
    status: "planned",
  },
  {
    n: 7,
    title: "A collection's sentence",
    text: "What belongs in a collection, in the curator's words, judged by a model on the leading candidate; the one place their words override the machinery. Patron, in the second release.",
    status: "later",
  },
];

const ISSUE_NOTES: Note[] = [
  {
    n: 1,
    title: "Masthead",
    text: "The curator, their profile link and one line about them, with Subscribe and the readers count.",
    status: "planned",
  },
  {
    n: 2,
    title: "Cover",
    text: "The collection and number, the headline, the date and how long it takes to read, beside a collage of the issue's covers and its stamp.",
    status: "planned",
  },
  {
    n: 3,
    title: "Letter and contents",
    text: "The curator's intro, never generated, and what's in the issue, numbered.",
    status: "planned",
  },
  {
    n: 4,
    title: "Spreads",
    text: "One per pick, shaped by its type (a film band, a book cover, a repo's terminal), with the curator's note, the facts, previews that play and where to listen, watch, read or buy it; affiliate links marked ◆ and where a pick came from (via @tomas).",
    status: "planned",
  },
  { n: 5, title: "Also on my radar", text: "Four smaller picks with one or two links each.", status: "planned" },
  {
    n: 6,
    title: "Outro and replies",
    text: "The curator signs off; replies go to them by email, never to a comment section.",
    status: "planned",
  },
  {
    n: 7,
    title: "More and the footer",
    text: "The curator's other public collections to subscribe to, then Manage subscription, Unsubscribe, RSS, All issues and the affiliate disclosure.",
    status: "planned",
  },
  {
    n: 8,
    title: "Subscribe",
    text: "Email for each issue, the Shelf feed or RSS, with double opt-in: nothing arrives until the link in the confirmation is tapped. The weekly digest joins them in the second release.",
    status: "planned",
  },
  {
    n: 9,
    title: "The top of the email",
    text: "Issue and date with Read on the web, the curator and collection, the headline and a mosaic of six covers, at 600 px, stacking on phones.",
    status: "planned",
  },
  {
    n: 10,
    title: "Picks and footer",
    text: "The same picks with two actions each and the lead's preview linking to the web, then why you're getting it, Manage subscription, Unsubscribe in one click and the postal address.",
    status: "planned",
  },
];

const CIRCLE_NOTES: Note[] = [
  {
    n: 1,
    title: "The circle",
    text: "Private to its members, with who's in it, how long it's been going and what the week holds.",
    status: "planned",
  },
  {
    n: 2,
    title: "Right now",
    text: "What each member is in the middle of: an episode, a page, a record on repeat, with their progress.",
    status: "planned",
  },
  {
    n: 3,
    title: "Filters",
    text: "Everything, or one medium. Eating, the prototype's places, waits for places in the second release.",
    status: "planned",
  },
  {
    n: 4,
    title: "The feed",
    text: "The week's shares grouped by medium, each with the member's note; This week or As it happens, newest first.",
    status: "planned",
  },
  {
    n: 5,
    title: "What you share",
    text: "A rule per kind of thing, from wherever it's saved: Private, Ask me (it waits in the Studio) or Share (after an hour). Private is the default (docs/planning/06).",
    status: "planned",
  },
  {
    n: 6,
    title: "Waiting for you",
    text: "Saves a rule says to ask about, with Share, and automatic shares counting down their hour, with Pull back.",
    status: "planned",
  },
  {
    n: 7,
    title: "Where your tastes meet",
    text: "What members both loved or all want to try. Not in the first release's plan.",
    status: "later",
  },
  {
    n: 8,
    title: "Sunday's letter",
    text: "The week as one email to each member, laid out like an issue; the circle letter is planned for the second release.",
    status: "later",
  },
];

const KIT_NOTES: Note[] = [
  {
    n: 1,
    title: "Instagram carousel",
    text: "Eight slides at 1,080 × 1,350: the cover, a slide per pick with its note and where to find it, and Also on my radar with Subscribe.",
    status: "planned",
  },
  { n: 2, title: "Story", text: "1,080 × 1,920 with room left clear for the link sticker.", status: "planned" },
  {
    n: 3,
    title: "Video",
    text: "9:16 for TikTok, Reels and Shorts, every caption inside the area their buttons leave clear, silent so a sound can be added in the app. The picks play through an animation; the first is the knockout text from a CSS demo the curator saved.",
    status: "planned",
  },
  { n: 4, title: "Link card", text: "1,200 × 675 for X, Bluesky and Threads.", status: "planned" },
  { n: 5, title: "Pin", text: "1,000 × 1,500 for Pinterest.", status: "planned" },
  {
    n: 6,
    title: "Captions",
    text: "Ready-written text per platform with the link back, generated from the issue, never by a language model; Copy beside each.",
    status: "planned",
  },
  {
    n: 7,
    title: "Free and Patron",
    text: "Free exports carry a small Made with Shelf mark, drawn by the template, not stamped on after; Patron is clean, with the curator's handle only.",
    status: "planned",
  },
  { n: 8, title: "Animations", text: "A library that grows after launch, some premium. Which are free is a question.", status: "planned" },
  { n: 9, title: "Plans", text: "Free and Patron on Stripe in Phase 4; Guild and Label come later.", status: "planned" },
];

const ACCOUNT_NOTES: Note[] = [
  { n: 1, title: "Home", text: "What Shelf is, in a sentence and a paragraph, and Sign in.", status: "built" },
  {
    n: 2,
    title: "Sign in",
    text: "No password: a passkey from the email field's autofill or the passkey button, or an email link; Google and Apple appear once their keys are set. Errors say what to do: an expired link, a passkey Shelf doesn't recognise. Sessions last 90 days.",
    status: "built",
  },
  {
    n: 3,
    title: "Check your email",
    text: "The link works once, for 15 minutes; Nothing arrived? leads back to ask for another.",
    status: "built",
  },
  {
    n: 4,
    title: "Profile",
    text: "The handle behind shelf.example/{handle}, checked against reserved words, with name, a line about the curator and links, for the public pages in Phase 2.",
    status: "planned",
  },
  { n: 5, title: "Plan and billing", text: "Free or Patron, Stripe's checkout and billing portal, in Phase 4.", status: "planned" },
  {
    n: 6,
    title: "Export and delete",
    text: "Everything as JSON and CSV, and deleting the account with what it made, in Phase 4.",
    status: "planned",
  },
  {
    n: 7,
    title: "Account: passkeys",
    text: "Where each passkey is kept, when it was added and last used, and Remove. Adding one needs a sign-in from the last 15 minutes, otherwise a fresh email link first, and every addition is emailed. Sign out everywhere ends every session. The Studio offers a passkey right after an email or Google sign-in.",
    status: "built",
  },
];

const ATLAS_NOTES: Note[] = [
  {
    n: 1,
    title: "Tools",
    text: "Select and move, select with a box, pan, connect two things, add a lens, and show every connection. The prototype's Holotable (W) isn't planned.",
    status: "later",
  },
  {
    n: 2,
    title: "The map",
    text: "Continents, regions, covers and cards as you zoom in: Home, Music, Screen, Books, Code and Images. Shelf places each save in its region until it's moved; anything moved is pinned for good.",
    status: "later",
  },
  {
    n: 3,
    title: "Piles",
    text: "A selection made into a pile (G), named or loose, nested by dropping one into another; a named pile can become a collection.",
    status: "later",
  },
  { n: 4, title: "The tray", text: "Gathers things (T) and travels across the map to drop them somewhere else (D).", status: "later" },
  { n: 5, title: "Minimap and zoom", text: "Where you are on the whole map, and the zoom level.", status: "later" },
  {
    n: 6,
    title: "The Atlas panel",
    text: "Saves placed by Shelf and by you, the piles, and an outline of continents, regions and piles; a selection's details, similar things and actions.",
    status: "later",
  },
  { n: 7, title: "Progress", text: "How many of the batch are decided, as a contact sheet or a reel.", status: "later" },
  {
    n: 8,
    title: "Contact sheet",
    text: "Grouped by what they show, each group with Keep the rest and Skip the rest; copies folded into their original, hover scrubbing through six frames.",
    status: "later",
  },
  {
    n: 9,
    title: "Session and keepers",
    text: "Kept, skipped, later and left, the pace and time to finish, and the keepers sent to a To sort pile in the Atlas.",
    status: "later",
  },
  {
    n: 10,
    title: "Reel",
    text: "Each plays its most active three seconds and moves on; doing nothing leaves it for another pass.",
    status: "later",
  },
];

// ---------------------------------------------------------------- the data

const data: WireframesData = {
  title: "Shelf: wireframes",
  intro:
    "Every screen of Shelf's first release, and the two that follow it, drawn from what's merged on trunk (9c1d7a3), the plan in docs/planning and the prototypes in prototype/. 10 October 2026.",
  updated: "2026-10-10T17:40:00+01:00",
  overview: {
    title: "From a pasted link to a list people follow",
    text: "Shelf keeps the albums, films, shows, books and things a person loves as rich cards, and lets them share a collection with a few friends or publish it for anyone who trusts their taste. Saving a link works today; the library, publishing, circles and share kits follow in phases 1 to 4, and the Atlas and Triage in the second release.",
  },
  reading:
    "Boxes are regions, numbers point to the notes under each wireframe, and names and counts are made up, most of them taken from the prototypes. A screen with no prototype yet isn't drawn; it's a question. Every region says where it stands:",
  statuses: {
    built: { label: "Built", meaning: "Merged on trunk and tested; it shows in the app." },
    building: { label: "Being built", meaning: "An agent is building it now. Nothing is, at the moment." },
    planned: { label: "Planned", meaning: "In the first release's plan (phases 1 to 4); its engine may exist without its screen." },
    later: { label: "Later", meaning: "The second release or after." },
    you: { label: "Waits on you", meaning: "Waiting on a decision of yours, asked on the Questions tab." },
  },
  flow: [
    {
      title: "Save a link",
      text: "Paste anything; the card shows at once and fills in as Shelf recognises, reads and enriches it.",
      status: "built",
    },
    {
      title: "Keep a library",
      text: "A wall of covers with details, notes, ratings and where each came from; compost instead of delete.",
      status: "planned",
    },
    {
      title: "Collect and publish",
      text: "Evergreen lists, rolling picks and numbered issues, sent by email and RSS and shown on public pages.",
      status: "planned",
    },
    {
      title: "Share with a circle",
      text: "A private weekly feed among friends, shared by rules each member sets, with an hour to pull anything back.",
      status: "planned",
    },
    {
      title: "Post a share kit",
      text: "Carousels, stories, cards, pins and silent videos rendered from an issue, watermarked on Free.",
      status: "planned",
    },
    { title: "Map and triage", text: "The Atlas and Triage arrive in the second release, on the same library.", status: "later" },
  ],
  principles: [
    {
      title: "A work is not an item",
      text: "Albums, films and repos are shared works; each person's save keeps their note, rating and where it came from.",
    },
    {
      title: "Nothing guesses",
      text: "Cards climb from what the link itself says. A provider that doesn't know says nothing, and services cross by barcode, not by name.",
    },
    { title: "The curator's words", text: "Notes are always written by the curator. Shelf fills in facts, never opinions." },
    {
      title: "Private until shared",
      text: "Nothing leaves a library unless the curator publishes it or a rule says so, and automatic shares wait an hour.",
    },
    { title: "One render", text: "The issue page, its email, the feed and the share kit come from the same data, so they can't disagree." },
    {
      title: "Shelf never crawls or posts",
      text: "Things arrive because someone pasted, imported or shared them, and share kits are handed off, never posted.",
    },
  ],
  screens: [
    {
      id: "saving",
      name: "Saving links",
      summary: "Every way a link gets into a library, and the card it becomes. Pasting in the Studio is built; the other ways in arrive with Phase 1.",
      drawings: [
        { id: "saving-panel", notes: SAVING_NOTES.slice(0, 5) },
        { id: "saving-ways", title: "The other ways in", notes: SAVING_NOTES.slice(5) },
      ],
      tables: [
        {
          title: "What a card climbs through",
          headers: ["Rung", "What it knows", "Typical time", "Status"],
          rows: [
            ["Placeholder", "The link and its domain, shown at once", "0 ms", "built"],
            ["Recognised", "Provider, type and id from the link's own grammar, with no network", "Under 5 ms", "built"],
            ["Generic card", "Title, description, image and site from the page's head (Open Graph, oEmbed, JSON-LD)", "0.3 to 1.5 s", "built"],
            [
              "Enriched",
              "Facts, tracklist, artwork and links on other services from Apple, Deezer, MusicBrainz, the Cover Art Archive and TVmaze; films wait for TMDB",
              "1 to 5 s",
              "built",
            ],
          ],
        },
      ],
    },
    {
      id: "studio",
      name: "The Studio",
      summary: "The curator's workspace (prototype/studio): one window with the library on the canvas, an inspector on the right and time along the bottom.",
      drawings: [
        { id: "studio-window", notes: STUDIO_NOTES.slice(0, 6) },
        { id: "studio-inspector", title: "The inspector's other tabs", notes: STUDIO_NOTES.slice(6), notesColumns: 3 },
      ],
      tables: [
        {
          title: "Keys",
          headers: ["Keys", "What it does", "Status"],
          rows: [
            ["Esc", "Closes the Add link panel", "built"],
            ["Esc", "Closes a menu, the issue preview or the selection, in that order", "planned"],
            ["Space", "Plays the timeline", "later"],
            ["← →, ⇧← ⇧→", "Moves the timeline a day, or a week", "later"],
          ],
        },
      ],
    },
    {
      id: "collections",
      name: "Collections",
      title: "Collections and issues",
      summary:
        "Collections mode turns parts of the library into lists people follow: an evergreen list, rolling picks, or numbered issues sent on a cadence. Phase 2.",
      notes: COLLECTION_NOTES,
      tables: [
        {
          title: "Three shapes",
          headers: ["Shape", "What it is", "Feeds", "Status"],
          rows: [
            ["Evergreen list", "A list kept as it is, such as a desk setup", "One item per entry", "planned"],
            ["Rolling picks", "Added to as things come along, newest first", "One item per entry", "planned"],
            ["Numbered issues", "Picks queued, then sent as an issue on a cadence", "One item per issue", "planned"],
          ],
        },
      ],
    },
    {
      id: "organising",
      name: "Organising",
      summary:
        "New saves start in Unsorted and file themselves into collections, which nest one level (docs/planning/10, after Kiroku Station's threads). Nesting, Unsorted and filing by hand come with collections in Phase 2, rules in Phase 3, and learned filing on Patron in the second release.",
      notes: ORGANISING_NOTES,
      tables: [
        {
          title: "How a save gets filed",
          headers: ["How", "Example", "Tier", "Status"],
          rows: [
            ["By hand", "Drag a save onto a collection", "Free", "planned"],
            ["Rules", "Albums from Kiroku's Albums thread go to Albums of the week", "Free", "planned"],
            ["Facts", "A metal album joins the collection of metal albums", "Free", "later"],
            ["Similarity", "Close to what a collection already holds", "Patron", "later"],
            ["The sentence", "“Quiet films to rewatch on a Sunday. No horror.”", "Patron", "later"],
          ],
        },
      ],
    },
    {
      id: "issues",
      name: "What subscribers see",
      summary:
        "An issue on the web and by email (prototype/issue). Both, and the feed, are rendered from the same data, so they can't disagree (docs/planning/05). Phase 2.",
      drawings: [
        { id: "issues-web", notes: ISSUE_NOTES.slice(0, 8) },
        { id: "issues-email", notes: ISSUE_NOTES.slice(8) },
      ],
      tables: [
        {
          title: "Web and email",
          headers: ["", "The web page", "The email"],
          rows: [
            ["Previews", "Play in the page", "Link to the page"],
            ["Actions per pick", "Up to six", "Two"],
            ["Look", "Paper, Night or Riso, the curator's", "The same look, fixed"],
            ["Replies", "A Write back box", "Reply to the email"],
            ["Unsubscribe", "In the footer", "One click, with List-Unsubscribe headers"],
          ],
          note: "The curator's profile and a collection's own page are planned for Phase 2 but have no prototype, so they aren't drawn: what the profile shows is a question.",
        },
      ],
    },
    {
      id: "circles",
      name: "Circles",
      summary:
        "A private circle of friends sees a quiet weekly feed of what its members save, shared by rules each member sets (prototype/circle). Phase 3.",
      notes: CIRCLE_NOTES,
      tables: [
        {
          title: "Reactions and rules",
          headers: ["", "What it does", "Status"],
          rows: [
            ["Me too", "Says you love it too; stays inside the circle", "planned"],
            ["On my list", "Marks it to try, for you and the circle to see", "planned"],
            ["Save it", "Adds it to your library, via the member who shared it", "planned"],
            ["Private", "Never leaves your library (the default)", "planned"],
            ["Ask me", "Waits in Waiting for you until you share it", "planned"],
            ["Share", "Shared after an hour, unless pulled back", "planned"],
          ],
        },
      ],
    },
    {
      id: "kits",
      name: "Share kits and plans",
      summary:
        "Shelf renders platform-shaped images and silent videos from an issue, and hands them off; nothing is posted for you (prototype/sharekit). Phase 4.",
      notes: KIT_NOTES,
      tables: [
        {
          title: "Formats",
          headers: ["Format", "Size", "Where it goes", "Status"],
          rows: [
            ["Carousel", "1,080 × 1,350, eight slides", "Instagram", "planned"],
            ["Story", "1,080 × 1,920", "Instagram, with a link sticker", "planned"],
            ["Video", "1,080 × 1,920, silent, under 60 s to render", "TikTok, Reels, Shorts", "planned"],
            ["Link card", "1,200 × 675", "X, Bluesky, Threads", "planned"],
            ["Pin", "1,000 × 1,500", "Pinterest", "planned"],
          ],
        },
      ],
    },
    {
      id: "account",
      name: "Account",
      title: "Signing in and the account",
      summary:
        "Passkeys and email links, never a password, with Google and Apple when they're configured, and the settings a curator needs once their work is public.",
      notes: ACCOUNT_NOTES,
    },
    {
      id: "atlas",
      name: "Atlas and Triage",
      title: "The Atlas and Triage",
      summary:
        "The second release: a map of the whole library to arrange by hand, and a fast way to judge a big batch of saves (prototype/studio, atlas.js and triage.js). Both open as Studio modes.",
      drawings: [
        { id: "atlas-map", notes: ATLAS_NOTES.slice(0, 6) },
        { id: "atlas-triage", notes: ATLAS_NOTES.slice(6) },
      ],
      tables: [
        {
          title: "Keys",
          headers: ["Keys", "What it does", "Status"],
          rows: [
            ["K, 1 2 3", "Keep, or keep and say how much", "later"],
            ["X, L", "Skip (to the compost), or leave for later", "later"],
            ["Space, U", "Big preview, undo", "later"],
            ["G, T, D", "Atlas: make a pile, gather into the tray, drop the tray", "later"],
            ["⌫", "Atlas: compost, restorable for 90 days", "later"],
          ],
        },
      ],
    },
  ],
  questionsIntro: "Each changes parts that aren't built yet, or a default. Say which you'd like, or anything you'd change on the other tabs.",
  questions: [
    {
      id: "save-closes-panel",
      title: "After a save from the Studio, does the panel close onto the new card?",
      now: "The built panel stays open until Done, so several links can be added in a row. The prototype closes it, selects the new card, opens its Details and says which issue it's queued for.",
      options: [
        "Keep it open until Done, as now",
        "Close it, select the card and open its Details, as the prototype does",
        "Keep it open and select the card behind it",
      ],
      lean: "B, once the Details tab exists: a save is usually one link, and the bookmarklet and imports cover adding many.",
    },
    {
      id: "add-link-collections",
      title: "Does Add link offer collections, and are any ticked to begin with?",
      now: "Collections arrive in Phase 2. The prototype's panel shows a chip per collection, ticking the ones that fit the link's type.",
      options: ["Chips, ticked by type, as the prototype does", "Chips, none ticked", "No chips: collections are chosen from the save's Details"],
      lean: "B: a ticked public collection reaches subscribers, so the curator should choose it every time.",
    },
    {
      id: "wall-shapes",
      title: "Does the wall keep each type's shape?",
      now: "The built wall is a grid of square tiles. The prototype's is masonry: albums square, posters and book covers taller, repos wide, with a New ribbon for the week.",
      options: ["Masonry with each type's shape, as the prototype", "Square tiles, as now"],
      lean: "A: a film poster cropped square loses what makes it recognisable, and the wall is the screen curators look at most.",
    },
    {
      id: "timeline",
      title: "Is the Studio's timeline in the first release?",
      now: "An empty track sits under the wall. The prototype's bottom row (262 px) scrubs the library through time with issues and imports marked, beside three charts and a log of key events. docs/planning/01 doesn't place it.",
      options: [
        "The timeline only, from save dates; charts and the log with analytics later",
        "Timeline, charts and log, as the prototype",
        "Neither yet: the wall takes the height until analytics exist",
      ],
      lean: "A: the timeline needs nothing but save dates and makes the library feel like a record, while the charts need analytics the first release doesn't have.",
    },
    {
      id: "public-profile",
      title: "What does a curator's public profile show?",
      now: "/{handle} is planned for Phase 2, server-rendered with an Open Graph image, but there's no prototype. The issue's More from Nina cards show public collections with their cadence, subscribers and a subscribe button.",
      options: [
        "Public collections as cards with their latest issue and a subscribe button",
        "A wall of everything public",
        "Collections, with a strip of what was added recently",
      ],
      lean: "A: a profile is a front door to subscribe; a wall of everything public is heavier and shows more than a curator may want.",
    },
    {
      id: "issue-editor",
      title: "Where is an issue written?",
      now: "The prototype queues picks for the next issue (numbered on the wall, Queued for #28) and previews it, but has no editor for the intro, the outro or the order.",
      options: [
        "In Collections mode, editing the preview in place",
        "A full-width editor opened from the collection, with the live preview beside it",
        "A form in the inspector, beside the floating preview",
      ],
      lean: "B: writing needs room, and a live preview of the real render beside it still shows exactly what will be sent.",
    },
    {
      id: "free-animations",
      title: "Which share kit animations are free?",
      now: "The plan puts animated videos in Phase 4 with some animations premium. The prototype's share kit toggles Free (a small Made with Shelf mark) and Patron (clean).",
      options: [
        "One animation free with the mark, the rest with Patron",
        "Every animation free with the mark; Patron removes it and adds premium ones",
        "Videos only with Patron",
      ],
      lean: "B: watermarked videos are how Shelf spreads on TikTok and Reels, and Patron still pays for clean exports and the premium animations.",
    },
    {
      id: "spotify-playlists",
      title: "How do Spotify playlists get imported?",
      now: "They were to go through Odesli, whose keyless API now refuses calls. Apple Music playlists and albums don't need it.",
      options: [
        "Ask Odesli for an API key",
        "Spotify's own API with an app key, crossing to other services by barcode",
        "Leave Spotify playlists out of the first release",
      ],
      lean: "B: Spotify's API reads public playlists with an app key and gives each album's barcode, which the enrichers already cross by.",
    },
    {
      id: "nested-collections",
      title: "Can collections hold other collections, and do saves file themselves?",
      now: "Collections were flat, and every save was filed by hand. Kiroku Station nests threads one level and files saves into them automatically.",
      options: ["Nested collections with auto-filing", "A separate layer of threads for sorting", "No new structure"],
      lean: "A, after Kiroku's ADR-007.",
      answer:
        "Collections nest one level, each keeping its own audience, and auto-filing files saves into them: into private ones at once, into ones others see after the hour or as a suggestion (docs/planning/10).",
    },
    {
      id: "inbox-queue",
      title: "Is the inbox a queue to clear?",
      now: "Kiroku dropped its inbox because unfiled saves became a chore.",
      options: ["A place, not a queue", "A queue with a count"],
      lean: "A.",
      answer: "Unsorted is a place: new saves start there and stay until a collection claims them, with no badge or count to clear.",
    },
  ],
};

// ---------------------------------------------------------------- building blocks

function Brand({ n }: { n?: number }) {
  return (
    <>
      {n !== undefined ? <Marker n={n} /> : null}
      <Text as="span" size="sm" weight="bold">
        Shelf
      </Text>
      <Text as="span" size="sm" tone="muted">
        Curator Studio
      </Text>
    </>
  );
}

function Small({ children, tone = "secondary", weight }: { children: string; tone?: "default" | "secondary" | "muted"; weight?: "bold" }) {
  return (
    <Text size="sm" tone={tone} weight={weight}>
      {children}
    </Text>
  );
}

function Quote({ children }: { children: string }) {
  return (
    <Text size="sm" tone="secondary" italic>
      {`▎ ${children}`}
    </Text>
  );
}

/** Someone, by their initials, as a small picture. */
function Avatar({ initials, size = 18 }: { initials: string; size?: number }) {
  return (
    <Placeholder w={size} h={size}>
      {initials}
    </Placeholder>
  );
}

/** A line with something on the left and, in `end` pixels, something pushed to the right. */
function Line({ end, children }: { end: number; children: [ReactNode, ReactNode] }) {
  return (
    <Wireframe frame="none" columns={`minmax(0, 1fr) ${end}px`} gap={6}>
      {children[0]}
      <Row gap={5} justify="end" align="center">
        {children[1]}
      </Row>
    </Wireframe>
  );
}

type RungState = "done" | "now" | "later" | "skipped";

/** The ladder a save climbs (docs/planning/04): ticked, current, still to come or passed over. */
function Rungs({ states }: { states: RungState[] }) {
  const labels = ["Placeholder", "Recognised", "Generic card", "Enriched"];
  return (
    <Stack gap={4}>
      {labels.map((label, i) => {
        const state = states[i] ?? "later";
        if (state === "done") {
          return (
            <Text key={label} size="sm" tone="secondary">
              <Text as="span" tone="success">
                {"✓ "}
              </Text>
              {label}
            </Text>
          );
        }
        if (state === "skipped") {
          return <Small key={label} tone="muted">{`⊘ ${label}, passed over`}</Small>;
        }
        return (
          <Text key={label} size="sm" tone={state === "now" ? "default" : "muted"} weight={state === "now" ? "bold" : undefined}>
            {`${i + 1} ${label}`}
          </Text>
        );
      })}
    </Stack>
  );
}

// ---------------------------------------------------------------- saving links

function SavingPanel() {
  return (
    <Wireframe toolbar={<Brand />} toolbarEnd={<Chip>+ Add link</Chip>} columns="minmax(0, 1fr) 480px">
      <Stack />
      <Stack gap={8}>
        <Region n={1} label="Paste" status="built">
          <Line end={48}>
            <Text size="sm" tone="muted" truncate>
              https://music.apple.com/gb/album/in-rainbows/1109714933?utm_source=share
            </Text>
            <Chip>Add</Chip>
          </Line>
        </Region>
        <Wireframe frame="none" columns="150px minmax(0, 1fr)" gap={8}>
          <Region n={2} label="Ladder" status="built">
            <Rungs states={["done", "done", "skipped", "now"]} />
          </Region>
          <Region n={3} label="Card" status="built">
            <Stack gap={8}>
              <Row gap={10} align="start" wrap={false}>
                <Placeholder w={72} h={72} />
                <Stack gap={2}>
                  <Small tone="default" weight="bold">
                    In Rainbows
                  </Small>
                  <Small>Radiohead · 2007</Small>
                  <Small tone="muted">music.apple.com/gb/album/in-rainbows/1109714933</Small>
                </Stack>
              </Row>
              <Stack gap={1}>
                <Small>✓ Apple Music · album</Small>
                <Small tone="muted">Art: Apple Music</Small>
              </Stack>
            </Stack>
          </Region>
        </Wireframe>
        <Wireframe frame="none" columns="minmax(0, 1fr) auto" gap={8}>
          <Region n={5} label="Add to" status="planned" dashed>
            <Row gap={5} wrap>
              <Chip dim>Things I loved this week</Chip>
              <Chip dim>Albums of the week</Chip>
              <Chip dim>Desk & trail kit</Chip>
            </Row>
          </Region>
          <Region n={4} label="Footer" status="built">
            <Row gap={8} align="center">
              <Small tone="muted">Added to your library</Small>
              <Chip>Done</Chip>
            </Row>
          </Region>
        </Wireframe>
      </Stack>
    </Wireframe>
  );
}

function SavingWays() {
  return (
    <Wireframe frame="none" columns="repeat(5, minmax(0, 1fr))" gap={10}>
      <Region n={6} label="Bookmarklet" status="planned">
        <Stack gap={3}>
          <Small tone="muted">shelf.example/add?url=…</Small>
          <Small>Saved · In Rainbows</Small>
          <Small tone="muted">This window closes itself</Small>
        </Stack>
      </Region>
      <Region n={7} label="Share target" status="planned">
        <SideList items={[{ label: "Messages" }, { label: "Mail" }, { label: "Shelf", selected: true }, { label: "Copy link", dim: true }]} />
      </Region>
      <Region n={8} label="Imports" status="planned">
        <SideList
          items={[
            { label: "Letterboxd", count: "CSV" },
            { label: "Goodreads", count: "CSV" },
            { label: "Trakt", count: "account" },
            { label: "GitHub stars", count: "@ninaokafor" },
            { label: "Playlist link", count: "URL" },
          ]}
          note="1,315 of 2,200 rows · 9 to retry"
        />
      </Region>
      <Region n={9} label="Kiroku" status="planned">
        <Field name="Source" value="kiroku" />
        <Field name="Key" value="Kiroku's item id" />
        <Field name="Thread" value="Albums → Albums of the week" />
      </Region>
      <Region n={10} label="Live" status="later">
        <SideList
          items={[
            { label: "Apple Music library", count: "2h ago" },
            { label: "Trakt", count: "Live" },
            { label: "GitHub stars", count: "Live" },
          ]}
        />
      </Region>
    </Wireframe>
  );
}

// ---------------------------------------------------------------- the Studio

const WALL = ["Breaking Bad", "In Rainbows", "Crack the Skye", "Andor", "Piranesi", "ghostty", "Perfect Days", "theverge.com"];

function StudioWindow() {
  return (
    <Wireframe
      toolbar={<Brand n={1} />}
      toolbarEnd={
        <>
          <Segmented items={["Library 31", "Collections 0", "Audience"]} active="Library 31" />
          <Chip>+ Add link</Chip>
          <Text as="span" size="sm" tone="muted">
            nina@example.com
          </Text>
          <Chip dim>Sign out</Chip>
        </>
      }
      columns="minmax(0, 1fr) 250px"
    >
      <Stack gap={8}>
        <Region n={3} label="Search and filters" status="planned" dashed>
          <Row gap={6} wrap align="center">
            <Small tone="muted">Search titles, people, notes</Small>
            <Chip>Music</Chip>
            <Chip>Film</Chip>
            <Chip>TV</Chip>
            <Chip>Books</Chip>
            <Chip dim>+6</Chip>
          </Row>
        </Region>
        <Region n={2} label="Wall" status="built">
          <Stack gap={6}>
            <Small tone="muted">Library · 31 items</Small>
            <Row gap={10} wrap>
              {WALL.map((title) => (
                <Placeholder key={title} w={64} h={64} caption={title} />
              ))}
            </Row>
          </Stack>
        </Region>
        <Region n={6} label="Timeline" status="you">
          <Slider label="Apr 10 to Oct 9, 2026" min={0} max={100} value={96} />
        </Region>
      </Stack>
      <Stack gap={8}>
        <Region n={4} label="Layers" status="built">
          <SideList
            items={[
              { label: "Music", count: "11" },
              { label: "Film", count: "0", dim: true },
              { label: "TV", count: "2" },
              { label: "Books", count: "0", dim: true },
              { label: "Repos", count: "0", dim: true },
              { label: "Links", count: "18" },
            ]}
          />
        </Region>
        <Region n={5} label="Library overview" status="built">
          <Field name="Curator" value="Nina Okafor" />
          <Field name="Items" value="31" />
          <Field name="In public" value="0" />
          <Field name="Collections" value="0" />
          <Field name="Since" value="Oct 2026" />
        </Region>
      </Stack>
    </Wireframe>
  );
}

function StudioInspector() {
  return (
    <Wireframe frame="none" columns="repeat(3, minmax(0, 1fr))" gap={10}>
      <Region n={7} label="Details" status="planned">
        <Stack gap={8}>
          <Row gap={8} align="start" wrap={false}>
            <Placeholder w={48} h={48} />
            <Stack gap={1}>
              <Small tone="default" weight="bold">
                Crack the Skye
              </Small>
              <Small>Mastodon · 2009</Small>
              <Small tone="muted">Music · enriched from Apple</Small>
            </Stack>
          </Row>
          <Stack gap={0}>
            <Field name="Label" value="Reprise Records" />
            <Field name="Tracks" value="14 · 100 min" />
            <Field name="Added" value="Oct 8 · pasted" />
            <Field name="In" value="Library only · private" />
          </Stack>
          <Row gap={5} wrap>
            <Chip>▶ Oblivion</Chip>
            <Chip>Apple Music</Chip>
            <Chip>Spotify</Chip>
            <Chip>Bandcamp</Chip>
            <Chip>Buy the vinyl ◆</Chip>
            <Chip dim>Compost</Chip>
          </Row>
        </Stack>
      </Region>
      <Region n={8} label="Sources" status="planned">
        <Stack gap={8}>
          <Small>Pasted · Oct 8 · via @tomas</Small>
          <Stack gap={4}>
            <Meter
              value={100}
              show="none"
              segments={[
                { value: 44, tone: "default", label: "Pasted" },
                { value: 39, tone: "muted", label: "Imported" },
                { value: 11, tone: "accent", label: "From a friend" },
                { value: 6, tone: "info", label: "Share sheet" },
              ]}
            />
            <Small tone="muted">Pasted 44% · Imported 39% · From a friend 11% · Share sheet 6%</Small>
          </Stack>
          <SideList
            title="Connected"
            items={[
              { label: "Letterboxd · CSV", count: "May 3" },
              { label: "Goodreads · CSV", count: "Jun 14" },
              { label: "GitHub stars", count: "Live" },
            ]}
          />
          <Small tone="muted">
            Shelf never crawls. Everything here was added by you, imported from an export you chose, or shared to you by a friend.
          </Small>
        </Stack>
      </Region>
      <Region n={9} label="Notes" status="planned">
        <Stack gap={8}>
          <Small>Your rating ★★★★★</Small>
          <Quote>Tomás was right. Start with Oblivion.</Quote>
          <Field name="Appears in" value="Issue 27 · Oct 4" />
          <Small tone="muted">Written by you. Shelf never writes notes for you.</Small>
        </Stack>
      </Region>
    </Wireframe>
  );
}

// ---------------------------------------------------------------- collections and issues

function CollectionsDrawing() {
  return (
    <Wireframe
      toolbar={<Brand />}
      toolbarEnd={
        <>
          <Segmented items={["Library 64", "Collections 5", "Audience"]} active="Collections 5" />
          <Chip>+ Add link</Chip>
        </>
      }
      columns="minmax(0, 1fr) 270px"
    >
      <Stack gap={8}>
        <Wireframe frame="none" columns="200px minmax(0, 1fr)" gap={8}>
          <Region n={1} label="Picker" status="planned" dashed>
            <SideList
              items={[
                { label: "All saves", count: "64" },
                { label: "Unsorted", count: "17" },
                { label: "Things I loved this week", count: "3,180", selected: true },
                { label: "Music", count: "Private" },
                { label: "Albums of the week", count: "1,906", depth: 1 },
                { label: "Shows I'm watching", count: "815" },
                { label: "Repos worth knowing", count: "427" },
                { label: "Desk & trail kit", count: "Private" },
              ]}
            />
          </Region>
          <Region n={3} label="Issue preview" status="planned" dashed>
            <Stack gap={8}>
              <Line end={104}>
                <Small tone="default">● Preview · Issue 27 · Things I loved this week</Small>
                <Segmented items={["Web", "Email"]} active="Email" />
              </Line>
              <Row gap={6} align="start" wrap={false}>
                <Placeholder w={110} h={80} />
                <Stack gap={3}>
                  <Small>Email · 600 px · Look Paper</Small>
                  <Small tone="muted">Sent Sun 4 Oct · 58% opened</Small>
                </Stack>
              </Row>
            </Stack>
          </Region>
        </Wireframe>
        <Region n={2} label="On the wall" status="planned">
          <Stack gap={6}>
            <Row gap={10} wrap>
              {["Anatomy of a Fall", "Masters of Doom", "bubbletea", "A Hero's Death", "Severance", "Piranesi"].map((title, i) => (
                <Placeholder key={title} w={60} h={60} caption={title} badge={String(i + 1)} selected={i < 3} />
              ))}
            </Row>
            <Small tone="muted">Outlined: queued for #28</Small>
          </Stack>
        </Region>
        <Region n={6} label="Suggestions" status="planned">
          <SideList
            items={[
              { label: "Andor · TV", count: "+" },
              { label: "Slow Horses · TV", count: "+" },
              { label: "Pachinko · TV", count: "+" },
            ]}
            note="From your library · Shows I'm watching"
          />
        </Region>
      </Stack>
      <Stack gap={8}>
        <Region n={4} label="Roster" status="planned">
          <SideList
            items={[
              { label: "Things I loved this week", count: "#28 · 3/7", selected: true },
              { label: "Weekly · Sundays · 3,180", depth: 1, dim: true },
              { label: "Albums of the week", count: "#51 · 2/3" },
              { label: "Shows I'm watching", count: "Rolling" },
              { label: "Repos worth knowing", count: "Unlisted" },
              { label: "Desk & trail kit", count: "Private" },
            ]}
          />
        </Region>
        <Region n={5} label="Collection" status="planned">
          <Stack gap={8}>
            <Grid columns={3} gap={6}>
              {[
                ["3,180", "Subscribers"],
                ["58%", "Open rate"],
                ["3/7", "Picks queued"],
              ].map(([value, label]) => (
                <Stack key={label} gap={0}>
                  <Small tone="default" weight="bold">
                    {value}
                  </Small>
                  <Small tone="muted">{label}</Small>
                </Stack>
              ))}
            </Grid>
            <Stack gap={0}>
              <Field name="Shape" value="Numbered issues" />
              <Field name="Cadence" value="Weekly · Sundays 09:00" />
              <Field name="Visibility" value="Public" />
              <Field name="Last issue" value="#27 · Sun 4 Oct · 2,077 sent" />
              <Field name="Look" value="Paper" />
            </Stack>
            <Row gap={5}>
              <Chip>Preview issue</Chip>
              <Chip>Send test</Chip>
            </Row>
          </Stack>
        </Region>
      </Stack>
    </Wireframe>
  );
}

// ---------------------------------------------------------------- organising

function OrganisingDrawing() {
  return (
    <Wireframe
      toolbar={<Brand />}
      toolbarEnd={
        <>
          <Segmented items={["Library 64", "Collections 7", "Audience"]} active="Library 64" />
          <Chip>+ Add link</Chip>
        </>
      }
      columns="190px minmax(0, 1fr) 250px"
    >
      <Region n={1} label="Sources" status="planned">
        <Stack gap={8}>
          <SideList
            items={[
              { label: "All saves", count: "64" },
              { label: "Unsorted", count: "17", selected: true },
            ]}
          />
          <SideList
            title="Collections"
            items={[
              { label: "Things I loved this week", count: "3,180" },
              { label: "Music", count: "Private" },
              { label: "Albums of the week", count: "1,906", depth: 1 },
              { label: "Prog to revisit", count: "Private", depth: 1 },
              { label: "Watching", count: "Private" },
              { label: "Shows I'm watching", count: "815", depth: 1 },
              { label: "Desk & trail kit", count: "Private" },
            ]}
          />
        </Stack>
      </Region>
      <Stack gap={8}>
        <Region n={2} label="Unsorted" status="planned">
          <Stack gap={6}>
            <Small tone="muted">17 saves no collection has claimed</Small>
            <Row gap={10} wrap>
              {["Pitfalls", "Promises", "Past Lives", "Zed", "Project Hail Mary", "Koya", "bubbletea"].map((title) => (
                <Placeholder key={title} w={58} h={58} caption={title} />
              ))}
            </Row>
          </Stack>
        </Region>
        <Region n={3} label="Suggested collection" status="later" dashed>
          <Line end={150}>
            <Small tone="default">Seven prog and metal albums: make a collection “Heavy & progressive”?</Small>
            <>
              <Chip>Make it</Chip>
              <Chip dim>Not now</Chip>
            </>
          </Line>
        </Region>
      </Stack>
      <Stack gap={8}>
        <Region n={4} label="Why it's here" status="planned">
          <Stack gap={4}>
            <Small tone="default">Crack the Skye</Small>
            <Small>In Albums of the week: filed by your rule “Albums from Kiroku's Albums thread”</Small>
            <Small>In Music › Prog to revisit: placed by you</Small>
            <Row gap={5}>
              <Chip>Move</Chip>
              <Chip dim>Take out</Chip>
            </Row>
          </Stack>
        </Region>
        <Region n={5} label="Rules" status="planned">
          <Stack gap={6}>
            <Stack gap={2}>
              <Small tone="default">Albums from Kiroku's Albums thread → Albums of the week</Small>
              <Segmented items={["Ask me", "Auto"]} active="Auto" />
            </Stack>
            <Stack gap={2}>
              <Small tone="default">Rated 5 → Things I loved this week</Small>
              <Segmented items={["Ask me", "Auto"]} active="Ask me" />
            </Stack>
          </Stack>
        </Region>
        <Region n={6} label="Waiting an hour" status="planned">
          <Line end={80}>
            <Stack gap={0}>
              <Small tone="default">Severance → Shows I'm watching</Small>
              <Small tone="muted">Public · filed in 33 min unless you pull it</Small>
            </Stack>
            <Chip>Pull back</Chip>
          </Line>
        </Region>
        <Region n={7} label="Sentence" status="later" dashed>
          <Field name="Belongs" value="Quiet films to rewatch on a Sunday. No horror." wrap />
        </Region>
      </Stack>
    </Wireframe>
  );
}

// ---------------------------------------------------------------- what subscribers see

function IssueWeb() {
  return (
    <Wireframe
      toolbar={
        <Text as="span" size="sm" tone="muted">
          shelf.example/nina/loved/27
        </Text>
      }
      toolbarEnd={<Segmented items={["Paper", "Night", "Riso"]} active="Paper" />}
      columns="minmax(0, 1fr) 220px"
    >
      <Stack gap={8}>
        <Region n={1} label="Masthead" status="planned">
          <Line end={190}>
            <Row gap={8} align="center" wrap={false}>
              <Avatar initials="NO" size={22} />
              <Stack gap={0}>
                <Small tone="default" weight="bold">
                  Nina Okafor
                </Small>
                <Small tone="muted">shelf.example/nina · Loud records, slow films, sharp tools.</Small>
              </Stack>
            </Row>
            <>
              <Chip>Subscribe</Chip>
              <Small tone="muted">3,180 readers</Small>
            </>
          </Line>
        </Region>
        <Region n={2} label="Cover" status="planned">
          <Wireframe frame="none" columns="minmax(0, 1.05fr) minmax(0, 1fr)" gap={12}>
            <Stack gap={3}>
              <Small tone="muted">Things I loved this week · Issue 27</Small>
              <Text weight="bold">A wormhole, a house of tides, and the best hour of TV this decade</Text>
              <Small tone="muted">Sun 4 Oct 2026 · seven things, about a twelve-minute read</Small>
            </Stack>
            <Row gap={4} wrap align="center">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <Placeholder key={i} w={36} h={36} />
              ))}
              <Chip>Issue 27</Chip>
            </Row>
          </Wireframe>
        </Region>
        <Region n={3} label="Letter and contents" status="planned">
          <Wireframe frame="none" columns="minmax(0, 1fr) 170px" gap={12}>
            <Quote>Hello from a wet Glasgow Sunday. Seven things this week, and one of them is a pocket synth.</Quote>
            <SideList
              title="In this issue"
              items={[
                { label: "01 Crack the Skye", count: "Album" },
                { label: "02 Severance", count: "TV" },
                { label: "03 Perfect Days", count: "Film" },
                { label: "04 Piranesi", count: "Book" },
              ]}
            />
          </Wireframe>
        </Region>
        <Region n={4} label="Spreads" status="planned">
          <Wireframe frame="none" columns="minmax(0, 1fr) minmax(0, 1fr)" gap={12}>
            <Placeholder w={150} h={110} />
            <Stack gap={3}>
              <Small tone="muted">01 · Album of the week</Small>
              <Text weight="bold">Crack the Skye</Text>
              <Small>Mastodon · 2009 · 14 tracks · 100 min · Reprise Records</Small>
              <Quote>Tomás was right. Start with Oblivion.</Quote>
              <Row gap={4} wrap>
                <Chip>▶ Oblivion · 0:30</Chip>
                <Chip>Apple Music</Chip>
                <Chip>Spotify</Chip>
                <Chip>Bandcamp</Chip>
                <Chip>Buy the vinyl ◆</Chip>
              </Row>
              <Small tone="muted">Came to me via @tomas</Small>
            </Stack>
          </Wireframe>
        </Region>
        <Wireframe frame="none" columns="minmax(0, 1.2fr) minmax(0, 1fr)" gap={8}>
          <Region n={5} label="Also on my radar" status="planned">
            <Row gap={8} wrap>
              {["Immunity", "Mordechai", "Andor", "Pillars of Creation"].map((title) => (
                <Placeholder key={title} w={48} h={48} caption={title} />
              ))}
            </Row>
          </Region>
          <Region n={6} label="Outro" status="planned">
            <Stack gap={4}>
              <Small>That's the week. If something here lands for you, hit reply. — Nina</Small>
              <Row gap={6} align="center">
                <Small tone="muted">Reply to Nina</Small>
                <Chip>Write back</Chip>
              </Row>
            </Stack>
          </Region>
        </Wireframe>
        <Region n={7} label="More and footer" status="planned">
          <Stack gap={4}>
            <Row gap={10} wrap>
              <Small>Albums of the week · Weekly · Fridays · 1,906</Small>
              <Small>Shows I'm watching · Rolling · 815</Small>
            </Row>
            <Small tone="muted">Made with Shelf · Manage subscription · Unsubscribe · RSS · All issues · Links marked ◆ are affiliate links</Small>
          </Stack>
        </Region>
      </Stack>
      <Stack>
        <Region n={8} label="Subscribe" status="planned" dashed>
          <Stack gap={4}>
            <Small tone="default" weight="bold">
              Get “Things I loved this week”
            </Small>
            <Small>◉ Email, each issue · Sundays</Small>
            <Small tone="muted">○ In my weekly digest · second release</Small>
            <Small>○ Only in my Shelf feed</Small>
            <Small>○ RSS · shelf.example/nina/loved.rss</Small>
            <Small tone="muted">you@example.com</Small>
            <Row>
              <Chip>Subscribe</Chip>
            </Row>
            <Small tone="muted">Then: Nearly there. Check your inbox and tap the link to confirm.</Small>
          </Stack>
        </Region>
      </Stack>
    </Wireframe>
  );
}

function IssueEmail() {
  return (
    <Wireframe
      toolbar={
        <Text as="span" size="sm" tone="muted">
          Email · 600 px
        </Text>
      }
      columns="minmax(0, 1fr) 340px minmax(0, 1fr)"
    >
      <Stack />
      <Stack gap={8}>
        <Region n={9} label="Top" status="planned">
          <Stack gap={4}>
            <Line end={112}>
              <Small tone="muted">Issue 27 · Sun 4 Oct 2026</Small>
              <Small tone="muted">Read on the web</Small>
            </Line>
            <Row gap={6} align="center" wrap={false}>
              <Avatar initials="NO" />
              <Small tone="default">Nina Okafor · Things I loved this week</Small>
            </Row>
            <Small tone="default" weight="bold">
              A wormhole, a house of tides, and the best hour of TV this decade
            </Small>
            <Row gap={4} wrap>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <Placeholder key={i} w={48} h={48} />
              ))}
            </Row>
          </Stack>
        </Region>
        <Region n={10} label="Picks and footer" status="planned">
          <Stack gap={4}>
            <Small tone="muted">01 · ALBUM OF THE WEEK</Small>
            <Small tone="default">Crack the Skye · Mastodon</Small>
            <Row gap={4} wrap>
              <Chip>▶ Play “Oblivion”</Chip>
              <Chip>Apple Music</Chip>
              <Chip>Spotify</Chip>
            </Row>
            <Small tone="muted">02 · WATCHING · Severance · Apple TV · 2 seasons</Small>
            <Small tone="muted">
              You're getting this because you subscribed to Things I loved this week by Nina Okafor on Shelf. Manage subscription · Unsubscribe
            </Small>
          </Stack>
        </Region>
      </Stack>
      <Stack />
    </Wireframe>
  );
}

// ---------------------------------------------------------------- circles

const FEED = [
  { initials: "TB", who: "Tomás · Sat", title: "Promises", by: "Floating Points · 2021", note: "For Sunday mornings. Put it on and make coffee." },
  { initials: "AV", who: "Ada · Thu", title: "Pitfalls", by: "Leprous · 2019", note: "Prog for people who think they hate prog." },
];

function CirclesDrawing() {
  return (
    <Wireframe
      toolbar={
        <Text as="span" size="sm" tone="muted">
          Tuesday Table · a circle on Shelf
        </Text>
      }
      toolbarEnd={<Segmented items={["This week", "As it happens"]} active="This week" />}
      columns="minmax(0, 1fr) 250px"
    >
      <Stack gap={8}>
        <Region n={1} label="Header" status="planned">
          <Stack gap={4}>
            <Small tone="muted">A circle on Shelf · private to its members</Small>
            <Text weight="bold">Tuesday Table</Text>
            <Row gap={4} align="center">
              {["NO", "TB", "AV", "RS", "HM", "PK"].map((initials) => (
                <Avatar key={initials} initials={initials} />
              ))}
              <Small tone="muted">6 friends · since 2023 · 3 – 9 October · 18 things shared</Small>
            </Row>
          </Stack>
        </Region>
        <Region n={2} label="Right now" status="planned">
          <Row gap={8} wrap>
            {[
              ["Tomás · Pachinko", "S2 · E5 of 8"],
              ["Ada · Piranesi", "Finished"],
              ["Rui · Tomorrow…", "Page 151"],
              ["Hana · Immunity", "14 plays"],
              ["Priya · Slow Horses", "S4 · E2 of 6"],
            ].map(([title, detail]) => (
              <Stack key={title} gap={2}>
                <Placeholder w={72} h={48} caption={title} />
                <Small tone="muted">{detail}</Small>
              </Stack>
            ))}
          </Row>
        </Region>
        <Region n={3} label="Filters" status="planned">
          <Row gap={5}>
            <Chip selected>Everything</Chip>
            <Chip>Listening</Chip>
            <Chip>Watching</Chip>
            <Chip>Reading</Chip>
            <Chip dim>Eating</Chip>
          </Row>
        </Region>
        <Region n={4} label="Feed" status="planned">
          <Stack gap={6}>
            <Small tone="muted">Listening — 4 this week · Tomás, Ada, Rui, You</Small>
            <Wireframe frame="none" columns="minmax(0, 1fr) minmax(0, 1fr)" gap={10}>
              {FEED.map((f) => (
                <Wireframe key={f.title} frame="none" columns="52px minmax(0, 1fr)" gap={8}>
                  <Placeholder w={52} h={52} />
                  <Stack gap={2}>
                    <Row gap={4} align="center" wrap={false}>
                      <Avatar initials={f.initials} size={14} />
                      <Small tone="muted">{f.who}</Small>
                    </Row>
                    <Small tone="default" weight="bold">
                      {f.title}
                    </Small>
                    <Small tone="muted">{f.by}</Small>
                    <Quote>{f.note}</Quote>
                    <Row gap={4} wrap>
                      <Chip>Me too 3</Chip>
                      <Chip>On my list</Chip>
                      <Chip>Save it</Chip>
                    </Row>
                  </Stack>
                </Wireframe>
              ))}
            </Wireframe>
          </Stack>
        </Region>
      </Stack>
      <Stack gap={8}>
        <Region n={5} label="What you share" status="planned">
          <Stack gap={5}>
            {[
              ["Listening", "Kiroku · Albums thread", "Share"],
              ["Watching", "Letterboxd & Trakt", "Share"],
              ["Reading", "Goodreads", "Ask me"],
              ["Code & gear", "Everything else", "Private"],
            ].map(([kind, from, level]) => (
              <Stack key={kind} gap={2}>
                <Small tone="default">{`${kind} — ${from}`}</Small>
                <Segmented items={["Private", "Ask me", "Share"]} active={level} />
              </Stack>
            ))}
            <Small tone="muted">Shared after an hour, so you can pull anything back.</Small>
          </Stack>
        </Region>
        <Region n={6} label="Waiting for you" status="planned">
          <Stack gap={5}>
            <Line end={64}>
              <Stack gap={0}>
                <Small tone="default">Masters of Doom</Small>
                <Small tone="muted">From Goodreads · rule says “Ask me”</Small>
              </Stack>
              <Chip>Share</Chip>
            </Line>
            <Line end={80}>
              <Stack gap={0}>
                <Small tone="default">Anatomy of a Fall</Small>
                <Small tone="muted">Shared in 47 min unless you pull it</Small>
              </Stack>
              <Chip>Pull back</Chip>
            </Line>
          </Stack>
        </Region>
        <Region n={7} label="Tastes meet" status="later">
          <Small>You and Ada both loved Piranesi and Perfect Days</Small>
        </Region>
        <Region n={8} label="Sunday's letter" status="later" dashed>
          <Small tone="muted">One email to each member with the week, laid out like an issue.</Small>
        </Region>
      </Stack>
    </Wireframe>
  );
}

// ---------------------------------------------------------------- share kits and plans

function ShareKitsDrawing() {
  return (
    <Wireframe
      toolbar={
        <Text as="span" size="sm" tone="muted">
          Share kit · Things I loved this week · Issue 27
        </Text>
      }
      toolbarEnd={
        <>
          <Segmented items={["Free", "Patron"]} active="Free" />
          <Segmented items={["Paper", "Night", "Riso"]} active="Paper" />
          <Chip>Download everything</Chip>
        </>
      }
    >
      <Wireframe frame="none" columns="minmax(0, 1.3fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.7fr) minmax(0, 1fr)" gap={10}>
        <Region n={1} label="Carousel" status="planned">
          <Stack gap={3}>
            <Small tone="muted">01 · Album of the week</Small>
            <Placeholder w={128} ratio="4:5" inset={[0.07, 0.12, 0.86, 0.5]} caption="2 / 8 · Made with Shelf">
              Crack the Skye
            </Placeholder>
          </Stack>
        </Region>
        <Region n={2} label="Story" status="planned">
          <Stack gap={3}>
            <Small tone="muted">New issue</Small>
            <Placeholder w={96} ratio="9:16" inset={[0.08, 0.72, 0.84, 0.14]} caption="Link sticker goes here">
              Issue 27
            </Placeholder>
          </Stack>
        </Region>
        <Region n={3} label="Video" status="planned">
          <Stack gap={3}>
            <Small tone="muted">Safe area</Small>
            <Placeholder w={96} ratio="9:16" inset={[0.08, 0.14, 0.75, 0.64]} caption="19 s · no audio">
              Crack the Skye
            </Placeholder>
          </Stack>
        </Region>
        <Region n={4} label="Link card" status="planned">
          <Stack gap={3}>
            <Small tone="default">Things I loved this week, issue 27</Small>
            <Placeholder w={170} ratio="16:9" inset={[0.04, 0.08, 0.36, 0.84]} caption="shelf.example/nina" />
          </Stack>
        </Region>
        <Region n={5} label="Pin" status="planned">
          <Stack gap={3}>
            <Small tone="default">Issue 27</Small>
            <Placeholder w={100} ratio="2:3" inset={[0.08, 0.1, 0.84, 0.56]} caption="Six covers" />
          </Stack>
        </Region>
      </Wireframe>
      <Wireframe frame="none" columns="minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)" gap={10}>
        <Region n={6} label="Captions" status="planned">
          <Stack gap={4}>
            <Line end={56}>
              <Small tone="muted">Instagram</Small>
              <Chip>Copy</Chip>
            </Line>
            <Small>Things I loved this week, issue 27: 01 Crack the Skye — Mastodon … #albumoftheweek</Small>
          </Stack>
        </Region>
        <Region n={7} label="Free and Patron" status="planned">
          <Small>Free tier: a small “Made with Shelf” mark. Patron removes it.</Small>
        </Region>
        <Region n={8} label="Animations" status="planned">
          <SideList items={[{ label: "Knockout text", count: "first", selected: true }, { label: "More after launch", dim: true }]} />
        </Region>
        <Region n={9} label="Plans" status="planned">
          <Field name="Free" value="Library, circles, public pages, marked kits" />
          <Field name="Patron" value="Clean kits, videos, looks, email" />
        </Region>
      </Wireframe>
    </Wireframe>
  );
}

// ---------------------------------------------------------------- sign-in and account

function AccountDrawing() {
  return (
    <Wireframe frame="none" columns="repeat(3, minmax(0, 1fr))" gap={10}>
      <Region n={1} label="Home" status="built">
        <Stack gap={5}>
          <Small tone="default" weight="bold">
            Shelf
          </Small>
          <Text weight="bold">A shelf for the things you love.</Text>
          <Small>
            Keep albums, films, shows, books and anything else as rich cards. Share a collection with a few friends, or publish it for anyone who trusts your taste.
          </Small>
          <Row>
            <Chip>Sign in</Chip>
          </Row>
        </Stack>
      </Region>
      <Region n={2} label="Sign in" status="built">
        <Stack gap={5}>
          <Small tone="default" weight="bold">
            Sign in
          </Small>
          <Small>Use a passkey, or we'll email you a link. No password needed.</Small>
          <Field name="Email" value="you@example.com" tone="muted" />
          <Row>
            <Chip>Email me a sign-in link</Chip>
          </Row>
          <Small tone="muted">or</Small>
          <Row>
            <Chip>Sign in with a passkey</Chip>
          </Row>
          <Row>
            <Chip>Continue with Google</Chip>
          </Row>
          <Row>
            <Chip>Continue with Apple</Chip>
          </Row>
        </Stack>
      </Region>
      <Region n={3} label="Check your email" status="built">
        <Stack gap={5}>
          <Small tone="default" weight="bold">
            Check your email
          </Small>
          <Small>We sent you a sign-in link. It works once and expires in 15 minutes.</Small>
          <Small tone="muted">Nothing arrived? Check your spam folder, or ask for another link.</Small>
        </Stack>
      </Region>
      <Region n={4} label="Profile" status="planned">
        <Field name="Handle" value="shelf.example/nina" />
        <Field name="Name" value="Nina Okafor" />
        <Field name="About" value="Loud records, slow films, sharp tools." />
        <Field name="Links" value="ninaokafor.example" />
      </Region>
      <Region n={5} label="Plan" status="planned">
        <Stack gap={6}>
          <Field name="Plan" value="Free" />
          <Row gap={5}>
            <Chip>Upgrade to Patron</Chip>
            <Chip dim>Manage billing</Chip>
          </Row>
        </Stack>
      </Region>
      <Region n={6} label="Export and delete" status="planned">
        <Row gap={5} wrap>
          <Chip>Export everything</Chip>
          <Chip dim>Delete account</Chip>
        </Row>
      </Region>
      <Region n={7} label="Account: passkeys" status="built">
        <Stack gap={5}>
          <Field name="iCloud Keychain" value="Added 10 Oct · Last used today" />
          <Row gap={5} wrap>
            <Chip>Add a passkey</Chip>
            <Chip dim>Remove</Chip>
          </Row>
          <Small tone="muted">Sign-in links go to you@example.com and always work.</Small>
          <Row>
            <Chip dim>Sign out everywhere</Chip>
          </Row>
        </Stack>
      </Region>
    </Wireframe>
  );
}

// ---------------------------------------------------------------- the Atlas and Triage

function AtlasMap() {
  return (
    <Wireframe
      toolbar={
        <Text as="span" size="sm" tone="muted">
          Atlas › Music › Rock › Prog to revisit
        </Text>
      }
      toolbarEnd={<Chip>Covers</Chip>}
      columns="minmax(0, 1fr) 220px"
    >
      <Stack gap={8}>
        <Region n={1} label="Tools" status="later">
          <Row gap={8} align="center" wrap>
            {[
              ["V", "Select"],
              ["M", "Box"],
              ["H", "Pan"],
              ["C", "Connect"],
            ].map(([key, label]) => (
              <Row key={key} gap={4} align="center" wrap={false}>
                <Kbd>{key}</Kbd>
                <Small tone="muted">{label}</Small>
              </Row>
            ))}
            <Chip dim>Lens</Chip>
            <Chip dim>Every connection</Chip>
          </Row>
        </Region>
        <Region n={2} label="Map" status="later">
          <Stack gap={8}>
            <Wireframe frame="none" columns="minmax(0, 1fr) minmax(0, 1fr)" gap={10}>
              <Stack gap={4}>
                <Heading level={3}>Music › Rock</Heading>
                <Row gap={5} wrap>
                  {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                    <Placeholder key={i} w={30} h={30} />
                  ))}
                </Row>
                <Region n={3} label="Pile" status="later">
                  <Small>Prog to revisit · 8</Small>
                </Region>
              </Stack>
              <Stack gap={4}>
                <Heading level={3}>Screen › Drama</Heading>
                <Row gap={5} wrap>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Placeholder key={i} w={26} h={38} />
                  ))}
                </Row>
                <Region n={5} label="Minimap" status="later">
                  <Small tone="muted">37%</Small>
                </Region>
              </Stack>
            </Wireframe>
            <Region n={4} label="Tray" status="later" dashed>
              <Row gap={6} align="center">
                <Small>Tray 5</Small>
                <Chip>Drop here D</Chip>
                <Chip dim>Put back</Chip>
              </Row>
            </Region>
          </Stack>
        </Region>
      </Stack>
      <Region n={6} label="Panel" status="later">
        <Stack gap={4}>
          <Small tone="default" weight="bold">
            Atlas · 2,318 saves
          </Small>
          <Stack gap={0}>
            <Field name="By Shelf" value="2,251 · until you move them" />
            <Field name="By you" value="67 · pinned for good" />
            <Field name="Piles" value="4 named" />
          </Stack>
        </Stack>
      </Region>
    </Wireframe>
  );
}

function Triage() {
  return (
    <Wireframe
      toolbar={
        <Text as="span" size="sm" tone="muted">
          Triage · Saved showcases
        </Text>
      }
      toolbarEnd={<Segmented items={["Contact sheet", "Reel"]} active="Contact sheet" />}
      columns="minmax(0, 1fr) 230px"
    >
      <Stack gap={8}>
        <Region n={7} label="Progress" status="later">
          <Small>15 of 160 decided</Small>
        </Region>
        <Region n={8} label="Contact sheet" status="later">
          <Stack gap={6}>
            <Line end={210}>
              <Small tone="default">Shaders · 34 · 27 left</Small>
              <>
                <Chip>Keep the rest</Chip>
                <Chip>Skip the rest</Chip>
              </>
            </Line>
            <Row gap={8} wrap>
              {["Keep", "Skip", "Keep ★★★", "", "Later", ""].map((stamp, i) => (
                <Placeholder key={`${stamp}-${i}`} w={70} h={52} badge={stamp || undefined} dim={stamp === "Skip"} />
              ))}
            </Row>
          </Stack>
        </Region>
        <Region n={10} label="Reel" status="later" dashed>
          <Small tone="muted">Each plays its most active three seconds, then moves on.</Small>
        </Region>
      </Stack>
      <Region n={9} label="Session" status="later">
        <Stack gap={6}>
          <Stack gap={0}>
            <Field name="Kept" value="26" />
            <Field name="Skipped" value="11" />
            <Field name="Pace" value="4.1 s per decision" />
          </Stack>
          <Row>
            <Chip>Send 26 to the Atlas</Chip>
          </Row>
        </Stack>
      </Region>
    </Wireframe>
  );
}

// ---------------------------------------------------------------- the canvas

export default function ShelfWireframes() {
  return (
    <Wireframes
      data={data}
      drawings={{
        "saving-panel": <SavingPanel />,
        "saving-ways": <SavingWays />,
        "studio-window": <StudioWindow />,
        "studio-inspector": <StudioInspector />,
        collections: <CollectionsDrawing />,
        organising: <OrganisingDrawing />,
        "issues-web": <IssueWeb />,
        "issues-email": <IssueEmail />,
        circles: <CirclesDrawing />,
        kits: <ShareKitsDrawing />,
        account: <AccountDrawing />,
        "atlas-map": <AtlasMap />,
        "atlas-triage": <Triage />,
      }}
    />
  );
}

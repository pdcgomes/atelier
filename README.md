# Atelier

Themeable canvases for Claude Code. An agent writes a canvas, a live view of its work: a workstream, a studio of agents, a review, an approval queue. You open it in your browser beside the terminal. It updates as the agent works, it keeps what you mark on it, and its buttons start, resume and message the agents.

> Atelier is new and in active development. This README describes what it does once it's done; [docs/design.md](docs/design.md) is the plan.

## What it does

- **Rich canvases.** Tables, stats, charts, forms, images and video, from one kit, in one look.
- **Templates for what recurs.** A workstream, a studio of role agents, an approval room, a board, a checklist, a review, a comparison and a report. An agent fills in data instead of writing UI.
- **Themes.** Omarchy's look, with its palettes and dozens more. Every canvas follows the theme you pick.
- **Agent loops.** Mark something done, approve a cut or answer a form, and the agent sees it. Start a session from a button, in a terminal or in the background, and watch it work.
- **Sealed off.** A canvas runs in a sandboxed frame with no network, and nothing it asks for runs until you confirm it.

## How it works

- Agents write canvases into `.atelier/` in the project: TSX for anything custom, or JSON for a template.
- A small daemon on your machine compiles and checks them, serves the viewer at `127.0.0.1`, and keeps what you do on each canvas beside it.
- A Claude Code plugin teaches agents to write canvases, checks each one they write, tells the daemon what sessions are doing, and gives agents tools to show a canvas and wait for your answer.

## Docs

- [docs/design.md](docs/design.md): how it's built, the file formats, the kit, the daemon and the agent loops.
- [docs/security.md](docs/security.md): what a canvas can and can't do, and why.

## Licence

MIT. Atelier's Omarchy themes are Omarchy's palettes, under Omarchy's MIT licence; [NOTICE](NOTICE) has the details.

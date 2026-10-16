# Security

A canvas is code an agent wrote, and its buttons can start agents on your machine. Atelier is built so that a canvas can show you anything and ask for things, but can't act on its own or reach anything it shouldn't.

## What could go wrong

- **A canvas that does more than show itself.** It could read your files, send them somewhere, or call the daemon to start agents without you.
- **A web page you visit that talks to the daemon.** Any site in your browser can send requests to `127.0.0.1`, and DNS rebinding can make a hostname resolve there.
- **A prompt hidden in a button.** An agent can write a button whose prompt does something you wouldn't want, hoping you click without reading it.
- **A path that leads out of the project.** A canvas can ask to show `../../.ssh/id_ed25519.png`, or a symlink called `shot.png` that points at your keychain.
- **Shell injection.** A prompt or a path that reaches a shell can run commands.

## What stops it

### Canvases are sealed off

- Every canvas runs in an iframe sandboxed with `allow-scripts` and without `allow-same-origin`. Its origin is opaque, so it can't read the viewer's cookie, storage or DOM.
- The frame's page is served with a Content-Security-Policy of `default-src 'none'`, allowing scripts, styles, images, fonts and media only from inline code, `blob:` and `data:`. It can't fetch, open a socket, load an image from anywhere, submit a form or navigate.
- The viewer frames only its own pages (`frame-src 'self'`), so a canvas can't take its frame elsewhere.
- The frame gets the kit, the compiled canvas, its state and the theme by `postMessage`, and imports the code from `blob:` URLs it makes itself.
- What a canvas needs from outside goes through the viewer, which checks every message's source and shape:
  - **State:** a canvas can only set keys in its own state.
  - **Files:** a canvas asks for a path; the viewer fetches it from the daemon, which applies the rules below, and hands back the bytes.
  - **Actions:** a canvas can only ask. Nothing runs until you've seen it in the confirm sheet and said yes.

### In a terminal, canvases are sealed off too

atelier-tui runs each canvas in its own QuickJS runtime, which has no files, no network and no processes: nothing but JavaScript. That's a tighter seal than the browser's frame, which at least has a DOM.

- The only way out is `__host`, which takes what a frame could send the viewer (state, actions to confirm, errors) and keeps timers. atelier-tui checks each message as the viewer checks a frame's: a state key has to be a string of up to 200 characters, and an action has to be one it knows, its parts the right shape (`validAction`).
- The daemon's token is never in the engine. A canvas can't fetch: images come through `/api/file`, under the rules below, fetched by atelier-tui itself.
- Each call into a canvas has three seconds and its runtime 256 MB; past either, it stops, and says so.
- A terminal takes escape sequences in text, so control characters are stripped from everything a canvas gives as it's read, and characters that change the direction of text are dropped. A canvas can't set the window's title, write to the clipboard or send an image command. Images are drawn with escape sequences atelier-tui writes itself, from what it decoded.
- Actions wait in the same confirm sheet as the viewer's, with the prompt in full; control and direction characters in it are shown as their codes, so a prompt can't hide what it says. `y` counts only once the sheet has been up for 600 ms, so a key already on its way can't answer it. A web page opens in your browser; a video or a PDF is copied out of the project, where the daemon checked it by its first bytes, into `~/.atelier/cache/tui`, and opens in its own app from there.

### The daemon only answers you

- It listens on 127.0.0.1, never on another interface.
- It refuses any request whose `Host` header isn't `127.0.0.1:<port>` or `localhost:<port>`, which defeats DNS rebinding.
- Every route except the frame's page needs the session. The viewer has it as an `HttpOnly`, `SameSite=Strict` cookie, set from the one-time link the CLI opens; the CLI and the plugin send the token as a header.
- Requests that change anything must come from the viewer's own origin (`Origin` checked), or carry the token header.
- `~/.atelier/daemon.json`, which holds the token, is readable only by you.

### Files come only from where canvases belong

- The daemon serves files only from the roots of the projects it knows and from `~/.atelier`, and only images, videos, PDFs and Markdown.
- A path is resolved, symlinks and all, before it's checked. The file is then opened without following symlinks and checked again by the path the operating system has for what was opened, so nothing can be swapped in between.
- An image or PDF has to be one by its first bytes as well as its name. SVG isn't served, since it can carry scripts.
- For a file anywhere else, the answer is the same whether or not it exists.

### Agents start only when you say so

- An action from a canvas shows its kind, its project and its full prompt in the confirm sheet. It runs when you confirm it there.
- Commands are spawned with argument lists, never as shell strings.
- A terminal tab runs a script the daemon wrote, which reads the prompt from a file beside it. The prompt is never part of a command line a shell parses.
- Background runs start with Claude Code's own permission settings; Atelier doesn't loosen them.

### Agents read your answers but can't forge them

- Only the viewer writes a canvas's `.state.json` and `.events.jsonl`. The skill tells agents never to, and the daemon records which writes came from the viewer.

## Reporting a problem

Open a private security advisory on GitHub for this repository.

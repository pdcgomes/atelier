// The viewer's own stylesheet, after the kit's: the bar, the frames and the
// overlays. Like the kit, it takes every colour from the theme.

export const css = String.raw`
html, body { height: 100%; overflow: hidden; }
#app { height: 100%; }
.av { display: grid; grid-template-rows: auto minmax(0, 1fr) auto; height: 100%; }

/* The bar, like Waybar: workspaces on the left, the clock in the middle, the rest on the right. */
.av-bar { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); align-items: center; gap: 10px; padding: 6px 8px 0; font-size: 12px; }
.av-bar-left, .av-bar-right { display: flex; align-items: center; gap: 6px; min-width: 0; }
.av-bar-right { justify-content: flex-end; }
.av-module { display: inline-flex; align-items: center; gap: 6px; height: 24px; padding: 0 10px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--panel); color: var(--text-2); white-space: nowrap; font: inherit; }
button.av-module { cursor: pointer; }
button.av-module:hover { color: var(--text); border-color: var(--focus); }
.av-workspaces { display: inline-flex; align-items: center; gap: 2px; padding: 0 3px; height: 24px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--panel); min-width: 0; overflow-x: auto; scrollbar-width: none; }
.av-ws { display: inline-flex; align-items: center; gap: 6px; height: 18px; padding: 0 7px; border: 0; border-radius: calc(var(--radius) - 3px); background: transparent; color: var(--text-3); font: inherit; cursor: pointer; white-space: nowrap; }
.av-ws:hover { color: var(--text); background: var(--surface); }
.av-ws.av-on { background: var(--accent); color: var(--bg); }
.av-ws-name { max-width: 16ch; overflow: hidden; text-overflow: ellipsis; }
.av-ws:not(.av-on) .av-ws-name { display: none; }
.av-workspaces:hover .av-ws-name { display: inline; }
.av-project { color: var(--text); }
.av-clock { color: var(--text); font-variant-numeric: tabular-nums; }
.av-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--tone); display: inline-block; }
.av-agents b { font-weight: 500; color: var(--tone); }
.av-swatch { display: inline-flex; gap: 2px; }
.av-swatch i { width: 7px; height: 12px; border-radius: 2px; display: inline-block; }

/* The canvas */
.av-main { position: relative; min-height: 0; }
.av-frames { position: absolute; inset: 0; }
.av-frame { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; background: var(--bg); color-scheme: normal; }
.av-frame-waiting { visibility: hidden; }
.av-page { position: absolute; inset: 0; overflow: auto; padding: 14px; }
.av-page > .at-stack { max-width: 1100px; margin: 0 auto; }

/* What's wrong with the canvas on screen */
.av-strip { margin: 0 8px 8px; max-height: 32vh; overflow: auto; }
.av-strip pre { margin: 0; white-space: pre-wrap; font: inherit; font-size: 12px; color: var(--text-2); }
.av-strip .av-where { color: var(--danger); }

/* Overlays */
.av-scrim { position: fixed; inset: 0; background: color-mix(in srgb, var(--bg) 62%, transparent); display: flex; align-items: flex-start; justify-content: center; padding: 9vh 16px 16px; z-index: 10; }
.av-scrim.av-side { justify-content: flex-end; align-items: stretch; padding: 40px 8px 8px; }
.av-scrim.av-full { align-items: stretch; padding: 40px 8px 8px; }
.av-sheet { width: min(640px, 100%); max-height: 100%; display: flex; flex-direction: column; min-height: 0; }
.av-sheet > .at-panel { display: flex; flex-direction: column; min-height: 0; max-height: 100%; }
.av-side .av-sheet { width: min(560px, 100%); }
.av-full .av-sheet { width: min(1200px, 100%); }
.av-scroll { overflow: auto; min-height: 0; }
.av-filter { width: 100%; height: 30px; padding: 0 10px; margin: 8px 0; border: 1px solid var(--border); border-radius: calc(var(--radius) - 2px); background: var(--surface); color: var(--text); font: inherit; outline: none; }
.av-filter:focus { border-color: var(--focus); }
.av-list { list-style: none; margin: 0; padding: 0; }
.av-item { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 12px; padding: 5px 8px; border-radius: calc(var(--radius) - 3px); cursor: pointer; color: var(--text-2); }
.av-item .av-sub { color: var(--text-3); font-size: 11.5px; }
.av-item.av-on { background: var(--selection); color: var(--text); }
.av-item b { font-weight: 500; color: var(--text); }
.av-group { margin: 10px 8px 4px; color: var(--text-3); font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; }
.av-keys { display: grid; grid-template-columns: auto 1fr; gap: 6px 16px; margin: 8px 0 4px; }
.av-confirm-prompt { margin: 8px 0 0; padding: 10px 12px; max-height: 42vh; overflow: auto; border: 1px solid var(--border); border-radius: calc(var(--radius) - 2px); background: var(--surface); color: var(--text); white-space: pre-wrap; font: inherit; }
.av-buttons { display: flex; gap: 8px; justify-content: flex-end; margin-top: 12px; }
.av-doc { display: flex; align-items: center; justify-content: center; min-height: 0; flex: 1; }
.av-doc img, .av-doc video { max-width: 100%; max-height: 78vh; border-radius: calc(var(--radius) - 2px); }
.av-doc iframe { width: 100%; height: 78vh; border: 0; border-radius: calc(var(--radius) - 2px); background: var(--surface); }
.av-doc-md { align-self: stretch; width: 100%; max-width: 820px; margin: 0 auto; }

/* Runs */
.av-run { border: 1px solid var(--border); border-radius: calc(var(--radius) - 2px); padding: 8px 10px; margin-top: 8px; }
.av-run.av-on { border-color: var(--focus); }
.av-run-head { display: flex; align-items: center; gap: 8px; cursor: pointer; }
.av-run-title { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text); }
.av-steps { list-style: none; margin: 8px 0 0; padding: 0; max-height: 40vh; overflow: auto; font-size: 12px; }
.av-steps li { display: grid; grid-template-columns: 5ch minmax(0, 1fr); gap: 8px; padding: 2px 0; color: var(--text-2); }
.av-steps li > span:first-child { color: var(--text-3); }
.av-steps .av-step-tool { color: var(--info); }
.av-steps .av-step-error { color: var(--danger); }
.av-steps .av-step-result { color: var(--success); }
.av-steps pre { margin: 0; white-space: pre-wrap; font: inherit; }

/* Toasts */
.av-toasts { position: fixed; right: 12px; bottom: 12px; display: flex; flex-direction: column; gap: 6px; z-index: 20; max-width: min(420px, 90vw); }
.av-toast { padding: 7px 12px; border: 1px solid var(--tone); border-radius: var(--radius); background: var(--panel); color: var(--text); font-size: 12px; }
`;

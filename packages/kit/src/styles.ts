// The kit's stylesheet, which the runtime puts in the frame. Colours come
// only from the theme's variables; `--tone` is set by a tone's class.

export const css = String.raw`
:root {
  --radius: 8px;
  --font: "JetBrains Mono", "JetBrainsMono Nerd Font", "CaskaydiaMono Nerd Font", "Cascadia Mono", "SF Mono", ui-monospace, Menlo, Consolas, monospace;
  --tone: var(--text-2);
}
*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; }
body { background: var(--bg); color: var(--text); font: 13px/1.55 var(--font); -webkit-font-smoothing: antialiased; }
#root { padding: 14px; }
::selection { background: var(--selection); }
* { scrollbar-width: thin; scrollbar-color: var(--border) transparent; }
:focus-visible { outline: 1px solid var(--focus); outline-offset: 2px; }

.at-t-default { --tone: var(--text-2); }
.at-t-accent { --tone: var(--accent); }
.at-t-success { --tone: var(--success); }
.at-t-warning { --tone: var(--warning); }
.at-t-danger { --tone: var(--danger); }
.at-t-info { --tone: var(--info); }
.at-t-muted { --tone: var(--text-3); }
.at-toned { color: var(--tone); }

/* Layout */
.at-stack { display: flex; flex-direction: column; min-width: 0; }
.at-row { display: flex; flex-wrap: wrap; min-width: 0; }
.at-row.at-nowrap { flex-wrap: nowrap; }
.at-grid { display: grid; min-width: 0; }
.at-split { display: grid; min-width: 0; }
@media (max-width: 680px) { .at-split { grid-template-columns: minmax(0, 1fr) !important; } }
.at-divider { display: flex; align-items: center; gap: 10px; color: var(--text-3); font-size: 11.5px; margin: 4px 0; }
.at-divider::before, .at-divider::after { content: ""; flex: 1; height: 1px; background: var(--border); }
.at-divider:not(.at-labelled)::after { display: none; }

/* Panels: the title sits in the top border, as in a tiling window manager's bars. */
.at-panel { --line: var(--border); position: relative; margin: 0; min-width: 0; border: 1px solid var(--line); border-radius: var(--radius); background: var(--panel); padding: 2px 12px 12px; }
.at-panel.at-toned-line { --line: var(--tone); }
.at-panel.at-focus, .at-panel:focus-within { --line: var(--focus); }
.at-panel:not(:has(> legend)) { padding-top: 12px; }
.at-panel > legend { display: flex; align-items: center; gap: 8px; width: 100%; padding: 0 6px; margin: 0; font-size: 12px; line-height: 1.2; }
.at-panel-title { color: var(--text); font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.at-panel.at-focus .at-panel-title, .at-panel:focus-within .at-panel-title { color: var(--focus); }
.at-panel-line { flex: 1; min-width: 10px; height: 1px; background: var(--line); }
.at-panel-info { display: flex; align-items: center; gap: 8px; color: var(--text-3); font-size: 11.5px; white-space: nowrap; }
.at-panel-body { padding-top: 8px; min-width: 0; }

/* Tabs, like a bar's workspaces */
.at-tabs-bar { display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 12px; }
.at-tab { appearance: none; font: inherit; font-size: 12.5px; color: var(--text-2); background: none; border: 1px solid transparent; border-radius: 5px; padding: 3px 10px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
.at-tab:hover { color: var(--text); background: var(--surface); }
.at-tab[aria-selected="true"] { color: var(--text); background: var(--surface); border-color: var(--focus); }
.at-tab-n { color: var(--text-3); font-size: 11px; }
.at-tab-badge { color: var(--text-3); font-size: 11px; padding: 0 5px; border-radius: 4px; background: var(--surface); }
.at-tab[aria-selected="true"] .at-tab-badge { background: var(--panel); }

/* Sections */
.at-section > summary { list-style: none; cursor: pointer; display: flex; align-items: center; gap: 8px; padding: 4px 0; color: var(--text); font-weight: 700; user-select: none; }
.at-section > summary::-webkit-details-marker { display: none; }
.at-section > summary::before { content: "▸"; color: var(--text-3); width: 10px; }
.at-section[open] > summary::before { content: "▾"; }
.at-section-count { color: var(--text-3); font-weight: 400; }
.at-section-info { margin-left: auto; color: var(--text-3); font-weight: 400; font-size: 12px; }
.at-section-body { padding: 6px 0 4px 18px; }

/* Text */
.at-h1, .at-h2, .at-h3 { margin: 0; color: var(--text); display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.at-h1 { font-size: 20px; font-weight: 800; letter-spacing: -0.01em; }
.at-h2 { font-size: 15px; font-weight: 700; }
.at-h3 { font-size: 11.5px; font-weight: 700; color: var(--text-2); text-transform: uppercase; letter-spacing: 0.07em; }
.at-h-info { font-size: 12px; font-weight: 400; color: var(--text-3); text-transform: none; letter-spacing: 0; }
.at-text { margin: 0; }
.at-text.at-toned { color: var(--tone); }
.at-xs { font-size: 11px; }
.at-sm { font-size: 12px; }
.at-lg { font-size: 15px; }
.at-medium { font-weight: 600; }
.at-bold { font-weight: 700; }
.at-italic { font-style: italic; }
.at-tabular { font-variant-numeric: tabular-nums; }
.at-truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.at-text-2 { color: var(--text-2); }
.at-text-3 { color: var(--text-3); }
.at-code { background: var(--surface); border-radius: 4px; padding: 1px 5px; font-size: 0.92em; color: var(--info); }
.at-codeblock { margin: 0; position: relative; background: var(--surface); border: 1px solid var(--border); border-radius: 6px; font-size: 12px; overflow: hidden; }
.at-codeblock-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 4px 10px; border-bottom: 1px solid var(--border); color: var(--text-3); font-size: 11px; }
.at-codeblock pre { margin: 0; padding: 10px 12px; overflow-x: auto; white-space: pre; color: var(--text); }
.at-codeblock.at-wrap pre { white-space: pre-wrap; overflow-wrap: anywhere; }
.at-kbd { display: inline-block; border: 1px solid var(--border); border-bottom-width: 2px; border-radius: 4px; padding: 0 5px; font-size: 11px; line-height: 1.5; color: var(--text-2); background: var(--surface); font-family: var(--font); }
.at-link { color: var(--accent); text-decoration: underline; text-underline-offset: 2px; text-decoration-thickness: 1px; cursor: pointer; background: none; border: 0; padding: 0; font: inherit; text-align: left; }
.at-stack > .at-link { align-self: flex-start; }
.at-time { color: var(--text-3); white-space: nowrap; }

/* Markdown */
.at-md > :first-child { margin-top: 0; }
.at-md > :last-child { margin-bottom: 0; }
.at-md p, .at-md ul, .at-md ol, .at-md blockquote, .at-md .at-table-wrap, .at-md .at-codeblock { margin: 0 0 10px; }
.at-md ul, .at-md ol { padding-left: 20px; }
.at-md li { margin: 2px 0; }
.at-md li::marker { color: var(--text-3); }
.at-md h1, .at-md h2, .at-md h3, .at-md h4 { margin: 16px 0 8px; color: var(--text); }
.at-md h1 { font-size: 18px; } .at-md h2 { font-size: 15px; } .at-md h3, .at-md h4 { font-size: 13px; }
.at-md blockquote { border-left: 2px solid var(--border); padding-left: 10px; color: var(--text-2); }
.at-md hr { border: 0; border-top: 1px solid var(--border); margin: 12px 0; }
.at-md img { max-width: 100%; }

/* Badges */
.at-badge { display: inline-flex; align-items: center; gap: 5px; border-radius: 4px; padding: 0 7px; font-size: 11.5px; line-height: 1.7; white-space: nowrap; color: var(--tone); background: color-mix(in srgb, var(--tone) 13%, transparent); border: 1px solid color-mix(in srgb, var(--tone) 32%, transparent); vertical-align: middle; }
.at-badge.at-v-solid { color: var(--bg); background: var(--tone); border-color: var(--tone); }
.at-badge.at-v-outline { background: transparent; }
.at-badge.at-dot::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: var(--tone); }

/* Stats */
.at-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; }
.at-stat { display: flex; flex-direction: column; gap: 2px; min-width: 0; padding: 9px 11px; border: 1px solid var(--border); border-radius: 6px; background: var(--surface); }
.at-stat-label { font-size: 11px; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.06em; }
.at-stat-value { font-size: 21px; font-weight: 800; line-height: 1.25; color: var(--text); }
.at-stat.at-toned-value .at-stat-value { color: var(--tone); }
.at-stat-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 11.5px; color: var(--text-3); }

/* Meters */
.at-meter { display: grid; gap: 4px; min-width: 0; }
.at-meter-head { display: flex; justify-content: space-between; gap: 10px; font-size: 12px; color: var(--text-2); }
.at-meter-value { color: var(--text); }
.at-meter-track { display: flex; height: 7px; border-radius: 2px; background: var(--surface); overflow: hidden; }
.at-meter-fill { background: var(--tone); }
.at-meter-track:not(:has(> :not(.at-shaded))) { gap: 1px; background: none; }
.at-meter-blocks { font-size: 13px; line-height: 1; color: var(--tone); white-space: nowrap; overflow: hidden; }
.at-meter-blocks .at-meter-rest { color: var(--border); }

/* Tables */
.at-table-tools { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; }
.at-table-wrap { overflow: auto; border: 1px solid var(--border); border-radius: 6px; }
.at-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.at-table th { position: sticky; top: 0; z-index: 1; background: var(--surface); color: var(--text-2); font-weight: 600; text-align: left; padding: 6px 10px; border-bottom: 1px solid var(--border); white-space: nowrap; }
.at-table th button { all: unset; cursor: pointer; display: inline-flex; gap: 4px; align-items: center; }
.at-table th button:focus-visible { outline: 1px solid var(--focus); }
.at-table th .at-sort { color: var(--text-3); font-size: 10px; }
.at-table td { padding: 6px 10px; border-top: 1px solid color-mix(in srgb, var(--border) 55%, transparent); vertical-align: top; }
.at-table tbody tr:first-child td { border-top: 0; }
.at-table.at-dense td, .at-table.at-dense th { padding: 3px 8px; }
.at-table tr.at-toned-row td:first-child { box-shadow: inset 2px 0 var(--tone); }
.at-table tbody tr:hover td { background: color-mix(in srgb, var(--selection) 55%, transparent); }
.at-table .at-right { text-align: right; font-variant-numeric: tabular-nums; }
.at-table .at-center { text-align: center; }
.at-table-actions { display: flex; gap: 6px; justify-content: flex-end; }
.at-empty { color: var(--text-3); font-size: 12px; padding: 6px 0; }

/* Key and value */
.at-kv { display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 4px 16px; margin: 0; font-size: 12.5px; }
.at-kv.at-kv-2 { grid-template-columns: max-content minmax(0, 1fr) max-content minmax(0, 1fr); }
.at-kv dt { color: var(--text-3); }
.at-kv dd { margin: 0; min-width: 0; }

/* Timeline */
.at-timeline { list-style: none; margin: 0; padding: 0; }
.at-timeline li { position: relative; display: grid; grid-template-columns: 12px minmax(0, 1fr); gap: 10px; padding-bottom: 12px; }
.at-timeline li::before { content: ""; position: absolute; left: 5px; top: 14px; bottom: -2px; width: 1px; background: var(--border); }
.at-timeline li:last-child::before { display: none; }
.at-timeline-dot { width: 11px; height: 11px; margin-top: 4px; border-radius: 50%; border: 2px solid var(--tone); background: var(--panel); }
.at-timeline-head { display: flex; gap: 8px; align-items: baseline; flex-wrap: wrap; }
.at-timeline-title { font-weight: 600; }
.at-timeline-body { color: var(--text-2); font-size: 12.5px; margin-top: 2px; }

/* Lanes */
.at-lanes { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(220px, 1fr); gap: 10px; overflow-x: auto; padding-bottom: 4px; }
.at-lane { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.at-lane-head { display: flex; justify-content: space-between; align-items: center; font-size: 11.5px; font-weight: 700; color: var(--tone); text-transform: uppercase; letter-spacing: 0.06em; border-bottom: 1px solid var(--tone); padding-bottom: 4px; }
.at-card { border: 1px solid var(--border); border-radius: 6px; background: var(--surface); padding: 8px 10px; display: grid; gap: 3px; min-width: 0; }
.at-card.at-toned-line { border-left: 2px solid var(--tone); }
.at-card-title { font-weight: 600; }
.at-card-detail { color: var(--text-2); font-size: 12px; }

/* Calendar */
.at-cal { display: grid; gap: 6px; }
.at-cal-head { display: flex; justify-content: space-between; align-items: center; }
.at-cal-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 3px; }
.at-cal-dow { font-size: 11px; color: var(--text-3); text-align: center; padding-bottom: 2px; }
.at-cal-day { min-height: 64px; border: 1px solid color-mix(in srgb, var(--border) 60%, transparent); border-radius: 4px; padding: 3px 5px; display: grid; align-content: start; gap: 2px; min-width: 0; }
.at-cal-day.at-out { opacity: 0.35; }
.at-cal-day.at-today { border-color: var(--focus); }
.at-cal-n { font-size: 11px; color: var(--text-3); }
.at-cal-event { font-size: 11px; line-height: 1.35; color: var(--tone); border-left: 2px solid var(--tone); padding-left: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* Tree */
.at-tree, .at-tree ul { list-style: none; margin: 0; padding: 0; }
.at-tree ul { margin-left: 7px; padding-left: 12px; border-left: 1px solid var(--border); }
.at-tree-item { display: flex; gap: 8px; align-items: center; padding: 2px 0; }
.at-tree-toggle { all: unset; cursor: pointer; width: 10px; color: var(--text-3); }
.at-tree-detail { color: var(--text-3); font-size: 12px; }

/* Diffs */
.at-diff { margin: 0; border: 1px solid var(--border); border-radius: 6px; overflow: auto; font-size: 12px; background: var(--surface); }
.at-diff-line { display: block; padding: 0 10px; white-space: pre; }
.at-diff-add { background: color-mix(in srgb, var(--success) 13%, transparent); color: var(--success); }
.at-diff-del { background: color-mix(in srgb, var(--danger) 13%, transparent); color: var(--danger); }
.at-diff-hunk { color: var(--info); }
.at-diff-file { color: var(--text); font-weight: 700; background: var(--panel); border-bottom: 1px solid var(--border); }

/* Media */
.at-figure { margin: 0; display: grid; gap: 4px; min-width: 0; }
.at-figure img, .at-figure video { display: block; max-width: 100%; border-radius: 6px; border: 1px solid var(--border); background: var(--surface); }
.at-figure figcaption { font-size: 12px; color: var(--text-3); }
.at-missing { display: grid; place-items: center; min-height: 60px; border: 1px dashed var(--border); border-radius: 6px; color: var(--text-3); font-size: 12px; padding: 8px; text-align: center; }
.at-gallery { display: grid; gap: 6px; }
.at-gallery button { all: unset; cursor: zoom-in; display: grid; gap: 3px; min-width: 0; }
.at-gallery img { width: 100%; object-fit: cover; object-position: top; border-radius: 5px; border: 1px solid var(--border); background: var(--surface); display: block; }
.at-gallery span { font-size: 11.5px; color: var(--text-3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.at-lightbox { position: fixed; inset: 0; z-index: 50; background: color-mix(in srgb, var(--bg) 94%, transparent); display: grid; place-items: center; padding: 20px; cursor: zoom-out; }
.at-lightbox img { max-width: 100%; max-height: calc(100vh - 80px); border-radius: 6px; border: 1px solid var(--border); }
.at-lightbox p { color: var(--text-2); margin: 8px 0 0; text-align: center; }

/* Charts */
.at-chart { display: grid; gap: 6px; min-width: 0; }
.at-chart-head { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.at-chart-title { font-size: 12px; font-weight: 700; color: var(--text); }
.at-chart-caption { font-size: 11.5px; color: var(--text-3); }
.at-chart svg { display: block; width: 100%; height: auto; overflow: visible; }
.at-chart svg text { fill: var(--text-3); font: 10.5px var(--font); }
.at-chart .at-axis { stroke: var(--border); }
.at-chart .at-gridline { stroke: color-mix(in srgb, var(--border) 65%, transparent); stroke-dasharray: 2 3; }
.at-chart .at-hover:hover { opacity: 0.8; }
.at-chart .at-value-label { fill: var(--text-2); }
.at-legend { display: flex; flex-wrap: wrap; gap: 4px 12px; font-size: 11.5px; color: var(--text-2); }
.at-legend span { display: inline-flex; align-items: center; gap: 5px; }
.at-legend i { width: 9px; height: 9px; border-radius: 2px; background: var(--c); display: inline-block; }
.at-spark { display: inline-block; vertical-align: middle; }
.at-spark-shade { fill: var(--wf-fill); }
.at-spark-blocks { font-size: 13px; line-height: 1; color: var(--tone); letter-spacing: 0; white-space: nowrap; }
.at-flow-node rect { fill: var(--surface); stroke: var(--border); }
.at-flow-node.at-current rect { stroke: var(--focus); stroke-width: 2; }
.at-flow-node text { fill: var(--text) !important; font-size: 11.5px !important; }
.at-flow-edge { fill: none; stroke: var(--text-3); stroke-width: 1.2; }
.at-flow-edge.at-back { stroke: var(--warning); stroke-dasharray: 4 3; }
.at-flow-label { fill: var(--text-2) !important; }

/* Forms */
.at-button { appearance: none; font: inherit; font-size: 12.5px; line-height: 1.4; border-radius: 5px; padding: 4px 12px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 8px; white-space: nowrap; border: 1px solid color-mix(in srgb, var(--tone) 45%, var(--border)); background: transparent; color: var(--tone); }
.at-button.at-t-default { --tone: var(--text); }
.at-button:hover:not(:disabled) { background: color-mix(in srgb, var(--tone) 12%, transparent); }
.at-button.at-v-solid { background: var(--tone); border-color: var(--tone); color: var(--bg); font-weight: 600; }
.at-button.at-v-solid:hover:not(:disabled) { background: color-mix(in srgb, var(--tone) 85%, var(--text)); }
.at-button.at-v-ghost { border-color: transparent; }
.at-button.at-small { font-size: 11.5px; padding: 2px 8px; }
.at-button:disabled { opacity: 0.45; cursor: default; }
.at-button .at-kbd { margin-right: -4px; }
.at-field { display: grid; gap: 4px; min-width: 0; }
.at-field-label { font-size: 12px; color: var(--text-2); }
.at-field-hint { font-size: 11.5px; color: var(--text-3); }
.at-field-error { font-size: 11.5px; color: var(--danger); }
.at-input { font: inherit; font-size: 12.5px; color: var(--text); background: var(--surface); border: 1px solid var(--border); border-radius: 5px; padding: 5px 9px; width: 100%; min-width: 0; }
.at-input::placeholder { color: var(--text-3); }
.at-input:focus { outline: none; border-color: var(--focus); }
.at-input.at-invalid { border-color: var(--danger); }
textarea.at-input { resize: vertical; min-height: 64px; line-height: 1.5; }
select.at-input { cursor: pointer; }
.at-check { display: inline-flex; align-items: center; gap: 8px; cursor: pointer; font-size: 12.5px; }
.at-check input { appearance: none; margin: 0; width: 14px; height: 14px; border: 1px solid var(--text-3); border-radius: 3px; background: var(--surface); display: grid; place-items: center; cursor: pointer; flex: none; }
.at-check input[type="radio"] { border-radius: 50%; }
.at-check input:checked { background: var(--accent); border-color: var(--accent); }
.at-check input[type="checkbox"]:checked::after { content: "✓"; color: var(--bg); font-size: 10px; line-height: 1; font-weight: 800; }
.at-check input[type="radio"]:checked::after { content: ""; width: 6px; height: 6px; border-radius: 50%; background: var(--bg); }
.at-options { display: flex; flex-wrap: wrap; gap: 6px 16px; }
.at-options.at-vertical { flex-direction: column; }
.at-toggle { display: inline-flex; align-items: center; gap: 8px; cursor: pointer; font-size: 12.5px; }
.at-toggle input { appearance: none; margin: 0; width: 28px; height: 16px; border-radius: 8px; background: var(--border); position: relative; cursor: pointer; flex: none; transition: background 0.15s; }
.at-toggle input::after { content: ""; position: absolute; top: 2px; left: 2px; width: 12px; height: 12px; border-radius: 50%; background: var(--text-2); transition: transform 0.15s; }
.at-toggle input:checked { background: var(--accent); }
.at-toggle input:checked::after { transform: translateX(12px); background: var(--bg); }
.at-slider { display: flex; align-items: center; gap: 10px; }
.at-slider { min-width: 0; }
.at-slider input { flex: 1; min-width: 0; accent-color: var(--accent); }
.at-slider output { min-width: 3ch; text-align: right; color: var(--text); font-variant-numeric: tabular-nums; }
.at-rating { display: inline-flex; gap: 2px; }
.at-rating button { all: unset; cursor: pointer; font-size: 16px; line-height: 1; color: var(--border); }
.at-rating button.at-on { color: var(--warning); }
.at-rating button:focus-visible { outline: 1px solid var(--focus); }
.at-form { display: grid; gap: 12px; }
.at-form-foot { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.at-sent { font-size: 12px; color: var(--success); }

/* Approval and Needs you */
.at-ask { display: grid; gap: 6px; padding: 10px 12px; border: 1px solid var(--border); border-left: 2px solid var(--tone); border-radius: 6px; background: var(--surface); min-width: 0; }
.at-ask-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.at-ask-title { font-weight: 700; }
.at-ask-detail { color: var(--text-2); font-size: 12.5px; }
.at-ask-meta { color: var(--text-3); font-size: 12px; }
.at-ask-actions { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
.at-ask.at-settled { opacity: 0.7; }

/* Problems */
.at-problem { border: 1px solid var(--danger); color: var(--danger); background: color-mix(in srgb, var(--danger) 9%, transparent); border-radius: 6px; padding: 10px 12px; white-space: pre-wrap; font-size: 12px; }

/* Wireframes: an app's screens drawn as numbered regions, in the app's own type
   rather than the canvas's. The notes, the legend and the rest are the canvas's. */
:root {
  --font-ui: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", "Helvetica Neue", system-ui, sans-serif;
  --wf-stroke: var(--border);
  --wf-stroke-strong: color-mix(in srgb, var(--border) 90%, var(--text-3));
  --wf-stroke-faint: color-mix(in srgb, var(--border) 55%, transparent);
  --wf-fill: color-mix(in srgb, var(--text) 14%, var(--panel));
  --wf-fill-faint: color-mix(in srgb, var(--text) 6%, var(--panel));
  --wf-fill-strong: color-mix(in srgb, var(--text) 20%, var(--panel));
}
.at-wf, .at-wf-tile, .at-wf-list, .at-wf-field, .at-wf-seg, .at-wf-chip { font-family: var(--font-ui); }
.at-wf { font-size: 11px; line-height: 18px; color: var(--text); min-width: 0; }
.at-wf-marker { display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; border-radius: 8px; background: var(--accent); color: var(--bg); font: 600 10px/1 var(--font-ui); flex-shrink: 0; }
.at-wf-status { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; line-height: 18px; color: var(--text-2); white-space: nowrap; }
.at-wf-status-dot { width: 7px; height: 7px; border-radius: 4px; background: var(--tone); flex-shrink: 0; }
.at-wf-legend { display: flex; flex-wrap: wrap; gap: 4px 16px; }
.at-wf-legend > span { display: inline-flex; align-items: center; gap: 6px; }
.at-wf-count { font-size: 11px; color: var(--text-3); font-variant-numeric: tabular-nums; }
.at-wf-meanings { display: grid; grid-template-columns: minmax(150px, max-content) minmax(0, 1fr); gap: 6px 8px; font-size: 12px; line-height: 16px; color: var(--text-2); }
.at-wf-meanings > div { display: contents; }
.at-wf-caption { font-size: 9.5px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; color: var(--text-3); white-space: nowrap; }
.at-wf-notes { display: grid; gap: 14px; }
@media (max-width: 680px) { .at-wf-notes { grid-template-columns: minmax(0, 1fr) !important; } }
.at-wf-note { display: grid; grid-template-columns: 18px minmax(0, 1fr); gap: 8px; }
.at-wf-note-head { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; }
.at-wf-note-title { font-size: 12px; line-height: 16px; font-weight: 600; color: var(--text); }
.at-wf-note-text { margin: 2px 0 0; font-size: 12px; line-height: 16px; color: var(--text-2); }
.at-wf-figure { margin: 0; display: grid; gap: 6px; }
.at-wf-under { font-size: 11px; color: var(--text-3); }
.at-wf-window { border: 1px solid var(--wf-stroke-strong); border-radius: 10px; overflow: hidden; background: var(--panel); }
.at-wf-toolbar { display: flex; align-items: center; gap: 10px; height: 34px; padding: 0 10px; background: var(--panel); border-bottom: 1px solid var(--wf-stroke-faint); }
.at-wf-lights { display: flex; gap: 5px; }
.at-wf-toolbar-end { margin-left: auto; display: inline-flex; align-items: center; gap: 8px; }
.at-wf .at-pressable, .at-pressable.at-wf-tile, .at-pressable.at-wf-chip, .at-wf-list-row.at-pressable { cursor: pointer; }
.at-wf-chip.at-pressable { border: 0; font-family: var(--font-ui); }
.at-wf-list-row.at-pressable:hover, .at-wf-chip.at-pressable:hover { background: color-mix(in srgb, var(--wf-fill) 70%, var(--text-3)); }
.at-wf-lights i { width: 10px; height: 10px; border-radius: 5px; background: color-mix(in srgb, var(--text-3) 55%, transparent); }
.at-wf-body { display: flex; flex-direction: column; padding: 10px; min-width: 0; }
.at-wf-body.at-wf-grid { display: grid; }
.at-wf-bare > .at-wf-body { padding: 0; }
.at-wf-phone-figure { justify-items: center; }
.at-wf-phone { width: 201px; height: 437px; border: 1px solid var(--wf-stroke-strong); border-radius: 27px; overflow: hidden; display: flex; flex-direction: column; background: var(--panel); }
.at-wf-phone-top { height: 31px; flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; padding: 0 18px; font-size: 11px; color: var(--text-2); }
.at-wf-phone-top i { width: 62px; height: 18px; border-radius: 9px; background: color-mix(in srgb, var(--text-3) 55%, transparent); }
.at-wf-phone-top span:last-child { color: var(--text-3); }
.at-wf-phone > .at-wf-body { flex: 1; min-height: 0; padding: 0 5px; gap: 4px; }
.at-wf-phone-home { height: 17px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.at-wf-phone-home i { width: 67px; height: 3px; border-radius: 2px; background: var(--text-3); }
.at-wf-region { border: 1px solid var(--wf-stroke); border-radius: 6px; padding: 7px; }
.at-wf-region.at-dashed { border-style: dashed; }
.at-wf-region.at-grow { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; overflow: hidden; }
.at-wf-region.at-grow > .at-wf-region-body { flex: 1; min-height: 0; display: flex; flex-direction: column; }
.at-wf-region.at-grow > .at-wf-region-body > .at-stack { flex: 1; }
.at-wf-region.at-grow > .at-wf-region-body > .at-stack > :last-child:not(:first-child) { margin-top: auto; }
.at-wf-region-head, .at-wf-list-head { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
.at-wf-list-head { padding: 2px 5px 4px; margin: 0; }
/* Cursor's wireframes set the status, and a lone line of small text, in a box of 14px type, whose strut makes those lines 19px. */
.at-wf-region-status { margin-left: auto; min-width: 0; overflow: hidden; font-size: 14px; }
.at-wf-region-body > .at-text.at-sm { line-height: 19px; }
.at-wf-region-head > .at-wf-caption, .at-wf-list-head > .at-wf-caption { min-width: 0; overflow: hidden; text-overflow: ellipsis; flex-shrink: 1; }
.at-wf-region-status .at-wf-status { max-width: 100%; }
.at-wf-region-status .at-wf-status-label { overflow: hidden; text-overflow: ellipsis; }
.at-wf-region-body { min-width: 0; }
.at-wf-tile { display: inline-flex; flex-direction: column; gap: 3px; vertical-align: top; min-width: 0; }
.at-wf-tile.at-wide { display: flex; width: 100%; }
.at-wf-tile.at-wide > .at-wf-tile-box { width: 100%; }
.at-wf-tile.at-fill { flex: 1; }
.at-wf-tile-box { position: relative; display: flex; align-items: center; justify-content: center; border-radius: 3px; background: var(--wf-fill); outline-offset: 1px; }
.at-wf-tile.at-fill .at-wf-tile-box { flex: 1; min-height: 40px; }
.at-wf-tile-box.at-dim { background: var(--wf-fill-faint); }
.at-wf-tile-box.at-selected { outline: 2px solid var(--accent); }
.at-wf-tile-box.at-dashed { outline: 1.5px dashed var(--text-2); }
.at-wf-tile-box.at-paper { background: var(--panel); border: 1px solid var(--wf-stroke); border-radius: 2px; }
.at-wf-inset { position: absolute; background: var(--wf-fill); }
.at-wf-tile-label { position: relative; font-size: 11px; color: var(--text-3); text-align: center; padding: 0 4px; }
.at-wf-tile-badge { position: absolute; right: 3px; bottom: 2px; font-size: 9px; color: var(--text-2); }
.at-wf-tile-caption { font-size: 9.5px; color: var(--text-3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.at-wf-list { min-width: 0; font-size: 11.5px; }
.at-wf-list-row { display: flex; align-items: center; gap: 6px; padding: 2px 5px; border-radius: 4px; color: var(--text); }
.at-wf-list-row.at-selected { background: var(--wf-fill); }
.at-wf-list-row.at-dim { color: var(--text-3); }
.at-wf-list-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.at-wf-list-count { margin-left: auto; color: var(--text-3); font-size: 10.5px; white-space: nowrap; }
.at-wf-list-rule { border: 0; height: 1px; background: var(--wf-stroke-faint); margin: 4px 2px; }
.at-wf-list-note { font-size: 10px; color: var(--text-3); padding: 2px 5px; }
.at-wf-dot { width: 6px; height: 6px; border-radius: 3px; background: var(--tone); flex-shrink: 0; }
.at-wf-field { display: grid; grid-template-columns: 62px minmax(0, 1fr); gap: 6px; font-size: 11px; padding: 1px 0; }
.at-wf-field-name { color: var(--text-3); text-align: right; }
.at-wf-field-value { color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.at-wf-field-value.at-wrap { white-space: normal; word-break: break-all; font-family: var(--font); }
.at-wf-seg { display: inline-flex; border: 1px solid var(--wf-stroke); border-radius: 5px; overflow: hidden; vertical-align: middle; }
.at-wf-seg > span, .at-wf-seg > button { font: 11px/18px var(--font-ui); padding: 2px 9px; color: var(--text-2); background: none; border: 0; }
.at-wf-seg > button { cursor: pointer; }
.at-wf-seg > .at-on { background: var(--wf-fill); color: var(--text); }
.at-wf-chip { display: inline-flex; align-items: center; gap: 4px; padding: 1px 7px; border-radius: 10px; font-size: 11px; line-height: 18px; background: var(--wf-fill); color: var(--text); white-space: nowrap; vertical-align: middle; }
.at-wf-chip.at-dim { color: var(--text-3); }
.at-wf-chip.at-selected { color: var(--text); background: var(--wf-fill-strong); font-weight: 600; }

/* A wireframes canvas's pages, laid out as the canvases they follow, in the theme's font. */
.at-wf-page { font-size: 13px; line-height: 18px; }
.at-wf-page .at-h-info { font-size: 12px; font-weight: 400; color: var(--text-3); }
.at-wf-page .at-tabs-bar { gap: 6px; margin-bottom: 18px; }
.at-wf-page > div > .at-tabs-bar { padding-bottom: 18px; margin-bottom: 18px; border-bottom: 1px solid var(--wf-stroke); }
.at-wf-page .at-tab { font: 12px/16px var(--font); padding: 5px 12px; border-radius: 999px; border: 1px solid var(--wf-stroke); color: var(--text-2); }
.at-wf-page .at-tab:hover { background: var(--wf-fill-faint); }
.at-wf-page .at-tab[aria-selected="true"] { background: var(--wf-fill-strong); color: var(--text); border-color: transparent; }
.at-wf-page .at-tab-n { display: none; }
.at-wf-page .at-tab-badge, .at-wf-page .at-tab[aria-selected="true"] .at-tab-badge { background: none; padding: 0; color: var(--text-3); }
.at-wf-page .at-h1 { font-size: 24px; line-height: 30px; font-weight: 590; letter-spacing: 0; }
.at-wf-page .at-h2 { font-size: 18px; line-height: 24px; font-weight: 590; letter-spacing: 0; }
.at-wf-page .at-h3 { font-size: 16px; line-height: 22px; font-weight: 590; color: var(--text); text-transform: none; letter-spacing: 0; }
.at-wf-page .at-text { font-size: 14px; line-height: 20px; }
.at-wf-page .at-text.at-sm { font-size: 12px; line-height: 16px; }
.at-wf-page .at-divider { margin: 0; }
.at-wf-page .at-table-wrap { border-radius: 8px; border-color: var(--wf-stroke); }
.at-wf-page .at-table { font-size: 14px; line-height: 20px; }
.at-wf-page .at-table th { background: var(--surface); color: var(--text); font-weight: 600; font-size: 13px; padding: 8px 12px; border-bottom-color: var(--wf-stroke); }
.at-wf-page .at-table td { padding: 8px 12px; border-top-color: var(--wf-stroke-faint); }
.at-wf-page .at-table tbody tr:hover td { background: none; }
.at-wf-page .at-panel.at-wf-card { border-color: var(--wf-stroke); border-radius: 8px; background: none; padding: 12px; }
.at-wf-page .at-panel.at-wf-card > .at-panel-body { padding-top: 0; height: 100%; }
.at-wf-page .at-wf-card > .at-panel-body > .at-stack { height: 100%; }
.at-wf-page .at-wf-card > .at-panel-body > .at-stack > .at-wf-status:last-child { margin-top: auto; }
.at-wf-page .at-panel.at-wf-callout { border: 0; border-radius: 8px; background: var(--wf-fill-faint); padding: 12px 14px; }
.at-wf-page .at-panel.at-wf-callout > .at-panel-body { padding-top: 0; }
.at-wf-page .at-button { font: 12px/1.4 var(--font); border-radius: 6px; padding: 4px 12px; }
.at-wf-page .at-button.at-v-solid { background: var(--wf-fill-strong); border-color: var(--wf-stroke); color: var(--text); }
.at-wf-page .at-check { font-size: 12px; }
.at-wf-page .at-input { font: 12px/1.4 var(--font); border-radius: 6px; }
.at-wf-page .at-field-error, .at-wf-page .at-sent { font-size: 12px; }

/* The kit's own parts, drawn inside a wireframe at the mock sizes the drawing uses. */
.at-wf .at-text { font-size: 12px; line-height: 16px; }
.at-wf .at-text.at-xs { font-size: 10px; line-height: 18px; }
.at-wf .at-text.at-sm { font-size: 11px; line-height: 18px; }
.at-wf .at-text.at-lg { font-size: 20px; font-weight: 600; line-height: 18px; font-variant-numeric: tabular-nums; }
.at-wf .at-h1 { font-size: 15px; }
.at-wf .at-h2 { font-size: 13px; }
.at-wf .at-h3 { font-size: 9.5px; font-weight: 600; letter-spacing: 0.5px; color: var(--text-3); }
.at-wf .at-kbd { min-width: 16px; padding: 0 4px; border-width: 1px; border-radius: 4px; font-size: 10.5px; line-height: 16px; text-align: center; color: var(--text); background: none; }
.at-wf .at-badge { font-size: 9.5px; line-height: 1.5; padding: 0 5px; border-radius: 8px; }
.at-wf .at-button { font: 11px/18px var(--font-ui); padding: 2px 10px; border-radius: 5px; border-color: var(--wf-stroke); color: var(--text); background: none; }
.at-wf .at-button.at-v-solid { font-weight: 600; border-color: var(--wf-stroke); color: var(--text); background: var(--wf-fill-strong); }
.at-wf .at-button.at-v-ghost { border-color: transparent; }
.at-wf .at-field { gap: 2px; }
.at-wf .at-field-label { font-size: 10.5px; color: var(--text-3); }
.at-wf .at-field-hint, .at-wf .at-field-error { font-size: 10px; }
.at-wf .at-input { font: 10.5px/1.3 var(--font-ui); padding: 2px 6px; border-radius: 4px; background: none; border-color: var(--wf-stroke); }
.at-wf input.at-input, .at-wf select.at-input { height: 20px; }
.at-wf textarea.at-input { min-height: 40px; }
.at-wf .at-check, .at-wf .at-toggle { font-size: 11px; color: var(--text-2); gap: 6px; }
.at-wf .at-check input { width: 12px; height: 12px; border-color: var(--wf-stroke-strong); }
.at-wf .at-check input:checked { background: var(--text-2); border-color: var(--text-2); }
.at-wf .at-check input[type="checkbox"]:checked::after { font-size: 9px; }
.at-wf .at-toggle input { width: 22px; height: 13px; }
.at-wf .at-toggle input::after { width: 9px; height: 9px; }
.at-wf .at-toggle input:checked::after { transform: translateX(9px); }
.at-wf .at-slider { gap: 6px; }
.at-wf .at-field:has(> .at-slider) { grid-template-columns: 76px minmax(0, 1fr); align-items: center; column-gap: 6px; }
.at-wf .at-field:has(> .at-slider) > .at-field-label { font-size: 11px; color: var(--text-2); }
.at-wf .at-slider input { appearance: none; height: 3px; border-radius: 2px; background: var(--wf-fill); }
.at-wf .at-slider input::-webkit-slider-thumb { appearance: none; width: 11px; height: 11px; border-radius: 6px; background: var(--text-2); }
.at-wf .at-slider output { min-width: 44px; padding: 0 5px; border-radius: 4px; background: var(--wf-fill-faint); font-size: 11px; line-height: 18px; }
.at-wf .at-rating button { font-size: 9px; letter-spacing: -0.5px; }
.at-wf .at-rating button.at-on { color: var(--text-2); }
.at-wf .at-table { font-size: 11px; }
.at-wf .at-table th, .at-wf .at-table td { padding: 3px 8px; }
.at-wf .at-meter-head { font-size: 11px; color: var(--text-2); }
.at-wf .at-meter-track { height: 6px; border-radius: 2px; background: var(--wf-fill); gap: 0; }
.at-wf .at-meter-track.at-parts { background: var(--wf-fill-faint); }
.at-wf .at-meter-track.at-parts:not(:has(> :not(.at-shaded))) { gap: 1px; background: none; }
.at-wf .at-meter-fill.at-t-accent { --tone: var(--text-2); }
.at-wf .at-meter-fill.at-t-muted { --tone: var(--wf-fill-strong); }
.at-wf .at-stat { border: 0; background: none; padding: 0; gap: 1px; }
.at-wf .at-stat-label { font-size: 11px; text-transform: none; letter-spacing: 0; color: var(--text-3); }
.at-wf .at-stat-value { font: 600 20px/1.3 var(--font-ui); font-variant-numeric: tabular-nums; }
.at-wf .at-stat-foot { font-size: 11px; }
`;

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
.at-sm { font-size: 12px; }
.at-lg { font-size: 15px; }
.at-medium { font-weight: 600; }
.at-bold { font-weight: 700; }
.at-italic { font-style: italic; }
.at-truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.at-text-2 { color: var(--text-2); }
.at-text-3 { color: var(--text-3); }
.at-code { background: var(--surface); border-radius: 4px; padding: 1px 5px; font-size: 0.92em; color: var(--info); }
.at-codeblock { margin: 0; position: relative; background: var(--surface); border: 1px solid var(--border); border-radius: 6px; font-size: 12px; overflow: hidden; }
.at-codeblock-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 4px 10px; border-bottom: 1px solid var(--border); color: var(--text-3); font-size: 11px; }
.at-codeblock pre { margin: 0; padding: 10px 12px; overflow-x: auto; white-space: pre; color: var(--text); }
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
.at-slider input { flex: 1; accent-color: var(--accent); }
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
`;

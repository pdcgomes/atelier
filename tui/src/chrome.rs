//! The viewer drawn in ooze's look: a header with the `atelier` pill, the
//! project's canvases as workspaces, the agents, runs, theme and clock; the
//! canvas, scrolling, with a column of air either side; the keys along the
//! bottom, lazygit-style, which a passing message takes the place of; and
//! the overlays on the theme's surface.

use std::time::Duration;

use ratatui::Frame;
use ratatui::layout::{Margin, Rect};
use ratatui::style::{Color, Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, BorderType, Clear, Paragraph, Wrap};
use serde_json::Value;

use crate::app::{App, Confirm, Link, Overlay, title_of};
use crate::canvas::Action;
use crate::fmt;
use crate::render::{Area, Ctx, Kind, Ui};
use crate::theme::Mode;
use crate::view;

fn st(app: &App, c: Color) -> Style {
    if app.pal.mode == Mode::None { Style::new() } else { Style::new().fg(c) }
}

fn bg(app: &App, c: Color) -> Style {
    if app.pal.mode == Mode::None { Style::new() } else { Style::new().bg(c) }
}

fn pill(app: &App, text: &str, c: Color) -> Span<'static> {
    if app.pal.mode == Mode::None {
        return Span::styled(format!("[{text}]"), Style::new().add_modifier(Modifier::BOLD));
    }
    Span::styled(format!(" {text} "), Style::new().bg(c).fg(app.pal.panel).add_modifier(Modifier::BOLD))
}

fn key_hint(app: &App, spans: &mut Vec<Span<'static>>, key: &str, what: &str) {
    spans.push(Span::styled(key.to_string(), st(app, app.pal.accent).add_modifier(Modifier::BOLD)));
    spans.push(Span::styled(format!(" {what}  "), st(app, app.pal.text2)));
}

pub fn draw(app: &mut App, f: &mut Frame) {
    let full = f.area();
    f.render_widget(Block::new().style(bg(app, app.pal.panel).patch(st(app, app.pal.text))), full);
    let area = full.inner(Margin { horizontal: 1, vertical: 0 });
    if area.height < 6 || area.width < 20 {
        return;
    }
    let header = Rect::new(area.x, area.y, area.width, 3);
    let hints = Rect::new(area.x, area.bottom() - 1, area.width, 1);
    let body = Rect::new(area.x, area.y + 3, area.width, area.height - 4);
    draw_header(app, f, header);
    draw_body(app, f, body);
    draw_hints(app, f, hints);
    if app.overlay.is_some() {
        draw_overlay(app, f)
    }
    if app.confirm.is_some() {
        draw_confirm(app, f);
    }
}

// ---- The header

fn draw_header(app: &App, f: &mut Frame, a: Rect) {
    let p = &app.pal;
    let waiting = app
        .sessions
        .as_array()
        .map(|s| s.iter().filter(|x| x["status"] == "waiting" && project_matches(app, x)).count())
        .unwrap_or(0);
    let working = app
        .sessions
        .as_array()
        .map(|s| s.iter().filter(|x| x["status"] == "working" && project_matches(app, x)).count())
        .unwrap_or(0);
    let idle = app
        .sessions
        .as_array()
        .map(|s| s.iter().filter(|x| x["status"] == "idle" && project_matches(app, x)).count())
        .unwrap_or(0);
    let border = match &app.link {
        Link::Down(_) => p.danger,
        _ if waiting > 0 || app.current.as_ref().is_some_and(|c| !c.problems.is_empty() || c.crash.is_some()) => {
            p.warning
        }
        _ => p.border,
    };
    let mut left = vec![Span::raw(" "), pill(app, "atelier", p.info)];
    match &app.link {
        Link::Connecting => left.push(Span::styled(" looking for atelier's daemon… ", st(app, p.text3))),
        Link::Down(why) => left.push(Span::styled(format!(" {} ", fmt::fit(why, 60)), st(app, p.danger))),
        Link::Up => {
            let project = app
                .current_project()
                .map(|p| p.rsplit('/').next().unwrap_or(&p).to_string())
                .unwrap_or_else(|| "every canvas".into());
            left.push(Span::styled(format!(" {project}"), st(app, p.text)));
            if let Some(c) = &app.current {
                left.push(Span::styled(format!(" · {} ", c.title()), st(app, p.text2)));
            } else {
                left.push(Span::raw(" "));
            }
        }
    }
    if !app.unknown.is_empty() {
        left.push(Span::styled(
            format!(" {} components aren't drawn here yet: update atelier-tui ", app.unknown.len()),
            st(app, p.warning),
        ));
    }
    let mut right: Vec<Span> = Vec::new();
    let mut light = |text: String, c: Color| {
        right.push(Span::styled(format!(" {text}"), st(app, c)));
    };
    if working > 0 {
        light(format!("● {working} working"), p.info);
    }
    if waiting > 0 {
        light(format!("▲ {waiting} waiting"), p.warning);
    }
    if idle > 0 {
        light(format!("○ {idle} idle"), p.text3);
    }
    if working + waiting + idle == 0 && app.source.is_daemon() {
        light("no agents".into(), p.text3);
    }
    let running = app.runs.iter().filter(|r| r["status"] == "running").count();
    if running > 0 {
        light(format!("{} {running} running", crate::art::spinner(app.now(), "runs")), p.info);
    }
    right.push(Span::styled("  ".to_string(), Style::new()));
    for c in [p.accent, p.success, p.warning, p.danger] {
        right.push(Span::styled("■", st(app, c)));
    }
    right.push(Span::styled(format!(" {}  ", app.pal.name), st(app, p.text2)));
    right.push(Span::styled(format!("{} ", fmt::day_clock(app.now())), st(app, p.text)));
    let block = Block::bordered()
        .border_type(BorderType::Rounded)
        .border_style(st(app, border))
        .style(bg(app, p.panel))
        .title_top(Line::from(left))
        .title_top(Line::from(right).right_aligned());
    let inner = block.inner(a);
    f.render_widget(block, a);
    // The project's canvases, as workspaces.
    let mut spans = vec![Span::raw(" ")];
    let current = app.current.as_ref().map(|c| c.id.clone());
    for (i, w) in app.workspaces().iter().enumerate() {
        let on = w["id"].as_str() == current.as_deref();
        let n = if i < 9 { (i + 1).to_string() } else { "·".into() };
        let name = w["title"].as_str().unwrap_or("").to_string();
        let name = fmt::fit(&name, 24);
        if on {
            spans.push(Span::styled(
                format!(" {n} {name} "),
                bg(app, p.selection).patch(st(app, p.accent)).add_modifier(Modifier::BOLD),
            ));
        } else {
            spans.push(Span::styled(format!(" {n}"), st(app, p.text3)));
            spans.push(Span::styled(format!(" {name} "), st(app, p.text2)));
        }
    }
    let modified = app.current.as_ref().and_then(|c| c.info["modified"].as_f64()).filter(|m| *m > 0.0);
    let note = match modified {
        Some(m) => format!("changed {} ", fmt::ago(m as i64, app.now())),
        None => String::new(),
    };
    let room = (inner.width as usize).saturating_sub(fmt::width(&note) + 1);
    let used: usize = spans.iter().map(|s| fmt::width(&s.content)).sum();
    if used > room {
        while spans.len() > 1 && spans.iter().map(|s| fmt::width(&s.content)).sum::<usize>() > room {
            spans.pop();
        }
    }
    let used: usize = spans.iter().map(|s| fmt::width(&s.content)).sum();
    spans.push(Span::raw(" ".repeat(room.saturating_sub(used))));
    spans.push(Span::styled(note, st(app, p.text3)));
    f.render_widget(Paragraph::new(Line::from(spans)), inner);
}

fn project_matches(app: &App, session: &Value) -> bool {
    match app.current_project() {
        Some(p) => session["project"].as_str() == Some(p.as_str()),
        None => true,
    }
}

// ---- The canvas

fn draw_body(app: &mut App, f: &mut Frame, a: Rect) {
    let p = app.pal.clone();
    let mut a = a;
    app.targets.clear();
    app.hits.clear();
    app.placements.clear();
    let Some(canvas) = &app.current else {
        let text = match &app.link {
            Link::Down(why) => vec![
                Line::from(Span::styled("Waiting for atelier's daemon.", st(app, p.text).add_modifier(Modifier::BOLD))),
                Line::from(Span::styled(why.clone(), st(app, p.text3))),
                Line::from(""),
                Line::from(Span::styled(
                    "`atelier open` starts it; this carries on as soon as it's up.",
                    st(app, p.text2),
                )),
            ],
            Link::Connecting => vec![Line::from(Span::styled("Looking for atelier's daemon…", st(app, p.text3)))],
            Link::Up => vec![
                Line::from(Span::styled("No canvas yet.", st(app, p.text).add_modifier(Modifier::BOLD))),
                Line::from(""),
                Line::from(Span::styled(
                    "Ask Claude Code for one, or run `atelier new workstream plan`; it shows here as it's written.",
                    st(app, p.text2),
                )),
            ],
        };
        let h = text.len() as u16;
        let r = Rect::new(a.x, a.y + a.height.saturating_sub(h) / 2, a.width, h);
        f.render_widget(Paragraph::new(text).centered(), r);
        app.body = a;
        return;
    };
    // What's wrong with the canvas, above it.
    let mut problems: Vec<Line> = Vec::new();
    let mut title = String::new();
    if !canvas.problems.is_empty() {
        title = if canvas.tree.is_empty() {
            "This canvas doesn't build".into()
        } else {
            "This canvas doesn't build: showing the last version that did".into()
        };
        for pr in canvas.problems.iter().take(8) {
            let file = pr.file.rsplit('/').next().unwrap_or(&pr.file);
            problems.push(Line::from(vec![
                Span::styled(format!("{file}:{}:{} ", pr.line, pr.column), st(app, p.text3)),
                Span::styled(pr.message.lines().next().unwrap_or("").to_string(), st(app, p.text)),
            ]));
        }
    } else if let Some(crash) = &canvas.crash {
        title = "This canvas stopped with an error".into();
        for line in crash.lines().take(6) {
            problems.push(Line::from(Span::styled(line.to_string(), st(app, p.text))));
        }
    }
    if !problems.is_empty() {
        let h = (problems.len() as u16 + 2).min(a.height / 2);
        let r = Rect::new(a.x, a.y, a.width, h);
        let block = Block::bordered()
            .border_type(BorderType::Rounded)
            .border_style(st(app, p.danger))
            .title(Span::styled(format!(" {title} "), st(app, p.danger).add_modifier(Modifier::BOLD)))
            .padding(ratatui::widgets::Padding::horizontal(1));
        f.render_widget(Paragraph::new(problems).block(block), r);
        a = Rect::new(a.x, a.y + h, a.width, a.height - h);
    }
    app.body = a;
    if a.height == 0 {
        return;
    }
    let width = a.width;
    let frame = view::Frame {
        tree: &canvas.tree,
        pal: &p,
        ui: &app.ui,
        width,
        rows: 1,
        top: 0,
        now: app.now(),
        focus: app.focus,
        edit: app.edit.as_ref(),
    };
    let height = view::height(&frame);
    app.height = height;
    let most = (height as i32 - a.height as i32).max(0);
    app.scroll = app.scroll.clamp(0, most);
    let drawn = view::draw(view::Frame { rows: a.height, top: app.scroll, ..frame });
    let buf = f.buffer_mut();
    for y in 0..a.height {
        for x in 0..width {
            buf[(a.x + x, a.y + y)] = drawn.buf[(x, y)].clone();
        }
    }
    // A thin scrollbar in the column of air on the right, when there's more than fits.
    if height > a.height {
        let track = a.height;
        let thumb = ((a.height as f64 / height as f64) * track as f64).ceil().max(1.0) as u16;
        let at = ((app.scroll as f64 / most.max(1) as f64) * (track - thumb) as f64).round() as u16;
        let x = a.x + a.width;
        for y in 0..track {
            let on = y >= at && y < at + thumb;
            let cell = &mut buf[(x, a.y + y)];
            cell.set_char(if on { '┃' } else { '│' });
            cell.set_style(st(app, if on { p.text3 } else { p.border }));
        }
    }
    if let Some((x, y)) = drawn.cursor {
        let row = y - app.scroll;
        if row >= 0 && (row as u16) < a.height {
            f.set_cursor_position((a.x + x, a.y + row as u16));
        }
    }
    app.placements = drawn
        .placements
        .iter()
        .map(|pl| {
            (pl.path.clone(), Rect::new(a.x + pl.area.x, a.y + (pl.area.y - app.scroll) as u16, pl.area.w, pl.area.h))
        })
        .collect();
    app.targets = drawn.targets;
    app.hits = drawn.hits;
}

// ---- The keys

fn draw_hints(app: &App, f: &mut Frame, a: Rect) {
    let p = &app.pal;
    if let Some((message, at)) = &app.flash
        && at.elapsed() < Duration::from_secs(4)
    {
        f.render_widget(Paragraph::new(Line::from(Span::styled(format!(" {message}"), st(app, p.warning)))), a);
        return;
    }
    let mut spans = vec![Span::raw(" ")];
    let focused = app.focused_target().map(|t| t.kind);
    if app.edit.is_some() {
        key_hint(app, &mut spans, "⏎", "done");
        key_hint(app, &mut spans, "esc", "leave the field");
        key_hint(app, &mut spans, "tab", "next");
    } else {
        key_hint(app, &mut spans, "tab", "focus");
        match focused {
            Some(Kind::Table) => {
                key_hint(app, &mut spans, "↑↓", "row");
                key_hint(app, &mut spans, "s", "sort");
                key_hint(app, &mut spans, "⏎", "act");
            }
            Some(Kind::Tabs) => key_hint(app, &mut spans, "←→", "tab"),
            Some(Kind::Radio | Kind::Slider | Kind::Rating | Kind::Calendar) => {
                key_hint(app, &mut spans, "←→", "change")
            }
            Some(Kind::Select) => key_hint(app, &mut spans, "⏎", "pick"),
            Some(Kind::Copy) => key_hint(app, &mut spans, "⏎", "copy"),
            Some(Kind::Media | Kind::Tile) => key_hint(app, &mut spans, "⏎", "show"),
            Some(_) => key_hint(app, &mut spans, "⏎", "press"),
            None => key_hint(app, &mut spans, "↑↓", "scroll"),
        }
        key_hint(app, &mut spans, "1-9", "canvases");
        key_hint(app, &mut spans, "0", "all");
        key_hint(app, &mut spans, "/", "find");
        key_hint(app, &mut spans, "t", "theme");
        if app.source.is_daemon() {
            key_hint(app, &mut spans, "r", "runs");
            key_hint(app, &mut spans, "o", "browser");
        }
        key_hint(app, &mut spans, "?", "keys");
        key_hint(app, &mut spans, "q", "quit");
    }
    let room = a.width as usize;
    while spans.iter().map(|s| fmt::width(&s.content)).sum::<usize>() > room && spans.len() > 3 {
        spans.truncate(spans.len() - 2);
    }
    f.render_widget(Paragraph::new(Line::from(spans)), a);
}

// ---- Overlays

fn overlay_area(f: &Frame, w: u16, h: u16) -> Rect {
    let a = f.area();
    let w = w.min(a.width.saturating_sub(4));
    let h = h.min(a.height.saturating_sub(2));
    Rect::new((a.width - w) / 2, (a.height - h) / 2, w, h)
}

fn sheet<'a>(app: &App, title: &str, border: Color, hints: &[(&str, &str)]) -> Block<'a> {
    let mut bottom = vec![Span::raw(" ")];
    for (k, w) in hints {
        key_hint(app, &mut bottom, k, w);
    }
    Block::bordered()
        .border_type(BorderType::Rounded)
        .border_style(st(app, border))
        .style(bg(app, app.pal.surface).patch(st(app, app.pal.text)))
        .title(Span::styled(format!(" {title} "), st(app, border).add_modifier(Modifier::BOLD)))
        .title_bottom(Line::from(bottom))
        .padding(ratatui::widgets::Padding::horizontal(1))
}

/// Rows of a list, scrolled to keep the selection in view.
fn listing(app: &App, rows: Vec<Line<'static>>, sel: Option<usize>, h: u16, w: u16) -> Vec<Line<'static>> {
    let h = h as usize;
    let start = sel.map(|s| s.saturating_sub(h.saturating_sub(1))).unwrap_or(0);
    rows.into_iter()
        .enumerate()
        .skip(start)
        .take(h)
        .map(|(i, mut line)| {
            if Some(i) == sel {
                let pad = (w as usize).saturating_sub(line.width());
                line.spans.push(Span::raw(" ".repeat(pad)));
                for s in &mut line.spans {
                    s.style = if app.pal.mode == Mode::None {
                        s.style.add_modifier(Modifier::REVERSED)
                    } else {
                        s.style.bg(app.pal.selection).add_modifier(Modifier::BOLD)
                    };
                }
            }
            line
        })
        .collect()
}

fn canvas_line(app: &App, c: &Value, current: Option<&str>) -> Line<'static> {
    let p = &app.pal;
    let open = c["id"].as_str() == current;
    let kind = c["template"]
        .as_str()
        .map(String::from)
        .unwrap_or_else(|| if c["kind"] == "tsx" { "custom".into() } else { String::new() });
    let mut spans = vec![
        Span::styled(if open { "● ".to_string() } else { "  ".to_string() }, st(app, p.accent)),
        Span::styled(fmt::pad(c["title"].as_str().unwrap_or(""), 36), st(app, p.text)),
        Span::styled(format!(" {}", fmt::pad(&kind, 12)), st(app, p.text3)),
    ];
    if let Some(m) = c["modified"].as_f64().filter(|m| *m > 0.0) {
        spans.push(Span::styled(format!(" {}", fmt::ago(m as i64, app.now())), st(app, p.text3)));
    }
    Line::from(spans)
}

fn grouped(app: &App, list: &[Value], sel: usize) -> (Vec<Line<'static>>, usize) {
    let current = app.current.as_ref().map(|c| c.id.clone());
    let mut rows = Vec::new();
    let mut at = 0;
    let mut last: Option<String> = None;
    for (i, c) in list.iter().enumerate() {
        let project = c["project"].as_str().unwrap_or("").to_string();
        if last.as_ref() != Some(&project) {
            let name = project.rsplit('/').next().unwrap_or(&project).to_string();
            let count = list.iter().filter(|x| x["project"] == project.as_str()).count();
            rows.push(Line::from(vec![
                Span::styled(name, st(app, app.pal.text2).add_modifier(Modifier::BOLD)),
                Span::styled(format!("  {count}"), st(app, app.pal.text3)),
            ]));
            last = Some(project);
        }
        if i == sel {
            at = rows.len();
        }
        rows.push(canvas_line(app, c, current.as_deref()));
    }
    (rows, at)
}

fn draw_overlay(app: &mut App, f: &mut Frame) {
    let p = app.pal.clone();
    let Some(overlay) = app.overlay.take() else { return };
    match &overlay {
        Overlay::Home { sel } => {
            let list = app.home_list();
            let area = overlay_area(f, 96, f.area().height * 4 / 5);
            let title = if app.source.is_daemon() {
                "every canvas"
            } else {
                "the preview: every component, the gallery, the templates"
            };
            let block = sheet(app, title, p.focus, &[("↑↓", "move"), ("⏎", "open"), ("/", "find"), ("esc", "back")]);
            let inner = block.inner(area);
            let (rows, at) = grouped(app, &list, *sel);
            let lines = listing(app, rows, Some(at), inner.height, inner.width);
            f.render_widget(Clear, area);
            f.render_widget(Paragraph::new(lines).block(block), area);
        }
        Overlay::Find { query, sel } => {
            let list = app.found(query);
            let area = overlay_area(f, 96, f.area().height * 3 / 4);
            let block =
                sheet(app, &format!("find: {query}█"), p.focus, &[("↑↓", "move"), ("⏎", "open"), ("esc", "back")]);
            let inner = block.inner(area);
            let current = app.current.as_ref().map(|c| c.id.clone());
            let rows: Vec<Line> = list
                .iter()
                .map(|c| {
                    let mut l = canvas_line(app, c, current.as_deref());
                    l.spans.push(Span::styled(
                        format!("  {}", c["project"].as_str().unwrap_or("").rsplit('/').next().unwrap_or("")),
                        st(app, p.text3),
                    ));
                    l
                })
                .collect();
            let empty = rows.is_empty();
            let mut lines = listing(app, rows, Some(*sel), inner.height, inner.width);
            if empty {
                lines.push(Line::from(Span::styled("Nothing matches.", st(app, p.text3))));
            }
            f.render_widget(Clear, area);
            f.render_widget(Paragraph::new(lines).block(block), area);
        }
        Overlay::Themes { query, sel } => {
            let list = app.themes_found(query);
            let area = overlay_area(f, 72, f.area().height * 3 / 4);
            let block = sheet(
                app,
                &format!("themes{}", if query.is_empty() { String::new() } else { format!(": {query}█") }),
                p.focus,
                &[("↑↓", "preview"), ("⏎", "keep"), ("esc", "back")],
            );
            let inner = block.inner(area);
            let rows: Vec<Line> = list
                .iter()
                .map(|t| {
                    let mut spans = Vec::new();
                    for h in [
                        &t.colors.accent,
                        &t.colors.success,
                        &t.colors.warning,
                        &t.colors.danger,
                        &t.colors.info,
                        &t.colors.text,
                    ] {
                        spans.push(Span::styled("■", st(app, crate::theme::color(crate::theme::rgb(h), app.mode))));
                    }
                    spans.push(Span::styled(format!(" {}", fmt::pad(&t.name, 26)), st(app, p.text)));
                    spans.push(Span::styled(
                        format!(" {} · {}", if t.dark { "dark" } else { "light" }, t.source),
                        st(app, p.text3),
                    ));
                    if t.id == app.theme_id {
                        spans.push(Span::styled(" · yours", st(app, p.accent)));
                    }
                    Line::from(spans)
                })
                .collect();
            let lines = listing(app, rows, Some(*sel), inner.height, inner.width);
            f.render_widget(Clear, area);
            f.render_widget(Paragraph::new(lines).block(block), area);
        }
        Overlay::Keys => {
            let keys: &[(&str, &str)] = &[
                ("1 – 9", "this project's canvases, as in the bar"),
                ("0", "every canvas, by project"),
                ("/", "find a canvas"),
                ("t", "pick a theme, previewed as you move; it's the browser's too"),
                ("r", "background runs, step by step: s stops one, o carries it on in a terminal"),
                ("o", "the canvas in the browser"),
                ("tab, shift-tab", "the next or the last thing you can press, type in or pick"),
                ("⏎, space", "press it, tick it, open it"),
                ("← →", "tabs, options, sliders, ratings, months"),
                ("[ ]", "the canvas's tabs"),
                ("↑ ↓, j k", "scroll, or move in a table"),
                ("pgup pgdn, g G", "a page, the top, the bottom"),
                ("esc", "leave a field, close what's open"),
                ("q", "quit"),
            ];
            let mut lines: Vec<Line> = keys
                .iter()
                .map(|(k, w)| {
                    Line::from(vec![
                        Span::styled(format!("{k:>16}  "), st(app, p.accent).add_modifier(Modifier::BOLD)),
                        Span::styled(w.to_string(), st(app, p.text)),
                    ])
                })
                .collect();
            lines.push(Line::from(""));
            lines.push(Line::from(Span::styled("    A canvas asks before it starts, messages or opens anything: y goes ahead, any other key leaves it.", st(app, p.text3))));
            let area = overlay_area(f, 100, lines.len() as u16 + 2);
            f.render_widget(Clear, area);
            f.render_widget(Paragraph::new(lines).block(sheet(app, "keys", p.focus, &[])), area);
        }
        Overlay::Runs { sel, open, steps } => {
            let area = overlay_area(f, 110, f.area().height * 4 / 5);
            let block = sheet(
                app,
                "background runs",
                p.focus,
                &[("↑↓", "move"), ("⏎", "steps"), ("s", "stop"), ("o", "open in a terminal"), ("esc", "back")],
            );
            let inner = block.inner(area);
            let mut rows: Vec<Line> = Vec::new();
            let mut at = 0;
            for (i, r) in app.runs.iter().enumerate() {
                let status = r["status"].as_str().unwrap_or("");
                let tone = match status {
                    "running" => p.info,
                    "done" => p.success,
                    "failed" => p.danger,
                    _ => p.text3,
                };
                if i == *sel {
                    at = rows.len();
                }
                let prompt =
                    r["prompt"].as_str().unwrap_or("").lines().find(|l| !l.trim().is_empty()).unwrap_or("").to_string();
                let started = r["started"].as_f64().map(|t| fmt::ago(t as i64, app.now())).unwrap_or_default();
                rows.push(Line::from(vec![
                    Span::styled(format!("{:<8}", status), st(app, tone)),
                    Span::styled(fmt::pad(&crate::tree::clean(&prompt), 70), st(app, p.text)),
                    Span::styled(format!(" {started}"), st(app, p.text3)),
                ]));
                if open.as_deref() == r["id"].as_str() {
                    for s in steps.iter().rev().take(20).collect::<Vec<_>>().into_iter().rev() {
                        let text = crate::tree::clean(s["text"].as_str().unwrap_or(""));
                        let kind = s["kind"].as_str().unwrap_or("");
                        let c = match kind {
                            "error" => p.danger,
                            "tool" => p.info,
                            "result" => p.success,
                            _ => p.text2,
                        };
                        rows.push(Line::from(vec![
                            Span::styled(
                                format!("    {} ", s["at"].as_f64().map(|t| fmt::clock(t as i64)).unwrap_or_default()),
                                st(app, p.text3),
                            ),
                            Span::styled(fmt::fit(&text, 90), st(app, c)),
                        ]));
                    }
                }
            }
            if rows.is_empty() {
                rows.push(Line::from(Span::styled(
                    "No background runs yet. A canvas's button can start one.",
                    st(app, p.text3),
                )));
            }
            let lines =
                listing(app, rows, if app.runs.is_empty() { None } else { Some(at) }, inner.height, inner.width);
            f.render_widget(Clear, area);
            f.render_widget(Paragraph::new(lines).block(block), area);
        }
        Overlay::Pick { node, sel } => {
            let options = app
                .current
                .as_ref()
                .and_then(|c| crate::tree::find(&c.tree, *node))
                .map(crate::kit::forms::options)
                .unwrap_or_default();
            let area = overlay_area(f, 48, options.len() as u16 + 4);
            let block = sheet(app, "pick one", p.focus, &[("⏎", "pick"), ("esc", "back")]);
            let inner = block.inner(area);
            let rows = options.iter().map(|(_, l)| Line::from(Span::styled(l.clone(), st(app, p.text)))).collect();
            let lines = listing(app, rows, Some(*sel), inner.height, inner.width);
            f.render_widget(Clear, area);
            f.render_widget(Paragraph::new(lines).block(block), area);
        }
        Overlay::Document { title, path, doc, scroll } => {
            let area = overlay_area(f, f.area().width - 4, f.area().height - 2);
            let block = sheet(app, title, p.focus, &[("↑↓", "scroll"), ("esc", "back")]);
            let inner = block.inner(area);
            f.render_widget(Clear, area);
            f.render_widget(block, area);
            match doc {
                Some(d) => {
                    let frame = view::Frame {
                        tree: &d.tree,
                        pal: &p,
                        ui: &app.ui,
                        width: inner.width,
                        rows: inner.height,
                        top: *scroll,
                        now: app.now(),
                        focus: None,
                        edit: None,
                    };
                    let drawn = view::draw(frame);
                    copy_in(f, &drawn.buf, inner);
                }
                None => {
                    let ui: &Ui = &app.ui;
                    let mut ctx = Ctx::new(&p, ui, inner.width, inner.height, 0, app.now());
                    let page = ctx.bg(p.surface);
                    ctx.surf.clear(Area::new(0, 0, inner.width, inner.height), page);
                    crate::kit::media::picture(
                        path,
                        title,
                        Area::new(0, 0, inner.width, inner.height),
                        "contain",
                        &mut ctx,
                    );
                    let placements: Vec<(String, Rect)> = ctx
                        .placements
                        .iter()
                        .map(|pl| {
                            (
                                pl.path.clone(),
                                Rect::new(inner.x + pl.area.x, inner.y + pl.area.y as u16, pl.area.w, pl.area.h),
                            )
                        })
                        .collect();
                    copy_in(f, &ctx.surf.buf, inner);
                    app.placements = placements;
                }
            }
        }
    }
    app.overlay = Some(overlay);
}

fn copy_in(f: &mut Frame, from: &ratatui::buffer::Buffer, at: Rect) {
    let buf = f.buffer_mut();
    for y in 0..at.height.min(from.area.height) {
        for x in 0..at.width.min(from.area.width) {
            buf[(at.x + x, at.y + y)] = from[(x, y)].clone();
        }
    }
}

/// What can't be seen in a prompt, shown so it can be: control and direction characters as their codes.
pub fn visible(s: &str) -> String {
    s.chars()
        .map(|c| match c {
            '\n' | '\t' => c.to_string(),
            c if c.is_control() || matches!(c, '\u{200b}'..='\u{200f}' | '\u{202a}'..='\u{202e}' | '\u{2066}'..='\u{2069}' | '\u{feff}') => format!("⟨U+{:04X}⟩", c as u32),
            c => c.to_string(),
        })
        .collect()
}

fn draw_confirm(app: &App, f: &mut Frame) {
    let p = &app.pal;
    let Some(Confirm { ask, mode, .. }) = &app.confirm else { return };
    let project = app.current_project().map(|x| x.rsplit('/').next().unwrap_or(&x).to_string()).unwrap_or_default();
    let canvas = app.current.as_ref().map(|c| c.title()).unwrap_or_default();
    let (title, verb, risky, words, body): (String, &str, bool, Vec<String>, Option<String>) = match &ask.action {
        Action::StartSession { prompt, .. } => (
            format!("Start Claude Code in {project}?"),
            "start it",
            true,
            vec![if mode == "background" {
                "In the background: its steps show under r, and it carries on in a terminal when you ask.".into()
            } else {
                "In a new terminal tab, where you can watch it and answer it.".into()
            }],
            Some(prompt.clone()),
        ),
        Action::OpenSession { id } => (
            format!("Carry on session {} in a terminal?", fmt::fit(id, 12)),
            "open it",
            false,
            vec!["It opens with `claude --resume`, in a new terminal tab.".into()],
            None,
        ),
        Action::Tell { session, text } => (
            format!("Tell session {} this?", fmt::fit(session, 12)),
            "tell it",
            true,
            vec![
                "If it's working, it gets this when its turn ends; if not, it's resumed in the background with it."
                    .into(),
            ],
            Some(text.clone()),
        ),
        Action::OpenFile { path, line } => (
            format!("Open {} in your editor?", path.rsplit('/').next().unwrap_or(path)),
            "open it",
            false,
            vec![format!("{path}{}", line.map(|l| format!(", at line {l}")).unwrap_or_default())],
            None,
        ),
        Action::OpenUrl { url } => {
            ("Open this page in your browser?".to_string(), "open it", false, vec![url.clone()], None)
        }
    };
    let border = if risky { p.warning } else { p.focus };
    let w = (f.area().width.saturating_sub(8)).min(96);
    let room = w.saturating_sub(4) as usize;
    let mut lines: Vec<Line> = vec![Line::from("")];
    lines.push(Line::from(vec![
        Span::styled(project.to_string(), st(app, p.text)),
        Span::styled(format!(" · from {canvas}"), st(app, p.text3)),
    ]));
    lines.push(Line::from(""));
    if let Some(text) = body {
        let shown = visible(&text);
        let all = fmt::wrap(&shown, room.saturating_sub(2));
        let cap = (f.area().height as usize).saturating_sub(16).max(4);
        for l in all.iter().take(cap) {
            lines.push(Line::from(Span::styled(format!("│ {l}"), st(app, p.text))));
        }
        if all.len() > cap {
            lines.push(Line::from(Span::styled(format!("│ … and {} more lines", all.len() - cap), st(app, p.text3))));
        }
        lines.push(Line::from(""));
    }
    for wd in &words {
        for l in fmt::wrap(wd, room) {
            lines.push(Line::from(Span::styled(l, st(app, p.text2))));
        }
    }
    lines.push(Line::from(""));
    if matches!(ask.action, Action::StartSession { .. }) {
        let on = |m: &str| if mode == m { st(app, p.accent).add_modifier(Modifier::BOLD) } else { st(app, p.text3) };
        lines.push(Line::from(vec![
            Span::styled("t", on("terminal")),
            Span::styled(" in a terminal   ", on("terminal")),
            Span::styled("b", on("background")),
            Span::styled(" in the background", on("background")),
        ]));
        lines.push(Line::from(""));
    }
    let armed = app.armed();
    lines.push(Line::from(vec![
        Span::styled("y", st(app, if armed { border } else { p.text3 }).add_modifier(Modifier::BOLD)),
        Span::styled(format!(" {verb}"), st(app, if armed { p.text } else { p.text3 })),
        Span::styled("   any other key leaves it as it is", st(app, p.text3)),
    ]));
    let area = overlay_area(f, w, lines.len() as u16 + 2);
    let block = Block::bordered()
        .border_type(BorderType::Rounded)
        .border_style(st(app, border))
        .style(bg(app, p.surface).patch(st(app, p.text)))
        .title(Span::styled(format!(" {title} "), st(app, border).add_modifier(Modifier::BOLD)))
        .padding(ratatui::widgets::Padding::horizontal(2));
    f.render_widget(Clear, area);
    f.render_widget(Paragraph::new(lines).wrap(Wrap { trim: false }).block(block), area);
}

/// The title a fixture is shown by, for the preview's home.
pub fn fixture_title(name: &str) -> String {
    title_of(name)
}

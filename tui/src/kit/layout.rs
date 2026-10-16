//! Stack, Row, Grid, Split, Divider, Panel, Tabs and Section.

use ratatui::style::Modifier;
use serde_json::Value;

use super::{CSS, Component, Press};
use crate::fmt;
use crate::render::{
    self, Act, Align, Area, Ctx, Key, Kind, Seg, Target, boxed, child_draw, child_height, cols, flow_draw,
    flow_draw_in, flow_height, flow_height_in, frame, gap_cols, gap_rows, inline_all, rule,
};
use crate::tree::{Child, Node};

pub static ALL: &[&Component] = &[&STACK, &ROW, &GRID, &SPLIT, &DIVIDER, &PANEL, &TABS, &SECTION];

fn gap(n: &Node, default: f64) -> f64 {
    n.num("gap").unwrap_or(default)
}

fn align_of(n: &Node) -> Align {
    match n.str("align") {
        Some("center") => Align::Center,
        Some("end") => Align::Right,
        _ => Align::Left,
    }
}

fn natural_children(n: &Node, ctx: &mut Ctx) -> u16 {
    ctx.natural_all(&n.c)
}

// ---- Stack

fn stack_height(n: &Node, w: u16, ctx: &mut Ctx) -> u16 {
    flow_height(&n.c, w, ctx, gap(n, 12.0))
}

fn stack_draw(n: &Node, a: Area, ctx: &mut Ctx) {
    flow_draw_in(&n.c, a, ctx, gap(n, 12.0), ratatui::style::Style::new(), align_of(n))
}

pub static STACK: Component = Component {
    name: "Stack",
    draws: &["children", "gap", "align"],
    not_here: &CSS,
    height: stack_height,
    draw: stack_draw,
    width: natural_children,
    inline: None,
    keys: None,
};

// ---- Row

struct Placed {
    index: usize,
    x: u16,
    w: u16,
    h: u16,
}

struct Line {
    items: Vec<Placed>,
    h: u16,
}

fn items(n: &Node) -> Vec<&Child> {
    n.c.iter().filter(|c| !matches!(c, Child::Text(s) if s.trim().is_empty())).collect()
}

/// Places a row's items left to right at their natural widths, onto new lines when there isn't room.
fn row_lines(n: &Node, w: u16, ctx: &mut Ctx) -> Vec<Line> {
    let list = items(n);
    let wrap = n.p.get("wrap").and_then(Value::as_bool).unwrap_or(true);
    let g = gap(n, 10.0);
    let mut lines: Vec<Line> = vec![Line { items: Vec::new(), h: 0 }];
    let mut x = 0u16;
    for (i, c) in list.iter().enumerate() {
        let natural = ctx.natural(c).max(1);
        let space = if i > 0 && !lines.last().unwrap().items.is_empty() { gap_cols(g, list[i - 1], c) } else { 0 };
        if wrap && x > 0 && x + space + natural > w {
            lines.push(Line { items: Vec::new(), h: 0 });
            x = 0;
        }
        let space = if x == 0 { 0 } else { space };
        let iw = natural.min(w.saturating_sub(x + space)).max(1);
        let h = child_height(c, iw, ctx).max(1);
        let line = lines.last_mut().unwrap();
        line.items.push(Placed { index: i, x: x + space, w: iw, h });
        line.h = line.h.max(h);
        x += space + iw;
    }
    let justify = n.str("justify").unwrap_or("start");
    for line in &mut lines {
        let used = line.items.last().map(|p| p.x + p.w).unwrap_or(0);
        let spare = w.saturating_sub(used);
        match justify {
            "end" => line.items.iter_mut().for_each(|p| p.x += spare),
            "center" => line.items.iter_mut().for_each(|p| p.x += spare / 2),
            "between" if line.items.len() > 1 => {
                let k = (line.items.len() - 1) as u16;
                for (j, p) in line.items.iter_mut().enumerate() {
                    p.x += spare * j as u16 / k;
                }
            }
            _ => {}
        }
    }
    lines.retain(|l| !l.items.is_empty());
    lines
}

fn row_height(n: &Node, w: u16, ctx: &mut Ctx) -> u16 {
    row_lines(n, w, ctx).iter().map(|l| l.h).sum()
}

fn row_draw(n: &Node, a: Area, ctx: &mut Ctx) {
    let list = items(n);
    let lines = row_lines(n, a.w, ctx);
    let valign = n.str("align").unwrap_or("center");
    let mut y = a.y;
    for line in &lines {
        for p in &line.items {
            let dy = match valign {
                "center" => (line.h - p.h) / 2,
                "end" => line.h - p.h,
                _ => 0,
            };
            let h = if boxed(list[p.index]) { line.h } else { p.h };
            child_draw(list[p.index], Area::new(a.x + p.x, y + dy as i32, p.w, h), ctx);
        }
        y += line.h as i32;
    }
}

fn row_width(n: &Node, ctx: &mut Ctx) -> u16 {
    let list = items(n);
    let g = gap(n, 10.0);
    let mut total = 0;
    for (i, c) in list.iter().enumerate() {
        if i > 0 {
            total += gap_cols(g, list[i - 1], c);
        }
        total += ctx.natural(c);
    }
    total
}

pub static ROW: Component = Component {
    name: "Row",
    draws: &["children", "gap", "align", "justify", "wrap"],
    not_here: &CSS,
    height: row_height,
    draw: row_draw,
    width: row_width,
    inline: None,
    keys: None,
};

// ---- Grid and Split

/// Columns' widths for a width, given how many there are or their shares.
fn tracks(n: &Node, w: u16, shares: Option<&[f64]>, min_px: f64) -> Vec<u16> {
    let all_boxed = n.c.iter().filter(|c| !matches!(c, Child::Text(s) if s.trim().is_empty())).all(boxed);
    let g = if all_boxed { 0 } else { 1 };
    let count = match shares {
        Some(s) => s.len() as u16,
        None => match n.p.get("columns") {
            Some(Value::Number(c)) => c.as_f64().unwrap_or(1.0).max(1.0) as u16,
            Some(Value::String(css)) => css_tracks(css),
            // As CSS's auto-fit does, the columns there's nothing to put in collapse.
            _ => {
                let min = cols(min_px).max(8);
                let items =
                    n.c.iter().filter(|c| !matches!(c, Child::Text(s) if s.trim().is_empty())).count().max(1) as u16;
                ((w + g) / (min + g)).clamp(1, items)
            }
        },
    }
    .clamp(1, w.max(1));
    let room = w.saturating_sub(g * (count - 1));
    let weights: Vec<f64> = shares.map(<[f64]>::to_vec).unwrap_or_else(|| vec![1.0; count as usize]);
    let total: f64 = weights.iter().sum::<f64>().max(1e-9);
    let mut out = Vec::new();
    let mut used = 0u16;
    for (i, wgt) in weights.iter().enumerate() {
        let cw = if i + 1 == weights.len() { room - used } else { (room as f64 * wgt / total).floor() as u16 };
        out.push(cw);
        used += cw;
    }
    out
}

/// How many columns a CSS grid-template-columns has.
fn css_tracks(css: &str) -> u16 {
    if let Some(rest) = css.trim().strip_prefix("repeat(")
        && let Some(n) = rest.split(',').next().and_then(|n| n.trim().parse::<u16>().ok())
    {
        return n;
    }
    let mut depth = 0;
    let mut count = 0;
    let mut inword = false;
    for c in css.chars() {
        match c {
            '(' => depth += 1,
            ')' => depth -= 1,
            ' ' if depth == 0 => inword = false,
            _ if depth == 0 && !inword => {
                inword = true;
                count += 1;
            }
            _ => {}
        }
    }
    count.max(1)
}

struct Cells {
    widths: Vec<u16>,
    gap: u16,
    rows: Vec<(Vec<usize>, u16)>,
    vgaps: Vec<u16>,
}

fn grid_cells(n: &Node, w: u16, ctx: &mut Ctx, shares: Option<&[f64]>, min_px: f64) -> Cells {
    let list = items(n);
    let widths = tracks(n, w, shares, min_px);
    let all_boxed = list.iter().all(|c| boxed(c));
    let g = if all_boxed { 0 } else { 1 };
    let per = widths.len();
    let mut rows = Vec::new();
    let mut vgaps = Vec::new();
    for (r, chunk) in list.chunks(per).enumerate() {
        let mut h = 0;
        for (i, c) in chunk.iter().enumerate() {
            h = h.max(child_height(c, widths[i], ctx));
        }
        if r > 0 {
            let above = list[(r - 1) * per];
            vgaps.push(gap_rows(gap(n, 12.0), Some(above), chunk[0]));
        }
        rows.push(((r * per..r * per + chunk.len()).collect(), h));
    }
    Cells { widths, gap: g, rows, vgaps }
}

fn grid_height_with(n: &Node, w: u16, ctx: &mut Ctx, shares: Option<&[f64]>, min_px: f64) -> u16 {
    let cells = grid_cells(n, w, ctx, shares, min_px);
    cells.rows.iter().map(|r| r.1).sum::<u16>() + cells.vgaps.iter().sum::<u16>()
}

fn grid_draw_with(n: &Node, a: Area, ctx: &mut Ctx, shares: Option<&[f64]>, min_px: f64) {
    let list = items(n);
    let cells = grid_cells(n, a.w, ctx, shares, min_px);
    let mut y = a.y;
    for (r, (indices, h)) in cells.rows.iter().enumerate() {
        if r > 0 {
            y += cells.vgaps[r - 1] as i32;
        }
        let mut x = a.x;
        for (i, &idx) in indices.iter().enumerate() {
            let c = list[idx];
            let ch = if boxed(c) { *h } else { child_height(c, cells.widths[i], ctx) };
            child_draw(c, Area::new(x, y, cells.widths[i], ch), ctx);
            x += cells.widths[i] + cells.gap;
        }
        y += *h as i32;
    }
}

fn grid_min(n: &Node) -> f64 {
    n.num("min").unwrap_or(260.0)
}

fn grid_height(n: &Node, w: u16, ctx: &mut Ctx) -> u16 {
    grid_height_with(n, w, ctx, None, grid_min(n))
}

fn grid_draw(n: &Node, a: Area, ctx: &mut Ctx) {
    grid_draw_with(n, a, ctx, None, grid_min(n))
}

fn grid_width(n: &Node, ctx: &mut Ctx) -> u16 {
    let list = items(n);
    let mut most = 0;
    for c in list {
        most = most.max(ctx.natural(c));
    }
    most
}

pub static GRID: Component = Component {
    name: "Grid",
    draws: &["children", "columns", "min", "gap"],
    not_here: &CSS,
    height: grid_height,
    draw: grid_draw,
    width: grid_width,
    inline: None,
    keys: None,
};

/// Below this, a split's two columns become one, as on a narrow screen.
const SPLIT_BELOW: u16 = 80;

fn ratio(n: &Node) -> [f64; 2] {
    let r = n.list("ratio");
    [r.first().and_then(Value::as_f64).unwrap_or(2.0), r.get(1).and_then(Value::as_f64).unwrap_or(1.0)]
}

fn split_height(n: &Node, w: u16, ctx: &mut Ctx) -> u16 {
    if w < SPLIT_BELOW {
        return flow_height(&n.c, w, ctx, gap(n, 12.0));
    }
    grid_height_with(n, w, ctx, Some(&ratio(n)), 0.0)
}

fn split_draw(n: &Node, a: Area, ctx: &mut Ctx) {
    if a.w < SPLIT_BELOW {
        return flow_draw(&n.c, a, ctx, gap(n, 12.0));
    }
    grid_draw_with(n, a, ctx, Some(&ratio(n)), 0.0)
}

pub static SPLIT: Component = Component {
    name: "Split",
    draws: &["children", "ratio", "gap"],
    not_here: &CSS,
    height: split_height,
    draw: split_draw,
    width: grid_width,
    inline: None,
    keys: None,
};

// ---- Divider

fn one(_: &Node, _: u16, _: &mut Ctx) -> u16 {
    1
}

fn divider_draw(n: &Node, a: Area, ctx: &mut Ctx) {
    let label = inline_all(n.slot("label"), ctx, ctx.faint());
    let style = ctx.fg(ctx.pal.border);
    rule(a.row(0), ctx, &label, style);
}

fn divider_width(n: &Node, ctx: &mut Ctx) -> u16 {
    ctx.natural_all(n.slot("label")) + 8
}

pub static DIVIDER: Component = Component {
    name: "Divider",
    draws: &["label"],
    not_here: &[],
    height: one,
    draw: divider_draw,
    width: divider_width,
    inline: None,
    keys: None,
};

// ---- Panel

fn panel_pad(n: &Node) -> u16 {
    n.num("padding").map(|p| cols(p).min(4)).unwrap_or(1)
}

fn panel_height(n: &Node, w: u16, ctx: &mut Ctx) -> u16 {
    let pad = panel_pad(n);
    flow_height(&n.c, w.saturating_sub(2 + pad * 2), ctx, 12.0) + 2
}

/// A border's colour: the panel's tone, the focus colour when it has focus or asks for it, and otherwise the theme's border.
pub fn border_style(n: &Node, ctx: &Ctx) -> ratatui::style::Style {
    if ctx.focus_inside(n) {
        ctx.fg(ctx.pal.focus)
    } else if let Some(t) = n.tone("tone") {
        ctx.tone(t)
    } else if n.flag("focus") {
        ctx.fg(ctx.pal.focus)
    } else {
        ctx.fg(ctx.pal.border)
    }
}

/// A panel's title and what's on the right of its border: the info, and the keys.
pub fn panel_head(n: &Node, ctx: &mut Ctx) -> (Vec<Seg>, Vec<Seg>) {
    let title = inline_all(n.slot("title"), ctx, ctx.text().add_modifier(Modifier::BOLD));
    let mut info = inline_all(n.slot("info"), ctx, ctx.faint());
    for k in n.list("keys").iter().filter_map(Value::as_str) {
        let (key, words) = k.split_once(' ').unwrap_or((k, ""));
        if !info.is_empty() {
            info.push(Seg::new("  ", ctx.faint()));
        }
        info.push(Seg::atom(key.to_string(), ctx.fg(ctx.pal.accent).add_modifier(Modifier::BOLD)));
        if !words.is_empty() {
            info.push(Seg::new(format!(" {words}"), ctx.faint()));
        }
    }
    (title, info)
}

fn panel_draw(n: &Node, a: Area, ctx: &mut Ctx) {
    let (title, info) = panel_head(n, ctx);
    let border = border_style(n, ctx);
    frame(a, ctx, border, &title, &info);
    let pad = panel_pad(n);
    flow_draw(&n.c, a.inset(1 + pad, 1, 1 + pad, 1), ctx, 12.0);
}

fn panel_width(n: &Node, ctx: &mut Ctx) -> u16 {
    let pad = panel_pad(n);
    let (title, info) = panel_head(n, ctx);
    let head = render::segs_width(&title) + render::segs_width(&info) + 7;
    (ctx.natural_all(&n.c) + 2 + pad * 2).max(head)
}

pub static PANEL: Component = Component {
    name: "Panel",
    draws: &["children", "title", "info", "keys", "tone", "focus", "padding"],
    not_here: &CSS,
    height: panel_height,
    draw: panel_draw,
    width: panel_width,
    inline: None,
    keys: None,
};

// ---- Tabs

fn tab_ids(n: &Node) -> Vec<String> {
    n.list("tabs").iter().filter_map(|v| v.as_str().map(String::from)).collect()
}

fn tab_segs(n: &Node, ctx: &mut Ctx) -> Vec<Seg> {
    let active = n.str("active").map(String::from);
    let key = Key::of(n);
    let focused = ctx.focused(key);
    let mut out = Vec::new();
    for (i, id) in tab_ids(n).iter().enumerate() {
        let on = active.as_deref() == Some(id.as_str());
        let base = if on { ctx.selected().patch(ctx.fg(ctx.pal.accent)) } else { ctx.dim() };
        let base = if on && focused { base.add_modifier(Modifier::UNDERLINED) } else { base };
        let label = crate::tree::text_of(n.slot(&format!("label:{id}")));
        let badge = crate::tree::text_of(n.slot(&format!("badge:{id}")));
        if i > 0 {
            out.push(Seg::new(" ", ctx.text()));
        }
        let acts = vec![Act::Call { node: n.id, name: "select".into(), args: vec![Value::String(id.clone())] }];
        let mut text = format!(" {}", i + 1);
        out.push(Seg::atom(text.clone(), if on { base } else { ctx.faint() }).on(key, acts.clone()));
        text = format!(" {label}");
        out.push(Seg::atom(text, base).on(key, acts.clone()));
        if !badge.is_empty() {
            out.push(Seg::atom(format!(" {badge}"), if on { base } else { ctx.faint() }).on(key, acts.clone()));
        }
        out.push(Seg::atom(" ", if on { base } else { ctx.text() }).on(key, acts));
    }
    out
}

fn tabs_bar(n: &Node, w: u16, ctx: &mut Ctx) -> Vec<Vec<Seg>> {
    let segs = tab_segs(n, ctx);
    render::wrap(&segs, w)
}

fn tabs_height(n: &Node, w: u16, ctx: &mut Ctx) -> u16 {
    let bar = tabs_bar(n, w, ctx).len() as u16;
    let content = flow_height(&n.c, w, ctx, 12.0);
    bar + if content > 0 { 1 + content } else { 0 }
}

fn tabs_draw(n: &Node, a: Area, ctx: &mut Ctx) {
    let bar = tabs_bar(n, a.w, ctx);
    let bh = bar.len() as u16;
    ctx.target(Key::of(n), Kind::Tabs, Area::new(a.x, a.y, a.w, bh), "Tabs");
    render::draw_lines(&bar, Area::new(a.x, a.y, a.w, bh), ctx, Align::Left);
    flow_draw(&n.c, Area::new(a.x, a.y + bh as i32 + 1, a.w, a.h.saturating_sub(bh + 1)), ctx, 12.0);
}

fn tabs_width(n: &Node, ctx: &mut Ctx) -> u16 {
    let bar = render::segs_width(&tab_segs(n, ctx));
    bar.max(ctx.natural_all(&n.c))
}

fn tabs_keys(n: &Node, _: &Target, press: Press, _: &crate::render::Ui) -> Option<Vec<Act>> {
    let by = match press {
        Press::Left | Press::Char('h') | Press::Char('[') => -1,
        Press::Right | Press::Char('l') | Press::Char(']') => 1,
        _ => return None,
    };
    Some(vec![Act::Call { node: n.id, name: "move".into(), args: vec![Value::from(by)] }])
}

pub static TABS: Component = Component {
    name: "Tabs",
    draws: &["tabs", "stateKey", "initial"],
    not_here: &[],
    height: tabs_height,
    draw: tabs_draw,
    width: tabs_width,
    inline: None,
    keys: Some(tabs_keys),
};

// ---- Section

fn section_head(n: &Node, ctx: &mut Ctx) -> Vec<Seg> {
    let open = n.flag("open");
    let key = Key::of(n);
    let focused = ctx.focused(key);
    let base = if focused { ctx.selected() } else { ratatui::style::Style::new() };
    let acts = vec![Act::Call { node: n.id, name: "toggle".into(), args: vec![] }];
    let mut out = vec![Seg::atom(if open { "▾ " } else { "▸ " }, base.patch(ctx.faint())).on(key, acts.clone())];
    for s in inline_all(n.slot("title"), ctx, ctx.text().add_modifier(Modifier::BOLD)) {
        out.push(Seg { style: base.patch(s.style), ..s }.on(key, acts.clone()));
    }
    let count = crate::tree::text_of(n.slot("count"));
    if !count.is_empty() {
        out.push(Seg::atom(format!("  {count}"), base.patch(ctx.faint())).on(key, acts.clone()));
    }
    let info = crate::tree::text_of(n.slot("info"));
    if !info.is_empty() {
        out.push(Seg::atom(format!("  {info}"), base.patch(ctx.faint())).on(key, acts));
    }
    out
}

fn section_height(n: &Node, w: u16, ctx: &mut Ctx) -> u16 {
    let head = section_head(n, ctx);
    let hh = render::wrap(&head, w).len() as u16;
    hh + if n.flag("open") { flow_height(&n.c, w.saturating_sub(2), ctx, 12.0) } else { 0 }
}

fn section_draw(n: &Node, a: Area, ctx: &mut Ctx) {
    let head = section_head(n, ctx);
    let lines = render::wrap(&head, a.w);
    let hh = lines.len() as u16;
    ctx.target(Key::of(n), Kind::Section, Area::new(a.x, a.y, a.w, hh), "Section");
    render::draw_lines(&lines, Area::new(a.x, a.y, a.w, hh), ctx, Align::Left);
    if n.flag("open") {
        flow_draw(&n.c, Area::new(a.x + 2, a.y + hh as i32, a.w.saturating_sub(2), a.h.saturating_sub(hh)), ctx, 12.0);
    }
}

fn section_width(n: &Node, ctx: &mut Ctx) -> u16 {
    let head = section_head(n, ctx);
    render::segs_width(&head).max(ctx.natural_all(&n.c) + 2)
}

pub static SECTION: Component = Component {
    name: "Section",
    draws: &["children", "title", "count", "info", "open", "stateKey"],
    not_here: &[],
    height: section_height,
    draw: section_draw,
    width: section_width,
    inline: None,
    keys: None,
};

// ---- Problem: what the runtime draws when a canvas stops with an error

fn problem_lines(n: &Node, w: u16) -> Vec<String> {
    fmt::wrap(n.str("message").unwrap_or(""), w.saturating_sub(4) as usize)
}

fn problem_height(n: &Node, w: u16, _: &mut Ctx) -> u16 {
    problem_lines(n, w).len() as u16 + 2
}

fn problem_draw(n: &Node, a: Area, ctx: &mut Ctx) {
    let title = vec![Seg::new(
        n.str("title").unwrap_or("This canvas stopped with an error").to_string(),
        ctx.fg(ctx.pal.danger).add_modifier(Modifier::BOLD),
    )];
    let border = ctx.fg(ctx.pal.danger);
    frame(a, ctx, border, &title, &[]);
    for (i, line) in problem_lines(n, a.w).iter().enumerate() {
        ctx.surf.put(a.x + 2, a.y + 1 + i as i32, line, ctx.text(), a.w.saturating_sub(4));
    }
}

fn problem_width(n: &Node, _: &mut Ctx) -> u16 {
    (fmt::width(n.str("message").unwrap_or("")) + 4) as u16
}

pub static PROBLEM: Component = Component {
    name: "Problem",
    draws: &[],
    not_here: &[],
    height: problem_height,
    draw: problem_draw,
    width: problem_width,
    inline: None,
    keys: None,
};

/// The height a panel-like box needs around some content, for others to use.
pub fn boxed_height(list: &[Child], w: u16, ctx: &mut Ctx) -> u16 {
    flow_height_in(list, w.saturating_sub(4), ctx, 12.0, ratatui::style::Style::new()) + 2
}

//! Wireframe, Region, Notes, Marker, Status, StatusLegend, Placeholder,
//! SideList, Field, Segmented and Chip: an app's screens drawn as numbered
//! regions, each marked with where it stands.

use ratatui::style::{Modifier, Style};
use serde_json::Value;

use super::Component;
use super::layout::{css_track_list, css_widths};
use crate::fmt;
use crate::render::{
    Act, Align, Area, Ctx, Key, Kind, Seg, boxed, child_draw, child_height, cols, draw_lines, draw_one_line, flow_draw,
    flow_height, frame, gap_rows, inline_all, rows, segs_width, wrap,
};
use crate::theme::Mode;
use crate::tree::{Child, Node, Tone, text_of};

pub static ALL: &[&Component] = &[
    &WIREFRAME,
    &REGION,
    &NOTES,
    &MARKER,
    &STATUS,
    &STATUS_LEGEND,
    &PLACEHOLDER,
    &SIDE_LIST,
    &FIELD,
    &SEGMENTED,
    &CHIP,
];

fn one(_: &Node, _: u16, _: &mut Ctx) -> u16 {
    1
}

fn inline_draw(n: &Node, a: Area, ctx: &mut Ctx) {
    let mut segs = Vec::new();
    crate::render::inline(&Child::El(n.clone()), ctx, Style::new(), &mut segs);
    draw_lines(&wrap(&segs, a.w), a, ctx, Align::Left);
}

fn inline_width(n: &Node, ctx: &mut Ctx) -> u16 {
    ctx.natural(&Child::El(n.clone()))
}

fn items(list: &[Child]) -> Vec<&Child> {
    list.iter().filter(|c| !matches!(c, Child::Text(s) if s.trim().is_empty())).collect()
}

// ---- Marker and Status

/// A region's number, on the accent, as the browser's circle is.
fn marker_seg(n: &str, ctx: &Ctx) -> Seg {
    if ctx.pal.mode == Mode::None {
        return Seg::atom(format!("[{n}]"), Style::new());
    }
    Seg::atom(format!(" {n} "), Style::new().bg(ctx.pal.accent).fg(ctx.pal.bg).add_modifier(Modifier::BOLD))
}

fn marker_inline(n: &Node, ctx: &mut Ctx, _: Style, out: &mut Vec<Seg>) {
    out.push(marker_seg(n.str("n").unwrap_or(""), ctx));
}

pub static MARKER: Component = Component {
    name: "Marker",
    draws: &["n"],
    not_here: &[],
    height: one,
    draw: inline_draw,
    width: inline_width,
    inline: Some(marker_inline),
    keys: None,
};

/// How a status looks: its glyph, its tone and its word, as the kit worked them out.
struct Look {
    glyph: String,
    tone: Tone,
    label: String,
}

fn look_of(v: &Value) -> Option<Look> {
    Some(Look {
        glyph: v.get("glyph")?.as_str()?.to_string(),
        tone: v.get("tone").and_then(Value::as_str).and_then(Tone::parse).unwrap_or(Tone::Default),
        label: v.get("label").and_then(Value::as_str).unwrap_or("").to_string(),
    })
}

fn status_segs(l: &Look, ctx: &Ctx) -> Vec<Seg> {
    vec![Seg::atom(format!("{} ", l.glyph), ctx.tone(l.tone)), Seg::atom(l.label.clone(), ctx.dim())]
}

fn status_inline(n: &Node, ctx: &mut Ctx, _: Style, out: &mut Vec<Seg>) {
    if let Some(l) = look_of(&Value::Object(n.p.clone())) {
        out.extend(status_segs(&l, ctx));
    }
}

pub static STATUS: Component = Component {
    name: "Status",
    draws: &["status", "label"],
    not_here: &[],
    height: one,
    draw: inline_draw,
    width: inline_width,
    inline: Some(status_inline),
    keys: None,
};

// ---- StatusLegend

fn legend_lines(n: &Node, w: u16, ctx: &mut Ctx) -> Vec<Vec<Seg>> {
    let list: Vec<(Look, Option<String>, Option<f64>)> = n
        .list("items")
        .iter()
        .filter_map(|v| {
            look_of(v).map(|l| {
                (l, v.get("meaning").and_then(Value::as_str).map(String::from), v.get("count").and_then(Value::as_f64))
            })
        })
        .collect();
    if n.flag("meanings") {
        let widest = list.iter().map(|(l, ..)| segs_width(&status_segs(l, ctx))).max().unwrap_or(0);
        let lw = (widest + 2).min(w / 2);
        let mut out = Vec::new();
        for (l, meaning, _) in &list {
            let words = wrap(&[Seg::new(meaning.clone().unwrap_or_default(), ctx.dim())], w.saturating_sub(lw).max(1));
            for (i, line) in words.into_iter().enumerate() {
                let mut row = if i == 0 { status_segs(l, ctx) } else { Vec::new() };
                let used = segs_width(&row);
                row.push(Seg::new(" ".repeat(lw.saturating_sub(used) as usize), ctx.text()));
                row.extend(line);
                out.push(row);
            }
        }
        return out;
    }
    let mut segs = Vec::new();
    for (i, (l, _, count)) in list.iter().enumerate() {
        if i > 0 {
            segs.push(Seg::new("   ", ctx.text()));
        }
        segs.extend(status_segs(l, ctx));
        if let Some(c) = count {
            segs.push(Seg::atom(format!(" {c}"), ctx.faint()));
        }
    }
    wrap(&segs, w)
}

fn legend_height(n: &Node, w: u16, ctx: &mut Ctx) -> u16 {
    legend_lines(n, w, ctx).len() as u16
}

fn legend_draw(n: &Node, a: Area, ctx: &mut Ctx) {
    let lines = legend_lines(n, a.w, ctx);
    draw_lines(&lines, a, ctx, Align::Left);
}

fn legend_width(n: &Node, ctx: &mut Ctx) -> u16 {
    legend_lines(n, 400, ctx).iter().map(|l| segs_width(l)).max().unwrap_or(0)
}

pub static STATUS_LEGEND: Component = Component {
    name: "StatusLegend",
    draws: &["meanings", "counts", "shown"],
    not_here: &[],
    height: legend_height,
    draw: legend_draw,
    width: legend_width,
    inline: None,
    keys: None,
};

// ---- Notes

/// How many columns the notes take at a width, and how wide each is.
fn note_columns(n: &Node, w: u16) -> (u16, u16) {
    let want = n.num("columns").unwrap_or(2.0).max(1.0) as u16;
    let count = want.min(((w + 2) / 38).max(1));
    (count, w.saturating_sub(2 * (count - 1)) / count)
}

/// A note's head and its text, each as lines, and how far its text is indented.
fn note_lines(v: &Value, w: u16, ctx: &Ctx) -> (Vec<Vec<Seg>>, Vec<Vec<Seg>>, u16) {
    let num = v.get("n").and_then(Value::as_str).unwrap_or("");
    let marker = marker_seg(num, ctx);
    let indent = segs_width(std::slice::from_ref(&marker)) + 1;
    let mut head = vec![marker, Seg::new(" ", ctx.text())];
    head.push(Seg::new(v.get("title").and_then(Value::as_str).unwrap_or(""), ctx.text().add_modifier(Modifier::BOLD)));
    if let Some(l) = v.get("mark").and_then(look_of) {
        head.push(Seg::new("  ", ctx.text()));
        head.extend(status_segs(&l, ctx));
    }
    let text = v.get("text").and_then(Value::as_str).unwrap_or("");
    let body = wrap(&[Seg::new(text, ctx.dim())], w.saturating_sub(indent).max(1));
    (wrap(&head, w), body, indent)
}

fn notes_height(n: &Node, w: u16, ctx: &mut Ctx) -> u16 {
    let (count, cw) = note_columns(n, w);
    let list = n.list("items");
    let mut h = 0;
    for (r, row) in list.chunks(count as usize).enumerate() {
        if r > 0 {
            h += 1;
        }
        h += row
            .iter()
            .map(|v| {
                let (head, body, _) = note_lines(v, cw, ctx);
                (head.len() + body.len()) as u16
            })
            .max()
            .unwrap_or(0);
    }
    h
}

fn notes_draw(n: &Node, a: Area, ctx: &mut Ctx) {
    let (count, cw) = note_columns(n, a.w);
    let list = n.list("items");
    let mut y = a.y;
    for row in list.chunks(count as usize) {
        let mut tallest = 0u16;
        for (i, v) in row.iter().enumerate() {
            let (head, body, indent) = note_lines(v, cw, ctx);
            let x = a.x + i as u16 * (cw + 2);
            draw_lines(&head, Area::new(x, y, cw, head.len() as u16), ctx, Align::Left);
            let by = y + head.len() as i32;
            draw_lines(
                &body,
                Area::new(x + indent, by, cw.saturating_sub(indent), body.len() as u16),
                ctx,
                Align::Left,
            );
            tallest = tallest.max((head.len() + body.len()) as u16);
        }
        y += tallest as i32 + 1;
    }
}

fn notes_width(n: &Node, ctx: &mut Ctx) -> u16 {
    n.list("items")
        .iter()
        .map(|v| {
            let (head, ..) = note_lines(v, 400, ctx);
            head.iter().map(|l| segs_width(l)).max().unwrap_or(0)
        })
        .max()
        .unwrap_or(0)
        .min(60)
}

pub static NOTES: Component = Component {
    name: "Notes",
    draws: &["items", "columns"],
    not_here: &[],
    height: notes_height,
    draw: notes_draw,
    width: notes_width,
    inline: None,
    keys: None,
};

// ---- Wireframe

const PHONE: u16 = 36;

/// The width of a column of the screen's grid, and the columns between them.
fn grid_widths(css: &str, w: u16) -> Vec<u16> {
    let count = css_track_list(css).len().max(1) as u16;
    css_widths(css, w.saturating_sub(count - 1))
}

/// The regions on the screen's own columns, row by row, with each row's height.
fn grid_rows<'a>(list: &[&'a Child], widths: &[u16], ctx: &mut Ctx) -> Vec<(Vec<&'a Child>, u16)> {
    list.chunks(widths.len().max(1))
        .map(|chunk| {
            let h = chunk.iter().enumerate().map(|(i, c)| child_height(c, widths[i], ctx)).max().unwrap_or(0);
            (chunk.to_vec(), h)
        })
        .collect()
}

fn body_height(n: &Node, w: u16, ctx: &mut Ctx) -> u16 {
    let gap = n.num("gap").unwrap_or(10.0);
    let Some(css) = n.str("columns") else { return flow_height(&n.c, w, ctx, gap) };
    let list = items(&n.c);
    let widths = grid_widths(css, w);
    let laid = grid_rows(&list, &widths, ctx);
    let mut h = 0;
    for (r, (row, rh)) in laid.iter().enumerate() {
        if r > 0 {
            h += gap_rows(gap, Some(laid[r - 1].0[0]), row[0]);
        }
        h += rh;
    }
    h
}

fn body_draw(n: &Node, a: Area, ctx: &mut Ctx) {
    let gap = n.num("gap").unwrap_or(10.0);
    let Some(css) = n.str("columns") else { return flow_draw(&n.c, a, ctx, gap) };
    let list = items(&n.c);
    let widths = grid_widths(css, a.w);
    let laid = grid_rows(&list, &widths, ctx);
    let mut y = a.y;
    for (r, (row, rh)) in laid.iter().enumerate() {
        if r > 0 {
            y += gap_rows(gap, Some(laid[r - 1].0[0]), row[0]) as i32;
        }
        let mut x = a.x;
        for (i, c) in row.iter().enumerate() {
            let ch = if boxed(c) { *rh } else { child_height(c, widths[i], ctx) };
            child_draw(c, Area::new(x, y, widths[i], ch), ctx);
            x += widths[i] + 1;
        }
        y += *rh as i32;
    }
}

fn caption_lines(n: &Node, w: u16, ctx: &mut Ctx) -> Vec<Vec<Seg>> {
    if !n.has_slot("caption") {
        return Vec::new();
    }
    wrap(&inline_all(n.slot("caption"), ctx, ctx.faint()), w)
}

/// A toolbar's items, each as segments for one line, with the rows and stacks they sit in taken apart.
fn toolbar_items(list: &[Child], ctx: &mut Ctx) -> Vec<Vec<Seg>> {
    let mut out = Vec::new();
    for c in items(list) {
        match c {
            Child::El(n) if matches!(n.t.as_str(), "Row" | "Stack" | "div" | "span") && !n.c.is_empty() => {
                out.extend(toolbar_items(&n.c, ctx));
            }
            _ => out.push(inline_all(std::slice::from_ref(c), ctx, ctx.text())),
        }
    }
    out.retain(|segs| !segs.iter().all(|s| s.text.trim().is_empty()));
    out
}

fn frame_kind(n: &Node) -> &str {
    n.str("frame").unwrap_or("window")
}

/// How tall the frame is around a body, without the caption.
fn framed_height(n: &Node, w: u16, ctx: &mut Ctx) -> u16 {
    match frame_kind(n) {
        "none" => body_height(n, w, ctx),
        "phone" => body_height(n, w.min(PHONE).saturating_sub(4), ctx) + 4,
        _ => body_height(n, w.saturating_sub(4), ctx) + 2,
    }
}

fn wireframe_height(n: &Node, w: u16, ctx: &mut Ctx) -> u16 {
    let cw = if frame_kind(n) == "phone" { w.min(PHONE) } else { w };
    framed_height(n, w, ctx) + caption_lines(n, cw, ctx).len() as u16
}

fn wireframe_draw(n: &Node, a: Area, ctx: &mut Ctx) {
    let h = framed_height(n, a.w, ctx);
    let border = super::layout::border_style(n, ctx);
    let (fx, fw) = match frame_kind(n) {
        "phone" => {
            let pw = a.w.min(PHONE);
            let x = a.x + (a.w - pw) / 2;
            let f = Area::new(x, a.y, pw, h);
            frame(f, ctx, border, &[], &[]);
            let inner = f.inset(2, 1, 2, 1);
            ctx.surf.put(inner.x, inner.y, "9:41", ctx.dim(), inner.w);
            let pill = "▬▬▬";
            ctx.surf.put(inner.x + inner.w.saturating_sub(3) / 2, inner.y, pill, ctx.faint(), inner.w);
            ctx.surf.put(inner.x + inner.w.saturating_sub(4), inner.y, "100%", ctx.faint(), 4);
            ctx.surf.put(inner.x + inner.w.saturating_sub(6) / 2, f.bottom() - 2, "──────", ctx.faint(), inner.w);
            body_draw(n, Area::new(inner.x, inner.y + 1, inner.w, h.saturating_sub(4)), ctx);
            (x, pw)
        }
        "none" => {
            body_draw(n, Area::new(a.x, a.y, a.w, h), ctx);
            (a.x, a.w)
        }
        _ => {
            let f = Area::new(a.x, a.y, a.w, h);
            let mut title = vec![Seg::atom("● ● ●", ctx.faint())];
            for item in toolbar_items(n.slot("toolbar"), ctx) {
                title.push(Seg::new("  ", ctx.text()));
                title.extend(item);
            }
            let mut end = Vec::new();
            for (i, item) in toolbar_items(n.slot("toolbarEnd"), ctx).into_iter().enumerate() {
                if i > 0 {
                    end.push(Seg::new("  ", ctx.text()));
                }
                end.extend(item);
            }
            frame(f, ctx, border, &title, &end);
            body_draw(n, f.inset(2, 1, 2, 1), ctx);
            (a.x, a.w)
        }
    };
    let lines = caption_lines(n, fw, ctx);
    let align = if frame_kind(n) == "phone" { Align::Center } else { Align::Left };
    draw_lines(&lines, Area::new(fx, a.y + h as i32, fw, lines.len() as u16), ctx, align);
}

fn wireframe_width(n: &Node, ctx: &mut Ctx) -> u16 {
    if frame_kind(n) == "phone" {
        return PHONE;
    }
    let body = match n.str("columns") {
        Some(_) => {
            let list = items(&n.c);
            let k = n.str("columns").map(|c| css_track_list(c).len()).unwrap_or(1).max(1);
            list.iter().take(k).map(|c| ctx.natural(c) + 1).sum::<u16>()
        }
        None => ctx.natural_all(&n.c),
    };
    if frame_kind(n) == "none" { body } else { body + 4 }
}

pub static WIREFRAME: Component = Component {
    name: "Wireframe",
    draws: &["children", "frame", "toolbar", "toolbarEnd", "caption", "columns", "gap"],
    not_here: &[("padding", "the room inside a frame, in pixels; a terminal's frame keeps a cell")],
    height: wireframe_height,
    draw: wireframe_draw,
    width: wireframe_width,
    inline: None,
    keys: None,
};

// ---- Region

fn region_head(n: &Node, ctx: &mut Ctx) -> (Vec<Seg>, Vec<Seg>) {
    let mut title = Vec::new();
    if let Some(num) = n.str("n") {
        title.push(marker_seg(num, ctx));
    }
    if let Some(label) = n.str("label").filter(|l| !l.is_empty()) {
        if !title.is_empty() {
            title.push(Seg::new(" ", ctx.text()));
        }
        title.push(Seg::new(label.to_uppercase(), ctx.faint().add_modifier(Modifier::BOLD)));
    }
    let info = n.p.get("mark").and_then(look_of).map(|l| status_segs(&l, ctx)).unwrap_or_default();
    (title, info)
}

/// Turns a box's edges dashed, as a region that shows on demand is drawn.
fn dash(a: Area, ctx: &mut Ctx) {
    let top = ctx.surf.top;
    let (bw, bh) = (ctx.surf.buf.area.width, ctx.surf.buf.area.height as i32);
    let right = a.x + a.w.saturating_sub(1);
    let mut cells = Vec::new();
    for x in a.x..a.x + a.w {
        cells.push((x, a.y));
        cells.push((x, a.bottom() - 1));
    }
    for y in a.y..a.bottom() {
        cells.push((a.x, y));
        cells.push((right, y));
    }
    for (x, y) in cells {
        let r = y - top;
        if r < 0 || r >= bh || x >= bw {
            continue;
        }
        let cell = &mut ctx.surf.buf[(x, r as u16)];
        match cell.symbol() {
            "─" => {
                cell.set_char('┄');
            }
            "│" => {
                cell.set_char('┆');
            }
            _ => {}
        }
    }
}

fn region_height(n: &Node, w: u16, ctx: &mut Ctx) -> u16 {
    flow_height(&n.c, w.saturating_sub(4), ctx, 0.0) + 2
}

fn region_draw(n: &Node, a: Area, ctx: &mut Ctx) {
    let (title, mut info) = region_head(n, ctx);
    if segs_width(&title) + segs_width(&info) + 7 > a.w || segs_width(&info) > a.w.saturating_sub(4) / 2 {
        info.truncate(1);
    }
    let border = super::layout::border_style(n, ctx);
    frame(a, ctx, border, &title, &info);
    if n.flag("dashed") {
        dash(a, ctx);
    }
    flow_draw(&n.c, a.inset(2, 1, 2, 1), ctx, 0.0);
}

fn region_width(n: &Node, ctx: &mut Ctx) -> u16 {
    let (title, info) = region_head(n, ctx);
    (ctx.natural_all(&n.c) + 4).max(segs_width(&title) + segs_width(&info) + 7)
}

pub static REGION: Component = Component {
    name: "Region",
    draws: &["children", "n", "label", "status", "dashed"],
    not_here: &[
        (
            "grow",
            "fills a phone's or a column's fixed height in the browser; a terminal sizes a region by what's in it",
        ),
        ("padding", "the room inside a region, in pixels; a terminal's region keeps a cell"),
    ],
    height: region_height,
    draw: region_draw,
    width: region_width,
    inline: None,
    keys: None,
};

// ---- Placeholder

/// A placeholder's size in cells: its columns, and its rows, a cell being about twice as tall as it's wide.
fn tile_size(n: &Node, w: u16) -> (u16, u16) {
    let tw = n.num("w").map(|px| cols(px).max(3)).unwrap_or(w).min(w).max(1);
    let th = if let Some(h) = n.num("h") {
        rows(h).max(1)
    } else if let Some(r) = n.num("ratio") {
        ((tw as f64 * r) / 2.0).round().max(1.0) as u16
    } else if let Some(px) = n.num("w") {
        rows(px * 0.7).max(1)
    } else {
        3
    };
    (tw, th.min(14))
}

fn fill(a: Area, c: char, style: Style, ctx: &mut Ctx) {
    for y in a.y..a.bottom() {
        for x in a.x..a.x + a.w {
            ctx.surf.put_char(x, y, c, style);
        }
    }
}

fn placeholder_height(n: &Node, w: u16, _: &mut Ctx) -> u16 {
    tile_size(n, w).1 + u16::from(n.has_slot("caption"))
}

fn placeholder_draw(n: &Node, a: Area, ctx: &mut Ctx) {
    let (tw, th) = tile_size(n, a.w);
    let tile = Area::new(a.x, a.y, tw, th);
    let shade = if n.flag("selected") {
        ('▒', ctx.fg(ctx.pal.accent))
    } else if n.flag("dim") {
        ('░', ctx.fg(ctx.pal.border))
    } else {
        ('░', ctx.faint())
    };
    let inset: Vec<f64> = n.list("inset").iter().filter_map(Value::as_f64).collect();
    if n.flag("dashed") && th >= 2 && tw >= 3 {
        frame(tile, ctx, ctx.dim(), &[], &[]);
        dash(tile, ctx);
        fill(tile.inset(1, 1, 1, 1), shade.0, shade.1, ctx);
    } else if inset.len() == 4 {
        let paper = th >= 3 && tw >= 4;
        if paper {
            frame(tile, ctx, ctx.fg(ctx.pal.border), &[], &[]);
        }
        let inner = if paper { tile.inset(1, 1, 1, 1) } else { tile };
        let at = |f: f64, size: u16| (f * size as f64).round().clamp(0.0, size as f64) as u16;
        let (ix, iy) = (at(inset[0], inner.w), at(inset[1], inner.h));
        let iw = at(inset[2], inner.w).max(1).min(inner.w.saturating_sub(ix).max(1));
        let ih = at(inset[3], inner.h).max(1).min(inner.h.saturating_sub(iy).max(1));
        fill(Area::new(inner.x + ix, inner.y + iy as i32, iw, ih), shade.0, shade.1, ctx);
    } else {
        fill(tile, shade.0, shade.1, ctx);
    }
    let label = text_of(&n.c);
    if !label.trim().is_empty() {
        let framed = (n.flag("dashed") || inset.len() == 4) && th >= 3 && tw >= 4;
        let room = if framed { tw - 2 } else { tw };
        let text = fmt::fit(label.trim(), room as usize);
        let lw = fmt::width(&text) as u16;
        ctx.surf.put(a.x + (tw - lw) / 2, a.y + (th / 2) as i32, &text, ctx.dim(), room);
    }
    let badge = text_of(n.slot("badge"));
    if !badge.trim().is_empty() {
        let text = fmt::fit(badge.trim(), tw as usize);
        let bw = fmt::width(&text) as u16;
        ctx.surf.put(a.x + tw - bw, a.y + th as i32 - 1, &text, ctx.dim(), bw);
    }
    if n.has_slot("caption") {
        let segs = inline_all(n.slot("caption"), ctx, ctx.faint());
        draw_one_line(&segs, a.x, a.y + th as i32, tw, ctx);
    }
    if n.handles("click") {
        let key = Key::of(n);
        if ctx.focused(key) {
            ctx.surf.paint(tile, ctx.selected());
        }
        ctx.target(key, Kind::Click, tile, "Placeholder");
        ctx.hit(tile, key, vec![Act::Call { node: n.id, name: "click".into(), args: vec![] }]);
    }
}

/// A placeholder with no width takes the rest of its line, as the browser's does.
fn placeholder_width(n: &Node, _: &mut Ctx) -> u16 {
    n.num("w").map(|px| cols(px).max(3)).unwrap_or(400)
}

pub static PLACEHOLDER: Component = Component {
    name: "Placeholder",
    draws: &["children", "w", "h", "ratio", "caption", "badge", "selected", "dim", "dashed", "inset", "onClick"],
    not_here: &[],
    height: placeholder_height,
    draw: placeholder_draw,
    width: placeholder_width,
    inline: None,
    keys: None,
};

// ---- SideList

fn list_head(n: &Node, ctx: &Ctx) -> Option<(Vec<Seg>, Vec<Seg>)> {
    let title = n.str("title").filter(|t| !t.is_empty());
    let mark = n.p.get("mark").and_then(look_of);
    if title.is_none() && mark.is_none() {
        return None;
    }
    let left =
        title.map(|t| vec![Seg::new(t.to_uppercase(), ctx.faint().add_modifier(Modifier::BOLD))]).unwrap_or_default();
    Some((left, mark.map(|l| status_segs(&l, ctx)).unwrap_or_default()))
}

fn list_note(n: &Node, w: u16, ctx: &Ctx) -> Vec<Vec<Seg>> {
    n.str("note").filter(|s| !s.is_empty()).map(|s| wrap(&[Seg::new(s, ctx.faint())], w)).unwrap_or_default()
}

fn side_list_height(n: &Node, w: u16, ctx: &mut Ctx) -> u16 {
    u16::from(list_head(n, ctx).is_some()) + n.list("items").len() as u16 + list_note(n, w, ctx).len() as u16
}

fn side_list_draw(n: &Node, a: Area, ctx: &mut Ctx) {
    let mut y = a.y;
    if let Some((left, mut right)) = list_head(n, ctx) {
        if segs_width(&left) + segs_width(&right) + 1 > a.w {
            right.truncate(1);
        }
        let rw = segs_width(&right);
        draw_one_line(&left, a.x, y, a.w.saturating_sub(rw + 1), ctx);
        draw_one_line(&right, a.x + a.w.saturating_sub(rw), y, rw, ctx);
        y += 1;
    }
    let pressable = n.handles("select");
    for (i, item) in n.list("items").iter().enumerate() {
        let row = Area::new(a.x, y, a.w, 1);
        y += 1;
        if item.get("separator").and_then(Value::as_bool).unwrap_or(false) {
            ctx.surf.put(a.x, row.y, &"─".repeat(a.w as usize), ctx.fg(ctx.pal.border), a.w);
            continue;
        }
        let flag = |k: &str| item.get(k).and_then(Value::as_bool).unwrap_or(false);
        let label = item.get("label").and_then(Value::as_str).unwrap_or("");
        let key = Key { node: n.id, part: i as u32 + 1 };
        if flag("selected") || (pressable && ctx.focused(key)) {
            ctx.surf.paint(row, ctx.selected());
        }
        if pressable {
            ctx.target(key, Kind::Click, row, "SideList");
            ctx.hit(
                row,
                key,
                vec![Act::Call { node: n.id, name: "select".into(), args: vec![Value::String(label.to_string())] }],
            );
        }
        let depth = item.get("depth").and_then(Value::as_f64).unwrap_or(0.0).max(0.0) as u16;
        let mut x = a.x + depth * 2;
        if let Some(t) = item.get("tone").and_then(Value::as_str).and_then(Tone::parse) {
            x += ctx.surf.put(x, row.y, "● ", ctx.tone(t), a.w.saturating_sub(x - a.x));
        }
        let count = fmt::fit(item.get("count").and_then(Value::as_str).unwrap_or(""), (a.w / 2) as usize);
        let cw = fmt::width(&count) as u16;
        let room = (a.x + a.w).saturating_sub(x + if cw > 0 { cw + 1 } else { 0 });
        let style = if flag("dim") { ctx.faint() } else { ctx.text() };
        ctx.surf.put(x, row.y, &fmt::fit(label, room as usize), style, room);
        if cw > 0 {
            ctx.surf.put(a.x + a.w.saturating_sub(cw), row.y, &count, ctx.faint(), cw);
        }
    }
    let note = list_note(n, a.w, ctx);
    draw_lines(&note, Area::new(a.x, y, a.w, note.len() as u16), ctx, Align::Left);
}

fn side_list_width(n: &Node, ctx: &mut Ctx) -> u16 {
    let head = list_head(n, ctx).map(|(l, r)| segs_width(&l) + segs_width(&r) + 2).unwrap_or(0);
    n.list("items")
        .iter()
        .map(|i| {
            let depth = i.get("depth").and_then(Value::as_f64).unwrap_or(0.0) as u16;
            let label = fmt::width(i.get("label").and_then(Value::as_str).unwrap_or("")) as u16;
            let count = fmt::width(i.get("count").and_then(Value::as_str).unwrap_or("")) as u16;
            depth * 2 + label + if count > 0 { count + 2 } else { 0 } + if i.get("tone").is_some() { 2 } else { 0 }
        })
        .max()
        .unwrap_or(0)
        .max(head)
}

pub static SIDE_LIST: Component = Component {
    name: "SideList",
    draws: &["title", "status", "items", "note", "onSelect"],
    not_here: &[],
    height: side_list_height,
    draw: side_list_draw,
    width: side_list_width,
    inline: None,
    keys: None,
};

// ---- Field

const NAME: u16 = 12;

/// Whether a field's value is blocks, such as a row of controls, rather than a run of text.
fn blocks_in(n: &Node) -> bool {
    items(&n.c).iter().any(|c| matches!(c, Child::El(e) if !crate::render::is_inline(e)))
}

fn field_lines(n: &Node, w: u16, ctx: &mut Ctx) -> Vec<Vec<Seg>> {
    let room = w.saturating_sub(NAME).max(1);
    let style = match n.str("tone") {
        Some("secondary") => ctx.dim(),
        Some("muted") => ctx.faint(),
        _ => ctx.text(),
    };
    if !items(&n.c).is_empty() {
        return wrap(&inline_all(&n.c, ctx, style), room);
    }
    let value = n.str("value").unwrap_or("");
    if n.flag("wrap") {
        return wrap(&[Seg::new(value, style)], room);
    }
    vec![vec![Seg::new(fmt::fit(value, room as usize), style)]]
}

fn field_height(n: &Node, w: u16, ctx: &mut Ctx) -> u16 {
    if blocks_in(n) {
        return flow_height(&n.c, w.saturating_sub(NAME), ctx, 0.0).max(1);
    }
    field_lines(n, w, ctx).len().max(1) as u16
}

fn field_draw(n: &Node, a: Area, ctx: &mut Ctx) {
    let name = fmt::fit(n.str("name").unwrap_or(""), (NAME - 1) as usize);
    let nw = fmt::width(&name) as u16;
    ctx.surf.put(a.x + (NAME - 1).saturating_sub(nw), a.y, &name, ctx.faint(), NAME - 1);
    if blocks_in(n) {
        return flow_draw(&n.c, Area::new(a.x + NAME, a.y, a.w.saturating_sub(NAME), a.h), ctx, 0.0);
    }
    let lines = field_lines(n, a.w, ctx);
    draw_lines(&lines, Area::new(a.x + NAME, a.y, a.w.saturating_sub(NAME), lines.len() as u16), ctx, Align::Left);
}

fn field_width(n: &Node, ctx: &mut Ctx) -> u16 {
    let value =
        if items(&n.c).is_empty() { fmt::width(n.str("value").unwrap_or("")) as u16 } else { ctx.natural_all(&n.c) };
    NAME + value
}

pub static FIELD: Component = Component {
    name: "Field",
    draws: &["children", "name", "value", "tone", "wrap"],
    not_here: &[],
    height: field_height,
    draw: field_draw,
    width: field_width,
    inline: None,
    keys: None,
};

// ---- Segmented

fn segmented_inline(n: &Node, ctx: &mut Ctx, _: Style, out: &mut Vec<Seg>) {
    let active = n.str("active");
    let key = Key::of(n);
    let pressable = n.handles("change");
    for v in n.list("items") {
        let item = v.as_str().unwrap_or("");
        let on = active == Some(item);
        let (text, style) = if ctx.pal.mode == Mode::None {
            (if on { format!("[{item}]") } else { format!(" {item} ") }, Style::new())
        } else if on {
            (format!(" {item} "), ctx.selected().patch(ctx.text()))
        } else {
            (format!(" {item} "), ctx.bg(ctx.pal.surface).patch(ctx.dim()))
        };
        let seg = Seg::atom(text, style);
        out.push(if pressable {
            seg.on(
                key,
                vec![
                    Act::Focus(key),
                    Act::Call { node: n.id, name: "change".into(), args: vec![Value::String(item.to_string())] },
                ],
            )
        } else {
            seg
        });
    }
}

pub static SEGMENTED: Component = Component {
    name: "Segmented",
    draws: &["items", "active", "onChange"],
    not_here: &[],
    height: one,
    draw: inline_draw,
    width: inline_width,
    inline: Some(segmented_inline),
    keys: None,
};

// ---- Chip

fn chip_inline(n: &Node, ctx: &mut Ctx, _: Style, out: &mut Vec<Seg>) {
    let fg = if n.flag("dim") { ctx.faint() } else { ctx.text() };
    let (style, open, close) = if ctx.pal.mode == Mode::None {
        (Style::new(), "(", ")")
    } else {
        (ctx.bg(ctx.pal.surface).patch(fg), " ", " ")
    };
    let key = Key::of(n);
    let style = if n.handles("click") && ctx.focused(key) { style.patch(ctx.selected()) } else { style };
    let acts = if n.handles("click") {
        vec![Act::Focus(key), Act::Call { node: n.id, name: "click".into(), args: vec![] }]
    } else {
        Vec::new()
    };
    let mut segs = vec![Seg::atom(open, style)];
    for s in inline_all(&n.c, ctx, style) {
        segs.push(Seg { atom: true, style: style.patch(Style { bg: None, ..s.style }), ..s });
    }
    segs.push(Seg::atom(close, style));
    for seg in segs {
        out.push(if acts.is_empty() { seg } else { seg.on(key, acts.clone()) });
    }
}

pub static CHIP: Component = Component {
    name: "Chip",
    draws: &["children", "dim", "selected", "onClick"],
    not_here: &[],
    height: one,
    draw: inline_draw,
    width: inline_width,
    inline: Some(chip_inline),
    keys: None,
};

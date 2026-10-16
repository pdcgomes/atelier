//! Table, Stat, Stats, Badge, Meter, KeyValue, Timeline, Lanes, Calendar,
//! Tree and DiffView.

use ratatui::style::{Modifier, Style};
use serde_json::Value;

use super::{Component, Press};
use crate::fmt;
use crate::render::{
    self, Act, Align, Area, Ctx, Key, Kind, Seg, Target, Ui, boxed, cols, draw_lines, draw_one_line, flow_draw,
    flow_height, frame, inline_all, rows, segs_width, wrap,
};
use crate::theme::Mode;
use crate::tree::{Child, Node, Tone, text_of};

pub static ALL: &[&Component] =
    &[&TABLE, &STAT, &STATS, &BADGE, &METER, &KEYVALUE, &TIMELINE, &LANES, &CALENDAR, &TREE, &DIFFVIEW];

fn tone_of(v: &Value, key: &str) -> Option<Tone> {
    v.get(key).and_then(Value::as_str).and_then(Tone::parse)
}

// ---- Badge

fn badge_inline(n: &Node, ctx: &mut Ctx, _: Style, out: &mut Vec<Seg>) {
    let t = n.tone("tone").unwrap_or(Tone::Default);
    let variant = n.str("variant").unwrap_or("soft");
    let fg = ctx.tone(t);
    let style = match (variant, ctx.pal.mode) {
        (_, Mode::None) => Style::new(),
        ("solid", _) => Style::new().bg(ctx.pal.tone(t)).fg(ctx.pal.panel).add_modifier(Modifier::BOLD),
        ("outline", _) => fg,
        _ => fg.bg(ctx.pal.wash(t, 0.2)),
    };
    let (open, close) = if variant == "outline" || ctx.pal.mode == Mode::None { ("[", "]") } else { (" ", " ") };
    out.push(Seg::atom(open, style));
    if n.flag("dot") {
        out.push(Seg::atom("● ", style));
    }
    for s in inline_all(&n.c, ctx, style) {
        out.push(Seg { atom: true, style: style.patch(Style { bg: None, ..s.style }), ..s });
    }
    out.push(Seg::atom(close, style));
}

fn one(_: &Node, _: u16, _: &mut Ctx) -> u16 {
    1
}

fn inline_draw(n: &Node, a: Area, ctx: &mut Ctx) {
    let mut segs = Vec::new();
    render::inline(&Child::El(n.clone()), ctx, Style::new(), &mut segs);
    draw_lines(&wrap(&segs, a.w), a, ctx, Align::Left);
}

fn inline_width(n: &Node, ctx: &mut Ctx) -> u16 {
    ctx.natural(&Child::El(n.clone()))
}

pub static BADGE: Component = Component {
    name: "Badge",
    draws: &["children", "tone", "variant", "dot"],
    not_here: &[],
    height: one,
    draw: inline_draw,
    width: inline_width,
    inline: Some(badge_inline),
    keys: None,
};

// ---- Stat and Stats

fn stat_foot(n: &Node, ctx: &mut Ctx) -> Vec<Seg> {
    let mut foot = Vec::new();
    if n.has_slot("delta") {
        let t = n.tone("deltaTone").unwrap_or(Tone::Default);
        foot.extend(inline_all(n.slot("delta"), ctx, ctx.tone(t)));
    }
    if n.has_slot("hint") {
        if !foot.is_empty() {
            foot.push(Seg::new(" ", ctx.dim()));
        }
        foot.extend(inline_all(n.slot("hint"), ctx, ctx.dim()));
    }
    foot
}

fn stat_height(n: &Node, _: u16, ctx: &mut Ctx) -> u16 {
    let foot = !stat_foot(n, ctx).is_empty() || n.str("trend").is_some();
    4 + u16::from(foot)
}

fn stat_draw(n: &Node, a: Area, ctx: &mut Ctx) {
    let border = ctx.fg(ctx.pal.border);
    frame(a, ctx, border, &[], &[]);
    let inner = a.inset(2, 1, 2, 1);
    let label = text_of(n.slot("label")).to_uppercase();
    ctx.surf.put(inner.x, inner.y, &fmt::fit(&label, inner.w as usize), ctx.faint(), inner.w);
    let t = n.tone("tone").filter(|t| *t != Tone::Default);
    let vstyle = t.map(|t| ctx.tone(t)).unwrap_or(ctx.text()).add_modifier(Modifier::BOLD);
    let value = inline_all(n.slot("value"), ctx, vstyle);
    draw_one_line(&value, inner.x, inner.y + 1, inner.w, ctx);
    let foot = stat_foot(n, ctx);
    let trend = n.str("trend").unwrap_or("");
    let tw = fmt::width(trend) as u16;
    if !foot.is_empty() {
        draw_one_line(&foot, inner.x, inner.y + 2, inner.w.saturating_sub(if tw > 0 { tw + 1 } else { 0 }), ctx);
    }
    if tw > 0 {
        let style = ctx.tone(t.unwrap_or(Tone::Accent));
        ctx.surf.put(inner.x + inner.w.saturating_sub(tw), inner.y + 2, trend, style, tw);
    }
}

fn stat_width(n: &Node, ctx: &mut Ctx) -> u16 {
    let label = fmt::width(&text_of(n.slot("label"))) as u16;
    let value = ctx.natural_all(n.slot("value"));
    let foot = segs_width(&stat_foot(n, ctx)) + n.str("trend").map(|t| fmt::width(t) as u16 + 1).unwrap_or(0);
    label.max(value).max(foot) + 4
}

pub static STAT: Component = Component {
    name: "Stat",
    draws: &["label", "value", "tone", "delta", "deltaTone", "hint", "trend"],
    not_here: &[],
    height: stat_height,
    draw: stat_draw,
    width: stat_width,
    inline: None,
    keys: None,
};

/// Stats sit side by side, as many to a row as fit, their boxes touching.
fn stats_columns(n: &Node, w: u16) -> u16 {
    let min = cols(n.num("min").unwrap_or(140.0)).max(14);
    let count = n.c.iter().filter(|c| matches!(c, Child::El(_))).count().max(1) as u16;
    (w / min).clamp(1, count)
}

fn stats_cells(n: &Node, w: u16) -> (Vec<&Child>, Vec<u16>) {
    let list: Vec<&Child> = n.c.iter().filter(|c| matches!(c, Child::El(_))).collect();
    let per = stats_columns(n, w);
    let mut widths = Vec::new();
    for i in 0..per {
        widths.push(if i + 1 == per { w - (w / per) * (per - 1) } else { w / per });
    }
    (list, widths)
}

fn stats_height(n: &Node, w: u16, ctx: &mut Ctx) -> u16 {
    let (list, widths) = stats_cells(n, w);
    let mut h = 0;
    for chunk in list.chunks(widths.len()) {
        h += chunk.iter().enumerate().map(|(i, c)| render::child_height(c, widths[i], ctx)).max().unwrap_or(0);
    }
    h
}

fn stats_draw(n: &Node, a: Area, ctx: &mut Ctx) {
    let (list, widths) = stats_cells(n, a.w);
    let mut y = a.y;
    for chunk in list.chunks(widths.len()) {
        let h = chunk.iter().enumerate().map(|(i, c)| render::child_height(c, widths[i], ctx)).max().unwrap_or(0);
        let mut x = a.x;
        for (i, c) in chunk.iter().enumerate() {
            let ch = if boxed(c) { h } else { render::child_height(c, widths[i], ctx) };
            render::child_draw(c, Area::new(x, y, widths[i], ch), ctx);
            x += widths[i];
        }
        y += h as i32;
    }
}

fn stats_width(n: &Node, ctx: &mut Ctx) -> u16 {
    n.c.iter().map(|c| ctx.natural(c)).sum()
}

pub static STATS: Component = Component {
    name: "Stats",
    draws: &["children", "min"],
    not_here: &[],
    height: stats_height,
    draw: stats_draw,
    width: stats_width,
    inline: None,
    keys: None,
};

// ---- Meter

/// Draws a bar of `w` cells: each part its share of `max`, in its tone or its shade of ink; the rest the track.
pub fn draw_bar(ctx: &mut Ctx, x: u16, y: i32, w: u16, parts: &[(f64, Tone, Option<f64>)], max: f64, blocks: bool) {
    let total = max.max(1e-9);
    let mut used = 0u16;
    let mut acc = 0.0;
    for (value, tone, shade) in parts {
        acc += value.max(0.0);
        let upto = ((acc / total).clamp(0.0, 1.0) * w as f64).round() as u16;
        let style = match shade {
            Some(s) => ctx.fg(ctx.pal.ink(*s)),
            None => ctx.tone(*tone),
        };
        while used < upto {
            ctx.surf.put_char(x + used, y, if blocks { '█' } else { '━' }, style);
            used += 1;
        }
    }
    let track = ctx.fg(ctx.pal.border);
    while used < w {
        ctx.surf.put_char(x + used, y, if blocks { '░' } else { '─' }, track);
        used += 1;
    }
}

fn meter_parts(n: &Node) -> Vec<(f64, Tone, Option<f64>)> {
    let t = n.tone("tone").unwrap_or(Tone::Accent);
    let segs = n.list("segments");
    if segs.is_empty() {
        vec![(n.num("value").unwrap_or(0.0), t, None)]
    } else {
        segs.iter()
            .map(|s| {
                let value = s.get("value").and_then(Value::as_f64).unwrap_or(0.0);
                (value, tone_of(s, "tone").unwrap_or(t), s.get("shade").and_then(Value::as_f64))
            })
            .collect()
    }
}

fn meter_one_line(n: &Node, w: u16, ctx: &mut Ctx) -> bool {
    let label = ctx.natural_all(n.slot("label"));
    let text = fmt::width(n.str("text").unwrap_or("")) as u16;
    label == 0 || label + text + 16 <= w
}

fn meter_height(n: &Node, w: u16, ctx: &mut Ctx) -> u16 {
    if meter_one_line(n, w, ctx) { 1 } else { 2 }
}

fn meter_draw(n: &Node, a: Area, ctx: &mut Ctx) {
    let label = inline_all(n.slot("label"), ctx, ctx.dim());
    let text = n.str("text").unwrap_or("").to_string();
    let tw = fmt::width(&text) as u16;
    let max = n.num("max").unwrap_or(100.0);
    let blocks = n.flag("blocks") && n.list("segments").is_empty();
    let parts = meter_parts(n);
    if meter_one_line(n, a.w, ctx) {
        let lw = segs_width(&label);
        let mut x = a.x;
        if lw > 0 {
            x += draw_one_line(&label, x, a.y, lw, ctx) + 1;
        }
        let room = (a.x + a.w).saturating_sub(x + if tw > 0 { tw + 1 } else { 0 });
        let bw = if blocks { room.min(24) } else { room };
        draw_bar(ctx, x, a.y, bw, &parts, max, blocks);
        if tw > 0 {
            ctx.surf.put(a.x + a.w - tw, a.y, &text, ctx.faint(), tw);
        }
    } else {
        draw_one_line(&label, a.x, a.y, a.w.saturating_sub(tw + 1), ctx);
        ctx.surf.put(a.x + a.w.saturating_sub(tw), a.y, &text, ctx.faint(), tw);
        draw_bar(ctx, a.x, a.y + 1, if blocks { a.w.min(24) } else { a.w }, &parts, max, blocks);
    }
}

fn meter_width(n: &Node, ctx: &mut Ctx) -> u16 {
    ctx.natural_all(n.slot("label")) + 24 + fmt::width(n.str("text").unwrap_or("")) as u16 + 2
}

pub static METER: Component = Component {
    name: "Meter",
    draws: &["value", "max", "label", "tone", "show", "blocks", "segments"],
    not_here: &[("height", "a bar's thickness in pixels; in a terminal it's a line of cells")],
    height: meter_height,
    draw: meter_draw,
    width: meter_width,
    inline: None,
    keys: None,
};

// ---- KeyValue

fn pairs(n: &Node) -> usize {
    n.num("n").unwrap_or(0.0) as usize
}

fn kv_layout(n: &Node, w: u16, ctx: &mut Ctx) -> (u16, u16, u16) {
    let label = (0..pairs(n)).map(|i| ctx.natural_all(n.slot(&format!("k:{i}")))).max().unwrap_or(0).min(22) + 2;
    let columns = if n.num("columns").unwrap_or(1.0) as u8 == 2 && w >= 80 { 2 } else { 1 };
    let col_w = w / columns;
    (label, columns, col_w)
}

fn kv_value_height(n: &Node, i: usize, w: u16, ctx: &mut Ctx) -> u16 {
    flow_height(n.slot(&format!("v:{i}")), w, ctx, 0.0).max(1)
}

fn kv_height(n: &Node, w: u16, ctx: &mut Ctx) -> u16 {
    let (label, columns, col_w) = kv_layout(n, w, ctx);
    let vw = col_w.saturating_sub(label + 1);
    let mut h = 0;
    for row in (0..pairs(n)).collect::<Vec<_>>().chunks(columns as usize) {
        h += row.iter().map(|&i| kv_value_height(n, i, vw, ctx)).max().unwrap_or(1);
    }
    h
}

fn kv_draw(n: &Node, a: Area, ctx: &mut Ctx) {
    let (label, columns, col_w) = kv_layout(n, a.w, ctx);
    let vw = col_w.saturating_sub(label + 1);
    let mut y = a.y;
    for row in (0..pairs(n)).collect::<Vec<_>>().chunks(columns as usize) {
        let h = row.iter().map(|&i| kv_value_height(n, i, vw, ctx)).max().unwrap_or(1);
        for (j, &i) in row.iter().enumerate() {
            let x = a.x + j as u16 * col_w;
            let k = inline_all(n.slot(&format!("k:{i}")), ctx, ctx.faint());
            draw_one_line(&k, x, y, label.saturating_sub(2), ctx);
            flow_draw(n.slot(&format!("v:{i}")), Area::new(x + label, y, vw, h), ctx, 0.0);
        }
        y += h as i32;
    }
}

fn kv_width(n: &Node, ctx: &mut Ctx) -> u16 {
    let label = (0..pairs(n)).map(|i| ctx.natural_all(n.slot(&format!("k:{i}")))).max().unwrap_or(0).min(22) + 2;
    let value = (0..pairs(n)).map(|i| ctx.natural_all(n.slot(&format!("v:{i}")))).max().unwrap_or(0);
    label + value
}

pub static KEYVALUE: Component = Component {
    name: "KeyValue",
    draws: &["items", "columns"],
    not_here: &[],
    height: kv_height,
    draw: kv_draw,
    width: kv_width,
    inline: None,
    keys: None,
};

// ---- Timeline

/// An item's line, without its dot, which hangs to its left.
fn timeline_item(n: &Node, i: usize, ctx: &mut Ctx) -> (Vec<Seg>, Option<usize>) {
    let item = &n.list("items")[i];
    let mut segs = inline_all(n.slot(&format!("title:{i}")), ctx, ctx.text().add_modifier(Modifier::BOLD));
    let who = inline_all(n.slot(&format!("who:{i}")), ctx, ctx.dim());
    if !who.is_empty() {
        segs.push(Seg::new("  ", ctx.dim()));
        segs.extend(who);
    }
    if let Some(ago) = item.get("ago").and_then(Value::as_str) {
        segs.push(Seg::new("  ", ctx.faint()));
        segs.push(Seg::atom(ago.to_string(), ctx.faint()));
    }
    let body = n.has_slot(&format!("body:{i}")).then_some(i);
    (segs, body)
}

fn timeline_height(n: &Node, w: u16, ctx: &mut Ctx) -> u16 {
    let mut h = 0;
    for i in 0..n.list("items").len() {
        let (head, body) = timeline_item(n, i, ctx);
        h += wrap(&head, w.saturating_sub(2)).len() as u16;
        if let Some(b) = body {
            h += render::flow_height_in(n.slot(&format!("body:{b}")), w.saturating_sub(2), ctx, 0.0, ctx.dim());
        }
    }
    h + if n.c.is_empty() { 0 } else { flow_height(&n.c, w, ctx, 0.0) }
}

fn timeline_draw(n: &Node, a: Area, ctx: &mut Ctx) {
    let mut y = a.y;
    for i in 0..n.list("items").len() {
        let (head, body) = timeline_item(n, i, ctx);
        let t = tone_of(&n.list("items")[i], "tone").unwrap_or(Tone::Accent);
        ctx.surf.put(a.x, y, "●", ctx.tone(t), 1);
        let lines = wrap(&head, a.w.saturating_sub(2));
        draw_lines(&lines, Area::new(a.x + 2, y, a.w.saturating_sub(2), lines.len() as u16), ctx, Align::Left);
        y += lines.len() as i32;
        if let Some(b) = body {
            let list = n.slot(&format!("body:{b}")).to_vec();
            let bh = render::flow_height_in(&list, a.w.saturating_sub(2), ctx, 0.0, ctx.dim());
            render::flow_draw_in(
                &list,
                Area::new(a.x + 2, y, a.w.saturating_sub(2), bh),
                ctx,
                0.0,
                ctx.dim(),
                Align::Left,
            );
            y += bh as i32;
        }
    }
    flow_draw(&n.c, Area::new(a.x, y, a.w, (a.bottom() - y).max(0) as u16), ctx, 0.0);
}

fn timeline_width(n: &Node, ctx: &mut Ctx) -> u16 {
    (0..n.list("items").len()).map(|i| segs_width(&timeline_item(n, i, ctx).0) + 2).max().unwrap_or(0)
}

pub static TIMELINE: Component = Component {
    name: "Timeline",
    draws: &["items", "limit"],
    not_here: &[],
    height: timeline_height,
    draw: timeline_draw,
    width: timeline_width,
    inline: None,
    keys: None,
};

// ---- Lanes

const LANE_MIN: u16 = 22;

fn lane_count(n: &Node) -> usize {
    n.list("lanes").len()
}

fn card_height(n: &Node, l: usize, i: usize, w: u16, ctx: &mut Ctx) -> u16 {
    let inner = w.saturating_sub(4);
    let title = render::flow_height_in(n.slot(&format!("item:{l}:{i}")), inner, ctx, 0.0, ctx.text());
    let detail = render::flow_height_in(n.slot(&format!("detail:{l}:{i}")), inner, ctx, 0.0, ctx.dim());
    2 + title.max(1) + detail
}

fn lane_height(n: &Node, l: usize, w: u16, ctx: &mut Ctx) -> u16 {
    let lane = &n.list("lanes")[l];
    let count = lane.get("items").and_then(Value::as_array).map(Vec::len).unwrap_or(0);
    2 + (0..count).map(|i| card_height(n, l, i, w, ctx)).sum::<u16>()
}

fn lanes_side_by_side(n: &Node, w: u16) -> bool {
    let k = lane_count(n).max(1) as u16;
    w / k >= LANE_MIN
}

fn lanes_height(n: &Node, w: u16, ctx: &mut Ctx) -> u16 {
    let k = lane_count(n);
    if k == 0 {
        return 0;
    }
    if lanes_side_by_side(n, w) {
        let lw = w / k as u16;
        (0..k).map(|l| lane_height(n, l, lw.saturating_sub(1), ctx)).max().unwrap_or(0)
    } else {
        (0..k).map(|l| lane_height(n, l, w, ctx) + 1).sum::<u16>().saturating_sub(1)
    }
}

fn lane_draw(n: &Node, l: usize, a: Area, ctx: &mut Ctx) {
    let lane = n.list("lanes")[l].clone();
    let t = tone_of(&lane, "tone").unwrap_or(Tone::Accent);
    let head = inline_all(n.slot(&format!("title:{l}")), ctx, ctx.tone(t).add_modifier(Modifier::BOLD));
    let head: Vec<Seg> = head.into_iter().map(|s| Seg { text: s.text.to_uppercase(), ..s }).collect();
    let count = lane.get("count").and_then(Value::as_u64).unwrap_or(0).to_string();
    draw_one_line(&head, a.x, a.y, a.w.saturating_sub(count.len() as u16 + 1), ctx);
    ctx.surf.put(a.x + a.w.saturating_sub(count.len() as u16), a.y, &count, ctx.tone(t), a.w);
    let line = ctx.tone(t);
    rule(Area::new(a.x, a.y + 1, a.w, 1), ctx, line);
    let mut y = a.y + 2;
    let items = lane.get("items").and_then(Value::as_array).cloned().unwrap_or_default();
    for (i, item) in items.iter().enumerate() {
        let h = card_height(n, l, i, a.w, ctx);
        let card = Area::new(a.x, y, a.w, h);
        let border = tone_of(item, "tone").map(|t| ctx.tone(t)).unwrap_or(ctx.fg(ctx.pal.border));
        frame(card, ctx, border, &[], &[]);
        let inner = card.inset(2, 1, 2, 1);
        let badge = inline_all(n.slot(&format!("badge:{l}:{i}")), ctx, ctx.text());
        let bw = segs_width(&badge);
        let title_list = n.slot(&format!("item:{l}:{i}")).to_vec();
        let th = render::flow_height_in(&title_list, inner.w, ctx, 0.0, ctx.text()).max(1);
        render::flow_draw_in(
            &title_list,
            Area::new(inner.x, inner.y, inner.w.saturating_sub(if bw > 0 { bw + 1 } else { 0 }), th),
            ctx,
            0.0,
            ctx.text().add_modifier(Modifier::BOLD),
            Align::Left,
        );
        if bw > 0 {
            draw_one_line(&badge, inner.x + inner.w.saturating_sub(bw), inner.y, bw, ctx);
        }
        let detail = n.slot(&format!("detail:{l}:{i}")).to_vec();
        let dh = render::flow_height_in(&detail, inner.w, ctx, 0.0, ctx.dim());
        render::flow_draw_in(
            &detail,
            Area::new(inner.x, inner.y + th as i32, inner.w, dh),
            ctx,
            0.0,
            ctx.dim(),
            Align::Left,
        );
        y += h as i32;
    }
}

fn rule(a: Area, ctx: &mut Ctx, style: Style) {
    for x in a.x..a.x + a.w {
        ctx.surf.put_char(x, a.y, '─', style);
    }
}

fn lanes_draw(n: &Node, a: Area, ctx: &mut Ctx) {
    let k = lane_count(n);
    if k == 0 {
        return;
    }
    if lanes_side_by_side(n, a.w) {
        let lw = a.w / k as u16;
        for l in 0..k {
            let w = if l + 1 == k { a.w - lw * (k as u16 - 1) } else { lw - 1 };
            lane_draw(n, l, Area::new(a.x + lw * l as u16, a.y, w, a.h), ctx);
        }
    } else {
        let mut y = a.y;
        for l in 0..k {
            let h = lane_height(n, l, a.w, ctx);
            lane_draw(n, l, Area::new(a.x, y, a.w, h), ctx);
            y += h as i32 + 1;
        }
    }
}

fn lanes_width(n: &Node, _: &mut Ctx) -> u16 {
    lane_count(n) as u16 * (LANE_MIN + 8)
}

pub static LANES: Component = Component {
    name: "Lanes",
    draws: &["lanes"],
    not_here: &[],
    height: lanes_height,
    draw: lanes_draw,
    width: lanes_width,
    inline: None,
    keys: None,
};

// ---- Calendar

const EVENTS_A_DAY: usize = 2;

fn week_heights(n: &Node) -> Vec<u16> {
    n.list("days")
        .chunks(7)
        .map(|week| {
            1 + week
                .iter()
                .map(|d| d.get("events").and_then(Value::as_array).map(Vec::len).unwrap_or(0).min(EVENTS_A_DAY))
                .max()
                .unwrap_or(0) as u16
        })
        .collect()
}

fn calendar_height(n: &Node, _: u16, _: &mut Ctx) -> u16 {
    2 + week_heights(n).iter().sum::<u16>()
}

fn calendar_draw(n: &Node, a: Area, ctx: &mut Ctx) {
    let key = Key::of(n);
    let label = n.str("label").unwrap_or("").to_string();
    let head_style = if ctx.focused(key) { ctx.selected() } else { ctx.text().add_modifier(Modifier::BOLD) };
    ctx.surf.put(a.x, a.y, &label, head_style, a.w);
    let nav = "‹  ›";
    let nx = a.x + a.w.saturating_sub(nav.chars().count() as u16);
    ctx.surf.put(nx, a.y, nav, ctx.fg(ctx.pal.accent), a.w);
    ctx.target(key, Kind::Calendar, Area::new(a.x, a.y, a.w, 1), "Calendar");
    ctx.hit(Area::new(nx, a.y, 1, 1), key, vec![Act::Call { node: n.id, name: "prev".into(), args: vec![] }]);
    ctx.hit(Area::new(nx + 3, a.y, 1, 1), key, vec![Act::Call { node: n.id, name: "next".into(), args: vec![] }]);
    let cw = (a.w / 7).max(3);
    for (i, d) in n.list("dows").iter().enumerate().take(7) {
        let dow = d.as_str().unwrap_or("");
        ctx.surf.put(a.x + i as u16 * cw, a.y + 1, &fmt::fit(dow, cw.saturating_sub(1) as usize), ctx.faint(), cw);
    }
    let mut y = a.y + 2;
    let heights = week_heights(n);
    for (w, week) in n.list("days").chunks(7).enumerate() {
        for (i, day) in week.iter().enumerate() {
            let x = a.x + i as u16 * cw;
            let num = day.get("n").and_then(Value::as_u64).unwrap_or(0).to_string();
            let out = day.get("out").and_then(Value::as_bool).unwrap_or(false);
            let today = day.get("today").and_then(Value::as_bool).unwrap_or(false);
            let style = if today {
                ctx.selected().patch(ctx.fg(ctx.pal.accent))
            } else if out {
                ctx.faint()
            } else {
                ctx.text()
            };
            ctx.surf.put(x, y, &num, style, cw);
            let events = day.get("events").and_then(Value::as_array).cloned().unwrap_or_default();
            for (k, e) in events.iter().take(EVENTS_A_DAY).enumerate() {
                let t = tone_of(e, "tone").unwrap_or(Tone::Accent);
                let more = k + 1 == EVENTS_A_DAY && events.len() > EVENTS_A_DAY;
                let title = if more {
                    format!("+{}", events.len() - k)
                } else {
                    e.get("title").and_then(Value::as_str).unwrap_or("").to_string()
                };
                let text = fmt::fit(&format!("•{title}"), cw.saturating_sub(1) as usize);
                ctx.surf.put(x, y + 1 + k as i32, &text, if out { ctx.faint() } else { ctx.tone(t) }, cw);
            }
        }
        y += heights[w] as i32;
    }
}

fn calendar_width(_: &Node, _: &mut Ctx) -> u16 {
    7 * 12
}

fn calendar_keys(n: &Node, _: &Target, press: Press, _: &Ui) -> Option<Vec<Act>> {
    let name = match press {
        Press::Left | Press::Char('h') => "prev",
        Press::Right | Press::Char('l') => "next",
        _ => return None,
    };
    Some(vec![Act::Call { node: n.id, name: name.into(), args: vec![] }])
}

pub static CALENDAR: Component = Component {
    name: "Calendar",
    draws: &["events", "month", "weekStart"],
    not_here: &[],
    height: calendar_height,
    draw: calendar_draw,
    width: calendar_width,
    inline: None,
    keys: Some(calendar_keys),
};

// ---- Tree

struct Branch {
    path: String,
    depth: u16,
    kids: bool,
    open: bool,
}

fn branches(n: &Node) -> Vec<Branch> {
    fn walk(list: &[Value], depth: u16, out: &mut Vec<Branch>) {
        for it in list {
            let path = it.get("path").and_then(Value::as_str).unwrap_or("").to_string();
            let kids = it.get("kids").and_then(Value::as_bool).unwrap_or(false);
            let open = it.get("open").and_then(Value::as_bool).unwrap_or(true);
            out.push(Branch { path, depth, kids, open });
            if let Some(children) = it.get("children").and_then(Value::as_array) {
                walk(children, depth + 1, out);
            }
        }
    }
    let mut out = Vec::new();
    walk(n.list("items"), 0, &mut out);
    out
}

fn tree_line(n: &Node, i: usize, b: &Branch, ctx: &mut Ctx) -> Vec<Seg> {
    let key = Key { node: n.id, part: i as u32 };
    let focused = ctx.focused(key);
    let mut out = vec![Seg::new("  ".repeat(b.depth as usize), ctx.text())];
    if b.kids {
        let acts = vec![Act::Call {
            node: n.id,
            name: "toggle".into(),
            args: vec![Value::String(b.path.clone()), Value::Bool(!b.open)],
        }];
        let style = if focused { ctx.selected() } else { ctx.fg(ctx.pal.accent) };
        out.push(Seg::atom(if b.open { "▾" } else { "▸" }, style).on(key, acts));
    } else {
        out.push(Seg::atom("·", ctx.faint()));
    }
    out.push(Seg::new(" ", ctx.text()));
    let label_style = if focused { ctx.selected() } else { ctx.text() };
    out.extend(inline_all(n.slot(&format!("label:{}", b.path)), ctx, label_style));
    let badge = inline_all(n.slot(&format!("badge:{}", b.path)), ctx, ctx.text());
    if !badge.is_empty() {
        out.push(Seg::new(" ", ctx.text()));
        out.extend(badge);
    }
    let detail = inline_all(n.slot(&format!("detail:{}", b.path)), ctx, ctx.faint());
    if !detail.is_empty() {
        out.push(Seg::new("  ", ctx.faint()));
        out.extend(detail);
    }
    out
}

fn tree_height(n: &Node, _: u16, _: &mut Ctx) -> u16 {
    branches(n).len() as u16
}

fn tree_draw(n: &Node, a: Area, ctx: &mut Ctx) {
    for (i, b) in branches(n).iter().enumerate() {
        let segs = tree_line(n, i, b, ctx);
        let y = a.y + i as i32;
        if b.kids {
            let key = Key { node: n.id, part: i as u32 };
            ctx.target(key, Kind::Tree, Area::new(a.x, y, a.w, 1), "Tree");
        }
        draw_one_line(&segs, a.x, y, a.w, ctx);
    }
}

fn tree_width(n: &Node, ctx: &mut Ctx) -> u16 {
    let list = branches(n);
    list.iter().enumerate().map(|(i, b)| segs_width(&tree_line(n, i, b, ctx))).max().unwrap_or(0)
}

fn tree_keys(n: &Node, t: &Target, press: Press, _: &Ui) -> Option<Vec<Act>> {
    let list = branches(n);
    let b = list.get(t.key.part as usize)?;
    let want = match press {
        Press::Enter | Press::Space => !b.open,
        Press::Right | Press::Char('l') => true,
        Press::Left | Press::Char('h') => false,
        _ => return None,
    };
    (want != b.open)
        .then(|| {
            vec![Act::Call {
                node: n.id,
                name: "toggle".into(),
                args: vec![Value::String(b.path.clone()), Value::Bool(want)],
            }]
        })
        .or(Some(vec![]))
}

pub static TREE: Component = Component {
    name: "Tree",
    draws: &["items"],
    not_here: &[],
    height: tree_height,
    draw: tree_draw,
    width: tree_width,
    inline: None,
    keys: Some(tree_keys),
};

// ---- DiffView

fn diff_height(n: &Node, _: u16, _: &mut Ctx) -> u16 {
    n.list("lines").len() as u16 + u16::from(n.has_slot("title"))
}

fn diff_draw(n: &Node, a: Area, ctx: &mut Ctx) {
    let bg = ctx.bg(ctx.pal.surface);
    ctx.surf.clear(a, bg);
    let mut y = a.y;
    if n.has_slot("title") {
        let title = inline_all(n.slot("title"), ctx, ctx.text().add_modifier(Modifier::BOLD).patch(bg));
        draw_one_line(&title, a.x + 1, y, a.w.saturating_sub(2), ctx);
        y += 1;
    }
    for line in n.list("lines") {
        let text = line.get("text").and_then(Value::as_str).unwrap_or("");
        let style = match line.get("kind").and_then(Value::as_str).unwrap_or("") {
            "file" => ctx.text().add_modifier(Modifier::BOLD),
            "hunk" => ctx.fg(ctx.pal.info),
            "add" => ctx.fg(ctx.pal.success),
            "del" => ctx.fg(ctx.pal.danger),
            _ => ctx.dim(),
        };
        ctx.surf.put(
            a.x + 1,
            y,
            &fmt::fit(if text.is_empty() { " " } else { text }, a.w.saturating_sub(2) as usize),
            style.patch(bg),
            a.w.saturating_sub(2),
        );
        y += 1;
    }
}

fn diff_width(n: &Node, _: &mut Ctx) -> u16 {
    n.list("lines")
        .iter()
        .map(|l| fmt::width(l.get("text").and_then(Value::as_str).unwrap_or("")) as u16)
        .max()
        .unwrap_or(0)
        + 2
}

pub static DIFFVIEW: Component = Component {
    name: "DiffView",
    draws: &["diff", "before", "after", "title"],
    not_here: &[],
    height: diff_height,
    draw: diff_draw,
    width: diff_width,
    inline: None,
    keys: None,
};

// ---- Table

struct Layout {
    widths: Vec<u16>,
    bar: u16,
    actions: u16,
    visible: usize,
    offset: usize,
}

fn table_rows(n: &Node) -> &[Value] {
    n.list("rows")
}

fn columns(n: &Node) -> &[Value] {
    n.list("columns")
}

fn cell(n: &Node, i: u64, c: usize) -> &[Child] {
    n.slot(&format!("c:{i}:{c}"))
}

fn row_index(row: &Value) -> u64 {
    row.get("i").and_then(Value::as_u64).unwrap_or(0)
}

fn actions_of(row: &Value) -> Vec<(String, Option<Tone>, u64)> {
    row.get("actions")
        .and_then(Value::as_array)
        .map(|list| {
            list.iter()
                .map(|a| {
                    (
                        a.get("label").and_then(Value::as_str).unwrap_or("").to_string(),
                        tone_of(a, "tone"),
                        a.get("k").and_then(Value::as_u64).unwrap_or(0),
                    )
                })
                .collect()
        })
        .unwrap_or_default()
}

fn table_layout(n: &Node, w: u16, ctx: &mut Ctx) -> Layout {
    let cols_list = columns(n);
    let rows_list = table_rows(n);
    let bar = if rows_list.iter().any(|r| tone_of(r, "tone").is_some()) { 2 } else { 0 };
    let actions = if n.flag("actions") {
        rows_list
            .iter()
            .map(|r| actions_of(r).iter().map(|(l, _, _)| fmt::width(l) as u16 + 3).sum::<u16>())
            .max()
            .unwrap_or(0)
    } else {
        0
    };
    let mut widths: Vec<u16> = Vec::new();
    for (c, col) in cols_list.iter().enumerate() {
        let fixed = col.get("width").and_then(Value::as_f64).map(cols);
        let head = ctx.natural_all(n.slot(&format!("h:{c}"))) + 2;
        let most = rows_list.iter().take(300).map(|r| ctx.natural_all(cell(n, row_index(r), c))).max().unwrap_or(0);
        widths.push(fixed.unwrap_or(head.max(most)).max(3));
    }
    let gaps = widths.len().saturating_sub(1) as u16 * 2;
    let room = w.saturating_sub(bar + gaps + if actions > 0 { actions + 2 } else { 0 });
    let mut total: u16 = widths.iter().sum();
    while total > room {
        let Some((i, _)) = widths.iter().enumerate().filter(|(_, w)| **w > 6).max_by_key(|(_, w)| **w) else { break };
        widths[i] -= 1;
        total -= 1;
    }
    let cap = n.num("maxHeight").map(|h| rows(h).saturating_sub(1).max(3) as usize).unwrap_or(usize::MAX);
    let visible = rows_list.len().min(cap);
    let sel = ctx.ui.selected.get(&n.id).copied().unwrap_or(0).min(rows_list.len().saturating_sub(1));
    let offset = if sel >= visible { sel + 1 - visible } else { 0 };
    Layout { widths, bar, actions, visible, offset }
}

fn table_height(n: &Node, w: u16, ctx: &mut Ctx) -> u16 {
    let l = table_layout(n, w, ctx);
    u16::from(n.flag("filter")) + 1 + l.visible as u16
}

fn align(col: &Value) -> Align {
    match col.get("align").and_then(Value::as_str) {
        Some("right") => Align::Right,
        Some("center") => Align::Center,
        _ => Align::Left,
    }
}

fn place(segs: &[Seg], x: u16, y: i32, w: u16, al: Align, ctx: &mut Ctx) {
    let sw = segs_width(segs).min(w);
    let dx = match al {
        Align::Left => 0,
        Align::Center => (w - sw) / 2,
        Align::Right => w - sw,
    };
    draw_one_line(segs, x + dx, y, w - dx, ctx);
}

fn table_draw(n: &Node, a: Area, ctx: &mut Ctx) {
    let l = table_layout(n, a.w, ctx);
    let key = Key::of(n);
    let focused = ctx.focused(key);
    let mut y = a.y;
    if n.flag("filter") {
        let fkey = Key { node: n.id, part: 1 };
        let query =
            ctx.editing(fkey).map(|e| e.text.clone()).unwrap_or_else(|| n.str("query").unwrap_or("").to_string());
        let total = n.num("total").unwrap_or(0.0) as u64;
        let label = format!("/ filter {total} rows: ");
        let field = Area::new(a.x, y, a.w.min(48), 1);
        let style = if ctx.focused(fkey) { ctx.selected() } else { ctx.dim().patch(ctx.bg(ctx.pal.surface)) };
        ctx.surf.clear(field, style);
        let lw = ctx.surf.put(field.x + 1, y, &label, ctx.faint().patch(style), field.w);
        ctx.surf.put(field.x + 1 + lw, y, &query, ctx.text().patch(style), field.w.saturating_sub(lw + 2));
        if ctx.editing(fkey).is_some() {
            let cursor =
                ctx.editing(fkey).map(|e| fmt::width(&e.text[..e.cursor.min(e.text.len())])).unwrap_or(0) as u16;
            ctx.cursor = Some((field.x + 1 + lw + cursor, y));
        }
        let shown = table_rows(n).len();
        if !query.is_empty() {
            ctx.surf.put(field.x + field.w + 1, y, &format!("{shown} shown"), ctx.faint(), a.w);
        }
        ctx.target(fkey, Kind::Filter, field, "Table");
        ctx.hit(field, fkey, vec![Act::Focus(fkey)]);
        y += 1;
    }
    // The heading, with the sort.
    let sort = n.p.get("sort").cloned().unwrap_or(Value::Null);
    let sort_col = sort.get("col").and_then(Value::as_u64);
    let sort_dir = sort.get("dir").and_then(Value::as_i64).unwrap_or(0);
    let mut x = a.x + l.bar;
    for (c, col) in columns(n).iter().enumerate() {
        let w = l.widths[c];
        let mut segs = inline_all(n.slot(&format!("h:{c}")), ctx, ctx.faint());
        if sort_col == Some(c as u64) {
            segs.push(Seg::atom(if sort_dir > 0 { " ▲" } else { " ▼" }, ctx.fg(ctx.pal.accent)));
        }
        place(&segs, x, y, w, align(col), ctx);
        if col.get("sortable").and_then(Value::as_bool).unwrap_or(true) {
            ctx.hit(
                Area::new(x, y, w, 1),
                key,
                vec![Act::Focus(key), Act::Call { node: n.id, name: "sortBy".into(), args: vec![Value::from(c)] }],
            );
        }
        x += w + 2;
    }
    y += 1;
    let sel = ctx.ui.selected.get(&n.id).copied().unwrap_or(0);
    let body = Area::new(a.x, y, a.w, l.visible as u16);
    ctx.target(key, Kind::Table, Area::new(a.x, a.y, a.w, a.h), "Table");
    for (r, row) in table_rows(n).iter().enumerate().skip(l.offset).take(l.visible) {
        let i = row_index(row);
        let ry = y + (r - l.offset) as i32;
        let line = Area::new(a.x, ry, a.w, 1);
        if focused && r == sel {
            let s = ctx.selected();
            ctx.surf.paint(line, s);
        }
        if let Some(t) = tone_of(row, "tone") {
            ctx.surf.put_char(a.x, ry, '▎', ctx.tone(t));
        }
        let mut x = a.x + l.bar;
        for (c, col) in columns(n).iter().enumerate() {
            let w = l.widths[c];
            let segs = inline_all(cell(n, i, c), ctx, ctx.text());
            place(&segs, x, ry, w, align(col), ctx);
            x += w + 2;
        }
        if l.actions > 0 {
            let mut ax = a.x + a.w - l.actions;
            for (label, tone, k) in actions_of(row) {
                let style = ctx.tone(tone.unwrap_or(Tone::Accent));
                let text = format!("[{label}]");
                let wrote = ctx.surf.put(ax, ry, &text, style, a.w);
                ctx.hit(
                    Area::new(ax, ry, wrote, 1),
                    key,
                    vec![
                        Act::Focus(key),
                        Act::Select { node: n.id, index: r },
                        Act::Call { node: n.id, name: "act".into(), args: vec![Value::from(i), Value::from(k)] },
                    ],
                );
                ax += wrote + 1;
            }
        }
        ctx.hit(line, key, vec![Act::Focus(key), Act::Select { node: n.id, index: r }]);
    }
    let _ = body;
}

fn table_width(n: &Node, ctx: &mut Ctx) -> u16 {
    let l = table_layout(n, 400, ctx);
    l.widths.iter().sum::<u16>()
        + l.widths.len().saturating_sub(1) as u16 * 2
        + l.bar
        + if l.actions > 0 { l.actions + 2 } else { 0 }
}

fn table_keys(n: &Node, t: &Target, press: Press, ui: &Ui) -> Option<Vec<Act>> {
    if t.kind == Kind::Filter {
        return None;
    }
    let count = table_rows(n).len();
    let sel = ui.selected.get(&n.id).copied().unwrap_or(0).min(count.saturating_sub(1));
    let select = |i: usize| vec![Act::Select { node: n.id, index: i }];
    match press {
        Press::Up | Press::Char('k') => Some(select(sel.saturating_sub(1))),
        Press::Down | Press::Char('j') => Some(select((sel + 1).min(count.saturating_sub(1)))),
        Press::Home => Some(select(0)),
        Press::End => Some(select(count.saturating_sub(1))),
        Press::Enter | Press::Space => {
            let row = table_rows(n).get(sel)?;
            let (_, _, k) = actions_of(row).into_iter().next()?;
            Some(vec![Act::Call {
                node: n.id,
                name: "act".into(),
                args: vec![Value::from(row_index(row)), Value::from(k)],
            }])
        }
        Press::Char('s') | Press::Char('S') => {
            let sorted = n.p.get("sort").and_then(|s| s.get("col")).and_then(Value::as_u64).map(|c| c as usize);
            let sortable: Vec<usize> = columns(n)
                .iter()
                .enumerate()
                .filter(|(_, c)| c.get("sortable").and_then(Value::as_bool).unwrap_or(true))
                .map(|(i, _)| i)
                .collect();
            let col = match (press, sorted) {
                (Press::Char('S'), Some(c)) => sortable.iter().copied().find(|&i| i > c).or(sortable.first().copied()),
                (_, Some(c)) => Some(c),
                _ => sortable.first().copied(),
            }?;
            Some(vec![Act::Call { node: n.id, name: "sortBy".into(), args: vec![Value::from(col)] }])
        }
        Press::Char('/') if n.flag("filter") => Some(vec![Act::Focus(Key { node: n.id, part: 1 })]),
        _ => None,
    }
}

pub static TABLE: Component = Component {
    name: "Table",
    draws: &["columns", "headers", "rows", "filter", "rowTone", "actions", "empty", "maxHeight", "stateKey"],
    not_here: &[("dense", "every row is one line in a terminal already")],
    height: table_height,
    draw: table_draw,
    width: table_width,
    inline: None,
    keys: Some(table_keys),
};

//! The HTML the kit's Markdown and the templates use, and what a canvas can
//! write by hand: headings, paragraphs, lists, quotes, tables, code,
//! emphasis, and the kit's tone classes. What isn't here draws its text.

use ratatui::style::{Modifier, Style};

use super::{CSS, Component};
use crate::fmt;
use crate::render::{
    self, Act, Align, Area, Ctx, Key, Seg, css_cols, draw_one_line, flow_draw_in, flow_height_in, inline, inline_all,
    rule, segs_width, wrap,
};
use crate::tree::{Child, Node, Tone, text_of};

/// Every HTML element this draws, which tests/parity.rs checks against kit.json's.
pub const TAGS: [&str; 52] = [
    "a",
    "abbr",
    "article",
    "aside",
    "b",
    "blockquote",
    "br",
    "code",
    "dd",
    "details",
    "div",
    "dl",
    "dt",
    "em",
    "figcaption",
    "figure",
    "footer",
    "form",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "header",
    "hr",
    "i",
    "img",
    "kbd",
    "label",
    "li",
    "main",
    "mark",
    "nav",
    "ol",
    "p",
    "pre",
    "s",
    "section",
    "small",
    "span",
    "strong",
    "summary",
    "table",
    "tbody",
    "td",
    "th",
    "thead",
    "time",
    "tr",
    "u",
    "ul",
];

pub fn component(t: &str) -> Option<&'static Component> {
    Some(match t {
        "span" | "b" | "strong" | "em" | "i" | "u" | "s" | "small" | "mark" | "code" | "kbd" | "a" | "br" | "time"
        | "label" | "abbr" => &INLINE,
        "h1" | "h2" | "h3" | "h4" | "h5" | "h6" => &HEADING,
        "ul" | "ol" => &LIST,
        "blockquote" => &QUOTE,
        "pre" => &PRE,
        "hr" => &HR,
        "table" => &TABLE,
        "img" => &IMG,
        _ if TAGS.contains(&t) => &BLOCK,
        _ => return None,
    })
}

/// The style an element's classes, its own CSS and its tag give its text, over `base`.
pub fn style_of(n: &Node, ctx: &Ctx, base: Style) -> Style {
    let mut s = base;
    let classes: Vec<&str> = n.classes().collect();
    if (classes.contains(&"at-toned") || classes.iter().any(|c| c.starts_with("at-t-")))
        && let Some(t) = classes.iter().find_map(|c| c.strip_prefix("at-t-")).and_then(Tone::parse)
    {
        s = s.patch(ctx.tone(t));
    }
    if classes.contains(&"at-text-2") {
        s = s.patch(ctx.dim());
    }
    if classes.contains(&"at-text-3") {
        s = s.patch(ctx.faint());
    }
    if classes.contains(&"at-code") {
        s = s.patch(crate::kit::text::code_style(ctx));
    }
    if let Some(c) = n.style("color").and_then(|v| ctx.pal.variable(&v)) {
        s = s.patch(ctx.fg(c));
    }
    if let Some(c) = n.style("background").or(n.style("backgroundColor")).and_then(|v| ctx.pal.variable(&v)) {
        s = s.patch(ctx.bg(c));
    }
    if n.style("fontWeight").is_some_and(|w| w == "bold" || w.parse::<u32>().is_ok_and(|n| n >= 600)) {
        s = s.add_modifier(Modifier::BOLD);
    }
    if n.style("fontStyle").as_deref() == Some("italic") {
        s = s.add_modifier(Modifier::ITALIC);
    }
    match n.t.as_str() {
        "b" | "strong" => s.add_modifier(Modifier::BOLD),
        "em" | "i" => s.add_modifier(Modifier::ITALIC),
        "u" => s.add_modifier(Modifier::UNDERLINED),
        "s" => s.add_modifier(Modifier::CROSSED_OUT),
        "small" => s.patch(ctx.dim()),
        "mark" => s.patch(ctx.bg(ctx.pal.selection)),
        "code" => s.patch(crate::kit::text::code_style(ctx)),
        "kbd" => s.patch(ctx.fg(ctx.pal.accent)).add_modifier(Modifier::BOLD),
        "a" => s.patch(ctx.fg(ctx.pal.accent)).add_modifier(Modifier::UNDERLINED),
        "figcaption" => s.patch(ctx.faint()),
        _ => s,
    }
}

fn clicks(n: &Node) -> Option<(Key, Vec<Act>)> {
    n.handles("click").then(|| (Key::of(n), vec![Act::Call { node: n.id, name: "click".into(), args: vec![] }]))
}

// ---- Inline

fn inline_fn(n: &Node, ctx: &mut Ctx, base: Style, out: &mut Vec<Seg>) {
    if n.t == "br" {
        out.push(Seg::new("\n", base));
        return;
    }
    let mut style = style_of(n, ctx, base);
    let click = clicks(n);
    if let Some((key, _)) = &click
        && ctx.focused(*key)
    {
        style = style.patch(ctx.selected());
    }
    let start = out.len();
    for c in &n.c {
        inline(c, ctx, style, out);
    }
    if let Some((key, acts)) = click {
        for s in &mut out[start..] {
            s.key = Some(key);
            s.acts = acts.clone();
        }
    }
}

fn inline_height(n: &Node, w: u16, ctx: &mut Ctx) -> u16 {
    let mut segs = Vec::new();
    inline_fn(n, ctx, Style::new(), &mut segs);
    wrap(&segs, w).len() as u16
}

fn inline_draw(n: &Node, a: Area, ctx: &mut Ctx) {
    let mut segs = Vec::new();
    inline_fn(n, ctx, Style::new(), &mut segs);
    render::draw_lines(&wrap(&segs, a.w), a, ctx, Align::Left);
}

fn inline_width(n: &Node, ctx: &mut Ctx) -> u16 {
    let mut segs = Vec::new();
    inline_fn(n, ctx, Style::new(), &mut segs);
    segs_width(&segs)
}

pub static INLINE: Component = Component {
    name: "span",
    draws: &[],
    not_here: &CSS,
    height: inline_height,
    draw: inline_draw,
    width: inline_width,
    inline: Some(inline_fn),
    keys: None,
};

// ---- Blocks

fn indent(n: &Node) -> u16 {
    ["paddingLeft", "marginLeft", "padding"]
        .iter()
        .filter_map(|k| n.style(k))
        .map(|v| css_cols(v.split_whitespace().last().unwrap_or(&v)))
        .max()
        .unwrap_or(0)
        .min(12)
}

fn align_of(n: &Node) -> Align {
    match n.style("textAlign").as_deref() {
        Some("center") => Align::Center,
        Some("right") | Some("end") => Align::Right,
        _ => Align::Left,
    }
}

fn gap_of(n: &Node) -> f64 {
    if n.classes().any(|c| c == "at-md") { 12.0 } else { 0.0 }
}

fn block_height(n: &Node, w: u16, ctx: &mut Ctx) -> u16 {
    let i = indent(n);
    let style = style_of(n, ctx, Style::new());
    flow_height_in(&n.c, w.saturating_sub(i), ctx, gap_of(n), style)
}

fn block_draw(n: &Node, a: Area, ctx: &mut Ctx) {
    let i = indent(n);
    let style = style_of(n, ctx, Style::new());
    flow_draw_in(&n.c, a.inset(i, 0, 0, 0), ctx, gap_of(n), style, align_of(n));
    if let Some((key, acts)) = clicks(n) {
        ctx.target(key, render::Kind::Click, a, &n.t);
        ctx.hit(a, key, acts);
    }
}

fn block_width(n: &Node, ctx: &mut Ctx) -> u16 {
    ctx.natural_all(&n.c) + indent(n)
}

pub static BLOCK: Component = Component {
    name: "div",
    draws: &[],
    not_here: &CSS,
    height: block_height,
    draw: block_draw,
    width: block_width,
    inline: None,
    keys: None,
};

// ---- Headings

fn heading_style(n: &Node, ctx: &Ctx) -> Style {
    let s = match n.t.as_str() {
        "h1" => ctx.fg(ctx.pal.accent),
        "h2" => ctx.text(),
        _ => ctx.dim(),
    };
    s.add_modifier(Modifier::BOLD)
}

fn heading_height(n: &Node, w: u16, ctx: &mut Ctx) -> u16 {
    let segs = inline_all(&n.c, ctx, heading_style(n, ctx));
    wrap(&segs, w).len() as u16
}

fn heading_draw(n: &Node, a: Area, ctx: &mut Ctx) {
    let segs = inline_all(&n.c, ctx, heading_style(n, ctx));
    render::draw_lines(&wrap(&segs, a.w), a, ctx, Align::Left);
}

pub static HEADING: Component = Component {
    name: "h1",
    draws: &[],
    not_here: &CSS,
    height: heading_height,
    draw: heading_draw,
    width: block_width,
    inline: None,
    keys: None,
};

// ---- Lists

fn items(n: &Node) -> Vec<&Node> {
    n.c.iter().filter_map(|c| if let Child::El(li) = c { (li.t == "li").then_some(li) } else { None }).collect()
}

fn marker(n: &Node, li: &Node, i: usize) -> String {
    if li.style("listStyle").is_some_and(|s| s == "none") {
        return String::new();
    }
    if n.t == "ol" { format!("{}. ", i + 1) } else { "• ".to_string() }
}

fn list_height(n: &Node, w: u16, ctx: &mut Ctx) -> u16 {
    let base = style_of(n, ctx, Style::new());
    items(n)
        .iter()
        .enumerate()
        .map(|(i, li)| {
            let m = fmt::width(&marker(n, li, i)) as u16;
            flow_height_in(&li.c, w.saturating_sub(m), ctx, 0.0, style_of(li, ctx, base)).max(1)
        })
        .sum()
}

fn list_draw(n: &Node, a: Area, ctx: &mut Ctx) {
    let base = style_of(n, ctx, Style::new());
    let mut y = a.y;
    for (i, li) in items(n).iter().enumerate() {
        let m = marker(n, li, i);
        let mw = fmt::width(&m) as u16;
        let style = style_of(li, ctx, base);
        let h = flow_height_in(&li.c, a.w.saturating_sub(mw), ctx, 0.0, style).max(1);
        ctx.surf.put(a.x, y, &m, ctx.faint(), mw);
        flow_draw_in(&li.c, Area::new(a.x + mw, y, a.w.saturating_sub(mw), h), ctx, 0.0, style, Align::Left);
        y += h as i32;
    }
}

pub static LIST: Component = Component {
    name: "ul",
    draws: &[],
    not_here: &CSS,
    height: list_height,
    draw: list_draw,
    width: block_width,
    inline: None,
    keys: None,
};

// ---- Quotes, code and rules

fn quote_height(n: &Node, w: u16, ctx: &mut Ctx) -> u16 {
    flow_height_in(&n.c, w.saturating_sub(2), ctx, 12.0, ctx.dim())
}

fn quote_draw(n: &Node, a: Area, ctx: &mut Ctx) {
    let bar = ctx.fg(ctx.pal.border);
    for y in a.y..a.bottom() {
        ctx.surf.put_char(a.x, y, '│', bar);
    }
    flow_draw_in(&n.c, a.inset(2, 0, 0, 0), ctx, 12.0, ctx.dim().add_modifier(Modifier::ITALIC), Align::Left);
}

pub static QUOTE: Component = Component {
    name: "blockquote",
    draws: &[],
    not_here: &CSS,
    height: quote_height,
    draw: quote_draw,
    width: block_width,
    inline: None,
    keys: None,
};

fn pre_height(n: &Node, _: u16, _: &mut Ctx) -> u16 {
    text_of(&n.c).lines().count().max(1) as u16
}

fn pre_draw(n: &Node, a: Area, ctx: &mut Ctx) {
    let style = crate::kit::text::code_style(ctx);
    ctx.surf.clear(a, style);
    for (i, line) in text_of(&n.c).lines().enumerate() {
        ctx.surf.put(
            a.x + 1,
            a.y + i as i32,
            &fmt::fit(line, a.w.saturating_sub(2) as usize),
            style,
            a.w.saturating_sub(2),
        );
    }
}

fn pre_width(n: &Node, _: &mut Ctx) -> u16 {
    text_of(&n.c).lines().map(fmt::width).max().unwrap_or(0) as u16 + 2
}

pub static PRE: Component = Component {
    name: "pre",
    draws: &[],
    not_here: &CSS,
    height: pre_height,
    draw: pre_draw,
    width: pre_width,
    inline: None,
    keys: None,
};

fn one(_: &Node, _: u16, _: &mut Ctx) -> u16 {
    1
}

fn hr_draw(_: &Node, a: Area, ctx: &mut Ctx) {
    let s = ctx.fg(ctx.pal.border);
    rule(a.row(0), ctx, &[], s);
}

fn hr_width(_: &Node, _: &mut Ctx) -> u16 {
    8
}

pub static HR: Component = Component {
    name: "hr",
    draws: &[],
    not_here: &CSS,
    height: one,
    draw: hr_draw,
    width: hr_width,
    inline: None,
    keys: None,
};

// ---- Tables: Markdown's

fn table_rows(n: &Node) -> (Vec<&Node>, Vec<&Node>) {
    let mut head = Vec::new();
    let mut body = Vec::new();
    fn rows_in<'a>(list: &'a [Child], into: &mut Vec<&'a Node>) {
        for c in list {
            if let Child::El(e) = c {
                if e.t == "tr" {
                    into.push(e);
                } else {
                    rows_in(&e.c, into);
                }
            }
        }
    }
    for c in &n.c {
        if let Child::El(e) = c {
            if e.t == "thead" {
                rows_in(&e.c, &mut head);
            } else {
                rows_in(std::slice::from_ref(c), &mut body);
            }
        }
    }
    (head, body)
}

fn cells(tr: &Node) -> Vec<&Node> {
    tr.c.iter()
        .filter_map(|c| if let Child::El(e) = c { matches!(e.t.as_str(), "td" | "th").then_some(e) } else { None })
        .collect()
}

fn widths(n: &Node, w: u16, ctx: &mut Ctx) -> Vec<u16> {
    let (head, body) = table_rows(n);
    let mut out: Vec<u16> = Vec::new();
    for tr in head.iter().chain(body.iter()) {
        for (i, td) in cells(tr).iter().enumerate() {
            let cw = ctx.natural_all(&td.c);
            if out.len() <= i {
                out.push(cw);
            } else {
                out[i] = out[i].max(cw);
            }
        }
    }
    let room = w.saturating_sub(out.len().saturating_sub(1) as u16 * 2);
    let mut total: u16 = out.iter().sum();
    while total > room {
        let Some((i, _)) = out.iter().enumerate().filter(|(_, w)| **w > 4).max_by_key(|(_, w)| **w) else { break };
        out[i] -= 1;
        total -= 1;
    }
    out
}

fn table_height(n: &Node, _: u16, _: &mut Ctx) -> u16 {
    let (head, body) = table_rows(n);
    (head.len() + body.len()) as u16 + u16::from(!head.is_empty())
}

fn table_draw(n: &Node, a: Area, ctx: &mut Ctx) {
    let ws = widths(n, a.w, ctx);
    let (head, body) = table_rows(n);
    let mut y = a.y;
    let row = |tr: &Node, y: i32, ctx: &mut Ctx, heading: bool| {
        let mut x = a.x;
        for (i, td) in cells(tr).iter().enumerate() {
            let w = ws.get(i).copied().unwrap_or(4);
            let base = if heading { ctx.faint().add_modifier(Modifier::BOLD) } else { ctx.text() };
            let segs = inline_all(&td.c, ctx, style_of(td, ctx, base));
            let sw = segs_width(&segs).min(w);
            let dx = match align_of(td) {
                Align::Right => w - sw,
                Align::Center => (w - sw) / 2,
                Align::Left => 0,
            };
            draw_one_line(&segs, x + dx, y, w - dx, ctx);
            x += w + 2;
        }
    };
    for tr in &head {
        row(tr, y, ctx, true);
        y += 1;
    }
    if !head.is_empty() {
        let s = ctx.fg(ctx.pal.border);
        let total: u16 = ws.iter().sum::<u16>() + ws.len().saturating_sub(1) as u16 * 2;
        for x in 0..total.min(a.w) {
            ctx.surf.put_char(a.x + x, y, '─', s);
        }
        y += 1;
    }
    for tr in &body {
        row(tr, y, ctx, false);
        y += 1;
    }
}

fn table_width(n: &Node, ctx: &mut Ctx) -> u16 {
    let ws = widths(n, 400, ctx);
    ws.iter().sum::<u16>() + ws.len().saturating_sub(1) as u16 * 2
}

pub static TABLE: Component = Component {
    name: "table",
    draws: &[],
    not_here: &CSS,
    height: table_height,
    draw: table_draw,
    width: table_width,
    inline: None,
    keys: None,
};

// ---- Images by hand: `useFile` gives an `atelier-file:` URL

fn img_path(n: &Node) -> Option<String> {
    n.str("src").and_then(|s| s.strip_prefix("atelier-file:")).map(String::from)
}

fn img_height(n: &Node, _: u16, _: &mut Ctx) -> u16 {
    if img_path(n).is_some() { 10 } else { 1 }
}

fn img_draw(n: &Node, a: Area, ctx: &mut Ctx) {
    let alt = n.str("alt").unwrap_or("").to_string();
    match img_path(n) {
        Some(path) => {
            let border = ctx.fg(ctx.pal.border);
            render::frame(a, ctx, border, &[], &[]);
            crate::kit::media::picture(&path, &alt, a.inset(1, 1, 1, 1), "contain", ctx);
            let key = Key::of(n);
            ctx.target(key, render::Kind::Media, a, "img");
            ctx.hit(a, key, vec![Act::Focus(key), Act::Open { path, alt }]);
        }
        None => {
            ctx.surf.put(a.x, a.y, &format!("▣ {alt}"), ctx.faint(), a.w);
        }
    }
}

fn img_width(_: &Node, _: &mut Ctx) -> u16 {
    30
}

pub static IMG: Component = Component {
    name: "img",
    draws: &[],
    not_here: &CSS,
    height: img_height,
    draw: img_draw,
    width: img_width,
    inline: None,
    keys: None,
};

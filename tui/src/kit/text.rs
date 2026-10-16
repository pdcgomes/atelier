//! Heading, Text, Code, Kbd, Link and Time.

use ratatui::style::{Modifier, Style};

use super::{Component, Press};
use crate::fmt;
use crate::render::{
    Act, Align, Area, Ctx, Key, Kind, Seg, Target, Ui, draw_lines, flow_draw_in, flow_height_in, inline, inline_all,
    wrap,
};
use crate::tree::{Node, Tone};

pub static ALL: &[&Component] = &[&HEADING, &TEXT, &CODE, &KBD, &LINK, &TIME];

fn natural_inline(n: &Node, ctx: &mut Ctx) -> u16 {
    ctx.natural(&crate::tree::Child::El(n.clone()))
}

// ---- Heading

fn heading_style(n: &Node, ctx: &Ctx) -> Style {
    let s = match n.num("level").unwrap_or(2.0) as u8 {
        1 => ctx.fg(ctx.pal.accent),
        2 => ctx.text(),
        _ => ctx.dim(),
    };
    s.add_modifier(Modifier::BOLD)
}

fn heading_segs(n: &Node, ctx: &mut Ctx) -> Vec<Seg> {
    let mut segs = inline_all(&n.c, ctx, heading_style(n, ctx));
    let info = inline_all(n.slot("info"), ctx, ctx.faint());
    if !info.is_empty() {
        segs.push(Seg::new("  ", ctx.faint()));
        segs.extend(info);
    }
    segs
}

fn heading_height(n: &Node, w: u16, ctx: &mut Ctx) -> u16 {
    let segs = heading_segs(n, ctx);
    wrap(&segs, w).len() as u16
}

fn heading_draw(n: &Node, a: Area, ctx: &mut Ctx) {
    let segs = heading_segs(n, ctx);
    let lines = wrap(&segs, a.w);
    draw_lines(&lines, a, ctx, Align::Left);
}

fn heading_width(n: &Node, ctx: &mut Ctx) -> u16 {
    crate::render::segs_width(&heading_segs(n, ctx))
}

pub static HEADING: Component = Component {
    name: "Heading",
    draws: &["children", "level", "info"],
    not_here: &[],
    height: heading_height,
    draw: heading_draw,
    width: heading_width,
    inline: None,
    keys: None,
};

// ---- Text

pub fn text_style(n: &Node, ctx: &Ctx, base: Style) -> Style {
    let mut s = match n.str("tone") {
        Some("secondary") => ctx.dim(),
        Some("muted") => ctx.faint(),
        Some(t) => match Tone::parse(t) {
            Some(Tone::Default) | None => {
                if base.fg.is_some() {
                    base
                } else {
                    ctx.text()
                }
            }
            Some(t) => ctx.tone(t),
        },
        None => {
            if base.fg.is_some() {
                base
            } else {
                ctx.text()
            }
        }
    };
    s = Style { bg: base.bg, ..s };
    if matches!(n.str("weight"), Some("bold") | Some("medium")) || n.str("size") == Some("lg") {
        s = s.add_modifier(Modifier::BOLD);
    }
    if n.flag("italic") {
        s = s.add_modifier(Modifier::ITALIC);
    }
    s
}

fn text_height(n: &Node, w: u16, ctx: &mut Ctx) -> u16 {
    if n.flag("truncate") {
        return 1;
    }
    let style = text_style(n, ctx, Style::new());
    flow_height_in(&n.c, w, ctx, 0.0, style)
}

fn text_draw(n: &Node, a: Area, ctx: &mut Ctx) {
    let style = text_style(n, ctx, Style::new());
    if n.flag("truncate") {
        let segs = inline_all(&n.c, ctx, style);
        crate::render::draw_one_line(&segs, a.x, a.y, a.w, ctx);
        return;
    }
    flow_draw_in(&n.c, a, ctx, 0.0, style, Align::Left);
}

fn text_inline(n: &Node, ctx: &mut Ctx, base: Style, out: &mut Vec<Seg>) {
    let style = text_style(n, ctx, base);
    for c in &n.c {
        inline(c, ctx, style, out);
    }
}

fn text_width(n: &Node, ctx: &mut Ctx) -> u16 {
    let style = text_style(n, ctx, Style::new());
    crate::render::segs_width(&inline_all(&n.c, ctx, style))
}

/// Text is inline when it's a span; `is_inline` asks it which it is.
pub static TEXT: Component = Component {
    name: "Text",
    draws: &["children", "tone", "size", "weight", "italic", "truncate", "as"],
    not_here: &[("tabular", "every character in a terminal is one width already")],
    height: text_height,
    draw: text_draw,
    width: text_width,
    inline: None,
    keys: None,
};

/// Text as a span, flowing with what's around it.
pub fn span_inline(n: &Node, ctx: &mut Ctx, base: Style, out: &mut Vec<Seg>) {
    text_inline(n, ctx, base, out)
}

// ---- Code

pub fn code_style(ctx: &Ctx) -> Style {
    ctx.text().patch(ctx.bg(ctx.pal.surface))
}

fn code_inline(n: &Node, ctx: &mut Ctx, _: Style, out: &mut Vec<Seg>) {
    out.push(Seg::atom(n.str("text").unwrap_or("").to_string(), code_style(ctx)));
}

fn code_lines(n: &Node, w: u16) -> Vec<String> {
    let text = n.str("text").unwrap_or("");
    let room = w.saturating_sub(2) as usize;
    if n.flag("wrap") { fmt::wrap(text, room) } else { text.split('\n').map(|l| fmt::fit(l, room)).collect() }
}

fn code_head(n: &Node) -> bool {
    n.str("lang").is_some_and(|l| !l.is_empty()) || n.p.get("copy").and_then(serde_json::Value::as_bool).unwrap_or(true)
}

fn code_height(n: &Node, w: u16, _: &mut Ctx) -> u16 {
    if !n.flag("block") {
        return 1;
    }
    code_lines(n, w).len() as u16 + u16::from(code_head(n))
}

fn code_draw(n: &Node, a: Area, ctx: &mut Ctx) {
    if !n.flag("block") {
        let segs = vec![Seg::atom(n.str("text").unwrap_or("").to_string(), code_style(ctx))];
        crate::render::draw_one_line(&segs, a.x, a.y, a.w, ctx);
        return;
    }
    let bg = ctx.bg(ctx.pal.surface);
    ctx.surf.clear(a, bg);
    let mut y = a.y;
    if code_head(n) {
        let lang = n.str("lang").unwrap_or("");
        ctx.surf.put(a.x + 1, y, lang, ctx.faint().patch(bg), a.w.saturating_sub(2));
        if n.p.get("copy").and_then(serde_json::Value::as_bool).unwrap_or(true) {
            let key = Key::of(n);
            let copied = ctx.ui.copied == Some(n.id);
            let label = if copied { "copied" } else { "copy" };
            let style = if ctx.focused(key) { ctx.selected() } else { ctx.fg(ctx.pal.accent).patch(bg) };
            let x = a.x + a.w.saturating_sub(fmt::width(label) as u16 + 1);
            let wrote = ctx.surf.put(x, y, label, style, a.w);
            let area = Area::new(x, y, wrote, 1);
            ctx.target(key, Kind::Copy, area, "Code");
            ctx.hit(area, key, vec![Act::Copy(n.str("text").unwrap_or("").to_string())]);
        }
        y += 1;
    }
    for line in code_lines(n, a.w) {
        ctx.surf.put(a.x + 1, y, &line, ctx.text().patch(bg), a.w.saturating_sub(2));
        y += 1;
    }
}

fn code_width(n: &Node, _: &mut Ctx) -> u16 {
    let text = n.str("text").unwrap_or("");
    let most = text.lines().map(fmt::width).max().unwrap_or(0) as u16;
    if n.flag("block") { most + 2 } else { most }
}

fn code_keys(n: &Node, _: &Target, press: Press, _: &Ui) -> Option<Vec<Act>> {
    matches!(press, Press::Enter | Press::Space | Press::Char('c'))
        .then(|| vec![Act::Copy(n.str("text").unwrap_or("").to_string())])
}

/// Code is inline unless it's a block; `is_inline` asks it which it is.
pub static CODE: Component = Component {
    name: "Code",
    draws: &["children", "block", "lang", "copy", "wrap"],
    not_here: &[],
    height: code_height,
    draw: code_draw,
    width: code_width,
    inline: None,
    keys: Some(code_keys),
};

pub fn code_span(n: &Node, ctx: &mut Ctx, base: Style, out: &mut Vec<Seg>) {
    code_inline(n, ctx, base, out)
}

// ---- Kbd

fn kbd_inline(n: &Node, ctx: &mut Ctx, _: Style, out: &mut Vec<Seg>) {
    let text = crate::tree::text_of(&n.c);
    out.push(Seg::atom(text, ctx.fg(ctx.pal.accent).add_modifier(Modifier::BOLD)));
}

fn one(_: &Node, _: u16, _: &mut Ctx) -> u16 {
    1
}

fn inline_draw(n: &Node, a: Area, ctx: &mut Ctx) {
    let segs = {
        let mut v = Vec::new();
        inline(&crate::tree::Child::El(n.clone()), ctx, Style::new(), &mut v);
        v
    };
    let lines = wrap(&segs, a.w);
    draw_lines(&lines, a, ctx, Align::Left);
}

fn inline_height(n: &Node, w: u16, ctx: &mut Ctx) -> u16 {
    let mut v = Vec::new();
    inline(&crate::tree::Child::El(n.clone()), ctx, Style::new(), &mut v);
    wrap(&v, w).len() as u16
}

pub static KBD: Component = Component {
    name: "Kbd",
    draws: &["children"],
    not_here: &[],
    height: one,
    draw: inline_draw,
    width: natural_inline,
    inline: Some(kbd_inline),
    keys: None,
};

// ---- Link

fn link_inline(n: &Node, ctx: &mut Ctx, _: Style, out: &mut Vec<Seg>) {
    let key = Key::of(n);
    let style = if ctx.focused(key) {
        ctx.selected().patch(ctx.fg(ctx.pal.accent))
    } else {
        ctx.fg(ctx.pal.accent).add_modifier(Modifier::UNDERLINED)
    };
    let acts = vec![Act::Call { node: n.id, name: "open".into(), args: vec![] }];
    let mut label = inline_all(&n.c, ctx, style);
    if label.iter().all(|s| s.text.is_empty()) {
        label = vec![Seg::new(n.str("path").or(n.str("href")).unwrap_or("").to_string(), style)];
    }
    for s in label {
        out.push(
            Seg { style: if s.style.fg.is_some() { style.patch(Style { fg: None, ..s.style }) } else { style }, ..s }
                .on(key, acts.clone()),
        );
    }
}

pub static LINK: Component = Component {
    name: "Link",
    draws: &["children", "href", "path", "line"],
    not_here: &[],
    height: inline_height,
    draw: inline_draw,
    width: natural_inline,
    inline: Some(link_inline),
    keys: None,
};

// ---- Time

fn time_inline(n: &Node, ctx: &mut Ctx, base: Style, out: &mut Vec<Seg>) {
    let style = if base.fg.is_some() { base } else { ctx.faint() };
    out.push(Seg::atom(n.str("text").unwrap_or("").to_string(), style));
}

pub static TIME: Component = Component {
    name: "Time",
    draws: &["at", "relative"],
    not_here: &[],
    height: one,
    draw: inline_draw,
    width: natural_inline,
    inline: Some(time_inline),
    keys: None,
};

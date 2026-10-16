//! Button, TextInput, TextArea, Select, Checkbox, Toggle, Radio, Slider,
//! Rating, Form, Approval and NeedsYou.

use ratatui::style::{Modifier, Style};
use serde_json::Value;

use super::{Component, Press};
use crate::fmt;
use crate::render::{
    self, Act, Align, Area, Ctx, Key, Kind, Seg, Target, Ui, draw_lines, flow_draw, flow_height, frame, inline_all,
    segs_width, wrap,
};
use crate::theme::Mode;
use crate::tree::{Child, Node, Tone, text_of};

pub static ALL: &[&Component] = &[
    &BUTTON, &TEXTINPUT, &TEXTAREA, &SELECT, &CHECKBOX, &TOGGLE, &RADIO, &SLIDER, &RATING, &FORM, &APPROVAL, &NEEDSYOU,
];

fn call(n: &Node, name: &str, args: Vec<Value>) -> Act {
    Act::Call { node: n.id, name: name.into(), args }
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

// ---- Button

fn button_inline(n: &Node, ctx: &mut Ctx, _: Style, out: &mut Vec<Seg>) {
    let key = Key::of(n);
    let t = n.tone("tone").unwrap_or(Tone::Default);
    let variant = n.str("variant").unwrap_or("outline");
    let disabled = n.flag("disabled") || !n.handles("press");
    let focused = ctx.focused(key);
    let label = text_of(&n.c);
    let kbd = n.str("kbd").map(|k| format!(" {k}")).unwrap_or_default();
    let fg = if t == Tone::Default { ctx.text() } else { ctx.tone(t) };
    let (text, style) = if disabled {
        (format!("[{label}{kbd}]"), ctx.faint())
    } else {
        match (variant, ctx.pal.mode) {
            (_, Mode::None) => (format!("[{label}{kbd}]"), if focused { ctx.selected() } else { Style::new() }),
            ("solid", _) => {
                let bg = if focused {
                    ctx.pal.focus
                } else {
                    ctx.pal.tone(if t == Tone::Default { Tone::Accent } else { t })
                };
                (format!(" {label}{kbd} "), Style::new().bg(bg).fg(ctx.pal.panel).add_modifier(Modifier::BOLD))
            }
            ("ghost", _) => (format!(" {label}{kbd} "), if focused { ctx.selected() } else { ctx.dim() }),
            _ => (format!("[{label}{kbd}]"), if focused { ctx.selected().patch(fg) } else { fg }),
        }
    };
    let seg = Seg::atom(text, style);
    out.push(if disabled { seg } else { seg.on(key, vec![call(n, "press", vec![])]) });
}

pub static BUTTON: Component = Component {
    name: "Button",
    draws: &["children", "onClick", "tone", "variant", "disabled", "kbd", "type", "title"],
    not_here: &[("size", "a button is one line high in a terminal, small or not")],
    height: one,
    draw: inline_draw,
    width: inline_width,
    inline: Some(button_inline),
    keys: None,
};

// ---- Fields

fn label_and_hint(n: &Node, ctx: &mut Ctx) -> (Vec<Seg>, Vec<Seg>) {
    let label = inline_all(n.slot("label"), ctx, ctx.dim());
    let foot = match n.str("error") {
        Some(e) if !e.is_empty() => vec![Seg::new(e.to_string(), ctx.fg(ctx.pal.danger))],
        _ => inline_all(n.slot("hint"), ctx, ctx.faint()),
    };
    (label, foot)
}

fn field_height(n: &Node, w: u16, ctx: &mut Ctx, body: u16) -> u16 {
    let (label, foot) = label_and_hint(n, ctx);
    let lh = if label.is_empty() { 0 } else { wrap(&label, w).len() as u16 };
    let fh = if foot.is_empty() { 0 } else { wrap(&foot, w).len() as u16 };
    lh + body + fh
}

/// Draws a field's label above and its hint or problem below, and returns the area between them.
fn field_frame(n: &Node, a: Area, ctx: &mut Ctx, body: u16) -> Area {
    let (label, foot) = label_and_hint(n, ctx);
    let mut y = a.y;
    if !label.is_empty() {
        let lines = wrap(&label, a.w);
        draw_lines(&lines, Area::new(a.x, y, a.w, lines.len() as u16), ctx, Align::Left);
        y += lines.len() as i32;
    }
    let field = Area::new(a.x, y, a.w, body);
    if !foot.is_empty() {
        let lines = wrap(&foot, a.w);
        draw_lines(&lines, Area::new(a.x, y + body as i32, a.w, lines.len() as u16), ctx, Align::Left);
    }
    field
}

fn input_style(focused: bool, ctx: &Ctx) -> Style {
    if focused { ctx.selected().remove_modifier(Modifier::BOLD) } else { ctx.bg(ctx.pal.surface) }
}

fn text_rows(n: &Node, w: u16, ctx: &Ctx) -> (Vec<String>, String) {
    let key = Key::of(n);
    let value = ctx.editing(key).map(|e| e.text.clone()).unwrap_or_else(|| n.str("value").unwrap_or("").to_string());
    (fmt::wrap(&value, w.saturating_sub(2).max(1) as usize), value)
}

fn textinput_height(n: &Node, w: u16, ctx: &mut Ctx) -> u16 {
    field_height(n, w, ctx, 1)
}

fn draw_text_field(n: &Node, field: Area, ctx: &mut Ctx, multiline: bool) {
    let key = Key::of(n);
    let focused = ctx.focused(key);
    let style = input_style(focused, ctx);
    ctx.surf.clear(field, style);
    let edit = ctx.editing(key);
    let value = edit.map(|e| e.text.clone()).unwrap_or_else(|| n.str("value").unwrap_or("").to_string());
    let room = field.w.saturating_sub(2);
    if value.is_empty() && edit.is_none() {
        ctx.surf.put(field.x + 1, field.y, n.str("placeholder").unwrap_or(""), ctx.faint().patch(style), room);
    } else if multiline {
        for (i, line) in fmt::wrap(&value, room.max(1) as usize).iter().enumerate().take(field.h as usize) {
            ctx.surf.put(field.x + 1, field.y + i as i32, line, ctx.text().patch(style), room);
        }
    } else {
        // The end of a long value stays in view as it's typed.
        let w = fmt::width(&value);
        let shown = if w > room as usize {
            value
                .chars()
                .rev()
                .scan(0, |acc, c| {
                    *acc += fmt::char_width(c);
                    (*acc < room as usize).then_some(c)
                })
                .collect::<Vec<_>>()
                .into_iter()
                .rev()
                .collect()
        } else {
            value.clone()
        };
        ctx.surf.put(field.x + 1, field.y, &shown, ctx.text().patch(style), room);
    }
    if let Some(e) = edit {
        let before = &e.text[..e.cursor.min(e.text.len())];
        if multiline {
            let lines = fmt::wrap(before, room.max(1) as usize);
            let row = lines.len().saturating_sub(1) as i32;
            let col = lines.last().map(|l| fmt::width(l)).unwrap_or(0) as u16;
            ctx.cursor = Some((field.x + 1 + col.min(room), field.y + row.min(field.h as i32 - 1)));
        } else {
            ctx.cursor = Some((field.x + 1 + (fmt::width(before) as u16).min(room), field.y));
        }
    }
    ctx.target(key, Kind::Input { multiline }, field, &n.t);
    ctx.hit(field, key, vec![Act::Focus(key)]);
}

fn textinput_draw(n: &Node, a: Area, ctx: &mut Ctx) {
    let field = field_frame(n, a, ctx, 1);
    draw_text_field(n, field, ctx, false);
}

fn field_width(n: &Node, ctx: &mut Ctx) -> u16 {
    let label = ctx.natural_all(n.slot("label"));
    label.max(32)
}

pub static TEXTINPUT: Component = Component {
    name: "TextInput",
    draws: &["placeholder", "type", "name", "stateKey", "value", "onChange", "label", "hint"],
    not_here: &[],
    height: textinput_height,
    draw: textinput_draw,
    width: field_width,
    inline: None,
    keys: None,
};

fn area_rows(n: &Node, w: u16, ctx: &Ctx) -> u16 {
    let rows = n.num("rows").unwrap_or(3.0) as u16;
    let (lines, _) = text_rows(n, w, ctx);
    (lines.len() as u16).max(rows).clamp(1, 12)
}

fn textarea_height(n: &Node, w: u16, ctx: &mut Ctx) -> u16 {
    let body = area_rows(n, w, ctx);
    field_height(n, w, ctx, body)
}

fn textarea_draw(n: &Node, a: Area, ctx: &mut Ctx) {
    let body = area_rows(n, a.w, ctx);
    let field = field_frame(n, a, ctx, body);
    draw_text_field(n, field, ctx, true);
}

pub static TEXTAREA: Component = Component {
    name: "TextArea",
    draws: &["placeholder", "rows", "name", "stateKey", "value", "onChange", "label", "hint"],
    not_here: &[],
    height: textarea_height,
    draw: textarea_draw,
    width: field_width,
    inline: None,
    keys: None,
};

// ---- Select

pub fn options(n: &Node) -> Vec<(String, String)> {
    n.list("options")
        .iter()
        .map(|o| {
            let value = o.get("value").and_then(Value::as_str).unwrap_or("").to_string();
            let label = o.get("label").and_then(Value::as_str).map(String::from).unwrap_or_else(|| value.clone());
            (value, label)
        })
        .collect()
}

fn select_height(n: &Node, w: u16, ctx: &mut Ctx) -> u16 {
    field_height(n, w, ctx, 1)
}

fn select_draw(n: &Node, a: Area, ctx: &mut Ctx) {
    let field = field_frame(n, a, ctx, 1);
    let key = Key::of(n);
    let focused = ctx.focused(key);
    let style = input_style(focused, ctx);
    let field = Area { w: field.w.min(40), ..field };
    ctx.surf.clear(field, style);
    let value = n.str("value").unwrap_or("");
    let label = options(n).into_iter().find(|(v, _)| v == value).map(|(_, l)| l);
    match label {
        Some(l) => ctx.surf.put(field.x + 1, field.y, &l, ctx.text().patch(style), field.w.saturating_sub(4)),
        None => ctx.surf.put(
            field.x + 1,
            field.y,
            n.str("placeholder").unwrap_or(""),
            ctx.faint().patch(style),
            field.w.saturating_sub(4),
        ),
    };
    ctx.surf.put(field.x + field.w.saturating_sub(2), field.y, "▾", ctx.fg(ctx.pal.accent).patch(style), 1);
    ctx.target(key, Kind::Select, field, "Select");
    ctx.hit(field, key, vec![Act::Focus(key), Act::Pick { node: n.id }]);
}

fn select_keys(n: &Node, _: &Target, press: Press, _: &Ui) -> Option<Vec<Act>> {
    let list = options(n);
    let at = list.iter().position(|(v, _)| Some(v.as_str()) == n.str("value"));
    let to = |i: usize| list.get(i).map(|(v, _)| vec![call(n, "change", vec![Value::String(v.clone())])]);
    match press {
        Press::Enter | Press::Space => Some(vec![Act::Pick { node: n.id }]),
        Press::Up | Press::Left => to(at.map(|i| i.saturating_sub(1)).unwrap_or(0)),
        Press::Down | Press::Right => to(at.map(|i| (i + 1).min(list.len().saturating_sub(1))).unwrap_or(0)),
        _ => None,
    }
}

pub static SELECT: Component = Component {
    name: "Select",
    draws: &["options", "placeholder", "name", "stateKey", "value", "onChange", "label", "hint"],
    not_here: &[],
    height: select_height,
    draw: select_draw,
    width: field_width,
    inline: None,
    keys: Some(select_keys),
};

// ---- Checkbox and Toggle

fn check_inline(n: &Node, ctx: &mut Ctx, _: Style, out: &mut Vec<Seg>) {
    let key = Key::of(n);
    let on = n.flag("checked");
    let focused = ctx.focused(key);
    let acts = vec![call(n, "change", vec![Value::Bool(!on)])];
    let mark = if n.t == "Toggle" {
        if on { ("━━●", ctx.fg(ctx.pal.accent)) } else { ("●━━", ctx.faint()) }
    } else if on {
        ("☑", ctx.fg(ctx.pal.success))
    } else {
        ("☐", ctx.faint())
    };
    let base = if focused { ctx.selected() } else { Style::new() };
    out.push(Seg::atom(mark.0, base.patch(mark.1)).on(key, acts.clone()));
    out.push(Seg::atom(" ", base).on(key, acts.clone()));
    for s in inline_all(n.slot("label"), ctx, ctx.text()) {
        out.push(Seg { style: base.patch(s.style), ..s }.on(key, acts.clone()));
    }
}

/// A checkbox or a toggle is a line of its own, as a label is in the browser's form.
fn check_draw(n: &Node, a: Area, ctx: &mut Ctx) {
    let mut segs = Vec::new();
    check_inline(n, ctx, Style::new(), &mut segs);
    let lines = wrap(&segs, a.w);
    let h = lines.len() as u16;
    draw_lines(&lines, Area { h, ..a }, ctx, Align::Left);
}

fn check_height(n: &Node, w: u16, ctx: &mut Ctx) -> u16 {
    let mut segs = Vec::new();
    check_inline(n, ctx, Style::new(), &mut segs);
    wrap(&segs, w).len() as u16
}

fn check_width(n: &Node, ctx: &mut Ctx) -> u16 {
    let mut segs = Vec::new();
    check_inline(n, ctx, Style::new(), &mut segs);
    segs_width(&segs)
}

fn check_keys(n: &Node, _: &Target, press: Press, _: &Ui) -> Option<Vec<Act>> {
    matches!(press, Press::Enter | Press::Space).then(|| vec![call(n, "change", vec![Value::Bool(!n.flag("checked"))])])
}

pub static CHECKBOX: Component = Component {
    name: "Checkbox",
    draws: &["name", "stateKey", "value", "onChange", "label"],
    not_here: &[("hint", "a checkbox has no hint in the kit either: it's drawn on one line with its label")],
    height: check_height,
    draw: check_draw,
    width: check_width,
    inline: None,
    keys: Some(check_keys),
};

pub static TOGGLE: Component = Component {
    name: "Toggle",
    draws: &["name", "stateKey", "value", "onChange", "label"],
    not_here: &[("hint", "a toggle has no hint in the kit either: it's drawn on one line with its label")],
    height: check_height,
    draw: check_draw,
    width: check_width,
    inline: None,
    keys: Some(check_keys),
};

// ---- Radio

fn radio_segs(n: &Node, ctx: &mut Ctx) -> Vec<Vec<Seg>> {
    let key = Key::of(n);
    let focused = ctx.focused(key);
    let value = n.str("value").unwrap_or("").to_string();
    n.list("options")
        .iter()
        .enumerate()
        .map(|(i, o)| {
            let v = o.get("value").and_then(Value::as_str).unwrap_or("").to_string();
            let on = v == value;
            let acts = vec![Act::Focus(key), call(n, "change", vec![Value::String(v)])];
            let base = if focused && on { ctx.selected() } else { Style::new() };
            let mut segs = vec![
                Seg::atom(
                    if on { "◉ " } else { "○ " },
                    base.patch(if on { ctx.fg(ctx.pal.accent) } else { ctx.faint() }),
                )
                .on(key, acts.clone()),
            ];
            for s in inline_all(n.slot(&format!("o:{i}")), ctx, ctx.text()) {
                segs.push(Seg { style: base.patch(s.style), ..s }.on(key, acts.clone()));
            }
            segs
        })
        .collect()
}

fn radio_lines(n: &Node, w: u16, ctx: &mut Ctx) -> Vec<Vec<Seg>> {
    let opts = radio_segs(n, ctx);
    if n.flag("vertical") {
        return opts;
    }
    let mut all = Vec::new();
    for (i, o) in opts.into_iter().enumerate() {
        if i > 0 {
            all.push(Seg::new("   ", ctx.text()));
        }
        all.extend(o.into_iter().map(|s| Seg { atom: true, ..s }));
    }
    wrap(&all, w)
}

fn radio_height(n: &Node, w: u16, ctx: &mut Ctx) -> u16 {
    let body = radio_lines(n, w, ctx).len() as u16;
    field_height(n, w, ctx, body)
}

fn radio_draw(n: &Node, a: Area, ctx: &mut Ctx) {
    let lines = radio_lines(n, a.w, ctx);
    let field = field_frame(n, a, ctx, lines.len() as u16);
    ctx.target(Key::of(n), Kind::Radio, field, "Radio");
    draw_lines(&lines, field, ctx, Align::Left);
}

fn radio_width(n: &Node, ctx: &mut Ctx) -> u16 {
    let opts = radio_segs(n, ctx);
    let widths: Vec<u16> = opts.iter().map(|o| segs_width(o)).collect();
    if n.flag("vertical") {
        widths.into_iter().max().unwrap_or(0)
    } else {
        widths.iter().sum::<u16>() + widths.len().saturating_sub(1) as u16 * 3
    }
}

fn radio_keys(n: &Node, _: &Target, press: Press, _: &Ui) -> Option<Vec<Act>> {
    let list: Vec<String> =
        n.list("options").iter().filter_map(|o| o.get("value").and_then(Value::as_str).map(String::from)).collect();
    let at = list.iter().position(|v| Some(v.as_str()) == n.str("value"));
    let next = match press {
        Press::Left | Press::Up | Press::Char('h') | Press::Char('k') => at.map(|i| i.saturating_sub(1)).unwrap_or(0),
        Press::Right | Press::Down | Press::Char('l') | Press::Char('j') => {
            at.map(|i| (i + 1).min(list.len().saturating_sub(1))).unwrap_or(0)
        }
        Press::Enter | Press::Space => at.map(|i| (i + 1) % list.len().max(1)).unwrap_or(0),
        _ => return None,
    };
    list.get(next).map(|v| vec![call(n, "change", vec![Value::String(v.clone())])])
}

pub static RADIO: Component = Component {
    name: "Radio",
    draws: &["options", "vertical", "name", "stateKey", "value", "onChange", "label", "hint"],
    not_here: &[],
    height: radio_height,
    draw: radio_draw,
    width: radio_width,
    inline: None,
    keys: Some(radio_keys),
};

// ---- Slider and Rating

fn slider_height(n: &Node, w: u16, ctx: &mut Ctx) -> u16 {
    field_height(n, w, ctx, 1)
}

fn slider_draw(n: &Node, a: Area, ctx: &mut Ctx) {
    let field = field_frame(n, a, ctx, 1);
    let key = Key::of(n);
    let (min, max) = (n.num("min").unwrap_or(0.0), n.num("max").unwrap_or(100.0));
    let value = n.num("value").unwrap_or(min);
    let text = format!("{}{}", fmt::number(value), n.str("unit").unwrap_or(""));
    let tw = fmt::width(&text) as u16;
    let track = field.w.saturating_sub(tw + 2).clamp(4, 40);
    let ratio = if max > min { ((value - min) / (max - min)).clamp(0.0, 1.0) } else { 0.0 };
    let knob = (ratio * (track - 1) as f64).round() as u16;
    let focused = ctx.focused(key);
    for x in 0..track {
        let (c, style) = if x == knob {
            ('●', if focused { ctx.selected().patch(ctx.fg(ctx.pal.accent)) } else { ctx.fg(ctx.pal.accent) })
        } else if x < knob {
            ('━', ctx.fg(ctx.pal.accent))
        } else {
            ('─', ctx.fg(ctx.pal.border))
        };
        ctx.surf.put_char(field.x + x, field.y, c, style);
    }
    ctx.surf.put(field.x + track + 1, field.y, &text, ctx.text(), tw);
    let area = Area::new(field.x, field.y, track, 1);
    ctx.target(key, Kind::Slider, area, "Slider");
    ctx.hit(area, key, vec![Act::Focus(key)]);
}

fn slider_keys(n: &Node, _: &Target, press: Press, _: &Ui) -> Option<Vec<Act>> {
    let (min, max) = (n.num("min").unwrap_or(0.0), n.num("max").unwrap_or(100.0));
    let step = n.num("step").unwrap_or(1.0).max(1e-9);
    let value = n.num("value").unwrap_or(min);
    let next = match press {
        Press::Left | Press::Down | Press::Char('h') => value - step,
        Press::Right | Press::Up | Press::Char('l') => value + step,
        Press::Home => min,
        Press::End => max,
        _ => return None,
    };
    Some(vec![call(n, "change", vec![Value::from(next.clamp(min, max))])])
}

pub static SLIDER: Component = Component {
    name: "Slider",
    draws: &["min", "max", "step", "unit", "name", "stateKey", "value", "onChange", "label", "hint"],
    not_here: &[],
    height: slider_height,
    draw: slider_draw,
    width: field_width,
    inline: None,
    keys: Some(slider_keys),
};

fn rating_draw(n: &Node, a: Area, ctx: &mut Ctx) {
    let field = field_frame(n, a, ctx, 1);
    let key = Key::of(n);
    let max = n.num("max").unwrap_or(5.0) as usize;
    let value = n.num("value").unwrap_or(0.0) as usize;
    let focused = ctx.focused(key);
    for i in 0..max {
        let on = i < value;
        let style = if on { ctx.fg(ctx.pal.warning) } else { ctx.faint() };
        let style = if focused && i + 1 == value.max(1) { ctx.selected().patch(style) } else { style };
        let x = field.x + i as u16 * 2;
        ctx.surf.put(x, field.y, "★", style, 1);
        ctx.hit(Area::new(x, field.y, 1, 1), key, vec![Act::Focus(key), call(n, "pick", vec![Value::from(i + 1)])]);
    }
    ctx.target(key, Kind::Rating, Area::new(field.x, field.y, (max as u16 * 2).min(field.w), 1), "Rating");
}

fn rating_keys(n: &Node, _: &Target, press: Press, _: &Ui) -> Option<Vec<Act>> {
    let max = n.num("max").unwrap_or(5.0);
    let value = n.num("value").unwrap_or(0.0);
    let next = match press {
        Press::Left | Press::Char('h') => value - 1.0,
        Press::Right | Press::Char('l') => value + 1.0,
        Press::Home => 0.0,
        Press::End => max,
        _ => return None,
    };
    Some(vec![call(n, "change", vec![Value::from(next.clamp(0.0, max))])])
}

pub static RATING: Component = Component {
    name: "Rating",
    draws: &["max", "name", "stateKey", "value", "onChange", "label", "hint"],
    not_here: &[],
    height: slider_height,
    draw: rating_draw,
    width: field_width,
    inline: None,
    keys: Some(rating_keys),
};

// ---- Form

fn form_height(n: &Node, w: u16, ctx: &mut Ctx) -> u16 {
    flow_height(&n.c, w, ctx, 12.0)
}

fn form_draw(n: &Node, a: Area, ctx: &mut Ctx) {
    flow_draw(&n.c, a, ctx, 12.0)
}

fn form_width(n: &Node, ctx: &mut Ctx) -> u16 {
    ctx.natural_all(&n.c)
}

pub static FORM: Component = Component {
    name: "Form",
    draws: &["name", "initial", "validate", "onSubmit", "submitLabel", "start", "children"],
    not_here: &[],
    height: form_height,
    draw: form_draw,
    width: form_width,
    inline: None,
    keys: None,
};

// ---- Approval and NeedsYou: boxes in their tone, their title set into the border

fn ask_body(n: &Node) -> Vec<Child> {
    let mut list = Vec::new();
    for name in ["detail", "unblocks", "command"] {
        if n.has_slot(name) {
            list.push(Child::El(Node {
                t: "div".into(),
                id: n.id * 1000 + list.len() as u64 + 1,
                c: n.slot(name).to_vec(),
                p: part_style(name),
                ..Default::default()
            }));
        }
    }
    list.extend(n.c.iter().cloned());
    if n.has_slot("actions") {
        list.extend(n.slot("actions").iter().cloned());
    }
    list
}

fn part_style(name: &str) -> serde_json::Map<String, Value> {
    let mut m = serde_json::Map::new();
    let class = match name {
        "unblocks" => "at-text-3",
        "detail" => "at-text-2",
        _ => "",
    };
    if !class.is_empty() {
        m.insert("class".into(), Value::String(class.into()));
    }
    m
}

fn ask_height(n: &Node, w: u16, ctx: &mut Ctx) -> u16 {
    flow_height(&ask_body(n), w.saturating_sub(4), ctx, 10.0) + 2
}

fn ask_draw(n: &Node, a: Area, ctx: &mut Ctx) {
    let t = n.tone("tone").unwrap_or(Tone::Accent);
    let settled = n.flag("settled");
    let border = if ctx.focus_inside(n) {
        ctx.fg(ctx.pal.focus)
    } else if settled {
        ctx.faint()
    } else {
        ctx.tone(t)
    };
    let title_style = if settled { ctx.dim() } else { ctx.text().add_modifier(Modifier::BOLD) };
    let title = inline_all(n.slot("title"), ctx, title_style);
    let badge_slot = if n.t == "NeedsYou" { "badges" } else { "badge" };
    let info = inline_all(n.slot(badge_slot), ctx, ctx.text());
    frame(a, ctx, border, &title, &info);
    flow_draw(&ask_body(n), a.inset(2, 1, 2, 1), ctx, 10.0);
}

fn ask_width(n: &Node, ctx: &mut Ctx) -> u16 {
    let title = ctx.natural_all(n.slot("title"));
    (ctx.natural_all(&ask_body(n)) + 4).max(title + 8)
}

pub static APPROVAL: Component = Component {
    name: "Approval",
    draws: &["id", "title", "detail", "children", "note", "labels"],
    not_here: &[],
    height: ask_height,
    draw: ask_draw,
    width: ask_width,
    inline: None,
    keys: None,
};

pub static NEEDSYOU: Component = Component {
    name: "NeedsYou",
    draws: &["id", "title", "detail", "unblocks", "blocking", "command", "done", "ask"],
    not_here: &[],
    height: ask_height,
    draw: ask_draw,
    width: ask_width,
    inline: None,
    keys: None,
};

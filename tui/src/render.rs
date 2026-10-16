//! How a canvas's tree becomes cells. Every renderer says how tall it is at a
//! width, then draws into an area in the canvas's coordinates, which run the
//! whole height of the canvas; the surface keeps only the rows on screen.
//! While it draws, a renderer says where its focusable parts are and what a
//! click on each does, and inline things (text, badges, links, code, times)
//! flow and wrap together.

use std::collections::{HashMap, HashSet};

use ratatui::buffer::Buffer;
use ratatui::layout::Rect;
use ratatui::style::{Color, Modifier, Style};
use serde_json::Value;

use crate::fmt;
use crate::kit;
use crate::theme::{Mode, Palette};
use crate::tree::{Child, Node, Tone};

/// Pixels to a column and to a row, for the sizes canvases give in pixels.
pub const PX_COL: f64 = 8.0;
pub const PX_ROW: f64 = 18.0;

pub fn cols(px: f64) -> u16 {
    (px / PX_COL).round().clamp(0.0, 400.0) as u16
}

pub fn rows(px: f64) -> u16 {
    (px / PX_ROW).round().clamp(0.0, 200.0) as u16
}

/// A CSS length, such as `24px`, `24` or `1.5rem`, in columns.
pub fn css_cols(v: &str) -> u16 {
    let v = v.trim();
    let n: f64 = v.trim_end_matches(|c: char| c.is_ascii_alphabetic() || c == '%').parse().unwrap_or(0.0);
    if v.ends_with("rem") || v.ends_with("em") { cols(n * 16.0) } else { cols(n) }
}

/// A rectangle in the canvas's coordinates: `y` runs down the whole canvas.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub struct Area {
    pub x: u16,
    pub y: i32,
    pub w: u16,
    pub h: u16,
}

impl Area {
    pub fn new(x: u16, y: i32, w: u16, h: u16) -> Area {
        Area { x, y, w, h }
    }
    pub fn inset(self, left: u16, top: u16, right: u16, bottom: u16) -> Area {
        Area {
            x: self.x + left,
            y: self.y + top as i32,
            w: self.w.saturating_sub(left + right),
            h: self.h.saturating_sub(top + bottom),
        }
    }
    pub fn row(self, i: u16) -> Area {
        Area { y: self.y + i as i32, h: 1, ..self }
    }
    pub fn bottom(self) -> i32 {
        self.y + self.h as i32
    }
    pub fn contains(self, x: u16, y: i32) -> bool {
        x >= self.x && x < self.x + self.w && y >= self.y && y < self.bottom()
    }
}

/// The rows of the canvas on screen, as cells.
pub struct Surface {
    pub buf: Buffer,
    /// The canvas row at the top of the buffer.
    pub top: i32,
}

impl Surface {
    pub fn new(w: u16, h: u16, top: i32) -> Surface {
        Surface { buf: Buffer::empty(Rect::new(0, 0, w, h)), top }
    }

    fn row(&self, y: i32) -> Option<u16> {
        let r = y - self.top;
        (r >= 0 && r < self.buf.area.height as i32).then_some(r as u16)
    }

    pub fn visible(&self, a: Area) -> bool {
        a.bottom() > self.top && a.y < self.top + self.buf.area.height as i32
    }

    /// Whether all of an area is on screen.
    pub fn fully(&self, a: Area) -> bool {
        a.y >= self.top && a.bottom() <= self.top + self.buf.area.height as i32
    }

    /// Writes text at a place, cut to `max` columns; returns how wide it was.
    pub fn put(&mut self, x: u16, y: i32, s: &str, style: Style, max: u16) -> u16 {
        let w = fmt::width(s).min(max as usize) as u16;
        if let Some(r) = self.row(y)
            && x < self.buf.area.width
        {
            let room = (self.buf.area.width - x).min(max);
            self.buf.set_stringn(x, r, s, room as usize, style);
        }
        w
    }

    pub fn put_char(&mut self, x: u16, y: i32, c: char, style: Style) {
        if let Some(r) = self.row(y)
            && x < self.buf.area.width
        {
            let cell = &mut self.buf[(x, r)];
            cell.set_char(c);
            cell.set_style(style);
        }
    }

    /// Patches a style over an area: a background, a selection.
    pub fn paint(&mut self, a: Area, style: Style) {
        for y in a.y..a.bottom() {
            if let Some(r) = self.row(y) {
                for x in a.x..(a.x + a.w).min(self.buf.area.width) {
                    self.buf[(x, r)].set_style(style);
                }
            }
        }
    }

    /// Fills an area with spaces in a style.
    pub fn clear(&mut self, a: Area, style: Style) {
        for y in a.y..a.bottom() {
            if let Some(r) = self.row(y) {
                for x in a.x..(a.x + a.w).min(self.buf.area.width) {
                    let cell = &mut self.buf[(x, r)];
                    cell.set_char(' ');
                    cell.set_style(style);
                }
            }
        }
    }
}

/// A focusable part of a canvas, by its element and which part of it.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct Key {
    pub node: u64,
    pub part: u32,
}

impl Key {
    pub fn of(n: &Node) -> Key {
        Key { node: n.id, part: 0 }
    }
}

/// What a focusable part is, which decides what the keys do on it.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Kind {
    Button,
    Link,
    Input { multiline: bool },
    Select,
    Check,
    Radio,
    Slider,
    Rating,
    Tabs,
    Section,
    Table,
    Filter,
    Tree,
    Tile,
    Calendar,
    Copy,
    Media,
    Click,
}

impl Kind {
    pub fn editable(self) -> bool {
        matches!(self, Kind::Input { .. } | Kind::Filter)
    }
}

#[derive(Debug, Clone)]
pub struct Target {
    pub key: Key,
    pub kind: Kind,
    pub area: Area,
    /// The element's type, for the hints.
    pub t: String,
}

/// What a click, or a key on a focused part, does.
#[derive(Debug, Clone, PartialEq)]
pub enum Act {
    /// Calls a handler in the canvas.
    Call { node: u64, name: String, args: Vec<Value> },
    /// Moves the focus there, and with `then`, does it too.
    Focus(Key),
    /// Selects a row or an item of a focused part.
    Select { node: u64, index: usize },
    /// Shows an image, a video or a file full size.
    Open { path: String, alt: String },
    /// Puts text on the clipboard.
    Copy(String),
    /// Opens a picker for a select.
    Pick { node: u64 },
}

#[derive(Debug, Clone)]
pub struct Hit {
    pub area: Area,
    pub key: Key,
    pub acts: Vec<Act>,
}

/// An image to place on screen once the cells are drawn.
#[derive(Debug, Clone)]
pub struct Placement {
    pub path: String,
    pub alt: String,
    pub area: Area,
    pub fit: String,
}

/// What a text field shows while it's being edited: its text and where the cursor is.
#[derive(Debug, Clone, Default)]
pub struct Edit {
    pub key: Option<Key>,
    pub text: String,
    pub cursor: usize,
}

/// What the viewer remembers between frames that isn't in the canvas's state:
/// which row of a table is selected, what's been copied.
#[derive(Debug, Default, Clone)]
pub struct Ui {
    pub selected: HashMap<u64, usize>,
    pub copied: Option<u64>,
    pub images: HashMap<String, kit::media::Loaded>,
    /// Whether a graphics protocol draws the images, rather than half blocks.
    pub graphics: bool,
}

pub struct Ctx<'a> {
    pub pal: &'a Palette,
    pub ui: &'a Ui,
    pub surf: Surface,
    pub width: u16,
    pub now: i64,
    pub focus: Option<Key>,
    /// The elements the focused part is inside, so a panel can light its border.
    pub around_focus: HashSet<u64>,
    pub edit: Option<&'a Edit>,
    pub targets: Vec<Target>,
    pub hits: Vec<Hit>,
    pub placements: Vec<Placement>,
    pub cursor: Option<(u16, i32)>,
    heights: HashMap<(u64, u16), u16>,
}

impl<'a> Ctx<'a> {
    pub fn new(pal: &'a Palette, ui: &'a Ui, width: u16, height: u16, top: i32, now: i64) -> Ctx<'a> {
        Ctx {
            pal,
            ui,
            surf: Surface::new(width, height, top),
            width,
            now,
            focus: None,
            around_focus: HashSet::new(),
            edit: None,
            targets: Vec::new(),
            hits: Vec::new(),
            placements: Vec::new(),
            cursor: None,
            heights: HashMap::new(),
        }
    }

    // Styles.

    pub fn fg(&self, c: Color) -> Style {
        if self.pal.mode == Mode::None { Style::new() } else { Style::new().fg(c) }
    }
    pub fn text(&self) -> Style {
        self.fg(self.pal.text)
    }
    pub fn dim(&self) -> Style {
        self.fg(self.pal.text2)
    }
    pub fn faint(&self) -> Style {
        self.fg(self.pal.text3)
    }
    pub fn tone(&self, t: Tone) -> Style {
        self.fg(self.pal.tone(t))
    }
    pub fn bg(&self, c: Color) -> Style {
        if self.pal.mode == Mode::None { Style::new() } else { Style::new().bg(c) }
    }
    /// A selected row or a focused control.
    pub fn selected(&self) -> Style {
        if self.pal.mode == Mode::None {
            Style::new().add_modifier(Modifier::REVERSED)
        } else {
            Style::new().bg(self.pal.selection).add_modifier(Modifier::BOLD)
        }
    }

    pub fn focused(&self, key: Key) -> bool {
        self.focus == Some(key)
    }
    pub fn focus_inside(&self, n: &Node) -> bool {
        self.around_focus.contains(&n.id)
    }

    pub fn target(&mut self, key: Key, kind: Kind, area: Area, t: &str) {
        if !self.targets.iter().any(|x| x.key == key) {
            self.targets.push(Target { key, kind, area, t: t.to_string() });
        }
    }
    pub fn hit(&mut self, area: Area, key: Key, acts: Vec<Act>) {
        self.hits.push(Hit { area, key, acts });
    }

    /// The text of a field being edited, if this is the one.
    pub fn editing(&self, key: Key) -> Option<&'a Edit> {
        self.edit.filter(|e| e.key == Some(key))
    }

    // Measuring and drawing.

    pub fn height(&mut self, n: &Node, w: u16) -> u16 {
        if let Some(h) = self.heights.get(&(n.id, w)) {
            return *h;
        }
        let h = (kit::component(&n.t).height)(n, w, self);
        self.heights.insert((n.id, w), h);
        h
    }

    pub fn draw(&mut self, n: &Node, a: Area) {
        (kit::component(&n.t).draw)(n, a, self);
    }

    /// How wide something is with room to spare: a Row's item, a table's cell.
    pub fn natural(&mut self, c: &Child) -> u16 {
        match c {
            Child::Text(s) => s.lines().map(fmt::width).max().unwrap_or(0) as u16,
            Child::El(n) if is_inline(n) => {
                let mut segs = Vec::new();
                inline(c, self, Style::new(), &mut segs);
                segs.iter().map(|s| fmt::width(&s.text)).sum::<usize>() as u16
            }
            Child::El(n) => (kit::component(&n.t).width)(n, self),
        }
    }

    /// The widest of some children, laid out one per line.
    pub fn natural_all(&mut self, list: &[Child]) -> u16 {
        let mut most = 0;
        for group in groups(list) {
            let w = match group {
                Group::Inline(items) => items.iter().map(|c| self.natural(c)).sum(),
                Group::Block(c) => self.natural(c),
            };
            most = most.max(w);
        }
        most
    }
}

// ---- Inline flow

/// A run of text in one style, part of a line of inline things.
#[derive(Debug, Clone)]
pub struct Seg {
    pub text: String,
    pub style: Style,
    pub key: Option<Key>,
    pub acts: Vec<Act>,
    /// Kept whole, as a badge is, rather than broken at its spaces.
    pub atom: bool,
}

impl Seg {
    pub fn new(text: impl Into<String>, style: Style) -> Seg {
        Seg { text: text.into(), style, key: None, acts: Vec::new(), atom: false }
    }
    pub fn atom(text: impl Into<String>, style: Style) -> Seg {
        Seg { atom: true, ..Seg::new(text, style) }
    }
    pub fn on(mut self, key: Key, acts: Vec<Act>) -> Seg {
        self.key = Some(key);
        self.acts = acts;
        self
    }
}

const INLINE_HTML: [&str; 16] =
    ["span", "b", "strong", "em", "i", "u", "s", "small", "mark", "code", "kbd", "a", "br", "time", "label", "abbr"];

pub fn is_inline(n: &Node) -> bool {
    if INLINE_HTML.contains(&n.t.as_str()) {
        return true;
    }
    match n.t.as_str() {
        "Text" => n.str("as") == Some("span"),
        "Code" => !n.flag("block"),
        t => kit::component(t).inline.is_some(),
    }
}

/// The segments an inline child makes, in `base` unless it has a style of its own.
pub fn inline(c: &Child, ctx: &mut Ctx, base: Style, out: &mut Vec<Seg>) {
    match c {
        Child::Text(s) => out.push(Seg::new(s.clone(), base)),
        Child::El(n) => match n.t.as_str() {
            "Text" => kit::text::span_inline(n, ctx, base, out),
            "Code" => kit::text::code_span(n, ctx, base, out),
            t => match kit::component(t).inline {
                Some(f) => f(n, ctx, base, out),
                None => {
                    let text = crate::tree::text_of(std::slice::from_ref(c));
                    out.push(Seg::new(text, base));
                }
            },
        },
    }
}

pub fn inline_all(list: &[Child], ctx: &mut Ctx, base: Style) -> Vec<Seg> {
    let mut out = Vec::new();
    for c in list {
        inline(c, ctx, base, &mut out);
    }
    out
}

/// A word: segments with no space between them, which break together.
struct Word {
    parts: Vec<Seg>,
    width: usize,
}

/// Lines of segments, wrapped at spaces to `w` columns.
pub fn wrap(segs: &[Seg], w: u16) -> Vec<Vec<Seg>> {
    let w = w.max(1) as usize;
    // Words and the spaces between them; a newline is its own token.
    enum Tok {
        Word(Word),
        Space(Style),
        Newline,
    }
    let mut toks: Vec<Tok> = Vec::new();
    let push_part = |toks: &mut Vec<Tok>, s: Seg| {
        let sw = fmt::width(&s.text);
        if let Some(Tok::Word(word)) = toks.last_mut() {
            word.width += sw;
            word.parts.push(s);
        } else {
            toks.push(Tok::Word(Word { width: sw, parts: vec![s] }));
        }
    };
    for s in segs {
        if s.atom {
            if !s.text.is_empty() {
                push_part(&mut toks, s.clone());
            }
            continue;
        }
        for (li, line) in s.text.split('\n').enumerate() {
            if li > 0 {
                toks.push(Tok::Newline);
            }
            for (wi, piece) in line.split(' ').enumerate() {
                if wi > 0 {
                    toks.push(Tok::Space(s.style));
                }
                if !piece.is_empty() {
                    push_part(&mut toks, Seg { text: piece.to_string(), ..s.clone() });
                }
            }
        }
    }
    let mut lines: Vec<Vec<Seg>> = vec![Vec::new()];
    let mut used = 0usize;
    // The spaces since the last word, kept as many as they were, but not at the start of a line.
    let mut space: Option<(Style, usize)> = None;
    for tok in toks {
        match tok {
            Tok::Newline => {
                lines.push(Vec::new());
                used = 0;
                space = None;
            }
            Tok::Space(st) => {
                if used > 0 {
                    space = Some((st, space.map(|s| s.1).unwrap_or(0) + 1));
                }
            }
            Tok::Word(word) => {
                let gap = if used > 0 { space.map(|s| s.1).unwrap_or(0) } else { 0 };
                if used > 0 && used + gap + word.width > w {
                    lines.push(Vec::new());
                    used = 0;
                } else if let Some((st, count)) = space.filter(|_| used > 0) {
                    lines.last_mut().unwrap().push(Seg::new(" ".repeat(count), st));
                    used += count;
                }
                space = None;
                if word.width <= w.saturating_sub(used) || used > 0 {
                    for p in word.parts {
                        used += fmt::width(&p.text);
                        lines.last_mut().unwrap().push(p);
                    }
                } else {
                    // Longer than a line: broken where it has to be.
                    for p in word.parts {
                        let mut chunk = String::new();
                        for c in p.text.chars() {
                            let cw = fmt::char_width(c);
                            if used + cw > w {
                                if !chunk.is_empty() {
                                    lines
                                        .last_mut()
                                        .unwrap()
                                        .push(Seg { text: std::mem::take(&mut chunk), ..p.clone() });
                                }
                                lines.push(Vec::new());
                                used = 0;
                            }
                            chunk.push(c);
                            used += cw;
                        }
                        if !chunk.is_empty() {
                            lines.last_mut().unwrap().push(Seg { text: chunk, ..p.clone() });
                        }
                    }
                }
            }
        }
    }
    while lines.len() > 1 && lines.last().is_some_and(Vec::is_empty) {
        lines.pop();
    }
    lines
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Align {
    Left,
    Center,
    Right,
}

/// Draws lines of segments, aligned, and says where their focusable parts are.
pub fn draw_lines(lines: &[Vec<Seg>], a: Area, ctx: &mut Ctx, align: Align) {
    for (i, line) in lines.iter().enumerate().take(a.h as usize) {
        let lw: usize = line.iter().map(|s| fmt::width(&s.text)).sum();
        let mut x = match align {
            Align::Left => a.x,
            Align::Center => a.x + (a.w as usize).saturating_sub(lw) as u16 / 2,
            Align::Right => a.x + (a.w as usize).saturating_sub(lw) as u16,
        };
        let y = a.y + i as i32;
        let end = a.x + a.w;
        for s in line {
            if x >= end {
                break;
            }
            let wrote = ctx.surf.put(x, y, &s.text, s.style, end - x);
            if let Some(key) = s.key {
                let area = Area::new(x, y, wrote, 1);
                ctx.target(key, kind_of_inline(&s.acts), area, "Link");
                if !s.acts.is_empty() {
                    ctx.hit(area, key, s.acts.clone());
                }
            }
            x += wrote;
        }
    }
}

fn kind_of_inline(acts: &[Act]) -> Kind {
    match acts.iter().find(|a| matches!(a, Act::Call { .. })) {
        Some(Act::Call { name, .. }) if name == "open" => Kind::Link,
        Some(Act::Call { name, .. }) if name == "press" => Kind::Button,
        Some(Act::Call { name, .. }) if name == "change" => Kind::Check,
        _ => Kind::Click,
    }
}

/// Draws segments on one line, cut to fit: a title in a border, a cell.
pub fn draw_one_line(segs: &[Seg], x: u16, y: i32, max: u16, ctx: &mut Ctx) -> u16 {
    let mut used = 0u16;
    let total: usize = segs.iter().map(|s| fmt::width(&s.text.replace('\n', " "))).sum();
    let cut = total > max as usize;
    for s in segs {
        if used >= max {
            break;
        }
        let text = s.text.replace('\n', " ");
        let room = max - used;
        let piece = if cut && fmt::width(&text) >= room as usize { fmt::fit(&text, room as usize) } else { text };
        let wrote = ctx.surf.put(x + used, y, &piece, s.style, room);
        if let Some(key) = s.key {
            let area = Area::new(x + used, y, wrote, 1);
            ctx.target(key, kind_of_inline(&s.acts), area, "Link");
            if !s.acts.is_empty() {
                ctx.hit(area, key, s.acts.clone());
            }
        }
        used += wrote;
    }
    used
}

pub fn segs_width(segs: &[Seg]) -> u16 {
    segs.iter().map(|s| fmt::width(&s.text.replace('\n', " "))).sum::<usize>() as u16
}

// ---- Block flow

pub enum Group<'a> {
    Inline(Vec<&'a Child>),
    Block(&'a Child),
}

/// Children as a browser lays them out: runs of inline things as paragraphs, the rest one under another.
pub fn groups(list: &[Child]) -> Vec<Group<'_>> {
    let mut out: Vec<Group> = Vec::new();
    for c in list {
        let inline_child = match c {
            Child::Text(s) => {
                if s.trim().is_empty() && !matches!(out.last(), Some(Group::Inline(_))) {
                    continue;
                }
                true
            }
            Child::El(n) => is_inline(n),
        };
        if inline_child {
            if let Some(Group::Inline(items)) = out.last_mut() {
                items.push(c);
            } else {
                out.push(Group::Inline(vec![c]));
            }
        } else {
            out.push(Group::Block(c));
        }
    }
    out
}

/// Whether something draws a box with borders, which sits flush against the next one, as ooze's panels do.
pub fn boxed(c: &Child) -> bool {
    matches!(c, Child::El(n) if matches!(n.t.as_str(), "Panel" | "Approval" | "NeedsYou" | "Problem" | "Stat"))
}

/// Rows between blocks for a gap in pixels.
pub fn gap_rows(gap: f64, a: Option<&Child>, b: &Child) -> u16 {
    if a.is_some_and(boxed) && boxed(b) {
        return 0;
    }
    u16::from(gap >= 10.0)
}

/// Columns between items in a row for a gap in pixels.
pub fn gap_cols(gap: f64, a: &Child, b: &Child) -> u16 {
    if boxed(a) && boxed(b) {
        return 0;
    }
    if gap >= 20.0 { 2 } else { u16::from(gap >= 4.0) }
}

pub fn group_height(g: &Group, w: u16, ctx: &mut Ctx, base: Style) -> u16 {
    match g {
        Group::Inline(items) => {
            let mut segs = Vec::new();
            for c in items {
                inline(c, ctx, base, &mut segs);
            }
            if segs.iter().all(|s| s.text.trim().is_empty()) {
                return 0;
            }
            wrap(&segs, w).len() as u16
        }
        Group::Block(Child::El(n)) => ctx.height(n, w),
        Group::Block(Child::Text(_)) => 1,
    }
}

pub fn draw_group(g: &Group, a: Area, ctx: &mut Ctx, base: Style, align: Align) {
    match g {
        Group::Inline(items) => {
            let mut segs = Vec::new();
            for c in items {
                inline(c, ctx, base, &mut segs);
            }
            let lines = wrap(&segs, a.w);
            draw_lines(&lines, a, ctx, align);
        }
        Group::Block(Child::El(n)) => ctx.draw(n, a),
        Group::Block(Child::Text(_)) => {}
    }
}

/// Children one under another, `gap` pixels apart.
pub fn flow_height(list: &[Child], w: u16, ctx: &mut Ctx, gap: f64) -> u16 {
    flow_height_in(list, w, ctx, gap, Style::new())
}

pub fn flow_height_in(list: &[Child], w: u16, ctx: &mut Ctx, gap: f64, base: Style) -> u16 {
    let gs = groups(list);
    let mut h = 0u16;
    let mut prev: Option<&Child> = None;
    for g in &gs {
        let gh = group_height(g, w, ctx, base);
        if gh == 0 {
            continue;
        }
        let first = first_child(g);
        if let Some(p) = prev {
            h += gap_rows(gap, Some(p), first);
        }
        h += gh;
        prev = Some(last_child(g));
    }
    h
}

pub fn flow_draw(list: &[Child], a: Area, ctx: &mut Ctx, gap: f64) {
    flow_draw_in(list, a, ctx, gap, Style::new(), Align::Left)
}

pub fn flow_draw_in(list: &[Child], a: Area, ctx: &mut Ctx, gap: f64, base: Style, align: Align) {
    let gs = groups(list);
    let mut y = a.y;
    let mut prev: Option<&Child> = None;
    for g in &gs {
        let gh = group_height(g, a.w, ctx, base);
        if gh == 0 {
            continue;
        }
        let first = first_child(g);
        if let Some(p) = prev {
            y += gap_rows(gap, Some(p), first) as i32;
        }
        draw_group(g, Area::new(a.x, y, a.w, gh), ctx, base, align);
        y += gh as i32;
        prev = Some(last_child(g));
    }
}

fn first_child<'a>(g: &Group<'a>) -> &'a Child {
    match g {
        Group::Inline(items) => items[0],
        Group::Block(c) => c,
    }
}

fn last_child<'a>(g: &Group<'a>) -> &'a Child {
    match g {
        Group::Inline(items) => items[items.len() - 1],
        Group::Block(c) => c,
    }
}

/// How tall one child is on its own, inline or not.
pub fn child_height(c: &Child, w: u16, ctx: &mut Ctx) -> u16 {
    flow_height(std::slice::from_ref(c), w, ctx, 0.0)
}

/// Draws one child into an area; a block fills it, so boxes in a row can share a height.
pub fn child_draw(c: &Child, a: Area, ctx: &mut Ctx) {
    match c {
        Child::El(n) if !is_inline(n) => ctx.draw(n, a),
        _ => flow_draw(std::slice::from_ref(c), a, ctx, 0.0),
    }
}

// ---- Borders

pub const ROUND: [char; 6] = ['╭', '╮', '╰', '╯', '─', '│'];

/// A rounded box, with segments set into its top border on the left and the right.
pub fn frame(a: Area, ctx: &mut Ctx, border: Style, title: &[Seg], info: &[Seg]) {
    if a.w < 2 || a.h < 1 {
        return;
    }
    let right = a.x + a.w - 1;
    let bottom = a.bottom() - 1;
    ctx.surf.put_char(a.x, a.y, ROUND[0], border);
    ctx.surf.put_char(right, a.y, ROUND[1], border);
    for x in a.x + 1..right {
        ctx.surf.put_char(x, a.y, ROUND[4], border);
        if a.h > 1 {
            ctx.surf.put_char(x, bottom, ROUND[4], border);
        }
    }
    if a.h > 1 {
        ctx.surf.put_char(a.x, bottom, ROUND[2], border);
        ctx.surf.put_char(right, bottom, ROUND[3], border);
    }
    for y in a.y + 1..bottom {
        ctx.surf.put_char(a.x, y, ROUND[5], border);
        ctx.surf.put_char(right, y, ROUND[5], border);
    }
    let room = a.w.saturating_sub(4);
    let iw = segs_width(info).min(room / 2);
    if !info.is_empty() && iw > 0 {
        let x = right - 1 - iw - 1;
        ctx.surf.put(x, a.y, " ", border, 1);
        draw_one_line(info, x + 1, a.y, iw, ctx);
        ctx.surf.put(x + 1 + iw, a.y, " ", border, 1);
    }
    if !title.is_empty() {
        let max = room.saturating_sub(if iw > 0 { iw + 3 } else { 0 });
        if max > 0 {
            ctx.surf.put(a.x + 1, a.y, " ", border, 1);
            let wrote = draw_one_line(title, a.x + 2, a.y, max, ctx);
            ctx.surf.put(a.x + 2 + wrote, a.y, " ", border, 1);
        }
    }
}

/// A line across, with a label in it: `── label ─────`.
pub fn rule(a: Area, ctx: &mut Ctx, label: &[Seg], style: Style) {
    let mut x = a.x;
    let end = a.x + a.w;
    if !label.is_empty() {
        x += ctx.surf.put(x, a.y, "── ", style, a.w);
        x += draw_one_line(label, x, a.y, end.saturating_sub(x + 1), ctx);
        x += ctx.surf.put(x, a.y, " ", style, 1);
    }
    while x < end {
        ctx.surf.put_char(x, a.y, '─', style);
        x += 1;
    }
}

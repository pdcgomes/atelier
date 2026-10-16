//! A renderer for every component in the kit, and for the HTML the kit and
//! canvases use. Each says which of its component's props it draws, and
//! which don't apply in a terminal and why: tests/parity.rs checks the lists
//! against packages/kit/kit.json, so the kit can't gain a component or a
//! prop without this drawing it.

use std::collections::HashMap;
use std::sync::OnceLock;

use ratatui::style::Style;

use crate::render::{Act, Area, Ctx, Seg, Target, Ui};
use crate::tree::{Node, text_of};

pub mod charts;
pub mod data;
pub mod forms;
pub mod html;
pub mod layout;
pub mod media;
pub mod text;

pub type Height = fn(&Node, u16, &mut Ctx) -> u16;
pub type Draw = fn(&Node, Area, &mut Ctx);
pub type Width = fn(&Node, &mut Ctx) -> u16;
pub type Inline = fn(&Node, &mut Ctx, Style, &mut Vec<Seg>);
/// What a key does on a focused part of the component, or None to leave it to the viewer.
pub type Keys = fn(&Node, &Target, Press, &Ui) -> Option<Vec<Act>>;

/// The keys a focused part can take.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Press {
    Enter,
    Space,
    Left,
    Right,
    Up,
    Down,
    Home,
    End,
    Char(char),
}

pub struct Component {
    pub name: &'static str,
    /// The component's props this draws or acts on.
    pub draws: &'static [&'static str],
    /// The props that don't apply in a terminal, and why.
    pub not_here: &'static [(&'static str, &'static str)],
    pub height: Height,
    pub draw: Draw,
    pub width: Width,
    /// Set for components that flow with text, as badges and links do.
    pub inline: Option<Inline>,
    pub keys: Option<Keys>,
}

/// Props a canvas styles for the browser, which have no meaning without its stylesheet.
pub const CSS: [(&str, &str); 2] = [
    ("style", "the browser's CSS: a terminal lays things out in cells, from the gap and the kit's own rules"),
    ("className", "names a class in the browser's stylesheet, which a terminal has no use for"),
];

/// Every component the kit has, as tests/parity.rs checks.
pub fn all() -> &'static [&'static Component] {
    static ALL: OnceLock<Vec<&'static Component>> = OnceLock::new();
    ALL.get_or_init(|| {
        let mut v: Vec<&'static Component> = Vec::new();
        v.extend(layout::ALL);
        v.extend(text::ALL);
        v.extend(media::ALL);
        v.extend(data::ALL);
        v.extend(charts::ALL);
        v.extend(forms::ALL);
        v
    })
}

/// The renderer for an element: a component's, an HTML element's, or the one for what's unknown.
pub fn component(t: &str) -> &'static Component {
    static BY_NAME: OnceLock<HashMap<&'static str, &'static Component>> = OnceLock::new();
    let map = BY_NAME.get_or_init(|| {
        let mut m: HashMap<&'static str, &'static Component> = all().iter().map(|c| (c.name, *c)).collect();
        m.insert(layout::PROBLEM.name, &layout::PROBLEM);
        m
    });
    if let Some(c) = map.get(t) {
        return c;
    }
    html::component(t).unwrap_or(&UNKNOWN)
}

fn unknown_height(n: &Node, w: u16, _: &mut Ctx) -> u16 {
    let text = text_of(&n.c);
    2 + crate::fmt::wrap(&text, w.saturating_sub(4) as usize).len().max(1) as u16
}

fn unknown_draw(n: &Node, a: Area, ctx: &mut Ctx) {
    let border = ctx.faint();
    let title = vec![Seg::new(format!("{} isn't drawn by this atelier-tui yet: update it", n.t), ctx.faint())];
    crate::render::frame(a, ctx, border, &title, &[]);
    let text = text_of(&n.c);
    let inner = a.inset(2, 1, 2, 1);
    for (i, line) in crate::fmt::wrap(&text, inner.w as usize).iter().enumerate().take(inner.h as usize) {
        ctx.surf.put(inner.x, inner.y + i as i32, line, ctx.dim(), inner.w);
    }
}

fn unknown_width(n: &Node, _: &mut Ctx) -> u16 {
    (crate::fmt::width(&text_of(&n.c)) + 4).max(n.t.len() + 40) as u16
}

/// What the viewer draws for an element it doesn't know: a newer kit than this.
pub static UNKNOWN: Component = Component {
    name: "Unknown",
    draws: &[],
    not_here: &[],
    height: unknown_height,
    draw: unknown_draw,
    width: unknown_width,
    inline: None,
    keys: None,
};

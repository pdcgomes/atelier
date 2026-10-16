//! A canvas drawn into the rows on screen: its cells, where its focusable
//! parts are, what clicks do, and the images to place over it.

use std::collections::{HashMap, HashSet};

use ratatui::buffer::Buffer;

use crate::render::{Area, Ctx, Edit, Hit, Key, Placement, Target, Ui, flow_draw, flow_height};
use crate::theme::Palette;
use crate::tree::{Child, walk};

/// The gap between a canvas's top-level parts, as the browser's page has.
const PAGE_GAP: f64 = 16.0;

pub struct Drawn {
    pub buf: Buffer,
    pub targets: Vec<Target>,
    pub hits: Vec<Hit>,
    pub placements: Vec<Placement>,
    /// How tall the whole canvas is at this width.
    pub height: u16,
    pub cursor: Option<(u16, i32)>,
}

pub struct Frame<'a> {
    pub tree: &'a [Child],
    pub pal: &'a Palette,
    pub ui: &'a Ui,
    pub width: u16,
    pub rows: u16,
    /// The canvas row at the top of the screen.
    pub top: i32,
    pub now: i64,
    pub focus: Option<Key>,
    pub edit: Option<&'a Edit>,
}

/// The ids of the elements a focused part is inside.
pub fn around(tree: &[Child], node: u64) -> HashSet<u64> {
    let mut parents = HashMap::new();
    walk(tree, None, &mut |n, p| {
        if let Some(p) = p {
            parents.insert(n.id, p);
        }
    });
    let mut out = HashSet::new();
    let mut at = node;
    while let Some(&p) = parents.get(&at) {
        out.insert(p);
        at = p;
    }
    out
}

pub fn height(f: &Frame) -> u16 {
    let mut ctx = Ctx::new(f.pal, f.ui, f.width, 1, 0, f.now);
    flow_height(f.tree, f.width, &mut ctx, PAGE_GAP)
}

pub fn draw(f: Frame) -> Drawn {
    let mut ctx = Ctx::new(f.pal, f.ui, f.width, f.rows, f.top, f.now);
    ctx.focus = f.focus;
    if let Some(k) = f.focus {
        ctx.around_focus = around(f.tree, k.node);
    }
    ctx.edit = f.edit;
    let page = ctx.bg(f.pal.panel).patch(ctx.text());
    ctx.surf.clear(Area::new(0, f.top, f.width, f.rows), page);
    let h = flow_height(f.tree, f.width, &mut ctx, PAGE_GAP);
    flow_draw(f.tree, Area::new(0, 0, f.width, h), &mut ctx, PAGE_GAP);
    Drawn {
        buf: ctx.surf.buf,
        targets: ctx.targets,
        hits: ctx.hits,
        placements: ctx.placements,
        height: h,
        cursor: ctx.cursor,
    }
}

/// A buffer's text, a line for each row, without the spaces at the ends of lines.
pub fn text(buf: &Buffer) -> String {
    let mut out = String::new();
    for y in 0..buf.area.height {
        let mut line = String::new();
        let mut covered = 0;
        for x in 0..buf.area.width {
            // The cell after a wide character is part of it, not a space of its own.
            if covered > 0 {
                covered -= 1;
                continue;
            }
            let symbol = buf[(x, y)].symbol();
            line.push_str(symbol);
            covered = crate::fmt::width(symbol).saturating_sub(1);
        }
        out.push_str(line.trim_end());
        out.push('\n');
    }
    out
}

/// The whole of a canvas, as text, at a width: what the conformance frames are.
pub fn snapshot(tree: &[Child], pal: &Palette, ui: &Ui, width: u16, now: i64) -> String {
    let f = Frame { tree, pal, ui, width, rows: 1, top: 0, now, focus: None, edit: None };
    let h = height(&f).max(1);
    let drawn = draw(Frame { rows: h, ..f });
    text(&drawn.buf)
}

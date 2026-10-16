//! Image, Gallery and Video. An image is drawn by the terminal's graphics
//! protocol where it has one (Kitty's, iTerm2's or Sixel), in half blocks
//! where it hasn't, and as a card with its alt text while it loads or when
//! it can't be shown. Enter shows it full size; a video opens in its own app.

use std::sync::Arc;

use ratatui::style::{Modifier, Style};
use serde_json::Value;

use super::{Component, Press};
use crate::fmt;
use crate::render::{
    Act, Align, Area, Ctx, Key, Kind, Placement, Target, Ui, draw_lines, frame, inline_all, rows, wrap,
};
use crate::tree::Node;

pub static ALL: &[&Component] = &[&IMAGE, &GALLERY, &VIDEO];

/// An image's pixels, scaled down to what a terminal can show, and its file as the daemon sent it.
#[derive(Debug)]
pub struct Pixels {
    /// Small, for half blocks and for the shape it has.
    pub w: u32,
    pub h: u32,
    pub rgba: Vec<u8>,
    /// Larger, as a PNG, for Kitty's and iTerm2's protocols.
    pub png: Vec<u8>,
    /// Larger, as pixels, for Sixel.
    pub full: image::RgbaImage,
}

#[derive(Debug, Clone)]
pub enum Loaded {
    Loading,
    Ready(Arc<Pixels>),
    Missing(String),
}

fn name(path: &str) -> String {
    path.rsplit('/').next().unwrap_or(path).to_string()
}

/// The cells an image of `w`×`h` pixels takes in `a`, keeping its shape: a cell is about twice as tall as it's wide.
pub fn fit(a: Area, w: u32, h: u32, cover: bool) -> Area {
    if w == 0 || h == 0 || a.w == 0 || a.h == 0 {
        return a;
    }
    let ar = w as f64 / h as f64 * 2.0;
    let (mut cw, mut ch) = (a.w as f64, a.w as f64 / ar);
    if (ch > a.h as f64) != cover {
        ch = a.h as f64;
        cw = ch * ar;
    }
    let (cw, ch) = ((cw.round() as u16).clamp(1, a.w), (ch.round() as u16).clamp(1, a.h));
    Area::new(a.x + (a.w - cw) / 2, a.y + ((a.h - ch) / 2) as i32, cw, ch)
}

/// Draws pixels in half blocks: two to a cell, averaged from what falls in each.
pub fn half_blocks(px: &Pixels, a: Area, ctx: &mut Ctx) {
    let (w, h) = (px.w as usize, px.h as usize);
    let at = |x0: usize, x1: usize, y0: usize, y1: usize| -> Option<(u8, u8, u8)> {
        let (mut r, mut g, mut b, mut n) = (0u32, 0u32, 0u32, 0u32);
        for y in y0..y1.max(y0 + 1).min(h) {
            for x in x0..x1.max(x0 + 1).min(w) {
                let i = (y * w + x) * 4;
                if px.rgba[i + 3] >= 128 {
                    r += px.rgba[i] as u32;
                    g += px.rgba[i + 1] as u32;
                    b += px.rgba[i + 2] as u32;
                    n += 1;
                }
            }
        }
        (n > 0).then(|| ((r / n) as u8, (g / n) as u8, (b / n) as u8))
    };
    let rows2 = a.h as usize * 2;
    for cy in 0..a.h as usize {
        for cx in 0..a.w as usize {
            let (x0, x1) = (cx * w / a.w as usize, (cx + 1) * w / a.w as usize);
            let top = at(x0, x1, (cy * 2) * h / rows2, (cy * 2 + 1) * h / rows2);
            let bottom = at(x0, x1, (cy * 2 + 1) * h / rows2, (cy * 2 + 2) * h / rows2);
            let (ch, fg, bg) = crate::art::half_block(top, bottom);
            let mut style = Style::new();
            if let Some(c) = fg {
                style = style.fg(crate::theme::color(c, ctx.pal.mode));
            }
            style = style.bg(bg.map(|c| crate::theme::color(c, ctx.pal.mode)).unwrap_or(ctx.pal.panel));
            ctx.surf.put_char(a.x + cx as u16, a.y + cy as i32, ch, style);
        }
    }
}

/// Draws an image, a card for it, or what's wrong with it, in `a`.
pub fn picture(path: &str, alt: &str, a: Area, fit_mode: &str, ctx: &mut Ctx) {
    match ctx.ui.images.get(path).cloned() {
        Some(Loaded::Ready(px)) => {
            let spot = fit(a, px.w, px.h, fit_mode == "cover");
            if ctx.ui.graphics && ctx.surf.fully(spot) {
                ctx.placements.push(Placement {
                    path: path.to_string(),
                    alt: alt.to_string(),
                    area: spot,
                    fit: fit_mode.to_string(),
                });
                let bg = ctx.bg(ctx.pal.panel);
                ctx.surf.clear(spot, bg);
            } else {
                half_blocks(&px, spot, ctx);
            }
        }
        Some(Loaded::Missing(why)) => card(a, &format!("Can't show {}", name(path)), &why, ctx),
        _ => card(a, &format!("▣ {}", name(path)), alt, ctx),
    }
}

fn card(a: Area, title: &str, detail: &str, ctx: &mut Ctx) {
    let mid = a.y + (a.h as i32 - 2).max(0) / 2;
    let tw = fmt::width(title) as u16;
    ctx.surf.put(a.x + a.w.saturating_sub(tw) / 2, mid, title, ctx.dim(), a.w);
    if !detail.is_empty() && a.h > 1 {
        let d = fmt::fit(detail, a.w.saturating_sub(2) as usize);
        let dw = fmt::width(&d) as u16;
        ctx.surf.put(a.x + a.w.saturating_sub(dw) / 2, mid + 1, &d, ctx.faint(), a.w);
    }
}

fn caption_lines(n: &Node, w: u16, ctx: &mut Ctx) -> Vec<Vec<crate::render::Seg>> {
    if !n.has_slot("caption") {
        return Vec::new();
    }
    let segs = inline_all(n.slot("caption"), ctx, ctx.faint());
    wrap(&segs, w)
}

fn box_rows(n: &Node, default_px: f64, lo: u16, hi: u16) -> u16 {
    rows(n.num("height").unwrap_or(default_px)).clamp(lo, hi) + 2
}

// ---- Image

fn image_height(n: &Node, w: u16, ctx: &mut Ctx) -> u16 {
    box_rows(n, 200.0, 4, 18) + caption_lines(n, w, ctx).len() as u16
}

fn image_draw(n: &Node, a: Area, ctx: &mut Ctx) {
    let key = Key::of(n);
    let path = n.str("path").unwrap_or("").to_string();
    let alt = n.str("alt").unwrap_or("").to_string();
    let bh = box_rows(n, 200.0, 4, 18);
    let frame_area = Area::new(a.x, a.y, a.w, bh);
    let border = if ctx.focused(key) { ctx.fg(ctx.pal.focus) } else { ctx.fg(ctx.pal.border) };
    frame(frame_area, ctx, border, &[], &[]);
    picture(&path, &alt, frame_area.inset(1, 1, 1, 1), n.str("fit").unwrap_or("contain"), ctx);
    ctx.target(key, Kind::Media, frame_area, "Image");
    ctx.hit(frame_area, key, vec![Act::Focus(key), Act::Open { path, alt }]);
    let cap = caption_lines(n, a.w, ctx);
    draw_lines(&cap, Area::new(a.x, a.y + bh as i32, a.w, cap.len() as u16), ctx, Align::Left);
}

fn media_width(_: &Node, _: &mut Ctx) -> u16 {
    40
}

fn open_keys(n: &Node, _: &Target, press: Press, _: &Ui) -> Option<Vec<Act>> {
    matches!(press, Press::Enter | Press::Space).then(|| {
        vec![Act::Open { path: n.str("path").unwrap_or("").to_string(), alt: n.str("alt").unwrap_or("").to_string() }]
    })
}

pub static IMAGE: Component = Component {
    name: "Image",
    draws: &["path", "alt", "caption", "height", "fit"],
    not_here: &[],
    height: image_height,
    draw: image_draw,
    width: media_width,
    inline: None,
    keys: Some(open_keys),
};

// ---- Gallery

struct Tiles {
    per: usize,
    tw: u16,
    th: u16,
}

fn tiles(n: &Node, w: u16) -> Tiles {
    let height = n.num("height").unwrap_or(140.0);
    let th = rows(height).clamp(3, 12) + 2;
    let per = match n.num("columns") {
        Some(c) => (c as usize).max(1),
        None => (w / crate::render::cols(height * 1.1 * 2.0).max(16)).max(1) as usize,
    };
    Tiles { per, tw: w / per as u16, th }
}

fn images(n: &Node) -> Vec<(String, String, Option<String>)> {
    n.list("images")
        .iter()
        .map(|i| {
            (
                i.get("path").and_then(Value::as_str).unwrap_or("").to_string(),
                i.get("alt").and_then(Value::as_str).unwrap_or("").to_string(),
                i.get("caption").and_then(Value::as_str).map(String::from),
            )
        })
        .collect()
}

fn gallery_height(n: &Node, w: u16, _: &mut Ctx) -> u16 {
    let t = tiles(n, w);
    let count = images(n).len();
    let captions = images(n).iter().any(|i| i.2.is_some());
    (count.div_ceil(t.per) as u16) * (t.th + u16::from(captions))
}

fn gallery_draw(n: &Node, a: Area, ctx: &mut Ctx) {
    let t = tiles(n, a.w);
    let list = images(n);
    let captions = list.iter().any(|i| i.2.is_some());
    for (i, (path, alt, caption)) in list.iter().enumerate() {
        let key = Key { node: n.id, part: i as u32 };
        let x = a.x + (i % t.per) as u16 * t.tw;
        let y = a.y + (i / t.per) as i32 * (t.th + u16::from(captions)) as i32;
        let tile = Area::new(x, y, t.tw.saturating_sub(1).max(4), t.th);
        let border = if ctx.focused(key) { ctx.fg(ctx.pal.focus) } else { ctx.fg(ctx.pal.border) };
        frame(tile, ctx, border, &[], &[]);
        picture(path, alt, tile.inset(1, 1, 1, 1), "cover", ctx);
        if let Some(c) = caption {
            let style = if ctx.focused(key) { ctx.text().add_modifier(Modifier::BOLD) } else { ctx.faint() };
            ctx.surf.put(x, y + t.th as i32, &fmt::fit(c, tile.w as usize), style, tile.w);
        }
        ctx.target(key, Kind::Tile, tile, "Gallery");
        ctx.hit(
            tile,
            key,
            vec![Act::Focus(key), Act::Open { path: path.clone(), alt: caption.clone().unwrap_or(alt.clone()) }],
        );
    }
}

fn gallery_keys(n: &Node, t: &Target, press: Press, _: &Ui) -> Option<Vec<Act>> {
    let list = images(n);
    let (path, alt, caption) = list.get(t.key.part as usize)?;
    matches!(press, Press::Enter | Press::Space)
        .then(|| vec![Act::Open { path: path.clone(), alt: caption.clone().unwrap_or(alt.clone()) }])
}

pub static GALLERY: Component = Component {
    name: "Gallery",
    draws: &["images", "columns", "height"],
    not_here: &[],
    height: gallery_height,
    draw: gallery_draw,
    width: media_width,
    inline: None,
    keys: Some(gallery_keys),
};

// ---- Video

fn video_height(n: &Node, w: u16, ctx: &mut Ctx) -> u16 {
    box_rows(n, 160.0, 3, 10) + caption_lines(n, w, ctx).len() as u16
}

fn video_draw(n: &Node, a: Area, ctx: &mut Ctx) {
    let key = Key::of(n);
    let path = n.str("path").unwrap_or("").to_string();
    let bh = box_rows(n, 160.0, 3, 10);
    let frame_area = Area::new(a.x, a.y, a.w, bh);
    let border = if ctx.focused(key) { ctx.fg(ctx.pal.focus) } else { ctx.fg(ctx.pal.border) };
    frame(frame_area, ctx, border, &[], &[]);
    let inner = frame_area.inset(1, 1, 1, 1);
    let poster = format!("{path}#poster");
    if matches!(ctx.ui.images.get(&poster), Some(Loaded::Ready(_))) {
        picture(&poster, "", inner, "contain", ctx);
    } else {
        let missing = matches!(ctx.ui.images.get(&path), Some(Loaded::Missing(_)));
        card(
            inner,
            &format!("▶ {}", name(&path)),
            if missing { "it isn't there" } else { "⏎ plays it in its own app" },
            ctx,
        );
    }
    ctx.target(key, Kind::Media, frame_area, "Video");
    ctx.hit(frame_area, key, vec![Act::Focus(key), Act::Open { path: path.clone(), alt: String::new() }]);
    let cap = caption_lines(n, a.w, ctx);
    draw_lines(&cap, Area::new(a.x, a.y + bh as i32, a.w, cap.len() as u16), ctx, Align::Left);
}

pub static VIDEO: Component = Component {
    name: "Video",
    draws: &["path", "caption", "height"],
    not_here: &[
        ("autoPlay", "a terminal can't play video: it opens in its own app, which plays it"),
        ("loop", "a terminal can't play video: it opens in its own app, which plays it"),
        ("muted", "a terminal can't play video: it opens in its own app, which plays it"),
    ],
    height: video_height,
    draw: video_draw,
    width: media_width,
    inline: None,
    keys: Some(open_keys),
};

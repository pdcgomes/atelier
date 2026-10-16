//! BarChart, LineChart, Sparkline, DonutChart, ScatterChart, Heatmap, Gantt
//! and FlowDiagram, in block characters, eighths of a cell and braille. The
//! Histogram is a BarChart by the time it gets here (the kit counts it into
//! ranges), and every chart's title heads it, as in the browser.

use ratatui::style::{Color, Modifier, Style};
use serde_json::Value;

use super::Component;
use crate::art::{self, Braille};
use crate::fmt;
use crate::render::{Align, Area, Ctx, Seg, draw_lines, draw_one_line, frame, inline_all, rows, segs_width, wrap};
use crate::theme::Mode;
use crate::tree::{Node, Tone};

pub static ALL: &[&Component] =
    &[&BARCHART, &LINECHART, &SPARKLINE, &DONUTCHART, &SCATTERCHART, &HEATMAP, &GANTT, &FLOWDIAGRAM];

// ---- The arithmetic, as packages/kit/src/chartmath.ts does it

pub fn ticks(min: f64, max: f64, count: usize) -> Vec<f64> {
    if min == max {
        return vec![min];
    }
    let raw = (max - min) / count as f64;
    let mag = 10f64.powf(raw.log10().floor());
    let step = [1.0, 2.0, 2.5, 5.0, 10.0].iter().map(|m| m * mag).find(|s| *s >= raw).unwrap_or(raw);
    let mut out = Vec::new();
    let mut v = (min / step).ceil() * step;
    while v <= max + step * 1e-9 {
        out.push((v * 1e10).round() / 1e10);
        v += step;
    }
    out
}

fn extent(values: &[f64], zero: bool) -> (f64, f64) {
    let finite: Vec<f64> = values.iter().copied().filter(|v| v.is_finite()).collect();
    let mut lo = finite.iter().copied().fold(if zero { 0.0 } else { f64::MAX }, f64::min);
    let mut hi = finite.iter().copied().fold(if zero { 0.0 } else { f64::MIN }, f64::max);
    if finite.is_empty() {
        (lo, hi) = (0.0, 1.0);
    }
    if lo == hi {
        hi = lo + 1.0;
    }
    let t = ticks(lo, hi, 5);
    (lo.min(t[0]), hi.max(*t.last().unwrap()))
}

fn unit_of(v: f64, unit: &str) -> String {
    format!("{}{unit}", fmt::number(v))
}

struct Series {
    name: String,
    values: Vec<f64>,
    tone: Option<Tone>,
}

fn series(n: &Node) -> Vec<Series> {
    n.list("series")
        .iter()
        .map(|s| Series {
            name: s.get("name").and_then(Value::as_str).unwrap_or("").to_string(),
            values: s
                .get("values")
                .and_then(Value::as_array)
                .map(|v| v.iter().map(|x| x.as_f64().unwrap_or(f64::NAN)).collect())
                .unwrap_or_default(),
            tone: s.get("tone").and_then(Value::as_str).and_then(Tone::parse),
        })
        .collect()
}

fn strings(n: &Node, key: &str) -> Vec<String> {
    n.list(key)
        .iter()
        .map(|v| v.as_str().map(String::from).unwrap_or_else(|| fmt::number(v.as_f64().unwrap_or(0.0))))
        .collect()
}

/// How many rows a chart's plot has, from its height in pixels.
fn plot_rows(n: &Node, default_px: f64) -> u16 {
    rows(n.num("height").unwrap_or(default_px)).saturating_sub(3).clamp(4, 16)
}

// ---- Heading and legend, caption

fn legend(list: &[(String, Color)], ctx: &Ctx) -> Vec<Seg> {
    let mut out = Vec::new();
    for (i, (name, c)) in list.iter().enumerate() {
        if i > 0 {
            out.push(Seg::new("  ", ctx.faint()));
        }
        out.push(Seg::atom(format!("■ {name}"), ctx.fg(*c)));
    }
    out
}

fn head(n: &Node, w: u16, ctx: &mut Ctx, keyed: &[(String, Color)]) -> Vec<Vec<Seg>> {
    let mut title = vec![Seg::new(n.str("title").unwrap_or("").to_string(), ctx.text().add_modifier(Modifier::BOLD))];
    let leg = if keyed.len() > 1 { legend(keyed, ctx) } else { Vec::new() };
    if !leg.is_empty() && segs_width(&title) + 3 + segs_width(&leg) <= w {
        title.push(Seg::new("   ", ctx.faint()));
        title.extend(leg);
        return wrap(&title, w);
    }
    let mut lines = wrap(&title, w);
    if !leg.is_empty() {
        lines.extend(wrap(&leg, w));
    }
    lines
}

fn caption(n: &Node, w: u16, ctx: &mut Ctx) -> Vec<Vec<Seg>> {
    if !n.has_slot("caption") {
        return Vec::new();
    }
    let segs = inline_all(n.slot("caption"), ctx, ctx.faint());
    wrap(&segs, w)
}

/// Draws a chart's heading at the top of `a` and its caption under `body` rows; returns where the body goes.
fn framed(n: &Node, a: Area, ctx: &mut Ctx, keyed: &[(String, Color)], body: u16) -> Area {
    let h = head(n, a.w, ctx, keyed);
    draw_lines(&h, Area::new(a.x, a.y, a.w, h.len() as u16), ctx, Align::Left);
    let top = a.y + h.len() as i32;
    let cap = caption(n, a.w, ctx);
    draw_lines(&cap, Area::new(a.x, top + body as i32, a.w, cap.len() as u16), ctx, Align::Left);
    Area::new(a.x, top, a.w, body)
}

fn framed_height(n: &Node, w: u16, ctx: &mut Ctx, keyed: &[(String, Color)], body: u16) -> u16 {
    head(n, w, ctx, keyed).len() as u16 + body + caption(n, w, ctx).len() as u16
}

fn keyed(list: &[Series], ctx: &Ctx) -> Vec<(String, Color)> {
    list.iter().enumerate().map(|(i, s)| (s.name.clone(), ctx.pal.series(i, s.tone))).collect()
}

fn chart_width(_: &Node, _: &mut Ctx) -> u16 {
    48
}

// ---- BarChart

fn bar_body(n: &Node, w: u16, list: &[Series]) -> u16 {
    let cats = n.list("categories").len() as u16;
    if n.flag("horizontal") {
        let per = if n.flag("stacked") || list.len() == 1 { 1 } else { list.len() as u16 };
        let _ = w;
        cats * per
    } else {
        plot_rows(n, 220.0) + 2
    }
}

fn bar_height(n: &Node, w: u16, ctx: &mut Ctx) -> u16 {
    let list = series(n);
    let k = keyed(&list, ctx);
    framed_height(n, w, ctx, &k, bar_body(n, w, &list))
}

fn bar_draw(n: &Node, a: Area, ctx: &mut Ctx) {
    let list = series(n);
    let k = keyed(&list, ctx);
    let body = framed(n, a, ctx, &k, bar_body(n, a.w, &list));
    let cats = strings(n, "categories");
    let unit = n.str("unit").unwrap_or("");
    let stacked = n.flag("stacked");
    let totals: Vec<f64> = (0..cats.len())
        .map(|c| {
            if stacked {
                list.iter().map(|s| s.values.get(c).copied().unwrap_or(0.0).max(0.0)).sum()
            } else {
                list.iter().map(|s| s.values.get(c).copied().unwrap_or(0.0)).fold(0.0, f64::max)
            }
        })
        .collect();
    let (lo, hi) = extent(&totals, true);
    let span = (hi - lo).max(1e-9);
    if n.flag("horizontal") {
        let lw = cats.iter().map(|c| fmt::width(c)).max().unwrap_or(0).min(body.w as usize / 3) as u16;
        let vw = totals
            .iter()
            .chain(list.iter().flat_map(|s| s.values.iter()))
            .map(|v| fmt::width(&unit_of(*v, unit)))
            .max()
            .unwrap_or(1) as u16;
        let bw = body.w.saturating_sub(lw + vw + 3);
        let mut y = body.y;
        for (c, cat) in cats.iter().enumerate() {
            ctx.surf.put(body.x, y, &fmt::pad(cat, lw as usize), ctx.dim(), lw);
            if stacked || list.len() == 1 {
                let mut acc = 0.0;
                let mut x = 0u16;
                for (i, s) in list.iter().enumerate() {
                    acc += s.values.get(c).copied().unwrap_or(0.0).max(0.0);
                    let upto = (((acc - lo) / span) * bw as f64).round() as u16;
                    let style = ctx.fg(ctx.pal.series(i, s.tone));
                    while x < upto.min(bw) {
                        ctx.surf.put_char(body.x + lw + 1 + x, y, '█', style);
                        x += 1;
                    }
                }
                let value = if stacked { acc } else { list[0].values.get(c).copied().unwrap_or(0.0) };
                ctx.surf.put(body.x + lw + 2 + x, y, &unit_of(value, unit), ctx.faint(), vw);
                y += 1;
            } else {
                for (i, s) in list.iter().enumerate() {
                    let v = s.values.get(c).copied().unwrap_or(0.0).max(0.0);
                    let text = art::bar_text((v - lo) / span, bw as usize);
                    let wrote = ctx.surf.put(body.x + lw + 1, y, &text, ctx.fg(ctx.pal.series(i, s.tone)), bw);
                    ctx.surf.put(body.x + lw + 2 + wrote, y, &unit_of(v, unit), ctx.faint(), vw);
                    y += 1;
                }
            }
        }
        return;
    }
    let ph = body.h.saturating_sub(2);
    let whole = list.iter().all(|s| s.values.iter().all(|v| v.fract() == 0.0));
    let marks: Vec<f64> = {
        let all = ticks(lo, hi, 4);
        let kept: Vec<f64> =
            if whole { all.iter().copied().filter(|t| t.fract() == 0.0).collect() } else { all.clone() };
        if kept.len() >= 2 { kept } else { all }
    };
    let lw = marks.iter().map(|t| fmt::width(&unit_of(*t, unit))).max().unwrap_or(1) as u16;
    let px = body.x + lw + 1;
    let pw = body.w.saturating_sub(lw + 1);
    let row_of = |v: f64| ph as i32 - 1 - (((v - lo) / span) * (ph - 1) as f64).round() as i32;
    let grid = ctx.fg(ctx.pal.border);
    for t in &marks {
        let r = row_of(*t);
        let label = fmt::rpad(&unit_of(*t, unit), lw as usize);
        ctx.surf.put(body.x, body.y + r, &label, ctx.faint(), lw);
        for x in 0..pw {
            ctx.surf.put_char(px + x, body.y + r, '┈', grid);
        }
    }
    let band = pw as f64 / cats.len().max(1) as f64;
    for (c, _) in cats.iter().enumerate() {
        let x0 = px + (c as f64 * band).floor() as u16;
        let inner = ((band.floor() as u16).saturating_sub(1)).max(1);
        if stacked {
            let bounds: Vec<(usize, usize)> = {
                let mut acc = 0.0;
                list.iter()
                    .enumerate()
                    .map(|(i, s)| {
                        acc += s.values.get(c).copied().unwrap_or(0.0).max(0.0);
                        (i, (((acc - lo) / span) * (ph as f64) * 8.0).round() as usize)
                    })
                    .collect()
            };
            let top = bounds.last().map(|b| b.1).unwrap_or(0);
            for r in 0..ph as usize {
                let covered = top.saturating_sub(r * 8).min(8);
                if covered == 0 {
                    continue;
                }
                let mid = r * 8 + covered / 2;
                let owner = bounds.iter().find(|(_, b)| *b > mid).map(|(i, _)| *i).unwrap_or(0);
                let ch = if covered >= 8 { '█' } else { art::BLOCKS[covered - 1] };
                let style = ctx.fg(ctx.pal.series(owner, list[owner].tone));
                for x in 0..inner {
                    ctx.surf.put_char(x0 + x, body.y + ph as i32 - 1 - r as i32, ch, style);
                }
            }
        } else {
            let bw = (inner / list.len().max(1) as u16).max(1);
            for (i, s) in list.iter().enumerate() {
                let v = s.values.get(c).copied().unwrap_or(0.0).max(0.0);
                let col = art::column((v - lo) / span, ph as usize);
                let style = ctx.fg(ctx.pal.series(i, s.tone));
                for (r, ch) in col.iter().enumerate() {
                    if *ch != ' ' {
                        for x in 0..bw {
                            ctx.surf.put_char(x0 + i as u16 * bw + x, body.y + r as i32, *ch, style);
                        }
                    }
                }
            }
        }
    }
    let axis = body.y + ph as i32;
    for x in 0..pw {
        ctx.surf.put_char(px + x, axis, '─', grid);
    }
    let widest = cats.iter().map(|c| fmt::width(c)).max().unwrap_or(1) as f64;
    let every = ((widest + 1.0) / band).ceil().max(1.0) as usize;
    for (c, cat) in cats.iter().enumerate() {
        if c % every != 0 {
            continue;
        }
        let room = (band * every as f64).floor() as usize;
        let label = fmt::fit(cat, room.saturating_sub(1).max(1));
        let x0 = px + (c as f64 * band).floor() as u16;
        let dx = ((band.floor() as usize).saturating_sub(fmt::width(&label)) / 2) as u16;
        ctx.surf.put(x0 + if every == 1 { dx } else { 0 }, axis + 1, &label, ctx.dim(), room as u16);
    }
}

pub static BARCHART: Component = Component {
    name: "BarChart",
    draws: &["title", "caption", "categories", "series", "stacked", "horizontal", "unit", "height"],
    not_here: &[],
    height: bar_height,
    draw: bar_draw,
    width: chart_width,
    inline: None,
    keys: None,
};

// ---- LineChart and ScatterChart: braille in a plot with its ticks

struct Plot {
    x: u16,
    y: i32,
    w: u16,
}

fn y_axis(ctx: &mut Ctx, body: Area, lo: f64, hi: f64, unit: &str, h: u16) -> Plot {
    let marks = ticks(lo, hi, 4);
    let lw = marks.iter().map(|t| fmt::width(&unit_of(*t, unit))).max().unwrap_or(1) as u16;
    let plot = Plot { x: body.x + lw + 1, y: body.y, w: body.w.saturating_sub(lw + 1) };
    let grid = ctx.fg(ctx.pal.border);
    for t in marks {
        let r = h as i32 - 1 - (((t - lo) / (hi - lo).max(1e-9)) * (h - 1) as f64).round() as i32;
        ctx.surf.put(body.x, body.y + r, &fmt::rpad(&unit_of(t, unit), lw as usize), ctx.faint(), lw);
        for x in 0..plot.w {
            ctx.surf.put_char(plot.x + x, body.y + r, '┈', grid);
        }
    }
    plot
}

fn paint_braille(ctx: &mut Ctx, plot: &Plot, b: &Braille, colour: &dyn Fn(usize) -> Color) {
    for cy in 0..b.h {
        for cx in 0..b.w {
            if let Some((ch, owner)) = b.cell(cx, cy) {
                let style = ctx.fg(colour(owner));
                ctx.surf.put_char(plot.x + cx as u16, plot.y + cy as i32, ch, style);
            }
        }
    }
}

fn line_body(n: &Node) -> u16 {
    plot_rows(n, 220.0) + 1
}

fn line_height(n: &Node, w: u16, ctx: &mut Ctx) -> u16 {
    let list = series(n);
    let k = keyed(&list, ctx);
    framed_height(n, w, ctx, &k, line_body(n))
}

fn line_draw(n: &Node, a: Area, ctx: &mut Ctx) {
    let list = series(n);
    let k = keyed(&list, ctx);
    let body = framed(n, a, ctx, &k, line_body(n));
    let all: Vec<f64> = list.iter().flat_map(|s| s.values.iter().copied()).collect();
    let area = n.flag("area");
    let (lo0, hi0) = extent(&all, area);
    let (lo, hi) = (n.num("yMin").unwrap_or(lo0), n.num("yMax").unwrap_or(hi0));
    let ph = body.h.saturating_sub(1);
    let plot = y_axis(ctx, body, lo, hi, n.str("unit").unwrap_or(""), ph);
    let xs = strings(n, "x");
    let count = xs.len().max(2);
    let dots_w = (plot.w as i64 * 2).max(2);
    let dots_h = (ph as i64 * 4).max(4);
    let px = |i: usize| (i as f64 / (count - 1) as f64 * (dots_w - 1) as f64).round() as i64;
    let py = |v: f64| ((1.0 - (v - lo) / (hi - lo).max(1e-9)) * (dots_h - 1) as f64).round() as i64;
    if area {
        let mut fill = Braille::new(plot.w as usize, ph as usize);
        for (si, s) in list.iter().enumerate() {
            let pts: Vec<(i64, i64)> =
                s.values.iter().enumerate().filter(|(_, v)| v.is_finite()).map(|(i, v)| (px(i), py(*v))).collect();
            for w in pts.windows(2) {
                let ((x0, y0), (x1, y1)) = (w[0], w[1]);
                for x in x0..=x1 {
                    let t = if x1 == x0 { 0.0 } else { (x - x0) as f64 / (x1 - x0) as f64 };
                    let y = (y0 as f64 + (y1 - y0) as f64 * t).round() as i64;
                    for yy in y + 1..dots_h {
                        fill.dot(x, yy, si);
                    }
                }
            }
        }
        let washed = |i: usize| ctx.pal.wash_series(i, 0.55);
        let colours: Vec<Color> = (0..list.len())
            .map(|i| if list[i].tone.is_some() { ctx.pal.wash(list[i].tone.unwrap(), 0.55) } else { washed(i) })
            .collect();
        paint_braille(ctx, &plot, &fill, &|i| colours[i]);
    }
    let mut lines = Braille::new(plot.w as usize, ph as usize);
    for (si, s) in list.iter().enumerate() {
        let pts: Vec<(i64, i64)> =
            s.values.iter().enumerate().filter(|(_, v)| v.is_finite()).map(|(i, v)| (px(i), py(*v))).collect();
        for w in pts.windows(2) {
            lines.line(w[0], w[1], si);
        }
        if pts.len() == 1 {
            lines.dot(pts[0].0, pts[0].1, si);
        }
    }
    let colours: Vec<Color> = (0..list.len()).map(|i| ctx.pal.series(i, list[i].tone)).collect();
    paint_braille(ctx, &plot, &lines, &|i| colours[i]);
    let widest = xs.iter().map(|l| fmt::width(l)).max().unwrap_or(1);
    let every = ((xs.len() * (widest + 2)) as f64 / plot.w.max(1) as f64).ceil().max(1.0) as usize;
    let label_row = plot.y + ph as i32;
    for (i, label) in xs.iter().enumerate() {
        if i % every != 0 {
            continue;
        }
        let x = plot.x as i64 + px(i) / 2 - (fmt::width(label) / 2) as i64;
        let x = x.clamp(plot.x as i64, (plot.x + plot.w) as i64 - fmt::width(label) as i64).max(0) as u16;
        ctx.surf.put(x, label_row, label, ctx.dim(), plot.w);
    }
}

pub static LINECHART: Component = Component {
    name: "LineChart",
    draws: &["title", "caption", "x", "series", "area", "unit", "yMin", "yMax", "height"],
    not_here: &[],
    height: line_height,
    draw: line_draw,
    width: chart_width,
    inline: None,
    keys: None,
};

struct Points {
    name: String,
    tone: Option<Tone>,
    pts: Vec<(f64, f64)>,
}

fn points(n: &Node) -> Vec<Points> {
    n.list("series")
        .iter()
        .map(|s| Points {
            name: s.get("name").and_then(Value::as_str).unwrap_or("").to_string(),
            tone: s.get("tone").and_then(Value::as_str).and_then(Tone::parse),
            pts: s
                .get("points")
                .and_then(Value::as_array)
                .map(|ps| {
                    ps.iter()
                        .map(|p| {
                            (
                                p.get("x").and_then(Value::as_f64).unwrap_or(0.0),
                                p.get("y").and_then(Value::as_f64).unwrap_or(0.0),
                            )
                        })
                        .collect()
                })
                .unwrap_or_default(),
        })
        .collect()
}

fn scatter_body(n: &Node) -> u16 {
    plot_rows(n, 240.0) + 1 + u16::from(n.str("xLabel").is_some()) + u16::from(n.str("yLabel").is_some())
}

fn scatter_keyed(list: &[Points], ctx: &Ctx) -> Vec<(String, Color)> {
    list.iter().enumerate().map(|(i, s)| (s.name.clone(), ctx.pal.series(i, s.tone))).collect()
}

fn scatter_height(n: &Node, w: u16, ctx: &mut Ctx) -> u16 {
    let list = points(n);
    let k = scatter_keyed(&list, ctx);
    framed_height(n, w, ctx, &k, scatter_body(n))
}

fn scatter_draw(n: &Node, a: Area, ctx: &mut Ctx) {
    let list = points(n);
    let k = scatter_keyed(&list, ctx);
    let mut body = framed(n, a, ctx, &k, scatter_body(n));
    if let Some(y) = n.str("yLabel") {
        ctx.surf.put(body.x, body.y, y, ctx.dim(), body.w);
        body = Area::new(body.x, body.y + 1, body.w, body.h - 1);
    }
    let xs: Vec<f64> = list.iter().flat_map(|s| s.pts.iter().map(|p| p.0)).collect();
    let ys: Vec<f64> = list.iter().flat_map(|s| s.pts.iter().map(|p| p.1)).collect();
    let (xlo, xhi) = extent(&xs, false);
    let (ylo, yhi) = extent(&ys, false);
    let ph = plot_rows(n, 240.0);
    let plot = y_axis(ctx, body, ylo, yhi, "", ph);
    let (dw, dh) = (plot.w as i64 * 2, ph as i64 * 4);
    let mut b = Braille::new(plot.w as usize, ph as usize);
    for (si, s) in list.iter().enumerate() {
        for (x, y) in &s.pts {
            let dx = ((x - xlo) / (xhi - xlo).max(1e-9) * (dw - 2) as f64).round() as i64;
            let dy = ((1.0 - (y - ylo) / (yhi - ylo).max(1e-9)) * (dh - 2) as f64).round() as i64;
            for (ox, oy) in [(0, 0), (1, 0), (0, 1), (1, 1)] {
                b.dot(dx + ox, dy + oy, si);
            }
        }
    }
    let colours: Vec<Color> = (0..list.len()).map(|i| ctx.pal.series(i, list[i].tone)).collect();
    paint_braille(ctx, &plot, &b, &|i| colours[i]);
    let row = plot.y + ph as i32;
    for t in ticks(xlo, xhi, 4) {
        let label = fmt::number(t);
        let x = plot.x as f64 + (t - xlo) / (xhi - xlo).max(1e-9) * (plot.w.saturating_sub(1)) as f64
            - (fmt::width(&label) / 2) as f64;
        ctx.surf.put(x.max(plot.x as f64) as u16, row, &label, ctx.faint(), 12);
    }
    if let Some(x) = n.str("xLabel") {
        let w = fmt::width(x) as u16;
        ctx.surf.put(plot.x + plot.w.saturating_sub(w) / 2, row + 1, x, ctx.dim(), plot.w);
    }
}

pub static SCATTERCHART: Component = Component {
    name: "ScatterChart",
    draws: &["title", "caption", "series", "xLabel", "yLabel", "height"],
    not_here: &[],
    height: scatter_height,
    draw: scatter_draw,
    width: chart_width,
    inline: None,
    keys: None,
};

// ---- Sparkline

fn spark_inline(n: &Node, ctx: &mut Ctx, _: Style, out: &mut Vec<Seg>) {
    let values: Vec<f64> = n.list("values").iter().filter_map(Value::as_f64).collect();
    let t = n.tone("tone").unwrap_or(Tone::Accent);
    out.push(Seg::atom(art::blocks(&values), ctx.tone(t)));
}

fn one(_: &Node, _: u16, _: &mut Ctx) -> u16 {
    1
}

fn spark_draw(n: &Node, a: Area, ctx: &mut Ctx) {
    let mut segs = Vec::new();
    spark_inline(n, ctx, Style::new(), &mut segs);
    draw_one_line(&segs, a.x, a.y, a.w, ctx);
}

fn spark_width(n: &Node, _: &mut Ctx) -> u16 {
    n.list("values").len() as u16
}

pub static SPARKLINE: Component = Component {
    name: "Sparkline",
    draws: &["title", "values", "tone", "blocks"],
    not_here: &[
        ("width", "a sparkline in a terminal is a block for each value"),
        ("height", "it's one line high: eight steps a cell"),
    ],
    height: one,
    draw: spark_draw,
    width: spark_width,
    inline: Some(spark_inline),
    keys: None,
};

// ---- DonutChart: in a terminal, a bar in parts with the legend under it

struct Part {
    label: String,
    value: f64,
    tone: Option<Tone>,
}

fn parts(n: &Node) -> Vec<Part> {
    n.list("segments")
        .iter()
        .map(|s| Part {
            label: s.get("label").and_then(Value::as_str).unwrap_or("").to_string(),
            value: s.get("value").and_then(Value::as_f64).unwrap_or(0.0),
            tone: s.get("tone").and_then(Value::as_str).and_then(Tone::parse),
        })
        .collect()
}

fn donut_height(n: &Node, w: u16, ctx: &mut Ctx) -> u16 {
    let body = 1 + parts(n).len() as u16;
    framed_height(n, w, ctx, &[], body)
}

fn donut_draw(n: &Node, a: Area, ctx: &mut Ctx) {
    let list = parts(n);
    let body = framed(n, a, ctx, &[], 1 + list.len() as u16);
    let total: f64 = list.iter().map(|p| p.value.max(0.0)).sum::<f64>().max(1e-9);
    let center = inline_all(n.slot("center"), ctx, ctx.text().add_modifier(Modifier::BOLD));
    let cw = segs_width(&center);
    let mut x = body.x;
    if cw > 0 {
        x += draw_one_line(&center, x, body.y, cw, ctx) + 1;
    }
    let bw = (body.x + body.w).saturating_sub(x).min(60);
    let mut acc = 0.0;
    let mut used = 0u16;
    for (i, p) in list.iter().enumerate() {
        acc += p.value.max(0.0);
        let upto = ((acc / total) * bw as f64).round() as u16;
        let style = ctx.fg(ctx.pal.series(i, p.tone));
        while used < upto {
            ctx.surf.put_char(x + used, body.y, '█', style);
            used += 1;
        }
    }
    let unit = n.str("unit").unwrap_or("");
    let lw = list.iter().map(|p| fmt::width(&p.label)).max().unwrap_or(0).min(28);
    for (i, p) in list.iter().enumerate() {
        let y = body.y + 1 + i as i32;
        let swatch = ctx.fg(ctx.pal.series(i, p.tone));
        ctx.surf.put(body.x, y, "■ ", swatch, 2);
        ctx.surf.put(body.x + 2, y, &fmt::pad(&p.label, lw), ctx.text(), lw as u16);
        let share = format!("{} · {}%", unit_of(p.value, unit), (p.value / total * 100.0).round());
        ctx.surf.put(body.x + 3 + lw as u16, y, &share, ctx.faint(), body.w.saturating_sub(lw as u16 + 3));
    }
}

pub static DONUTCHART: Component = Component {
    name: "DonutChart",
    draws: &["title", "caption", "segments", "center", "unit"],
    not_here: &[("height", "a ring in a terminal is drawn as one bar in parts, a line high, with its legend")],
    height: donut_height,
    draw: donut_draw,
    width: chart_width,
    inline: None,
    keys: None,
};

// ---- Heatmap

fn heat_height(n: &Node, w: u16, ctx: &mut Ctx) -> u16 {
    framed_height(n, w, ctx, &[], 1 + n.list("rows").len() as u16)
}

fn heat_draw(n: &Node, a: Area, ctx: &mut Ctx) {
    let rows_l = strings(n, "rows");
    let cols_l = strings(n, "columns");
    let body = framed(n, a, ctx, &[], 1 + rows_l.len() as u16);
    let values: Vec<Vec<f64>> = n
        .list("values")
        .iter()
        .map(|r| r.as_array().map(|v| v.iter().map(|x| x.as_f64().unwrap_or(f64::NAN)).collect()).unwrap_or_default())
        .collect();
    let flat: Vec<f64> = values.iter().flatten().copied().filter(|v| v.is_finite()).collect();
    let (lo, hi) = (flat.iter().copied().fold(f64::MAX, f64::min), flat.iter().copied().fold(f64::MIN, f64::max));
    let lw = rows_l.iter().map(|r| fmt::width(r)).max().unwrap_or(0).min(20) as u16;
    let cw = (body.w.saturating_sub(lw + 1) / cols_l.len().max(1) as u16).clamp(2, 6);
    let t = n.tone("tone").unwrap_or(Tone::Accent);
    let widest = cols_l.iter().map(|c| fmt::width(c)).max().unwrap_or(1) as u16;
    let every = (widest + 1).div_ceil(cw).max(1) as usize;
    for (i, c) in cols_l.iter().enumerate() {
        if i % every == 0 {
            ctx.surf.put(
                body.x + lw + 1 + i as u16 * cw,
                body.y,
                &fmt::fit(c, (cw as usize * every).saturating_sub(1)),
                ctx.faint(),
                cw * every as u16,
            );
        }
    }
    let shades = [' ', '░', '▒', '▓', '█'];
    for (r, label) in rows_l.iter().enumerate() {
        let y = body.y + 1 + r as i32;
        ctx.surf.put(body.x, y, &fmt::pad(label, lw as usize), ctx.dim(), lw);
        for (i, _) in cols_l.iter().enumerate() {
            let v = values.get(r).and_then(|row| row.get(i)).copied().unwrap_or(f64::NAN);
            let x = body.x + lw + 1 + i as u16 * cw;
            let cell = Area::new(x, y, cw.saturating_sub(1).max(1), 1);
            if !v.is_finite() {
                let s = ctx.bg(ctx.pal.surface);
                ctx.surf.clear(cell, s);
                continue;
            }
            let strength = if hi == lo { 1.0 } else { (v - lo) / (hi - lo) };
            if ctx.pal.mode == Mode::None {
                let ch = shades[(strength * 4.0).round() as usize];
                for dx in 0..cell.w {
                    ctx.surf.put_char(cell.x + dx, y, ch, Style::new());
                }
            } else {
                let bg = ctx.pal.wash(t, 0.12 + strength * 0.88);
                ctx.surf.clear(cell, Style::new().bg(bg));
                if cw >= 4 {
                    let text = fmt::number(v);
                    let fg = if strength > 0.55 { ctx.pal.panel } else { ctx.pal.text };
                    ctx.surf.put(
                        cell.x + cell.w.saturating_sub(fmt::width(&text) as u16) / 2,
                        y,
                        &text,
                        Style::new().fg(fg).bg(bg),
                        cell.w,
                    );
                }
            }
        }
    }
}

pub static HEATMAP: Component = Component {
    name: "Heatmap",
    draws: &["title", "caption", "rows", "columns", "values", "unit", "tone"],
    not_here: &[("height", "a heatmap is a row of cells for each of its rows")],
    height: heat_height,
    draw: heat_draw,
    width: chart_width,
    inline: None,
    keys: None,
};

// ---- Gantt

const DAY: i64 = 86_400_000;

fn date(s: &str) -> Option<i64> {
    if let Ok(d) = chrono::NaiveDate::parse_from_str(s, "%Y-%m-%d") {
        return Some(d.and_hms_opt(0, 0, 0)?.and_utc().timestamp_millis());
    }
    chrono::DateTime::parse_from_rfc3339(s).ok().map(|d| d.timestamp_millis())
}

fn gantt_height(n: &Node, w: u16, ctx: &mut Ctx) -> u16 {
    framed_height(n, w, ctx, &[], 1 + n.list("tasks").len() as u16)
}

fn gantt_draw(n: &Node, a: Area, ctx: &mut Ctx) {
    let tasks = n.list("tasks").to_vec();
    let body = framed(n, a, ctx, &[], 1 + tasks.len() as u16);
    let spans: Vec<(i64, i64)> = tasks
        .iter()
        .map(|t| {
            (
                date(t.get("start").and_then(Value::as_str).unwrap_or("")).unwrap_or(0),
                date(t.get("end").and_then(Value::as_str).unwrap_or("")).unwrap_or(0),
            )
        })
        .collect();
    let lo = spans.iter().map(|s| s.0).min().unwrap_or(0);
    let hi = spans.iter().map(|s| s.1).max().unwrap_or(0) + DAY;
    let lw = tasks
        .iter()
        .map(|t| fmt::width(t.get("label").and_then(Value::as_str).unwrap_or("")))
        .max()
        .unwrap_or(0)
        .min(24) as u16;
    let tx = body.x + lw + 1;
    let tw = body.w.saturating_sub(lw + 1).max(1);
    let x_of = |t: i64| {
        tx + (((t - lo) as f64 / (hi - lo).max(1) as f64) * (tw - 1) as f64).round().clamp(0.0, (tw - 1) as f64) as u16
    };
    let days = (hi - lo) as f64 / DAY as f64;
    let room = (tw / 8).max(2) as f64;
    let step = [1, 2, 7, 14, 30, 61, 91, 182, 365].into_iter().find(|s| days / *s as f64 <= room).unwrap_or(365);
    let mut t = lo;
    let mut last_end = 0u16;
    while t <= hi {
        let x = x_of(t);
        let label =
            chrono::DateTime::from_timestamp_millis(t).map(|d| d.format("%-d %b").to_string()).unwrap_or_default();
        let lw = fmt::width(&label) as u16;
        if x >= last_end && x + lw <= tx + tw {
            last_end = x + ctx.surf.put(x, body.y, &label, ctx.faint(), lw) + 1;
        }
        t += step * DAY;
    }
    let now = n.num("now").map(|v| v as i64);
    for (i, task) in tasks.iter().enumerate() {
        let y = body.y + 1 + i as i32;
        let label = task.get("label").and_then(Value::as_str).unwrap_or("");
        ctx.surf.put(body.x, y, &fmt::pad(label, lw as usize), ctx.dim(), lw);
        let (a0, b0) = spans[i];
        let (x0, x1) = (x_of(a0), x_of(b0 + DAY).max(x_of(a0) + 1));
        let tone = task.get("tone").and_then(Value::as_str).and_then(Tone::parse).unwrap_or(Tone::Accent);
        let style = ctx.tone(tone);
        let progress = task.get("progress").and_then(Value::as_f64);
        let done_to = progress.map(|p| x0 + ((x1 - x0) as f64 * p.clamp(0.0, 1.0)).round() as u16).unwrap_or(x1);
        for x in x0..x1 {
            ctx.surf.put_char(x, y, if x < done_to { '█' } else { '░' }, style);
        }
    }
    if let Some(now) = now.filter(|t| *t >= lo && *t <= hi) {
        let x = x_of(now);
        let danger = ctx.fg(ctx.pal.danger);
        ctx.surf.put_char(x, body.y, '▾', danger);
        for (i, &(a0, b0)) in spans.iter().enumerate() {
            let y = body.y + 1 + i as i32;
            if x < x_of(a0) || x >= x_of(b0 + DAY) {
                ctx.surf.put_char(x, y, '│', danger);
            }
        }
    }
}

pub static GANTT: Component = Component {
    name: "Gantt",
    draws: &["title", "caption", "tasks", "today"],
    not_here: &[("height", "a Gantt chart is a row for each task")],
    height: gantt_height,
    draw: gantt_draw,
    width: chart_width,
    inline: None,
    keys: None,
};

// ---- FlowDiagram

/// A step's box: its id, its tone, where it is, and its label's lines.
#[derive(Clone, Default)]
struct Step {
    id: String,
    tone: Option<Tone>,
    x: u16,
    y: i32,
    lines: Vec<String>,
}

struct Flow {
    boxes: Vec<Step>,
    bw: u16,
    bh: u16,
    base: i32,
    loops: usize,
}

fn flow_layout(n: &Node, w: u16) -> Flow {
    let nodes = n.list("nodes").to_vec();
    let rank = n.p.get("rank").cloned().unwrap_or(Value::Null);
    let ranks = nodes
        .iter()
        .map(|nd| rank.get(nd.get("id").and_then(Value::as_str).unwrap_or("")).and_then(Value::as_u64).unwrap_or(0))
        .max()
        .unwrap_or(0) as usize
        + 1;
    let mut columns: Vec<Vec<usize>> = vec![Vec::new(); ranks];
    for (i, nd) in nodes.iter().enumerate() {
        let r =
            rank.get(nd.get("id").and_then(Value::as_str).unwrap_or("")).and_then(Value::as_u64).unwrap_or(0) as usize;
        columns[r.min(ranks - 1)].push(i);
    }
    let longest =
        nodes.iter().map(|nd| fmt::width(nd.get("label").and_then(Value::as_str).unwrap_or(""))).max().unwrap_or(4)
            as u16;
    let mut gap = 5u16;
    let mut bw = (longest + 4).clamp(8, 28);
    while ranks as u16 * bw + gap * (ranks as u16 - 1) > w && (bw > 8 || gap > 2) {
        if gap > 3 || (bw <= 8 && gap > 2) {
            gap -= 1;
        } else {
            bw -= 1;
        }
    }
    let room = (bw - 2) as usize;
    let wrapped: Vec<Vec<String>> = nodes
        .iter()
        .map(|nd| {
            let lines = fmt::wrap(nd.get("label").and_then(Value::as_str).unwrap_or(""), room);
            let mut kept: Vec<String> = lines.iter().take(2).cloned().collect();
            if lines.len() > 2
                && let Some(last) = kept.last_mut()
            {
                *last = fmt::fit(&format!("{last} …"), room);
            }
            kept
        })
        .collect();
    let bh = if wrapped.iter().any(|l| l.len() > 1) { 4 } else { 3 };
    let tallest = columns.iter().map(Vec::len).max().unwrap_or(1);
    let mut boxes = vec![Step::default(); nodes.len()];
    for (r, col) in columns.iter().enumerate() {
        for (k, &i) in col.iter().enumerate() {
            let x = r as u16 * (bw + gap);
            let y = (((tallest - col.len()) as f64 / 2.0 + k as f64) * (bh + 1) as f64) as i32;
            let nd = &nodes[i];
            boxes[i] = Step {
                id: nd.get("id").and_then(Value::as_str).unwrap_or("").to_string(),
                tone: nd.get("tone").and_then(Value::as_str).and_then(Tone::parse),
                x,
                y,
                lines: wrapped[i].clone(),
            };
        }
    }
    Flow { boxes, bw, bh, base: tallest as i32 * (bh as i32 + 1) - 1, loops: n.list("back").len() }
}

fn flow_body(n: &Node, w: u16) -> u16 {
    let f = flow_layout(n, w);
    (f.base + if f.loops > 0 { 1 + f.loops as i32 * 2 } else { 0 }) as u16
}

fn flow_height(n: &Node, w: u16, ctx: &mut Ctx) -> u16 {
    framed_height(n, w, ctx, &[], flow_body(n, w))
}

fn flow_draw(n: &Node, a: Area, ctx: &mut Ctx) {
    let body = framed(n, a, ctx, &[], flow_body(n, a.w));
    let f = flow_layout(n, a.w);
    let find = |id: &str| f.boxes.iter().find(|b| b.id == id);
    let back: Vec<usize> = n.list("back").iter().filter_map(Value::as_u64).map(|i| i as usize).collect();
    let line = ctx.faint();
    let warn = ctx.fg(ctx.pal.warning);
    let mut loop_no = 0;
    for (i, e) in n.list("edges").iter().enumerate() {
        let (Some(from), Some(to)) =
            (e.get("from").and_then(Value::as_str).and_then(find), e.get("to").and_then(Value::as_str).and_then(find))
        else {
            continue;
        };
        let label = e.get("label").and_then(Value::as_str).unwrap_or("");
        if back.contains(&i) {
            let depth = body.y + f.base + 1 + loop_no * 2;
            loop_no += 1;
            let x1 = body.x + from.x + f.bw / 2;
            let x2 = body.x + to.x + f.bw / 2;
            let (top1, top2) = (body.y + from.y + f.bh as i32, body.y + to.y + f.bh as i32);
            for y in top1..depth {
                ctx.surf.put_char(x1, y, '┆', warn);
            }
            for y in top2 + 1..depth {
                ctx.surf.put_char(x2, y, '┆', warn);
            }
            ctx.surf.put_char(x2, top2, '▲', warn);
            let (l, r) = (x1.min(x2), x1.max(x2));
            for x in l..=r {
                ctx.surf.put_char(x, depth, '╌', warn);
            }
            ctx.surf.put_char(l, depth, '╰', warn);
            ctx.surf.put_char(r, depth, '╯', warn);
            if !label.is_empty() {
                let lw = fmt::width(label) as u16 + 2;
                if r - l > lw + 2 {
                    ctx.surf.put(l + (r - l - lw) / 2, depth, &format!(" {label} "), warn, lw);
                }
            }
            continue;
        }
        let (sx, sy) = (body.x + from.x + f.bw, body.y + from.y + f.bh as i32 / 2);
        let (ex, ey) = (body.x + to.x, body.y + to.y + f.bh as i32 / 2);
        if ex <= sx {
            continue;
        }
        if sy == ey {
            for x in sx..ex - 1 {
                ctx.surf.put_char(x, sy, '─', line);
            }
        } else {
            let mid = sx + (ex - sx) / 2;
            for x in sx..mid {
                ctx.surf.put_char(x, sy, '─', line);
            }
            let (down, up) = (ey > sy, ey < sy);
            ctx.surf.put_char(mid, sy, if down { '╮' } else { '╯' }, line);
            let (a0, b0) = (sy.min(ey) + 1, sy.max(ey));
            for y in a0..b0 {
                ctx.surf.put_char(mid, y, '│', line);
            }
            ctx.surf.put_char(mid, ey, if up { '╭' } else { '╰' }, line);
            for x in mid + 1..ex - 1 {
                ctx.surf.put_char(x, ey, '─', line);
            }
        }
        ctx.surf.put_char(ex - 1, ey, '▶', line);
        if !label.is_empty() && fmt::width(label) as u16 + 2 < ex - sx {
            ctx.surf.put(sx + 1, sy, label, ctx.faint(), ex - sx - 2);
        }
    }
    let current = n.str("current");
    for Step { id, tone, x, y, lines } in &f.boxes {
        let on = current == Some(id.as_str());
        let border = if on {
            ctx.fg(ctx.pal.accent).add_modifier(Modifier::BOLD)
        } else if let Some(t) = tone {
            ctx.tone(*t)
        } else {
            ctx.fg(ctx.pal.border)
        };
        let area = Area::new(body.x + x, body.y + y, f.bw, f.bh);
        let bg = ctx.bg(if on { ctx.pal.selection } else { ctx.pal.panel });
        ctx.surf.clear(area.inset(1, 1, 1, 1), bg);
        frame(area, ctx, border, &[], &[]);
        let style = if on { ctx.text().add_modifier(Modifier::BOLD).patch(bg) } else { ctx.text().patch(bg) };
        let top = area.y + 1 + ((f.bh as i32 - 2 - lines.len() as i32) / 2).max(0);
        for (k, l) in lines.iter().enumerate() {
            let lw = fmt::width(l) as u16;
            ctx.surf.put(area.x + (f.bw.saturating_sub(lw)) / 2, top + k as i32, l, style, f.bw - 2);
        }
    }
}

pub static FLOWDIAGRAM: Component = Component {
    name: "FlowDiagram",
    draws: &["title", "caption", "nodes", "edges", "current"],
    not_here: &[("height", "a flow diagram is as tall as its tallest column of steps, and its loops")],
    height: flow_height,
    draw: flow_draw,
    width: chart_width,
    inline: None,
    keys: None,
};

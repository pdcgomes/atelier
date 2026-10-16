//! The characters charts are drawn in: ooze's sparkline, meter and spinner,
//! bars in eighths of a cell, braille for lines and points, and half blocks
//! for pixels.

pub const BLOCKS: [char; 8] = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
/// A bar growing left to right, in eighths of a cell.
pub const EIGHTHS: [char; 8] = ['▏', '▎', '▍', '▌', '▋', '▊', '▉', '█'];
const SPINNER: [&str; 10] = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

/// Values as block characters, lowest to highest, as the kit's `blocks` draws them.
pub fn blocks(values: &[f64]) -> String {
    let finite: Vec<f64> = values.iter().copied().filter(|v| v.is_finite()).collect();
    if finite.is_empty() {
        return String::new();
    }
    let (min, max) = finite.iter().fold((f64::MAX, f64::MIN), |(a, b), &v| (a.min(v), b.max(v)));
    values
        .iter()
        .map(|&v| {
            if !v.is_finite() {
                ' '
            } else if max == min {
                BLOCKS[3]
            } else {
                BLOCKS[(((v - min) / (max - min)) * 7.0).round() as usize]
            }
        })
        .collect()
}

/// A spinner's frame, at a phase of its own so a list of them doesn't tick in step.
pub fn spinner(now: i64, phase: &str) -> &'static str {
    let offset = phase.bytes().fold(0usize, |h, b| h.wrapping_mul(31).wrapping_add(b as usize));
    SPINNER[((now / 100) as usize + offset) % SPINNER.len()]
}

/// How many cells of a `w`-wide meter are full, and the part-cell after them, in eighths.
pub fn bar(ratio: f64, w: usize) -> (usize, usize) {
    let eighths = (ratio.clamp(0.0, 1.0) * (w * 8) as f64).round() as usize;
    (eighths / 8, eighths % 8)
}

/// A bar `ratio` of `w` cells long, with its last cell in eighths.
pub fn bar_text(ratio: f64, w: usize) -> String {
    let (full, part) = bar(ratio, w);
    let mut s = "█".repeat(full);
    if part > 0 && full < w {
        s.push(EIGHTHS[part - 1]);
    }
    s
}

/// A column `ratio` of `h` cells tall, top to bottom, with its top cell in eighths.
pub fn column(ratio: f64, h: usize) -> Vec<char> {
    let eighths = (ratio.clamp(0.0, 1.0) * (h * 8) as f64).round() as usize;
    let (full, part) = (eighths / 8, eighths % 8);
    (0..h)
        .map(|row| {
            let from_bottom = h - 1 - row;
            if from_bottom < full {
                '█'
            } else if from_bottom == full && part > 0 {
                BLOCKS[part - 1]
            } else {
                ' '
            }
        })
        .collect()
}

/// A grid of dots, two across and four down in each cell, for lines and points.
pub struct Braille {
    pub w: usize,
    pub h: usize,
    dots: Vec<u8>,
    /// Which series last drew in each cell, for its colour.
    pub owner: Vec<Option<usize>>,
}

impl Braille {
    pub fn new(w: usize, h: usize) -> Braille {
        Braille { w, h, dots: vec![0; w * h], owner: vec![None; w * h] }
    }

    /// Sets a dot, `x` from 0 to `2w`, `y` from 0 (the top) to `4h`.
    pub fn dot(&mut self, x: i64, y: i64, series: usize) {
        if x < 0 || y < 0 || x >= (self.w * 2) as i64 || y >= (self.h * 4) as i64 {
            return;
        }
        let (cx, cy) = (x as usize / 2, y as usize / 4);
        const BITS: [[u8; 4]; 2] = [[0x01, 0x02, 0x04, 0x40], [0x08, 0x10, 0x20, 0x80]];
        let i = cy * self.w + cx;
        self.dots[i] |= BITS[x as usize % 2][y as usize % 4];
        self.owner[i] = Some(series);
    }

    pub fn line(&mut self, (x0, y0): (i64, i64), (x1, y1): (i64, i64), series: usize) {
        let (dx, dy) = ((x1 - x0).abs(), -(y1 - y0).abs());
        let (sx, sy) = (if x0 < x1 { 1 } else { -1 }, if y0 < y1 { 1 } else { -1 });
        let (mut x, mut y, mut err) = (x0, y0, dx + dy);
        loop {
            self.dot(x, y, series);
            if x == x1 && y == y1 {
                break;
            }
            let e2 = 2 * err;
            if e2 >= dy {
                err += dy;
                x += sx;
            }
            if e2 <= dx {
                err += dx;
                y += sy;
            }
        }
    }

    pub fn cell(&self, cx: usize, cy: usize) -> Option<(char, usize)> {
        let i = cy * self.w + cx;
        let bits = self.dots[i];
        if bits == 0 {
            return None;
        }
        Some((char::from_u32(0x2800 + bits as u32).unwrap_or(' '), self.owner[i].unwrap_or(0)))
    }
}

type Rgb = (u8, u8, u8);

/// An image's pixels, two to a cell, top in the foreground and bottom in the background.
pub fn half_block(top: Option<Rgb>, bottom: Option<Rgb>) -> (char, Option<Rgb>, Option<Rgb>) {
    match (top, bottom) {
        (None, None) => (' ', None, None),
        (Some(a), None) => ('▀', Some(a), None),
        (None, Some(b)) => ('▄', Some(b), None),
        (Some(a), Some(b)) => ('▀', Some(a), Some(b)),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn blocks_as_the_kit_draws_them() {
        assert_eq!(blocks(&[3.0, 5.0, 4.0, 7.0, 6.0, 9.0, 11.0]), "▁▃▂▅▄▆█");
        assert_eq!(blocks(&[2.0, 2.0]), "▄▄");
    }

    #[test]
    fn bars_in_eighths() {
        assert_eq!(bar_text(0.5, 4), "██");
        assert_eq!(bar_text(0.53, 4), "██▏");
        assert_eq!(bar_text(0.56, 4), "██▎");
        assert_eq!(column(0.5, 2), [' ', '█']);
        assert_eq!(column(0.75, 2), ['▄', '█']);
    }

    #[test]
    fn braille_dots() {
        let mut b = Braille::new(2, 1);
        b.dot(0, 0, 0);
        b.dot(3, 3, 1);
        assert_eq!(b.cell(0, 0), Some(('⠁', 0)));
        assert_eq!(b.cell(1, 0), Some(('⢀', 1)));
    }
}

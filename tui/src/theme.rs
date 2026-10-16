//! Atelier's themes, in a terminal: every one of the 77, from the daemon or,
//! when it can't be reached, from the copy built in. Truecolor where the
//! terminal has it and the nearest of the 256 standard colours where it
//! hasn't, as ooze and sweep do; none at all with NO_COLOR.

use ratatui::style::Color;
use serde::Deserialize;

use crate::tree::Tone;

const THEMES: &str = include_str!("../../packages/themes/themes.json");
pub const DEFAULT: &str = "tokyo-night";

#[derive(Debug, Clone, Deserialize)]
pub struct Colors {
    pub bg: String,
    pub panel: String,
    pub surface: String,
    pub border: String,
    pub focus: String,
    pub text: String,
    pub text2: String,
    pub text3: String,
    pub selection: String,
    pub accent: String,
    pub success: String,
    pub warning: String,
    pub danger: String,
    pub info: String,
    pub chart: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct Theme {
    pub id: String,
    pub name: String,
    pub dark: bool,
    #[serde(default)]
    pub source: String,
    pub colors: Colors,
}

/// The themes built in, for when the daemon isn't there to ask.
pub fn embedded() -> Vec<Theme> {
    serde_json::from_str(THEMES).expect("themes.json is built in")
}

pub fn by_id<'a>(themes: &'a [Theme], id: &str) -> Option<&'a Theme> {
    themes.iter().find(|t| t.id == id)
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Mode {
    True,
    Ansi256,
    None,
}

impl Mode {
    pub fn detect() -> Mode {
        if no_color() {
            Mode::None
        } else if truecolor() {
            Mode::True
        } else {
            Mode::Ansi256
        }
    }
}

pub type Rgb = (u8, u8, u8);

pub fn rgb(hex: &str) -> Rgb {
    let h = hex.trim_start_matches('#');
    let v = u32::from_str_radix(h, 16).unwrap_or(0);
    ((v >> 16) as u8, (v >> 8) as u8, v as u8)
}

/// One colour in `a`'s direction from `b`, as CSS's color-mix does.
pub fn mix(a: Rgb, b: Rgb, t: f64) -> Rgb {
    let m = |x: u8, y: u8| (x as f64 * t + y as f64 * (1.0 - t)).round().clamp(0.0, 255.0) as u8;
    (m(a.0, b.0), m(a.1, b.1), m(a.2, b.2))
}

/// The theme's colours as the terminal can show them.
#[derive(Debug, Clone)]
pub struct Palette {
    pub mode: Mode,
    pub dark: bool,
    pub id: String,
    pub name: String,
    pub bg: Color,
    pub panel: Color,
    pub surface: Color,
    pub border: Color,
    pub focus: Color,
    pub text: Color,
    pub text2: Color,
    pub text3: Color,
    pub selection: Color,
    pub accent: Color,
    pub success: Color,
    pub warning: Color,
    pub danger: Color,
    pub info: Color,
    pub chart: Vec<Color>,
    raw: Raw,
}

#[derive(Debug, Clone)]
struct Raw {
    panel: Rgb,
    surface: Rgb,
    text: Rgb,
    tones: [Rgb; 6],
    chart: Vec<Rgb>,
}

impl Palette {
    pub fn new(theme: &Theme, mode: Mode) -> Palette {
        let c = &theme.colors;
        let col = |h: &str| color(rgb(h), mode);
        let chart: Vec<Rgb> =
            if c.chart.is_empty() { vec![rgb(&c.accent)] } else { c.chart.iter().map(|h| rgb(h)).collect() };
        Palette {
            mode,
            dark: theme.dark,
            id: theme.id.clone(),
            name: theme.name.clone(),
            bg: col(&c.bg),
            panel: col(&c.panel),
            surface: col(&c.surface),
            border: col(&c.border),
            focus: col(&c.focus),
            text: col(&c.text),
            text2: col(&c.text2),
            text3: col(&c.text3),
            selection: col(&c.selection),
            accent: col(&c.accent),
            success: col(&c.success),
            warning: col(&c.warning),
            danger: col(&c.danger),
            info: col(&c.info),
            chart: chart.iter().map(|&x| color(x, mode)).collect(),
            raw: Raw {
                panel: rgb(&c.panel),
                surface: rgb(&c.surface),
                text: rgb(&c.text),
                tones: [rgb(&c.text2), rgb(&c.accent), rgb(&c.success), rgb(&c.warning), rgb(&c.danger), rgb(&c.info)],
                chart,
            },
        }
    }

    /// The colour of a tone, for text, borders and bars.
    pub fn tone(&self, t: Tone) -> Color {
        match t {
            Tone::Default | Tone::Secondary => self.text2,
            Tone::Accent => self.accent,
            Tone::Success => self.success,
            Tone::Warning => self.warning,
            Tone::Danger => self.danger,
            Tone::Info => self.info,
            Tone::Muted => self.text3,
        }
    }

    fn tone_rgb(&self, t: Tone) -> Rgb {
        match t {
            Tone::Default | Tone::Secondary => self.raw.tones[0],
            Tone::Accent => self.raw.tones[1],
            Tone::Success => self.raw.tones[2],
            Tone::Warning => self.raw.tones[3],
            Tone::Danger => self.raw.tones[4],
            Tone::Info => self.raw.tones[5],
            Tone::Muted => mix(self.raw.text, self.raw.panel, 0.5),
        }
    }

    /// A tone washed into the panel, for a soft badge's background or a heatmap's cell.
    pub fn wash(&self, t: Tone, strength: f64) -> Color {
        color(mix(self.tone_rgb(t), self.raw.panel, strength), self.mode)
    }

    /// A chart colour washed into the panel.
    pub fn wash_series(&self, i: usize, strength: f64) -> Color {
        color(mix(self.raw.chart[i % self.raw.chart.len()], self.raw.panel, strength), self.mode)
    }

    /// The `i`th series' colour, or its tone's when it has one.
    pub fn series(&self, i: usize, tone: Option<Tone>) -> Color {
        match tone {
            Some(t) => self.tone(t),
            None => self.chart[i % self.chart.len()],
        }
    }

    /// The surface, a little lighter or darker again: an input on a surface.
    pub fn raised(&self) -> Color {
        color(mix(self.raw.text, self.raw.surface, 0.06), self.mode)
    }

    /// The CSS variable a canvas named in a style, such as `var(--accent)`.
    pub fn variable(&self, css: &str) -> Option<Color> {
        let name = css.trim().strip_prefix("var(--")?.strip_suffix(')')?;
        Some(match name {
            "bg" => self.bg,
            "panel" => self.panel,
            "surface" => self.surface,
            "border" => self.border,
            "focus" => self.focus,
            "text" => self.text,
            "text-2" => self.text2,
            "text-3" => self.text3,
            "selection" => self.selection,
            "accent" => self.accent,
            "success" => self.success,
            "warning" => self.warning,
            "danger" => self.danger,
            "info" => self.info,
            n => {
                let i: usize = n.strip_prefix("chart-")?.parse().ok()?;
                *self.chart.get(i.checked_sub(1)?)?
            }
        })
    }
}

pub fn color(c: Rgb, mode: Mode) -> Color {
    match mode {
        Mode::True => Color::Rgb(c.0, c.1, c.2),
        Mode::Ansi256 => Color::Indexed(nearest_256(c.0, c.1, c.2)),
        Mode::None => Color::Reset,
    }
}

/// Whether the terminal takes 24-bit colour.
pub fn truecolor() -> bool {
    let var = |k: &str| std::env::var(k).unwrap_or_default().to_lowercase();
    let ct = var("COLORTERM");
    if ct.contains("truecolor") || ct.contains("24bit") {
        return true;
    }
    let program = var("TERM_PROGRAM");
    if ["iterm.app", "ghostty", "wezterm", "vscode", "hyper", "tabby", "rio", "warpterminal"]
        .contains(&program.as_str())
    {
        return true;
    }
    let term = var("TERM");
    if ["kitty", "alacritty", "ghostty", "wezterm", "foot"].iter().any(|t| term.contains(t)) {
        return true;
    }
    // Terminal gained 24-bit colour in macOS 26.
    program == "apple_terminal" && macos_major() >= 26
}

#[cfg(target_os = "macos")]
fn macos_major() -> u32 {
    let name = c"kern.osproductversion";
    let mut buf = [0u8; 32];
    let mut len = buf.len();
    let rc = unsafe {
        libc::sysctlbyname(name.as_ptr(), buf.as_mut_ptr() as *mut libc::c_void, &mut len, std::ptr::null_mut(), 0)
    };
    if rc != 0 {
        return 0;
    }
    let s = String::from_utf8_lossy(&buf[..len.saturating_sub(1)]).into_owned();
    s.split('.').next().and_then(|m| m.parse().ok()).unwrap_or(0)
}

#[cfg(not(target_os = "macos"))]
fn macos_major() -> u32 {
    0
}

/// The closest colour in xterm's 6×6×6 cube or its grey ramp.
pub fn nearest_256(r: u8, g: u8, b: u8) -> u8 {
    const LEVELS: [u8; 6] = [0, 95, 135, 175, 215, 255];
    let level = |v: u8| LEVELS.iter().enumerate().min_by_key(|(_, l)| (**l as i32 - v as i32).abs()).unwrap().0;
    let (ri, gi, bi) = (level(r), level(g), level(b));
    let cube = 16 + 36 * ri + 6 * gi + bi;
    let cube_rgb = (LEVELS[ri], LEVELS[gi], LEVELS[bi]);
    let avg = (r as u32 + g as u32 + b as u32) / 3;
    let grey_i = ((avg as i32 - 8).max(0) / 10).min(23) as u8;
    let grey = 8 + 10 * grey_i;
    let dist = |(a, b2, c): (u8, u8, u8)| {
        let d = |x: u8, y: u8| (x as i32 - y as i32).pow(2);
        d(a, r) + d(b2, g) + d(c, b)
    };
    if dist((grey, grey, grey)) < dist(cube_rgb) { 232 + grey_i } else { cube as u8 }
}

pub fn no_color() -> bool {
    std::env::var_os("NO_COLOR").is_some_and(|v| !v.is_empty())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_theme_is_built_in() {
        let all = embedded();
        assert_eq!(all.len(), 77);
        let tokyo = by_id(&all, DEFAULT).unwrap();
        assert!(tokyo.dark);
        assert_eq!(tokyo.colors.panel, "#1a1b26", "the panel is ooze's background");
        assert!(all.iter().any(|t| !t.dark), "and the light ones");
        let ooze = by_id(&all, "ooze").unwrap();
        assert_eq!((ooze.colors.text.as_str(), ooze.colors.info.as_str(), ooze.colors.warning.as_str()), ("#c0caf5", "#73daca", "#ff9e64"), "ooze's own: its text, its teal, its orange");
    }

    #[test]
    fn colours_for_each_terminal() {
        let tokyo = by_id(&embedded(), DEFAULT).unwrap().clone();
        assert_eq!(Palette::new(&tokyo, Mode::True).accent, Color::Rgb(0x7a, 0xa2, 0xf7));
        assert_eq!(Palette::new(&tokyo, Mode::Ansi256).accent, Color::Indexed(111));
        assert_eq!(Palette::new(&tokyo, Mode::None).accent, Color::Reset);
        assert_eq!(nearest_256(0, 0, 0), 16);
        assert_eq!(nearest_256(255, 255, 255), 231);
    }

    #[test]
    fn a_canvas_names_the_theme_s_variables() {
        let p = Palette::new(by_id(&embedded(), DEFAULT).unwrap(), Mode::True);
        assert_eq!(p.variable("var(--text-3)"), Some(p.text3));
        assert_eq!(p.variable("var(--chart-2)"), Some(p.chart[1]));
        assert_eq!(p.variable("#ff0000"), None);
    }
}

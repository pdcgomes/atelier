//! Images in the terminal. Which protocol a terminal speaks is guessed from
//! its environment and confirmed by asking it (Kitty's graphics query, the
//! cell size, and DA1, whose answer says whether it has Sixel), unless
//! `ATELIER_IMAGES` says (`kitty`, `iterm`, `sixel`, `blocks`). Ghostty,
//! kitty and WezTerm take Kitty's protocol; iTerm2 its own; foot, Windows
//! Terminal and xterm Sixel; everything else gets half blocks. Inside tmux,
//! half blocks, unless passthrough is set up and `ATELIER_IMAGES` says so.

use std::collections::HashMap;
use std::io::{self, Write};
use std::sync::Arc;
use std::time::{Duration, Instant};

use anyhow::{Result, anyhow};
use base64::Engine as _;
use image::{DynamicImage, ImageFormat, RgbaImage};
use ratatui::layout::Rect;

use crate::kit::media::{Loaded, Pixels};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Protocol {
    Kitty,
    Iterm,
    Sixel,
    Blocks,
}

impl Protocol {
    pub fn parse(s: &str) -> Option<Protocol> {
        Some(match s.to_lowercase().as_str() {
            "kitty" => Protocol::Kitty,
            "iterm" | "iterm2" => Protocol::Iterm,
            "sixel" => Protocol::Sixel,
            "blocks" | "none" | "halfblocks" => Protocol::Blocks,
            _ => return None,
        })
    }
    pub fn name(self) -> &'static str {
        match self {
            Protocol::Kitty => "kitty",
            Protocol::Iterm => "iterm",
            Protocol::Sixel => "sixel",
            Protocol::Blocks => "blocks",
        }
    }
}

fn var(k: &str) -> String {
    std::env::var(k).unwrap_or_default()
}

/// What `ATELIER_IMAGES` says, if anything.
pub fn chosen() -> Option<Protocol> {
    Protocol::parse(&var("ATELIER_IMAGES"))
}

/// The protocol a terminal's environment says it has.
pub fn guess() -> Protocol {
    if let Some(p) = chosen() {
        return p;
    }
    if !var("TMUX").is_empty() {
        return Protocol::Blocks;
    }
    let (term, program) = (var("TERM").to_lowercase(), var("TERM_PROGRAM").to_lowercase());
    if term.contains("kitty") || term.contains("ghostty") || !var("KITTY_WINDOW_ID").is_empty() || program == "ghostty"
    {
        Protocol::Kitty
    } else if program == "iterm.app" || var("LC_TERMINAL") == "iTerm2" || program == "wezterm" {
        Protocol::Iterm
    } else if term.contains("foot") || term.contains("mlterm") || !var("WT_SESSION").is_empty() {
        Protocol::Sixel
    } else {
        Protocol::Blocks
    }
}

/// Asks the terminal what it can do, before anything else reads its input; returns the protocol and a cell's size in pixels.
pub fn ask(guessed: Protocol) -> (Protocol, (u16, u16)) {
    let mut out = io::stdout();
    let _ = write!(out, "\x1b_Gi=31,s=1,v=1,a=q,t=d,f=24;AAAA\x1b\\\x1b[16t\x1b[c");
    let _ = out.flush();
    let answer = read_until_da1(Duration::from_millis(400));
    let kitty = answer.contains("_Gi=31;OK");
    let sixel =
        answer.split("\x1b[?").nth(1).map(|da| da.trim_end_matches('c').split(';').any(|p| p == "4")).unwrap_or(false);
    let cell = answer
        .split("\x1b[6;")
        .nth(1)
        .and_then(|r| r.split('t').next())
        .and_then(|r| {
            let mut it = r.split(';').filter_map(|n| n.parse::<u16>().ok());
            let (h, w) = (it.next()?, it.next()?);
            Some((w, h))
        })
        .filter(|(w, h)| *w > 0 && *h > 0)
        .unwrap_or((10, 20));
    let protocol = if chosen().is_some() {
        guessed
    } else if kitty {
        Protocol::Kitty
    } else if guessed == Protocol::Iterm {
        Protocol::Iterm
    } else if sixel {
        Protocol::Sixel
    } else {
        Protocol::Blocks
    };
    (protocol, cell)
}

fn read_until_da1(limit: Duration) -> String {
    let start = Instant::now();
    let mut got = Vec::new();
    while start.elapsed() < limit {
        let mut fds = libc::pollfd { fd: 0, events: libc::POLLIN, revents: 0 };
        let left = limit.saturating_sub(start.elapsed()).as_millis() as i32;
        if unsafe { libc::poll(&mut fds, 1, left.max(1)) } <= 0 {
            break;
        }
        let mut buf = [0u8; 512];
        let n = unsafe { libc::read(0, buf.as_mut_ptr() as *mut libc::c_void, buf.len()) };
        if n <= 0 {
            break;
        }
        got.extend_from_slice(&buf[..n as usize]);
        let text = String::from_utf8_lossy(&got);
        if text.split("\x1b[?").nth(1).is_some_and(|da| da.contains('c')) {
            break;
        }
    }
    String::from_utf8_lossy(&got).into_owned()
}

/// Decodes an image's file, scaled down for a terminal. HEIC, which the image crate can't read, goes through `sips` on a Mac.
pub fn decode(bytes: &[u8], name: &str) -> Result<Pixels> {
    let img = match image::load_from_memory(bytes) {
        Ok(i) => i,
        Err(e) => {
            let lower = name.to_lowercase();
            if (lower.ends_with(".heic") || lower.ends_with(".heif") || lower.ends_with(".avif"))
                && cfg!(target_os = "macos")
            {
                image::load_from_memory(&with_sips(bytes, &lower)?)?
            } else {
                return Err(anyhow!("it isn't an image this can read: {e}"));
            }
        }
    };
    Ok(pixels(img))
}

pub fn pixels(img: DynamicImage) -> Pixels {
    let big = if img.width() > 1600 || img.height() > 1600 { img.thumbnail(1600, 1600) } else { img.clone() };
    let mut png = Vec::new();
    let _ = big.write_to(&mut io::Cursor::new(&mut png), ImageFormat::Png);
    let small = img.thumbnail(240, 240).to_rgba8();
    let full =
        if img.width() > 1200 || img.height() > 1200 { img.thumbnail(1200, 1200).to_rgba8() } else { img.to_rgba8() };
    Pixels { w: small.width(), h: small.height(), rgba: small.into_raw(), png, full }
}

fn with_sips(bytes: &[u8], name: &str) -> Result<Vec<u8>> {
    let dir = cache_dir();
    let ext = name.rsplit('.').next().unwrap_or("heic");
    let input = dir.join(format!("{:016x}.{ext}", hash(bytes)));
    let output = input.with_extension("png");
    std::fs::write(&input, bytes)?;
    let ok = std::process::Command::new("/usr/bin/sips")
        .args(["-s", "format", "png"])
        .arg(&input)
        .arg("--out")
        .arg(&output)
        .output()?
        .status
        .success();
    if !ok {
        return Err(anyhow!("sips couldn't read it"));
    }
    Ok(std::fs::read(output)?)
}

/// Where the viewer keeps what it converts or opens: `~/.atelier/cache/tui`.
pub fn cache_dir() -> std::path::PathBuf {
    let dir = crate::daemon::home().join("cache/tui");
    let _ = std::fs::create_dir_all(&dir);
    dir
}

pub fn hash(bytes: &[u8]) -> u64 {
    bytes.iter().fold(0xcbf29ce484222325u64, |h, b| (h ^ *b as u64).wrapping_mul(0x100000001b3))
}

/// A still from a video, by Quick Look, on a Mac.
pub fn poster(bytes: &[u8], name: &str) -> Option<Pixels> {
    if !cfg!(target_os = "macos") {
        return None;
    }
    let dir = cache_dir();
    let ext = name.rsplit('.').next().unwrap_or("mp4");
    let file = dir.join(format!("{:016x}.{ext}", hash(bytes)));
    std::fs::write(&file, bytes).ok()?;
    let ok = std::process::Command::new("/usr/bin/qlmanage")
        .args(["-t", "-s", "800", "-o"])
        .arg(&dir)
        .arg(&file)
        .output()
        .ok()?
        .status
        .success();
    if !ok {
        return None;
    }
    let png = std::fs::read(dir.join(format!("{}.png", file.file_name()?.to_string_lossy()))).ok()?;
    image::load_from_memory(&png).ok().map(pixels)
}

/// Paints images over the cells the viewer left for them, and takes them away when they move.
pub struct Painter {
    pub protocol: Protocol,
    pub cell: (u16, u16),
    ids: HashMap<String, u32>,
    sent: HashMap<u32, bool>,
    shown: Vec<(String, Rect)>,
}

impl Painter {
    pub fn new(protocol: Protocol, cell: (u16, u16)) -> Painter {
        Painter { protocol, cell, ids: HashMap::new(), sent: HashMap::new(), shown: Vec::new() }
    }

    pub fn graphics(&self) -> bool {
        self.protocol != Protocol::Blocks
    }

    /// Whether what's to be shown differs from what is, so the cells under the old ones need drawing again first.
    pub fn changed(&self, list: &[(String, Rect)]) -> bool {
        list != self.shown.as_slice()
    }

    pub fn paint(
        &mut self,
        out: &mut impl Write,
        list: &[(String, Rect)],
        images: &HashMap<String, Loaded>,
    ) -> io::Result<()> {
        if !self.changed(list) || self.protocol == Protocol::Blocks {
            return Ok(());
        }
        if self.protocol == Protocol::Kitty {
            write!(out, "\x1b_Ga=d,d=a,q=2\x1b\\")?;
        }
        write!(out, "\x1b7")?;
        for (path, r) in list {
            let Some(Loaded::Ready(px)) = images.get(path) else { continue };
            write!(out, "\x1b[{};{}H", r.y + 1, r.x + 1)?;
            match self.protocol {
                Protocol::Kitty => self.kitty(out, path, px, *r)?,
                Protocol::Iterm => iterm(out, px, *r)?,
                Protocol::Sixel => out.write_all(&sixel(
                    &px.full,
                    r.width as u32 * self.cell.0 as u32,
                    r.height as u32 * self.cell.1 as u32,
                ))?,
                Protocol::Blocks => {}
            }
        }
        write!(out, "\x1b8")?;
        out.flush()?;
        self.shown = list.to_vec();
        Ok(())
    }

    fn kitty(&mut self, out: &mut impl Write, path: &str, px: &Arc<Pixels>, r: Rect) -> io::Result<()> {
        let next = self.ids.len() as u32 + 1;
        let id = *self.ids.entry(path.to_string()).or_insert(next);
        if self.sent.contains_key(&id) {
            return write!(out, "\x1b_Ga=p,i={id},q=2,c={},r={},C=1\x1b\\", r.width, r.height);
        }
        let data = base64::engine::general_purpose::STANDARD.encode(&px.png);
        let chunks: Vec<&[u8]> = data.as_bytes().chunks(4096).collect();
        for (i, chunk) in chunks.iter().enumerate() {
            let more = u8::from(i + 1 < chunks.len());
            if i == 0 {
                write!(out, "\x1b_Ga=T,f=100,i={id},q=2,c={},r={},C=1,m={more};", r.width, r.height)?;
            } else {
                write!(out, "\x1b_Gm={more};")?;
            }
            out.write_all(chunk)?;
            write!(out, "\x1b\\")?;
        }
        self.sent.insert(id, true);
        Ok(())
    }

    /// Takes every image away, as the viewer ends.
    pub fn clear(&mut self, out: &mut impl Write) -> io::Result<()> {
        if self.protocol == Protocol::Kitty {
            write!(out, "\x1b_Ga=d,d=A,q=2\x1b\\")?;
            out.flush()?;
        }
        self.shown.clear();
        Ok(())
    }

    /// Forgets what's shown, after the screen was drawn again from nothing.
    pub fn forget(&mut self) {
        self.shown.clear();
    }
}

fn iterm(out: &mut impl Write, px: &Pixels, r: Rect) -> io::Result<()> {
    let data = base64::engine::general_purpose::STANDARD.encode(&px.png);
    write!(
        out,
        "\x1b]1337;File=inline=1;size={};width={};height={};preserveAspectRatio=0:{data}\x07",
        px.png.len(),
        r.width,
        r.height
    )
}

/// An image as Sixel, `w`×`h` pixels, in the 216 colours of a 6×6×6 cube.
pub fn sixel(img: &RgbaImage, w: u32, h: u32) -> Vec<u8> {
    let (w, h) = (w.max(1), h.max(1));
    let scaled = image::imageops::resize(img, w, h, image::imageops::FilterType::Triangle);
    let level = |v: u8| ((v as u32 * 5 + 127) / 255) as usize;
    let index: Vec<Option<usize>> = scaled
        .pixels()
        .map(|p| (p.0[3] >= 128).then(|| level(p.0[0]) * 36 + level(p.0[1]) * 6 + level(p.0[2])))
        .collect();
    let mut out = format!("\x1bPq\"1;1;{w};{h}").into_bytes();
    let mut used = [false; 216];
    for i in index.iter().flatten() {
        used[*i] = true;
    }
    for (i, _) in used.iter().enumerate().filter(|(_, u)| **u) {
        let (r, g, b) = (i / 36, i / 6 % 6, i % 6);
        out.extend(format!("#{i};2;{};{};{}", r * 20, g * 20, b * 20).bytes());
    }
    for band in 0..h.div_ceil(6) {
        let mut colours: Vec<usize> = Vec::new();
        for y in band * 6..(band * 6 + 6).min(h) {
            for x in 0..w {
                if let Some(c) = index[(y * w + x) as usize]
                    && !colours.contains(&c)
                {
                    colours.push(c);
                }
            }
        }
        for c in colours {
            out.extend(format!("#{c}").bytes());
            let mut run: Option<(u8, u32)> = None;
            let flush = |out: &mut Vec<u8>, run: Option<(u8, u32)>| {
                if let Some((ch, n)) = run {
                    if n > 3 {
                        out.extend(format!("!{n}{}", ch as char).bytes());
                    } else {
                        out.extend(std::iter::repeat_n(ch, n as usize));
                    }
                }
            };
            for x in 0..w {
                let mut bits = 0u8;
                for k in 0..6 {
                    let y = band * 6 + k;
                    if y < h && index[(y * w + x) as usize] == Some(c) {
                        bits |= 1 << k;
                    }
                }
                let ch = 63 + bits;
                run = match run {
                    Some((p, n)) if p == ch => Some((p, n + 1)),
                    other => {
                        flush(&mut out, other);
                        Some((ch, 1))
                    }
                };
            }
            flush(&mut out, run);
            out.push(b'$');
        }
        out.push(b'-');
    }
    out.extend(b"\x1b\\");
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_red_square_in_sixel() {
        let img = RgbaImage::from_pixel(4, 6, image::Rgba([255, 0, 0, 255]));
        let s = String::from_utf8(sixel(&img, 4, 6)).unwrap();
        assert!(s.starts_with("\x1bPq\"1;1;4;6"));
        assert!(s.contains("#180;2;100;0;0"), "red is the cube's 180th colour");
        assert!(s.contains("!4~"), "four columns of six pixels, in one run");
        assert!(s.ends_with("\x1b\\"));
    }

    #[test]
    fn protocols_by_name() {
        assert_eq!(Protocol::parse("Kitty"), Some(Protocol::Kitty));
        assert_eq!(Protocol::parse("none"), Some(Protocol::Blocks));
        assert_eq!(Protocol::parse("svg"), None);
    }
}

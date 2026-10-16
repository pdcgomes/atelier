//! One frame of the viewer, after some keys, as text or with its colours as
//! ANSI escapes: for tests, for agents to see how a canvas reads in a
//! terminal, and for scripts/capture.py, which makes the README's pictures.

use std::time::{Duration, Instant};

use anyhow::Result;
use ratatui::Terminal;
use ratatui::backend::TestBackend;
use ratatui::buffer::Buffer;
use ratatui::crossterm::event::{KeyCode, KeyEvent, KeyModifiers};
use ratatui::style::{Color, Modifier};

use crate::app::{App, Link, Source};
use crate::chrome;

/// Keys as `--keys` spells them: letters as they are, `\t` or `<tab>`, `\n` or `<enter>`, `<esc>`, `<s-tab>`,
/// `<up>`, `<down>`, `<left>`, `<right>`, `<pgdn>`, `<pgup>`, `<space>`, `<bs>`, and `<wait>` for a confirm sheet to arm.
pub fn keys(spec: &str) -> Vec<Option<KeyEvent>> {
    let mut out = Vec::new();
    let mut chars = spec.chars();
    while let Some(c) = chars.next() {
        let code = match c {
            '<' => {
                let name: String = chars.by_ref().take_while(|c| *c != '>').collect();
                match name.as_str() {
                    "tab" => KeyCode::Tab,
                    "s-tab" => KeyCode::BackTab,
                    "enter" => KeyCode::Enter,
                    "esc" => KeyCode::Esc,
                    "up" => KeyCode::Up,
                    "down" => KeyCode::Down,
                    "left" => KeyCode::Left,
                    "right" => KeyCode::Right,
                    "pgdn" => KeyCode::PageDown,
                    "pgup" => KeyCode::PageUp,
                    "space" => KeyCode::Char(' '),
                    "bs" => KeyCode::Backspace,
                    "wait" => {
                        out.push(None);
                        continue;
                    }
                    _ => continue,
                }
            }
            '\\' => match chars.next() {
                Some('t') => KeyCode::Tab,
                Some('n') => KeyCode::Enter,
                Some(o) => KeyCode::Char(o),
                None => continue,
            },
            '\t' => KeyCode::Tab,
            '\n' => KeyCode::Enter,
            o => KeyCode::Char(o),
        };
        out.push(Some(KeyEvent::new(
            code,
            if code == KeyCode::BackTab { KeyModifiers::SHIFT } else { KeyModifiers::NONE },
        )));
    }
    out
}

fn ready(app: &App) -> bool {
    match &app.source {
        Source::Fixtures { .. } => true,
        Source::Daemon(_) => {
            matches!(app.link, Link::Down(_))
                || app.current.as_ref().is_some_and(|c| c.running() || !c.problems.is_empty())
        }
    }
}

fn settle(app: &mut App) {
    for _ in 0..4 {
        app.step();
        if let Some(c) = &mut app.current {
            c.settle();
        }
    }
    app.step();
}

/// Draws the viewer at a size, after pressing `spec`'s keys.
pub fn run(app: &mut App, width: u16, height: u16, spec: &str, ansi: bool, full: bool) -> Result<String> {
    let start = Instant::now();
    while !ready(app) && start.elapsed() < Duration::from_secs(8) {
        app.step();
        std::thread::sleep(Duration::from_millis(20));
    }
    settle(app);
    let mut term = Terminal::new(TestBackend::new(width, height))?;
    term.draw(|f| chrome::draw(app, f))?;
    for k in keys(spec) {
        match k {
            None => std::thread::sleep(App::ARMING + Duration::from_millis(50)),
            Some(k) => {
                app.on_key(k);
                settle(app);
                term.draw(|f| chrome::draw(app, f))?;
            }
        }
    }
    if full {
        let tall = (app.body.y + app.height + 1).max(height);
        term = Terminal::new(TestBackend::new(width, tall))?;
        term.draw(|f| chrome::draw(app, f))?;
    }
    let waiting = Instant::now();
    let loading = |app: &App| app.images().values().any(|l| matches!(l, crate::kit::media::Loaded::Loading));
    while (app.writing > 0 || loading(app)) && waiting.elapsed() < Duration::from_secs(5) {
        app.step();
        std::thread::sleep(Duration::from_millis(10));
    }
    term.draw(|f| chrome::draw(app, f))?;
    let buf = term.backend().buffer().clone();
    Ok(if ansi { to_ansi(&buf) } else { crate::view::text(&buf) })
}

fn sgr(c: Color, fg: bool) -> String {
    let base = if fg { 38 } else { 48 };
    match c {
        Color::Rgb(r, g, b) => format!("{base};2;{r};{g};{b}"),
        Color::Indexed(i) => format!("{base};5;{i}"),
        _ => format!("{}", if fg { 39 } else { 49 }),
    }
}

/// A buffer as text with SGR escapes, written only where the style changes.
pub fn to_ansi(buf: &Buffer) -> String {
    let mut out = String::new();
    for y in 0..buf.area.height {
        let mut last: Option<(Color, Color, Modifier)> = None;
        for x in 0..buf.area.width {
            let cell = &buf[(x, y)];
            let style = (cell.fg, cell.bg, cell.modifier);
            if last != Some(style) {
                let mut codes = vec!["0".to_string(), sgr(cell.fg, true), sgr(cell.bg, false)];
                if cell.modifier.contains(Modifier::BOLD) {
                    codes.push("1".into());
                }
                if cell.modifier.contains(Modifier::ITALIC) {
                    codes.push("3".into());
                }
                if cell.modifier.contains(Modifier::UNDERLINED) {
                    codes.push("4".into());
                }
                if cell.modifier.contains(Modifier::REVERSED) {
                    codes.push("7".into());
                }
                out.push_str(&format!("\x1b[{}m", codes.join(";")));
                last = Some(style);
            }
            out.push_str(cell.symbol());
        }
        out.push_str("\x1b[0m\n");
    }
    out
}

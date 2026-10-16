//! The conformance frames: every fixture (each component on its own, the
//! gallery tab by tab, every template's example, the other examples tab by
//! tab), as scripts/fixtures.mjs writes them, drawn at 80, 120 and 160
//! columns, or at the widths a fixture names, and
//! kept as text in tests/frames/, so a change to how anything draws shows in
//! review. Nothing may be drawn as unknown, no canvas may stop with an
//! error, no line may run past its width, and in a dark and a light theme no
//! text may be the colour of what's behind it.
//!
//! `UPDATE_FRAMES=1 cargo test --test frames` writes the frames again.

use std::path::PathBuf;
use std::sync::Once;

use atelier_tui::canvas::Canvas;
use atelier_tui::engine::Clock;
use atelier_tui::render::Ui;
use atelier_tui::theme::{Mode, Palette, by_id, embedded};
use atelier_tui::view;
use serde_json::Value;

const NOW: i64 = 1_792_141_200_000;
const WIDTHS: [u16; 3] = [80, 120, 160];

fn root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..")
}

unsafe extern "C" {
    fn tzset();
}

fn utc() {
    static ONCE: Once = Once::new();
    ONCE.call_once(|| unsafe {
        std::env::set_var("TZ", "UTC");
        tzset();
    });
}

fn runtime() -> String {
    std::fs::read_to_string(root().join("packages/daemon/dist/terminal.js"))
        .expect("packages/daemon/dist/terminal.js: run `node scripts/build.mjs` first")
}

fn fixtures() -> Vec<Value> {
    let dir = root().join("build/terminal/fixtures");
    let mut list: Vec<Value> = std::fs::read_dir(&dir)
        .expect("build/terminal/fixtures: run `node scripts/fixtures.mjs` first")
        .flatten()
        .filter(|e| e.path().extension().is_some_and(|x| x == "json"))
        .map(|e| serde_json::from_str(&std::fs::read_to_string(e.path()).unwrap()).unwrap())
        .collect();
    list.sort_by(|a, b| a["name"].as_str().cmp(&b["name"].as_str()));
    assert!(list.len() > 50, "every component, the gallery and the templates");
    list
}

fn theme(id: &str) -> (Palette, Value) {
    let themes = embedded();
    let json: Vec<Value> = serde_json::from_str(include_str!("../../packages/themes/themes.json")).unwrap();
    (Palette::new(by_id(&themes, id).unwrap(), Mode::True), json.into_iter().find(|t| t["id"] == id).unwrap())
}

fn start(f: &Value, js: &str, theme: &Value) -> Canvas {
    let c = Canvas::from_fixture(f, js, Clock::Fixed(NOW), theme).unwrap();
    let name = f["name"].as_str().unwrap();
    assert!(c.crash.is_none(), "{name} stopped with an error: {:?}", c.crash);
    assert!(c.problems.is_empty(), "{name} didn't build");
    assert!(!c.tree.is_empty(), "{name} drew something");
    c
}

#[test]
fn every_fixture_draws_as_its_frame_says() {
    utc();
    let js = runtime();
    let (pal, theme_json) = theme("tokyo-night");
    let update = std::env::var_os("UPDATE_FRAMES").is_some();
    let dir = root().join("tui/tests/frames");
    std::fs::create_dir_all(&dir).unwrap();
    let mut differ = Vec::new();
    for f in fixtures() {
        let name = f["name"].as_str().unwrap().to_string();
        let c = start(&f, &js, &theme_json);
        let widths: Vec<u16> = f["widths"]
            .as_array()
            .map(|list| list.iter().filter_map(|w| w.as_u64().map(|w| w as u16)).collect())
            .unwrap_or_else(|| WIDTHS.to_vec());
        for w in widths {
            let text = view::snapshot(&c.tree, &pal, &Ui::default(), w, NOW);
            assert!(
                !text.contains("isn't drawn by this atelier-tui"),
                "{name} at {w} has something this doesn't draw:\n{text}"
            );
            for (i, line) in text.lines().enumerate() {
                assert!(
                    atelier_tui::fmt::width(line) <= w as usize,
                    "{name} at {w}: line {} is {} wide",
                    i + 1,
                    atelier_tui::fmt::width(line)
                );
            }
            let file = dir.join(format!("{name}@{w}.txt"));
            if update {
                std::fs::write(&file, &text).unwrap();
            } else if std::fs::read_to_string(&file).ok().as_deref() != Some(text.as_str()) {
                differ.push(format!("{name}@{w}"));
            }
        }
    }
    assert!(
        differ.is_empty(),
        "these draw differently from their frames in tui/tests/frames: {differ:?}. If the change is meant, UPDATE_FRAMES=1 cargo test --test frames writes them again; review the diff."
    );
}

#[test]
fn no_text_is_the_colour_of_what_is_behind_it_in_a_dark_theme_or_a_light_one() {
    utc();
    let js = runtime();
    for id in ["tokyo-night", "ooze", "catppuccin-latte", "flexoki-light"] {
        let (pal, theme_json) = theme(id);
        for f in fixtures() {
            let name = f["name"].as_str().unwrap();
            let c = start(&f, &js, &theme_json);
            let frame = view::Frame {
                tree: &c.tree,
                pal: &pal,
                ui: &Ui::default(),
                width: 120,
                rows: 1,
                top: 0,
                now: NOW,
                focus: None,
                edit: None,
            };
            let h = view::height(&frame).max(1);
            let drawn = view::draw(view::Frame { rows: h, ..frame });
            for y in 0..drawn.buf.area.height {
                for x in 0..drawn.buf.area.width {
                    let cell = &drawn.buf[(x, y)];
                    if cell.symbol().trim().is_empty() || "▀▄█▁▂▃▄▅▆▇".contains(cell.symbol()) {
                        continue;
                    }
                    assert_ne!(
                        cell.fg,
                        cell.bg,
                        "{name} in {id}: '{}' at {x},{y} is the colour of its background",
                        cell.symbol()
                    );
                }
            }
        }
    }
}

#[test]
fn the_kit_draws_the_same_in_every_theme() {
    utc();
    let js = runtime();
    let f = fixtures().into_iter().find(|f| f["name"] == "gallery-core").unwrap();
    let mut seen: Option<String> = None;
    for id in ["tokyo-night", "catppuccin-latte", "gruvbox", "white"] {
        let (pal, theme_json) = theme(id);
        let c = start(&f, &js, &theme_json);
        let text = view::snapshot(&c.tree, &pal, &Ui::default(), 120, NOW);
        if let Some(s) = &seen {
            assert_eq!(s, &text, "the layout is the theme's to colour, not to change ({id})");
        }
        seen = Some(text);
    }
}

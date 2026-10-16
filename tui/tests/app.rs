//! The viewer with keys, as you'd use it, on the preview's fixtures: focus
//! moves to what can be pressed, typing goes into fields, what a canvas asks
//! for waits for you, and the theme previews as you move.

use std::path::PathBuf;
use std::time::Duration;

use atelier_tui::app::{App, Options, Overlay, Source};
use atelier_tui::chrome;
use atelier_tui::engine::Clock;
use atelier_tui::images::Protocol;
use atelier_tui::render::Kind;
use atelier_tui::snapshot::keys;
use atelier_tui::theme::Mode;
use ratatui::Terminal;
use ratatui::backend::TestBackend;
use serde_json::Value;

fn root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..")
}

fn app(first: &str) -> (App, Terminal<TestBackend>) {
    let dir = root().join("build/terminal/fixtures");
    let list: Vec<Value> = std::fs::read_dir(&dir)
        .expect("run `node scripts/fixtures.mjs` first")
        .flatten()
        .filter(|e| e.path().extension().is_some_and(|x| x == "json"))
        .map(|e| serde_json::from_str(&std::fs::read_to_string(e.path()).unwrap()).unwrap())
        .collect();
    let runtime = std::fs::read_to_string(root().join("packages/daemon/dist/terminal.js"))
        .expect("run `node scripts/build.mjs` first");
    let mut app = App::new(
        Source::Fixtures { list, files: dir.join("files") },
        Options {
            canvas: Some(first.into()),
            theme: None,
            clock: Clock::Fixed(1_792_141_200_000),
            locale: "en-GB".into(),
            mode: Mode::True,
            runtime: Some(runtime),
            protocol: Protocol::Blocks,
            cell: (10, 20),
        },
    );
    app.overlay = None;
    let mut term = Terminal::new(TestBackend::new(120, 40)).unwrap();
    term.draw(|f| chrome::draw(&mut app, f)).unwrap();
    (app, term)
}

fn press(app: &mut App, term: &mut Terminal<TestBackend>, spec: &str) {
    for k in keys(spec) {
        match k {
            None => std::thread::sleep(App::ARMING + Duration::from_millis(50)),
            Some(k) => app.on_key(k),
        }
        app.step();
        term.draw(|f| chrome::draw(app, f)).unwrap();
    }
}

fn state(app: &App, key: &str) -> Value {
    app.current.as_ref().unwrap().state.get(key).cloned().unwrap_or(Value::Null)
}

fn screen(term: &Terminal<TestBackend>) -> String {
    atelier_tui::view::text(term.backend().buffer())
}

#[test]
fn tab_moves_to_a_checkbox_and_space_ticks_it() {
    let (mut app, mut term) = app("component-Checkbox");
    press(&mut app, &mut term, "\t");
    assert_eq!(app.focused_target().map(|t| t.kind), Some(Kind::Check));
    press(&mut app, &mut term, "<space>");
    assert_eq!(state(&app, "sample-check"), Value::Bool(true), "the tick is kept in the canvas's state");
    assert!(screen(&term).contains("☑ Write tests first"));
    press(&mut app, &mut term, "<space>");
    assert_eq!(state(&app, "sample-check"), Value::Bool(false));
}

#[test]
fn a_note_is_typed_into_its_field_and_goes_with_the_approval() {
    let (mut app, mut term) = app("component-Approval");
    press(&mut app, &mut term, "\t");
    assert!(app.edit.is_some(), "the note's field is the first thing to focus, and focusing it starts typing");
    press(&mut app, &mut term, "Tighter hook\t");
    assert!(app.edit.is_none());
    press(&mut app, &mut term, "\n");
    let mark = state(&app, "approval:sample-cut");
    assert_eq!(mark["state"], "approved");
    assert_eq!(mark["note"], "Tighter hook");
    assert!(screen(&term).contains("Approved"));
}

#[test]
fn an_agent_starts_only_once_you_say_so_and_not_from_a_key_already_on_its_way() {
    let (mut app, mut term) = app("component-NeedsYou");
    // The command's copy, Done, Skip, Ask the agent.
    press(&mut app, &mut term, "\t\t\t\t\n");
    assert!(app.confirm.is_some(), "Ask the agent asks first");
    assert!(screen(&term).contains("Start Claude Code in"));
    assert!(
        screen(&term).contains("Take on this item from the canvas: Add the Cloudflare token."),
        "with the whole prompt"
    );
    press(&mut app, &mut term, "y");
    assert!(app.confirm.is_some(), "a y straight away doesn't count: the sheet isn't armed yet");
    press(&mut app, &mut term, "b<wait>y");
    assert!(app.confirm.is_none());
    assert!(screen(&term).contains("Nothing runs in the preview"));
    assert_eq!(state(&app, "needsYou"), Value::Null, "the preview didn't start one, so it isn't marked asked");
}

#[test]
fn any_other_key_leaves_it_as_it_is() {
    let (mut app, mut term) = app("component-NeedsYou");
    press(&mut app, &mut term, "\t\t\t\t\n<wait>x");
    assert!(app.confirm.is_none());
    assert!(screen(&term).contains("left as it is"));
}

#[test]
fn themes_preview_as_you_move_and_esc_puts_yours_back() {
    let (mut app, mut term) = app("component-Panel");
    let mine = app.pal.name.clone();
    press(&mut app, &mut term, "t<down><down>");
    assert!(matches!(app.overlay, Some(Overlay::Themes { .. })));
    assert_ne!(app.pal.name, mine, "the theme under the cursor is on screen");
    press(&mut app, &mut term, "<esc>");
    assert_eq!(app.pal.name, mine);
    press(&mut app, &mut term, "tgruv\n");
    assert_eq!(app.theme_id, "gruvbox");
}

#[test]
fn the_canvas_scrolls_and_the_home_lists_every_fixture() {
    let (mut app, mut term) = app("gallery-charts");
    press(&mut app, &mut term, "<pgdn>");
    assert!(app.scroll > 0);
    press(&mut app, &mut term, "0");
    assert!(screen(&term).contains("Components"), "{}", screen(&term));
    assert!(screen(&term).contains("Templates") || app.home_list().iter().any(|c| c["project"] == "Templates"));
}

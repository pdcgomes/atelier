//! atelier-tui: Atelier's canvases in a terminal.

use std::io::Write;
use std::path::PathBuf;
use std::time::{Duration, Instant};

use anyhow::{Context, Result, anyhow};
use clap::{Parser, Subcommand};
use ratatui::crossterm::event::{
    self, DisableBracketedPaste, DisableMouseCapture, EnableBracketedPaste, EnableMouseCapture, Event as Input,
};
use ratatui::crossterm::execute;
use serde_json::Value;

use atelier_tui::app::{App, Options, Source};
use atelier_tui::daemon::Client;
use atelier_tui::engine::Clock;
use atelier_tui::images::{self, Painter, Protocol};
use atelier_tui::theme::Mode;
use atelier_tui::{chrome, snapshot};

#[derive(Parser)]
#[command(
    name = "atelier-tui",
    version,
    about = "Atelier's canvases in a terminal, from the daemon the browser uses: every component of the kit, in every theme"
)]
struct Cli {
    #[command(subcommand)]
    command: Option<Command>,
    /// A canvas to open: its path, or its id.
    canvas: Option<String>,
    #[command(flatten)]
    common: Common,
}

#[derive(Subcommand)]
enum Command {
    /// The preview harness: every component on its own, the gallery, the templates and the examples,
    /// from build/terminal/fixtures (`node scripts/fixtures.mjs`), without a daemon.
    Demo {
        /// The fixture to open first, such as `component-Table` or `workstream`.
        fixture: Option<String>,
        /// Where the fixtures are.
        #[arg(long)]
        fixtures: Option<PathBuf>,
        #[command(flatten)]
        common: Common,
    },
}

#[derive(clap::Args, Clone)]
struct Common {
    /// A theme by its id, for now; `atelier themes` lists them.
    #[arg(long)]
    theme: Option<String>,
    /// How images are drawn: kitty, iterm, sixel or blocks. Else what the terminal says it can do.
    #[arg(long)]
    images: Option<String>,
    /// terminal.js to run canvases with, instead of the daemon's.
    #[arg(long)]
    runtime: Option<PathBuf>,
    /// Prints one frame as text, after `--keys`, and exits.
    #[arg(long)]
    snapshot: bool,
    #[arg(long, default_value_t = 120)]
    width: u16,
    #[arg(long, default_value_t = 40)]
    height: u16,
    /// Keys to press first: letters as they are, `\t` or <tab>, `\n` or <enter>, <esc>, <s-tab>, <up>, <down>, <left>, <right>, <pgdn>, <pgup>, <space>, <wait>.
    #[arg(long, default_value = "")]
    keys: String,
    /// With colours, as ANSI escapes.
    #[arg(long)]
    ansi: bool,
    /// As tall as the whole canvas.
    #[arg(long)]
    full: bool,
    /// The time the canvas sees, as ISO; a snapshot's is fixed.
    #[arg(long)]
    now: Option<String>,
}

fn locale() -> String {
    let lang = ["LC_ALL", "LC_TIME", "LANG"]
        .iter()
        .filter_map(|k| std::env::var(k).ok())
        .find(|v| !v.is_empty())
        .unwrap_or_default();
    if lang.contains("_US") { "en-US".into() } else { "en-GB".into() }
}

fn here() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..")
}

fn local_runtime(given: &Option<PathBuf>) -> Option<String> {
    let candidates = [
        given.clone(),
        std::env::var_os("ATELIER_DIST").map(|d| PathBuf::from(d).join("terminal.js")),
        Some(here().join("packages/daemon/dist/terminal.js")),
    ];
    candidates.into_iter().flatten().find_map(|p| std::fs::read_to_string(p).ok())
}

const SNAPSHOT_NOW: &str = "2026-10-16T09:00:00Z";

fn clock(c: &Common) -> Result<Clock> {
    match (&c.now, c.snapshot) {
        (Some(t), _) => Ok(Clock::Fixed(
            chrono::DateTime::parse_from_rfc3339(t).context("--now is an ISO time")?.timestamp_millis(),
        )),
        (None, true) => Ok(Clock::Fixed(chrono::DateTime::parse_from_rfc3339(SNAPSHOT_NOW)?.timestamp_millis())),
        (None, false) => Ok(Clock::Real),
    }
}

fn fixtures(dir: &Option<PathBuf>) -> Result<(Vec<Value>, PathBuf)> {
    let dir = dir.clone().unwrap_or_else(|| here().join("build/terminal/fixtures"));
    let mut list: Vec<Value> = Vec::new();
    let entries = std::fs::read_dir(&dir).map_err(|_| anyhow!("There are no fixtures in {}: run `node scripts/build.mjs && node scripts/fixtures.mjs` in the atelier repository first.", dir.display()))?;
    for e in entries.flatten() {
        let p = e.path();
        if p.extension().is_some_and(|x| x == "json") {
            list.push(
                serde_json::from_str(&std::fs::read_to_string(&p)?)
                    .with_context(|| format!("{} isn't a fixture", p.display()))?,
            );
        }
    }
    let order = |v: &Value| match v["group"].as_str() {
        Some("Components") => 0,
        Some("Gallery") => 1,
        Some("Templates") => 2,
        _ => 3,
    };
    list.sort_by(|a, b| order(a).cmp(&order(b)).then(a["name"].as_str().cmp(&b["name"].as_str())));
    Ok((list, dir.join("files")))
}

fn main() -> Result<()> {
    let cli = Cli::parse();
    let (source, common, first) = match cli.command {
        Some(Command::Demo { fixture, fixtures: dir, common }) => {
            let (list, files) = fixtures(&dir)?;
            (Source::Fixtures { list, files }, common, fixture)
        }
        None => (Source::Daemon(Client::new()), cli.common, cli.canvas),
    };
    let mode = Mode::detect();
    let chosen = common.images.as_deref().and_then(Protocol::parse).or_else(images::chosen);
    let runtime = local_runtime(&common.runtime);
    if matches!(source, Source::Fixtures { .. }) && runtime.is_none() {
        return Err(anyhow!(
            "There's no terminal.js to run canvases with: run `node scripts/build.mjs` in the atelier repository, or pass --runtime."
        ));
    }
    let opts = Options {
        canvas: first,
        theme: common.theme.clone(),
        clock: clock(&common)?,
        locale: locale(),
        mode: if common.snapshot { Mode::True } else { mode },
        runtime: if matches!(source, Source::Fixtures { .. }) || common.runtime.is_some() {
            runtime.clone()
        } else {
            None
        },
        protocol: if common.snapshot { Protocol::Blocks } else { chosen.unwrap_or(Protocol::Blocks) },
        cell: (10, 20),
    };
    if common.snapshot {
        let mut app = App::new(source, opts);
        app.runtime_fallback(runtime);
        let out = snapshot::run(&mut app, common.width, common.height, &common.keys, common.ansi, common.full)?;
        print!("{out}");
        return Ok(());
    }
    let guessed = chosen.unwrap_or_else(images::guess);
    drive(source, opts, guessed, runtime)
}

fn drive(source: Source, opts: Options, guessed: Protocol, fallback: Option<String>) -> Result<()> {
    let mut terminal = ratatui::init();
    let _ = execute!(std::io::stdout(), EnableMouseCapture, EnableBracketedPaste);
    let (protocol, cell) = images::ask(guessed);
    let mut app = App::new(source, Options { protocol, cell, ..opts });
    app.runtime_fallback(fallback);
    app.painter = Painter::new(protocol, cell);
    app.ui.graphics = app.painter.graphics();
    let result = (|| -> Result<()> {
        let mut last = Instant::now() - Duration::from_secs(1);
        loop {
            app.step();
            if app.dirty || last.elapsed() >= Duration::from_secs(1) {
                terminal.draw(|f| chrome::draw(&mut app, f))?;
                if app.painter.changed(&app.placements)
                    && matches!(app.painter.protocol, Protocol::Iterm | Protocol::Sixel)
                {
                    terminal.clear()?;
                    terminal.draw(|f| chrome::draw(&mut app, f))?;
                    app.painter.forget();
                }
                let placements = app.placements.clone();
                let images = app.images().clone();
                app.painter.paint(&mut std::io::stdout(), &placements, &images)?;
                app.dirty = false;
                last = Instant::now();
            }
            if event::poll(app.wake().min(Duration::from_millis(50)))? {
                match event::read()? {
                    Input::Key(k) => app.on_key(k),
                    Input::Mouse(m) => app.on_mouse(m),
                    Input::Paste(text) => app.paste(&text),
                    Input::Resize(..) => {
                        app.painter.forget();
                        terminal.clear()?;
                        app.dirty = true;
                    }
                    _ => {}
                }
            }
            if app.quit {
                break;
            }
        }
        Ok(())
    })();
    let _ = app.painter.clear(&mut std::io::stdout());
    let _ = execute!(std::io::stdout(), DisableMouseCapture, DisableBracketedPaste);
    ratatui::restore();
    let _ = std::io::stdout().flush();
    result
}

//! The viewer: the canvases the daemon knows (or, for the preview harness,
//! the fixtures), the one on screen, the theme, the overlays, and what keys
//! and the mouse do. It's the browser's viewer (packages/viewer) in a
//! terminal, in ooze's look; chrome.rs draws it.

use std::collections::{HashMap, HashSet};
use std::path::PathBuf;
use std::sync::Arc;
use std::sync::mpsc::{Receiver, Sender, channel};
use std::time::{Duration, Instant};

use ratatui::crossterm::event::{
    KeyCode, KeyEvent, KeyEventKind, KeyModifiers, MouseButton, MouseEvent, MouseEventKind,
};
use ratatui::layout::Rect;
use serde_json::{Value, json};

use crate::canvas::{Action, Ask, Canvas};
use crate::daemon::{Client, Event, escape};
use crate::engine::Clock;
use crate::images::{self, Painter, Protocol};
use crate::kit::media::{Loaded, Pixels};
use crate::kit::{self, Press};
use crate::render::{Act, Edit, Hit, Key, Kind, Target, Ui};
use crate::theme::{self, Mode, Palette, Theme};
use crate::tree::{self, Child, walk};

/// Reads a file a canvas shows, on a thread of its own.
type Fetcher = Box<dyn Fn(&str) -> Result<Vec<u8>, String> + Send>;

/// Where the canvases come from.
pub enum Source {
    Daemon(Client),
    /// The preview harness: fixtures written by scripts/fixtures.mjs, and their files.
    Fixtures {
        list: Vec<Value>,
        files: PathBuf,
    },
}

impl Source {
    pub fn is_daemon(&self) -> bool {
        matches!(self, Source::Daemon(_))
    }
}

#[derive(Debug, Clone, PartialEq)]
pub enum Link {
    Connecting,
    Up,
    Down(String),
}

pub enum Overlay {
    Home { sel: usize },
    Find { query: String, sel: usize },
    Themes { query: String, sel: usize },
    Keys,
    Runs { sel: usize, open: Option<String>, steps: Vec<Value> },
    Pick { node: u64, sel: usize },
    Document { title: String, path: String, doc: Option<Box<Canvas>>, scroll: i32 },
}

pub struct Confirm {
    pub ask: Ask,
    pub opened: Instant,
    /// For a new session: where it runs, which you can change here.
    pub mode: String,
}

/// What a thread working for the viewer hands back.
enum Done {
    Image(String, Loaded),
    Written(String, String, Result<(), String>),
    Acted(String, String, Result<Value, String>),
}

pub struct Options {
    pub canvas: Option<String>,
    pub theme: Option<String>,
    pub clock: Clock,
    pub locale: String,
    pub mode: Mode,
    pub runtime: Option<String>,
    pub protocol: Protocol,
    pub cell: (u16, u16),
}

pub struct App {
    pub source: Source,
    pub themes: Vec<Theme>,
    themes_json: Vec<Value>,
    pub theme_id: String,
    /// A theme named on the command line, which every canvas is shown in until another is picked.
    pub forced: bool,
    pub preview: Option<String>,
    pub pal: Palette,
    pub mode: Mode,
    pub canvases: Vec<Value>,
    pub sessions: Value,
    pub runs: Vec<Value>,
    pub current: Option<Canvas>,
    runtime: Option<Arc<String>>,
    runtime_tag: Option<String>,
    pub clock: Clock,
    locale: String,
    pub link: Link,
    pub version: String,
    /// Components the daemon's kit has that this viewer doesn't draw.
    pub unknown: Vec<String>,
    pub scroll: i32,
    pub focus: Option<Key>,
    pub edit: Option<Edit>,
    pub ui: Ui,
    pub overlay: Option<Overlay>,
    pub confirm: Option<Confirm>,
    pub flash: Option<(String, Instant)>,
    pub quit: bool,
    /// What the last frame drew: where things are, for keys and the mouse.
    pub targets: Vec<Target>,
    pub hits: Vec<Hit>,
    pub body: Rect,
    pub height: u16,
    pub placements: Vec<(String, Rect)>,
    pub painter: Painter,
    events: Option<Receiver<Event>>,
    done_tx: Sender<Done>,
    done_rx: Receiver<Done>,
    wanted: HashSet<String>,
    started: Instant,
    pending_canvas: Option<String>,
    /// State writes on their way to the daemon.
    pub writing: usize,
    pub dirty: bool,
}

const VIEWABLE: [&str; 9] = ["png", "jpg", "jpeg", "gif", "webp", "avif", "heic", "md", "markdown"];
const VIDEO: [&str; 4] = ["mp4", "m4v", "mov", "webm"];

fn ext(path: &str) -> String {
    path.rsplit('.').next().unwrap_or("").to_lowercase()
}

impl App {
    pub fn new(source: Source, opts: Options) -> App {
        let themes = theme::embedded();
        let themes_json: Vec<Value> =
            serde_json::from_str(include_str!("../../packages/themes/themes.json")).unwrap_or_default();
        let theme_id = opts.theme.clone().unwrap_or_else(|| theme::DEFAULT.to_string());
        let pal = Palette::new(theme::by_id(&themes, &theme_id).unwrap_or(&themes[0]), opts.mode);
        let (done_tx, done_rx) = channel();
        let mut app = App {
            source,
            themes,
            themes_json,
            forced: opts.theme.is_some(),
            theme_id,
            preview: None,
            pal,
            mode: opts.mode,
            canvases: Vec::new(),
            sessions: json!([]),
            runs: Vec::new(),
            current: None,
            runtime: opts.runtime.map(Arc::new),
            runtime_tag: None,
            clock: opts.clock,
            locale: opts.locale,
            link: Link::Connecting,
            version: String::new(),
            unknown: Vec::new(),
            scroll: 0,
            focus: None,
            edit: None,
            ui: Ui::default(),
            overlay: None,
            confirm: None,
            flash: None,
            quit: false,
            targets: Vec::new(),
            hits: Vec::new(),
            body: Rect::default(),
            height: 0,
            placements: Vec::new(),
            painter: Painter::new(opts.protocol, opts.cell),
            events: None,
            done_tx,
            done_rx,
            wanted: HashSet::new(),
            started: Instant::now(),
            pending_canvas: None,
            writing: 0,
            dirty: true,
        };
        app.ui.graphics = app.painter.graphics();
        app.begin(opts.canvas, opts.theme.is_some());
        app
    }

    pub fn now(&self) -> i64 {
        self.clock.now_ms()
    }

    pub fn say(&mut self, message: impl Into<String>) {
        self.flash = Some((message.into(), Instant::now()));
        self.dirty = true;
    }

    fn begin(&mut self, canvas: Option<String>, theme_given: bool) {
        match &self.source {
            Source::Fixtures { list, .. } => {
                self.link = Link::Up;
                self.version = "preview".into();
                self.canvases = list
                    .iter()
                    .map(|f| {
                        let name = f["name"].as_str().unwrap_or("").to_string();
                        json!({ "id": name, "name": name, "title": title_of(&name), "project": f.get("group").and_then(Value::as_str).unwrap_or("Fixtures"), "kind": if f["code"].is_string() { "tsx" } else { "template" }, "template": f.get("part").cloned().unwrap_or_else(|| f["init"]["canvas"]["template"].clone()), "theme": f.get("theme").cloned().unwrap_or(Value::Null), "modified": 0 })
                    })
                    .collect();
                // Named, a fixture opens; otherwise the first, under the list of them all.
                let named = canvas.is_some();
                let first = canvas.or_else(|| self.canvases.first().and_then(|c| c["id"].as_str()).map(String::from));
                if let Some(id) = first {
                    self.open(&id);
                }
                if !named && self.canvases.len() > 1 {
                    self.overlay = Some(Overlay::Home { sel: 0 });
                }
            }
            Source::Daemon(client) => {
                let (tx, rx) = channel();
                client.follow(tx);
                self.events = Some(rx);
                if let Ok(t) = client.get_json("/api/themes")
                    && let Some(list) = t.get("themes").and_then(Value::as_array)
                {
                    self.themes_json = list.clone();
                    self.themes =
                        serde_json::from_value(Value::Array(list.clone())).unwrap_or_else(|_| theme::embedded());
                }
                if !theme_given
                    && let Ok(s) = client.get_json("/api/settings")
                    && let Some(t) = s.get("theme").and_then(Value::as_str)
                {
                    self.set_theme(t);
                }
                self.pending_canvas = canvas;
            }
        }
    }

    // ---- The theme

    /// The theme the canvas on screen is shown in: the one picked for it or its own, when it has one, else the settings'.
    pub fn shown_theme(&self) -> String {
        if !self.forced
            && let Some(c) = &self.current
            && let Some(own) = c.info.get("theme").and_then(Value::as_str)
        {
            return c.state.get("theme").and_then(Value::as_str).unwrap_or(own).to_string();
        }
        self.theme_id.clone()
    }

    pub fn theme_json(&self) -> Value {
        let id = self.preview.clone().unwrap_or_else(|| self.shown_theme());
        self.themes_json.iter().find(|t| t["id"] == id.as_str()).cloned().unwrap_or(Value::Null)
    }

    /// Shows the canvas in its theme, when that's changed: another canvas, or a theme picked for it.
    fn follow_theme(&mut self) {
        let id = self.preview.clone().unwrap_or_else(|| self.shown_theme());
        if self.pal.id != id {
            self.apply_theme();
        }
    }

    fn apply_theme(&mut self) {
        let id = self.preview.clone().unwrap_or_else(|| self.shown_theme());
        if let Some(t) = theme::by_id(&self.themes, &id).or(self.themes.first()) {
            self.pal = Palette::new(t, self.mode);
        }
        let json = self.theme_json();
        if let Some(c) = &mut self.current {
            c.theme(&json);
        }
        self.dirty = true;
    }

    pub fn set_theme(&mut self, id: &str) {
        self.theme_id = id.to_string();
        self.apply_theme();
    }

    /// A canvas with a theme of its own keeps the one picked for it; the others follow the one in the settings.
    fn keep_theme(&mut self, id: &str) {
        self.preview = None;
        self.forced = false;
        if let Some(c) = &mut self.current
            && c.info.get("theme").and_then(Value::as_str).is_some()
        {
            c.state.insert("theme".into(), json!(id));
            c.writes.push_back(("theme".into(), json!(id)));
            self.apply_theme();
            return;
        }
        self.set_theme(id);
        if let Source::Daemon(c) = &self.source
            && let Err(e) = c.put_json("/api/settings", &json!({ "theme": id }))
        {
            self.say(format!("The theme isn't saved: {e}"));
        }
    }

    // ---- Canvases

    pub fn current_project(&self) -> Option<String> {
        self.current.as_ref().and_then(|c| c.info.get("project").and_then(Value::as_str).map(String::from))
    }

    /// The canvases in the bar, numbered: this project's, by name, as in the browser's bar.
    pub fn workspaces(&self) -> Vec<Value> {
        let project = self.current_project();
        let mut list: Vec<Value> = self
            .canvases
            .iter()
            .filter(|c| c.get("project").and_then(Value::as_str).map(String::from) == project)
            .cloned()
            .collect();
        if !self.source.is_daemon() {
            return list;
        }
        list.sort_by(|a, b| a["name"].as_str().cmp(&b["name"].as_str()));
        list
    }

    pub fn open(&mut self, id: &str) {
        let info =
            self.canvases.iter().find(|c| c["id"] == id).cloned().unwrap_or_else(|| json!({ "id": id, "title": id }));
        let same = self.current.as_ref().is_some_and(|c| c.id == id);
        if !same {
            self.current = Some(Canvas::new(info));
            self.scroll = 0;
            self.focus = None;
            self.edit = None;
            self.ui.selected.clear();
        }
        self.follow_theme();
        self.reload(true);
        self.follow_theme();
    }

    /// Fetches the canvas on screen, and loads it if it has changed.
    pub fn reload(&mut self, force: bool) {
        let Some(id) = self.current.as_ref().map(|c| c.id.clone()) else { return };
        let theme = self.theme_json();
        let sessions = self.sessions.clone();
        let (built, state) = match &self.source {
            Source::Fixtures { list, .. } => {
                let Some(f) = list.iter().find(|f| f["name"] == id.as_str()) else { return };
                let init = &f["init"];
                let built = match init["canvas"]["kind"].as_str() {
                    Some("template") => {
                        json!({ "kind": "template", "template": init["canvas"]["template"], "data": init["canvas"]["data"], "version": "fixture" })
                    }
                    _ => json!({ "kind": "module", "code": f["code"], "version": "fixture" }),
                };
                if !force {
                    return;
                }
                (built, init["state"].as_object().cloned().unwrap_or_default())
            }
            Source::Daemon(_) => {
                if self.runtime.is_none() || force {
                    self.fetch_runtime();
                }
                let Source::Daemon(client) = &self.source else { return };
                let tag = if force {
                    None
                } else {
                    self.current.as_ref().and_then(|c| c.version.clone()).map(|v| format!("\"{v}\""))
                };
                let reply = match client.get_if(&format!("/api/canvas?id={}", escape(&id)), tag.as_deref()) {
                    Ok(r) => r,
                    Err(e) => return self.say(e.to_string()),
                };
                if reply.status == 304 {
                    return;
                }
                let Ok(body) = reply.json() else { return self.say(format!("The daemon answered {}", reply.status)) };
                if let Some(info) = body.get("canvas")
                    && let Some(c) = &mut self.current
                {
                    c.info = info.clone();
                }
                (body["built"].clone(), body["state"].as_object().cloned().unwrap_or_default())
            }
        };
        let Some(runtime) = self.runtime.clone() else {
            return self
                .say("This daemon doesn't serve terminal.js: update atelier (npm install -g @pdcgomes/atelier).");
        };
        let (clock, locale) = (self.clock, self.locale.clone());
        if let Some(c) = &mut self.current
            && let Err(e) = c.load(&built, state, &sessions, &theme, &runtime, clock, &locale)
        {
            self.say(format!("The canvas didn't start: {e}"));
        }
        self.after_canvas();
    }

    fn fetch_runtime(&mut self) {
        let Source::Daemon(client) = &self.source else { return };
        match client.get_if("/terminal.js", self.runtime_tag.as_deref()) {
            Ok(r) if r.status == 200 => {
                self.runtime = Some(Arc::new(String::from_utf8_lossy(&r.body).into_owned()));
                self.runtime_tag = r.etag;
            }
            Ok(r) if r.status == 304 => {}
            _ => {}
        }
        if let Ok(k) = client.get_json("/api/kit") {
            let theirs: Vec<String> = k["kit"]["components"]
                .as_object()
                .map(|m| m.iter().filter(|(_, v)| v["composed"] != true).map(|(k, _)| k.clone()).collect())
                .unwrap_or_default();
            self.unknown = theirs.into_iter().filter(|n| !kit::all().iter().any(|c| c.name == n)).collect();
        }
    }

    /// After anything the canvas did: write its state, open what it asked for, fetch its images.
    fn after_canvas(&mut self) {
        self.dirty = true;
        let Some(c) = &mut self.current else { return };
        let writes: Vec<(String, Value)> = c.writes.drain(..).collect();
        let id = c.id.clone();
        for (key, value) in writes {
            match &self.source {
                Source::Daemon(client) => {
                    let client = client.clone();
                    let tx = self.done_tx.clone();
                    let id = id.clone();
                    self.writing += 1;
                    std::thread::spawn(move || {
                        let r = client
                            .put_json(&format!("/api/state?id={}", escape(&id)), &json!({ "key": key, "value": value }))
                            .map(|_| ())
                            .map_err(|e| e.to_string());
                        let _ = tx.send(Done::Written(id, key, r));
                    });
                }
                Source::Fixtures { .. } => {
                    if let Some(c) = &mut self.current {
                        c.written(&key);
                    }
                }
            }
        }
        if self.confirm.is_none()
            && let Some(ask) = self.current.as_mut().and_then(|c| c.asks.pop_front())
        {
            self.ask(ask);
        }
        self.want_images();
        if let Some(k) = self.focus
            && self.current.as_ref().is_some_and(|c| tree::find(&c.tree, k.node).is_none())
        {
            self.focus = None;
            self.edit = None;
        }
    }

    // ---- Images

    fn want_images(&mut self) {
        let mut paths = Vec::new();
        if let Some(c) = &self.current {
            walk(&c.tree, None, &mut |n, _| match n.t.as_str() {
                "Image" => paths.extend(n.str("path").map(String::from)),
                "Video" => paths.extend(n.str("path").map(|p| format!("{p}#poster"))),
                "Gallery" => paths.extend(
                    n.list("images").iter().filter_map(|i| i.get("path").and_then(Value::as_str).map(String::from)),
                ),
                "img" => paths.extend(n.str("src").and_then(|s| s.strip_prefix("atelier-file:")).map(String::from)),
                _ => {}
            });
        }
        if let Some(Overlay::Document { path, .. }) = &self.overlay
            && !path.is_empty()
            && !path.ends_with(".md")
        {
            paths.push(path.clone());
        }
        for p in paths {
            if !self.wanted.insert(p.clone()) {
                continue;
            }
            self.ui.images.insert(p.clone(), Loaded::Loading);
            let fetch = self.fetcher();
            let tx = self.done_tx.clone();
            std::thread::spawn(move || {
                let (file, poster) = match p.strip_suffix("#poster") {
                    Some(f) => (f.to_string(), true),
                    None => (p.clone(), false),
                };
                let loaded = match fetch(&file) {
                    Ok(bytes) if poster => match images::poster(&bytes, &file) {
                        Some(px) => Loaded::Ready(Arc::new(px)),
                        None => Loaded::Missing("no still".into()),
                    },
                    Ok(bytes) => match images::decode(&bytes, &file) {
                        Ok(px) => Loaded::Ready(Arc::new(px)),
                        Err(e) => Loaded::Missing(e.to_string()),
                    },
                    Err(e) => Loaded::Missing(e),
                };
                let _ = tx.send(Done::Image(p, loaded));
            });
        }
    }

    /// How a file a canvas shows is read: through the daemon, which applies its rules, or from the fixtures' files.
    fn fetcher(&self) -> Fetcher {
        match &self.source {
            Source::Daemon(client) => {
                let client = client.clone();
                let id = self.current.as_ref().map(|c| c.id.clone()).unwrap_or_default();
                Box::new(move |path: &str| {
                    let r = client
                        .get(&format!("/api/file?canvas={}&path={}", escape(&id), escape(path)))
                        .map_err(|e| e.to_string())?;
                    if r.status != 200 {
                        return Err(serde_json::from_slice::<Value>(&r.body)
                            .ok()
                            .and_then(|v| v["error"].as_str().map(String::from))
                            .unwrap_or_else(|| format!("the daemon answered {}", r.status)));
                    }
                    Ok(r.body)
                })
            }
            Source::Fixtures { files, .. } => {
                let files = files.clone();
                Box::new(move |path: &str| {
                    let rel = path.trim_start_matches('/');
                    if rel.split('/').any(|p| p == "..") {
                        return Err("it isn't there".into());
                    }
                    std::fs::read(files.join(rel)).map_err(|_| "it isn't there".to_string())
                })
            }
        }
    }

    // ---- Actions

    fn ask(&mut self, ask: Ask) {
        if let Action::OpenFile { path, .. } = &ask.action
            && VIEWABLE.contains(&ext(path).as_str())
        {
            let path = path.clone();
            self.reply(&ask.reply, true, "Shown in the viewer.", None);
            self.document(&path, path.rsplit('/').next().unwrap_or(&path));
            return;
        }
        let mode = match &ask.action {
            Action::StartSession { mode, .. } => mode.clone().unwrap_or_else(|| "terminal".into()),
            _ => String::new(),
        };
        self.confirm = Some(Confirm { ask, opened: Instant::now(), mode });
        self.dirty = true;
    }

    fn reply(&mut self, id: &str, ok: bool, message: &str, session: Option<&str>) {
        if let Some(c) = &mut self.current {
            c.reply(id, ok, message, session);
        }
        self.after_canvas();
    }

    /// A confirm sheet can't be answered until it's been up this long, so a key meant for something else can't land on it.
    pub const ARMING: Duration = Duration::from_millis(600);

    pub fn armed(&self) -> bool {
        self.confirm.as_ref().is_some_and(|c| c.opened.elapsed() >= Self::ARMING)
    }

    fn go_ahead(&mut self) {
        let Some(Confirm { ask, mode, .. }) = self.confirm.take() else { return };
        let mut action = ask.action.clone();
        if let Action::StartSession { mode: m, .. } = &mut action {
            *m = Some(mode);
        }
        match (&self.source, &action) {
            (Source::Fixtures { .. }, _) => {
                self.reply(&ask.reply, false, "Nothing runs in the preview.", None);
                self.say("Nothing runs in the preview: in the viewer, that would start now.");
            }
            (_, Action::OpenUrl { url }) => {
                let opened = open_outside(url);
                self.reply(
                    &ask.reply,
                    opened.is_ok(),
                    if opened.is_ok() { "Opened." } else { "It didn't open." },
                    None,
                );
            }
            (Source::Daemon(client), _) => {
                let client = client.clone();
                let tx = self.done_tx.clone();
                let id = self.current.as_ref().map(|c| c.id.clone()).unwrap_or_default();
                let body = json!({ "canvas": id, "action": action.to_json() });
                let reply = ask.reply.clone();
                self.say("Asked the daemon…");
                std::thread::spawn(move || {
                    let r = client.post_json("/api/action", &body).map_err(|e| e.to_string());
                    let _ = tx.send(Done::Acted(id, reply, r));
                });
            }
        }
    }

    fn leave_as_is(&mut self) {
        if let Some(Confirm { ask, .. }) = self.confirm.take() {
            self.reply(&ask.reply, false, "You left it as it is.", None);
            self.say("left as it is");
        }
    }

    // ---- Events from the daemon and the viewer's threads

    pub fn step(&mut self) {
        let mut events = Vec::new();
        if let Some(rx) = &self.events {
            while let Ok(e) = rx.try_recv() {
                events.push(e);
            }
        }
        for e in events {
            self.event(e);
        }
        while let Ok(d) = self.done_rx.try_recv() {
            self.done(d);
        }
        if let Some(c) = &mut self.current
            && c.pump()
        {
            self.after_canvas();
        } else if self.current.as_ref().is_some_and(|c| !c.writes.is_empty() || !c.asks.is_empty()) {
            self.after_canvas();
        }
        if let Some(Overlay::Document { doc: Some(d), .. }) = &mut self.overlay
            && d.pump()
        {
            self.dirty = true;
        }
    }

    fn event(&mut self, e: Event) {
        self.dirty = true;
        match e {
            Event::Up(v) => {
                self.link = Link::Up;
                self.version = v;
            }
            Event::Down(why) => self.link = Link::Down(why),
            Event::Message(name, data) => match name.as_str() {
                "hello" => {
                    self.link = Link::Up;
                    self.canvases = data["canvases"].as_array().cloned().unwrap_or_default();
                    self.sessions = data["sessions"].clone();
                    self.runs = data["runs"].as_array().cloned().unwrap_or_default();
                    if let Some(v) = data["version"].as_str() {
                        self.version = v.to_string();
                    }
                    if self.preview.is_none()
                        && let Some(t) = data["settings"]["theme"].as_str()
                        && t != self.theme_id
                    {
                        self.set_theme(t);
                    }
                    self.fetch_runtime();
                    if self.current.is_none() {
                        self.first_canvas();
                    } else {
                        self.reload(false);
                    }
                }
                "canvases" => self.canvases = data["canvases"].as_array().cloned().unwrap_or_default(),
                "canvas" => {
                    if self.current.as_ref().is_some_and(|c| data["id"] == c.id.as_str()) {
                        self.reload(false);
                    }
                }
                "state" => {
                    if let Some(c) = &mut self.current
                        && data["id"] == c.id.as_str()
                    {
                        c.state_changed(&data["state"]);
                        self.after_canvas();
                        self.follow_theme();
                    }
                }
                "sessions" => {
                    self.sessions = data["sessions"].clone();
                    if let Some(c) = &mut self.current {
                        c.sessions(&data["sessions"]);
                    }
                }
                "runs" => self.runs = data["runs"].as_array().cloned().unwrap_or_default(),
                "run" => {
                    if let Some(Overlay::Runs { open: Some(id), steps, .. }) = &mut self.overlay
                        && data["id"] == id.as_str()
                    {
                        steps.push(data["step"].clone());
                    }
                }
                "settings" => {
                    if self.preview.is_none()
                        && let Some(t) = data["theme"].as_str()
                        && t != self.theme_id
                    {
                        self.set_theme(t);
                    }
                }
                "show" => {
                    if let Some(id) = data["id"].as_str() {
                        let id = id.to_string();
                        self.overlay = None;
                        self.open(&id);
                    }
                }
                _ => {}
            },
        }
    }

    fn first_canvas(&mut self) {
        let wanted = self.pending_canvas.take();
        if let Some(w) = wanted {
            let path = std::fs::canonicalize(&w).map(|p| p.to_string_lossy().into_owned()).unwrap_or(w.clone());
            let found = self
                .canvases
                .iter()
                .find(|c| c["path"] == path.as_str() || c["id"] == w.as_str())
                .and_then(|c| c["id"].as_str().map(String::from));
            let found = found.or_else(|| {
                let Source::Daemon(client) = &self.source else { return None };
                client
                    .post_json("/api/open", &json!({ "path": path, "show": false }))
                    .ok()
                    .and_then(|r| r["canvas"]["id"].as_str().map(String::from))
            });
            match found {
                Some(id) => return self.open(&id),
                None => self.say(format!("{w} isn't a canvas the daemon knows")),
            }
        }
        let cwd = std::env::current_dir().map(|p| p.to_string_lossy().into_owned()).unwrap_or_default();
        let here = self
            .canvases
            .iter()
            .filter(|c| c["project"].as_str().is_some_and(|p| cwd.starts_with(p)))
            .max_by_key(|c| c["modified"].as_f64().unwrap_or(0.0) as i64);
        match here.or(self.canvases.first()).and_then(|c| c["id"].as_str()).map(String::from) {
            Some(id) => self.open(&id),
            None => self.overlay = Some(Overlay::Home { sel: 0 }),
        }
    }

    fn done(&mut self, d: Done) {
        self.dirty = true;
        match d {
            Done::Image(path, loaded) => {
                self.ui.images.insert(path, loaded);
            }
            Done::Written(id, key, r) => {
                self.writing = self.writing.saturating_sub(1);
                if let Some(c) = &mut self.current
                    && c.id == id
                {
                    c.written(&key);
                }
                if let Err(e) = r {
                    self.say(format!("That wasn't saved: {e}"));
                }
            }
            Done::Acted(id, reply, r) => {
                let (ok, message, session) = match &r {
                    Ok(v) => (
                        v["ok"].as_bool().unwrap_or(false),
                        v["message"].as_str().unwrap_or("").to_string(),
                        v["session"].as_str().map(String::from),
                    ),
                    Err(e) => (false, e.clone(), None),
                };
                if self.current.as_ref().is_some_and(|c| c.id == id) {
                    self.reply(&reply, ok, &message, session.as_deref());
                }
                self.say(if message.is_empty() {
                    if ok { "Done.".into() } else { "It didn't work.".into() }
                } else {
                    message
                });
            }
        }
    }

    // ---- Focus

    fn node(&self, node: u64) -> Option<&tree::Node> {
        self.current.as_ref().and_then(|c| tree::find(&c.tree, node))
    }

    pub fn focused_target(&self) -> Option<&Target> {
        self.focus.and_then(|k| self.targets.iter().find(|t| t.key == k))
    }

    pub fn focus_on(&mut self, key: Key) {
        self.focus = Some(key);
        self.edit = None;
        let target = self.targets.iter().find(|t| t.key == key).cloned();
        if let Some(t) = &target {
            self.reveal(t.area.y, t.area.bottom());
            if t.kind.editable() {
                let value = self
                    .node(key.node)
                    .and_then(|n| if t.kind == Kind::Filter { n.str("query") } else { n.str("value") })
                    .unwrap_or("")
                    .to_string();
                self.edit = Some(Edit { key: Some(key), cursor: value.len(), text: value });
            }
        }
        self.dirty = true;
    }

    fn reveal(&mut self, top: i32, bottom: i32) {
        let view = self.body.height as i32;
        if top < self.scroll {
            self.scroll = (top - 1).max(0);
        } else if bottom > self.scroll + view {
            self.scroll = (bottom - view + 1).max(0);
        }
    }

    fn move_focus(&mut self, by: i32) {
        if self.targets.is_empty() {
            return;
        }
        let at = self.focus.and_then(|k| self.targets.iter().position(|t| t.key == k));
        let n = self.targets.len() as i32;
        let next = match at {
            Some(i) => (i as i32 + by).rem_euclid(n),
            None if by > 0 => self.targets.iter().position(|t| t.area.y >= self.scroll).unwrap_or(0) as i32,
            None => n - 1,
        };
        let key = self.targets[next as usize].key;
        self.focus_on(key);
    }

    fn scroll_by(&mut self, by: i32) {
        let most = (self.height as i32 - self.body.height as i32).max(0);
        self.scroll = (self.scroll + by).clamp(0, most);
        self.dirty = true;
    }

    // ---- Doing what a key or a click says

    pub fn run(&mut self, acts: Vec<Act>) {
        for act in acts {
            match act {
                Act::Focus(key) => self.focus_on(key),
                Act::Call { node, name, args } => {
                    if let Some(c) = &mut self.current {
                        c.dispatch(node, &name, &args);
                    }
                    self.after_canvas();
                }
                Act::Select { node, index } => {
                    self.ui.selected.insert(node, index);
                    self.dirty = true;
                }
                Act::Open { path, alt } => self.open_media(&path, &alt),
                Act::Copy(text) => {
                    copy(&text);
                    if let Some(k) = self.focus {
                        self.ui.copied = Some(k.node);
                    }
                    self.say("Copied.");
                }
                Act::Pick { node } => {
                    let options = self.node(node).map(kit::forms::options).unwrap_or_default();
                    let value = self.node(node).and_then(|n| n.str("value")).unwrap_or("").to_string();
                    let sel = options.iter().position(|(v, _)| *v == value).unwrap_or(0);
                    self.overlay = Some(Overlay::Pick { node, sel });
                    self.dirty = true;
                }
            }
        }
    }

    fn open_media(&mut self, path: &str, alt: &str) {
        let e = ext(path);
        if VIDEO.contains(&e.as_str()) || e == "pdf" {
            let fetch = self.fetcher();
            match fetch(path) {
                Ok(bytes) => {
                    let file = images::cache_dir().join(format!("{:016x}.{e}", images::hash(&bytes)));
                    let opened = std::fs::write(&file, &bytes)
                        .map_err(|e| e.to_string())
                        .and_then(|_| open_outside(&file.to_string_lossy()));
                    self.say(if opened.is_ok() { "Opened in its own app." } else { "It didn't open." });
                }
                Err(why) => self.say(format!("Can't open it: {why}")),
            }
            return;
        }
        self.document(path, if alt.is_empty() { path.rsplit('/').next().unwrap_or(path) } else { alt });
    }

    /// Shows a file full size: an image, or Markdown drawn by the kit's own Markdown.
    fn document(&mut self, path: &str, title: &str) {
        let mut doc = None;
        if matches!(ext(path).as_str(), "md" | "markdown") {
            let fetch = self.fetcher();
            match fetch(path) {
                Ok(bytes) => {
                    let text = serde_json::to_string(&String::from_utf8_lossy(&bytes)).unwrap_or_default();
                    let code = format!(
                        "const {{ Markdown }} = globalThis.__atelier.atelier; const {{ jsx }} = globalThis.__atelier['react/jsx-runtime']; export default function Document() {{ return jsx(Markdown, {{ children: {text} }}); }}"
                    );
                    if let Some(runtime) = self.runtime.clone() {
                        let mut c = Canvas::new(json!({ "id": "document", "title": title }));
                        let _ = c.load(
                            &json!({ "kind": "module", "code": code, "version": "doc" }),
                            Default::default(),
                            &json!([]),
                            &self.theme_json(),
                            &runtime,
                            self.clock,
                            &self.locale,
                        );
                        doc = Some(Box::new(c));
                    }
                }
                Err(why) => return self.say(format!("Can't show it: {why}")),
            }
        }
        self.overlay = Some(Overlay::Document { title: title.to_string(), path: path.to_string(), doc, scroll: 0 });
        self.want_images();
        self.dirty = true;
    }

    fn press(&mut self, press: Press) -> bool {
        let Some(target) = self.focused_target().cloned() else { return false };
        let Some(node) = self.node(target.key.node).cloned() else { return false };
        let keys = kit::component(&node.t).keys;
        if let Some(acts) = keys.and_then(|f| f(&node, &target, press, &self.ui)) {
            self.run(acts);
            return true;
        }
        if matches!(press, Press::Enter | Press::Space) {
            if target.kind.editable() {
                self.focus_on(target.key);
                return true;
            }
            let acts: Vec<Act> = self
                .hits
                .iter()
                .find(|h| h.key == target.key)
                .map(|h| h.acts.iter().filter(|a| !matches!(a, Act::Focus(_))).cloned().collect())
                .unwrap_or_default();
            if !acts.is_empty() {
                self.run(acts);
                return true;
            }
        }
        false
    }

    // ---- Keys

    pub fn on_key(&mut self, k: KeyEvent) {
        if k.kind != KeyEventKind::Press {
            return;
        }
        self.dirty = true;
        if k.modifiers.contains(KeyModifiers::CONTROL) && k.code == KeyCode::Char('c') {
            self.quit = true;
            return;
        }
        if self.confirm.is_some() {
            return self.confirm_key(k);
        }
        if self.edit.is_some() {
            return self.edit_key(k);
        }
        if self.overlay.is_some() {
            return self.overlay_key(k);
        }
        let press = match k.code {
            KeyCode::Enter => Some(Press::Enter),
            KeyCode::Char(' ') => Some(Press::Space),
            KeyCode::Left => Some(Press::Left),
            KeyCode::Right => Some(Press::Right),
            KeyCode::Up => Some(Press::Up),
            KeyCode::Down => Some(Press::Down),
            KeyCode::Home => Some(Press::Home),
            KeyCode::End => Some(Press::End),
            KeyCode::Char(c) if self.focus.is_some() && !"0123456789tr/?qo".contains(c) => Some(Press::Char(c)),
            KeyCode::Char(c @ ('[' | ']')) => Some(Press::Char(c)),
            _ => None,
        };
        if let Some(p) = press
            && self.press(p)
        {
            return;
        }
        let view = self.body.height as i32;
        match k.code {
            KeyCode::Char('q') => self.quit = true,
            KeyCode::Char('?') => self.overlay = Some(Overlay::Keys),
            KeyCode::Char('t') => {
                let shown = self.shown_theme();
                let sel = self.themes.iter().position(|t| t.id == shown).unwrap_or(0);
                self.overlay = Some(Overlay::Themes { query: String::new(), sel });
            }
            KeyCode::Char('/') => self.overlay = Some(Overlay::Find { query: String::new(), sel: 0 }),
            KeyCode::Char('0') => {
                let sel = self
                    .current
                    .as_ref()
                    .and_then(|c| self.home_list().iter().position(|x| x["id"] == c.id.as_str()))
                    .unwrap_or(0);
                self.overlay = Some(Overlay::Home { sel });
            }
            KeyCode::Char('r') => self.overlay = Some(Overlay::Runs { sel: 0, open: None, steps: Vec::new() }),
            KeyCode::Char('o') => self.in_browser(),
            KeyCode::Char(c @ '1'..='9') => {
                let i = c as usize - '1' as usize;
                if let Some(id) = self.workspaces().get(i).and_then(|w| w["id"].as_str()).map(String::from) {
                    self.open(&id);
                }
            }
            KeyCode::Char('[') | KeyCode::Char(']') => {
                self.cycle_tabs(if k.code == KeyCode::Char('[') { -1 } else { 1 })
            }
            KeyCode::Tab => self.move_focus(1),
            KeyCode::BackTab => self.move_focus(-1),
            KeyCode::Esc => {
                self.focus = None;
            }
            KeyCode::Up | KeyCode::Char('k') => self.scroll_by(-1),
            KeyCode::Down | KeyCode::Char('j') => self.scroll_by(1),
            KeyCode::PageUp => self.scroll_by(-(view - 2).max(1)),
            KeyCode::PageDown | KeyCode::Char(' ') => self.scroll_by((view - 2).max(1)),
            KeyCode::Home | KeyCode::Char('g') => self.scroll_by(-(self.height as i32)),
            KeyCode::End | KeyCode::Char('G') => self.scroll_by(self.height as i32),
            _ => {}
        }
    }

    /// `[` and `]` move between the tabs of the canvas's first tab bar, or the one with the focus.
    fn cycle_tabs(&mut self, by: i32) {
        let Some(c) = &self.current else { return };
        let focused = self.focus.and_then(|k| tree::find(&c.tree, k.node)).filter(|n| n.t == "Tabs").map(|n| n.id);
        let mut first = None;
        walk(&c.tree, None, &mut |n, _| {
            if first.is_none() && n.t == "Tabs" {
                first = Some(n.id);
            }
        });
        if let Some(id) = focused.or(first) {
            self.run(vec![Act::Call { node: id, name: "move".into(), args: vec![Value::from(by)] }]);
        }
    }

    fn in_browser(&mut self) {
        let Some(id) = self.current.as_ref().map(|c| c.id.clone()) else { return };
        match &self.source {
            Source::Daemon(client) => match client.post_json("/api/open", &json!({ "id": id, "show": false })) {
                Ok(r) => {
                    let url = r["url"].as_str().unwrap_or("").to_string();
                    let ok = open_outside(&url).is_ok();
                    self.say(if ok { "Opened in your browser." } else { "Your browser didn't open." });
                }
                Err(e) => self.say(e.to_string()),
            },
            Source::Fixtures { .. } => self.say("The preview has no browser viewer."),
        }
    }

    fn confirm_key(&mut self, k: KeyEvent) {
        let starts = matches!(self.confirm.as_ref().map(|c| &c.ask.action), Some(Action::StartSession { .. }));
        match k.code {
            KeyCode::Char('y') | KeyCode::Char('Y') if self.armed() => self.go_ahead(),
            KeyCode::Char('y') | KeyCode::Char('Y') => {}
            KeyCode::Char('b') if starts => self.confirm.as_mut().unwrap().mode = "background".into(),
            KeyCode::Char('t') if starts => self.confirm.as_mut().unwrap().mode = "terminal".into(),
            _ => self.leave_as_is(),
        }
    }

    fn edit_key(&mut self, k: KeyEvent) {
        let multiline = self.focused_target().is_some_and(|t| t.kind == Kind::Input { multiline: true });
        let Some(edit) = &mut self.edit else { return };
        let mut changed = false;
        match k.code {
            KeyCode::Esc => {
                self.edit = None;
                return;
            }
            KeyCode::Tab => {
                self.edit = None;
                return self.move_focus(1);
            }
            KeyCode::Enter if multiline => {
                edit.text.insert(edit.cursor, '\n');
                edit.cursor += 1;
                changed = true;
            }
            KeyCode::Enter => {
                self.edit = None;
                return;
            }
            KeyCode::Backspace => {
                if let Some((i, _)) = edit.text[..edit.cursor].char_indices().next_back() {
                    edit.text.replace_range(i..edit.cursor, "");
                    edit.cursor = i;
                    changed = true;
                }
            }
            KeyCode::Delete => {
                if let Some(c) = edit.text[edit.cursor..].chars().next() {
                    edit.text.replace_range(edit.cursor..edit.cursor + c.len_utf8(), "");
                    changed = true;
                }
            }
            KeyCode::Left => {
                edit.cursor = edit.text[..edit.cursor].char_indices().next_back().map(|(i, _)| i).unwrap_or(0)
            }
            KeyCode::Right => {
                edit.cursor =
                    edit.text[edit.cursor..].chars().next().map(|c| edit.cursor + c.len_utf8()).unwrap_or(edit.cursor)
            }
            KeyCode::Home => edit.cursor = 0,
            KeyCode::End => edit.cursor = edit.text.len(),
            KeyCode::Char(c) if !k.modifiers.contains(KeyModifiers::CONTROL) => {
                edit.text.insert(edit.cursor, c);
                edit.cursor += c.len_utf8();
                changed = true;
            }
            _ => {}
        }
        if changed {
            self.edited();
        }
    }

    pub fn paste(&mut self, text: &str) {
        if let Some(edit) = &mut self.edit {
            let clean = tree::clean(text);
            edit.text.insert_str(edit.cursor, &clean);
            edit.cursor += clean.len();
            self.edited();
        }
    }

    /// Tells the canvas a field changed, as typing does in the browser.
    fn edited(&mut self) {
        let Some(edit) = &self.edit else { return };
        let Some(key) = edit.key else { return };
        let text = edit.text.clone();
        let filter = self.focused_target().is_some_and(|t| t.kind == Kind::Filter);
        let name = if filter { "search" } else { "change" };
        if let Some(c) = &mut self.current {
            c.dispatch(key.node, name, &[Value::String(text)]);
        }
        self.after_canvas();
    }

    pub fn home_list(&self) -> Vec<Value> {
        let mut list = self.canvases.clone();
        if self.source.is_daemon() {
            list.sort_by(|a, b| {
                a["project"].as_str().cmp(&b["project"].as_str()).then_with(|| {
                    b["modified"].as_f64().unwrap_or(0.0).total_cmp(&a["modified"].as_f64().unwrap_or(0.0))
                })
            });
        }
        list
    }

    pub fn found(&self, query: &str) -> Vec<Value> {
        let words: Vec<String> = query.to_lowercase().split_whitespace().map(String::from).collect();
        self.home_list()
            .into_iter()
            .filter(|c| {
                let hay = format!(
                    "{} {} {} {}",
                    c["title"].as_str().unwrap_or(""),
                    c["name"].as_str().unwrap_or(""),
                    c["project"].as_str().unwrap_or(""),
                    c["template"].as_str().unwrap_or("custom")
                )
                .to_lowercase();
                words.iter().all(|w| hay.contains(w))
            })
            .collect()
    }

    pub fn themes_found(&self, query: &str) -> Vec<Theme> {
        let q = query.to_lowercase();
        self.themes
            .iter()
            .filter(|t| {
                q.is_empty()
                    || t.name.to_lowercase().contains(&q)
                    || t.id.contains(&q)
                    || (q == "light" && !t.dark)
                    || (q == "dark" && t.dark)
            })
            .cloned()
            .collect()
    }

    fn overlay_key(&mut self, k: KeyEvent) {
        let Some(mut o) = self.overlay.take() else { return };
        let mut keep = true;
        let close = matches!(k.code, KeyCode::Esc)
            || (matches!(k.code, KeyCode::Char('q')) && !matches!(o, Overlay::Find { .. } | Overlay::Themes { .. }));
        let step = |sel: &mut usize, len: usize, code: KeyCode| match code {
            KeyCode::Up => *sel = sel.saturating_sub(1),
            KeyCode::Down => *sel = (*sel + 1).min(len.saturating_sub(1)),
            KeyCode::PageUp => *sel = sel.saturating_sub(10),
            KeyCode::PageDown => *sel = (*sel + 10).min(len.saturating_sub(1)),
            KeyCode::Home => *sel = 0,
            KeyCode::End => *sel = len.saturating_sub(1),
            _ => {}
        };
        match &mut o {
            Overlay::Home { sel } => {
                let list = self.home_list();
                match k.code {
                    KeyCode::Enter => {
                        if let Some(id) = list.get(*sel).and_then(|c| c["id"].as_str()).map(String::from) {
                            keep = false;
                            self.open(&id);
                        }
                    }
                    KeyCode::Char('j') => step(sel, list.len(), KeyCode::Down),
                    KeyCode::Char('k') => step(sel, list.len(), KeyCode::Up),
                    KeyCode::Char('/') => o = Overlay::Find { query: String::new(), sel: 0 },
                    KeyCode::Char('0') => keep = false,
                    c => step(sel, list.len(), c),
                }
            }
            Overlay::Find { query, sel } => match k.code {
                KeyCode::Enter => {
                    if let Some(id) = self.found(query).get(*sel).and_then(|c| c["id"].as_str()).map(String::from) {
                        keep = false;
                        self.open(&id);
                    }
                }
                KeyCode::Backspace => {
                    query.pop();
                    *sel = 0;
                }
                KeyCode::Char(c) => {
                    query.push(c);
                    *sel = 0;
                }
                c => {
                    let n = self.found(query).len();
                    step(sel, n, c)
                }
            },
            Overlay::Themes { query, sel } => {
                match k.code {
                    KeyCode::Enter => {
                        if let Some(t) = self.themes_found(query).get(*sel).cloned() {
                            keep = false;
                            self.keep_theme(&t.id);
                            self.say(format!("{} it is.", t.name));
                        }
                    }
                    KeyCode::Backspace => {
                        query.pop();
                        *sel = 0;
                    }
                    KeyCode::Char(c) => {
                        query.push(c);
                        *sel = 0;
                    }
                    c => {
                        let n = self.themes_found(query).len();
                        step(sel, n, c)
                    }
                }
                if keep && !close {
                    let id = self.themes_found(query).get(*sel).map(|t| t.id.clone());
                    if id != self.preview {
                        self.preview = id;
                        self.apply_theme();
                    }
                }
            }
            Overlay::Keys => keep = matches!(k.code, KeyCode::Up | KeyCode::Down) && !close,
            Overlay::Runs { sel, open, steps } => match k.code {
                KeyCode::Enter => {
                    let id = self.runs.get(*sel).and_then(|r| r["id"].as_str()).map(String::from);
                    if *open == id {
                        *open = None;
                    } else if let (Some(id), Source::Daemon(c)) = (id, &self.source) {
                        *steps = c
                            .get_json(&format!("/api/run?id={}", escape(&id)))
                            .ok()
                            .and_then(|r| r["steps"].as_array().cloned())
                            .unwrap_or_default();
                        *open = Some(id);
                    }
                }
                KeyCode::Char('s') => {
                    if let (Some(id), Source::Daemon(c)) =
                        (self.runs.get(*sel).and_then(|r| r["id"].as_str()), &self.source)
                    {
                        let r = c.post_json("/api/runs/stop", &json!({ "id": id }));
                        let message = match r {
                            Ok(_) => "Stopped.".to_string(),
                            Err(e) => e.to_string(),
                        };
                        self.say(message);
                    }
                }
                KeyCode::Char('o') => {
                    if let Some(session) = self.runs.get(*sel).and_then(|r| r["session"].as_str()).map(String::from) {
                        keep = false;
                        self.confirm = Some(Confirm {
                            ask: Ask { reply: String::new(), action: Action::OpenSession { id: session } },
                            opened: Instant::now(),
                            mode: String::new(),
                        });
                    }
                }
                KeyCode::Char('j') => step(sel, self.runs.len(), KeyCode::Down),
                KeyCode::Char('k') => step(sel, self.runs.len(), KeyCode::Up),
                c => step(sel, self.runs.len(), c),
            },
            Overlay::Pick { node, sel } => {
                let options = self.node(*node).map(kit::forms::options).unwrap_or_default();
                match k.code {
                    KeyCode::Enter => {
                        if let Some((v, _)) = options.get(*sel) {
                            keep = false;
                            let node = *node;
                            self.run(vec![Act::Call {
                                node,
                                name: "change".into(),
                                args: vec![Value::String(v.clone())],
                            }]);
                        }
                    }
                    c => step(sel, options.len(), c),
                }
            }
            Overlay::Document { scroll, .. } => match k.code {
                KeyCode::Up | KeyCode::Char('k') => *scroll = (*scroll - 1).max(0),
                KeyCode::Down | KeyCode::Char('j') => *scroll += 1,
                KeyCode::PageUp => *scroll = (*scroll - 10).max(0),
                KeyCode::PageDown | KeyCode::Char(' ') => *scroll += 10,
                _ => keep = false,
            },
        }
        if close {
            keep = false;
        }
        if keep {
            self.overlay = Some(o);
        } else if matches!(o, Overlay::Themes { .. }) && self.preview.is_some() {
            self.preview = None;
            self.apply_theme();
        }
        self.dirty = true;
    }

    // ---- The mouse

    pub fn on_mouse(&mut self, m: MouseEvent) {
        self.dirty = true;
        let inside = m.column >= self.body.x
            && m.column < self.body.x + self.body.width
            && m.row >= self.body.y
            && m.row < self.body.y + self.body.height;
        match m.kind {
            MouseEventKind::ScrollDown if self.overlay.is_none() => self.scroll_by(3),
            MouseEventKind::ScrollUp if self.overlay.is_none() => self.scroll_by(-3),
            MouseEventKind::ScrollDown | MouseEventKind::ScrollUp => {
                if let Some(Overlay::Document { scroll, .. }) = &mut self.overlay {
                    *scroll = (*scroll + if m.kind == MouseEventKind::ScrollDown { 3 } else { -3 }).max(0);
                }
            }
            MouseEventKind::Down(MouseButton::Left) if self.overlay.is_none() && self.confirm.is_none() && inside => {
                let (x, y) = (m.column - self.body.x, m.row as i32 - self.body.y as i32 + self.scroll);
                if let Some(h) = self.hits.iter().rev().find(|h| h.area.contains(x, y)).cloned() {
                    self.edit = None;
                    let mut acts = h.acts;
                    if !acts.iter().any(|a| matches!(a, Act::Focus(_))) {
                        acts.insert(0, Act::Focus(h.key));
                    }
                    self.run(acts);
                }
            }
            _ => {}
        }
    }

    /// When the loop should next wake: the canvas's next timer, a spinner, a flash going.
    pub fn wake(&self) -> Duration {
        let mut d = Duration::from_secs(1);
        if let Some(t) = self.current.as_ref().and_then(Canvas::next_timer) {
            d = d.min(t.saturating_duration_since(Instant::now()));
        }
        if self.confirm.as_ref().is_some_and(|c| c.opened.elapsed() < Self::ARMING)
            || self.runs.iter().any(|r| r["status"] == "running")
        {
            d = d.min(Duration::from_millis(100));
        }
        d.max(Duration::from_millis(5))
    }

    pub fn uptime(&self) -> Duration {
        self.started.elapsed()
    }

    /// A terminal.js of this repository's, for a daemon too old to serve one.
    pub fn runtime_fallback(&mut self, js: Option<String>) {
        if self.runtime.is_none() {
            self.runtime = js.map(Arc::new);
            if self.current.is_some() {
                self.reload(true);
            }
        }
    }

    pub fn images(&self) -> &HashMap<String, Loaded> {
        &self.ui.images
    }

    /// Puts a decoded image where the viewer would have fetched it, for tests.
    pub fn give_image(&mut self, path: &str, px: Pixels) {
        self.wanted.insert(path.to_string());
        self.ui.images.insert(path.to_string(), Loaded::Ready(Arc::new(px)));
    }

    pub fn targets_of(&self, t: &str) -> Vec<&Target> {
        self.targets.iter().filter(|x| x.t == t).collect()
    }

    /// Children of the canvas on screen.
    pub fn tree(&self) -> &[Child] {
        self.current.as_ref().map(|c| c.tree.as_slice()).unwrap_or(&[])
    }
}

/// "gallery-core" as "Gallery: core", "component-Panel" as "Panel".
pub fn title_of(name: &str) -> String {
    if let Some(c) = name.strip_prefix("component-") {
        return c.to_string();
    }
    if let Some((group, rest)) = name.split_once('-') {
        let mut g = group.to_string();
        if let Some(f) = g.get_mut(0..1) {
            f.make_ascii_uppercase();
        }
        return format!("{g}: {rest}");
    }
    let mut s = name.to_string();
    if let Some(f) = s.get_mut(0..1) {
        f.make_ascii_uppercase();
    }
    s
}

/// Opens a web page or a file outside the terminal, without a shell.
pub fn open_outside(what: &str) -> Result<(), String> {
    let program = if cfg!(target_os = "macos") { "open" } else { "xdg-open" };
    std::process::Command::new(program)
        .arg(what)
        .stdin(std::process::Stdio::null())
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .spawn()
        .map(|_| ())
        .map_err(|e| e.to_string())
}

/// Puts text on the clipboard, by OSC 52, which most terminals take.
pub fn copy(text: &str) {
    use base64::Engine as _;
    use std::io::Write;
    let data = base64::engine::general_purpose::STANDARD.encode(text);
    let mut out = std::io::stdout();
    let _ = write!(out, "\x1b]52;c;{data}\x07");
    let _ = out.flush();
}

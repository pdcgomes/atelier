//! One canvas on screen: its engine, its tree, its state, and what it has
//! asked for. Everything the engine sends is checked as the browser's viewer
//! checks a frame's messages (packages/viewer/src/frames.ts and app.tsx):
//! state keys of the right shape, actions it knows with parts it can trust.
//! Actions wait for you to confirm them; state is written at once and kept
//! from being overwritten by an older echo while it's on its way.

use std::collections::{HashMap, VecDeque};

use anyhow::Result;
use serde_json::{Map, Value, json};

use crate::engine::{Clock, Engine};
use crate::tree::{self, Child};

/// The messages a canvas can send that this answers, which tests/parity.rs checks against the kit's.
pub const HANDLED: [&str; 4] = ["set-state", "action", "error", "file"];

/// What a canvas can ask the viewer to do, once you've said yes.
#[derive(Debug, Clone, PartialEq)]
pub enum Action {
    StartSession { prompt: String, mode: Option<String> },
    OpenSession { id: String },
    Tell { session: String, text: String },
    OpenFile { path: String, line: Option<u64> },
    OpenUrl { url: String },
}

impl Action {
    /// An action as the viewer takes it, or None if it isn't one it knows, with its parts the right shape.
    pub fn parse(raw: &Value) -> Option<Action> {
        let text = |key: &str, max: usize| {
            raw.get(key)
                .and_then(Value::as_str)
                .filter(|s| !s.trim().is_empty() && s.chars().count() <= max)
                .map(String::from)
        };
        match raw.get("type")?.as_str()? {
            "startSession" => {
                let mode = match raw.get("mode") {
                    None | Some(Value::Null) => None,
                    Some(Value::String(m)) if m == "terminal" || m == "background" => Some(m.clone()),
                    _ => return None,
                };
                Some(Action::StartSession { prompt: text("prompt", 50_000)?, mode })
            }
            "openSession" => Some(Action::OpenSession { id: text("id", 200)? }),
            "tell" => Some(Action::Tell { session: text("session", 200)?, text: text("text", 50_000)? }),
            "openFile" => {
                let line = match raw.get("line") {
                    None | Some(Value::Null) => None,
                    Some(v) => Some(v.as_u64().filter(|n| *n > 0)?),
                };
                Some(Action::OpenFile { path: text("path", 4096)?, line })
            }
            "openUrl" => {
                let url = text("url", 4096)?;
                (url.to_lowercase().starts_with("http://") || url.to_lowercase().starts_with("https://"))
                    .then_some(Action::OpenUrl { url })
            }
            _ => None,
        }
    }

    pub fn to_json(&self) -> Value {
        match self {
            Action::StartSession { prompt, mode } => json!({ "type": "startSession", "prompt": prompt, "mode": mode }),
            Action::OpenSession { id } => json!({ "type": "openSession", "id": id }),
            Action::Tell { session, text } => json!({ "type": "tell", "session": session, "text": text }),
            Action::OpenFile { path, line } => json!({ "type": "openFile", "path": path, "line": line }),
            Action::OpenUrl { url } => json!({ "type": "openUrl", "url": url }),
        }
    }
}

/// An action waiting for you, and the canvas's request it answers.
#[derive(Debug, Clone)]
pub struct Ask {
    pub reply: String,
    pub action: Action,
}

#[derive(Debug, Clone)]
pub struct Problem {
    pub file: String,
    pub line: u64,
    pub column: u64,
    pub message: String,
}

pub struct Canvas {
    pub id: String,
    pub info: Value,
    engine: Option<Engine>,
    pub tree: Vec<Child>,
    /// The built canvas's version, which the daemon gives as its ETag.
    pub version: Option<String>,
    pub state: Map<String, Value>,
    pending: HashMap<String, u32>,
    pub problems: Vec<Problem>,
    pub crash: Option<String>,
    pub asks: VecDeque<Ask>,
    /// State to write to the daemon, in order.
    pub writes: VecDeque<(String, Value)>,
}

fn clip(s: &str, n: usize) -> String {
    if s.chars().count() > n { s.chars().take(n).collect() } else { s.to_string() }
}

impl Canvas {
    pub fn new(info: Value) -> Canvas {
        Canvas {
            id: info.get("id").and_then(Value::as_str).unwrap_or("").to_string(),
            info,
            engine: None,
            tree: Vec::new(),
            version: None,
            state: Map::new(),
            pending: HashMap::new(),
            problems: Vec::new(),
            crash: None,
            asks: VecDeque::new(),
            writes: VecDeque::new(),
        }
    }

    pub fn title(&self) -> String {
        self.info.get("title").and_then(Value::as_str).unwrap_or("").to_string()
    }

    pub fn running(&self) -> bool {
        self.engine.is_some()
    }

    /// Loads what the daemon built: a module's code, a template's data, or the problems that kept it from building.
    /// A canvas that doesn't build keeps showing the last version that did.
    #[allow(clippy::too_many_arguments)]
    pub fn load(
        &mut self,
        built: &Value,
        state: Map<String, Value>,
        sessions: &Value,
        theme: &Value,
        runtime_js: &str,
        clock: Clock,
        locale: &str,
    ) -> Result<()> {
        self.version = built.get("version").and_then(Value::as_str).map(String::from);
        self.state = state;
        self.pending.clear();
        match built.get("kind").and_then(Value::as_str) {
            Some("problem") => {
                self.problems = built
                    .get("problems")
                    .and_then(Value::as_array)
                    .map(|list| {
                        list.iter()
                            .map(|p| Problem {
                                file: p.get("file").and_then(Value::as_str).unwrap_or("").to_string(),
                                line: p.get("line").and_then(Value::as_u64).unwrap_or(0),
                                column: p.get("column").and_then(Value::as_u64).unwrap_or(0),
                                message: tree::clean(p.get("message").and_then(Value::as_str).unwrap_or("")),
                            })
                            .collect()
                    })
                    .unwrap_or_default();
                return Ok(());
            }
            Some("module") | Some("template") => {}
            _ => return Ok(()),
        }
        self.problems.clear();
        self.crash = None;
        let engine = Engine::new(runtime_js, clock, locale)?;
        let canvas = if built.get("kind").and_then(Value::as_str) == Some("template") {
            json!({ "kind": "template", "template": built.get("template"), "data": built.get("data") })
        } else {
            json!({ "kind": "module" })
        };
        let init = json!({ "canvas": canvas, "state": Value::Object(self.state.clone()), "sessions": sessions, "theme": theme });
        let code = built.get("code").and_then(Value::as_str);
        let started = engine.start(&init.to_string(), code);
        engine.tick(true);
        if let Err(e) = started {
            self.crash = Some(clip(&e.to_string(), 4000));
        }
        self.engine = Some(engine);
        self.pump();
        Ok(())
    }

    /// Starts a canvas from a fixture, without a daemon: for snapshots and tests.
    pub fn from_fixture(fixture: &Value, runtime_js: &str, clock: Clock, theme: &Value) -> Result<Canvas> {
        let mut c = Canvas::new(json!({ "id": fixture.get("name"), "title": fixture.get("name") }));
        let init = &fixture["init"];
        let built = match init["canvas"]["kind"].as_str() {
            Some("template") => {
                json!({ "kind": "template", "template": init["canvas"]["template"], "data": init["canvas"]["data"], "version": "fixture" })
            }
            _ => json!({ "kind": "module", "code": fixture["code"], "version": "fixture" }),
        };
        let state = init["state"].as_object().cloned().unwrap_or_default();
        c.load(&built, state, &init["sessions"], theme, runtime_js, clock, "en-GB")?;
        Ok(c)
    }

    /// Runs what's due in the canvas, and reads what it sent and the tree it drew.
    pub fn pump(&mut self) -> bool {
        let Some(engine) = &self.engine else { return false };
        engine.tick(false);
        let posts = engine.posts();
        let changed = engine.take();
        let failed = engine.error();
        for json in posts {
            self.handle(&json);
        }
        if let Some(e) = failed
            && self.crash.is_none()
        {
            self.crash = Some(clip(&tree::clean(&e), 4000));
        }
        match changed.map(|j| tree::parse(&j)) {
            Some(Ok(t)) => {
                self.tree = t;
                true
            }
            Some(Err(e)) => {
                self.crash.get_or_insert(format!("The canvas's tree couldn't be read: {e}"));
                false
            }
            None => false,
        }
    }

    pub fn next_timer(&self) -> Option<std::time::Instant> {
        self.engine.as_ref().and_then(Engine::next_timer)
    }

    fn handle(&mut self, json: &str) {
        let Ok(m) = serde_json::from_str::<Value>(json) else { return };
        match m.get("type").and_then(Value::as_str) {
            Some("set-state") => {
                let Some(key) =
                    m.get("key").and_then(Value::as_str).filter(|k| !k.is_empty() && k.chars().count() <= 200)
                else {
                    return;
                };
                let value = m.get("value").cloned().unwrap_or(Value::Null);
                self.state.insert(key.to_string(), value.clone());
                *self.pending.entry(key.to_string()).or_default() += 1;
                self.writes.push_back((key.to_string(), value));
            }
            Some("action") => {
                let id = m.get("id").and_then(Value::as_str).unwrap_or("").to_string();
                match m.get("action").and_then(Action::parse) {
                    Some(action) if self.asks.is_empty() => self.asks.push_back(Ask { reply: id, action }),
                    Some(_) => self.reply(&id, false, "Another action is waiting for you.", None),
                    None => self.reply(&id, false, "The viewer doesn't know that action.", None),
                }
            }
            Some("error") => {
                let message = m.get("message").and_then(Value::as_str).unwrap_or("");
                self.crash.get_or_insert(clip(&tree::clean(message), 4000));
            }
            Some("file") => {
                let id = m.get("id").and_then(Value::as_str).unwrap_or("").to_string();
                self.reply(&id, false, "The terminal shows files itself.", None);
            }
            _ => {}
        }
    }

    /// A state write reached the daemon.
    pub fn written(&mut self, key: &str) {
        if let Some(n) = self.pending.get_mut(key) {
            *n = n.saturating_sub(1);
            if *n == 0 {
                self.pending.remove(key);
            }
        }
    }

    /// The daemon's state for the canvas, with what's still on its way kept as it is here.
    pub fn state_changed(&mut self, state: &Value) {
        let Some(theirs) = state.as_object() else { return };
        let mut merged = theirs.clone();
        for key in self.pending.keys() {
            match self.state.get(key) {
                Some(v) => merged.insert(key.clone(), v.clone()),
                None => merged.remove(key),
            };
        }
        self.state = merged;
        self.send(json!({ "type": "state", "state": Value::Object(self.state.clone()) }));
    }

    pub fn sessions(&mut self, sessions: &Value) {
        self.send(json!({ "type": "sessions", "sessions": sessions }));
    }

    pub fn theme(&mut self, theme: &Value) {
        self.send(json!({ "type": "theme", "theme": theme }));
    }

    /// Answers the canvas's request for an action, as it asked.
    pub fn reply(&mut self, id: &str, ok: bool, message: &str, session: Option<&str>) {
        self.send(json!({ "type": "reply", "id": id, "ok": ok, "message": message, "session": session }));
    }

    fn send(&mut self, message: Value) {
        if let Some(e) = &self.engine {
            e.receive(&message.to_string());
        }
        self.pump();
    }

    /// Calls a handler on an element in the canvas.
    pub fn dispatch(&mut self, node: u64, name: &str, args: &[Value]) -> bool {
        let Some(e) = &self.engine else { return false };
        let ok = e.dispatch(node, name, &Value::Array(args.to_vec()).to_string());
        self.pump();
        ok
    }

    pub fn settle(&mut self) {
        if let Some(e) = &self.engine {
            e.tick(true);
        }
        self.pump();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn actions_as_the_viewer_takes_them() {
        assert_eq!(
            Action::parse(&json!({ "type": "startSession", "prompt": "Go", "mode": "background" })),
            Some(Action::StartSession { prompt: "Go".into(), mode: Some("background".into()) })
        );
        assert_eq!(Action::parse(&json!({ "type": "startSession", "prompt": "  " })), None, "an empty prompt");
        assert_eq!(Action::parse(&json!({ "type": "startSession", "prompt": "Go", "mode": "elsewhere" })), None);
        assert_eq!(Action::parse(&json!({ "type": "openUrl", "url": "javascript:alert(1)" })), None, "only web pages");
        assert_eq!(Action::parse(&json!({ "type": "openFile", "path": "a.md", "line": 0 })), None, "lines start at 1");
        assert_eq!(Action::parse(&json!({ "type": "openSession", "id": "x".repeat(201) })), None);
        assert_eq!(Action::parse(&json!({ "type": "runShell", "command": "rm -rf /" })), None, "only what it knows");
    }
}

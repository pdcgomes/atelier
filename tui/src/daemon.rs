//! The atelier daemon, as the CLI and haunt reach it: its port and token
//! from `~/.atelier/daemon.json`, the token as a bearer header, and its
//! server-sent events on a thread of their own, which reconnects when the
//! daemon restarts. The token changes then, so a refused call reads the file
//! again and tries once more.

use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::sync::mpsc::Sender;
use std::sync::{Arc, Mutex};
use std::time::Duration;

use anyhow::{Result, anyhow};
use serde_json::Value;
use ureq::Agent;

#[derive(Debug, Clone)]
pub struct Info {
    pub port: u16,
    pub token: String,
    pub version: String,
}

/// Where atelier keeps its own files: `$ATELIER_HOME`, or `~/.atelier`.
pub fn home() -> PathBuf {
    std::env::var_os("ATELIER_HOME")
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from(std::env::var_os("HOME").unwrap_or_default()).join(".atelier"))
}

pub fn read_info() -> Option<Info> {
    let text = std::fs::read_to_string(home().join("daemon.json")).ok()?;
    let v: Value = serde_json::from_str(&text).ok()?;
    Some(Info {
        port: v.get("port")?.as_u64()? as u16,
        token: v.get("token")?.as_str()?.to_string(),
        version: v.get("version").and_then(Value::as_str).unwrap_or("").to_string(),
    })
}

/// What the event stream says, for the view's loop.
#[derive(Debug, Clone)]
pub enum Event {
    /// The stream is open; the daemon is at this version.
    Up(String),
    /// An event from the daemon: `hello`, `canvases`, `canvas`, `state`, `sessions`, `runs`, `run`, `settings`, `show`.
    Message(String, Value),
    /// The daemon can't be reached, or refused us.
    Down(String),
}

#[derive(Clone)]
pub struct Client {
    agent: Agent,
    info: Arc<Mutex<Option<Info>>>,
}

pub struct Reply {
    pub status: u16,
    pub body: Vec<u8>,
    pub etag: Option<String>,
    pub mime: String,
}

impl Reply {
    pub fn json(&self) -> Result<Value> {
        Ok(serde_json::from_slice(&self.body)?)
    }
}

fn agent(timeout: Option<Duration>) -> Agent {
    Agent::config_builder().proxy(None).http_status_as_error(false).timeout_global(timeout).build().into()
}

impl Client {
    pub fn new() -> Client {
        Client { agent: agent(Some(Duration::from_secs(60))), info: Arc::new(Mutex::new(read_info())) }
    }

    pub fn info(&self) -> Option<Info> {
        self.info.lock().unwrap().clone()
    }

    fn refresh(&self) -> Option<Info> {
        let fresh = read_info();
        *self.info.lock().unwrap() = fresh.clone();
        fresh
    }

    fn send(&self, method: &str, path: &str, body: Option<&Value>, etag: Option<&str>) -> Result<Reply> {
        for attempt in 0..2 {
            let info = if attempt == 0 { self.info().or_else(|| self.refresh()) } else { self.refresh() };
            let info = info.ok_or_else(|| anyhow!("atelier's daemon isn't running: `atelier open` starts it"))?;
            let url = format!("http://127.0.0.1:{}{}", info.port, path);
            let auth = format!("Bearer {}", info.token);
            let result = match (method, body) {
                ("GET", _) => {
                    let mut req = self.agent.get(&url).header("authorization", &auth);
                    if let Some(tag) = etag {
                        req = req.header("if-none-match", tag);
                    }
                    req.call()
                }
                ("PUT", b) => self
                    .agent
                    .put(&url)
                    .header("authorization", &auth)
                    .header("content-type", "application/json")
                    .send(b.map(Value::to_string).unwrap_or_default()),
                (_, b) => self
                    .agent
                    .post(&url)
                    .header("authorization", &auth)
                    .header("content-type", "application/json")
                    .send(b.map(Value::to_string).unwrap_or_default()),
            };
            let mut res = match result {
                Ok(r) => r,
                Err(e) if attempt == 0 => {
                    let _ = e;
                    continue;
                }
                Err(e) => return Err(anyhow!("atelier's daemon can't be reached: {e}")),
            };
            let status = res.status().as_u16();
            if status == 401 && attempt == 0 {
                continue;
            }
            let etag = res.headers().get("etag").and_then(|v| v.to_str().ok()).map(String::from);
            let mime = res.headers().get("content-type").and_then(|v| v.to_str().ok()).unwrap_or("").to_string();
            let body = res.body_mut().with_config().limit(64 << 20).read_to_vec().unwrap_or_default();
            return Ok(Reply { status, body, etag, mime });
        }
        Err(anyhow!("atelier's daemon refused the token"))
    }

    pub fn get(&self, path: &str) -> Result<Reply> {
        self.send("GET", path, None, None)
    }

    pub fn get_if(&self, path: &str, etag: Option<&str>) -> Result<Reply> {
        self.send("GET", path, None, etag)
    }

    pub fn get_json(&self, path: &str) -> Result<Value> {
        let r = self.get(path)?;
        if r.status >= 400 && r.status != 422 {
            return Err(anyhow!(error_of(&r)));
        }
        r.json()
    }

    pub fn put_json(&self, path: &str, body: &Value) -> Result<Value> {
        let r = self.send("PUT", path, Some(body), None)?;
        if r.status >= 400 {
            return Err(anyhow!(error_of(&r)));
        }
        r.json()
    }

    pub fn post_json(&self, path: &str, body: &Value) -> Result<Value> {
        let r = self.send("POST", path, Some(body), None)?;
        if r.status >= 400 {
            return Err(anyhow!(error_of(&r)));
        }
        r.json()
    }

    /// Follows the daemon's events on a thread, as a terminal viewer, until the program ends.
    pub fn follow(&self, tx: Sender<Event>) {
        let client = self.clone();
        std::thread::spawn(move || {
            let mut wait = Duration::from_millis(300);
            loop {
                match client.stream(&tx) {
                    Ok(()) => wait = Duration::from_millis(300),
                    Err(e) => {
                        if tx.send(Event::Down(e.to_string())).is_err() {
                            return;
                        }
                    }
                }
                std::thread::sleep(wait);
                wait = (wait * 2).min(Duration::from_secs(5));
                client.refresh();
            }
        });
    }

    fn stream(&self, tx: &Sender<Event>) -> Result<()> {
        let info = self.refresh().ok_or_else(|| anyhow!("atelier's daemon isn't running: `atelier open` starts it"))?;
        let url = format!("http://127.0.0.1:{}/api/events?viewer=terminal", info.port);
        let mut res = agent(None)
            .get(&url)
            .header("authorization", &format!("Bearer {}", info.token))
            .call()
            .map_err(|e| anyhow!("atelier's daemon can't be reached: {e}"))?;
        match res.status().as_u16() {
            200 => {}
            401 => return Err(anyhow!("atelier's daemon refused the token")),
            s => return Err(anyhow!("atelier's daemon answered {s}")),
        }
        tx.send(Event::Up(info.version.clone())).ok();
        let reader = BufReader::new(res.body_mut().as_reader());
        let (mut name, mut data) = (String::new(), String::new());
        for line in reader.lines() {
            let line = line.map_err(|e| anyhow!("the daemon's events stopped: {e}"))?;
            if line.is_empty() {
                if !data.is_empty() {
                    let value = serde_json::from_str(&data).unwrap_or(Value::Null);
                    if tx.send(Event::Message(std::mem::take(&mut name), value)).is_err() {
                        return Ok(());
                    }
                }
                name.clear();
                data.clear();
            } else if let Some(n) = line.strip_prefix("event: ") {
                name = n.to_string();
            } else if let Some(d) = line.strip_prefix("data: ") {
                data.push_str(d);
            }
        }
        Err(anyhow!("atelier's daemon stopped"))
    }
}

impl Default for Client {
    fn default() -> Self {
        Self::new()
    }
}

fn error_of(r: &Reply) -> String {
    serde_json::from_slice::<Value>(&r.body)
        .ok()
        .and_then(|v| v.get("error").and_then(Value::as_str).map(String::from))
        .unwrap_or_else(|| format!("atelier's daemon answered {}", r.status))
}

/// A query string's value, escaped.
pub fn escape(s: &str) -> String {
    let mut out = String::new();
    for b in s.bytes() {
        if b.is_ascii_alphanumeric() || b"-_.~/".contains(&b) {
            out.push(b as char);
        } else {
            out.push_str(&format!("%{b:02X}"));
        }
    }
    out
}

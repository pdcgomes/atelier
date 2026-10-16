//! The sealed engine a canvas runs in: QuickJS, one runtime for each canvas,
//! with terminal.js (React, React DOM, the kit's terminal side, the templates'
//! views) and the canvas's code. It has no files, no network and no
//! processes: the only way out is `__host`, which takes the messages a
//! browser frame could send (state, actions to confirm, errors) and keeps
//! its timers. Every call into it has a time limit, and the runtime a memory
//! limit.

use std::cell::{Cell, RefCell};
use std::collections::BTreeMap;
use std::rc::Rc;
use std::time::{Duration, Instant};

use anyhow::{Result, anyhow};
use rquickjs::{CatchResultExt, Context, Function, Module, Object, Runtime, Value};

const MEMORY: usize = 256 * 1024 * 1024;
const STACK: usize = 4 * 1024 * 1024;
/// How long one turn of a canvas may run: a render, a handler, a timer.
const TURN: Duration = Duration::from_secs(3);
/// Timers this soon count as "now" when a snapshot settles.
const SOON_MS: f64 = 50.0;

/// What time the canvas sees.
#[derive(Clone, Copy, Debug)]
pub enum Clock {
    Real,
    /// A fixed time, in milliseconds since the epoch, for snapshots and tests.
    Fixed(i64),
}

impl Clock {
    pub fn now_ms(self) -> i64 {
        match self {
            Clock::Real => chrono::Utc::now().timestamp_millis(),
            Clock::Fixed(t) => t,
        }
    }
}

#[derive(Default)]
struct Shared {
    posts: Vec<String>,
    /// Timer id to when it's due, and its delay.
    timers: BTreeMap<u32, (Instant, f64)>,
    logs: Vec<(String, String)>,
}

pub struct Engine {
    rt: Runtime,
    ctx: Context,
    shared: Rc<RefCell<Shared>>,
    deadline: Rc<Cell<Option<Instant>>>,
    pub clock: Clock,
    failed: RefCell<Option<String>>,
}

fn text_of(v: &Value<'_>) -> String {
    if let Some(s) = v.as_string() {
        return s.to_string().unwrap_or_default();
    }
    if let Some(o) = v.as_object() {
        let message: Option<String> = o.get("message").ok();
        let stack: Option<String> = o.get("stack").ok();
        if let Some(m) = message {
            return match stack {
                Some(s) if !s.is_empty() => format!("{m}\n{s}"),
                _ => m,
            };
        }
    }
    format!("{v:?}")
}

impl Engine {
    /// A new engine with terminal.js loaded. `locale` is how dates are
    /// written (`en-GB`, `en-US`), since QuickJS has no Intl.
    pub fn new(runtime_js: &str, clock: Clock, locale: &str) -> Result<Engine> {
        let rt = Runtime::new()?;
        rt.set_memory_limit(MEMORY);
        rt.set_max_stack_size(STACK);
        let deadline: Rc<Cell<Option<Instant>>> = Rc::new(Cell::new(None));
        let watch = deadline.clone();
        rt.set_interrupt_handler(Some(Box::new(move || watch.get().is_some_and(|d| Instant::now() > d))));
        let ctx = Context::full(&rt)?;
        let shared = Rc::new(RefCell::new(Shared::default()));
        let engine = Engine { rt, ctx, shared, deadline, clock, failed: RefCell::new(None) };
        engine.install(locale)?;
        engine.within(|ctx| {
            ctx.eval::<(), _>(runtime_js.as_bytes().to_vec())
                .catch(&ctx)
                .map_err(|e| anyhow!("terminal.js didn't load: {e}"))
        })?;
        Ok(engine)
    }

    fn install(&self, locale: &str) -> Result<()> {
        let shared = self.shared.clone();
        let clock = self.clock;
        let locale = locale.to_string();
        self.ctx.with(|ctx| -> rquickjs::Result<()> {
            let host = Object::new(ctx.clone())?;
            let s = shared.clone();
            host.set("post", Function::new(ctx.clone(), move |json: String| s.borrow_mut().posts.push(json))?)?;
            let s = shared.clone();
            host.set(
                "timer",
                Function::new(ctx.clone(), move |id: u32, ms: f64| {
                    let ms = ms.max(0.0);
                    s.borrow_mut().timers.insert(id, (Instant::now() + Duration::from_secs_f64(ms / 1000.0), ms));
                })?,
            )?;
            let s = shared.clone();
            host.set(
                "cancel",
                Function::new(ctx.clone(), move |id: u32| {
                    s.borrow_mut().timers.remove(&id);
                })?,
            )?;
            host.set("now", Function::new(ctx.clone(), move || clock.now_ms() as f64)?)?;
            let s = shared.clone();
            host.set(
                "log",
                Function::new(ctx.clone(), move |level: String, text: String| {
                    let mut s = s.borrow_mut();
                    if s.logs.len() < 200 {
                        s.logs.push((level, text));
                    }
                })?,
            )?;
            host.set("locale", locale.as_str())?;
            ctx.globals().set("__host", host)?;
            Ok(())
        })?;
        Ok(())
    }

    /// Runs `f` in the context with a time limit, then the promise jobs it queued.
    fn within<R>(&self, f: impl FnOnce(rquickjs::Ctx<'_>) -> Result<R>) -> Result<R> {
        self.deadline.set(Some(Instant::now() + TURN));
        let out = self.ctx.with(f);
        self.jobs();
        self.deadline.set(None);
        if self.deadline_passed() {
            let message = "This canvas took too long: it was stopped after 3 seconds.".to_string();
            self.failed.borrow_mut().get_or_insert(message.clone());
            return Err(anyhow!(message));
        }
        out
    }

    fn deadline_passed(&self) -> bool {
        self.failed.borrow().as_deref().is_some_and(|f| f.starts_with("This canvas took too long"))
    }

    fn jobs(&self) {
        loop {
            match self.rt.execute_pending_job() {
                Ok(true) => continue,
                Ok(false) => break,
                Err(e) => {
                    let message = e.0.with(|ctx| text_of(&ctx.catch()));
                    self.note(message);
                }
            }
        }
    }

    fn note(&self, message: String) {
        if message.contains("interrupted") {
            self.failed.borrow_mut().get_or_insert("This canvas took too long: it was stopped after 3 seconds.".into());
        } else {
            self.failed.borrow_mut().get_or_insert(message);
        }
    }

    fn call(
        &self,
        name: &str,
        args: impl for<'js> FnOnce(&rquickjs::Ctx<'js>) -> rquickjs::Result<Vec<Value<'js>>>,
    ) -> Result<Option<String>> {
        let name = name.to_string();
        let out = self.within(|ctx| {
            let terminal: Object = ctx.globals().get("__terminal").map_err(|e| anyhow!("{e}"))?;
            let f: Function = terminal.get(name.as_str()).map_err(|e| anyhow!("{e}"))?;
            let list = args(&ctx).map_err(|e| anyhow!("{e}"))?;
            let mut a = rquickjs::function::Args::new(ctx.clone(), list.len());
            for v in list {
                a.push_arg(v).map_err(|e| anyhow!("{e}"))?;
            }
            match f.call_arg::<Value>(a).catch(&ctx) {
                Ok(v) => Ok(if v.is_null() || v.is_undefined() {
                    None
                } else if let Some(s) = v.as_string() {
                    Some(s.to_string().unwrap_or_default())
                } else {
                    v.as_bool().map(|b| b.to_string())
                }),
                Err(e) => Err(anyhow!("{e}")),
            }
        });
        if let Err(e) = &out {
            self.note(e.to_string());
        }
        out
    }

    fn string<'js>(ctx: &rquickjs::Ctx<'js>, s: &str) -> rquickjs::Result<Value<'js>> {
        Ok(rquickjs::String::from_str(ctx.clone(), s)?.into_value())
    }

    /// Starts a canvas: `init` as the viewer sends a frame, and for a module
    /// canvas its compiled code, which is evaluated as a module and mounted.
    pub fn start(&self, init_json: &str, module_code: Option<&str>) -> Result<()> {
        let init = init_json.to_string();
        self.call("start", move |ctx| Ok(vec![Self::string(ctx, &init)?]))?;
        if let Some(code) = module_code {
            let code = code.to_string();
            self.within(|ctx| {
                let declared =
                    Module::declare(ctx.clone(), "canvas.js", code).catch(&ctx).map_err(|e| anyhow!("{e}"))?;
                let (module, promise) = declared.eval().catch(&ctx).map_err(|e| anyhow!("{e}"))?;
                promise.finish::<()>().catch(&ctx).map_err(|e| anyhow!("{e}"))?;
                let ns = module.namespace().catch(&ctx).map_err(|e| anyhow!("{e}"))?;
                let terminal: Object = ctx.globals().get("__terminal").map_err(|e| anyhow!("{e}"))?;
                let mount: Function = terminal.get("mount").map_err(|e| anyhow!("{e}"))?;
                mount.call::<_, ()>((ns,)).catch(&ctx).map_err(|e| anyhow!("{e}"))?;
                Ok(())
            })
            .inspect_err(|e| {
                self.note(format!("This canvas didn't start: {e}"));
            })?;
        }
        Ok(())
    }

    /// A message for the canvas: state, sessions, the theme, a reply.
    pub fn receive(&self, json: &str) {
        let json = json.to_string();
        let _ = self.call("receive", move |ctx| Ok(vec![Self::string(ctx, &json)?]));
    }

    /// Calls a handler on an element: a kit element's by name, or an HTML element's click.
    pub fn dispatch(&self, id: u64, name: &str, args_json: &str) -> bool {
        let (name, args) = (name.to_string(), args_json.to_string());
        matches!(
            self.call("dispatch", move |ctx| Ok(vec![
                Value::new_number(ctx.clone(), id as f64),
                Self::string(ctx, &name)?,
                Self::string(ctx, &args)?,
            ])),
            Ok(Some(s)) if s == "true"
        )
    }

    /// Runs the timers that are due; with `settle`, also those due soon, as a snapshot needs.
    pub fn tick(&self, settle: bool) {
        for _ in 0..64 {
            let now = Instant::now();
            let due: Vec<u32> = self
                .shared
                .borrow()
                .timers
                .iter()
                .filter(|(_, (at, ms))| *at <= now || (settle && *ms <= SOON_MS))
                .map(|(id, _)| *id)
                .collect();
            if due.is_empty() {
                break;
            }
            for id in due {
                self.shared.borrow_mut().timers.remove(&id);
                let _ = self.call("fire", move |ctx| Ok(vec![Value::new_number(ctx.clone(), id as f64)]));
            }
            if !settle {
                break;
            }
        }
    }

    /// When the next timer is due, for the event loop to wake.
    pub fn next_timer(&self) -> Option<Instant> {
        self.shared.borrow().timers.values().map(|(at, _)| *at).min()
    }

    /// The tree, as JSON, if it has changed since it was last taken.
    pub fn take(&self) -> Option<String> {
        self.call("take", |_| Ok(vec![])).ok().flatten()
    }

    /// The messages the canvas has sent since this was last asked.
    pub fn posts(&self) -> Vec<String> {
        std::mem::take(&mut self.shared.borrow_mut().posts)
    }

    pub fn logs(&self) -> Vec<(String, String)> {
        std::mem::take(&mut self.shared.borrow_mut().logs)
    }

    /// The first thing that went wrong, if anything did.
    pub fn error(&self) -> Option<String> {
        if let Some(f) = self.failed.borrow().clone() {
            return Some(f);
        }
        self.call("error", |_| Ok(vec![])).ok().flatten()
    }

    pub fn memory(&self) -> i64 {
        self.rt.memory_usage().memory_used_size
    }
}

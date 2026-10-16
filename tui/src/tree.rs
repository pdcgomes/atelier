//! The tree a canvas renders to, as terminal.js hands it over
//! (packages/kit/src/terminal/tree.ts): kit elements with their props as
//! JSON, the React nodes in their props as named slots and the names of
//! their handlers, and the HTML the kit and canvases use. Every string in it
//! is cleaned of control characters as it's read, so nothing a canvas says
//! can reach the terminal as an escape sequence.

use std::collections::BTreeMap;

use serde::Deserialize;
use serde_json::{Map, Value};

#[derive(Debug, Clone, Deserialize)]
#[serde(untagged)]
pub enum Child {
    Text(String),
    El(Node),
}

#[derive(Debug, Clone, Deserialize, Default)]
pub struct Node {
    pub t: String,
    pub id: u64,
    #[serde(default)]
    pub p: Map<String, Value>,
    #[serde(default)]
    pub c: Vec<Child>,
    #[serde(default)]
    pub s: BTreeMap<String, Vec<Child>>,
    #[serde(default)]
    pub h: Vec<String>,
}

/// The tones a component can be drawn in.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Tone {
    Default,
    Accent,
    Success,
    Warning,
    Danger,
    Info,
    Muted,
    Secondary,
}

impl Tone {
    pub fn parse(s: &str) -> Option<Tone> {
        Some(match s {
            "default" => Tone::Default,
            "accent" => Tone::Accent,
            "success" => Tone::Success,
            "warning" => Tone::Warning,
            "danger" => Tone::Danger,
            "info" => Tone::Info,
            "muted" => Tone::Muted,
            "secondary" => Tone::Secondary,
            _ => return None,
        })
    }
}

/// Text as it may be drawn: no escape sequences, no other control or
/// direction-changing characters, tabs as spaces.
pub fn clean(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for c in s.chars() {
        match c {
            '\n' => out.push('\n'),
            '\t' => out.push_str("  "),
            c if c.is_control() => {}
            '\u{200e}' | '\u{200f}' | '\u{202a}'..='\u{202e}' | '\u{2066}'..='\u{2069}' => {}
            c => out.push(c),
        }
    }
    out
}

fn clean_value(v: &mut Value) {
    match v {
        Value::String(s) => {
            if s.chars().any(|c| {
                c.is_control()
                    || matches!(c, '\u{200e}' | '\u{200f}' | '\u{202a}'..='\u{202e}' | '\u{2066}'..='\u{2069}')
            }) {
                *s = clean(s);
            }
        }
        Value::Array(list) => list.iter_mut().for_each(clean_value),
        Value::Object(map) => map.values_mut().for_each(clean_value),
        _ => {}
    }
}

fn clean_child(c: &mut Child) {
    match c {
        Child::Text(s) => *s = clean(s),
        Child::El(n) => {
            n.t.retain(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_');
            n.p.values_mut().for_each(clean_value);
            n.c.iter_mut().for_each(clean_child);
            for slot in n.s.values_mut() {
                slot.iter_mut().for_each(clean_child);
            }
        }
    }
}

/// Reads a tree from terminal.js's JSON, cleaning it as it goes.
pub fn parse(json: &str) -> anyhow::Result<Vec<Child>> {
    let mut list: Vec<Child> = serde_json::from_str(json)?;
    list.iter_mut().for_each(clean_child);
    Ok(list)
}

impl Node {
    pub fn str(&self, key: &str) -> Option<&str> {
        self.p.get(key).and_then(Value::as_str)
    }
    pub fn num(&self, key: &str) -> Option<f64> {
        self.p.get(key).and_then(Value::as_f64)
    }
    pub fn flag(&self, key: &str) -> bool {
        self.p.get(key).and_then(Value::as_bool).unwrap_or(false)
    }
    pub fn tone(&self, key: &str) -> Option<Tone> {
        self.str(key).and_then(Tone::parse)
    }
    pub fn list(&self, key: &str) -> &[Value] {
        self.p.get(key).and_then(Value::as_array).map(Vec::as_slice).unwrap_or(&[])
    }
    pub fn slot(&self, name: &str) -> &[Child] {
        self.s.get(name).map(Vec::as_slice).unwrap_or(&[])
    }
    pub fn has_slot(&self, name: &str) -> bool {
        self.s.get(name).is_some_and(|s| !s.is_empty())
    }
    pub fn handles(&self, name: &str) -> bool {
        self.h.iter().any(|h| h == name)
    }
    /// A CSS property from an HTML element's style, or a kit element's `style` prop.
    pub fn style(&self, key: &str) -> Option<String> {
        self.p.get("style").and_then(|s| s.get(key)).map(|v| match v {
            Value::String(s) => s.clone(),
            other => other.to_string(),
        })
    }
    /// The class names an HTML element has.
    pub fn classes(&self) -> impl Iterator<Item = &str> {
        self.str("class").or_else(|| self.str("className")).unwrap_or("").split_whitespace()
    }
}

/// The text in some children, without their styles: what a slot says.
pub fn text_of(children: &[Child]) -> String {
    let mut out = String::new();
    fn go(list: &[Child], out: &mut String) {
        for c in list {
            match c {
                Child::Text(s) => out.push_str(s),
                Child::El(n) => {
                    if n.t == "br" {
                        out.push(' ');
                    }
                    if let Some(t) = n.str("text").filter(|_| matches!(n.t.as_str(), "Code" | "Time")) {
                        out.push_str(t);
                    }
                    go(&n.c, out);
                }
            }
        }
    }
    go(children, &mut out);
    out
}

/// Every element in a tree, slots included, with its parent's id.
pub fn walk<'a>(list: &'a [Child], parent: Option<u64>, f: &mut dyn FnMut(&'a Node, Option<u64>)) {
    for c in list {
        if let Child::El(n) = c {
            f(n, parent);
            walk(&n.c, Some(n.id), f);
            for slot in n.s.values() {
                walk(slot, Some(n.id), f);
            }
        }
    }
}

/// Finds an element by id.
pub fn find(list: &[Child], id: u64) -> Option<&Node> {
    let mut found = None;
    walk(list, None, &mut |n, _| {
        if found.is_none() && n.id == id {
            found = Some(n);
        }
    });
    found
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn nothing_a_canvas_says_reaches_the_terminal_as_an_escape() {
        let tree = parse(r#"[{"t":"Text","id":1,"p":{"tone":"x\u001b]52;c;aGk=\u0007"},"c":["hi\u001b[2Jthere\u202e!"],"s":{"title":["\u009b31m"]}}]"#).unwrap();
        let Child::El(n) = &tree[0] else { panic!() };
        assert_eq!(n.str("tone"), Some("x]52;c;aGk="));
        assert!(matches!(&n.c[0], Child::Text(s) if s == "hi[2Jthere!"));
        assert_eq!(text_of(n.slot("title")), "31m");
    }

    #[test]
    fn reads_props_slots_and_handlers() {
        let tree = parse(r#"[{"t":"Panel","id":3,"p":{"tone":"warning","focus":true},"s":{"title":["Needs you"]},"h":["press"],"c":[{"t":"span","id":4,"p":{"class":"at-text-3","style":{"paddingLeft":"24px"}}}]}]"#).unwrap();
        let Child::El(n) = &tree[0] else { panic!() };
        assert_eq!(n.tone("tone"), Some(Tone::Warning));
        assert!(n.flag("focus") && n.handles("press"));
        assert_eq!(text_of(n.slot("title")), "Needs you");
        let Child::El(span) = &n.c[0] else { panic!() };
        assert_eq!(span.classes().collect::<Vec<_>>(), ["at-text-3"]);
        assert_eq!(span.style("paddingLeft").as_deref(), Some("24px"));
        assert!(find(&tree, 4).is_some());
    }
}

//! atelier-tui draws everything the kit has: every component, every prop of
//! each, every HTML element the kit uses, and every message a canvas can
//! send. packages/kit/kit.json is the list, generated from the kit by
//! scripts/manifest.mjs, so the kit can't gain any of these without this
//! failing until the terminal draws it too.

use std::collections::{BTreeMap, BTreeSet};

use atelier_tui::{canvas, kit};
use serde::Deserialize;

#[derive(Deserialize)]
struct Component {
    props: Vec<String>,
    composed: bool,
}

#[derive(Deserialize)]
struct Kit {
    components: BTreeMap<String, Component>,
    html: Vec<String>,
    messages: Vec<String>,
}

fn kit_json() -> Kit {
    serde_json::from_str(include_str!("../../packages/kit/kit.json")).expect("packages/kit/kit.json")
}

#[test]
fn every_component_in_the_kit_has_a_renderer() {
    let kit = kit_json();
    let missing: Vec<&String> = kit
        .components
        .iter()
        .filter(|(name, c)| !c.composed && !kit::all().iter().any(|r| r.name == name.as_str()))
        .map(|(n, _)| n)
        .collect();
    assert!(
        missing.is_empty(),
        "these components have no renderer in tui/src/kit: {missing:?}. Write one (docs/design.md says how), and give it a sample in examples/components/components.canvas.tsx."
    );
}

#[test]
fn every_renderer_is_for_a_component_the_kit_has() {
    let kit = kit_json();
    let stale: Vec<&str> = kit::all().iter().map(|r| r.name).filter(|n| !kit.components.contains_key(*n)).collect();
    assert!(stale.is_empty(), "these renderers are for components the kit no longer has: {stale:?}");
}

#[test]
fn every_prop_of_every_component_is_drawn_or_said_not_to_apply() {
    let kit = kit_json();
    let mut problems = Vec::new();
    for r in kit::all() {
        let Some(c) = kit.components.get(r.name) else { continue };
        let accounted: BTreeSet<&str> = r.draws.iter().copied().chain(r.not_here.iter().map(|(p, _)| *p)).collect();
        for p in &c.props {
            if !accounted.contains(p.as_str()) {
                problems.push(format!("{}.{p} is neither drawn nor said not to apply in a terminal", r.name));
            }
        }
        for p in &accounted {
            if !c.props.iter().any(|x| x == p) {
                problems.push(format!("{}'s renderer lists {p}, which the kit's {} doesn't have", r.name, r.name));
            }
        }
        for (p, why) in r.not_here {
            if why.trim().len() < 12 {
                problems.push(format!("{}.{p} needs a reason it doesn't apply in a terminal", r.name));
            }
        }
    }
    assert!(problems.is_empty(), "{}", problems.join("\n"));
}

#[test]
fn every_html_element_the_kit_uses_is_drawn() {
    let kit = kit_json();
    let missing: Vec<&String> = kit.html.iter().filter(|t| !kit::html::TAGS.contains(&t.as_str())).collect();
    assert!(missing.is_empty(), "the kit uses HTML this doesn't draw: {missing:?}; add it to tui/src/kit/html.rs");
    for t in &kit.html {
        assert!(kit::html::component(t).is_some(), "{t} has a renderer");
    }
}

#[test]
fn every_message_a_canvas_can_send_is_answered() {
    let kit = kit_json();
    let missing: Vec<&String> = kit.messages.iter().filter(|m| !canvas::HANDLED.contains(&m.as_str())).collect();
    assert!(missing.is_empty(), "a canvas can send {missing:?}, which tui/src/canvas.rs doesn't answer");
}

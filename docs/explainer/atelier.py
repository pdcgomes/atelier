"""Atelier in six scenes: an animated explainer for the README (pixelkit, wide preset).

    PYTHONPATH=~/.cursor/skills/pixel-graphics/scripts python3 docs/explainer/atelier.py

The copy was written by a copywriter and approved by a technical reviewer, a copy editor and a
developer-relations reviewer. Keep it as it is unless they look at it again. The mini canvases are
drawn in real Atelier themes' colours (packages/themes/themes.json).
"""

from pathlib import Path

from pixelkit import Rect, animate, blink, ease_back, ease_out, phase, reveal, stagger

TAGLINE = "LIVE CANVASES FOR CLAUDE CODE"
SCENES = [
    # (seconds, headline, body lines)
    (3.5, None, ["FOR TASKS TOO BIG TO FOLLOW IN A TERMINAL"]),
    (4.0, "LIVE IN YOUR BROWSER", ["CLAUDE WRITES A CANVAS AND ATELIER CHECKS IT",
                                   "THE CANVAS OPENS AND UPDATES EACH TIME CLAUDE SAVES IT"]),
    (4.0, "CLAUDE SEES WHAT YOU DO", ["TICK AN ITEM OR APPROVE A CHANGE ON THE CANVAS",
                                      "CLAUDE CAN WAIT UNTIL YOU DO, THEN CARRY ON"]),
    (4.0, "8 TEMPLATES, OR CUSTOM", ["CLAUDE FILLS IN A TEMPLATE OR WRITES A CANVAS IN REACT",
                                     "76 THEMES · EVERY CANVAS USES THE ONE YOU PICK"]),
    (4.0, "SANDBOXED · YOU CONFIRM", ["A CANVAS RUNS IN ITS OWN FRAME AND CAN'T READ THE PAGE",
                                      "ITS BUTTONS START A CLAUDE SESSION ONLY AFTER YOU CONFIRM"]),
    (4.0, "OPEN SOURCE · MIT", ["A CLAUDE CODE PLUGIN AND AN NPM PACKAGE · SEE THE README",
                                "GITHUB.COM/PDCGOMES/ATELIER"]),
]
TOTAL = sum(s[0] for s in SCENES)
FOOTER = "GITHUB.COM/PDCGOMES/ATELIER · OPEN SOURCE · MIT"
TEMPLATES = ["WORKSTREAM", "STUDIO", "ROOM", "BOARD", "CHECKLIST", "REVIEW", "COMPARE", "REPORT"]

# Real Atelier themes, for the canvases drawn inside the pictures.
THEMES = [
    ("TOKYO NIGHT", dict(bg="#13141c", panel="#1a1b26", surface="#24283b", border="#414868", text="#a9b1d6",
                         accent="#7aa2f7", success="#9ece6a", warning="#e0af68", danger="#f7768e", info="#449dab")),
    ("CATPPUCCIN LATTE", dict(bg="#e3e4e8", panel="#eff1f5", surface="#dce0e8", border="#acb0be", text="#4c4f69",
                              accent="#1d62eb", success="#327d22", warning="#986114", danger="#d20f39", info="#13787d")),
    ("GRUVBOX", dict(bg="#1e1e1e", panel="#282828", surface="#3c3836", border="#665c54", text="#d4be98",
                     accent="#7daea3", success="#a9b665", warning="#d8a657", danger="#ea6962", info="#89b482")),
    ("ROSÉ PINE", dict(bg="#ede7e1", panel="#faf4ed", surface="#f2e9e1", border="#cecacd", text="#575279",
                       accent="#45767f", success="#286983", warning="#966421", danger="#a2596e", info="#9b5e5b")),
]
TOKYO = THEMES[0][1]

POINTER = """
X.....
XX....
XWX...
XWWX..
XWWWX.
XWWWWX
XWWXXX
XXWX..
...X..
"""


def scene_at(t):
    """The scene playing at `t`, and progress through it."""
    sec = t * TOTAL
    start = 0.0
    for i, (length, *_) in enumerate(SCENES):
        if sec < start + length or i == len(SCENES) - 1:
            return i, min(1.0, (sec - start) / length)
        start += length


def mini(c, x, y, w, h, P, title, build=1.0):
    """An Atelier canvas in the viewer, in theme P: the bar, a titled panel, a meter and bars."""
    c.rect(x, y, w, h, P["bg"])
    c.box(x, y, w, h, P["border"])
    c.rect(x + 3, y + 2, 9, 4, P["accent"])
    for k in range(2):
        c.rect(x + 14 + k * 6, y + 2, 4, 4, P["surface"])
    c.rect(x + w - 15, y + 2, 12, 4, P["surface"])
    px, py, pw, ph = x + 3, y + 10, w - 6, h - 13
    c.rect(px, py, pw, ph, P["panel"])
    c.box(px, py, pw, ph, P["border"])
    tw = c.measure(title)
    c.rect(px + 4, py - 2, tw + 2, 5, P["panel"])
    c.text(px + 5, py - 2, title, P["accent"], check=False)
    c.rect(px + 4, py + 7, pw - 8, 3, P["surface"])
    c.rect(px + 4, py + 7, round((pw - 8) * 0.62 * build), 3, P["success"])
    base = py + ph - 4
    heights = [0.45, 0.8, 0.6, 0.95, 0.7, 0.5]
    colours = ["accent", "info", "success", "warning", "danger", "accent"]
    bw = max(3, (pw - 8) // len(heights) - 3)
    for k, (hh, col) in enumerate(zip(heights, colours)):
        bh = round((ph - 20) * hh * ease_out(stagger(build, k, len(heights), overlap=0.7)))
        if bh > 0:
            c.rect(px + 4 + k * (bw + 3), base - bh, bw, bh, P[col])


def pointer(c, x, y):
    c.sprite(round(x), round(y), POINTER, {"X": "shadow", "W": "white"})


def copy_block(c, headline, body, p):
    """The scene's headline at once, and its body typed in."""
    c.text(8, 18, headline, "white", font="large", scale=2, shadow="line")
    c.strip(8, 34, c.measure(headline, "large", 2), 2, c.theme.series)
    for k, line in enumerate(body):
        c.text(8, 40 + k * 8, reveal(line, ease_out(phase(p, 0.04 + k * 0.1, 0.3 + k * 0.1))), "text")


def scene_title(c, p):
    pop = ease_back(phase(p, 0.0, 0.25))
    rise = round((1 - pop) * 12)
    c.chunky(160, 32 + rise, "ATELIER", ["#ffe790", "#ffd53f", "#f5821f"], scale=4, depth=3,
             side=["#99510f", "#5d275d"], outline="#04060b")
    if p > 0.2:
        c.strip(160 - 84, 72, 168, 2, c.theme.series)
    c.text(160, 82, reveal(TAGLINE, ease_out(phase(p, 0.25, 0.5))), "white", font="large", align="center")
    c.text(160, 96, reveal(SCENES[0][2][0], ease_out(phase(p, 0.45, 0.7))), "text", align="center")
    c.sparkles(40, 112, 240, 46, 26, ["line", "dim", "gold.dark"], seed=int(p * 6) + 3, twinkle=0.15)


def scene_live(c, p):
    a = c.node(6, 92, 72, 19, "CLAUDE CODE", color="orange", sub="WRITES A CANVAS")
    b = c.node(98, 92, 64, 19, "ATELIER", color="gold", sub="CHECKS IT")
    c.connect(a, b, "line")
    win = c.panel(184, 60, 130, 102, "BROWSER", color="sky", sub="LIVE")
    c.connect(b, Rect(win.x - 4, a.y, 4, a.h), "line")
    # The canvas file travels from Claude to Atelier, is checked, then goes on to the browser.
    hop1 = ease_out(phase(p, 0.12, 0.35))
    hop2 = ease_out(phase(p, 0.48, 0.66))
    if 0.12 <= p < 0.38:
        c.icon(round(a.x + a.w + (b.x - a.x - a.w - 7) * hop1), 84, "file", "white")
    if p >= 0.4:
        c.icon(b.x + b.w - 9, 86, "check", "green")
    if 0.48 <= p < 0.68:
        c.icon(round(b.x + b.w + (win.x - b.x - b.w - 7) * hop2), 84, "file", "white")
    if p >= 0.66:
        mini(c, win.x, win.y, win.w, win.h, TOKYO, "RELEASE 1.4", build=ease_out(phase(p, 0.66, 0.95)))


def scene_loop(c, p):
    P = TOKYO
    x, y, w, h = 6, 60, 172, 100
    c.rect(x, y, w, h, P["bg"])
    c.box(x, y, w, h, P["border"])
    px, py, pw, ph = x + 4, y + 8, w - 8, h - 12
    c.rect(px, py, pw, ph, P["panel"])
    c.box(px, py, pw, ph, P["warning"])
    c.rect(px + 4, py - 2, c.measure("YOUR CALL") + 2, 5, P["panel"])
    c.text(px + 5, py - 2, "YOUR CALL", P["warning"], check=False)
    c.text(px + 6, py + 9, "APPROVE THE CHANGE", P["text"], font="large", check=False)
    c.text(px + 6, py + 22, "SYNC KEEPS DELETED ITEMS FOR 30 DAYS", P["text"], check=False)
    clicked = p >= 0.5
    ax, ay = px + 6, py + 38
    if clicked:
        c.rect(ax, ay, 38, 11, P["success"])
        c.text(ax + 19, ay + 3, "APPROVED", P["bg"], align="center", check=False)
    else:
        c.rect(ax, ay, 38, 11, P["surface"])
        c.box(ax, ay, 38, 11, P["success"])
        c.text(ax + 19, ay + 3, "APPROVE", P["success"], align="center", check=False)
        c.box(ax + 42, ay, 30, 11, P["border"])
        c.text(ax + 57, ay + 3, "HOLD", P["text"], align="center", check=False)
    if clicked:
        c.icon(ax + 42, ay + 2, "check", "green")
    move = ease_out(phase(p, 0.1, 0.45))
    pointer(c, 150 + (ax + 20 - 150) * move, 150 + (ay + 6 - 150) * move)

    term = c.panel(186, 60, 128, 100, "CLAUDE CODE", color="orange", sub="TERMINAL")
    lines = []
    if p < 0.55:
        dots = "." * (1 + int(p * 12) % 3)
        lines.append(("WAITING FOR APPROVAL" + dots, "dim"))
    else:
        lines.append(("WAITING FOR APPROVAL...", "dim"))
        lines.append((reveal("✓ YOU APPROVED THE CHANGE", ease_out(phase(p, 0.55, 0.7))), "green"))
        lines.append((reveal("CARRYING ON", ease_out(phase(p, 0.7, 0.8))), "text"))
    for k, (line, col) in enumerate(lines):
        c.text(term.x, term.y + k * 9, line, col)
    if blink(p, cycles=6):
        cy = term.y + len(lines) * 9
        c.rect(term.x, cy, 3, 5, "text")


def scene_templates(c, p):
    cols, rows = 2, 4
    gx, gy, tw, th, gap = 6, 62, 80, 22, 3
    for i, name in enumerate(TEMPLATES):
        q = ease_back(stagger(p, i, len(TEMPLATES), start=0.02, end=0.5, overlap=0.5))
        if q <= 0:
            continue
        col, row = i % cols, i // cols
        x, y = gx + col * (tw + gap), gy + row * (th + gap)
        grow = max(1, round(th * min(1.0, q)))
        c.node(x, y + th - grow, tw, grow, name if grow >= 12 else "", color=c.theme.series[i % len(c.theme.series)])
    # One canvas, shown in four of the 76 themes in turn.
    k = min(len(THEMES) - 1, int(phase(p, 0.1, 0.98) * len(THEMES)))
    name, P = THEMES[k]
    mini(c, 176, 62, 138, 86, P, "RELEASE 1.4", build=1.0)
    c.text(245, 152, name, "white", align="center")


def scene_confirm(c, p):
    P = TOKYO
    x, y, w, h = 14, 60, 292, 100
    mini(c, x, y, w, h, P, "RELEASE 1.4")
    if 0.08 <= p < 0.78:
        c.tint(0.6, "shadow", region=Rect(x, y, w, h))
    c.dashes(x - 3, y - 2, w + 6, "cyan")
    c.dashes(x - 3, y + h + 1, w + 6, "cyan")
    c.dashes(x - 3, y - 2, h + 4, "cyan", vertical=True)
    c.dashes(x + w + 2, y - 2, h + 4, "cyan", vertical=True)
    c.icon(x + w - 9, y + h - 9, "lock", "cyan")
    pop = ease_back(phase(p, 0.08, 0.3))
    if 0.08 <= p < 0.78:
        sw = round(170 * min(1.0, pop))
        sx, sy, sh = 160 - sw // 2, 72, 74
        if sw > 40:
            c.rect(sx, sy, sw, sh, P["panel"])
            c.box(sx, sy, sw, sh, P["warning"])
            c.rect(sx + 4, sy - 2, c.measure("START CLAUDE CODE") + 2, 5, P["panel"])
            c.text(sx + 5, sy - 2, "START CLAUDE CODE", P["warning"], check=False)
            if sw >= 170:
                c.rect(sx + 6, sy + 8, sw - 12, 13, P["surface"])
                c.text(sx + 9, sy + 12, "WRITE THE RELEASE NOTES FOR 1.4", P["text"], check=False)
                for k, (label, on) in enumerate((("IN A TERMINAL TAB", True), ("IN THE BACKGROUND", False))):
                    ry = sy + 26 + k * 9
                    c.box(sx + 7, ry, 5, 5, P["accent"] if on else P["border"])
                    if on:
                        c.rect(sx + 9, ry + 2, 1, 1, P["accent"])
                    c.text(sx + 15, ry, label, P["text"], check=False)
                armed = p >= 0.45
                bx, by = sx + sw - 84, sy + sh - 17
                c.box(bx, by, 36, 11, P["border"])
                c.text(bx + 18, by + 3, "CANCEL", P["text"], align="center", check=False)
                c.rect(bx + 40, by, 36, 11, P["accent"] if armed else P["surface"])
                c.text(bx + 58, by + 3, "START", P["bg"] if armed else P["text"], align="center", check=False)
                move = ease_out(phase(p, 0.4, 0.68))
                pointer(c, 250 + (bx + 56 - 250) * move, 154 + (by + 6 - 154) * move)
    if p >= 0.78:
        c.tag(160, 104, "STARTED IN A TERMINAL", "green", align="center")


def scene_get(c, p):
    a = c.node(28, 70, 112, 26, "CLAUDE CODE PLUGIN", color="orange", sub="SKILL · HOOKS · MCP")
    b = c.node(180, 70, 112, 26, "NPM PACKAGE", color="green", sub="THE ATELIER COMMAND")
    c.icon(a.x + a.w - 12, a.y + 5, "bolt", "orange")
    c.icon(b.x + b.w - 12, b.y + 5, "package", "green")
    c.text(160, 79, "+", "white", font="large", align="center")
    pop = ease_back(phase(p, 0.3, 0.55))
    if p >= 0.3:
        c.chunky(160, 112 + round((1 - pop) * 8), "ATELIER", ["#ffe790", "#ffd53f", "#f5821f"], scale=3, depth=2,
                 side=["#99510f", "#5d275d"], outline="#04060b")
    if p >= 0.5:
        c.strip(160 - 63, 141, 126, 2, c.theme.series)


PICTURES = [scene_title, scene_live, scene_loop, scene_templates, scene_confirm, scene_get]


def draw(c, t):
    i, p = scene_at(t)
    rule = c.footer(FOOTER)
    top = c.header("ATELIER", right=TAGLINE if i > 0 else None)
    seconds, headline, body = SCENES[i]
    if headline:
        copy_block(c, headline, body, p)
    PICTURES[i](c, p)
    # Each scene but the last dissolves away over its final quarter second.
    if i < len(SCENES) - 1:
        out = phase(p, 1 - 0.25 / seconds, 1.0)
        if out > 0:
            c.dissolve(out, "bg", region=Rect(0, top + 1, c.w, rule - top - 2))


animate(draw, Path(__file__).with_suffix(".gif"), preset="wide", seconds=TOTAL, fps=10, hold=3)

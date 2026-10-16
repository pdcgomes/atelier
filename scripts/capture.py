"""Pictures of atelier-tui for the README, from its preview harness.

Each shot is `atelier-tui demo <fixture> --snapshot --ansi` at a size, in a
theme, after some keys: one frame of the viewer, which pyte reads and this
draws as a PNG framed like a macOS terminal window. The fixtures are made-up
canvases (scripts/fixtures.mjs), so nothing real shows. Box-drawing lines,
half blocks and bars are drawn as shapes so they join without gaps, as
ooze's scripts/capture.py does; everything else is text, in SF Mono with
fallbacks for symbols.

    node scripts/build.mjs && node scripts/fixtures.mjs
    cargo build --release --manifest-path tui/Cargo.toml
    pip install pyte pillow fonttools
    python3 scripts/capture.py            # the README's pictures, into docs/screenshots
    python3 scripts/capture.py tui-wireframes   # only these
    python3 scripts/capture.py --all      # every fixture, in two themes, into build/terminal/shots
"""
import json
import os
import subprocess
import sys

import pyte
from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TUI = os.environ.get("ATELIER_TUI", os.path.join(ROOT, "tui", "target", "release", "atelier-tui"))
FIXTURES = os.path.join(ROOT, "build", "terminal", "fixtures")
OUT = os.path.join(ROOT, "docs", "screenshots")
TERMFONTS = "/System/Applications/Utilities/Terminal.app/Contents/Resources/Fonts"

# name: (fixture, theme, cols, rows, keys, what it shows)
SHOTS = {
    "tui-workstream": ("workstream", "tokyo-night", 140, 46, "", "the workstream template, in Tokyo Night"),
    "tui-charts": ("gallery-charts", "gruvbox", 140, 52, "", "the kit's charts in block characters and braille, in Gruvbox"),
    "tui-forms": ("gallery-forms", "catppuccin-latte", 140, 46, "\\t", "forms, a Needs you item and an approval, in Catppuccin Latte"),
    "tui-review": ("review", "rose-pine", 140, 46, "", "the review template, in Rosé Pine"),
    "tui-confirm": ("component-NeedsYou", "kanagawa", 120, 32, "\\t\\t\\t\\t\\n<wait>", "asking an agent: the confirm sheet, with the whole prompt"),
    "tui-themes": ("studio", "tokyo-night", 140, 46, "t<down><down><down>", "the theme picker, previewing as it moves"),
    "tui-components": ("component-Table", "everforest", 120, 36, "0", "the preview harness: every component on its own"),
    "tui-wireframes": ("example-fixer-library-window", "cursor", 140, 46, "", "a wireframes canvas: the library's window, in Cursor's colours"),
}

# ---------------------------------------------------------------- capture


def frame(fixture, theme, cols, rows, keys, full=False):
    args = [TUI, "demo", fixture, "--fixtures", FIXTURES, "--snapshot", "--ansi", "--width", str(cols), "--height", str(rows), "--theme", theme, "--keys", keys]
    if full:
        args.append("--full")
    text = subprocess.run(args, check=True, capture_output=True, text=True).stdout
    lines = text.rstrip("\n").split("\n")
    screen = pyte.Screen(cols, len(lines))
    pyte.Stream(screen).feed("\r\n".join(lines))
    return {y: dict(screen.buffer[y]) for y in range(len(lines))}, len(lines)


# ---------------------------------------------------------------- fonts


class Fonts:
    def __init__(self, size):
        regular = [
            (f"{TERMFONTS}/SF-Mono-Regular.otf", 0),
            ("/System/Library/Fonts/Menlo.ttc", 0),
            ("/System/Library/Fonts/Apple Symbols.ttf", 0),
            ("/System/Library/Fonts/Supplemental/Arial Unicode.ttf", 0),
        ]
        bold = [(f"{TERMFONTS}/SF-Mono-Bold.otf", 0), ("/System/Library/Fonts/Menlo.ttc", 1)] + regular[2:]
        self.size = size
        self.sets = {False: self._load(regular), True: self._load(bold)}
        primary = self.sets[False][0][0]
        self.cw = round(primary.getlength("M"))
        self.ch = round(size * 1.28)

    def _load(self, specs):
        out = []
        for path, index in specs:
            if not os.path.exists(path):
                continue
            font = ImageFont.truetype(path, self.size, index=index)
            cmap = set(TTFont(path, fontNumber=index, lazy=True).getBestCmap())
            out.append((font, cmap))
        return out

    def pick(self, ch, bold):
        for font, cmap in self.sets[bold]:
            if ord(ch) in cmap:
                return font
        return self.sets[bold][0][0]


# ---------------------------------------------------------------- render


def colour(c, fallback):
    if c == "default":
        return fallback
    try:
        return tuple(int(c[i:i + 2], 16) for i in (0, 2, 4))
    except (ValueError, TypeError):
        return fallback


LIGHT = {"─": "lr", "│": "ud", "╭": "rd", "╮": "ld", "╰": "ur", "╯": "ul", "└": "ur", "┘": "ul", "├": "udr", "┤": "udl"}
ROUNDED = set("╭╮╰╯")
HEAVY = {"━": "lr", "┃": "ud"}
BARS = {"▁": 1 / 8, "▂": 2 / 8, "▃": 3 / 8, "▅": 5 / 8, "▆": 6 / 8, "▇": 7 / 8, "█": 1.0}
# A bar growing left to right, in eighths.
ACROSS = {"▏": 1 / 8, "▎": 2 / 8, "▍": 3 / 8, "▌": 4 / 8, "▋": 5 / 8, "▊": 6 / 8, "▉": 7 / 8}


def draw_box(d, ch, x, y, cw, chh, fg, width):
    cx, cy = x + cw // 2, y + chh // 2
    arms = LIGHT.get(ch) or HEAVY.get(ch)
    if ch in ROUNDED:
        r = min(cw, chh) // 2
        if ch == "╭":
            d.arc([cx, cy, cx + 2 * r, cy + 2 * r], 180, 270, fill=fg, width=width)
            d.line([cx + r, cy, x + cw, cy], fill=fg, width=width)
            d.line([cx, cy + r, cx, y + chh], fill=fg, width=width)
        elif ch == "╮":
            d.arc([cx - 2 * r, cy, cx, cy + 2 * r], 270, 360, fill=fg, width=width)
            d.line([x, cy, cx - r, cy], fill=fg, width=width)
            d.line([cx, cy + r, cx, y + chh], fill=fg, width=width)
        elif ch == "╰":
            d.arc([cx, cy - 2 * r, cx + 2 * r, cy], 90, 180, fill=fg, width=width)
            d.line([cx + r, cy, x + cw, cy], fill=fg, width=width)
            d.line([cx, y, cx, cy - r], fill=fg, width=width)
        else:
            d.arc([cx - 2 * r, cy - 2 * r, cx, cy], 0, 90, fill=fg, width=width)
            d.line([x, cy, cx - r, cy], fill=fg, width=width)
            d.line([cx, y, cx, cy - r], fill=fg, width=width)
        return
    half = width // 2
    if "l" in arms:
        d.rectangle([x, cy - half, cx + half, cy - half + width - 1], fill=fg)
    if "r" in arms:
        d.rectangle([cx - half, cy - half, x + cw, cy - half + width - 1], fill=fg)
    if "u" in arms:
        d.rectangle([cx - half, y, cx - half + width - 1, cy + half], fill=fg)
    if "d" in arms:
        d.rectangle([cx - half, cy - half, cx - half + width - 1, y + chh], fill=fg)


def render_terminal(buf, cols, rows, fonts):
    cw, chh = fonts.cw, fonts.ch
    first = buf.get(0, {}).get(0)
    page = colour(first.bg, (0x1A, 0x1B, 0x26)) if first else (0x1A, 0x1B, 0x26)
    text = (0xC0, 0xCA, 0xF5)
    img = Image.new("RGB", (cols * cw, rows * chh), page)
    d = ImageDraw.Draw(img)
    for yy in range(rows):
        line = buf.get(yy, {})
        for xx in range(cols):
            cell = line.get(xx)
            if cell is None:
                continue
            fg = colour(cell.fg, text)
            bg = colour(cell.bg, page)
            if cell.reverse:
                fg, bg = bg, fg
            x, y = xx * cw, yy * chh
            if bg != page:
                d.rectangle([x, y, x + cw - 1, y + chh - 1], fill=bg)
            ch = cell.data
            if not ch or ch in (" ", "\xa0"):
                continue
            if ch == "▀":
                d.rectangle([x, y, x + cw - 1, y + chh // 2 - 1], fill=fg)
            elif ch == "▄":
                d.rectangle([x, y + chh // 2, x + cw - 1, y + chh - 1], fill=fg)
            elif ch in BARS:
                top = y + chh - round(chh * BARS[ch])
                d.rectangle([x, top, x + cw - 1, y + chh - 1], fill=fg)
            elif ch in ACROSS:
                d.rectangle([x, y + 2, x + round(cw * ACROSS[ch]) - 1, y + chh - 3], fill=fg)
            elif ch in LIGHT:
                draw_box(d, ch, x, y, cw, chh, fg, 2)
            elif ch in HEAVY:
                draw_box(d, ch, x, y, cw, chh, fg, 5)
            else:
                font = fonts.pick(ch, cell.bold)
                ascent, descent = font.getmetrics()
                w = font.getlength(ch)
                gx = x + (cw - w) / 2 if w > cw * 1.05 or font is not fonts.sets[cell.bold][0][0] else x
                gy = y + (chh - (ascent + descent)) / 2
                d.text((gx, gy), ch, font=font, fill=fg)
                if cell.underscore:
                    d.line([x, y + chh - 4, x + cw, y + chh - 4], fill=fg, width=2)
    return img, page


def framed(term, page, title="atelier-tui"):
    pad, bar, radius, margin = 28, 64, 22, 70
    w, h = term.width + 2 * pad, term.height + bar + pad
    canvas = Image.new("RGBA", (w + 2 * margin, h + 2 * margin), (0, 0, 0, 0))
    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle([margin, margin + 18, margin + w, margin + h + 18], radius, fill=(0, 0, 0, 120))
    shadow = shadow.filter(ImageFilter.GaussianBlur(28))
    canvas.alpha_composite(shadow)
    win = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    wd = ImageDraw.Draw(win)
    dark = sum(page) < 384
    chrome = tuple(max(0, c - 10) for c in page) if dark else tuple(max(0, c - 18) for c in page)
    edge = tuple(min(255, c + 24) for c in page) if dark else tuple(max(0, c - 40) for c in page)
    wd.rounded_rectangle([0, 0, w - 1, h - 1], radius, fill=page + (255,), outline=edge + (255,), width=2)
    wd.rounded_rectangle([1, 1, w - 2, bar], radius, fill=chrome + (255,))
    wd.rectangle([1, bar - radius, w - 2, bar], fill=chrome + (255,))
    wd.line([1, bar, w - 2, bar], fill=edge + (255,), width=2)
    for i, c in enumerate([(0xFF, 0x5F, 0x57), (0xFE, 0xBC, 0x2E), (0x28, 0xC8, 0x40)]):
        cx = 34 + i * 40
        wd.ellipse([cx - 12, bar // 2 - 12, cx + 12, bar // 2 + 12], fill=c + (255,))
    tf = ImageFont.truetype("/System/Library/Fonts/SFNS.ttf", 26) if os.path.exists("/System/Library/Fonts/SFNS.ttf") else None
    if tf:
        tw = wd.textlength(title, font=tf)
        wd.text(((w - tw) / 2, bar / 2 - 15), title, font=tf, fill=(0x73, 0x7A, 0xA2, 255))
    win.paste(term, (pad, bar + pad // 2))
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, w - 1, h - 1], radius, fill=255)
    canvas.paste(win, (margin, margin), mask)
    return canvas


def shoot(path, fixture, theme, cols, rows, keys, fonts, full=False):
    buf, height = frame(fixture, theme, cols, rows, keys, full)
    term, page = render_terminal(buf, cols, height, fonts)
    framed(term, page).save(path)
    print(path)


if __name__ == "__main__":
    if not os.path.exists(TUI):
        sys.exit(f"There's no {TUI}: cargo build --release --manifest-path tui/Cargo.toml")
    fonts = Fonts(26)
    if "--all" in sys.argv:
        out = os.path.join(ROOT, "build", "terminal", "shots")
        os.makedirs(out, exist_ok=True)
        for name in sorted(f[:-5] for f in os.listdir(FIXTURES) if f.endswith(".json")):
            for theme in ("tokyo-night", "catppuccin-latte"):
                shoot(f"{out}/{name}-{theme}.png", name, theme, 120, 40, "", fonts, full=True)
    else:
        os.makedirs(OUT, exist_ok=True)
        wanted = [a for a in sys.argv[1:] if not a.startswith("--")] or list(SHOTS)
        for name in wanted:
            fixture, theme, cols, rows, keys, _ = SHOTS[name]
            shoot(f"{OUT}/{name}.png", fixture, theme, cols, rows, keys, fonts)

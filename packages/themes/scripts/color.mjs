// Colour arithmetic for the theme scripts: sRGB hex colours, WCAG contrast,
// and the contrast each variable needs.

export function parse(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h.slice(0, 6);
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
}

export function hex(rgb) {
  return `#${rgb.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('')}`;
}

/** `a` moved towards `b` by `t`, from 0 to 1. */
export function mix(a, b, t) {
  const [x, y] = [parse(a), parse(b)];
  return hex(x.map((c, i) => c + (y[i] - c) * t));
}

export function luminance(color) {
  const [r, g, b] = parse(color).map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/**
 * `color`, moved away from the backgrounds just far enough to reach `least`
 * against each of them: towards white in a dark theme, black in a light one.
 */
export function ensure(color, backgrounds, least, dark) {
  const target = dark ? '#ffffff' : '#000000';
  let out = color;
  for (let step = 1; step <= 50 && backgrounds.some((bg) => contrast(out, bg) < least); step++) {
    out = mix(color, target, step / 50);
  }
  return out;
}

// What each colour is shown on, and the least contrast it needs.
export const RULES = [
  ['text', ['bg', 'panel', 'surface', 'selection'], 4.5],
  ['text2', ['panel', 'surface'], 4.5],
  ['text3', ['panel'], 3],
  ['accent', ['panel'], 4.5],
  ['success', ['panel'], 4.5],
  ['warning', ['panel'], 4.5],
  ['danger', ['panel'], 4.5],
  ['info', ['panel'], 4.5],
  ['focus', ['panel'], 3],
  ['border', ['panel'], 1.35],
];
export const CHART_LEAST = 3;

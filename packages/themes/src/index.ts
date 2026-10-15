import data from '../themes.json' with { type: 'json' };

/** The colours a theme gives canvases, as `--<name>` CSS variables. */
export interface ThemeColors {
  bg: string;
  panel: string;
  surface: string;
  border: string;
  focus: string;
  text: string;
  text2: string;
  text3: string;
  selection: string;
  accent: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  /** Chart series, in order. */
  chart: string[];
}

export interface Theme {
  id: string;
  name: string;
  dark: boolean;
  source: 'omarchy' | 'haunt';
  colors: ThemeColors;
}

export const themes = data as Theme[];
export const DEFAULT_THEME = 'tokyo-night';

export function themeById(id: string | null | undefined): Theme {
  return themes.find((t) => t.id === id) ?? themes[0];
}

const NAMES: Record<string, string> = { text2: 'text-2', text3: 'text-3' };

/** The theme's variables, as the inside of a CSS rule. */
export function cssVariables(theme: Theme): string {
  const vars = Object.entries(theme.colors)
    .filter(([key]) => key !== 'chart')
    .map(([key, value]) => `--${NAMES[key] ?? key}: ${value};`);
  theme.colors.chart.forEach((c, i) => vars.push(`--chart-${i + 1}: ${c};`));
  vars.push(`color-scheme: ${theme.dark ? 'dark' : 'light'};`);
  return vars.join(' ');
}

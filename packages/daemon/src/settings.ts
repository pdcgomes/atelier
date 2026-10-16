import { DEFAULT_THEME } from '@atelier/themes';
import { paths, readJson, writeJson } from './home.ts';

export interface Settings {
  theme: string;
  /** Where interactive sessions start: a terminal app, or your own command. */
  terminal: 'ghostty' | 'iterm' | 'terminal' | 'custom';
  /** For `custom`: the command and its arguments; `{script}` is replaced by the launch script's path. */
  terminalCommand?: string[];
  /** The command files open in: `cursor`, `code`, `zed`, or `open` for each file's own app. */
  editor: string;
  /** Opens a viewer when a canvas is shown and none is open. */
  autoOpen: boolean;
  /** The viewer that opens then: the browser, or atelier-tui in a terminal tab. */
  viewer: 'browser' | 'terminal';
}

export const DEFAULTS: Settings = { theme: DEFAULT_THEME, terminal: 'ghostty', editor: 'open', autoOpen: true, viewer: 'browser' };

export function loadSettings(): Settings {
  return { ...DEFAULTS, ...readJson<Partial<Settings>>(paths.settings, {}) };
}

export function saveSettings(change: Partial<Settings>): Settings {
  const next = { ...loadSettings() };
  if (typeof change.theme === 'string') next.theme = change.theme;
  if (change.terminal && ['ghostty', 'iterm', 'terminal', 'custom'].includes(change.terminal)) next.terminal = change.terminal;
  if (Array.isArray(change.terminalCommand) && change.terminalCommand.every((a) => typeof a === 'string')) next.terminalCommand = change.terminalCommand;
  if (typeof change.editor === 'string' && /^[\w./ -]+$/.test(change.editor)) next.editor = change.editor;
  if (typeof change.autoOpen === 'boolean') next.autoOpen = change.autoOpen;
  if (change.viewer === 'browser' || change.viewer === 'terminal') next.viewer = change.viewer;
  writeJson(paths.settings, next);
  return next;
}

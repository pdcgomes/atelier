import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { DEFAULT_THEME, themeById, type Theme } from '@atelier/themes';
import { act, getSessions, getState, getTheme, setState, subscribe, type Action, type ActionResult, type Session } from './bridge.ts';

type SetValue<T> = (value: T | ((previous: T) => T)) => void;

/**
 * A value kept in the canvas's state file, beside it, so it's still there
 * after a reload and agents can read it. Use it for what you decide on the
 * canvas: marks, picks, notes, the tab you're on.
 */
export function useCanvasState<T>(key: string, initial: T): [T, SetValue<T>] {
  const all = useSyncExternalStore(subscribe, getState, getState);
  const value = (key in all ? all[key] : initial) as T;
  const set = useCallback<SetValue<T>>(
    (next) => {
      const current = getState();
      const previous = (key in current ? current[key] : initial) as T;
      setState(key, typeof next === 'function' ? (next as (p: T) => T)(previous) : next);
    },
    // `initial` only matters until the key is set.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );
  return [value, set];
}

/** The agent sessions the daemon knows, kept up to date. */
export function useSessions(): Session[] {
  return useSyncExternalStore(subscribe, getSessions, getSessions);
}

/** The theme you picked in the viewer. */
export function useTheme(): Theme {
  const theme = useSyncExternalStore(subscribe, getTheme, getTheme);
  return theme ?? themeById(DEFAULT_THEME);
}

/** The time now, updated every `intervalMs`. */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

export interface Actions {
  /** Starts Claude Code in this canvas's project: in a terminal tab, or in the background with its progress in the viewer. */
  startSession(options: { prompt: string; mode?: 'terminal' | 'background' }): Promise<ActionResult>;
  /** Carries a session on in a terminal tab. */
  openSession(options: { id: string }): Promise<ActionResult>;
  /** Gives a session a message: when its turn ends if it's working, or by resuming it in the background. */
  tell(options: { session: string; text: string }): Promise<ActionResult>;
  /** Opens a file in your editor, or in the viewer if it's an image, video, PDF or Markdown. */
  openFile(options: { path: string; line?: number }): Promise<ActionResult>;
  /** Opens a web page in a new browser tab. */
  openUrl(options: { url: string }): Promise<ActionResult>;
}

/**
 * Actions that reach outside the canvas. Each one is shown to you in the
 * viewer, with its prompt, and runs only when you confirm it.
 */
export function useAction(): Actions {
  return useMemo(() => {
    const run = (action: Action) => act(action);
    return {
      startSession: ({ prompt, mode }) => run({ type: 'startSession', prompt, mode }),
      openSession: ({ id }) => run({ type: 'openSession', id }),
      tell: ({ session, text }) => run({ type: 'tell', session, text }),
      openFile: ({ path, line }) => run({ type: 'openFile', path, line }),
      openUrl: ({ url }) => run({ type: 'openUrl', url }),
    };
  }, []);
}

export type FormValues = Record<string, unknown>;

/** What a submitted form leaves in the canvas's state, under `form:<name>`. */
export interface Submission {
  values: FormValues;
  at: string;
}

export interface FormHandle {
  values: FormValues;
  errors: Record<string, string>;
  set(field: string, value: unknown): void;
  /** Validates, and if that passes, saves the answers under `form:<name>`. Returns whether it did. */
  submit(): boolean;
  reset(): void;
  /** The last answers sent, if there are any. */
  submitted: Submission | null;
}

/**
 * A form's answers. They're kept as a draft while you fill it in, and sent
 * to the canvas's state when you submit, which is when an agent waiting on
 * the canvas hears about them.
 */
export function useForm(
  name: string,
  options: { initial?: FormValues; validate?: (values: FormValues) => Record<string, string> } = {},
): FormHandle {
  const [draft, setDraft] = useCanvasState<FormValues>(`draft:${name}`, options.initial ?? {});
  const [submitted, setSubmitted] = useCanvasState<Submission | null>(`form:${name}`, null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const values = { ...(options.initial ?? {}), ...draft };
  return {
    values,
    errors,
    submitted,
    set(field, value) {
      setDraft((d) => ({ ...d, [field]: value }));
      if (errors[field]) setErrors(({ [field]: _, ...rest }) => rest);
    },
    submit() {
      const found = options.validate?.(values) ?? {};
      setErrors(found);
      if (Object.keys(found).length) return false;
      setSubmitted({ values, at: new Date().toISOString() });
      return true;
    },
    reset() {
      setDraft(options.initial ?? {});
      setErrors({});
    },
  };
}

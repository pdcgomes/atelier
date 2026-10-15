import { createContext, useContext, useId, useState, type ReactNode } from 'react';
import type { Tone } from './bridge.ts';
import { useAction, useCanvasState, useForm, type FormHandle, type FormValues } from './hooks.ts';
import { Code, Kbd, Time } from './text.tsx';
import { Badge } from './data.tsx';
import { cx, tone } from './util.ts';

export interface ButtonProps {
  children?: ReactNode;
  onClick?: () => void;
  tone?: Tone;
  /** `solid` for the main thing to do, `outline` for the rest, `ghost` for the least. */
  variant?: 'solid' | 'outline' | 'ghost';
  size?: 'sm' | 'md';
  disabled?: boolean;
  /** A key hint shown in the button. */
  kbd?: string;
  type?: 'button' | 'submit';
  title?: string;
}

export function Button({ children, onClick, tone: t = 'default', variant = 'outline', size = 'md', disabled, kbd, type = 'button', title }: ButtonProps) {
  return (
    <button
      type={type}
      title={title}
      className={cx('at-button', tone(t), variant !== 'outline' && `at-v-${variant}`, size === 'sm' && 'at-small')}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
      {kbd && <Kbd>{kbd}</Kbd>}
    </button>
  );
}

const FormContext = createContext<FormHandle | null>(null);

interface FieldProps<T> {
  /** Inside a `Form`: the answer's name. */
  name?: string;
  /** Outside a form: keeps the value in the canvas's state under this key. */
  stateKey?: string;
  value?: T;
  onChange?: (value: T) => void;
  label?: ReactNode;
  hint?: ReactNode;
}

/** A field's value: from its form, from the canvas's state, or from its props. */
function useField<T>({ name, stateKey, value, onChange }: FieldProps<T>, initial: T): [T, (v: T) => void, string | undefined] {
  const form = useContext(FormContext);
  const [kept, setKept] = useCanvasState<T>(stateKey ?? '', initial);
  const [local, setLocal] = useState<T>(initial);
  if (form && name) return [(form.values[name] as T) ?? initial, (v) => (form.set(name, v), onChange?.(v)), form.errors[name]];
  if (value !== undefined) return [value, (v) => onChange?.(v), undefined];
  if (stateKey) return [kept, (v) => (setKept(v), onChange?.(v)), undefined];
  return [local, (v) => (setLocal(v), onChange?.(v)), undefined];
}

function Field({ id, label, hint, error, children }: { id: string; label?: ReactNode; hint?: ReactNode; error?: string; children: ReactNode }) {
  return (
    <div className="at-field">
      {label != null && (
        <label className="at-field-label" htmlFor={id}>
          {label}
        </label>
      )}
      {children}
      {error ? <span className="at-field-error">{error}</span> : hint != null ? <span className="at-field-hint">{hint}</span> : null}
    </div>
  );
}

export function TextInput(props: FieldProps<string> & { placeholder?: string; type?: 'text' | 'email' | 'url' | 'number' | 'date' }) {
  const id = useId();
  const [value, set, error] = useField(props, '');
  return (
    <Field id={id} label={props.label} hint={props.hint} error={error}>
      <input id={id} className={cx('at-input', error && 'at-invalid')} type={props.type ?? 'text'} placeholder={props.placeholder} value={value ?? ''} onChange={(e) => set(e.target.value)} />
    </Field>
  );
}

export function TextArea(props: FieldProps<string> & { placeholder?: string; rows?: number }) {
  const id = useId();
  const [value, set, error] = useField(props, '');
  return (
    <Field id={id} label={props.label} hint={props.hint} error={error}>
      <textarea id={id} className={cx('at-input', error && 'at-invalid')} rows={props.rows ?? 3} placeholder={props.placeholder} value={value ?? ''} onChange={(e) => set(e.target.value)} />
    </Field>
  );
}

export interface Option {
  value: string;
  label: ReactNode;
}

export function Select(props: FieldProps<string> & { options: (Option | string)[]; placeholder?: string }) {
  const id = useId();
  const [value, set, error] = useField(props, '');
  const options = props.options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  return (
    <Field id={id} label={props.label} hint={props.hint} error={error}>
      <select id={id} className={cx('at-input', error && 'at-invalid')} value={value ?? ''} onChange={(e) => set(e.target.value)}>
        {props.placeholder != null && (
          <option value="" disabled>
            {props.placeholder}
          </option>
        )}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {typeof o.label === 'string' ? o.label : o.value}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function Checkbox(props: FieldProps<boolean> & { label: ReactNode }) {
  const [value, set] = useField(props, false);
  return (
    <label className="at-check">
      <input type="checkbox" checked={Boolean(value)} onChange={(e) => set(e.target.checked)} />
      {props.label}
    </label>
  );
}

export function Toggle(props: FieldProps<boolean> & { label?: ReactNode }) {
  const [value, set] = useField(props, false);
  return (
    <label className="at-toggle">
      <input type="checkbox" role="switch" checked={Boolean(value)} onChange={(e) => set(e.target.checked)} />
      {props.label}
    </label>
  );
}

/** One of several options. */
export function Radio(props: FieldProps<string> & { options: (Option | string)[]; vertical?: boolean }) {
  const id = useId();
  const [value, set, error] = useField(props, '');
  const options = props.options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  return (
    <Field id={id} label={props.label} hint={props.hint} error={error}>
      <div className={cx('at-options', props.vertical && 'at-vertical')} role="radiogroup" id={id}>
        {options.map((o) => (
          <label key={o.value} className="at-check">
            <input type="radio" name={id} value={o.value} checked={value === o.value} onChange={() => set(o.value)} />
            {o.label}
          </label>
        ))}
      </div>
    </Field>
  );
}

export function Slider(props: FieldProps<number> & { min?: number; max?: number; step?: number; unit?: string }) {
  const id = useId();
  const { min = 0, max = 100, step = 1, unit = '' } = props;
  const [value, set, error] = useField(props, min);
  return (
    <Field id={id} label={props.label} hint={props.hint} error={error}>
      <div className="at-slider">
        <input id={id} type="range" min={min} max={max} step={step} value={value ?? min} onChange={(e) => set(Number(e.target.value))} />
        <output htmlFor={id}>
          {value}
          {unit}
        </output>
      </div>
    </Field>
  );
}

/** Stars, from one to `max`. Clicking the current one clears it. */
export function Rating(props: FieldProps<number> & { max?: number }) {
  const id = useId();
  const max = props.max ?? 5;
  const [value, set, error] = useField(props, 0);
  return (
    <Field id={id} label={props.label} hint={props.hint} error={error}>
      <span className="at-rating" role="radiogroup" id={id}>
        {Array.from({ length: max }, (_, i) => (
          <button key={i} type="button" className={cx(i < (value ?? 0) && 'at-on')} aria-label={`${i + 1} of ${max}`} aria-pressed={i < (value ?? 0)} onClick={() => set(value === i + 1 ? 0 : i + 1)}>
            ★
          </button>
        ))}
      </span>
    </Field>
  );
}

function fill(template: string, values: FormValues): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) => {
    const v = values[k];
    return v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
  });
}

export interface FormProps {
  /** The answers are kept in the canvas's state under `form:<name>`, where agents read them. */
  name: string;
  initial?: FormValues;
  /** Problems with the answers, by field. Returning none lets the form be sent. */
  validate?: (values: FormValues) => Record<string, string>;
  onSubmit?: (values: FormValues) => void;
  submitLabel?: string;
  /** Starts an agent with the answers once they're sent. `{{field}}` in the prompt is replaced by that answer. */
  start?: { prompt: string; mode?: 'terminal' | 'background' };
  children?: ReactNode;
}

/**
 * A form whose answers go to the canvas's state when it's sent. An agent
 * waiting on the canvas (`canvas_wait`) gets them, or `start` hands them to
 * a new one.
 */
export function Form({ name, initial, validate, onSubmit, submitLabel = 'Send', start, children }: FormProps) {
  const handle = useForm(name, { initial, validate });
  const actions = useAction();
  return (
    <FormContext.Provider value={handle}>
      <form
        className="at-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!handle.submit()) return;
          onSubmit?.(handle.values);
          if (start) void actions.startSession({ prompt: fill(start.prompt, handle.values), mode: start.mode });
        }}
      >
        {children}
        <div className="at-form-foot">
          <Button type="submit" variant="solid" tone="accent">
            {handle.submitted ? `${submitLabel} again` : submitLabel}
          </Button>
          {handle.submitted && (
            <span className="at-sent">
              Sent <Time at={handle.submitted.at} />
            </span>
          )}
        </div>
      </form>
    </FormContext.Provider>
  );
}

/** What an approval leaves in the canvas's state, under `approval:<id>`. */
export interface ApprovalMark {
  state: 'approved' | 'held';
  note?: string;
  at: string;
}

/**
 * Approve or hold something, with a note: a cut, a post, a design. The mark
 * is kept under `approval:<id>`, where agents read it.
 */
export function Approval({
  id,
  title,
  detail,
  children,
  note = true,
  labels = { approve: 'Approve', hold: 'Hold' },
}: {
  id: string;
  title?: ReactNode;
  detail?: ReactNode;
  children?: ReactNode;
  note?: boolean;
  labels?: { approve: string; hold: string };
}) {
  const [mark, setMark] = useCanvasState<ApprovalMark | null>(`approval:${id}`, null);
  const [text, setText] = useState(mark?.note ?? '');
  const decide = (state: ApprovalMark['state']) => setMark({ state, note: text.trim() || undefined, at: new Date().toISOString() });
  return (
    <div className={cx('at-ask', tone(mark?.state === 'approved' ? 'success' : mark?.state === 'held' ? 'warning' : 'accent'))}>
      {(title != null || mark) && (
        <div className="at-ask-head">
          {title != null && <span className="at-ask-title">{title}</span>}
          {mark && (
            <Badge tone={mark.state === 'approved' ? 'success' : 'warning'} dot>
              {mark.state === 'approved' ? 'Approved' : 'Held'} <Time at={mark.at} />
            </Badge>
          )}
        </div>
      )}
      {detail != null && <div className="at-ask-detail">{detail}</div>}
      {children}
      {mark ? (
        <div className="at-ask-actions">
          {mark.note && <span className="at-ask-meta">“{mark.note}”</span>}
          <Button size="sm" variant="ghost" onClick={() => setMark(null)}>
            Undo
          </Button>
        </div>
      ) : (
        <>
          {note && <textarea className="at-input" rows={2} placeholder="A note for the agent (optional)" value={text} onChange={(e) => setText(e.target.value)} />}
          <div className="at-ask-actions">
            <Button size="sm" variant="solid" tone="success" onClick={() => decide('approved')}>
              {labels.approve}
            </Button>
            <Button size="sm" tone="warning" onClick={() => decide('held')}>
              {labels.hold}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

/** Your answer to a Needs you item, kept under `needsYou` in the canvas's state, by the item's id. */
export interface NeedsYouMark {
  state: 'done' | 'skipped' | 'asked';
  at: string;
}

export interface NeedsYouProps {
  id: string;
  title: ReactNode;
  /** Exactly what to do, and where. */
  detail?: ReactNode;
  /** What doing it unblocks. */
  unblocks?: ReactNode;
  /** Whether work is waiting on it. */
  blocking?: boolean;
  /** A command to run, shown with a copy button. */
  command?: string;
  /** Set by the agent once it has seen it done. */
  done?: boolean;
  /** "Ask the agent" starts one with this prompt. */
  ask?: { prompt?: string; mode?: 'terminal' | 'background' };
}

/**
 * Something only you can do, with Done, Skip and Ask the agent. Your answer
 * is kept under `needsYou` in the canvas's state; agents read it and fold it
 * into the canvas.
 */
export function NeedsYou({ id, title, detail, unblocks, blocking, command, done, ask }: NeedsYouProps) {
  const [marks, setMarks] = useCanvasState<Record<string, NeedsYouMark | null>>('needsYou', {});
  const actions = useAction();
  const mark = marks[id];
  const set = (state: NeedsYouMark['state'] | null) => setMarks((m) => ({ ...m, [id]: state ? { state, at: new Date().toISOString() } : null }));
  const settled = done || (mark && mark.state !== 'asked');
  const label = typeof title === 'string' ? title : id;
  return (
    <div className={cx('at-ask', tone(settled ? 'success' : blocking ? 'danger' : 'warning'), settled && 'at-settled')}>
      <div className="at-ask-head">
        <span className="at-ask-title">{title}</span>
        {blocking && !settled && <Badge tone="danger">blocking</Badge>}
        {done ? <Badge tone="success">done</Badge> : mark ? <Badge tone={mark.state === 'asked' ? 'info' : 'success'}>{mark.state === 'asked' ? 'asked an agent' : mark.state} <Time at={mark.at} /></Badge> : null}
      </div>
      {!settled && detail != null && <div className="at-ask-detail">{detail}</div>}
      {!settled && unblocks != null && <div className="at-ask-meta">Unblocks: {unblocks}</div>}
      {!settled && command && <Code block lang="shell">{command}</Code>}
      {!done && (
        <div className="at-ask-actions">
          {mark ? (
            <Button size="sm" variant="ghost" onClick={() => set(null)}>
              Undo
            </Button>
          ) : (
            <>
              <Button size="sm" variant="solid" tone="success" onClick={() => set('done')}>
                Done
              </Button>
              <Button size="sm" onClick={() => set('skipped')}>
                Skip
              </Button>
              <Button
                size="sm"
                tone="accent"
                onClick={async () => {
                  const prompt = ask?.prompt ?? `Take on this item from the canvas: ${label}.${typeof detail === 'string' ? ` ${detail}` : ''}`;
                  const result = await actions.startSession({ prompt, mode: ask?.mode });
                  if (result.ok) set('asked');
                }}
              >
                Ask the agent
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

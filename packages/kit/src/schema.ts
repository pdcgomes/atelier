// A small schema library for templates' data: each schema validates a value,
// says where it's wrong, and gives the TypeScript type it describes.

export interface Problem {
  /** Where in the data, as `plan[2].status`. */
  path: string;
  message: string;
}

export interface Schema<T> {
  readonly kind: string;
  /** What it accepts, for documentation and error messages. */
  readonly describe: string;
  check(value: unknown, path: string, problems: Problem[]): void;
  /** Present only for the type it carries. */
  readonly _type?: T;
  optional?: boolean;
}

export type Infer<S> = S extends Schema<infer T> ? T : never;

function make<T>(kind: string, describe: string, check: Schema<T>['check']): Schema<T> {
  return { kind, describe, check };
}

const where = (path: string) => path || 'the data';

export const s = {
  string(options: { min?: number } = {}): Schema<string> {
    return make('string', 'text', (v, path, out) => {
      if (typeof v !== 'string') out.push({ path, message: `${where(path)} should be text` });
      else if (options.min && v.trim().length < options.min) out.push({ path, message: `${where(path)} shouldn't be empty` });
    });
  },
  number(): Schema<number> {
    return make('number', 'a number', (v, path, out) => {
      if (typeof v !== 'number' || !Number.isFinite(v)) out.push({ path, message: `${where(path)} should be a number` });
    });
  },
  boolean(): Schema<boolean> {
    return make('boolean', 'true or false', (v, path, out) => {
      if (typeof v !== 'boolean') out.push({ path, message: `${where(path)} should be true or false` });
    });
  },
  /** One of these strings. */
  enum<const T extends readonly string[]>(values: T): Schema<T[number]> {
    return make('enum', values.map((v) => `"${v}"`).join(', '), (v, path, out) => {
      if (!values.includes(v as string)) out.push({ path, message: `${where(path)} should be one of ${values.map((x) => `"${x}"`).join(', ')}, not ${JSON.stringify(v)}` });
    });
  },
  /** An ISO date or time, such as `2026-10-15` or `2026-10-15T09:30:00+01:00`. */
  time(): Schema<string> {
    return make('time', 'an ISO date or time', (v, path, out) => {
      if (typeof v !== 'string' || !Number.isFinite(Date.parse(v))) out.push({ path, message: `${where(path)} should be an ISO date or time, like 2026-10-15T09:30:00+01:00` });
    });
  },
  array<T>(item: Schema<T>): Schema<T[]> {
    return make('array', `a list of ${item.kind === 'object' ? 'objects' : item.describe}`, (v, path, out) => {
      if (!Array.isArray(v)) return void out.push({ path, message: `${where(path)} should be a list` });
      v.forEach((x, i) => item.check(x, `${path}[${i}]`, out));
    });
  },
  object<Shape extends Record<string, Schema<unknown>>>(shape: Shape): Schema<ObjectOf<Shape>> & { shape: Shape } {
    const schema = make<ObjectOf<Shape>>('object', 'an object', (v, path, out) => {
      if (typeof v !== 'object' || v === null || Array.isArray(v)) return void out.push({ path, message: `${where(path)} should be an object` });
      const record = v as Record<string, unknown>;
      for (const [key, field] of Object.entries(shape)) {
        const at = path ? `${path}.${key}` : key;
        if (record[key] === undefined) {
          if (!field.optional) out.push({ path: at, message: `${at} is missing (${field.describe})` });
        } else field.check(record[key], at, out);
      }
      for (const key of Object.keys(record)) {
        if (!(key in shape) && key !== 'template' && key !== '$schema') out.push({ path: path ? `${path}.${key}` : key, message: `${path ? `${path}.${key}` : key} isn't part of this template` });
      }
    });
    return Object.assign(schema, { shape });
  },
  /** The same schema, allowed to be left out. */
  optional<T>(schema: Schema<T>): Schema<T | undefined> {
    return { ...schema, optional: true, describe: `${schema.describe}, optional` };
  },
};

type Optional<Shape> = { [K in keyof Shape]: Shape[K] extends { optional: true } ? K : undefined extends Infer<Shape[K]> ? K : never }[keyof Shape];
type ObjectOf<Shape extends Record<string, Schema<unknown>>> = { [K in Exclude<keyof Shape, Optional<Shape>>]: Infer<Shape[K]> } & {
  [K in Optional<Shape>]?: Infer<Shape[K]>;
};

export function validate(schema: Schema<unknown>, value: unknown): Problem[] {
  const problems: Problem[] = [];
  schema.check(value, '', problems);
  return problems;
}

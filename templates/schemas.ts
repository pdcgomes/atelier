// Each template's schema and example, without its view, for the daemon's
// checks and for `atelier new`.

import type { Schema } from '../packages/kit/src/schema.ts';

export interface TemplateInfo {
  description: string;
  schema: Schema<unknown>;
  /** A whole canvas of this template, which `atelier new` starts from. */
  example: Record<string, unknown>;
}

export const schemas: Record<string, TemplateInfo> = {};

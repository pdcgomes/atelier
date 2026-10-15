// The templates: each one a schema for its data and the view that draws it.

import type { ComponentType } from 'react';
import type { Schema } from '../packages/kit/src/schema.ts';

export interface Template {
  name: string;
  /** What it's for, in a sentence. */
  description: string;
  schema: Schema<unknown>;
  View: ComponentType<{ data: never }>;
}

export const templates: Record<string, Template> = {};

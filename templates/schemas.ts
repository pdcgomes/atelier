// Each template's schema, without its view, for the daemon's checks.

import type { Schema } from '../packages/kit/src/schema.ts';

export const schemas: Record<string, { description: string; schema: Schema<unknown> }> = {};

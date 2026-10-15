// Each template's schema and example, without its view, for the daemon's
// checks and for `atelier new`.

import type { Schema } from '../packages/kit/src/schema.ts';
import * as board from './board/schema.ts';
import boardExample from './board/example.json' with { type: 'json' };
import * as checklist from './checklist/schema.ts';
import checklistExample from './checklist/example.json' with { type: 'json' };
import * as compare from './compare/schema.ts';
import compareExample from './compare/example.json' with { type: 'json' };
import * as report from './report/schema.ts';
import reportExample from './report/example.json' with { type: 'json' };
import * as review from './review/schema.ts';
import reviewExample from './review/example.json' with { type: 'json' };
import * as room from './room/schema.ts';
import roomExample from './room/example.json' with { type: 'json' };
import * as studio from './studio/schema.ts';
import studioExample from './studio/example.json' with { type: 'json' };
import * as workstream from './workstream/schema.ts';
import workstreamExample from './workstream/example.json' with { type: 'json' };

export interface TemplateInfo {
  description: string;
  schema: Schema<unknown>;
  /** A whole canvas of this template, which `atelier new` starts from. */
  example: Record<string, unknown>;
}

const info = (module: { description: string; schema: Schema<unknown> }, example: Record<string, unknown>): TemplateInfo => ({ description: module.description, schema: module.schema, example });

export const schemas: Record<string, TemplateInfo> = {
  workstream: info(workstream, workstreamExample),
  studio: info(studio, studioExample),
  room: info(room, roomExample),
  board: info(board, boardExample),
  checklist: info(checklist, checklistExample),
  review: info(review, reviewExample),
  compare: info(compare, compareExample),
  report: info(report, reportExample),
};

// The templates: each one a schema for its data and the view that draws it.

import type { ComponentType } from 'react';
import type { Schema } from '../packages/kit/src/schema.ts';
import * as board from './board/schema.ts';
import { BoardView } from './board/view.tsx';
import * as checklist from './checklist/schema.ts';
import { ChecklistView } from './checklist/view.tsx';
import * as compare from './compare/schema.ts';
import { CompareView } from './compare/view.tsx';
import * as report from './report/schema.ts';
import { ReportView } from './report/view.tsx';
import * as review from './review/schema.ts';
import { ReviewView } from './review/view.tsx';
import * as room from './room/schema.ts';
import { RoomView } from './room/view.tsx';
import * as studio from './studio/schema.ts';
import { StudioView } from './studio/view.tsx';
import * as workstream from './workstream/schema.ts';
import { WorkstreamView } from './workstream/view.tsx';
import * as wireframes from './wireframes/schema.ts';
import { WireframesView } from './wireframes/view.tsx';

export interface Template {
  name: string;
  /** What it's for, in a sentence. */
  description: string;
  schema: Schema<unknown>;
  View: ComponentType<{ data: never }>;
}

const template = (name: string, module: { description: string; schema: Schema<unknown> }, View: ComponentType<{ data: never }>): Template => ({ name, description: module.description, schema: module.schema, View });

export const templates: Record<string, Template> = {
  workstream: template('workstream', workstream, WorkstreamView),
  studio: template('studio', studio, StudioView),
  room: template('room', room, RoomView),
  board: template('board', board, BoardView),
  checklist: template('checklist', checklist, ChecklistView),
  review: template('review', review, ReviewView),
  compare: template('compare', compare, CompareView),
  report: template('report', report, ReportView),
  wireframes: template('wireframes', wireframes, WireframesView),
};

// Each template's view, for a custom canvas to use and add to:
// `import { Workstream } from "atelier/templates"`.
export {
  BoardView as Board,
  ChecklistView as Checklist,
  CompareView as Compare,
  ReportView as Report,
  ReviewView as Review,
  RoomView as Room,
  StudioView as Studio,
  WorkstreamView as Workstream,
  WireframesView as Wireframes,
};
export type { Board as BoardData } from './board/schema.ts';
export type { Checklist as ChecklistData } from './checklist/schema.ts';
export type { Compare as CompareData } from './compare/schema.ts';
export type { Report as ReportData } from './report/schema.ts';
export type { Review as ReviewData } from './review/schema.ts';
export type { Room as RoomData } from './room/schema.ts';
export type { Studio as StudioData } from './studio/schema.ts';
export type { Workstream as WorkstreamData } from './workstream/schema.ts';
export type { Wireframes as WireframesData } from './wireframes/schema.ts';

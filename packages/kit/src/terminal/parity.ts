// The terminal's kit has everything the browser's does, with the same props:
// `npm run typecheck` fails when the browser's kit gains something the
// terminal's hasn't.

import type * as Web from '../index.ts';
import * as Terminal from './index.ts';

export const parity: typeof Web = Terminal;

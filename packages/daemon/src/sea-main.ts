// The single binary's entry: unpack what it carries, then run the command.

import { unpack } from './sea.ts';

unpack('0.1.0');
import('./cli.ts');

// The files canvases show: images, videos, PDFs and Markdown, and only from
// the projects the daemon knows and its own folder. A path is resolved,
// symlinks and all, before it's checked; the file is opened without following
// a symlink, and checked again after it's open, so nothing can be swapped in.

import { closeSync, constants, existsSync, fstatSync, lstatSync, openSync, readSync, realpathSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, isAbsolute, join, resolve, sep } from 'node:path';

const KINDS: Record<string, { mime: string; max: number }> = {
  png: { mime: 'image/png', max: 32 << 20 },
  jpg: { mime: 'image/jpeg', max: 32 << 20 },
  jpeg: { mime: 'image/jpeg', max: 32 << 20 },
  gif: { mime: 'image/gif', max: 32 << 20 },
  webp: { mime: 'image/webp', max: 32 << 20 },
  avif: { mime: 'image/avif', max: 32 << 20 },
  heic: { mime: 'image/heic', max: 32 << 20 },
  heif: { mime: 'image/heif', max: 32 << 20 },
  mp4: { mime: 'video/mp4', max: 256 << 20 },
  m4v: { mime: 'video/mp4', max: 256 << 20 },
  mov: { mime: 'video/quicktime', max: 256 << 20 },
  webm: { mime: 'video/webm', max: 256 << 20 },
  pdf: { mime: 'application/pdf', max: 64 << 20 },
  md: { mime: 'text/markdown; charset=utf-8', max: 4 << 20 },
  markdown: { mime: 'text/markdown; charset=utf-8', max: 4 << 20 },
};

export class Refused extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const OUTSIDE = new Refused(403, "Atelier doesn't show files from there.");

function within(path: string, roots: string[]) {
  return roots.some((root) => path === root || path.startsWith(root.endsWith(sep) ? root : root + sep));
}

/**
 * A path as a canvas writes it: absolute, from home, or relative. A relative
 * path is looked for in each of `folders` in turn, and taken from the first
 * that has it.
 */
export function expand(path: string, folders: string | string[]): string {
  const p = path.replace(/^file:\/\//, '');
  if (p.startsWith('~/')) return join(homedir(), p.slice(2));
  if (isAbsolute(p)) return p;
  const list = typeof folders === 'string' ? [folders] : folders;
  return list.map((f) => resolve(f, p)).find((candidate) => existsSync(candidate)) ?? resolve(list[0], p);
}

/** Where a canvas's relative paths are from: its project's root, then its own folder. */
export function foldersFor(canvasPath: string): string[] {
  const folder = dirname(canvasPath);
  return basename(folder) === '.atelier' ? [dirname(folder), folder] : [folder];
}

/** Whether the first bytes say the file is what its name says. */
function looksLike(ext: string, head: Buffer): boolean {
  const ascii = (from: number, to: number) => head.subarray(from, to).toString('latin1');
  switch (ext) {
    case 'png':
      return head.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    case 'jpg':
    case 'jpeg':
      return head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
    case 'gif':
      return /^GIF8[79]a/.test(ascii(0, 6));
    case 'webp':
      return ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP';
    case 'avif':
    case 'heic':
    case 'heif':
    case 'mp4':
    case 'm4v':
    case 'mov':
      return ascii(4, 8) === 'ftyp' || (ext === 'mov' && ['moov', 'wide', 'mdat', 'free'].includes(ascii(4, 8)));
    case 'webm':
      return head.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
    case 'pdf':
      return ascii(0, Math.min(head.length, 1024)).includes('%PDF-');
    case 'md':
    case 'markdown':
      return !head.includes(0);
    default:
      return false;
  }
}

/**
 * Reads a file a canvas asked for. `roots` are the folders files may come
 * from, already resolved. Throws `Refused` for anything else, with the same
 * answer whether or not the file exists.
 */
export function readAllowed(path: string, folders: string | string[], roots: string[]): { bytes: Buffer; mime: string } {
  const wanted = expand(path, folders);
  let real: string;
  try {
    real = realpathSync(wanted);
  } catch {
    // Missing: say so only where the file would have been served.
    let parent: string | null = null;
    try {
      parent = realpathSync(dirname(wanted));
    } catch {}
    throw parent && within(parent, roots) ? new Refused(404, "There's no such file.") : OUTSIDE;
  }
  if (!within(real, roots)) throw OUTSIDE;
  const ext = real.split('.').pop()?.toLowerCase() ?? '';
  const kind = KINDS[ext];
  if (!kind) throw new Refused(415, 'Canvases can show images, videos, PDFs and Markdown.');
  const fd = openSync(real, constants.O_RDONLY | constants.O_NOFOLLOW | (constants.O_NONBLOCK ?? 0));
  try {
    const stat = fstatSync(fd);
    // The file that was opened has to be the one that was checked.
    const again = lstatSync(realpathSync(real));
    if (!stat.isFile() || again.ino !== stat.ino || again.dev !== stat.dev || realpathSync(real) !== real) throw OUTSIDE;
    if (stat.size > kind.max) throw new Refused(413, 'That file is too big to show.');
    const bytes = Buffer.alloc(stat.size);
    let read = 0;
    while (read < stat.size) {
      const n = readSync(fd, bytes, read, stat.size - read, read);
      if (n === 0) break;
      read += n;
    }
    if (!looksLike(ext, bytes.subarray(0, 1024))) throw new Refused(415, `That isn't a ${ext.toUpperCase()} file.`);
    if (kind.mime.startsWith('text/')) new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(0, read));
    return { bytes: bytes.subarray(0, read), mime: kind.mime };
  } catch (e) {
    if (e instanceof Refused) throw e;
    if (e instanceof TypeError) throw new Refused(415, "That file isn't text.");
    throw e;
  } finally {
    closeSync(fd);
  }
}

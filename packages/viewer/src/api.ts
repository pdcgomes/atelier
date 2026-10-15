// The viewer's calls to the daemon. The session cookie goes with each one;
// the browser adds the Origin the daemon checks on writes.

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string }).error ?? `The daemon answered ${res.status}.`);
  return data as T;
}

export function fileUrl(canvas: string | undefined, path: string) {
  const q = new URLSearchParams({ path });
  if (canvas) q.set('canvas', canvas);
  return `/api/file?${q}`;
}

/** A file from disk, by the daemon's rules for what canvases may show. */
export async function readFile(canvas: string | undefined, path: string): Promise<{ mime: string; bytes: ArrayBuffer }> {
  const res = await fetch(fileUrl(canvas, path), { cache: 'no-store' });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, (data as { error?: string }).error ?? `Can't open ${path}.`);
  }
  return { mime: res.headers.get('content-type') ?? '', bytes: await res.arrayBuffer() };
}

export const VIEWABLE = /\.(png|jpe?g|gif|webp|avif|heic|heif|mp4|m4v|mov|webm|pdf|md|markdown)$/i;

export function kindOf(path: string): 'image' | 'video' | 'pdf' | 'markdown' | null {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'heic', 'heif'].includes(ext)) return 'image';
  if (['mp4', 'm4v', 'mov', 'webm'].includes(ext)) return 'video';
  if (ext === 'pdf') return 'pdf';
  if (ext === 'md' || ext === 'markdown') return 'markdown';
  return null;
}

export function basename(path: string) {
  return path.replace(/\/+$/, '').split('/').pop() ?? path;
}

export function dirname(path: string) {
  const i = path.lastIndexOf('/');
  return i > 0 ? path.slice(0, i) : '/';
}

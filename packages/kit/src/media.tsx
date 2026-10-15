import { useEffect, useState, type ReactNode } from 'react';
import { fileUrl } from './bridge.ts';

/** A file on disk, as a URL the canvas can show, once the viewer has fetched it. */
export function useFile(path: string | undefined): { url?: string; error?: string } {
  const [result, setResult] = useState<{ url?: string; error?: string }>({});
  useEffect(() => {
    if (!path) return;
    let live = true;
    setResult({});
    fileUrl(path).then(
      (url) => live && setResult({ url }),
      (e: Error) => live && setResult({ error: e.message }),
    );
    return () => {
      live = false;
    };
  }, [path]);
  return result;
}

function name(path: string) {
  return path.split('/').pop() ?? path;
}

export interface ImageProps {
  /** Where the image is: absolute, from home (`~/`), or relative to the project (the folder with `.atelier` in it). */
  path: string;
  /** What it shows, for anyone who can't see it. */
  alt: string;
  caption?: ReactNode;
  height?: number;
  fit?: 'contain' | 'cover';
}

/** An image read from disk: a screenshot, a render, a photo. Nothing is embedded in the canvas. */
export function Image({ path, alt, caption, height, fit = 'contain' }: ImageProps) {
  const { url, error } = useFile(path);
  return (
    <figure className="at-figure">
      {error ? (
        <div className="at-missing" style={{ height }} title={error}>
          Can't show {name(path)}
        </div>
      ) : url ? (
        <img src={url} alt={alt} style={{ height, width: height && fit === 'cover' ? '100%' : undefined, objectFit: fit }} />
      ) : (
        <div className="at-missing" style={{ height: height ?? 120 }}>
          {name(path)}
        </div>
      )}
      {caption != null && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

function Tile({ image, height, onOpen }: { image: { path: string; alt: string; caption?: string }; height: number; onOpen: (url: string) => void }) {
  const { url, error } = useFile(image.path);
  return (
    <button type="button" onClick={() => url && onOpen(url)} title={image.caption ?? image.alt}>
      {url ? <img src={url} alt={image.alt} style={{ height }} /> : <div className="at-missing" style={{ height }}>{error ? `Can't show ${name(image.path)}` : name(image.path)}</div>}
      {image.caption && <span>{image.caption}</span>}
    </button>
  );
}

/** Images in a grid. Each opens full size when clicked. */
export function Gallery({ images, columns, height = 140 }: { images: { path: string; alt: string; caption?: string }[]; columns?: number; height?: number }) {
  const [open, setOpen] = useState<{ url: string; caption?: string } | null>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null);
    addEventListener('keydown', close);
    return () => removeEventListener('keydown', close);
  }, [open]);
  return (
    <>
      <div className="at-gallery" style={{ gridTemplateColumns: columns ? `repeat(${columns}, minmax(0, 1fr))` : `repeat(auto-fill, minmax(${Math.round(height * 1.1)}px, 1fr))` }}>
        {images.map((image) => (
          <Tile key={image.path} image={image} height={height} onOpen={(url) => setOpen({ url, caption: image.caption ?? image.alt })} />
        ))}
      </div>
      {open && (
        <div className="at-lightbox" onClick={() => setOpen(null)} role="dialog" aria-label={open.caption}>
          <div>
            <img src={open.url} alt={open.caption ?? ''} />
            {open.caption && <p>{open.caption}</p>}
          </div>
        </div>
      )}
    </>
  );
}

/** A video read from disk. */
export function Video({ path, caption, height, autoPlay, loop, muted }: { path: string; caption?: ReactNode; height?: number; autoPlay?: boolean; loop?: boolean; muted?: boolean }) {
  const { url, error } = useFile(path);
  return (
    <figure className="at-figure">
      {url ? (
        <video src={url} controls autoPlay={autoPlay} loop={loop} muted={muted ?? autoPlay} playsInline style={{ height }} />
      ) : (
        <div className="at-missing" style={{ height: height ?? 160 }}>
          {error ? `Can't play ${name(path)}` : name(path)}
        </div>
      )}
      {caption != null && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

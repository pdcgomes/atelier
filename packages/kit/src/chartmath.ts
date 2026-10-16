// The arithmetic behind the charts, for the browser's SVG and the
// terminal's characters alike.

/** Round numbers between `min` and `max`, about `count` of them. */
export function niceTicks(min: number, max: number, count = 5): number[] {
  if (min === max) return [min];
  const raw = (max - min) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const out: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-9; v += step) out.push(+v.toFixed(10));
  return out;
}

/** Ranks, by the longest way in, and which edges go back: the loops. */
export function rankFlow<E extends { from: string; to: string }>(ids: string[], edges: E[]) {
  const out = new Map(ids.map((id) => [id, edges.filter((e) => e.from === id)]));
  const back = new Set<E>();
  const state = new Map<string, 'open' | 'done'>();
  const visit = (id: string) => {
    state.set(id, 'open');
    for (const e of out.get(id) ?? []) {
      if (state.get(e.to) === 'open') back.add(e);
      else if (!state.has(e.to) && ids.includes(e.to)) visit(e.to);
    }
    state.set(id, 'done');
  };
  for (const id of ids) if (!state.has(id)) visit(id);
  const rank = new Map(ids.map((id) => [id, 0]));
  for (let pass = 0; pass < ids.length; pass++) {
    let moved = false;
    for (const e of edges) {
      if (back.has(e) || !rank.has(e.from) || !rank.has(e.to)) continue;
      if (rank.get(e.to)! < rank.get(e.from)! + 1) {
        rank.set(e.to, rank.get(e.from)! + 1);
        moved = true;
      }
    }
    if (!moved) break;
  }
  return { rank, back };
}

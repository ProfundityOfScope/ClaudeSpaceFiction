/**
 * A little plane geometry for the maps: the convex hull of some points, and
 * that hull drawn onto a square grid of cells.
 */

export interface Point {
  x: number;
  y: number;
}

/** The convex hull of a set of points, as its corners in order round the edge (Andrew's monotone chain). */
export function convexHull(points: Point[]): Point[] {
  const p = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  if (p.length < 3) return p;
  const cross = (o: Point, a: Point, b: Point) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const half = (list: Point[]) => {
    const out: Point[] = [];
    for (const q of list) {
      while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], q) <= 0) out.pop();
      out.push(q);
    }
    return out.slice(0, -1);
  };
  return half(p).concat(half(p.reverse()));
}

/**
 * The hull of some points with a margin all round, so that the points on its
 * edge sit just inside it. Only the hull's own corners need the margin: the
 * hull of the padded corners is the hull of all the padded points.
 */
export function paddedHull(points: Point[], margin: number): Point[] {
  const ring = Array.from({ length: 12 }, (_, i) => ({ x: Math.cos((i / 12) * 2 * Math.PI), y: Math.sin((i / 12) * 2 * Math.PI) }));
  return convexHull(convexHull(points).flatMap((p) => ring.map((r) => ({ x: p.x + margin * r.x, y: p.y + margin * r.y }))));
}

/** Is a point inside a polygon? (Even-odd rule.) */
export function insidePolygon(polygon: Point[], x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/** The point on a polygon's edge nearest to a given point. */
export function nearestOnPolygon(polygon: Point[], x: number, y: number): Point {
  let best: Point = polygon[0] ?? { x, y };
  let least = Infinity;
  polygon.forEach((a, i) => {
    const b = polygon[(i + 1) % polygon.length];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const span = dx * dx + dy * dy;
    const t = span ? Math.min(1, Math.max(0, ((x - a.x) * dx + (y - a.y) * dy) / span)) : 0;
    const p = { x: a.x + t * dx, y: a.y + t * dy };
    const d = Math.hypot(p.x - x, p.y - y);
    if (d < least) {
      least = d;
      best = p;
    }
  });
  return best;
}

/**
 * Draw a polygon onto a grid `size` cells a side, where cell (c, r) covers
 * x from c to c + 1 and y from r to r + 1. Cells inside are raised to at
 * least 1 and cells on the outline are set to 2. Parts off the grid are
 * simply not drawn, so a shape that runs off the map is left open there.
 */
export function drawPolygon(polygon: Point[], size: number, grid: Uint8Array): void {
  if (!polygon.length) return;
  const clampCell = (v: number) => Math.min(size - 1, Math.max(0, Math.floor(v)));
  const xs = polygon.map((p) => p.x);
  const ys = polygon.map((p) => p.y);
  if (Math.max(...xs) < 0 || Math.max(...ys) < 0 || Math.min(...xs) >= size || Math.min(...ys) >= size) return;
  for (let r = clampCell(Math.min(...ys)); r <= clampCell(Math.max(...ys)); r++) {
    for (let c = clampCell(Math.min(...xs)); c <= clampCell(Math.max(...xs)); c++) {
      if (!grid[r * size + c] && insidePolygon(polygon, c + 0.5, r + 0.5)) grid[r * size + c] = 1;
    }
  }
  // The outline: a line of cells between each corner and the next (Bresenham).
  polygon.forEach((from, i) => {
    const to = polygon[(i + 1) % polygon.length];
    let x = Math.floor(from.x);
    let y = Math.floor(from.y);
    const x1 = Math.floor(to.x);
    const y1 = Math.floor(to.y);
    const dx = Math.abs(x1 - x);
    const dy = -Math.abs(y1 - y);
    const sx = x < x1 ? 1 : -1;
    const sy = y < y1 ? 1 : -1;
    let err = dx + dy;
    for (let guard = 0; guard < 100000; guard++) {
      if (x >= 0 && y >= 0 && x < size && y < size) grid[y * size + x] = 2;
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y += sy;
      }
    }
  });
}

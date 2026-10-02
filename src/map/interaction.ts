export interface ScreenPoint { x: number; y: number }
export interface ScreenSpan { id: string; points: ScreenPoint[] }
export interface StrumEvent { spanId: string; crossingPosition: number; velocity: number; timestamp: number; kind: 'strum' | 'preview' | 'keyboard' | 'sequence' }
const cross = (a: ScreenPoint, b: ScreenPoint) => a.x * b.y - a.y * b.x;
const sub = (a: ScreenPoint, b: ScreenPoint) => ({ x: a.x - b.x, y: a.y - b.y });
const length = (a: ScreenPoint, b: ScreenPoint) => Math.hypot(a.x - b.x, a.y - b.y);

/** Segment intersection independent of GIS/audio; ordered by distance along the pointer movement. */
export function crossings(from: ScreenPoint, to: ScreenPoint, spans: ScreenSpan[], already: Set<string> = new Set()) {
  const r = sub(to, from);
  const hits: { spanId: string; crossingPosition: number; alongGesture: number }[] = [];
  for (const span of spans) {
    if (already.has(span.id)) continue;
    const total = span.points.slice(1).reduce((sum, p, i) => sum + length(p, span.points[i]), 0);
    let traversed = 0;
    for (let i = 1; i < span.points.length; i++) {
      const a = span.points[i - 1]; const b = span.points[i];
      const s = sub(b, a); const denominator = cross(r, s); const part = length(a, b);
      if (Math.abs(denominator) > 1e-8 && total > 0) {
        const delta = sub(a, from);
        const t = cross(delta, s) / denominator; const u = cross(delta, r) / denominator;
        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) { hits.push({ spanId: span.id, crossingPosition: (traversed + u * part) / total, alongGesture: t }); break; }
      }
      traversed += part;
    }
  }
  return hits.sort((a, b) => a.alongGesture - b.alongGesture);
}
export function nearestSpan(point: ScreenPoint, spans: ScreenSpan[], tolerance = 12): string | null {
  let best = tolerance; let id: string | null = null;
  for (const span of spans) for (let i = 1; i < span.points.length; i++) {
    const a = span.points[i - 1]; const b = span.points[i];
    const dx = b.x - a.x; const dy = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
    const d = length(point, { x: a.x + t * dx, y: a.y + t * dy });
    if (d < best) { best = d; id = span.id; }
  }
  return id;
}

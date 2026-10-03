import { describe, expect, it } from 'vitest';
import { crossings, nearestSpan } from './interaction';
const spans = [
  { id: 'right', points: [{ x: 80, y: 0 }, { x: 80, y: 100 }] },
  { id: 'left', points: [{ x: 20, y: 0 }, { x: 20, y: 100 }] },
  { id: 'middle', points: [{ x: 50, y: 0 }, { x: 50, y: 100 }] },
];
describe('pointer gestures', () => {
  it('orders crossings along the gesture and includes crossing position', () => {
    const hits = crossings({ x: 0, y: 25 }, { x: 100, y: 25 }, spans);
    expect(hits.map(h => h.spanId)).toEqual(['left', 'middle', 'right']); expect(hits[0].crossingPosition).toBeCloseTo(0.25);
  });
  it('rings spans on every back-and-forth crossing without releasing', () => {
    const points = [0, 100, 0, 100];
    const hits = points.slice(1).flatMap((x, i) => crossings({ x: points[i], y: 50 }, { x, y: 50 }, spans));
    expect(hits.map(h => h.spanId)).toEqual(['left', 'middle', 'right', 'right', 'middle', 'left', 'left', 'middle', 'right']);
  });
  it('counts a shared pointer endpoint once and allows an immediate recrossing', () => {
    const points = [40, 50, 60, 40];
    const hits = points.slice(1).flatMap((x, i) => crossings({ x: points[i], y: 50 }, { x, y: 50 }, [spans[2]]));
    expect(hits.map(h => h.spanId)).toEqual(['middle', 'middle']);
  });
  it('does not strum parallel paths, missed segments, or stationary gestures', () => {
    expect(crossings({ x: 20, y: 0 }, { x: 20, y: 100 }, [spans[1]])).toEqual([]);
    expect(crossings({ x: 0, y: 150 }, { x: 100, y: 150 }, spans)).toEqual([]);
    expect(crossings({ x: 50, y: 50 }, { x: 50, y: 50 }, spans)).toEqual([]);
  });
  it('finds nearby segments and rejects far taps', () => { expect(nearestSpan({ x: 23, y: 50 }, spans)).toBe('left'); expect(nearestSpan({ x: 0, y: 140 }, spans)).toBeNull(); });
});

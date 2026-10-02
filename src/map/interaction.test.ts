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
  it('suppresses duplicates per gesture and supports reverse swipes', () => {
    const hits = crossings({ x: 100, y: 50 }, { x: 0, y: 50 }, spans, new Set(['middle']));
    expect(hits.map(h => h.spanId)).toEqual(['right', 'left']);
  });
  it('does not strum parallel paths, missed segments, or stationary gestures', () => {
    expect(crossings({ x: 20, y: 0 }, { x: 20, y: 100 }, [spans[1]])).toEqual([]);
    expect(crossings({ x: 0, y: 150 }, { x: 100, y: 150 }, spans)).toEqual([]);
    expect(crossings({ x: 50, y: 50 }, { x: 50, y: 50 }, spans)).toEqual([]);
  });
  it('finds nearby segments and rejects far taps', () => { expect(nearestSpan({ x: 23, y: 50 }, spans)).toBe('left'); expect(nearestSpan({ x: 0, y: 140 }, spans)).toBeNull(); });
});

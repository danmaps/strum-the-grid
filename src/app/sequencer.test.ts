import { afterEach, describe, expect, it, vi } from 'vitest';
import { connectedPath, NetworkSequencer } from './sequencer';
import { syntheticSpans } from '../data/synthetic';

afterEach(() => vi.useRealTimers());
describe('geographic sequence', () => {
  it('walks a deterministic, connected, nonrepeating path', () => {
    const ids = connectedPath(syntheticSpans); expect(ids).toEqual(connectedPath(syntheticSpans)); expect(ids.length).toBeGreaterThan(8);
    expect(new Set(ids).size).toBe(ids.length);
    for (let i = 1; i < ids.length; i++) { const a = syntheticSpans.find(s => s.id === ids[i - 1])!; const b = syntheticSpans.find(s => s.id === ids[i])!; expect([a.fromStructureId, a.toStructureId].some(id => [b.fromStructureId, b.toStructureId].includes(id))).toBe(true); }
  });
  it('stops pending callbacks and supports deliberate steady timing', () => {
    vi.useFakeTimers(); const player = new NetworkSequencer(); const step = vi.fn(); const done = vi.fn();
    player.start(['a', 'b', 'c'], true, step, done); expect(step).toHaveBeenCalledWith('a');
    vi.advanceTimersByTime(500); expect(step).toHaveBeenLastCalledWith('b');
    player.stop(); vi.runAllTimers(); expect(step).toHaveBeenCalledTimes(2); expect(done).not.toHaveBeenCalled();
    player.start(['c'], false, step, done); vi.runAllTimers(); expect(done).toHaveBeenCalledOnce();
  });
});

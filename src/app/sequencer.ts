import type { SpanFeature } from '../data/types';

/** Deterministic, connected walk. Each span is visited once; branches are never jumped across. */
export function connectedPath(spans: SpanFeature[], startId?: string): string[] {
  if (!spans.length) return [];
  let next = spans.find(s => s.id === startId) ?? spans[0];
  let endpoint = next.toStructureId;
  const path = [next.id]; const used = new Set(path);
  for (;;) {
    const candidate = spans.find(s => !used.has(s.id) && (s.fromStructureId === endpoint || s.toStructureId === endpoint));
    if (!candidate) break;
    next = candidate;
    endpoint = next.fromStructureId === endpoint ? next.toStructureId : next.fromStructureId;
    path.push(next.id); used.add(next.id);
  }
  return path;
}
/** A single cancellable timer; no pending tones survive stop or component disposal. */
export class NetworkSequencer {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private generation = 0;
  start(ids: string[], quantized: boolean, onStep: (id: string) => void, onDone: () => void) {
    this.stop(); const generation = this.generation; let index = 0;
    const tick = () => {
      if (generation !== this.generation) return;
      if (index === ids.length) { this.timer = null; onDone(); return; }
      onStep(ids[index++]);
      this.timer = setTimeout(tick, quantized ? 500 : 360 + ((index * 97) % 180));
    };
    tick();
  }
  stop() { this.generation++; if (this.timer !== null) clearTimeout(this.timer); this.timer = null; }
}

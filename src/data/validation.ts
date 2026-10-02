import type { SpanFeature, SpanPhysicalParameters, StructureFeature } from './types';

/** Deliberately broad demonstration bounds, in SI units; these are not design limits. */
export const parameterBounds = {
  spanLengthM: [20, 1500],
  modeledTensionN: [500, 100000],
  linearDensityKgPerM: [0.05, 5],
  modeledSagM: [0.01, 60],
  temperatureC: [-40, 100],
  dampingRatio: [0.005, 0.5],
} as const;

export function validateParameters(p: SpanPhysicalParameters): void {
  for (const [key, [min, max]] of Object.entries(parameterBounds)) {
    const value = p[key as keyof SpanPhysicalParameters];
    if (!Number.isFinite(value) || value < min || value > max) throw new RangeError(`${key} must be between ${min} and ${max}`);
  }
}

function validPosition(p: unknown): p is [number, number] {
  return Array.isArray(p) && p.length === 2 && p.every(Number.isFinite) && Math.abs(p[0]) <= 180 && Math.abs(p[1]) <= 90;
}

export function validateSpan(value: unknown): asserts value is SpanFeature {
  if (!value || typeof value !== 'object') throw new TypeError('Expected a span object');
  const s = value as SpanFeature;
  for (const key of ['id', 'fromStructureId', 'toStructureId', 'conductorType'] as const) {
    if (typeof s[key] !== 'string' || !s[key].trim()) throw new TypeError(`Missing ${key}`);
  }
  if (s.fromStructureId === s.toStructureId) throw new TypeError('Span endpoints must differ');
  if (!['distribution', 'transmission', 'secondary', 'demo'].includes(s.displayClass)) throw new TypeError('Invalid display class');
  if (!['synthetic', 'authorized-adapter'].includes(s.source)) throw new TypeError('Invalid source');
  if (!['provided', 'geometry'].includes(s.lengthSource)) throw new TypeError('Missing length source');
  if (s.geometry?.type !== 'LineString' || !Array.isArray(s.geometry.coordinates) || s.geometry.coordinates.length < 2 || !s.geometry.coordinates.every(validPosition)) throw new TypeError('Expected WGS84 LineString');
  if (geometryLengthM(s.geometry.coordinates) < 1) throw new RangeError('Degenerate span geometry');
  validateParameters(s);
  if (s.modeledSagM >= s.spanLengthM / 4) throw new RangeError('Implausible demo sag');
}

/** Spherical great-circle length (m), summed along a WGS84 polyline; radius 6371008.8 m. */
export function geometryLengthM(coordinates: number[][]): number {
  const rad = Math.PI / 180;
  let total = 0;
  for (let i = 1; i < coordinates.length; i++) {
    const [lon1, lat1] = coordinates[i - 1];
    const [lon2, lat2] = coordinates[i];
    const h = Math.sin((lat2 - lat1) * rad / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin((lon2 - lon1) * rad / 2) ** 2;
    total += 2 * 6371008.8 * Math.asin(Math.sqrt(Math.min(1, h)));
  }
  return total;
}

export function validateNetwork(spans: SpanFeature[], structures: StructureFeature[]): void {
  const ids = new Set<string>();
  const supports = new Map<string, StructureFeature>();
  for (const s of structures) {
    if (!s.id || supports.has(s.id) || s.geometry.type !== 'Point' || !validPosition(s.geometry.coordinates)) throw new TypeError('Invalid or duplicate support');
    supports.set(s.id, s);
  }
  for (const s of spans) {
    validateSpan(s);
    if (ids.has(s.id)) throw new TypeError('Duplicate span ID');
    ids.add(s.id);
    const from = supports.get(s.fromStructureId);
    const to = supports.get(s.toStructureId);
    if (!from || !to) throw new TypeError('Missing support');
    const ends = [s.geometry.coordinates[0], s.geometry.coordinates.at(-1)!];
    if (geometryLengthM([from.geometry.coordinates, ends[0]]) > 0.1 || geometryLengthM([to.geometry.coordinates, ends[1]]) > 0.1) throw new RangeError('Support geometry mismatch');
    if (s.source === 'synthetic' && Math.abs(geometryLengthM(s.geometry.coordinates) - s.spanLengthM) > 0.1) throw new RangeError('Synthetic length mismatch');
  }
}

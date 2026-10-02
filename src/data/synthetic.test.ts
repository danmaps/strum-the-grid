import { describe, expect, it } from 'vitest';
import { BundledSpanDataSource, structures, syntheticSpans } from './synthetic';
import { geometryLengthM, validateNetwork, validateSpan } from './validation';
import { withOverrides } from './types';
import { deriveModel } from '../physics/model';

describe('safe normalized dataset', () => {
  it('validates the entire synthetic network and has varied families and lengths', () => {
    expect(() => validateNetwork(syntheticSpans, structures)).not.toThrow();
    expect(syntheticSpans.length).toBe(39); expect(new Set(syntheticSpans.map(s => s.conductorType)).size).toBe(3);
    expect(new Set(syntheticSpans.map(s => Math.round(s.spanLengthM))).size).toBeGreaterThan(8);
    for (const span of syntheticSpans) { expect(span.source).toBe('synthetic'); expect(span.spanLengthM).toBeCloseTo(geometryLengthM(span.geometry.coordinates), 5); expect(span).not.toHaveProperty('fundamentalHz'); }
  });
  it('loads isolated records by ID and extent without GIS-specific objects', async () => {
    const adapter = new BundledSpanDataSource(); const records = await adapter.loadSpans();
    records[0].temperatureC = 80; expect(syntheticSpans[0].temperatureC).toBe(20);
    expect(await adapter.getSpan(syntheticSpans[0].id)).toEqual(syntheticSpans[0]); expect(await adapter.getSpan('missing')).toBeNull();
    expect(await adapter.loadSpans({ west: 10, east: 11, south: 10, north: 11 })).toEqual([]);
  });
  it('overrides never mutate source and removal restores it exactly', () => {
    const source = syntheticSpans[0]; const changed = withOverrides(source, { [source.id]: { modeledTensionN: source.modeledTensionN * 2 } });
    expect(deriveModel(changed, source).fundamentalHz).toBeCloseTo(deriveModel(source).fundamentalHz * Math.SQRT2);
    expect(source).toEqual(syntheticSpans[0]); expect(withOverrides(source, {})).toEqual(source);
  });
  it('rejects malformed geometry, metadata, implausible values and support mismatch', () => {
    const source = structuredClone(syntheticSpans[0]);
    for (const invalid of [{ ...source, spanLengthM: -5 }, { ...source, source: 'real' }, { ...source, geometry: { type: 'LineString', coordinates: [[NaN, 0], [1, 2]] } }, { ...source, fromStructureId: source.toStructureId }, { ...source, modeledSagM: 59 }, { ...source, lengthSource: undefined }]) expect(() => validateSpan(invalid)).toThrow();
    expect(() => validateNetwork([source, source], structures)).toThrow();
    expect(() => validateNetwork([{ ...source, toStructureId: 'missing' }], structures)).toThrow();
  });
});

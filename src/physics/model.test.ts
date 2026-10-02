import { describe, expect, it } from 'vitest';
import { clampParameter, deriveModel, fundamentalFrequency, modalFrequencies, modeShape, normalizedResponse, resonanceResponse, sagAt } from './model';
import { syntheticSpans } from '../data/synthetic';

describe('ideal string frequency (SI units)', () => {
  it('has an analytic reference and inverse length dependence', () => {
    expect(fundamentalFrequency(100, 10000, 1)).toBe(0.5);
    expect(fundamentalFrequency(200, 10000, 1)).toBe(0.25);
  });
  it('scales with square root of tension and inverse square root of mass', () => {
    expect(fundamentalFrequency(100, 40000, 1)).toBe(1);
    expect(fundamentalFrequency(100, 10000, 4)).toBe(0.25);
  });
  it('has integer modal frequencies', () => { expect(modalFrequencies(2)).toEqual([2, 4, 6, 8]); });
  it.each([0, -1, NaN, Infinity])('rejects invalid physical inputs %s', value => {
    expect(() => fundamentalFrequency(value, 10000, 1)).toThrow(RangeError);
    expect(() => fundamentalFrequency(100, value, 1)).toThrow(RangeError);
    expect(() => fundamentalFrequency(100, 10000, value)).toThrow(RangeError);
  });
});
describe('damped response', () => {
  it('peaks near its natural mode', () => {
    const frequencies = Array.from({ length: 1001 }, (_, i) => 0.5 + i / 1000);
    const peak = frequencies.reduce((a, b) => resonanceResponse(a, 1, 0.03) > resonanceResponse(b, 1, 0.03) ? a : b);
    expect(peak).toBeCloseTo(1, 2);
    expect(resonanceResponse(1, 1, 0.03)).toBeCloseTo(1 / 0.06);
  });
  it('damping reduces peak and broadens the half-height bandwidth', () => {
    expect(resonanceResponse(1, 1, 0.2)).toBeLessThan(resonanceResponse(1, 1, 0.02));
    const relativeWidth = (damping: number) => Array.from({ length: 1001 }, (_, i) => 0.5 + i / 1000).filter(f => resonanceResponse(f, 1, damping) > resonanceResponse(1, 1, damping) / 2).length;
    expect(relativeWidth(0.2)).toBeGreaterThan(relativeWidth(0.02));
  });
  it('saturates all allowed audio/visual response safely and rejects nonfinite input', () => {
    expect(normalizedResponse(1, 1, 0.005)).toBeLessThan(1);
    expect(normalizedResponse(0, 1, 0.03)).toBeGreaterThanOrEqual(0);
    expect(() => resonanceResponse(-1, 1, 0.03)).toThrow();
    expect(() => resonanceResponse(1, 1, 0)).toThrow();
    expect(() => resonanceResponse(Infinity, 1, 0.1)).toThrow();
  });
});
describe('sag, temperature, and mode shape', () => {
  it('parabolic sag is symmetric, zero at supports, and equals sag at midspan', () => {
    expect(sagAt(0, 5)).toBe(0); expect(sagAt(1, 5)).toBe(0); expect(sagAt(0.5, 5)).toBe(5);
    expect(sagAt(0.2, 5)).toBeCloseTo(sagAt(0.8, 5));
  });
  it('locates every ideal mode node and antinode', () => {
    for (let mode = 1; mode <= 4; mode++) {
      for (let i = 0; i <= mode; i++) expect(modeShape(i / mode, mode)).toBeCloseTo(0, 10);
      for (let i = 0; i < mode; i++) expect(Math.abs(modeShape((i + 0.5) / mode, mode))).toBeCloseTo(1);
    }
  });
  it('warmer temperatures lower tension/frequency and raise sag deterministically', () => {
    const source = syntheticSpans[0]; const baseline = deriveModel(source);
    const warm = deriveModel({ ...source, temperatureC: 70 }, source);
    expect(warm.tensionN).toBeLessThan(baseline.tensionN); expect(warm.fundamentalHz).toBeLessThan(baseline.fundamentalHz); expect(warm.sagM).toBeGreaterThan(baseline.sagM);
    expect(deriveModel(source)).toEqual(baseline);
    expect(deriveModel({ ...source, temperatureC: 70 }, source, { referenceC: 20, tensionFractionPerC: 0 }).tensionN).toBe(source.modeledTensionN);
  });
  it('updates sag coherently with length, density, tension, and reference-sag overrides', () => {
    const source = syntheticSpans[0]; const base = deriveModel(source);
    expect(deriveModel({ ...source, spanLengthM: source.spanLengthM * 2 }, source).sagM).toBeCloseTo(base.sagM * 4);
    expect(deriveModel({ ...source, modeledTensionN: source.modeledTensionN * 2 }, source).sagM).toBeCloseTo(base.sagM / 2);
    expect(deriveModel({ ...source, modeledSagM: source.modeledSagM * 2 }, source).sagM).toBeCloseTo(base.sagM * 2);
  });
  it('bounds inputs intentionally and rejects nonfinite or invalid values', () => {
    expect(clampParameter('dampingRatio', 0)).toBe(0.005); expect(clampParameter('spanLengthM', 5000)).toBe(1500);
    expect(() => clampParameter('temperatureC', NaN)).toThrow(); expect(() => sagAt(2, 5)).toThrow();
    expect(() => deriveModel({ ...syntheticSpans[0], dampingRatio: 0 })).toThrow();
    expect(() => modalFrequencies(1, 1.5)).toThrow(); expect(() => modeShape(0.5, 0)).toThrow();
  });
});

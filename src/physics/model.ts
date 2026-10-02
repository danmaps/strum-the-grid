import type { SpanPhysicalParameters } from '../data/types';
import { parameterBounds, validateParameters } from '../data/validation';

function positive(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0) throw new RangeError(`${name} must be finite and positive`);
}
/** Ideal straight, flexible, fixed-end string: length m, tension N, density kg/m -> Hz. */
export function fundamentalFrequency(lengthM: number, tensionN: number, densityKgPerM: number): number {
  positive(lengthM, 'Length'); positive(tensionN, 'Tension'); positive(densityKgPerM, 'Density');
  return Math.sqrt(tensionN / densityKgPerM) / (2 * lengthM);
}
/** Natural frequencies (Hz) for the first count integer modes, without bending stiffness. */
export function modalFrequencies(fundamentalHz: number, count = 4): number[] {
  positive(fundamentalHz, 'Frequency');
  if (!Number.isInteger(count) || count < 1 || count > 32) throw new RangeError('Mode count must be 1–32');
  return Array.from({ length: count }, (_, i) => fundamentalHz * (i + 1));
}
/** Dimensionless steady-state SDOF response; frequencies Hz, damping ratio dimensionless. */
export function resonanceResponse(excitationHz: number, naturalHz: number, damping: number): number {
  positive(naturalHz, 'Natural frequency'); positive(damping, 'Damping');
  if (!Number.isFinite(excitationHz) || excitationHz < 0) throw new RangeError('Excitation must be nonnegative Hz');
  const r = excitationHz / naturalHz;
  return 1 / Math.hypot(1 - r * r, 2 * damping * r);
}
/** Saturated display/audio response in [0,1]; raw displacement is never interpreted as metres. */
export function normalizedResponse(excitationHz: number, naturalHz: number, damping: number): number {
  const raw = resonanceResponse(excitationHz, naturalHz, damping);
  return raw / (raw + 4);
}
/** Equal-height supports; parabolic downward sag in m at normalized x in [0,1]. */
export function sagAt(x: number, sagM: number): number {
  if (!Number.isFinite(x) || x < 0 || x > 1 || !Number.isFinite(sagM) || sagM < 0) throw new RangeError('Invalid sag input');
  return 4 * sagM * x * (1 - x);
}
/** Unit-amplitude fixed-end mode shape at normalized x; phase in radians. */
export function modeShape(x: number, mode: number, phase = 0): number {
  if (!Number.isFinite(x) || x < 0 || x > 1 || !Number.isInteger(mode) || mode < 1 || mode > 32 || !Number.isFinite(phase)) throw new RangeError('Invalid mode input');
  return Math.sin(mode * Math.PI * x) * Math.cos(phase);
}
export function clampParameter<K extends keyof SpanPhysicalParameters>(key: K, value: number): number {
  if (!Number.isFinite(value)) throw new RangeError('Nonfinite parameter');
  const [min, max] = parameterBounds[key];
  return Math.max(min, Math.min(max, value));
}
export interface TemperatureDemoCurve { referenceC: number; tensionFractionPerC: number }
export const defaultTemperatureCurve: TemperatureDemoCurve = { referenceC: 20, tensionFractionPerC: 0.0035 };

/** Educational curve only: +1 C reduces reference tension by 0.35%; bounded to 35–125%.
 * Reference tension/sag are at curve.referenceC. Sag scales with L², density, and inverse tension.
 * This omits thermal expansion compatibility, creep, stiffness, unequal supports and wind.
 */
export function deriveModel(p: SpanPhysicalParameters, reference: SpanPhysicalParameters = p, curve = defaultTemperatureCurve) {
  validateParameters(p); validateParameters(reference);
  if (!Number.isFinite(curve.referenceC) || !Number.isFinite(curve.tensionFractionPerC) || curve.tensionFractionPerC < 0) throw new RangeError('Invalid educational temperature curve');
  const temperatureFactor = Math.max(0.35, Math.min(1.25, 1 - curve.tensionFractionPerC * (p.temperatureC - curve.referenceC)));
  const tensionN = p.modeledTensionN * temperatureFactor;
  const sagM = p.modeledSagM * (p.spanLengthM / reference.spanLengthM) ** 2 * (p.linearDensityKgPerM / reference.linearDensityKgPerM) * (reference.modeledTensionN / tensionN);
  const fundamentalHz = fundamentalFrequency(p.spanLengthM, tensionN, p.linearDensityKgPerM);
  return { tensionN, sagM, fundamentalHz, modesHz: modalFrequencies(fundamentalHz), temperatureFactor };
}

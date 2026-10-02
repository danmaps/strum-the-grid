import type { LineString, Point } from 'geojson';

export interface SpanPhysicalParameters {
  spanLengthM: number;
  modeledTensionN: number;
  linearDensityKgPerM: number;
  modeledSagM: number;
  temperatureC: number;
  dampingRatio: number;
}

export interface SpanFeature extends SpanPhysicalParameters {
  id: string;
  geometry: LineString;
  fromStructureId: string;
  toStructureId: string;
  conductorType: string;
  displayClass: 'distribution' | 'transmission' | 'secondary' | 'demo';
  source: 'synthetic' | 'authorized-adapter';
  lengthSource: 'provided' | 'geometry';
}

export interface StructureFeature { id: string; geometry: Point }
export interface ExtentLike { west: number; south: number; east: number; north: number }
export interface SpanDataSource {
  loadSpans(extent?: ExtentLike): Promise<SpanFeature[]>;
  getSpan(id: string): Promise<SpanFeature | null>;
}

export type ParameterOverrides = Record<string, Partial<SpanPhysicalParameters>>;

// Immutable source records stay separate from experiments. Derived values are never persisted.
export function withOverrides(span: SpanFeature, overrides: ParameterOverrides): SpanFeature {
  return { ...span, ...overrides[span.id] };
}

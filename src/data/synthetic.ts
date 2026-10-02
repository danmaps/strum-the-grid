import networkText from './network.geojson?raw';
import structuresText from './structures.geojson?raw';
import type { FeatureCollection, LineString, Point } from 'geojson';
import type { ExtentLike, SpanDataSource, SpanFeature, StructureFeature } from './types';
import { geometryLengthM, validateNetwork } from './validation';

const collection = JSON.parse(networkText) as FeatureCollection<LineString, Omit<SpanFeature, 'geometry'>>;
const structuresCollection = JSON.parse(structuresText) as FeatureCollection<Point, { id: string }>;
export const structures: StructureFeature[] = structuresCollection.features.map(f => ({ id: f.properties.id, geometry: f.geometry }));
export const syntheticSpans: SpanFeature[] = collection.features.map(f => ({
  ...f.properties, geometry: f.geometry,
  spanLengthM: f.properties.lengthSource === 'geometry' ? geometryLengthM(f.geometry.coordinates) : f.properties.spanLengthM,
}));
validateNetwork(syntheticSpans, structures);

// Freeze the source recursively; consumers receive copies so adapters share the same contract.
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
freeze(syntheticSpans);
freeze(structures);

export class BundledSpanDataSource implements SpanDataSource {
  async loadSpans(extent?: ExtentLike): Promise<SpanFeature[]> {
    return structuredClone(syntheticSpans.filter(s => {
      if (!extent) return true;
      const xs = s.geometry.coordinates.map(p => p[0]);
      const ys = s.geometry.coordinates.map(p => p[1]);
      return Math.max(...xs) >= extent.west && Math.min(...xs) <= extent.east && Math.max(...ys) >= extent.south && Math.min(...ys) <= extent.north;
    }));
  }
  async getSpan(id: string): Promise<SpanFeature | null> {
    return structuredClone(syntheticSpans.find(s => s.id === id) ?? null);
  }
}

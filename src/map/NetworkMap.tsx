import { useEffect, useRef, useState } from 'react';
import type { SpanFeature, StructureFeature } from '../data/types';
import type { ActiveExcitation } from '../visualization/types';
import { crossings, nearestSpan, type ScreenPoint, type ScreenSpan, type StrumEvent } from './interaction';
import type MapView from '@arcgis/core/views/MapView';

interface Props {
  spans: SpanFeature[];
  structures: StructureFeature[];
  selectedId: string | null;
  excitations: ActiveExcitation[];
  reducedMotion: boolean;
  onStrum: (event: StrumEvent) => void;
  onSelect: (id: string) => void;
}
const color = (s: SpanFeature) => s.displayClass === 'transmission' ? '#e4c284' : s.conductorType.includes('light') ? '#c1ed85' : '#79c6c2';
const straightPath = (points: ScreenPoint[]) => points.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ');

export default function NetworkMap(props: Props) {
  const container = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const viewRef = useRef<MapView | null>(null);
  const paths = useRef(new Map<string, SVGPathElement>());
  const latest = useRef(props); latest.current = props;
  const [screenSpans, setScreenSpans] = useState<ScreenSpan[]>([]);
  const [status, setStatus] = useState('Loading ArcGIS map…');
  const [error, setError] = useState('');
  const [interaction, setInteraction] = useState<'strum' | 'pan'>('strum');
  const interactionRef = useRef(interaction); interactionRef.current = interaction;
  const [retry, setRetry] = useState(0);
  const [hovered, setHovered] = useState<string | null>(null);
  const projected = useRef(screenSpans); projected.current = screenSpans;
  const gesture = useRef<{ id: number; start: ScreenPoint; previous: ScreenPoint; time: number; lastCrossed: string | null; distance: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    let view: MapView | null = null;
    const handles: { remove(): void }[] = [];
    async function initialize() {
      try {
        const [{ default: Map }, { default: View }, { default: GraphicsLayer }, { default: Graphic }, { default: Point }, { default: Polyline }, { default: Extent }, { default: config }, reactiveUtils] = await Promise.all([
          import('@arcgis/core/Map.js'), import('@arcgis/core/views/MapView.js'), import('@arcgis/core/layers/GraphicsLayer.js'),
          import('@arcgis/core/Graphic.js'), import('@arcgis/core/geometry/Point.js'), import('@arcgis/core/geometry/Polyline.js'),
          import('@arcgis/core/geometry/Extent.js'), import('@arcgis/core/config.js'), import('@arcgis/core/core/reactiveUtils.js'),
        ]);
        if (cancelled || !container.current) return;
        config.assetsPath = `${import.meta.env.BASE_URL}arcgis`;
        const context = new GraphicsLayer({ title: 'Invented context', listMode: 'hide' });
        const network = new GraphicsLayer({ title: 'Synthetic conductor spans' });
        const supportLayer = new GraphicsLayer({ title: 'Synthetic supports' });
        const positions = props.spans.flatMap(s => s.geometry.coordinates);
        const xs = positions.map(p => p[0]); const ys = positions.map(p => p[1]);
        const west = Math.min(...xs); const east = Math.max(...xs); const south = Math.min(...ys); const north = Math.max(...ys);
        const dx = east - west; const dy = north - south;
        const extent = new Extent({ xmin: west - dx * 0.13, xmax: east + dx * 0.13, ymin: south - dy * 0.22, ymax: north + dy * 0.22, spatialReference: { wkid: 4326 } });
        // Original abstract grid context. No basemap service, labels, tokens, or infrastructure data.
        for (let i = -8; i <= 8; i++) {
          const x = i * 0.0024; const y = i * 0.0020;
          for (const coords of [[[x, -0.035], [x + 0.003, 0.035]], [[-0.035, y], [0.035, y + 0.003]]]) {
            context.add(new Graphic({ geometry: new Polyline({ paths: [coords], spatialReference: { wkid: 4326 } }), symbol: { type: 'simple-line', color: '#273637', width: 1 } }));
          }
        }
        props.spans.forEach(s => network.add(new Graphic({ geometry: new Polyline({ paths: [s.geometry.coordinates], spatialReference: { wkid: 4326 } }), attributes: { id: s.id }, symbol: { type: 'simple-line', color: color(s), width: 1.5, } })));
        props.structures.forEach(s => supportLayer.add(new Graphic({ geometry: new Point({ longitude: s.geometry.coordinates[0], latitude: s.geometry.coordinates[1] }), symbol: { type: 'simple-marker', size: 5, color: '#172325', outline: { color: '#71847b', width: 1 } } })));
        view = new View({ container: container.current, map: new Map({ layers: [context, network, supportLayer] }), extent, spatialReference: { wkid: 4326 }, constraints: { rotationEnabled: false }, ui: { components: ['attribution'] }, background: { color: '#152022' }, popupEnabled: false });
        viewRef.current = view;
        await view.when();
        if (cancelled) return;
        const project = () => {
          if (!view || cancelled) return;
          setScreenSpans(props.spans.map(s => ({ id: s.id, points: s.geometry.coordinates.map(([longitude, latitude]) => {
            const point = view!.toScreen(new Point({ longitude, latitude }));
            return { x: point?.x ?? -10000, y: point?.y ?? -10000 };
          }) })));
        };
        project();
        handles.push(reactiveUtils.watch(() => [view!.extent, view!.width, view!.height], project));
        handles.push(view.on('click', event => {
          if (interactionRef.current !== 'pan') return;
          const id = nearestSpan({ x: event.x, y: event.y }, projected.current);
          if (id) { latest.current.onSelect(id); latest.current.onStrum({ spanId: id, crossingPosition: 0.5, velocity: 0, timestamp: performance.now(), kind: 'preview' }); }
        }));
        setStatus('ArcGIS map ready'); setError('');
      } catch (reason) {
        if (!cancelled) { setError(`Map could not initialize. ${reason instanceof Error ? reason.message : String(reason)}`); setStatus('Map unavailable'); }
      }
    }
    void initialize();
    return () => { cancelled = true; handles.forEach(h => h.remove()); view?.destroy(); viewRef.current = null; };
  }, [props.spans, props.structures, retry]);

  useEffect(() => {
    let frame = 0;
    const animate = () => {
      const now = performance.now(); let active = false;
      for (const span of screenSpans) {
        const path = paths.current.get(span.id); if (!path) continue;
        const excitation = [...props.excitations].reverse().find(e => e.spanId === span.id && now - e.timestamp < e.durationMs);
        if (!excitation) { path.setAttribute('d', straightPath(span.points)); path.style.strokeWidth = ''; path.style.filter = ''; continue; }
        active = true;
        const age = (now - excitation.timestamp) / 1000;
        const decay = Math.exp(-3.4 * age / (excitation.durationMs / 1000));
        path.style.strokeWidth = String(2 + 2 * decay);
        path.style.filter = `drop-shadow(0 0 ${3 + 7 * decay}px ${color(props.spans.find(s => s.id === span.id)!)})`;
        if (props.reducedMotion) { path.setAttribute('d', straightPath(span.points)); continue; }
        const a = span.points[0]; const b = span.points.at(-1)!;
        const dx = b.x - a.x; const dy = b.y - a.y; const distance = Math.hypot(dx, dy) || 1;
        const offset = 7 * excitation.amplitude * decay * Math.cos(age * 16);
        const points = Array.from({ length: 25 }, (_, i) => {
          const x = i / 24; const shift = offset * Math.sin(Math.PI * x);
          return { x: a.x + dx * x - dy / distance * shift, y: a.y + dy * x + dx / distance * shift };
        });
        path.setAttribute('d', straightPath(points));
      }
      if (active) frame = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(frame);
  }, [props.excitations, props.reducedMotion, props.spans, screenSpans]);

  function localPoint(event: React.PointerEvent): ScreenPoint {
    const rect = svg.current!.getBoundingClientRect(); return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }
  function pointerDown(event: React.PointerEvent<SVGSVGElement>) {
    if (event.button !== 0 || gesture.current) return;
    event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId);
    const point = localPoint(event);
    gesture.current = { id: event.pointerId, start: point, previous: point, time: performance.now(), lastCrossed: null, distance: 0 };
  }
  function pointerMove(event: React.PointerEvent<SVGSVGElement>) {
    const point = localPoint(event); const g = gesture.current;
    if (!g) { setHovered(nearestSpan(point, screenSpans)); return; }
    if (g.id !== event.pointerId) return;
    const now = performance.now(); const distance = Math.hypot(point.x - g.previous.x, point.y - g.previous.y);
    const velocity = distance / Math.max(1, now - g.time) * 1000;
    for (const hit of crossings(g.previous, point, screenSpans)) {
      g.lastCrossed = hit.spanId;
      latest.current.onStrum({ ...hit, velocity, timestamp: now, kind: 'strum' });
    }
    g.distance += distance; g.previous = point; g.time = now;
  }
  function pointerUp(event: React.PointerEvent<SVGSVGElement>) {
    const g = gesture.current;
    if (!g || g.id !== event.pointerId) return;
    if (g.distance < 8 && g.lastCrossed === null) {
      const id = nearestSpan(localPoint(event), screenSpans, event.pointerType === 'touch' ? 20 : 12);
      if (id) { latest.current.onSelect(id); latest.current.onStrum({ spanId: id, crossingPosition: 0.5, velocity: 0, timestamp: performance.now(), kind: 'preview' }); }
    }
    // Defer the inspection panel until release so map resizing cannot move targets mid-swipe.
    if (g.lastCrossed) latest.current.onSelect(g.lastCrossed);
    gesture.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }
  function navigate(key: string) {
    const current = props.spans.findIndex(s => s.id === props.selectedId);
    if (key === 'ArrowRight' || key === 'ArrowLeft') props.onSelect(props.spans[(current + (key === 'ArrowRight' ? 1 : -1) + props.spans.length) % props.spans.length].id);
    if ((key === ' ' || key === 'Enter') && props.selectedId) props.onStrum({ spanId: props.selectedId, crossingPosition: 0.5, velocity: 0, timestamp: performance.now(), kind: 'keyboard' });
  }
  const zoom = (factor: number) => { const view = viewRef.current; if (view) void view.goTo(view.extent.clone().expand(factor), { animate: !props.reducedMotion }).catch(() => {}); };
  return <div className="network-map" data-testid="network-map">
    <div className="arcgis-container" ref={container} />
    <svg ref={svg} className={`strum-surface ${interaction}`} aria-label="Synthetic network. Left and right arrows select spans; Space plays the selected span." role="application" tabIndex={0}
      onKeyDown={e => { if (['ArrowRight', 'ArrowLeft', ' ', 'Enter'].includes(e.key)) { e.preventDefault(); navigate(e.key); } }}
      onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={() => { gesture.current = null; }}>
      {screenSpans.map(s => <path key={s.id} ref={el => { if (el) paths.current.set(s.id, el); else paths.current.delete(s.id); }}
        data-span-id={s.id} d={straightPath(s.points)} fill="none" stroke={color(props.spans.find(p => p.id === s.id)!)}
        className={`conductor ${s.id === props.selectedId ? 'selected' : ''} ${s.id === hovered ? 'hovered' : ''}`} />)}
      {screenSpans.filter(s => s.id === props.selectedId).map(s => <g key={s.id} className="map-selection-label" transform={`translate(${(s.points[0].x + s.points.at(-1)!.x) / 2},${(s.points[0].y + s.points.at(-1)!.y) / 2 - 22})`}>
        <rect x="-43" y="-14" width="86" height="24" rx="5" /><text textAnchor="middle" y="2">{s.id}</text>
      </g>)}
    </svg>
    <div className="map-topline"><span><i className="status-dot" /> NULL ISLAND / SYNTHETIC</span><span>{props.spans.length} spans · {props.structures.length} supports</span></div>
    <div className="map-toolbar" aria-label="Map controls">
      <button aria-pressed={interaction === 'strum'} onClick={() => setInteraction('strum')}>↯ Strum</button>
      <button aria-pressed={interaction === 'pan'} onClick={() => setInteraction('pan')}>✥ Pan</button>
      <span className="toolbar-divider" />
      <button aria-label="Zoom in" onClick={() => zoom(0.8)}>+</button>
      <button aria-label="Zoom out" onClick={() => zoom(1.25)}>−</button>
      <button aria-label="Reset map extent" onClick={() => { setStatus('Loading ArcGIS map…'); setRetry(r => r + 1); }}>↺</button>
    </div>
    <div className="map-legend"><span><i style={{ background: '#c1ed85' }} />Light</span><span><i style={{ background: '#79c6c2' }} />Reinforced</span><span><i style={{ background: '#e4c284' }} />Heavy</span></div>
    <span className="map-status" role="status" data-testid="map-status">{status}</span>
    {error && <div className="map-error" role="alert"><p>{error}</p><button onClick={() => setRetry(r => r + 1)}>Retry map</button></div>}
  </div>;
}

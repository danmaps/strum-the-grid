import { useCallback, useEffect, useRef, useState } from 'react';
import { BundledSpanDataSource, structures } from '../data/synthetic';
import { withOverrides, type ParameterOverrides, type SpanFeature, type SpanPhysicalParameters } from '../data/types';
import { clampParameter, deriveModel, normalizedResponse } from '../physics/model';
import { SpanAudioEngine } from '../audio/engine';
import { audiblePitch, decaySeconds } from '../audio/presentation';
import NetworkMap from '../map/NetworkMap';
import type { StrumEvent } from '../map/interaction';
import Profile from '../visualization/Profile';
import ResponseChart from '../visualization/ResponseChart';
import type { ActiveExcitation } from '../visualization/types';
import ParameterControl from '../ui/ParameterControl';
import { learning, utilityNotes } from '../learning/content';
import { connectedPath, NetworkSequencer } from './sequencer';

const controls: { key: keyof SpanPhysicalParameters; label: string; unit: string; min: number; max: number; step: number }[] = [
  { key: 'spanLengthM', label: 'Span length', unit: 'm', min: 20, max: 1000, step: 1 },
  { key: 'modeledTensionN', label: 'Reference tension', unit: 'N', min: 500, max: 60000, step: 100 },
  { key: 'linearDensityKgPerM', label: 'Linear density', unit: 'kg/m', min: 0.05, max: 5, step: 0.01 },
  { key: 'modeledSagM', label: 'Reference sag', unit: 'm', min: 0.01, max: 30, step: 0.01 },
  { key: 'temperatureC', label: 'Temperature', unit: '°C', min: -40, max: 100, step: 1 },
  { key: 'dampingRatio', label: 'Damping', unit: 'ratio', min: 0.005, max: 0.3, step: 0.001 },
];

export default function App() {
  const [spans, setSpans] = useState<SpanFeature[]>([]);
  const [loadError, setLoadError] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<ParameterOverrides>({});
  const [learn, setLearn] = useState(false);
  const [viewMode, setViewMode] = useState<'map' | 'profile'>('map');
  const [laboratory, setLaboratory] = useState(false);
  const [mode, setMode] = useState(1);
  const [ratio, setRatio] = useState(1);
  const [amplitude, setAmplitude] = useState(0.65);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [audioError, setAudioError] = useState('');
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.18);
  const [octaveEnabled, setOctaveEnabled] = useState(false);
  const [quantized, setQuantized] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [excited, setExcited] = useState<ActiveExcitation[]>([]);
  const [lastPlayed, setLastPlayed] = useState<{ id: string; physicalHz: number; audibleHz: number; octaveShift: number; played: boolean } | null>(null);
  const [sequencePlaying, setSequencePlaying] = useState(false);
  const [sweeping, setSweeping] = useState(false);
  const [playCount, setPlayCount] = useState(0);
  const audio = useRef<SpanAudioEngine | null>(null);
  if (!audio.current) audio.current = new SpanAudioEngine();
  const sequencer = useRef<NetworkSequencer | null>(null);
  if (!sequencer.current) sequencer.current = new NetworkSequencer();
  const excitationId = useRef(0);
  const sweepTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const source = spans.find(s => s.id === selectedId);
  const span = source ? withOverrides(source, overrides) : null;
  const model = span && source ? deriveModel(span, source) : null;
  const naturalHz = model ? model.fundamentalHz * mode : 1;
  const response = span ? normalizedResponse(ratio * naturalHz, naturalHz, span.dampingRatio) * amplitude : 0;
  const presentation = model ? audiblePitch(laboratory ? naturalHz * ratio : model.fundamentalHz, octaveEnabled) : null;
  const latest = useRef({ spans, overrides, mode, ratio, amplitude, audioEnabled, muted, octaveEnabled, laboratory });
  latest.current = { spans, overrides, mode, ratio, amplitude, audioEnabled, muted, octaveEnabled, laboratory };

  useEffect(() => {
    let disposed = false;
    new BundledSpanDataSource().loadSpans().then(data => { if (!disposed) setSpans(data); }).catch(error => { if (!disposed) setLoadError(String(error)); });
    return () => { disposed = true; audio.current?.dispose(); sequencer.current?.stop(); if (sweepTimer.current) clearInterval(sweepTimer.current); };
  }, []);
  useEffect(() => { audio.current!.setVolume(volume); }, [volume]);
  useEffect(() => { audio.current!.setMuted(muted); }, [muted]);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setReducedMotion(media.matches);
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);
  useEffect(() => {
    const keyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'm' && !(event.target instanceof HTMLInputElement) && !(event.target instanceof HTMLSelectElement) && !event.ctrlKey && !event.metaKey && !event.altKey) setMuted(m => !m);
    };
    window.addEventListener('keydown', keyDown);
    return () => window.removeEventListener('keydown', keyDown);
  }, []);

  const strum = useCallback((event: StrumEvent, ratioOverride?: number) => {
    const state = latest.current;
    const original = state.spans.find(s => s.id === event.spanId); if (!original) return;
    const p = withOverrides(original, state.overrides); const physical = deriveModel(p, original);
    const currentRatio = ratioOverride ?? state.ratio;
    const physicalHz = state.laboratory ? physical.fundamentalHz * state.mode * currentRatio : physical.fundamentalHz;
    const strength = state.laboratory ? normalizedResponse(physicalHz, physical.fundamentalHz * state.mode, p.dampingRatio) * state.amplitude
      : (event.kind === 'preview' ? 0.45 : event.kind === 'strum' ? Math.min(1, 0.4 + event.velocity / 2400) : 0.7) * state.amplitude;
    const result = audio.current!.play({ spanId: p.id, physicalHz, damping: p.dampingRatio, amplitude: strength, conductorType: p.conductorType, octaveEnabled: state.octaveEnabled });
    const time = performance.now();
    setExcited(old => [...old.filter(e => time - e.timestamp < e.durationMs).slice(-23), { id: ++excitationId.current, spanId: p.id, timestamp: time, amplitude: strength, durationMs: decaySeconds(p.dampingRatio) * 1000 }]);
    if (event.kind !== 'strum') setSelectedId(p.id);
    setLastPlayed({ id: p.id, ...result });
    setPlayCount(count => count + 1);
  }, []);

  async function enableAudio() {
    try {
      await audio.current!.enable(); setAudioEnabled(true); setMuted(false); setAudioError('');
      // This button explicitly offers sound + octave lift, so the transformation is opt-in.
      setOctaveEnabled(true);
    } catch (error) { setAudioError(`Sound could not start. ${error instanceof Error ? error.message : String(error)} Visual play is still available.`); }
  }
  function preview(ratioOverride?: number) {
    if (selectedId) strum({ spanId: selectedId, crossingPosition: 0.5, velocity: 0, timestamp: performance.now(), kind: 'keyboard' }, ratioOverride);
  }
  function stopSweep() { if (sweepTimer.current) clearInterval(sweepTimer.current); sweepTimer.current = null; setSweeping(false); audio.current?.stopAll(); }
  function startSweep() {
    if (!selectedId) return;
    stopSequence(); stopSweep(); setSweeping(true); setLaboratory(true); setViewMode('profile');
    let index = 0;
    const id = selectedId;
    sweepTimer.current = setInterval(() => {
      const next = 0.3 + index / 40 * 1.4;
      setRatio(next);
      strum({ spanId: id, crossingPosition: 0.5, velocity: 0, timestamp: performance.now(), kind: 'sequence' }, next);
      index++;
      if (index > 40) { clearInterval(sweepTimer.current!); sweepTimer.current = null; setSweeping(false); }
    }, 130);
  }
  function stopSequence() { sequencer.current!.stop(); setSequencePlaying(false); audio.current!.stopAll(); }
  function startSequence() {
    stopSweep(); setLaboratory(false); setViewMode('map'); setSequencePlaying(true);
    // State commits before the first timer, so path playback always uses free-strum physics.
    latest.current = { ...latest.current, laboratory: false };
    sequencer.current!.start(connectedPath(spans), quantized, id => strum({ spanId: id, crossingPosition: 0.5, velocity: 0, timestamp: performance.now(), kind: 'sequence' }), () => setSequencePlaying(false));
  }
  function select(id: string) { if (sweeping) stopSweep(); if (sequencePlaying) stopSequence(); setSelectedId(id); }
  function changeParameter(key: keyof SpanPhysicalParameters, value: number) {
    if (!selectedId) return;
    setOverrides(old => ({ ...old, [selectedId]: { ...old[selectedId], [key]: clampParameter(key, value) } }));
  }
  function resetParameter(key: keyof SpanPhysicalParameters) {
    if (!selectedId) return;
    setOverrides(old => { const next = { ...old[selectedId] }; delete next[key]; return { ...old, [selectedId]: next }; });
  }
  function openLaboratory() { setLearn(true); setLaboratory(true); setViewMode('profile'); }
  const lastExcitedAt = excited.filter(e => e.spanId === selectedId).at(-1)?.timestamp ?? -10000;

  return <div className="app-shell">
    <header className="site-header">
      <a className="brand" href={import.meta.env.BASE_URL} aria-label="Strum the Grid home"><span className="brand-mark">≋</span><span>strum<span className="brand-light">the</span>grid<span className="brand-dot">.</span></span></a>
      <span className="header-tag">AN INTERACTIVE PHYSICS EXPERIMENT</span>
      <div className="audio-controls">
        {!audioEnabled ? <button className="sound-enable" onClick={() => void enableAudio()}>♫ Enable sound + octave lift</button> : <button className="mute-button" aria-pressed={muted} onClick={() => setMuted(m => !m)}>{muted ? '◌ Sound muted' : '♫ Sound on'} <kbd>M</kbd></button>}
        <label className="volume-control">Volume<input type="range" aria-label="Master volume" min="0" max="0.5" step="0.01" value={volume} onChange={e => setVolume(Number(e.target.value))} /></label>
      </div>
    </header>

    <main>
      <section className="intro">
        <div><div className="eyebrow"><span className="tiny-line" /> FIELD EXPERIMENT 001</div><h1>The network is<br />your <em>instrument.</em></h1><p>Strum a line. Hear its physics. Change the span<br className="desktop-break" /> and discover what makes it resonate.</p></div>
        <div className="intro-note"><span className="note-number">01 / PLAY</span><p>Drag across a power line<br />to strum it.</p><span>Mouse, touch, or keyboard. Sound is optional.</span><div className="wave-decoration" aria-hidden="true">∿∿∿</div></div>
      </section>
      {audioError && <p className="error-banner" role="alert">{audioError}</p>}
      {loadError && <p className="error-banner" role="alert">Unable to load synthetic data: {loadError}</p>}
      <section className={`workspace ${source ? 'has-selection' : ''}`} aria-label="Network instrument">
        <div className="instrument-stage">
          <div className="stage-tabs"><div><button aria-pressed={viewMode === 'map'} onClick={() => setViewMode('map')}>Network map</button><button disabled={!source} aria-pressed={viewMode === 'profile'} onClick={() => setViewMode('profile')}>Span profile</button></div><span className="stage-badge">100% SYNTHETIC DATA</span></div>
          <div className="stage-surface">
            {spans.length > 0 ? <NetworkMap spans={spans} structures={structures} selectedId={selectedId} excitations={excited} reducedMotion={reducedMotion} onStrum={strum} onSelect={select} /> : <div className="loading-state">Loading synthetic network…</div>}
            {viewMode === 'profile' && span && model && <div className="profile-overlay"><Profile lengthM={span.spanLengthM} sagM={model.sagM} mode={mode} naturalHz={naturalHz} response={response} reducedMotion={reducedMotion} excitedAt={lastExcitedAt} laboratory={laboratory} /></div>}
          </div>
          <div className="stage-bottom">
            <label className="span-picker">Explore a span<select aria-label="Select synthetic span" value={selectedId ?? ''} onChange={e => { if (e.target.value) select(e.target.value); }}><option value="">Choose a line…</option>{spans.map(s => <option key={s.id} value={s.id}>{s.id} · {s.spanLengthM.toFixed(0)} m · {s.conductorType}</option>)}</select></label>
            <div className="sequence-controls"><button disabled={!spans.length} aria-pressed={sequencePlaying} onClick={sequencePlaying ? stopSequence : startSequence}>{sequencePlaying ? '■ Stop path' : '▷ Play a path'}</button><label><input type="checkbox" checked={quantized} onChange={e => setQuantized(e.target.checked)} /> Steady timing</label></div>
          </div>
        </div>
        {source && span && model && <aside className="span-panel" aria-label="Selected span">
          <div className="panel-heading"><span className="eyebrow">02 / INSPECT THE SPAN</span><button aria-label="Close span panel" onClick={() => { stopSweep(); stopSequence(); setSelectedId(null); setViewMode('map'); setLearn(false); setLaboratory(false); }}>×</button></div>
          <h2>{source.id}</h2><p className="conductor-family">{source.conductorType}</p>
          <div className="frequency-readout"><span>PHYSICAL FUNDAMENTAL</span><b data-testid="fundamental-frequency">{model.fundamentalHz.toFixed(3)} <small>Hz</small></b><span>f₁ = 1 / (2L) · √(T / μ)</span></div>
          <div className="audible-readout"><span>{octaveEnabled ? 'AUDIBLE PRESENTATION' : 'UNSHIFTED PRESENTATION'}</span><strong>{presentation!.audibleHz.toFixed(1)} Hz</strong><small>{octaveEnabled ? `${presentation!.octaveShift >= 0 ? '+' : ''}${presentation!.octaveShift} octaves · ratios preserved` : 'Most physical tones are below hearing range.'}{laboratory ? ` · excitation of mode ${mode}` : ''}</small></div>
          <button className="play-span" onClick={() => preview()}>↯ Strum this span <kbd>Space on map</kbd></button>
          <dl className="span-facts">
            <div><dt>Length</dt><dd>{span.spanLengthM.toFixed(1)} m</dd></div><div><dt>Modeled tension</dt><dd>{(model.tensionN / 1000).toFixed(2)} kN</dd></div>
            <div><dt>Linear density</dt><dd>{span.linearDensityKgPerM.toFixed(2)} kg/m</dd></div><div><dt>Modeled sag</dt><dd>{model.sagM.toFixed(2)} m</dd></div>
            <div><dt>Temperature</dt><dd>{span.temperatureC.toFixed(0)} °C</dd></div><div><dt>Damping ratio</dt><dd>{span.dampingRatio.toFixed(3)}</dd></div>
            <div><dt>Active mode</dt><dd>{mode} · {naturalHz.toFixed(3)} Hz</dd></div><div><dt>Length source</dt><dd>{source.lengthSource === 'geometry' ? 'Geometry-derived' : 'Provided'}{overrides[source.id]?.spanLengthM !== undefined ? ' / overridden' : ''}</dd></div>
          </dl>
          <button className={`learn-toggle ${learn ? 'open' : ''}`} aria-expanded={learn} onClick={() => { setLearn(l => !l); if (learn) { stopSweep(); setLaboratory(false); } }}>Change the physics <span>{learn ? '−' : '+'}</span></button>
          {learn && <div className="learn-controls">
            <p className="help-copy">{learning.equation}</p>
            {controls.map(({ key, ...control }) => <ParameterControl key={key} {...control} value={span[key]} onChange={value => changeParameter(key, value)} onReset={() => resetParameter(key)} />)}
            <p className="help-copy">{learning.temperature} Reference tension and sag are at 20 °C.</p>
            <ParameterControl label="Excitation amplitude" unit="%" value={amplitude * 100} min={5} max={100} step={1} onChange={value => setAmplitude(value / 100)} />
            <button className="text-button" onClick={() => setOverrides(old => { const next = { ...old }; delete next[source.id]; return next; })}>↺ Reset all span parameters</button>
            <button className="lab-toggle" aria-expanded={laboratory} onClick={() => { if (laboratory) { stopSweep(); setLaboratory(false); } else openLaboratory(); }}>{laboratory ? 'Close resonance laboratory' : 'Open resonance laboratory'} <span>↗</span></button>
          </div>}
          {laboratory && <div className="laboratory" aria-label="Resonance laboratory">
            <span className="eyebrow">03 / FIND RESONANCE</span><p className="help-copy">{learning.resonance}</p>
            <div className="mode-selector" aria-label="Natural mode">{[1, 2, 3, 4].map(n => <button key={n} aria-pressed={mode === n} onClick={() => { stopSweep(); setMode(n); }}>Mode {n}</button>)}</div>
            <ResponseChart naturalHz={naturalHz} damping={span.dampingRatio} ratio={ratio} />
            <ParameterControl label="Excitation frequency" unit="Hz" value={ratio * naturalHz} min={naturalHz * 0.3} max={naturalHz * 1.7} step={naturalHz / 100} format={v => v.toFixed(3)} onChange={value => { const next = value / naturalHz; stopSweep(); setRatio(next); preview(next); }} />
            <div className="response-meter"><span>Normalized response <strong data-testid="response-value">{Math.round(response * 100)}%</strong></span><meter min="0" max="1" value={response} aria-label="Normalized response" /></div>
            <button className="sweep-button" aria-pressed={sweeping} onClick={sweeping ? stopSweep : startSweep}>{sweeping ? '■ Stop sweep' : '↔ Sweep excitation frequency'}</button>
            <p className="help-copy">Raw response is saturated to 0–1 for safe sound and display. It is not displacement in metres. The dashed marker is the selected natural mode.</p>
          </div>}
        </aside>}
      </section>

      <section className="session-strip" aria-label="Playback feedback">
        <div className="session-event" role="status" aria-live="polite"><i className={`status-dot ${playCount ? 'lit' : ''}`} /><span>{lastPlayed ? <><strong>{lastPlayed.id}</strong> · {lastPlayed.physicalHz.toFixed(3)} Hz physical {lastPlayed.octaveShift !== 0 ? `→ ${lastPlayed.audibleHz.toFixed(1)} Hz (+${lastPlayed.octaveShift} octaves)` : ''} · {lastPlayed.played ? 'sounding' : 'visual excitation'}</> : learning.play}</span></div>
        <span className="strum-count" data-testid="strum-count">{playCount} EXCITATIONS</span>
      </section>
      <div className="experience-settings"><label><input type="checkbox" checked={octaveEnabled} onChange={e => setOctaveEnabled(e.target.checked)} /> Octave lift to audible range <span>artistic</span></label><label><input type="checkbox" checked={reducedMotion} onChange={e => setReducedMotion(e.target.checked)} /> Reduced motion</label><p>{learning.interpretation}</p></div>

      <section className="field-notes" aria-label="Learning notes">
        <div className="notes-intro"><span className="eyebrow">WHY UTILITIES CARE</span><h2>Small motion.<br />Real consequences.</h2><p>A little intuition for the mechanics behind the music.</p></div>
        {utilityNotes.map((note, i) => <details key={note.title} className="note-card"><summary><span className="note-index">0{i + 1}</span><h3>{note.title}</h3><span className="expand-note">+</span></summary><p>{note.text}</p></details>)}
      </section>
      <details className="model-limitations"><summary>What is simplified? <span>Educational model</span></summary><p>{learning.simplified}</p></details>
    </main>
    <footer><span>STRUM THE GRID <span className="footer-slash">/</span> MAP → SOUND → UNDERSTANDING</span><span>Original synthetic network · No real infrastructure data</span></footer>
  </div>;
}

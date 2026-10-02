import { useEffect, useRef } from 'react';
import { modeShape, sagAt } from '../physics/model';

interface Props { lengthM: number; sagM: number; mode: number; naturalHz: number; response: number; reducedMotion: boolean; excitedAt: number; laboratory: boolean }

export default function Profile({ lengthM, sagM, mode, naturalHz, response, reducedMotion, excitedAt, laboratory }: Props) {
  const conductor = useRef<SVGPathElement>(null);
  const xAt = (x: number) => 80 + 640 * x;
  // Sag is mapped to a fixed 60 m vertical scale for legible comparative changes, then capped.
  const sagPixels = Math.min(170, sagM * 9);
  function path(phase = 0, amplitude = 0) {
    return Array.from({ length: 101 }, (_, i) => {
      const x = i / 100;
      return `${i ? 'L' : 'M'}${xAt(x)},${92 + sagAt(x, sagPixels) + amplitude * modeShape(x, mode, phase)}`;
    }).join(' ');
  }
  const pathRef = useRef(path); pathRef.current = path;
  useEffect(() => {
    let frame = 0;
    if (reducedMotion) { conductor.current?.setAttribute('d', pathRef.current()); return; }
    function animate() {
      const age = (performance.now() - excitedAt) / 1000;
      const amplitude = laboratory ? response * 22 : Math.max(0, 13 * Math.exp(-age * 1.8));
      const visualHz = Math.min(3, naturalHz);
      conductor.current?.setAttribute('d', pathRef.current(performance.now() / 1000 * 2 * Math.PI * visualHz, amplitude));
      if (laboratory || age < 4) frame = requestAnimationFrame(animate);
    }
    animate();
    return () => cancelAnimationFrame(frame);
  }, [lengthM, sagM, mode, naturalHz, response, reducedMotion, excitedAt, laboratory]);

  const nodes = Array.from({ length: mode + 1 }, (_, i) => i / mode);
  const antinodes = Array.from({ length: mode }, (_, i) => (i + 0.5) / mode);
  return <div className="profile-view">
    <div className="view-caption"><span className="eyebrow">SIDE PROFILE / MODE {mode}</span><h2>A span, seen from the side.</h2><p>Sag and vibration are exaggerated for visibility. Equal-height supports; illustrative ground plane.</p></div>
    <svg viewBox="0 0 800 370" role="img" aria-label={`Span profile, ${lengthM.toFixed(1)} metres long with ${sagM.toFixed(2)} metres of modeled sag; mode ${mode}, ${mode + 1} nodes and ${mode} antinodes.`}>
      <defs><pattern id="ground" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M0 12L12 0" stroke="#344744" strokeWidth="1" /></pattern></defs>
      <line x1="40" x2="760" y1="298" y2="298" stroke="#597168" /><rect x="40" y="299" width="720" height="20" fill="url(#ground)" />
      <text x="400" y="343" textAnchor="middle" className="svg-muted">ILLUSTRATIVE GROUND · NO CLEARANCE CALCULATION</text>
      {[80, 720].map(x => <g key={x}><path d={`M${x - 5} 298L${x - 3} 85L${x + 3} 85L${x + 5} 298Z`} fill="#5b7067" /><line x1={x - 19} x2={x + 19} y1="88" y2="88" stroke="#a8b6a4" strokeWidth="4" /></g>)}
      <line x1="80" x2="720" y1="92" y2="92" stroke="#4f665c" strokeDasharray="4 6" />
      <path d={path()} stroke="#527063" strokeWidth="2" fill="none" strokeDasharray="3 5" />
      <path ref={conductor} data-testid="profile-conductor" d={path()} stroke="#c1ed85" strokeWidth="3" fill="none" />
      <line x1="400" x2="400" y1="92" y2={92 + sagPixels} stroke="#e4c284" strokeDasharray="3 3" />
      <text x="412" y={Math.max(113, 92 + sagPixels / 2)} className="svg-accent">sag {sagM.toFixed(2)} m</text>
      <line x1="80" x2="720" y1="42" y2="42" stroke="#78937a" /><text x="400" y="31" textAnchor="middle" className="svg-accent">{lengthM.toFixed(1)} m</text>
      {laboratory && <>
        {nodes.map(x => <g key={x}><circle cx={xAt(x)} cy={92 + sagAt(x, sagPixels)} r="5" fill="#152022" stroke="#e4c284" strokeWidth="2" /><text x={xAt(x)} y="278" textAnchor="middle" className="svg-muted">N</text></g>)}
        {antinodes.map(x => <g key={x}><circle cx={xAt(x)} cy={92 + sagAt(x, sagPixels)} r={7 + response * 12} fill="#c1ed85" opacity="0.15" /><text x={xAt(x)} y="278" textAnchor="middle" className="svg-accent">A</text></g>)}
      </>}
    </svg>
    <div className="profile-key"><span>● Node: fixed point</span><span>◌ Antinode: greatest motion</span><span>Mode timing capped at 3 Hz for visibility</span></div>
    <div className="profile-readout"><span>SPAN DISTANCE <b>{lengthM.toFixed(1)} <small>m</small></b></span><span>MODELED SAG <b data-testid="profile-sag">{sagM.toFixed(2)} <small>m</small></b></span><span>RESPONSE <b>{Math.round(response * 100)} <small>% normalized</small></b></span></div>
  </div>;
}

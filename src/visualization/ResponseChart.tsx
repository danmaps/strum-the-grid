import { normalizedResponse } from '../physics/model';

export default function ResponseChart({ naturalHz, damping, ratio }: { naturalHz: number; damping: number; ratio: number }) {
  const x = (r: number) => 30 + (r - 0.3) / 1.4 * 280;
  const y = (r: number) => 110 - normalizedResponse(r * naturalHz, naturalHz, damping) * 95;
  const line = Array.from({ length: 201 }, (_, i) => { const r = 0.3 + i / 200 * 1.4; return `${i ? 'L' : 'M'}${x(r)},${y(r)}`; }).join(' ');
  return <svg className="response-chart" viewBox="0 0 340 145" role="img" aria-label={`Normalized resonance response at damping ${damping.toFixed(3)}; excitation ${ratio.toFixed(2)} times the natural frequency.`}>
    {[0, 0.5, 1].map(value => <line key={value} x1="30" x2="310" y1={110 - value * 95} y2={110 - value * 95} stroke="#344340" strokeDasharray="3 4" />)}
    <path d={`${line}L310,110L30,110Z`} fill="#c1ed8514" />
    <path d={line} fill="none" stroke="#c1ed85" strokeWidth="2" />
    <line x1={x(1)} x2={x(1)} y1="10" y2="110" stroke="#78937a" strokeDasharray="3 4" />
    <line x1={x(ratio)} x2={x(ratio)} y1="10" y2="110" stroke="#e4c284" />
    <circle cx={x(ratio)} cy={y(ratio)} r="4" fill="#e4c284" />
    <text x="30" y="134" className="svg-muted">0.3×</text><text x={x(1)} y="134" textAnchor="middle" className="svg-accent">fₙ</text><text x="310" y="134" textAnchor="end" className="svg-muted">1.7×</text>
  </svg>;
}

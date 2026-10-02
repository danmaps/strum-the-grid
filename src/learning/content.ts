export const learning = {
  play: 'Drag across a power line to strum it. Tap a line to inspect it, or choose a span below and press Space to play.',
  equation: 'Longer spans sound lower. More tension raises the frequency; more mass per metre lowers it. The ideal string model ties those changes together.',
  resonance: 'A natural mode is a pattern the span prefers. Nodes stay still; antinodes move most. Excitation near a natural frequency builds a larger response. Damping lowers and broadens the peak.',
  temperature: 'Educational temperature curve: warmer conductors have lower modeled tension and more sag. This configurable demonstration is not a sag–tension solver.',
  interpretation: 'Octave lift preserves frequency ratios while moving very low physical tones into hearing range. Timbre is an artistic choice; it does not change the calculated pitch.',
  simplified: 'This uses an ideal flexible string with fixed, equal-height supports, integer harmonics, and a parabolic sag profile. It omits bending stiffness, strand construction, non-ideal supports, hardware and dampers, wind forcing, thermal compatibility, creep, nonlinear motion, and the complexity of real aeolian vibration and galloping. Displacement is exaggerated. Educational model; not for design, clearance compliance, failure prediction, or asset-health assessment.',
};
export const utilityNotes = [
  { title: 'Wind & vibration', text: 'Aeolian vibration is relatively small, higher-frequency motion associated with wind. Galloping involves much larger, lower-frequency motion, often affected by ice and wind. This demo models neither forcing process.' },
  { title: 'Damping & fatigue', text: 'Repeated conductor motion can fatigue strands and interact with attachment hardware. Dampers dissipate vibration energy. Here, a single damping ratio illustrates that general idea.' },
  { title: 'Sag & clearance', text: 'Temperature, load, and conductor properties affect sag. Real clearance work needs validated geometry, terrain, conditions, and engineering methods beyond this illustration.' },
];

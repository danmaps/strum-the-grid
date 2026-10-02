# Educational span model

All computation is deterministic and independent of React, ArcGIS, and Web Audio. Inputs are metres, newtons, kilograms per metre, degrees Celsius, and dimensionless damping. Frequencies are hertz.

- Ideal fundamental: `f1 = sqrt(T / mu) / (2 L)`. A flexible, straight string with fixed ends; no stiffness or distributed hardware.
- Integer modes: `fn = n f1`.
- Parabolic equal-height-support profile: downward sag `4 sag x (1-x)`, where `x` is normalized position. The renderer scales this geometry and labels it as exaggerated.
- Temperature demo: reference tension is at 20 °C. Tension scales by `clamp(1 - 0.0035 (temperature-20), 0.35, 1.25)`. The coefficient and reference temperature are configurable. Sag scales with squared length, density, and inverse effective tension relative to the original span. This is **not** a compatible thermal expansion or sag–tension solution.
- Damped response: `1 / hypot(1-r², 2 zeta r)`. Visual/audio normalization `raw / (raw + 4)` preserves the damping dependence while bounding excitation. User amplitude further scales that response. No response is interpreted as actual displacement in metres.
- Fixed-end transverse mode: `sin(n pi x) cos(phase)`. Profile timing uses the selected physical mode frequency, capped at 3 Hz for visibility, and amplitude is exaggerated. Nodes and antinodes are placed at the analytic mode positions. Map motion/glow is an artistic excitation cue rather than a physical oscillation measurement.

Public functions reject nonfinite, zero, negative, and out-of-domain inputs as appropriate. Slider clamping is explicit and uses broad demonstration bounds, not engineering limits. Source features remain immutable; overrides are merged into a new object.

Not modeled: sagging-string eigenfrequencies, bending stiffness, strand construction, unequal/non-ideal supports, hardware, damper placement, environmental wind forcing, thermal compatibility, creep, nonlinear vibration, aeolian excitation, or galloping. No outputs support engineering design, asset-health or failure prediction, or clearance compliance.

The audio domain consumes these results rather than repeating equations. Opt-in octave lift multiplies by powers of two into 110–880 Hz. Timbre weights and bounded damping-to-decay mapping are explicitly artistic choices.

# MVP acceptance map

This implementation covers the local, deployable behavior requested in issues #1–#12. Live hosting depends on enabling GitHub Pages and publishing these changes; real-device and cross-browser evaluation remains a separate validation step.

| Issue | Behavior and evidence |
| --- | --- |
| #1 Foundation | Vite/React/TypeScript shell; actual ArcGIS view; domain directories; lint/typecheck/unit/build/browser scripts; gated CI and Pages workflow. |
| #2 Data | 39 original synthetic GeoJSON spans / 40 supports, runtime validation and isolated bundled adapter, explicit length source; data tests and provenance README. |
| #3 Physics | SI-unit pure string/mode/resonance/sag functions, configurable bounded temperature demo, invalid-input checks, analytic/scaling/peak/bandwidth tests. |
| #4 Gestures | Screen-segment intersections, per-gesture deduplication, crossing order/position/velocity/timestamp, pointer mouse/pen/touch, tap/pan selection, keyboard events. |
| #5 Audio | Gesture-only AudioContext, physical-frequency handoff, partials and damping envelopes, 12 voices, fade stealing and decay cleanup, compression/mute/volume, disclosed opt-in octave shift; abstracted audio tests. |
| #6 Map animation | SVG projected on actual ArcGIS screen coordinates, concurrent decaying excited spans, immutable base geometry, frame work outside React, static reduced-motion feedback. |
| #7 Learning | Compact source/model/derived card, live bounded controls, per-span immutable overrides, individual/all resets, equation and octave metadata; state integration and browser tests. |
| #8 Profile | Independent SVG equal-height supports, parabolic sag, illustrative ground, live dimensions and exaggerated transverse motion, reduced-motion geometry. |
| #9 Resonance | Modes 1–4, analytic nodes/antinodes, excitation slider and sweep, damped response graphic, saturated amplitude for safe sound/display, muted/reduced-motion readouts. |
| #10 Content | Dedicated progressively disclosed learning content; discoverable utility notes and model limitations, no design/health/clearance predictions. |
| #11 Instrument | Deterministic connected nonrepeating path, cancellable timer, artistic family partial balance, opt-in steady timing/octave lift, simultaneous visual/audio events. |
| #12 Hardening | Responsive UI, first-action onboarding, desktop and touch browser paths, keyboard/volume/mute/reduced motion, locally hosted assets/fonts, gated static deployment, hosted browser verification and data provenance. |

## Verification scope

Local verification: TypeScript typecheck, ESLint, all 29 tests in six unit/integration suites, production build, and four desktop/mobile Chromium end-to-end scenarios pass. npm dependency audit reports zero vulnerabilities. Browser runs check the compiled static output rather than depending on development-server behavior. [Remote quality checks passed for the MVP](https://github.com/danmaps/strum-the-grid/actions/runs/37065892382); live hosting remains pending the repository's Pages eligibility.

- Unit/integration suites test physical laws and responses, data/adapter contracts, immutable experiments, gesture ordering, Web Audio handoff/voice management, and cancellation/connectivity of sequencing.
- End-to-end suites exercise actual ArcGIS rendering on desktop Chromium and touch-capable mobile Chromium emulation. They cover enable audio, map selection and strum, tension/frequency/sag changes, four-mode resonance, silent/reduced-motion use, keyboard play and stoppable sequencing, while checking no uncaught errors/external requests or mobile horizontal overflow.
- Map animation visits current displayed paths and applies motion only to a bounded recent-excitation set (24 retained events). It schedules no new frame after decay. Audio is capped at 12 active voices (4 partials each); sequence/sweep own cancellable timers. Geometry projection updates with view extent/size, not React audio-rate renders.
- The full demo contains 39 spans. Larger networks, low-end physical phones, pen hardware, Firefox/Safari, and engineering validation are not represented by Chromium emulation or by this educational dataset.
- No real-data adapter is implemented. Bundled geography is invented; SDK assets and dependencies are build inputs rather than utility records.
- Production publishing is gated on quality checks and browser tests. After publishing, the deployment workflow runs the same four scenarios against the actual Pages URL, including HTTP asset failures and unexpected external requests. `PLAYWRIGHT_BASE_URL` also allows repeatable checks against an existing deployment without starting a local server.
- Pages setup returned HTTP 422: the current plan does not support Pages for this private repository. Publishing and the README demo URL require either public repository visibility or a compatible plan. No live deployment is claimed until hosted verification passes.

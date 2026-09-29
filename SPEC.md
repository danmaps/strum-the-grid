# Strum the Grid — Product and Technical Specification

## 1. Summary

Strum the Grid is a browser-based interactive map and physics experiment that turns overhead electric conductor spans into playable strings.

A user can move through a mapped electric network, select or drag across conductor spans, and hear each span ring with a synthesized tone derived from its modeled physical properties. The same interaction teaches why span length, tension, conductor mass, sag, temperature, damping, and excitation frequency matter to real overhead infrastructure.

The product should feel like an instrument first and a technical explainer second. A curious user should be able to make sound immediately, then progressively reveal the engineering model behind what they are hearing.

The central design rule is:

> The sound is generated from the modeled physics of the span, not from an arbitrary mapping of spans to musical notes.

The experience should support a safe synthetic demonstration dataset by default and preserve a clean adapter boundary for authorized infrastructure data later.

---

## 2. Product goals

### Primary goals

1. Make overhead conductor mechanics intuitive through sound and interaction.
2. Let users hear the effect of span length, tension, linear mass density, temperature, and sag.
3. Visualize fundamental modes, harmonics, nodes, antinodes, and resonance.
4. Make a geographic electric network feel like an instrument without losing the physical meaning of the data.
5. Demonstrate a strong intersection of GIS, utility engineering, browser audio, simulation, and interactive visualization.
6. Create an architecture that can run entirely from synthetic data but can later accept authorized real span data through a replaceable data adapter.

### Secondary goals

- Teach the distinction between a simple ideal-string model and real overhead conductor behavior.
- Connect musical intuition to aeolian vibration, galloping, damping, fatigue, sag, clearance, and hardware.
- Support both free exploration and guided educational scenes.
- Make the project compelling as a standalone web demo and portfolio piece.

---

## 3. Non-goals

The first release is not intended to:

- perform production engineering calculations;
- replace sag-tension software or utility design standards;
- predict conductor failure, clearance compliance, structural loading, or asset health;
- expose proprietary SCE datasets or operationally sensitive infrastructure details;
- provide a high-fidelity finite-element conductor model;
- simulate full electromechanical power-system behavior;
- reproduce audible real-world conductor sound recordings;
- provide authoritative design recommendations.

The UI must clearly present the physics as an educational model.

---

## 4. Audience

### Primary

- utility employees and technically curious users;
- GIS practitioners;
- engineering students;
- people interested in infrastructure, physics, maps, and generative audio.

### Secondary

- educators and STEM outreach audiences;
- hiring managers evaluating GIS/software/interactive visualization work;
- utility training teams exploring interactive educational tools.

---

## 5. Core user experience

### 5.1 Landing state

The app opens to a clean map containing a synthetic overhead network. A brief prompt communicates one action:

**Drag across a power line to strum it.**

No engineering panel is shown initially.

### 5.2 Strumming

A pointer, mouse, pen, or touch gesture crossing a conductor span excites that span.

The span should:

1. visually displace or shimmer;
2. emit a synthesized tone;
3. decay naturally;
4. optionally illuminate a compact spectrum indicator;
5. remain geographically anchored while the vibration is visually exaggerated.

Dragging across multiple spans creates a sequence or chord-like texture.

### 5.3 Selection

Clicking or tapping a span selects it and reveals a compact information card:

- span length;
- conductor family/type;
- modeled tension;
- linear mass density;
- modeled sag;
- temperature;
- estimated fundamental frequency;
- currently emphasized harmonic/mode.

### 5.4 Learn mode

A user may expand the span card into a learning panel. The panel exposes interactive controls for:

- span length;
- horizontal tension;
- conductor linear density;
- temperature;
- damping;
- excitation frequency;
- excitation amplitude.

Changing a parameter immediately updates:

- the frequency estimate;
- the synthesized sound;
- the side-profile sag visualization;
- the resonance response visualization.

### 5.5 Side-profile engineering view

A selected span can transition from plan/map view into a side-profile view showing:

- two structures/support points;
- span distance;
- exaggerated sag curve;
- clearance reference plane or ground profile;
- animated conductor displacement;
- nodes and antinodes for the selected mode;
- key dimensions and model parameters.

This view is explanatory, not a design drawing.

### 5.6 Resonance sweep

The user can sweep an excitation frequency across a range. When excitation approaches a natural mode, the visual response increases according to the simplified damped-response model.

The app should make resonance perceptible in three channels:

- sound;
- amplitude of conductor animation;
- spectrum/response visualization.

### 5.7 Network instrument mode

After the core single-span experience works, the map can become a geographic instrument:

- swipe across adjacent spans to play a sequence;
- autoplay along a path or circuit-like synthetic route;
- map conductor families to timbre while preserving physically derived pitch;
- optionally quantize playback timing, but never quantize the physical frequency unless the user explicitly enables a musical interpretation mode.

---

## 6. Learning objectives

A successful session should leave the user with an intuitive understanding that:

1. longer spans tend to have lower fundamental frequencies when other properties are held constant;
2. greater tension tends to raise natural frequencies;
3. greater mass per unit length tends to lower natural frequencies;
4. real overhead conductors sag and are not ideal straight strings;
5. conductors possess multiple natural modes and harmonic-like behavior;
6. excitation near a natural frequency can create a larger response;
7. damping reduces and broadens resonant response;
8. utility engineers care about vibration because repeated motion can interact with hardware, fatigue, clearances, and environmental forcing;
9. the ideal vibrating-string equation is a useful intuition-building approximation, not a complete conductor model.

---

## 7. Physics model

### 7.1 Baseline ideal-string model

The first implementation uses the ideal stretched-string approximation:

\[
f_1 = \frac{1}{2L}\sqrt{\frac{T}{\mu}}
\]

where:

- \(f_1\) = fundamental frequency;
- \(L\) = effective span length;
- \(T\) = modeled tension;
- \(\mu\) = mass per unit length.

Higher idealized modes are:

\[
f_n = n f_1
\]

for integer mode number \(n\).

This is the educational core because the dependencies are immediately understandable and audible.

### 7.2 Sag model

For visualization, the conductor profile should use a catenary or a documented parabolic approximation. The first release does not need a full temperature-dependent sag-tension solver.

The implementation must keep the sag model modular so a more realistic model can be substituted later.

### 7.3 Temperature relationship

Temperature should affect the model through an intentionally simplified educational relationship, such as changing modeled tension and sag according to a configurable demonstration curve.

The UI must label this as a simplified relationship unless a validated sag-tension implementation is introduced later.

### 7.4 Damped resonance model

A normalized damped harmonic oscillator response is sufficient for the first resonance sweep:

\[
A(r) \propto \frac{1}{\sqrt{(1-r^2)^2 + (2\zeta r)^2}}
\]

where:

- \(r = f/f_n\) is excitation frequency relative to a selected natural mode;
- \(\zeta\) is the damping ratio.

The model is used to teach resonance behavior, not to estimate actual conductor displacement.

### 7.5 Visual mode shape

For mode \(n\), the idealized transverse displacement along normalized span position \(x\) can begin with:

\[
y(x,t) = A\sin(n\pi x)\cos(2\pi f_n t)
\]

The renderer may exaggerate amplitude heavily for visibility.

### 7.6 Model honesty

The app should include an accessible “What is simplified?” explanation covering at least:

- sagging geometry;
- distributed stiffness;
- strand construction;
- non-ideal support conditions;
- hardware and dampers;
- wind forcing;
- temperature and creep;
- non-linear motion;
- real aeolian vibration and galloping behavior.

No UI language should imply that the browser model is suitable for engineering design.

---

## 8. Audio model

### 8.1 Web Audio architecture

Use the Web Audio API with a small synthesis layer.

Each strum should create a voice derived from the selected span’s physical model.

A first-pass voice may include:

- oscillator partials at \(f_n\);
- decreasing harmonic amplitudes;
- amplitude envelope;
- optional filtered noise transient for the pluck/strum attack;
- damping-derived decay time;
- soft limiting/compression at the master bus.

### 8.2 Frequency mapping

The physically computed frequency is the source frequency.

If a physical fundamental falls below or above a comfortable audible range, the synthesizer may shift it by octaves for presentation while preserving the frequency ratio. The UI must reveal that an audible octave shift has occurred.

### 8.3 Timbre

Timbre may reflect conductor class or material family, but timbre must remain a presentation choice distinct from the physical pitch model.

Example conceptual mapping:

- heavier conductor family: darker partial balance;
- lighter conductor family: brighter partial balance;
- transmission-scale span: longer decay/low spectral emphasis;
- distribution-scale span: shorter, brighter response.

These mappings are artistic and should be documented as such.

### 8.4 Polyphony

The engine should support multiple simultaneously ringing spans, with a practical voice limit and graceful voice stealing.

### 8.5 Audio safety and usability

- audio starts only after user gesture;
- master volume is always available;
- default volume is conservative;
- no sudden high-amplitude resonance spike is allowed;
- respect browser autoplay constraints;
- provide a mute control and keyboard shortcut.

---

## 9. GIS and data model

### 9.1 Default dataset

The default repository dataset must be synthetic or deliberately de-identified.

No proprietary SCE geometry, identifiers, attributes, service URLs, credentials, screenshots containing sensitive operational information, or internal metadata may be committed.

### 9.2 Span feature schema

A normalized span feature should include at least:

```ts
interface SpanFeature {
  id: string;
  geometry: GeoJSON.LineString;
  fromStructureId: string;
  toStructureId: string;
  spanLengthM: number;
  conductorType: string;
  linearDensityKgPerM: number;
  modeledTensionN: number;
  modeledSagM: number;
  temperatureC: number;
  dampingRatio: number;
  displayClass: "distribution" | "transmission" | "secondary" | "demo";
  source: "synthetic" | "authorized-adapter";
}
```

Derived values such as frequency should normally be calculated in the application rather than stored.

### 9.3 Structures

Support structures may be a separate point layer with minimal display attributes. The initial experience does not need detailed equipment modeling.

### 9.4 Data adapter boundary

Define an interface such as:

```ts
interface SpanDataSource {
  loadSpans(extent?: ExtentLike): Promise<SpanFeature[]>;
  getSpan(id: string): Promise<SpanFeature | null>;
}
```

The default implementation loads bundled synthetic GeoJSON.

An authorized ArcGIS feature-service adapter may be introduced later without changing the simulation and audio domains.

### 9.5 Geometry-derived span length

The system should support both provided engineering span length and geometry-derived length. If both exist, the UI should make the chosen source explicit. Synthetic data should be internally consistent.

---

## 10. Map and visual design

### 10.1 Map technology

Use the ArcGIS Maps SDK for JavaScript for map rendering and GIS interaction.

Recommended application stack:

- TypeScript;
- React;
- Vite;
- ArcGIS Maps SDK for JavaScript;
- Web Audio API;
- lightweight state management only if necessary.

### 10.2 Visual style

The interface should feel more like an experimental musical instrument than an enterprise GIS application.

Principles:

- dark or neutral basemap treatment;
- electric network is visually dominant;
- restrained controls;
- selected/vibrating spans glow or distort subtly;
- educational annotations appear only when requested;
- animation communicates wave behavior without pretending displacement is to scale.

### 10.3 Conductor animation

The map-view animation can begin with a visual overlay rather than literal modification of the base GIS geometry.

Potential approaches:

- custom WebGL overlay;
- animated polyline symbol/graphics layer;
- canvas/SVG overlay synchronized with screen coordinates.

The implementation should favor clarity and maintainability over premature shader complexity.

### 10.4 Side profile

The side-profile renderer should be separated from the map renderer. SVG or Canvas is sufficient for the initial implementation.

---

## 11. Application architecture

Recommended domain separation:

```text
src/
  app/
  map/
  data/
  physics/
  audio/
  visualization/
  learning/
  ui/
  test/
```

### 11.1 Physics domain

Pure functions only where practical:

- fundamental frequency;
- modal frequencies;
- resonance response;
- sag profile calculation;
- temperature demonstration relationship;
- input validation and clamping.

The physics layer must not depend on React, ArcGIS, or Web Audio.

### 11.2 Audio domain

Consumes normalized simulation output and owns:

- AudioContext lifecycle;
- span voice creation;
- envelope and partials;
- voice limit;
- master gain;
- mute state.

### 11.3 Map domain

Owns:

- ArcGIS map/view lifecycle;
- span rendering;
- hit testing;
- pointer/gesture-to-span intersection;
- selected feature state integration;
- map animation overlay integration.

### 11.4 Data domain

Owns:

- schema validation;
- synthetic dataset loading;
- data-source adapters;
- normalization from provider-specific attributes into `SpanFeature`.

### 11.5 Learning domain

Owns educational copy and guided states so technical explanations do not become scattered through UI components.

---

## 12. Interaction details

### Strum gesture

The primary gesture is a pointer path crossing a span.

The interaction system should estimate:

- which span was crossed;
- crossing position along the span;
- gesture velocity;
- optional gesture direction.

Gesture velocity may affect excitation amplitude. Crossing position may influence modal partial balance, since a pluck near a node should conceptually suppress certain modes. This is an enhancement, not required for the first playable milestone.

### Direct click/tap

Clicking a span should both select it and produce a gentle preview tone unless the user has muted audio.

### Keyboard accessibility

A selected span should be playable by keyboard. Parameter controls must be fully keyboard operable.

---

## 13. State model

At minimum:

```ts
interface AppState {
  selectedSpanId: string | null;
  mode: "play" | "learn";
  viewMode: "map" | "profile";
  audioEnabled: boolean;
  masterVolume: number;
  activeExcitations: ActiveExcitation[];
  parameterOverrides: Record<string, Partial<SpanPhysicalParameters>>;
}
```

Do not mutate the source feature merely because the user moves a learning slider. Parameter overrides should remain separate from source data.

---

## 14. Educational content structure

Use progressive disclosure.

### Level 0: Play

“Strum a line.”

### Level 1: Why did it sound like that?

Show length, tension, mass, and the frequency equation.

### Level 2: Change the span

Interactive sliders and immediate feedback.

### Level 3: Find resonance

Frequency sweep, nodes, antinodes, damping.

### Level 4: Why utilities care

Short explainers for:

- aeolian vibration;
- galloping;
- dampers;
- fatigue;
- sag and clearance;
- wind and temperature.

Keep each explanation concise and explicitly separate simplified simulation behavior from real engineering analysis.

---

## 15. Accessibility

The project must not rely on sound alone.

Provide:

- visual feedback for every audible event;
- textual frequency and parameter values;
- keyboard span playback;
- reduced-motion mode;
- sufficient contrast;
- captions/labels for guided explanations;
- a silent mode that preserves the educational visualization.

Users with hearing impairments should still be able to understand resonance through amplitude and spectrum graphics.

---

## 16. Performance targets

Initial targets on a modern desktop browser:

- interactive map at 60 fps under normal navigation;
- strum-to-audio response subjectively immediate, targeting <50 ms after gesture processing where browser audio conditions allow;
- hundreds of displayed synthetic spans without requiring all spans to animate simultaneously;
- no React render loop tied directly to audio-rate or frame-rate simulation;
- active animation limited to selected or recently excited spans;
- lazy creation of expensive visual/audio resources.

Mobile support should be designed from the start, even if desktop receives the first polish pass.

---

## 17. Testing strategy

### Unit tests

Required for pure physics functions:

- frequency scales inversely with span length;
- frequency scales with square root of tension;
- frequency scales inversely with square root of linear density;
- modal frequencies are integer multiples in ideal mode;
- resonance response peaks near the selected natural mode;
- damping reduces peak response;
- invalid input is rejected or clamped intentionally.

### Data tests

Validate synthetic spans against the schema and ensure values remain within plausible demonstration bounds.

### Integration tests

Test:

- selecting a span updates the UI;
- strumming triggers an excitation event;
- audio engine receives the expected physical frequency;
- learn-mode overrides do not mutate source data;
- profile view reflects parameter changes.

### Browser tests

At least one end-to-end path should cover:

1. app loads;
2. user enables audio;
3. user selects/strums a span;
4. learning panel opens;
5. tension changes;
6. displayed frequency changes in the expected direction;
7. resonance view can be opened;
8. no uncaught errors occur.

---

## 18. Deployment

The app should be deployable as a static Vite build.

Preferred deployment characteristics:

- no backend required for the default synthetic experience;
- CI builds and tests on pull requests;
- production deploy from `main`;
- environment variables used only for optional provider configuration;
- no secrets bundled into the client.

A GitHub Pages, Netlify, or equivalent static deployment is sufficient.

---

## 19. Telemetry and privacy

Telemetry is optional and should be omitted from the first implementation unless needed.

If introduced later, collect only coarse product usage such as:

- app opened;
- first strum completed;
- learn mode opened;
- resonance sweep used.

Do not log infrastructure feature identifiers from authorized datasets.

---

## 20. Milestones

### Milestone 0 — Foundation

**Goal:** establish a reliable app shell and domain boundaries before building interaction.

Deliverables:

- Vite + React + TypeScript application;
- ArcGIS map renders;
- test runner and lint/typecheck scripts;
- CI workflow;
- source-directory boundaries for data, physics, audio, map, visualization, and UI;
- synthetic data policy documented.

**Exit condition:** a tested deployable empty map app exists and CI is green.

### Milestone 1 — Physical span model

**Goal:** make a span a trustworthy simulation object independent of the UI.

Deliverables:

- `SpanFeature` schema;
- synthetic span dataset;
- ideal-string frequency functions;
- modal frequency calculation;
- damped resonance-response function;
- sag profile function;
- parameter validation;
- unit tests.

**Exit condition:** a synthetic span can be loaded and all primary physical outputs can be calculated deterministically with tests.

### Milestone 2 — First playable map

**Goal:** make the map behave like an instrument.

Deliverables:

- mapped synthetic spans;
- span hit testing and selection;
- pointer/touch strum detection;
- Web Audio engine;
- physically derived pitch;
- polyphonic decay;
- visible vibration/excitation feedback;
- master mute/volume.

**Exit condition:** a user can drag across several spans and immediately hear/see distinct physically derived responses.

### Milestone 3 — Learn by changing the span

**Goal:** turn the musical toy into an interactive physics explainer.

Deliverables:

- selected-span panel;
- frequency equation and parameter display;
- live controls for length, tension, density, temperature, and damping;
- parameter override state;
- map feedback for changed values;
- side-profile sag view;
- reset-to-source behavior.

**Exit condition:** changing a physical parameter produces coherent visual and audible changes without modifying source data.

### Milestone 4 — Resonance laboratory

**Goal:** make harmonics and resonance visually and audibly obvious.

Deliverables:

- mode selector;
- node/antinode visualization;
- excitation-frequency sweep;
- damped resonance response;
- spectrum/response graphic;
- safe amplitude normalization;
- concise “why utilities care” explanations.

**Exit condition:** a user can find a resonant mode and explain why the response changes as the excitation frequency approaches it.

### Milestone 5 — Geographic instrument

**Goal:** make the network itself musically expressive.

Deliverables:

- multi-span swipe behavior refinement;
- path/circuit-like autoplay over synthetic spans;
- conductor-family timbre system;
- optional musical interpretation controls such as timing quantization or octave normalization;
- clear distinction between physical frequency and artistic audio transformations.

**Exit condition:** the synthetic network can be intentionally played as a geographic instrument while preserving the educational model.

### Milestone 6 — Public demo hardening

**Goal:** make the project polished, safe, accessible, and easy to share.

Deliverables:

- onboarding;
- reduced-motion and silent modes;
- keyboard support;
- mobile interaction refinement;
- browser tests;
- performance pass;
- data-safety review;
- model-limitations copy;
- production deployment;
- README screenshots/demo instructions.

**Exit condition:** a new user can open the public demo, understand the interaction without guidance, and complete the primary learning path on desktop or mobile.

---

## 21. Planned issue sequence

The initial issue backlog should follow the milestone order and preserve clear dependency boundaries:

1. **M0:** Scaffold the application, architecture, quality checks, and CI.
2. **M1:** Define the span schema and build the synthetic demonstration network.
3. **M1:** Implement and test the physics core.
4. **M2:** Render spans and implement selection/strum gesture detection.
5. **M2:** Build the Web Audio span synthesizer and polyphonic playback.
6. **M2:** Add animated map feedback for excited spans.
7. **M3:** Build the selected-span learning panel and parameter override system.
8. **M3:** Build the side-profile sag and vibration visualization.
9. **M4:** Build the resonance laboratory and harmonic-mode visualization.
10. **M4:** Add the progressive educational content and model-limitations explanations.
11. **M5:** Add geographic-instrument sequencing and conductor timbres.
12. **M6:** Harden accessibility, mobile behavior, browser tests, performance, and deployment.

Each issue should be independently understandable by an implementation agent and include dependencies, acceptance criteria, and explicit non-goals.

---

## 22. Definition of done for implementation issues

An implementation issue is complete only when:

- requested behavior exists;
- relevant tests pass;
- TypeScript typecheck passes;
- linting passes;
- no proprietary or sensitive infrastructure data has been introduced;
- new user-facing behavior is keyboard accessible where applicable;
- assumptions and simplifications are documented near the relevant domain code or UI;
- acceptance criteria in the issue are demonstrably satisfied.

---

## 23. Future extensions

These are explicitly outside the initial milestone plan but should remain possible:

- authorized ArcGIS feature-service adapter;
- more realistic sag-tension calculation;
- wind-driven excitation demonstrations;
- aeolian vibration and galloping scenario presets;
- damper placement visualization;
- conductor bundle visualization;
- 3D scene mode;
- MIDI input/output;
- recording and looping network performances;
- sonification of time-varying temperature or wind data;
- classroom lesson mode;
- comparison of conductor families;
- spatial composition tools that let a user “play” a route through a network.

---

## 24. Product success criterion

The experiment succeeds if a first-time user can strum a mapped conductor span, hear and see it respond, change one physical property, correctly anticipate the direction of the resulting pitch change, and then discover a resonant mode through direct interaction.

That single loop captures the project: **map → touch infrastructure → hear physics → change physics → understand resonance.**

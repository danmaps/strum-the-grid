# Strum the Grid

**Strum the Grid** is an interactive map experiment that turns overhead conductor spans into playable strings.

Users can strum mapped spans, hear a synthesized tone derived from span physics, and explore how span length, tension, conductor mass, temperature, sag, and resonance affect vibration. The project uses music as an intuitive entry point into the mechanics of overhead electric infrastructure.

The experience is intended to work both as a playful instrument and as an educational visualization of concepts such as fundamental frequency, harmonics, standing waves, aeolian vibration, galloping, damping, sag, and clearance.

## Status

Planning only. No implementation has started.

See [SPEC.md](./SPEC.md) for the product and technical specification.

## Core principle

The sound should come from the modeled physical properties of the span rather than arbitrary musical note assignments.

## Data safety

No proprietary SCE data, credentials, internal service URLs, or sensitive infrastructure details should be committed to this repository. The default experience must run from synthetic or deliberately de-identified demonstration data. An optional adapter boundary may support authorized internal data later without changing the public-facing core.

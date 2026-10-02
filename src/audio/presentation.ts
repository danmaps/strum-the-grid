/** Octave shifting is a disclosed artistic transform. It is enabled explicitly by the user. */
export function audiblePitch(physicalHz: number, octaveEnabled: boolean) {
  if (!Number.isFinite(physicalHz) || physicalHz <= 0) throw new RangeError('Invalid physical pitch');
  let octaveShift = 0;
  if (octaveEnabled) {
    while (physicalHz * 2 ** octaveShift < 110) octaveShift++;
    while (physicalHz * 2 ** octaveShift > 880) octaveShift--;
  }
  return { physicalHz, audibleHz: physicalHz * 2 ** octaveShift, octaveShift };
}
export function decaySeconds(damping: number): number { return Math.max(0.25, Math.min(4, 0.12 / damping)); }
export function harmonicWeights(family: string): number[] {
  // Spectral color is artistic, separate from pitch: all partials remain integer multiples.
  if (family.includes('heavy')) return [1, 0.28, 0.13, 0.07];
  if (family.includes('reinforced')) return [1, 0.42, 0.21, 0.1];
  return [1, 0.58, 0.33, 0.19];
}

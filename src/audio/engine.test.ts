import { describe, expect, it, vi } from 'vitest';
import { SpanAudioEngine } from './engine';
import { audiblePitch, decaySeconds, harmonicWeights } from './presentation';
import { deriveModel } from '../physics/model';
import { syntheticSpans } from '../data/synthetic';

function fakeContext() {
  const param = () => ({ value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), setTargetAtTime: vi.fn(), cancelScheduledValues: vi.fn() });
  const oscillators: { frequency: ReturnType<typeof param>; onended: (() => void) | null; start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn>; connect: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }[] = [];
  const gains: { gain: ReturnType<typeof param>; connect: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }[] = [];
  const context = {
    state: 'running', currentTime: 1, sampleRate: 48000, destination: {}, resume: vi.fn(), close: vi.fn(),
    createGain: () => { const gain = { gain: param(), connect: vi.fn(), disconnect: vi.fn() }; gains.push(gain); return gain; },
    createDynamicsCompressor: () => ({ threshold: param(), knee: param(), ratio: param(), attack: param(), release: param(), connect: vi.fn(), disconnect: vi.fn() }),
    createOscillator: () => { const osc = { frequency: param(), onended: null as (() => void) | null, start: vi.fn(), stop: vi.fn(), connect: vi.fn(), disconnect: vi.fn() }; oscillators.push(osc); return osc; },
  };
  return { context: context as unknown as AudioContext, oscillators, gains };
}
describe('physics handoff and artistic presentation', () => {
  it('octave transform is opt-in, power-of-two only, and disclosed', () => {
    expect(audiblePitch(0.5, false)).toEqual({ physicalHz: 0.5, audibleHz: 0.5, octaveShift: 0 });
    const shifted = audiblePitch(0.5, true); expect(shifted.audibleHz).toBe(128); expect(shifted.octaveShift).toBe(8);
    expect(audiblePitch(2000, true).audibleHz).toBe(500); expect(() => audiblePitch(0, true)).toThrow();
    expect(harmonicWeights('Bundled · heavy')).not.toEqual(harmonicWeights('Aluminum · light'));
    expect(decaySeconds(0.005)).toBe(4); expect(decaySeconds(0.5)).toBe(0.25);
  });
  it('creates no context before enable and sends the calculated pitch to the oscillators', async () => {
    const fake = fakeContext(); const factory = vi.fn(() => fake.context); const audio = new SpanAudioEngine(factory);
    const p = syntheticSpans[0]; const physicalHz = deriveModel(p).fundamentalHz;
    const input = { spanId: p.id, physicalHz, damping: p.dampingRatio, amplitude: 0.7, conductorType: p.conductorType, octaveEnabled: true };
    expect(audio.play(input).played).toBe(false); expect(factory).not.toHaveBeenCalled();
    await audio.enable(); const result = audio.play(input);
    expect(result.physicalHz).toBe(physicalHz); expect(fake.oscillators.map(o => o.frequency.value)).toEqual([1, 2, 3, 4].map(n => result.audibleHz * n));
    expect(audio.activeVoiceCount).toBe(1); fake.oscillators.forEach(o => o.onended?.()); expect(audio.activeVoiceCount).toBe(0);
  });
  it('limits polyphony, safely steals voices, and propagates mute and gain', async () => {
    const fake = fakeContext(); const audio = new SpanAudioEngine(() => fake.context); await audio.enable();
    const input = { spanId: 'test', physicalHz: 200, damping: 0.03, amplitude: 100, conductorType: 'light', octaveEnabled: false };
    for (let i = 0; i < 30; i++) audio.play(input);
    expect(audio.activeVoiceCount).toBe(audio.maxVoices);
    expect(fake.gains[1].gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.11, 1.008);
    audio.setMuted(true); expect(fake.gains[0].gain.setTargetAtTime).toHaveBeenLastCalledWith(0, 1, 0.015); expect(audio.play(input).played).toBe(false);
    audio.setVolume(9); audio.setMuted(false); expect(fake.gains[0].gain.setTargetAtTime).toHaveBeenLastCalledWith(0.5, 1, 0.015);
    audio.stopAll(); expect(audio.activeVoiceCount).toBe(0); audio.dispose(); expect(fake.context.close).toHaveBeenCalledOnce();
  });
});

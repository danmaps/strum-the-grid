import { audiblePitch, decaySeconds, harmonicWeights } from './presentation';

export interface PlaybackInput { spanId: string; physicalHz: number; damping: number; amplitude: number; conductorType: string; octaveEnabled: boolean }
interface Voice { oscillators: OscillatorNode[]; gain: GainNode; stopped: boolean }

/** Lazily initialized, gesture-gated Web Audio synthesizer with a conservative compressed bus. */
export class SpanAudioEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private voices: Voice[] = [];
  private volume = 0.18;
  private muted = false;
  readonly maxVoices = 12;
  get activeVoiceCount() { return this.voices.length; }

  constructor(private createContext: () => AudioContext = () => new AudioContext()) {}
  async enable(): Promise<void> {
    if (!this.context) {
      this.context = this.createContext();
      this.master = this.context.createGain();
      this.compressor = this.context.createDynamicsCompressor();
      this.compressor.threshold.value = -20;
      this.compressor.knee.value = 18;
      this.compressor.ratio.value = 8;
      this.compressor.attack.value = 0.003;
      this.compressor.release.value = 0.2;
      this.master.gain.value = this.muted ? 0 : this.volume;
      this.master.connect(this.compressor);
      this.compressor.connect(this.context.destination);
    }
    if (this.context.state !== 'running') await this.context.resume();
  }
  setVolume(value: number) {
    this.volume = Number.isFinite(value) ? Math.max(0, Math.min(0.5, value)) : 0;
    this.updateGain();
  }
  setMuted(value: boolean) { this.muted = value; this.updateGain(); }
  private updateGain() {
    if (this.context && this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.context.currentTime, 0.015);
  }
  play(input: PlaybackInput) {
    const pitch = audiblePitch(input.physicalHz, input.octaveEnabled);
    if (!this.context || !this.master || this.context.state !== 'running' || this.muted) return { ...pitch, played: false };
    if (!Number.isFinite(input.amplitude) || !Number.isFinite(input.damping) || input.damping <= 0) throw new RangeError('Invalid audio envelope');
    if (this.voices.length >= this.maxVoices) this.release(this.voices[0]);
    const now = this.context.currentTime;
    const duration = decaySeconds(input.damping);
    const gain = this.context.createGain();
    gain.connect(this.master);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(Math.max(0, Math.min(1, input.amplitude)) * 0.11, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    const weights = harmonicWeights(input.conductorType);
    const voice: Voice = { gain, oscillators: [], stopped: false };
    let endedCount = 0;
    weights.forEach((weight, i) => {
      const hz = pitch.audibleHz * (i + 1);
      if (hz >= this.context!.sampleRate * 0.45) return;
      const osc = this.context!.createOscillator();
      const partial = this.context!.createGain();
      osc.type = 'sine'; osc.frequency.value = hz; partial.gain.value = weight / weights.reduce((a, b) => a + b, 0);
      osc.connect(partial); partial.connect(gain);
      osc.onended = () => { osc.disconnect(); partial.disconnect(); endedCount++; if (endedCount === voice.oscillators.length) this.cleanup(voice); osc.onended = null; };
      voice.oscillators.push(osc);
      osc.start(now); osc.stop(now + duration + 0.05);
    });
    if (voice.oscillators.length) this.voices.push(voice);
    else gain.disconnect();
    return { ...pitch, played: voice.oscillators.length > 0 };
  }
  private cleanup(voice: Voice) { voice.gain.disconnect(); this.voices = this.voices.filter(v => v !== voice); }
  private release(voice: Voice) {
    if (!this.context || voice.stopped) return;
    voice.stopped = true;
    const time = this.context.currentTime;
    voice.gain.gain.cancelScheduledValues(time);
    voice.gain.gain.setTargetAtTime(0.0001, time, 0.012);
    voice.oscillators.forEach(osc => { try { osc.stop(time + 0.04); } catch { /* Already naturally ended. */ } });
    this.voices = this.voices.filter(v => v !== voice);
  }
  stopAll() { [...this.voices].forEach(v => this.release(v)); }
  dispose() {
    this.stopAll(); this.master?.disconnect(); this.compressor?.disconnect();
    void this.context?.close(); this.context = null; this.master = null; this.compressor = null;
  }
}

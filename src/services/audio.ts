// Procedural Typewriter Acoustics using Web Audio API
// 100% offline, zero external audio assets, zero latency, ultra-lightweight.

class TypewriterAudioService {
  private ctx: AudioContext | null = null;
  private isUnlocked = false;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended' && this.isUnlocked) {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public unlock(): void {
    this.isUnlocked = true;
    const ctx = this.getContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  }

  // Synthesize white noise buffer
  private createNoiseBuffer(ctx: AudioContext, duration: number): AudioBuffer {
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  public playKey(key: string): void {
    const ctx = this.getContext();
    if (!ctx) return;
    this.unlock();

    const now = ctx.currentTime;
    const isEnter = key === 'Enter';
    const isSpace = key === ' ' || key === 'Space';
    const isBackspace = key === 'Backspace' || key === 'Delete';

    if (isEnter) {
      this.playEnter(ctx, now);
    } else if (isSpace) {
      this.playSpace(ctx, now);
    } else if (isBackspace) {
      this.playBackspace(ctx, now);
    } else {
      this.playStandardKey(ctx, now);
    }
  }

  private playStandardKey(ctx: AudioContext, now: number): void {
    // 1. Noise burst for key impact clack
    const noiseDuration = 0.018;
    const noise = ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(ctx, noiseDuration);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400 + Math.random() * 400, now);
    filter.Q.setValueAtTime(3, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + noiseDuration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);

    // 2. Body resonance click
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sine';
    const freq = 420 + Math.random() * 60;
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.025);

    oscGain.gain.setValueAtTime(0.15, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.025);
  }

  private playSpace(ctx: AudioContext, now: number): void {
    // Deep wooden spacebar clack
    const noiseDuration = 0.03;
    const noise = ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(ctx, noiseDuration);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(650, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + noiseDuration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);

    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.035);

    oscGain.gain.setValueAtTime(0.2, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.035);
  }

  private playBackspace(ctx: AudioContext, now: number): void {
    // Muted hollow backspace thud
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.022);

    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.022);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.022);
  }

  private playEnter(ctx: AudioContext, now: number): void {
    // Carriage return mechanical snap with a gentle high harmonic bell chime
    this.playStandardKey(ctx, now);

    // Subtle metallic chime
    const bell = ctx.createOscillator();
    const bellGain = ctx.createGain();
    bell.type = 'sine';
    bell.frequency.setValueAtTime(1760, now + 0.01); // A6 note
    bellGain.gain.setValueAtTime(0.035, now + 0.01);
    bellGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    bell.connect(bellGain);
    bellGain.connect(ctx.destination);
    bell.start(now + 0.01);
    bell.stop(now + 0.35);
  }
}

export const TypewriterAudio = new TypewriterAudioService();

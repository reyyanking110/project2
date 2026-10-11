/**
 * Tiny WebAudio synth — no assets, all procedural.
 * Everything is created lazily on the first user gesture so autoplay
 * policies never block the game.
 */
export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  muted = false;

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.02);
    }
  }

  /** Call from any user gesture. */
  unlock() {
    if (typeof window === "undefined") return;
    if (!this.ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) return;
      try {
        this.ctx = new AC();
      } catch {
        return;
      }
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.9;
      this.master.connect(this.ctx.destination);
      // 1 second of white noise, reused by every percussive hit.
      const len = Math.floor(this.ctx.sampleRate);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      this.noise = buf;
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  private get ready() {
    return !this.muted && this.ctx && this.master && this.ctx.state === "running";
  }

  private tone(
    freq: number,
    to: number,
    dur: number,
    type: OscillatorType,
    gain: number,
    delay = 0,
  ) {
    if (!this.ready || !this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freq), t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + Math.min(0.02, dur * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
  }

  private burst(dur: number, gain: number, freq: number, q = 1, delay = 0) {
    if (!this.ready || !this.ctx || !this.master || !this.noise) return;
    const t0 = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = 1;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(freq, t0);
    filter.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  flap() {
    this.tone(360, 720, 0.1, "triangle", 0.16);
    this.burst(0.09, 0.1, 1500, 0.8);
  }

  score(combo = 0) {
    const base = 660 * Math.pow(1.0595, Math.min(combo, 8) * 2);
    this.tone(base, base, 0.09, "square", 0.09);
    this.tone(base * 1.5, base * 1.5, 0.13, "square", 0.07, 0.075);
  }

  squeak() {
    this.tone(1500, 2100, 0.07, "sine", 0.09);
    this.burst(0.12, 0.09, 3200, 1.4);
  }

  bonk() {
    this.tone(180, 90, 0.13, "sine", 0.16);
    this.burst(0.07, 0.08, 700, 1.2);
  }

  hit() {
    this.tone(220, 48, 0.34, "sawtooth", 0.2);
    this.burst(0.28, 0.22, 380, 0.7);
  }

  die() {
    this.tone(520, 90, 0.6, "triangle", 0.13, 0.05);
  }

  land() {
    this.burst(0.22, 0.16, 260, 0.6);
    this.tone(120, 70, 0.16, "sine", 0.12);
  }

  ui(up = true) {
    this.tone(up ? 520 : 420, up ? 880 : 260, 0.08, "square", 0.055);
  }

  record() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((n, i) => this.tone(n, n, 0.22, "triangle", 0.11, i * 0.09));
  }
}

export const sfx = new Sfx();

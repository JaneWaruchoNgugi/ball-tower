/**
 * Soft Afro-house loop synthesised with Web Audio: a kalimba melody over
 * airy pads, a log-drum style bass, a shaker and light congas. No audio files.
 *
 * 112 BPM, 16th-note grid. Progression (one bar each): Bm7 – Gmaj7 – Dmaj7 – A.
 */

const BPM = 112;
const SIX = 60 / BPM / 4; // one 16th note
const STEPS = 16;

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

interface Bar {
  bass: number;
  pad: readonly number[];
  /** Kalimba melody: [step, midi note]. */
  mel: ReadonlyArray<readonly [number, number]>;
}

const BARS: readonly Bar[] = [
  { bass: 47, pad: [62, 66, 69, 74], mel: [[0, 78], [3, 76], [6, 74], [8, 71], [11, 74], [14, 76]] }, // Bm7
  { bass: 43, pad: [62, 66, 67, 71], mel: [[0, 79], [3, 78], [6, 74], [10, 71], [12, 74], [14, 78]] }, // Gmaj7
  { bass: 50, pad: [61, 66, 69, 73], mel: [[0, 81], [3, 78], [6, 76], [8, 73], [11, 76], [13, 78]] }, // Dmaj7
  { bass: 45, pad: [61, 64, 69, 73], mel: [[0, 76], [2, 73], [6, 69], [8, 71], [10, 73], [12, 76], [14, 73]] }, // A
];

/** Log-drum hits per bar: [step, semitones above the bar's bass, length in steps]. */
const LOG: ReadonlyArray<readonly [number, number, number]> = [
  [0, 0, 3], [3, 0, 2], [6, 12, 2], [10, 7, 2], [12, 0, 3],
];
/** Conga pattern: [step, high?]. */
const CONGA: ReadonlyArray<readonly [number, boolean]> = [[2, true], [7, false], [9, true], [11, true], [15, false]];

export class Music {
  private readonly bus: GainNode;
  private readonly warm: BiquadFilterNode;
  private readonly echo: DelayNode;
  private timer = 0;
  private step = 0;
  private next = 0;
  private playing = false;
  private noise: AudioBuffer | null = null;

  /** Overall music level relative to the sound effects (kept low on purpose). */
  private static readonly LEVEL = 0.3;

  constructor(
    private readonly ac: AudioContext,
    out: AudioNode,
  ) {
    this.bus = ac.createGain();
    this.bus.gain.value = 0;
    this.bus.connect(out);
    this.warm = ac.createBiquadFilter();
    this.warm.type = 'lowpass';
    this.warm.frequency.value = 3200;
    this.warm.connect(this.bus);
    // A soft dotted-eighth echo gives the kalimba some space.
    this.echo = ac.createDelay(1);
    this.echo.delayTime.value = SIX * 3;
    const fb = ac.createGain();
    fb.gain.value = 0.28;
    const wet = ac.createGain();
    wet.gain.value = 0.35;
    this.echo.connect(fb);
    fb.connect(this.echo);
    this.echo.connect(wet);
    wet.connect(this.warm);
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  start(): void {
    if (this.playing) return;
    this.playing = true;
    const t = this.ac.currentTime;
    this.bus.gain.cancelScheduledValues(t);
    this.bus.gain.setValueAtTime(this.bus.gain.value, t);
    this.bus.gain.linearRampToValueAtTime(Music.LEVEL, t + 2.5);
    this.next = t + 0.1;
    this.timer = window.setInterval(() => this.schedule(), 40);
  }

  stop(): void {
    if (!this.playing) return;
    this.playing = false;
    clearInterval(this.timer);
    const t = this.ac.currentTime;
    this.bus.gain.cancelScheduledValues(t);
    this.bus.gain.setValueAtTime(this.bus.gain.value, t);
    this.bus.gain.linearRampToValueAtTime(0, t + 0.6);
  }

  /** Dip the music briefly, e.g. while the caller speaks. */
  duck(seconds = 1.6): void {
    if (!this.playing) return;
    const t = this.ac.currentTime;
    const g = this.bus.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(Music.LEVEL * 0.35, t + 0.12);
    g.setValueAtTime(Music.LEVEL * 0.35, t + seconds);
    g.linearRampToValueAtTime(Music.LEVEL, t + seconds + 0.8);
  }

  private schedule(): void {
    const now = this.ac.currentTime;
    // After the tab was in the background, skip ahead instead of firing a burst of notes.
    if (this.next < now - 0.2) this.next = now + 0.05;
    while (this.next < now + 0.2) {
      this.playStep(this.step, this.next);
      this.next += SIX * (this.step % 2 === 0 ? 1.1 : 0.9); // light shuffle
      this.step = (this.step + 1) % (STEPS * BARS.length);
    }
  }

  private playStep(step: number, t: number): void {
    const bar = BARS[Math.floor(step / STEPS)];
    if (!bar) return;
    const s = step % STEPS;

    if (s === 0) this.pad(bar.pad, t, SIX * STEPS);
    // Four-on-the-floor, but soft.
    if (s % 4 === 0) this.kick(t);
    // Shaker on every 16th, accented on the off-beat.
    this.shaker(t, s % 4 === 2 ? 0.035 : 0.014);
    // Rim click on 2 and 4.
    if (s === 4 || s === 12) this.rim(t);
    for (const [at, high] of CONGA) if (at === s) this.conga(t, high);
    for (const [at, semi, len] of LOG) if (at === s) this.logDrum(midi(bar.bass + semi), t, SIX * len);
    for (const [at, n] of bar.mel) if (at === s) this.kalimba(midi(n), t);
  }

  private env(g: GainNode, t: number, peak: number, attack: number, dur: number): void {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  private osc(type: OscillatorType, f: number, t: number, dur: number, peak: number, attack: number, to: AudioNode): OscillatorNode {
    const o = this.ac.createOscillator();
    const g = this.ac.createGain();
    o.type = type;
    o.frequency.value = f;
    this.env(g, t, peak, attack, dur);
    o.connect(g);
    g.connect(to);
    o.start(t);
    o.stop(t + dur + 0.05);
    return o;
  }

  private pad(notes: readonly number[], t: number, dur: number): void {
    for (const n of notes) {
      const o = this.ac.createOscillator();
      const g = this.ac.createGain();
      o.type = 'sine';
      o.frequency.value = midi(n);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.014, t + 0.9);
      g.gain.setValueAtTime(0.014, t + dur - 0.4);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.3);
      o.connect(g);
      g.connect(this.warm);
      o.start(t);
      o.stop(t + dur + 0.4);
    }
  }

  /** Amapiano-style log drum: a sine that bends down into the note. */
  private logDrum(f: number, t: number, dur: number): void {
    const o = this.osc('sine', f * 1.5, t, dur, 0.15, 0.006, this.warm);
    o.frequency.setValueAtTime(f * 1.5, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.05);
  }

  private kick(t: number): void {
    const o = this.osc('sine', 120, t, 0.2, 0.14, 0.004, this.warm);
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.15);
  }

  private noiseBuf(): AudioBuffer {
    if (!this.noise) {
      const len = Math.floor(this.ac.sampleRate * 0.2);
      this.noise = this.ac.createBuffer(1, len, this.ac.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    return this.noise;
  }

  private shaker(t: number, level: number): void {
    const src = this.ac.createBufferSource();
    src.buffer = this.noiseBuf();
    const bp = this.ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 9000;
    bp.Q.value = 1.2;
    const g = this.ac.createGain();
    this.env(g, t, level, 0.006, 0.06);
    src.connect(bp);
    bp.connect(g);
    g.connect(this.bus);
    src.start(t);
    src.stop(t + 0.08);
  }

  private rim(t: number): void {
    this.osc('triangle', 1700, t, 0.03, 0.025, 0.002, this.bus);
  }

  private conga(t: number, high: boolean): void {
    const f = high ? 330 : 220;
    const o = this.osc('sine', f, t, 0.16, 0.06, 0.003, this.warm);
    o.frequency.setValueAtTime(f * 1.25, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.03);
  }

  /** Kalimba: bright fundamental plus a fast-fading inharmonic tine overtone. */
  private kalimba(f: number, t: number): void {
    const dry = this.ac.createGain();
    dry.gain.value = 1;
    dry.connect(this.warm);
    dry.connect(this.echo);
    this.osc('sine', f, t, 0.7, 0.045, 0.003, dry);
    this.osc('sine', f * 5.95, t, 0.06, 0.01, 0.002, dry);
    this.osc('triangle', f * 2, t, 0.15, 0.008, 0.002, dry);
  }
}

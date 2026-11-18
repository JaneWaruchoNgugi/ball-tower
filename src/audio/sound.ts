import { Music } from './music';
/** Game sounds, synthesised with the Web Audio API (no audio files). */

export type SoundName = 'tick' | 'count' | 'go' | 'land' | 'bet' | 'cancel' | 'click' | 'win' | 'bigwin' | 'lose';

export interface SoundConfig {
  on: boolean;
  /** 0–1 */
  vol: number;
  ticks: boolean;
  count: boolean;
  result: boolean;
  ui: boolean;
  /** Spoken caller announcing each ball. */
  caller: boolean;
  /** Soft background music loop. */
  music: boolean;
}

const DEFAULTS: SoundConfig = { on: true, vol: 0.6, ticks: true, count: true, result: true, ui: true, caller: true, music: false };

type AudioCtor = typeof AudioContext;

export class Sound {
  readonly cfg: SoundConfig;
  private ac: AudioContext | null = null;
  private master: GainNode | null = null;
  private music: Music | null = null;

  constructor(private readonly storageKey = 'bingoarcade.sound') {
    this.cfg = { ...DEFAULTS };
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? 'null') as Partial<SoundConfig> | null;
      if (saved) Object.assign(this.cfg, saved);
    } catch {
      /* storage blocked: keep defaults */
    }
    // Browsers only allow audio after the viewer interacts with the page.
    addEventListener('pointerdown', () => this.ensure(), { once: true });
    addEventListener('keydown', () => this.ensure(), { once: true });
    window.speechSynthesis?.addEventListener?.('voiceschanged', () => this.pickVoice());
    this.pickVoice();
    document.addEventListener('visibilitychange', () => this.syncMusic());
  }

  private voice: SpeechSynthesisVoice | null = null;

  /** Pick a male English voice for the caller, if the device has one. */
  private pickVoice(): void {
    const synth = window.speechSynthesis;
    if (!synth) return;
    const all = synth.getVoices();
    if (!all.length) return;
    const en = all.filter((v) => /^en/i.test(v.lang));
    const pool = en.length ? en : all;
    const male =
      /\b(male|man)\b|daniel|david|alex\b|fred|george|arthur|guy|ryan|thomas|mark|james|aaron|rishi|oliver|gordon|lee|tom\b|reed|eddy|rocko|ralph/i;
    const notFemale = (v: SpeechSynthesisVoice) => !/female|woman|zira|susan|samantha|victoria|karen|moira|tessa|fiona|hazel|libby|sonia|aria|jenny|serena|kate|catherine/i.test(v.name);
    this.voice =
      pool.find((v) => male.test(v.name) && notFemale(v) && /en-(GB|KE|ZA|AU)/i.test(v.lang)) ??
      pool.find((v) => male.test(v.name) && notFemale(v)) ??
      pool.find(notFemale) ??
      pool[0] ??
      null;
  }

  /** Start or stop the background loop to match the settings. */
  syncMusic(): void {
    if (!this.ac || !this.master) return;
    this.music ??= new Music(this.ac, this.master);
    const want = this.cfg.on && this.cfg.music && this.cfg.vol > 0 && document.visibilityState !== 'hidden';
    if (want) this.music.start();
    else this.music.stop();
  }

  /** Announce text with the caller voice (deep, steady, bingo-hall style). */
  call(text: string): void {
    const synth = window.speechSynthesis;
    if (!synth || !this.cfg.on || !this.cfg.caller || this.cfg.vol === 0) return;
    try {
      if (!this.voice) this.pickVoice();
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      if (this.voice) {
        u.voice = this.voice;
        u.lang = this.voice.lang;
      } else u.lang = 'en-GB';
      u.pitch = 0.75;
      u.rate = 0.92;
      u.volume = Math.min(1, this.cfg.vol * 1.4);
      this.music?.duck(1.4);
      synth.speak(u);
    } catch {
      /* speech unavailable */
    }
  }

  /** Create or resume the audio context. Safe to call often. */
  ensure(): void {
    try {
      if (!this.ac) {
        const Ctor: AudioCtor | undefined =
          window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext;
        if (!Ctor) return;
        this.ac = new Ctor();
        this.master = this.ac.createGain();
        this.master.connect(this.ac.destination);
      }
      if (this.ac.state === 'suspended') void this.ac.resume();
      this.applyVolume();
      this.syncMusic();
    } catch {
      /* audio unavailable */
    }
  }

  play(name: SoundName): void {
    if (!this.cfg.on) return;
    this.ensure();
    try {
      this.sounds[name]();
    } catch {
      /* ignore audio errors */
    }
  }

  save(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.cfg));
    } catch {
      /* storage blocked */
    }
    this.applyVolume();
    this.syncMusic();
  }

  private applyVolume(): void {
    if (this.master) this.master.gain.value = this.cfg.on ? this.cfg.vol : 0;
  }

  private tone(freq: number, dur: number, type: OscillatorType = 'sine', gain = 0.25, when = 0, glideTo = 0): void {
    const { ac, master } = this;
    if (!ac || !master || !this.cfg.on || this.cfg.vol === 0) return;
    const t = ac.currentTime + when;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + dur + 0.03);
  }

  private readonly sounds: Record<SoundName, () => void> = {
    tick: () => { if (this.cfg.ticks) this.tone(2200, 0.025, 'square', 0.05); },
    // Race-start style countdown: three short beeps, then a long beep an octave up.
    count: () => {
      if (!this.cfg.count) return;
      this.tone(784, 0.16, 'square', 0.06);
      this.tone(784, 0.16, 'sine', 0.22);
      this.tone(1568, 0.08, 'sine', 0.05);
    },
    go: () => {
      if (!this.cfg.count) return;
      this.tone(1568, 0.55, 'square', 0.06);
      this.tone(1568, 0.6, 'sine', 0.24);
      this.tone(2349, 0.45, 'sine', 0.07, 0.02);
    },
    // The ball drops into the window: a soft knock, then a bright two-note bell.
    land: () => {
      if (!this.cfg.ticks && !this.cfg.result) return;
      this.tone(150, 0.09, 'sine', 0.3, 0, 90);
      for (const [f, w] of [[988, 0], [1319, 0.07]] as const) {
        this.tone(f, 0.9, 'sine', 0.2, w);
        this.tone(f * 2.76, 0.35, 'sine', 0.05, w);
        this.tone(f * 5.4, 0.15, 'sine', 0.025, w);
      }
    },
    bet: () => {
      if (!this.cfg.ui) return;
      this.tone(660, 0.07, 'triangle', 0.2);
      this.tone(990, 0.09, 'triangle', 0.16, 0.05);
    },
    cancel: () => { if (this.cfg.ui) this.tone(520, 0.12, 'triangle', 0.16, 0, 300); },
    click: () => { if (this.cfg.ui) this.tone(1400, 0.03, 'sine', 0.1); },
    win: () => {
      if (!this.cfg.result) return;
      [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.22, i * 0.085));
    },
    bigwin: () => {
      if (!this.cfg.result) return;
      [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => this.tone(f, 0.26, 'triangle', 0.22, i * 0.075));
      this.tone(2093, 0.6, 'sine', 0.12, 0.48);
    },
    lose: () => {
      if (!this.cfg.result) return;
      this.tone(300, 0.22, 'sawtooth', 0.07, 0, 150);
      this.tone(200, 0.3, 'triangle', 0.14, 0.1, 110);
    },
  };
}

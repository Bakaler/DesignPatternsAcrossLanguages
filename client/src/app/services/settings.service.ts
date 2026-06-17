import { Injectable, effect, signal } from '@angular/core';

export type ChordType = 'sine' | 'arcade' | 'dm';

const CHORDS: ChordType[] = ['sine', 'arcade', 'dm'];
const STORAGE_KEY = 'dp-chord';

@Injectable({ providedIn: 'root' })
export class SettingsService {

  readonly chord  = signal<ChordType>(this.loadChord());
  readonly volume = signal<number>(0.8);

  private audioCtx:  AudioContext | null = null;
  private masterOut: AudioNode   | null = null;

  constructor() {
    // Persist chord whenever it changes
    effect(() => localStorage.setItem(STORAGE_KEY, this.chord()));

    // Unlock AudioContext on first interaction so sounds work immediately
    const unlock = () => {
      if (!this.audioCtx) this.audioCtx = new AudioContext();
      if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
      document.removeEventListener('pointerdown', unlock);
    };
    document.addEventListener('pointerdown', unlock);
  }

  private loadChord(): ChordType {
    const saved = localStorage.getItem(STORAGE_KEY) as ChordType | null;
    if (saved && CHORDS.includes(saved)) return saved;
    const pick = CHORDS[Math.floor(Math.random() * CHORDS.length)];
    localStorage.setItem(STORAGE_KEY, pick);
    return pick;
  }

  private getAudio(): AudioContext | null {
    try {
      if (!this.audioCtx) this.audioCtx = new AudioContext();
      if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
      return this.audioCtx;
    } catch { return null; }
  }

  // All oscillators route through a compressor so we can push gains hard
  // without clipping when multiple notes overlap (win chimes etc.)
  private getOut(ctx: AudioContext): AudioNode {
    if (!this.masterOut) {
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -6;
      comp.knee.value      =  4;
      comp.ratio.value     =  6;
      comp.attack.value    =  0.001;
      comp.release.value   =  0.08;
      comp.connect(ctx.destination);
      this.masterOut = comp;
    }
    return this.masterOut;
  }

  // ── Short UI click — subtle, slight variety each press ───────────────────
  playUiClick(): void {
    const ctx = this.getAudio();
    if (!ctx) return;
    const out = this.getOut(ctx);
    const vol = this.volume();
    const v   = 0.88 + Math.random() * 0.24;   // 0.88–1.12 gain wobble
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(out);
    switch (this.chord()) {
      case 'arcade': {
        const freq = 490 + Math.random() * 70;
        const dur  = 0.032 + Math.random() * 0.018;
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.22 * vol * v, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
        osc.start(); osc.stop(ctx.currentTime + dur + 0.005);
        break;
      }
      case 'dm': {
        const dmTones = [146.83, 220.00, 293.66, 349.23];
        const freq = dmTones[Math.floor(Math.random() * dmTones.length)];
        const dur  = 0.07 + Math.random() * 0.04;
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.28 * vol * v, ctx.currentTime + 0.002);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
        osc.start(); osc.stop(ctx.currentTime + dur + 0.005);
        break;
      }
      default: {
        const freq = 620 + Math.random() * 80;
        const dur  = 0.038 + Math.random() * 0.022;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.32 * vol * v, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
        osc.start(); osc.stop(ctx.currentTime + dur + 0.005);
      }
    }
  }

  // ── Roll tick — called rapidly during the slot-machine roll ───────────────
  playTick(): void {
    const ctx = this.getAudio();
    if (!ctx) return;
    const out  = this.getOut(ctx);
    const vol  = this.volume();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(out);
    switch (this.chord()) {
      case 'arcade':
        osc.type = 'square';
        osc.frequency.setValueAtTime(400 + Math.random() * 300, ctx.currentTime);
        gain.gain.setValueAtTime(0.30 * vol, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.028);
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.032);
        break;
      case 'dm': {
        const dmTones = [146.83, 220.00, 293.66, 349.23];
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(dmTones[Math.floor(Math.random() * dmTones.length)], ctx.currentTime);
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.45 * vol, ctx.currentTime + 0.003);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.25);
        break;
      }
      default:
        osc.type = 'sine';
        osc.frequency.setValueAtTime(700 + Math.random() * 200, ctx.currentTime);
        gain.gain.setValueAtTime(0.38 * vol, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.045);
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.05);
    }
  }

  // ── Airport PA chime ──────────────────────────────────────────────────────
  // 10 distinct melodic variations (different keys / note counts / pacing).
  // Rich bell synthesis per note: fundamental sine + detuned twin + quiet octave.
  // The caller passes a variant index (0-9); the component rotates through them.
  playPaChime(variant = 0): void {
    const ctx = this.getAudio();
    if (!ctx) return;
    const out = this.getOut(ctx);
    const vol = this.volume();

    // One bell stroke: fundamental + detuned clone (±0.35 %) + quiet octave up
    const bell = (freq: number, t: number, gain: number, decay: number) => {
      [[freq, 1.0], [freq * 1.0035, 0.65], [freq * 2, 0.16]].forEach(([f, rel]) => {
        const osc = ctx.createOscillator(), g = ctx.createGain();
        osc.connect(g); g.connect(out);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, t);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(gain * rel * vol, t + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
        osc.start(t); osc.stop(t + decay + 0.05);
      });
    };

    // 10 sine-mode variations: [notes Hz, spacing s, decay s, gain]
    const sineVars: [number[], number, number, number][] = [
      [[392, 493.88, 587.33, 783.99], 0.30, 1.6, 0.36],  // 0  G major asc 4-note
      [[261.63, 329.63, 392, 523.25], 0.28, 1.5, 0.34],  // 1  C major asc 4-note
      [[659.25, 523.25, 587.33, 392], 0.32, 1.4, 0.30],  // 2  Westminster desc
      [[440, 523.25, 659.25, 880],    0.25, 1.3, 0.28],  // 3  A pentatonic asc
      [[349.23, 440, 523.25],         0.36, 1.8, 0.38],  // 4  F major 3-note slow
      [[293.66, 369.99, 440, 587.33], 0.28, 1.5, 0.34],  // 5  D major asc
      [[466.16, 587.33, 698.46],      0.30, 1.6, 0.35],  // 6  Bb major 3-note
      [[329.63, 392, 493.88, 659.25], 0.32, 1.4, 0.32],  // 7  E minor asc
      [[783.99, 587.33, 493.88, 392], 0.27, 1.5, 0.28],  // 8  G major desc
      [[880, 659.25, 554.37],         0.22, 1.2, 0.26],  // 9  A major desc 3-note
    ];

    const chord = this.chord();

    if (chord === 'dm') {
      // DM: same shapes but minor-ised — flatten 3rds and use longer decay
      const dmVars: [number[], number, number, number][] = [
        [[392, 466.16, 587.33, 783.99], 0.32, 1.8, 0.30],
        [[261.63, 311.13, 392, 523.25], 0.30, 1.7, 0.28],
        [[622.25, 523.25, 554.37, 392], 0.34, 1.6, 0.26],
        [[440, 523.25, 622.25, 880],    0.28, 1.4, 0.26],
        [[349.23, 415.30, 523.25],      0.38, 2.0, 0.32],
        [[293.66, 349.23, 440, 587.33], 0.30, 1.6, 0.28],
        [[466.16, 554.37, 698.46],      0.32, 1.7, 0.30],
        [[311.13, 392, 466.16, 622.25], 0.34, 1.5, 0.28],
        [[783.99, 622.25, 466.16, 392], 0.28, 1.6, 0.24],
        [[880, 622.25, 523.25],         0.24, 1.3, 0.24],
      ];
      const [notes, spacing, decay, gain] = dmVars[variant % 10];
      notes.forEach((f, i) => bell(f, ctx.currentTime + i * spacing, gain, decay));
      return;
    }

    if (chord === 'arcade') {
      // Arcade: same pitches, shorter decay, slightly higher gain
      const [notes, spacing, , gain] = sineVars[variant % 10];
      notes.forEach((f, i) => bell(f, ctx.currentTime + i * spacing * 0.7, gain + 0.04, 0.5));
      return;
    }

    // Sine (default)
    const [notes, spacing, decay, gain] = sineVars[variant % 10];
    notes.forEach((f, i) => bell(f, ctx.currentTime + i * spacing, gain, decay));
  }

  // ── Flight whoosh — rising sweep when a plane departs ────────────────────
  playFlightWhoosh(): void {
    const ctx = this.getAudio();
    if (!ctx) return;
    const out = this.getOut(ctx);
    const vol = this.volume();
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.connect(g); g.connect(out);
    switch (this.chord()) {
      case 'arcade':
        osc.type = 'square';
        osc.frequency.setValueAtTime(140, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(860, ctx.currentTime + 0.38);
        g.gain.setValueAtTime(0.001, ctx.currentTime);
        g.gain.linearRampToValueAtTime(0.18 * vol, ctx.currentTime + 0.04);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.42);
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.46);
        break;
      case 'dm':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(240, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(55, ctx.currentTime + 0.85);
        g.gain.setValueAtTime(0, ctx.currentTime);
        g.gain.linearRampToValueAtTime(0.22 * vol, ctx.currentTime + 0.06);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.95);
        break;
      default:
        osc.type = 'sine';
        osc.frequency.setValueAtTime(180, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(780, ctx.currentTime + 0.65);
        g.gain.setValueAtTime(0, ctx.currentTime);
        g.gain.linearRampToValueAtTime(0.26 * vol, ctx.currentTime + 0.07);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.72);
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.78);
    }
  }

  // ── Gate beep — soft ding-ding like a boarding scanner ───────────────────
  playGateBeep(): void {
    const ctx = this.getAudio();
    if (!ctx) return;
    const out = this.getOut(ctx);
    const vol = this.volume();
    // Two quick bell strokes a perfect-fifth apart — sounds like a gentle gate chime
    const freqs = this.chord() === 'dm' ? [220, 165] : [880, 1320];
    freqs.forEach((freq, i) => {
      const t = ctx.currentTime + i * 0.18;
      [[freq, 1.0], [freq * 1.003, 0.6]].forEach(([f, rel]) => {
        const osc = ctx.createOscillator(), g = ctx.createGain();
        osc.connect(g); g.connect(out);
        osc.type = this.chord() === 'arcade' ? 'square' : 'sine';
        osc.frequency.setValueAtTime(f, t);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.20 * vol * rel, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + (this.chord() === 'dm' ? 1.0 : 0.5));
        osc.start(t); osc.stop(t + 1.1);
      });
    });
  }

  // ── Win chime — played once when the roll lands ───────────────────────────
  playWin(): void {
    const ctx = this.getAudio();
    if (!ctx) return;
    const out = this.getOut(ctx);
    const vol = this.volume();
    switch (this.chord()) {
      case 'arcade': {
        [0, 0.07, 0.13, 0.19].forEach((offset, i) => {
          const freq = [880, 1047, 1319, 1568][i];
          const osc = ctx.createOscillator(), gain = ctx.createGain();
          osc.connect(gain); gain.connect(out);
          osc.type = 'square';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + offset);
          gain.gain.setValueAtTime(0.001, ctx.currentTime + offset);
          gain.gain.linearRampToValueAtTime(0.40 * vol, ctx.currentTime + offset + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.14);
          osc.start(ctx.currentTime + offset); osc.stop(ctx.currentTime + offset + 0.16);
        });
        break;
      }
      case 'dm': {
        [0, 0.016, 0.032, 0.048].forEach((offset, i) => {
          const freq = [146.83, 220.00, 293.66, 349.23][i];
          const osc = ctx.createOscillator(), gain = ctx.createGain();
          osc.connect(gain); gain.connect(out);
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + offset);
          gain.gain.setValueAtTime(0, ctx.currentTime + offset);
          gain.gain.linearRampToValueAtTime(0.50 * vol, ctx.currentTime + offset + 0.003);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.9);
          osc.start(ctx.currentTime + offset); osc.stop(ctx.currentTime + offset + 0.95);
        });
        break;
      }
      default: {
        [0, 0.09, 0.18].forEach((offset, i) => {
          const freq = [523, 659, 784][i];
          const osc = ctx.createOscillator(), gain = ctx.createGain();
          osc.connect(gain); gain.connect(out);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + offset);
          gain.gain.setValueAtTime(0.001, ctx.currentTime + offset);
          gain.gain.linearRampToValueAtTime(0.55 * vol, ctx.currentTime + offset + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.35);
          osc.start(ctx.currentTime + offset); osc.stop(ctx.currentTime + offset + 0.4);
        });
      }
    }
  }
}

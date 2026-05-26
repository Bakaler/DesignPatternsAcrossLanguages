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

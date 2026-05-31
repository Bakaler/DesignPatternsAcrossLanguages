import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { SettingsService } from '../../services/settings.service';
import { FooterComponent } from '../../shared/footer/footer.component';

interface Pattern {
  id: string;
  name: string;
  done: boolean;
  inWorks?: boolean;
}

interface Category {
  name: string;
  cls: string;
  count: string;
  desc: string;
  patterns: Pattern[];
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, FooterComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit, OnDestroy {

  // ── Typewriter tagline ────────────────────────────────────────────────────
  private readonly TAGLINE = 'A Codex';
  tagline       = '';
  taglineTyping = true;

  constructor(private http: HttpClient, public settings: SettingsService) {}

  ngOnInit(): void {
    this.startTypewriter();
    this.animateCount(6, v => this.displayLanguages  = v, 0);
    this.animateCount(3, v => this.displayCategories = v, 120);

    this.http.get<{ implementations: number; patterns: number }>('/api/stats').subscribe({
      next: data => {
        this.implementationCount = data.implementations;
        this.animateCount(data.patterns,        v => this.displayPatterns = v, 0);
        this.animateCount(data.implementations, v => this.displayCount    = v, 200);
      },
      error: () => { /* keep default */ }
    });
  }

  // ── Live stats ────────────────────────────────────────────────────────────
  implementationCount = 0;
  displayCount        = 0;
  displayPatterns     = 0;
  displayLanguages    = 0;
  displayCategories   = 0;

  private startTypewriter(): void {
    let i = 0;
    const type = () => {
      this.tagline = this.TAGLINE.slice(0, i);
      if (i < this.TAGLINE.length) {
        i++;
        this.timeouts.push(setTimeout(type, 80));
      } else {
        // blink cursor for 1.4s then hide it
        this.timeouts.push(setTimeout(() => { this.taglineTyping = false; }, 1400));
      }
    };
    this.timeouts.push(setTimeout(type, 400));
  }

  private animateCount(target: number, setter: (v: number) => void, delay = 0): void {
    const duration = 1400;
    const run = () => {
      const start = Date.now();
      const tick = () => {
        const progress = Math.min((Date.now() - start) / duration, 1);
        const eased    = 1 - Math.pow(1 - progress, 3);
        setter(Math.round(eased * target));
        if (progress < 1) this.timeouts.push(setTimeout(tick, 16));
      };
      tick();
    };
    if (delay) this.timeouts.push(setTimeout(run, delay));
    else run();
  }

  // ── Language roller ───────────────────────────────────────────────────────
  readonly langs = ['java', 'csharp', 'ts', 'python', 'ruby'] as const;
  readonly langNames: Record<string, string> = { java: 'Java', csharp: 'C#', ts: 'TypeScript', python: 'Python', ruby: 'Ruby' };
  readonly langColors: Record<string, string> = { java: '#c07830', csharp: '#6e40b0', ts: '#2d6aaa', python: '#9e8a28', ruby: '#7a1818' };

  langRolling = false;
  langLabel = 'press to roll';
  langFillWidth = '0%';
  langFillBg = 'transparent';
  langTrack: '' | 'rolling' | 'done' = '';
  langCardState: Record<string, '' | 'lit' | 'won'> = { java: '', csharp: '', ts: '', python: '', ruby: '' };
  langBarState: Record<string, '' | 'lit' | 'selected'> = { java: '', csharp: '', ts: '', python: '', ruby: '' };

  // ── Pattern roller ────────────────────────────────────────────────────────
  readonly categories: Category[] = [
    {
      name: 'Creational', cls: 'creational', count: '5 patterns',
      desc: 'Control how objects are created. Decouple instantiation from usage.',
      patterns: [
        { id: 'abstract-factory', name: 'Abstract Factory', done: true },
        { id: 'builder',          name: 'Builder',          done: false },
        { id: 'factory-method',   name: 'Factory Method',   done: false },
        { id: 'prototype',        name: 'Prototype',        done: false },
        { id: 'singleton',        name: 'Singleton',        done: false },
      ]
    },
    {
      name: 'Structural', cls: 'structural', count: '7 patterns',
      desc: 'Control how objects are composed into larger structures.',
      patterns: [
        { id: 'adapter',   name: 'Adapter',   done: false },
        { id: 'bridge',    name: 'Bridge',    done: false },
        { id: 'composite', name: 'Composite', done: false },
        { id: 'decorator', name: 'Decorator', done: false },
        { id: 'facade',    name: 'Facade',    done: false, inWorks: true },
        { id: 'flyweight', name: 'Flyweight', done: false },
        { id: 'proxy',     name: 'Proxy',     done: false },
      ]
    },
    {
      name: 'Behavioral', cls: 'behavioral', count: '11 patterns',
      desc: 'Control how objects communicate and share responsibility.',
      patterns: [
        { id: 'chain',    name: 'Chain of Resp.',  done: false },
        { id: 'command',  name: 'Command',         done: false },
        { id: 'iterator', name: 'Iterator',        done: false },
        { id: 'mediator', name: 'Mediator',        done: false },
        { id: 'memento',  name: 'Memento',         done: false },
        { id: 'observer', name: 'Observer',        done: false },
        { id: 'state',    name: 'State',           done: false },
        { id: 'strategy', name: 'Strategy',        done: false },
        { id: 'template', name: 'Template Method', done: false, inWorks: true },
        { id: 'visitor',  name: 'Visitor',         done: false },
        { id: 'interpreter', name: 'Interpreter',  done: false },
      ]
    }
  ];

  // ── Pattern of the day (must be declared AFTER categories) ──────────────
  readonly potdId: string = (() => {
    const s    = new Date().toDateString();
    const seed = s.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const all  = this.categories.flatMap(c => c.patterns);
    return all[seed % all.length].id;
  })();

  patRolling = false;
  patLabel = 'press to roll';
  patFillWidth = '0%';
  patTrack: '' | 'rolling' | 'done' = '';
  litPatternId: string | null = null;
  wonPatternId: string | null = null;

  selectedWin: 'confetti' | 'lightning' | 'sparks' = 'confetti';

  private timeouts:   ReturnType<typeof setTimeout>[] = [];
  private confCanvas: HTMLCanvasElement | null = null;
  private animFrame:  number | null = null;

  ngOnDestroy(): void {
    this.timeouts.forEach(t => clearTimeout(t));
    if (this.animFrame != null) cancelAnimationFrame(this.animFrame);
    this.confCanvas?.remove();
  }

  private launchConfetti(): void {
    const canvas = this.ensureCanvas();
    const ctx    = canvas.getContext('2d')!;

    const palette = [
      '#f0a500','#4ec9b0','#9b59f5','#4a9eff',
      '#f89820','#e05c8a','#ffd43b','#cc342d','#e4e2df'
    ];

    interface Piece {
      x: number; y: number; vx: number; vy: number;
      w: number; h: number; rot: number; rotV: number;
      color: string; alpha: number;
    }

    const spawn = (fromLeft: boolean): Piece[] =>
      Array.from({ length: 75 }, () => {
        // left cannon shoots up-right, right cannon shoots up-left
        const spread = Math.PI * 0.55;
        const base   = fromLeft ? -Math.PI * 0.25 : -Math.PI * 0.75;
        const angle  = base + (Math.random() - 0.5) * spread;
        const speed  = 9 + Math.random() * 13;
        return {
          x:     fromLeft ? 0 : canvas.width,
          y:     canvas.height * (0.5 + Math.random() * 0.25),
          vx:    Math.cos(angle) * speed,
          vy:    Math.sin(angle) * speed,
          w:     5 + Math.random() * 8,
          h:     3 + Math.random() * 4,
          rot:   Math.random() * Math.PI * 2,
          rotV:  (Math.random() - 0.5) * 0.28,
          color: palette[Math.floor(Math.random() * palette.length)],
          alpha: 0.85 + Math.random() * 0.15,
        };
      });

    const particles = [...spawn(true), ...spawn(false)];

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;

      for (const p of particles) {
        p.vy   += 0.32;
        p.x    += p.vx;
        p.y    += p.vy;
        p.rot  += p.rotV;
        p.alpha = Math.max(0, p.alpha - 0.007);

        if (p.alpha > 0.01 && p.y < canvas.height + 60) {
          alive = true;
          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          ctx.restore();
        }
      }

      this.animFrame = alive ? requestAnimationFrame(draw) : null;
    };

    if (this.animFrame != null) cancelAnimationFrame(this.animFrame);
    draw();
  }

  // ── Win effects ───────────────────────────────────────────────────────────
  private launchWin(): void {
    switch (this.selectedWin) {
      case 'lightning': this.launchLightning(); break;
      case 'sparks':    this.launchSparks();    break;
      default:          this.launchConfetti();
    }
  }

  private ensureCanvas(): HTMLCanvasElement {
    if (!this.confCanvas) {
      this.confCanvas = document.createElement('canvas');
      this.confCanvas.style.cssText =
        'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999';
      document.body.appendChild(this.confCanvas);
    }
    const c = this.confCanvas;
    c.width  = window.innerWidth;
    c.height = window.innerHeight;
    return c;
  }

  // Midpoint-displacement lightning path
  private genLightning(
    x1: number, y1: number, x2: number, y2: number,
    rough: number, depth: number
  ): [number, number][] {
    if (depth === 0) return [[x1, y1], [x2, y2]];
    const mx = (x1 + x2) / 2 + (Math.random() - 0.5) * rough;
    const my = (y1 + y2) / 2 + (Math.random() - 0.5) * rough * 0.22;
    const L  = this.genLightning(x1, y1, mx, my, rough / 2, depth - 1);
    const R  = this.genLightning(mx, my, x2, y2, rough / 2, depth - 1);
    return [...L, ...R.slice(1)];
  }

  private launchLightning(): void {
    const canvas = this.ensureCanvas();
    const ctx    = canvas.getContext('2d')!;

    type Pts = [number, number][];
    interface Bolt { pts: Pts; branches: Pts[]; alpha: number; decay: number; }
    const bolts: Bolt[] = [];
    let flashAlpha = 0;

    const spawnBolt = () => {
      flashAlpha = Math.min(1, flashAlpha + 0.18);
      const x1 = canvas.width  * (0.08 + Math.random() * 0.84); // spread across top
      const y1 = 0;
      const x2 = x1 + (Math.random() - 0.5) * canvas.width * 0.4; // lateral drift
      const y2 = canvas.height * (0.38 + Math.random() * 0.42);    // 38–80% down
      const pts = this.genLightning(x1, y1, x2, y2, 150, 6);
      const branches: Pts[] = [];
      for (let b = 0; b < 3; b++) {
        const idx = Math.floor(pts.length * (0.2 + Math.random() * 0.6));
        const [bx, by] = pts[idx];
        branches.push(this.genLightning(
          bx, by,
          bx + (Math.random() - 0.5) * 110,
          by + (45 + Math.random() * 90),
          55, 4
        ));
      }
      bolts.push({ pts, branches, alpha: 1, decay: 0.022 + Math.random() * 0.012 });
    };

    // 6 bolts staggered across the top
    [0, 60, 130, 200, 270, 340].forEach(delay => {
      this.timeouts.push(setTimeout(() => spawnBolt(), delay));
    });

    const stroke = (pts: Pts, alpha: number, width: number, color: string, blur: number) => {
      if (pts.length < 2) return;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth   = width;
      ctx.shadowBlur  = blur;
      ctx.shadowColor = '#4a9eff';
      ctx.stroke();
      ctx.restore();
    };

    const endTime = performance.now() + 340 + 700;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = performance.now() < endTime;

      // Screen flash — decays over ~4 frames
      if (flashAlpha > 0.005) {
        ctx.fillStyle = `rgba(160, 210, 255, ${flashAlpha * 0.22})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        flashAlpha *= 0.72;
      }
      for (const bolt of bolts) {
        bolt.alpha = Math.max(0, bolt.alpha - bolt.decay);
        if (bolt.alpha < 0.01) continue;
        alive = true;
        const draw1 = (pts: Pts, aScale: number, wScale: number) => {
          const a = bolt.alpha * aScale;
          stroke(pts, a * 0.5, 4.5 * wScale, 'rgba(80,160,255,1)',   28);  // outer glow
          stroke(pts, a,       2.0 * wScale, 'rgba(140,200,255,1)',   10);  // bolt
          stroke(pts, a * 0.9, 0.5 * wScale, 'rgba(225,245,255,1)',    4);  // white core
        };
        draw1(bolt.pts, 1, 1);
        bolt.branches.forEach(b => draw1(b, 0.6, 0.55));
      }
      this.animFrame = alive ? requestAnimationFrame(draw) : null;
      if (!alive) ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    if (this.animFrame != null) cancelAnimationFrame(this.animFrame);
    draw();
  }

  private launchSparks(): void {
    const canvas = this.ensureCanvas();
    const ctx    = canvas.getContext('2d')!;

    // Wave 0 = gold (front), wave 1 = orange-red, wave 2 = deep red (back)
    const palettes = [
      ['#f0a500','#f89820','#ffd43b','#ffbf00','#ffe566'],
      ['#ff5500','#ff3300','#ff6600','#ff4400','#ff7700'],
      ['#cc0000','#aa0000','#bb1111','#dd2020','#991111'],
    ];

    interface Spark { x: number; y: number; vx: number; vy: number; r: number; color: string; alpha: number; }

    const makeBatch = (paletteIdx: number): Spark[] => {
      const pal = palettes[paletteIdx];
      const corners = [
        { x: canvas.width * 0.01, y: canvas.height * 0.97, base: -Math.PI * 0.38, spread: Math.PI * 0.5  }, // bottom-left  → up-right
        { x: canvas.width * 0.99, y: canvas.height * 0.97, base: -Math.PI * 0.62, spread: Math.PI * 0.5  }, // bottom-right → up-left
        { x: canvas.width * 0.01, y: canvas.height * 0.03, base:  Math.PI * 0.12, spread: Math.PI * 0.45 }, // top-left     → down-right
        { x: canvas.width * 0.99, y: canvas.height * 0.03, base:  Math.PI * 0.88, spread: Math.PI * 0.45 }, // top-right    → down-left
      ];
      return corners.flatMap(c =>
        Array.from({ length: 40 }, () => {
          const angle = c.base + (Math.random() - 0.5) * c.spread;
          const speed = 5 + Math.random() * 11;
          return {
            x: c.x, y: c.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            r:     1.5 + Math.random() * 2.5,
            color: pal[Math.floor(Math.random() * pal.length)],
            alpha: 0.8 + Math.random() * 0.2,
          };
        })
      );
    };

    // Batch 2 (red) added first so it draws behind; batch 0 (gold) last = in front
    const batches: Spark[][] = [[], [], makeBatch(2)];
    this.timeouts.push(setTimeout(() => { batches[1] = makeBatch(1); }, 150));
    this.timeouts.push(setTimeout(() => { batches[0] = makeBatch(0); }, 300));

    const keepAlive = Date.now() + 450;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = Date.now() < keepAlive;

      // Draw back-to-front: wave 2 first (red/behind), wave 0 last (gold/front)
      for (let bi = 2; bi >= 0; bi--) {
        for (const s of batches[bi]) {
          s.vy   += 0.18;
          s.x    += s.vx;
          s.y    += s.vy;
          s.vx   *= 0.986;
          s.alpha = Math.max(0, s.alpha - 0.007);
          if (s.alpha > 0.01 && s.y < canvas.height + 20) {
            alive = true;
            ctx.save();
            ctx.globalAlpha = s.alpha;
            ctx.shadowBlur  = 12;
            ctx.shadowColor = s.color;
            ctx.fillStyle   = s.color;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }
      }

      this.animFrame = alive ? requestAnimationFrame(draw) : null;
    };

    if (this.animFrame != null) cancelAnimationFrame(this.animFrame);
    draw();
  }

  // ── Language roller logic ─────────────────────────────────────────────────
  rollDice(): void {
    if (this.langRolling) return;
    this.langRolling = true;

    // Reset
    this.langs.forEach(l => { this.langCardState[l] = ''; this.langBarState[l] = ''; });
    this.langTrack = 'rolling';
    this.langFillWidth = '0%';
    this.langFillBg = 'transparent';

    const totalMs = 2400, stepMin = 40, stepMax = 600;
    let elapsed = 0, idx = 0;

    const tick = () => {
      this.langs.forEach((l, i) => {
        this.langCardState[l] = i === idx ? 'lit' : '';
        this.langBarState[l]  = i === idx ? 'lit' : '';
      });
      this.langLabel = this.langNames[this.langs[idx]];
      this.langFillWidth = Math.min((elapsed / totalMs) * 100, 100) + '%';
      this.langFillBg = this.langColors[this.langs[idx]] + '22';
      this.settings.playTick();

      idx = (idx + 1) % this.langs.length;
      const progress = elapsed / totalMs;
      const step = stepMin + (stepMax - stepMin) * (progress ** 3);
      elapsed += step;

      if (elapsed < totalMs) {
        this.timeouts.push(setTimeout(tick, step));
      } else {
        const winner = Math.floor(Math.random() * this.langs.length);
        const lang = this.langs[winner];
        this.langs.forEach(l => { this.langCardState[l] = ''; this.langBarState[l] = ''; });
        this.langCardState[lang] = 'won';
        this.langBarState[lang]  = 'selected';
        this.langFillWidth = '100%';
        this.langFillBg = this.langColors[lang] + '18';
        this.langLabel = this.langNames[lang];
        this.langTrack = 'done';
        this.langRolling = false;
        this.settings.playWin();
      }
    };

    tick();
  }

  // ── Combined roll ─────────────────────────────────────────────────────────
  get combinedTrack(): '' | 'rolling' | 'done' {
    if (this.langTrack === 'rolling' || this.patTrack === 'rolling') return 'rolling';
    if (this.langTrack === 'done'    && this.patTrack === 'done')    return 'done';
    return '';
  }

  get combinedLabel(): string {
    if (this.combinedTrack === 'done')    return `${this.patLabel}  ·  ${this.langLabel}`;
    if (this.combinedTrack === 'rolling') return this.patLabel || this.langLabel;
    return 'press to roll';
  }

  rollBoth(): void {
    if (this.langRolling || this.patRolling) return;
    this.rollDice();
    this.rollPattern();
    this.timeouts.push(setTimeout(() => this.launchWin(), 2500));
  }

  // ── Pattern roller logic ──────────────────────────────────────────────────
  rollPattern(): void {
    if (this.patRolling) return;

    const eligible = this.categories
      .flatMap(c => c.patterns)
      .filter(p => !p.done && !p.inWorks)
      .map(p => ({ ...p }));

    if (eligible.length === 0) return;

    // Fisher-Yates shuffle
    for (let i = eligible.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [eligible[i], eligible[j]] = [eligible[j], eligible[i]];
    }

    this.patRolling = true;
    this.litPatternId = null;
    this.wonPatternId = null;
    this.patTrack = 'rolling';
    this.patFillWidth = '0%';

    const totalMs = 2400, stepMin = 40, stepMax = 600;
    let elapsed = 0, idx = 0;

    const tick = () => {
      this.litPatternId = eligible[idx].id;
      this.patLabel = eligible[idx].name;
      this.patFillWidth = Math.min((elapsed / totalMs) * 100, 100) + '%';
      this.settings.playTick();

      idx = (idx + 1) % eligible.length;
      const progress = elapsed / totalMs;
      const step = stepMin + (stepMax - stepMin) * (progress ** 3);
      elapsed += step;

      if (elapsed < totalMs) {
        this.timeouts.push(setTimeout(tick, step));
      } else {
        const winner = Math.floor(Math.random() * eligible.length);
        this.litPatternId = null;
        this.wonPatternId = eligible[winner].id;
        this.patLabel = eligible[winner].name;
        this.patFillWidth = '100%';
        this.patTrack = 'done';
        this.patRolling = false;
      }
    };

    tick();
  }
}

import {
  Component, inject, HostListener,
  ViewChild, ElementRef, AfterViewInit, OnDestroy, NgZone
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { FooterComponent } from '../../shared/footer/footer.component';
import { SettingsService } from '../../services/settings.service';

interface CanvasRipple {
  pl: number;  pt: number;  pr: number;  pb: number;
  offset:      number;
  speed:       number;
  maxOffset:   number;
  opacity:     number;
  strokeWidth: number;
  wavy:        boolean;  // natural mode — edges drawn with sine wave
  phase:       number;   // per-ripple random starting phase
}

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [RouterLink, FooterComponent],
  templateUrl: './about.component.html',
  styleUrl: './about.component.css'
})
export class AboutComponent implements AfterViewInit, OnDestroy {

  readonly settings   = inject(SettingsService);
  private readonly ngZone = inject(NgZone);

  activeTab: 'developer' | 'project' = 'developer';

  zoomMe:      1 | 2 | 3 = 2;
  zoomExp:     1 | 2 | 3 = 2;
  zoomProject: 1 | 2 | 3 = 2;

  // Drag
  panelDx      = 0;
  panelDy      = 0;
  isDragging   = false;
  isLocked     = false;
  isResetting  = false;
  hasMovedOnce = false;
  rippleWeight: 1 | 2 | 3 = 2;
  rippleMode: 'analog' | 'natural' = 'analog';

  // Spring-physics bob (natural mode only)
  private bobY        = 0;
  private bobVelocity = 0;
  private bobK        = 0.12;   // spring stiffness (set per-weight on drop)
  private bobDamping  = 0.88;   // per-frame damping factor
  private bobFrame    = 0;

  private startX    = 0;
  private startY    = 0;
  private originDx  = 0;
  private originDy  = 0;
  private dragMoved = false;

  // Canvas
  @ViewChild('rippleCanvas') private canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('panelEl')      private panelRef!:  ElementRef<HTMLElement>;

  private canvas!:  HTMLCanvasElement;
  private ctx!:     CanvasRenderingContext2D;
  private ripples:  CanvasRipple[] = [];
  private animating  = false;
  private animFrame  = 0;
  private readonly onResize = () => this.resizeCanvas();

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  ngAfterViewInit(): void {
    this.canvas = this.canvasRef.nativeElement;
    this.ctx    = this.canvas.getContext('2d')!;
    this.resizeCanvas();
    this.ngZone.runOutsideAngular(() =>
      window.addEventListener('resize', this.onResize)
    );
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animFrame);
    cancelAnimationFrame(this.bobFrame);
    window.removeEventListener('resize', this.onResize);
  }

  private resizeCanvas(): void {
    this.canvas.width  = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  // ── Mode ─────────────────────────────────────────────────────────────────────

  setMode(mode: 'analog' | 'natural'): void {
    this.settings.playUiClick();
    this.rippleMode = mode;
    if (mode === 'analog') this.stopBob();
  }

  private stopBob(): void {
    cancelAnimationFrame(this.bobFrame);
    this.bobY        = 0;
    this.bobVelocity = 0;
    if (this.panelRef?.nativeElement) {
      this.panelRef.nativeElement.style.transform = '';
    }
  }

  // Launch a spring-damper bob whose amplitude decays naturally to rest.
  // Each upward peak fires a ripple. Physics parameters are weight-tuned:
  //   weight 1 → snappy, quickly dampened, ~2-3 small bobs
  //   weight 2 → medium decay, ~3-4 bobs
  //   weight 3 → softer spring, lighter damping, ~5-6 slow bobs
  private triggerBob(): void {
    cancelAnimationFrame(this.bobFrame);

    // k controls oscillation speed: T ≈ 2π/√k frames.
    // At 60 fps, k=0.004 → ~1.6 s/cycle, k=0.0025 → ~2.1 s/cycle.
    // damp is per-frame energy loss; 0.985–0.99 gives 2–4 visible bobs.
    const cfg = {
      1: { v0: 0.35, k: 0.004,  damp: 0.984 },
      2: { v0: 0.65, k: 0.003,  damp: 0.987 },
      3: { v0: 1.1,  k: 0.0025, damp: 0.990 },
    }[this.rippleWeight];

    this.bobY        = 0;
    this.bobVelocity = cfg.v0;
    this.bobK        = cfg.k;
    this.bobDamping  = cfg.damp;

    this.ngZone.runOutsideAngular(() => this.bobStep());
  }

  private bobStep(): void {
    const prevVelocity = this.bobVelocity;

    // Spring-damper integration
    this.bobVelocity += -this.bobK * this.bobY;
    this.bobVelocity *= this.bobDamping;
    this.bobY        += this.bobVelocity;

    // Apply directly to the inner panel element (no Angular binding needed)
    this.panelRef.nativeElement.style.transform = `translateY(${this.bobY}px)`;

    // Fire a ripple at each downward peak (velocity crosses zero positive→negative),
    // i.e. the moment the panel starts rebounding upward. Skip trivially tiny peaks.
    if (prevVelocity > 0 && this.bobVelocity <= 0 && Math.abs(this.bobY) > 0.5) {
      this.triggerNaturalRipple();
    }

    // Natural stop: both position and velocity are negligibly small
    if (Math.abs(this.bobVelocity) < 0.005 && Math.abs(this.bobY) < 0.05) {
      this.panelRef.nativeElement.style.transform = '';
      this.bobY        = 0;
      this.bobVelocity = 0;
      return;
    }

    this.bobFrame = requestAnimationFrame(() => this.bobStep());
  }

  // ── Drag ─────────────────────────────────────────────────────────────────────

  startDrag(e: MouseEvent): void {
    if (this.isLocked) return;
    this.isDragging = true;
    this.dragMoved  = false;
    this.startX     = e.clientX;
    this.startY     = e.clientY;
    this.originDx   = this.panelDx;
    this.originDy   = this.panelDy;
    e.preventDefault();
  }

  @HostListener('document:mousemove', ['$event'])
  onMove(e: MouseEvent): void {
    if (!this.isDragging) return;
    this.dragMoved    = true;
    this.hasMovedOnce = true;
    this.panelDx = this.originDx + (e.clientX - this.startX);
    this.panelDy = this.originDy + (e.clientY - this.startY);
  }

  @HostListener('document:mouseup')
  onUp(): void {
    if (this.isDragging && this.dragMoved) {
      if (this.rippleMode === 'analog') {
        this.triggerAnalogRipple();
      } else {
        this.triggerNaturalRipple();
        this.triggerBob();
      }
    }
    this.isDragging = false;
  }

  resetPanel(): void {
    this.isResetting  = true;
    this.panelDx      = 0;
    this.panelDy      = 0;
    this.hasMovedOnce = false;
    setTimeout(() => this.isResetting = false, 400);
  }

  // ── Canvas ripple ─────────────────────────────────────────────────────────────

  private triggerNaturalRipple(): void {
    const rect = this.panelRef.nativeElement.getBoundingClientRect();

    const wCfg = {
      1: { speed: 0.30, maxOffset: 60,  opacity: 0.38, sw: 0.60 },
      2: { speed: 0.45, maxOffset: 88,  opacity: 0.48, sw: 0.80 },
      3: { speed: 0.62, maxOffset: 125, opacity: 0.60, sw: 1.05 },
    }[this.rippleWeight];

    this.ngZone.runOutsideAngular(() => {
      // Primary ring
      this.ripples.push({
        pl: rect.left,  pt: rect.top,
        pr: rect.right, pb: rect.bottom,
        offset:      0,
        speed:       wCfg.speed,
        maxOffset:   wCfg.maxOffset,
        opacity:     wCfg.opacity,
        strokeWidth: wCfg.sw,
        wavy:        true,
        phase:       Math.random() * Math.PI * 2,
      });
      this.startLoop();

      // Echo ring — fires 150 ms later from the panel's live position
      // (which may have shifted slightly during the bob).
      // Starts at 0 offset so it naturally trails the primary by the
      // distance the primary has already travelled in those 150 ms.
      setTimeout(() => {
        if (!this.panelRef?.nativeElement) return;
        const live = this.panelRef.nativeElement.getBoundingClientRect();
        this.ripples.push({
          pl: live.left,  pt: live.top,
          pr: live.right, pb: live.bottom,
          offset:      0,
          speed:       wCfg.speed * 0.88,
          maxOffset:   wCfg.maxOffset * 0.68,
          opacity:     wCfg.opacity * 0.55,
          strokeWidth: wCfg.sw  * 0.70,
          wavy:        true,
          phase:       Math.random() * Math.PI * 2,
        });
        this.startLoop();
      }, 150);
    });
  }

  private triggerAnalogRipple(): void {
    const rect = this.panelRef.nativeElement.getBoundingClientRect();

    const cfgMap: Record<1 | 2 | 3, { speed: number; maxOffset: number; rings: number; sw: number; opacity: number }> = {
      1: { speed: 0.7, maxOffset: 100,  rings: 1, sw: 0.8, opacity: 0.55 },
      2: { speed: 1.1, maxOffset: 190,  rings: 2, sw: 1.1, opacity: 0.70 },
      3: { speed: 1.9, maxOffset: 360,  rings: 3, sw: 1.7, opacity: 0.90 },
    };
    const cfg = cfgMap[this.rippleWeight];

    this.ngZone.runOutsideAngular(() => {
      for (let i = 0; i < cfg.rings; i++) {
        setTimeout(() => {
          this.ripples.push({
            pl: rect.left,  pt: rect.top,
            pr: rect.right, pb: rect.bottom,
            offset: 0,
            speed:       cfg.speed,
            maxOffset:   cfg.maxOffset,
            opacity:     cfg.opacity,
            strokeWidth: cfg.sw,
            wavy:        false,
            phase:       0,
          });
          this.startLoop();
        }, i * 130);
      }
    });
  }

  private startLoop(): void {
    if (this.animating) return;
    this.animating = true;
    this.step();
  }

  // Draw each edge of a rectangle as a sine wave, using the same glare guards
  // as strokeClippedRect. `phase` drifts with r.offset so the wave propagates
  // outward. Each edge gets a π/2 phase shift so corners meet cleanly.
  private strokeWavyRect(
    ctx:   CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number,
    vw: number, vh: number,
    amp: number,
    phase: number
  ): void {
    const x2     = x + w;
    const y2     = y + h;
    const cycles = 3;   // sine cycles along each full edge
    const step   = 3;   // canvas pixels between sample points

    ctx.beginPath();

    // Top edge — wave in Y direction
    if (y >= 0 && y <= vh && !(x < 0 && x2 > vw)) {
      const lx = Math.max(x, 0), rx = Math.min(x2, vw);
      if (lx < rx) {
        const n = Math.ceil((rx - lx) / step);
        for (let i = 0; i <= n; i++) {
          const px = lx + (rx - lx) * (i / n);
          const t  = (px - x) / w;
          const py = y + Math.sin(t * Math.PI * 2 * cycles + phase) * amp;
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
      }
    }

    // Bottom edge — opposite phase so it mirrors the top
    if (y2 >= 0 && y2 <= vh && !(x < 0 && x2 > vw)) {
      const lx = Math.max(x, 0), rx = Math.min(x2, vw);
      if (lx < rx) {
        const n = Math.ceil((rx - lx) / step);
        for (let i = 0; i <= n; i++) {
          const px = lx + (rx - lx) * (i / n);
          const t  = (px - x) / w;
          const py = y2 + Math.sin(t * Math.PI * 2 * cycles + phase + Math.PI) * amp;
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
      }
    }

    // Left edge — wave in X direction
    if (x >= 0 && x <= vw && !(y < 0 && y2 > vh)) {
      const ty = Math.max(y, 0), by = Math.min(y2, vh);
      if (ty < by) {
        const n = Math.ceil((by - ty) / step);
        for (let i = 0; i <= n; i++) {
          const py = ty + (by - ty) * (i / n);
          const t  = (py - y) / h;
          const px = x + Math.sin(t * Math.PI * 2 * cycles + phase + Math.PI * 0.5) * amp;
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
      }
    }

    // Right edge
    if (x2 >= 0 && x2 <= vw && !(y < 0 && y2 > vh)) {
      const ty = Math.max(y, 0), by = Math.min(y2, vh);
      if (ty < by) {
        const n = Math.ceil((by - ty) / step);
        for (let i = 0; i <= n; i++) {
          const py = ty + (by - ty) * (i / n);
          const t  = (py - y) / h;
          const px = x2 + Math.sin(t * Math.PI * 2 * cycles + phase + Math.PI * 1.5) * amp;
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
      }
    }

    ctx.stroke();
  }

  // Draw only the visible segments of a rectangle edge-by-edge, suppressing
  // any segment whose two endpoints straddle the viewport on opposite sides.
  // Without this guard, a side clipped to [0, vw/vh] becomes a full-screen
  // line ("glare") when the ring has expanded past both opposing walls.
  private strokeClippedRect(
    ctx:  CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number,
    vw: number, vh: number
  ): void {
    const x2 = x + w;
    const y2 = y + h;
    ctx.beginPath();

    // Top edge — only if the edge line (y) is in-viewport AND the rect
    // hasn't passed both left AND right walls (which would make it a
    // full-width horizontal line).
    if (y >= 0 && y <= vh && !(x < 0 && x2 > vw)) {
      const lx = Math.max(x, 0), rx = Math.min(x2, vw);
      if (lx < rx) { ctx.moveTo(lx, y); ctx.lineTo(rx, y); }
    }
    // Bottom edge — same guard
    if (y2 >= 0 && y2 <= vh && !(x < 0 && x2 > vw)) {
      const lx = Math.max(x, 0), rx = Math.min(x2, vw);
      if (lx < rx) { ctx.moveTo(lx, y2); ctx.lineTo(rx, y2); }
    }
    // Left edge — only if x is in-viewport AND the rect hasn't passed
    // both top AND bottom walls (which would make it a full-height line).
    if (x >= 0 && x <= vw && !(y < 0 && y2 > vh)) {
      const ty = Math.max(y, 0), by = Math.min(y2, vh);
      if (ty < by) { ctx.moveTo(x, ty); ctx.lineTo(x, by); }
    }
    // Right edge — same guard
    if (x2 >= 0 && x2 <= vw && !(y < 0 && y2 > vh)) {
      const ty = Math.max(y, 0), by = Math.min(y2, vh);
      if (ty < by) { ctx.moveTo(x2, ty); ctx.lineTo(x2, by); }
    }

    ctx.stroke();
  }

  private step(): void {
    const ctx = this.ctx;
    const vw  = this.canvas.width;
    const vh  = this.canvas.height;

    ctx.clearRect(0, 0, vw, vh);

    for (const r of this.ripples) {
      r.offset  += r.speed;
      r.opacity -= (r.speed / r.maxOffset) * 0.9;
      if (r.opacity < 0) r.opacity = 0;
      if (r.opacity < 0.01) continue;

      const x = r.pl - r.offset;
      const y = r.pt - r.offset;
      const w = (r.pr - r.pl) + r.offset * 2;
      const h = (r.pb - r.pt) + r.offset * 2;

      ctx.lineWidth   = r.strokeWidth;
      ctx.strokeStyle = `rgba(72,148,255,${r.opacity})`;

      if (r.wavy) {
        // Natural mode — wavy edges, phase drifts outward as ring expands
        const amp   = 4;
        const phase = r.phase + r.offset * 0.05;
        const draw  = (rx: number, ry: number) =>
          this.strokeWavyRect(ctx, rx, ry, w, h, vw, vh, amp, phase);

        draw(x, y);
        if (x + w > vw) draw(2 * vw - (x + w), y);
        if (x < 0)      draw(-(x + w),          y);
        if (y + h > vh) draw(x, 2 * vh - (y + h));
        if (y < 0)      draw(x, -(y + h));
      } else {
        // Analog mode — clean straight edges
        const draw = (rx: number, ry: number) =>
          this.strokeClippedRect(ctx, rx, ry, w, h, vw, vh);

        draw(x, y);
        if (x + w > vw) draw(2 * vw - (x + w), y);
        if (x < 0)      draw(-(x + w),          y);
        if (y + h > vh) draw(x, 2 * vh - (y + h));
        if (y < 0)      draw(x, -(y + h));
      }
    }

    this.ripples = this.ripples.filter(r => r.opacity >= 0.01);

    if (this.ripples.length > 0) {
      this.animFrame = requestAnimationFrame(() => this.step());
    } else {
      this.animating = false;
      ctx.clearRect(0, 0, vw, vh);
    }
  }

  // ── Misc ─────────────────────────────────────────────────────────────────────

  clickTag(e: Event): void {
    this.settings.playUiClick();
    const el = e.currentTarget as HTMLElement;
    el.classList.add('lit');
    setTimeout(() => el.classList.remove('lit'), 350);
  }

  readonly powerWords: { word: string; color: string; pattern: string }[] = [
    { word: 'Compatibility', color: 'amber', pattern: 'Abstract Factory' },
    { word: 'Constant',      color: 'teal',  pattern: 'Abstract Factory' },
    { word: 'Familial',      color: 'pink',  pattern: 'Abstract Factory' },
    { word: 'Simplicity',    color: 'amber', pattern: 'Facade' },
    { word: 'Decoupling',    color: 'teal',  pattern: 'Facade' },
    { word: 'Orchestration', color: 'pink',  pattern: 'Facade' },
  ];

  // Core patterns-and-languages features
  readonly mainFeatures = [
    {
      num: '01',
      title: 'Pattern of the Day',
      body: 'One pattern is deterministically highlighted each day using a date-seeded hash. No server, no state. The same pattern shows on every device on the same day and resets silently at midnight.'
    },
    {
      num: '02',
      title: 'GoF Viewer',
      body: 'Select any of the 23 Gang of Four patterns and browse implementations across all six languages in a syntax-highlighted panel. Navigating from the Index pre-selects the pattern and scrolls straight to the code.'
    },
    {
      num: '03',
      title: 'Pattern Write-Ups',
      body: 'Every pattern page includes intent, participants, structural diagrams, consequences (strengths and weaknesses), complement pattern notes, and honest reflections from actually building the thing.'
    },
    {
      num: '04',
      title: 'Language Cheatsheets',
      body: 'Per-language reference pages covering syntax, keywords, OOP constructs, and idioms. Written from the perspective of someone context-switching between six languages and needing a fast, reliable refresher.'
    },
    {
      num: '05',
      title: 'Testing Sections',
      body: 'Every cheatsheet includes a dedicated testing chapter covering the canonical framework for that language — <a href="https://pytest.org" target="_blank" rel="noopener">pytest</a>, <a href="https://rspec.info" target="_blank" rel="noopener">RSpec</a>, <a href="https://junit.org/junit5" target="_blank" rel="noopener">JUnit 5</a>, <a href="https://xunit.net" target="_blank" rel="noopener">xUnit</a>, <a href="https://google.github.io/googletest" target="_blank" rel="noopener">Google Test</a>, and <a href="https://playwright.dev" target="_blank" rel="noopener">Playwright</a> (TypeScript). Each chapter covers setup, unit tests with fixtures and lifecycle hooks, mocking and test doubles, integration tests against real I/O, end-to-end tests, and coverage tooling.'
    },
    {
      num: '06',
      title: 'Section Navigator',
      body: 'Code files use a <code>// SECTION::</code> comment convention. The viewer parses these at load time and builds a sticky TOC sidebar, letting you jump to any structural block without scrolling the whole file.'
    },
    {
      num: '07',
      title: 'Output Panel',
      body: 'Each implementation ships with its captured console output displayed alongside the code. Both the code and output panels include a one-click copy button that confirms with a brief "✓ copied" state.'
    },
  ];

  // Secondary endeavours — interactive touches and easter eggs
  readonly secondaryFeatures = [
    {
      num: '01',
      title: 'Sound Engine',
      body: 'Three synthesised chord modes built on the Web Audio API: sine, arcade, and a D-minor chord. Every interaction (click, roll, win) fires a distinct audio cue. Volume is adjustable and persisted per session.'
    },
    {
      num: '02',
      title: 'Custom Cursor',
      body: 'A neon radial-gradient cursor positioned via JavaScript. Detects scrollbar zones through clientWidth comparison and deactivates automatically there, so the OS cursor takes over without a double-cursor conflict.'
    },
    {
      num: '03',
      title: 'Pattern Randomizer',
      body: 'A dice mechanic that pairs a random GoF pattern with a random language. An animated fill-bar visualises the roll, three configurable win effects play on result, and a chord stinger fires on each outcome.'
    },
    {
      num: '04',
      title: 'Draggable Panel',
      body: 'The About page lives inside a repositionable panel. Analog mode fires sharp rectangular rings on drop. Natural mode runs a spring-damper simulation: the panel bobs on water, emitting wavy-edged double rings on each upward peak. Weight, a spring-back reset, and a position lock are all exposed on the handle bar.'
    },
    {
      num: '05',
      title: 'Tabbed Code Panels',
      body: 'Multi-column cheatsheet cards gain an "All / Column" tab bar. Clicking a tab isolates that column to full width; clicking the column directly does the same. A distance threshold on mousedown/mouseup distinguishes a click from a text-selection drag so copying code is never interrupted. Each interaction fires a sound cue through the shared audio engine.'
    },
    {
      num: '06',
      title: 'Comment System',
      body: 'Each pattern has its own threaded comment section backed by PostgreSQL. Authentication is handled via GitHub or LinkedIn OAuth through Better Auth. Comments support rich text (bold, italic, code blocks, lists) via Quill, infinite reply threading capped at four visual levels, helpful/unhelpful voting with ratio-based sort order, and soft deletion. A server-side ban list silently discards flagged content without signalling the poster.'
    },
  ];

}

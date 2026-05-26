import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavComponent } from './shared/nav/nav.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavComponent],
  template: `
    <app-nav />
    <router-outlet />
  `
})
export class AppComponent implements OnInit, OnDestroy {

  // ── Neon cursor ───────────────────────────────────────────────────────────
  private dot:       HTMLElement | null = null;  // fixed 10px cursor
  private glow:      HTMLElement | null = null;  // glow layer behind it
  private cursorRaf: number | null = null;
  private cursorGlow = 0;
  private cursorVel  = 0;
  private lastMx     = 0;
  private lastMy     = 0;

  private readonly onMouseMove = (e: MouseEvent) => {
    const px = e.clientX + 'px';
    const py = e.clientY + 'px';
    if (this.dot)  { this.dot.style.left  = px; this.dot.style.top  = py; }
    if (this.glow) { this.glow.style.left = px; this.glow.style.top = py; }
    this.cursorVel = Math.hypot(e.clientX - this.lastMx, e.clientY - this.lastMy);
    this.lastMx = e.clientX;
    this.lastMy = e.clientY;
  };

  ngOnInit(): void {
    // Glow layer first (behind)
    this.glow = document.createElement('div');
    this.glow.className = 'neon-cursor-glow';
    document.body.appendChild(this.glow);

    // Dot on top
    this.dot = document.createElement('div');
    this.dot.className = 'neon-cursor';
    document.body.appendChild(this.dot);

    document.body.classList.add('neon-cursor-active');
    document.addEventListener('mousemove', this.onMouseMove);
    this.animateCursor();
  }

  ngOnDestroy(): void {
    document.removeEventListener('mousemove', this.onMouseMove);
    if (this.cursorRaf != null) cancelAnimationFrame(this.cursorRaf);
    this.dot?.remove();
    this.glow?.remove();
    document.body.classList.remove('neon-cursor-active');
  }

  private animateCursor(): void {
    const pal: [number, number, number][] = [
      [240, 165,   0],   // gold
      [ 78, 201, 176],   // teal
      [155,  89, 245],   // purple
      [ 74, 158, 255],   // blue
      [224,  92, 138],   // pink
    ];
    const cycleDur = 15000;

    const tick = () => {
      // Smooth color interpolation
      const t = (Date.now() % cycleDur) / cycleDur * pal.length;
      const i = Math.floor(t) % pal.length;
      const j = (i + 1) % pal.length;
      const f = t - Math.floor(t);
      const [r, g, b] = [0, 1, 2].map(ci =>
        Math.round(pal[i][ci] + (pal[j][ci] - pal[i][ci]) * f)
      );
      const hex  = `rgb(${r},${g},${b})`;
      const hexA = `rgba(${r},${g},${b},0.45)`;

      // Moving: rapidly kill glow. Still: very slowly grow radius only.
      this.cursorVel *= 0.78;
      if (this.cursorVel > 0.3) {
        this.cursorGlow *= 0.85;   // rapid decay toward 0 while moving
      } else {
        this.cursorGlow += 0.02;   // slow growth when still (~10s to reach max)
      }
      this.cursorGlow = Math.min(14, Math.max(0, this.cursorGlow));

      const g1 = Math.min(19, 6 + this.cursorGlow * 0.45);  // inner glow edge
      const g2 = Math.min(30, 6 + this.cursorGlow * 0.80);  // outer glow edge

      // Dot: fixed colour, never resizes
      if (this.dot) {
        this.dot.style.background = hex;
      }

      // Glow: transparent centre so dot shows through, halo extends outward
      if (this.glow) {
        this.glow.style.background =
          `radial-gradient(circle at center, ` +
          `transparent 0px, transparent 5px, ` +
          `${hexA} ${g1}px, ` +
          `transparent ${g2}px)`;
      }

      this.cursorRaf = requestAnimationFrame(tick);
    };
    tick();
  }
}

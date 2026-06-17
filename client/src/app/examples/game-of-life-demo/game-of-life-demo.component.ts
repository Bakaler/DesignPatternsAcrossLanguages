import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService } from '../../services/settings.service';

@Component({
  selector: 'app-game-of-life-demo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './game-of-life-demo.component.html',
  styleUrls: ['./game-of-life-demo.component.css'],
})
export class GameOfLifeDemoComponent implements OnInit, OnDestroy {
  readonly settings = inject(SettingsService);
  private readonly cdr = inject(ChangeDetectorRef);

  // Grid settings
  gridSize = 36;
  cellSize = 11; // pixels

  // Grid state
  grid: boolean[][] = [];
  generation = 0;
  isRunning = false;
  animationSpeed = 100; // ms between generations
  private animationId: number | null = null;
  private initialGrid: boolean[][] = []; // Saved state when play started
  private skipEvolveUntil = 0; // Timestamp until which to skip evolution after placement
  private wasRunningBeforeMouseDown = false; // Track if we paused during mousedown

  // Shape drawing
  shapeGrid: boolean[][] = [];
  shapeSize = 5;
  shapeOriginX = 0;
  shapeOriginY = 0;
  isShapePlacingMode = false;

  presets = [
    { name: 'Default', pattern: [[false, false, false, false, false], [false, false, false, false, false], [false, false, true, false, false], [false, false, false, false, false], [false, false, false, false, false]], originX: 2, originY: 2 },
    { name: 'Glider', pattern: [[false, false, true, false, false], [false, false, false, true, false], [false, true, true, true, false], [false, false, false, false, false], [false, false, false, false, false]], originX: 2, originY: 2 },
    { name: 'Blinker', pattern: [[false, false, false, false, false], [false, false, true, false, false], [false, false, true, false, false], [false, false, true, false, false], [false, false, false, false, false]], originX: 2, originY: 2 },
    { name: 'Block', pattern: [[false, false, false, false, false], [false, true, true, false, false], [false, true, true, false, false], [false, false, false, false, false], [false, false, false, false, false]], originX: 1, originY: 1 },
    { name: 'Tub', pattern: [[false, false, false, false, false], [false, false, true, false, false], [false, true, false, true, false], [false, false, true, false, false], [false, false, false, false, false]], originX: 2, originY: 2 },
    { name: 'Beehive', pattern: [[false, false, false, false, false], [false, false, true, true, false], [false, true, false, false, true], [false, false, true, true, false], [false, false, false, false, false]], originX: 2, originY: 2 },
    { name: 'Loaf', pattern: [[false, false, false, false, false], [false, true, true, false, false], [false, true, false, true, false], [false, false, true, false, false], [false, false, false, false, false]], originX: 2, originY: 2 },
    { name: 'Boat', pattern: [[false, false, false, false, false], [false, true, true, false, false], [false, true, false, true, false], [false, false, true, false, false], [false, false, false, false, false]], originX: 2, originY: 2 },
    { name: 'Pond', pattern: [[false, false, false, false, false], [false, false, true, true, false], [false, true, false, false, true], [false, false, true, true, false], [false, false, false, false, false]], originX: 2, originY: 2 },
    { name: 'LWSS', pattern: [[false, false, false, false, false], [false, true, false, false, true], [false, false, false, false, true], [false, true, false, true, true], [false, false, false, false, false]], originX: 2, originY: 2 },
  ];

  // Rules: [0-8] neighbors
  liveRules: boolean[] = [false, false, true, true, false, false, false, false, false]; // S23
  deadRules: boolean[] = [false, false, false, true, false, false, false, false, false]; // B3

  ngOnInit() {
    this.initializeGrid();
    this.initializeShape();
    document.addEventListener('keydown', (e) => this.onKeydown(e));
  }

  ngOnDestroy() {
    document.removeEventListener('keydown', (e) => this.onKeydown(e));
  }

  private onKeydown(e: KeyboardEvent) {
    if (e.key === '`') {
      e.preventDefault();
      this.toggleShapePlacingMode();
    }
  }

  initializeGrid() {
    this.grid = Array(this.gridSize)
      .fill(null)
      .map(() =>
        Array(this.gridSize)
          .fill(null)
          .map(() => Math.random() < 0.3)
      );
    this.generation = 0;
  }

  toggleCell(x: number, y: number) {
    if (this.isShapePlacingMode) {
      // In Place mode - just place, stay in mode
      this.placeShape(x, y);
    } else if (this.hasShapeContent()) {
      // Always place shape if one exists, even during runtime
      this.placeShape(x, y);
    } else {
      // Toggle individual cell only if no shape is loaded
      this.grid[y][x] = !this.grid[y][x];
      this.cdr.detectChanges();
    }
  }

  onGridMouseDown() {
    // Pause if running - do this immediately before any placement logic
    if (this.isRunning) {
      this.wasRunningBeforeMouseDown = true;
      this.stop();
    }
  }

  onGridMouseUp() {
    // Don't resume here - will resume in placeShape after placement completes
    // If no shape was placed, set a small timeout to resume
    setTimeout(() => {
      if (this.wasRunningBeforeMouseDown && !this.isRunning) {
        this.wasRunningBeforeMouseDown = false;
        this.play();
      }
    }, 50);
  }

  getNeighborCount(x: number, y: number): number {
    let count = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < this.gridSize && ny >= 0 && ny < this.gridSize) {
          if (this.grid[ny][nx]) count++;
        }
      }
    }
    return count;
  }

  evolve() {
    const newGrid = this.grid.map((row, y) =>
      row.map((cell, x) => {
        const neighbors = this.getNeighborCount(x, y);

        if (cell) {
          // Live cell: check liveRules[neighbors]
          return this.liveRules[neighbors];
        } else {
          // Dead cell: check deadRules[neighbors]
          return this.deadRules[neighbors];
        }
      })
    );

    this.grid = newGrid;
    this.generation++;
  }

  stepOnce() {
    if (this.isRunning) this.stop();
    this.evolve();
  }

  play() {
    if (this.isRunning) return;
    this.isRunning = true;
    // Save initial grid state for reset
    this.initialGrid = this.grid.map(row => [...row]);
    this.runAnimation();
  }

  stop() {
    this.isRunning = false;
    if (this.animationId !== null) {
      clearTimeout(this.animationId);
      this.animationId = null;
    }
  }

  reset() {
    this.stop();
    if (this.initialGrid.length > 0) {
      this.grid = this.initialGrid.map(row => [...row]);
      this.generation = 0;
    }
  }

  private runAnimation() {
    if (!this.isRunning) return;

    // Skip evolution if within grace period after placement
    if (Date.now() < this.skipEvolveUntil) {
      // Still in grace period, skip evolution
    } else {
      this.evolve();
    }

    this.animationId = window.setTimeout(() => this.runAnimation(), this.animationSpeed);
  }

  clear() {
    this.stop();
    this.grid = Array(this.gridSize)
      .fill(null)
      .map(() => Array(this.gridSize).fill(false));
    this.generation = 0;
  }

  randomize() {
    this.stop();
    this.initializeGrid();
  }

  toggleLiveRule(neighbors: number) {
    this.liveRules[neighbors] = !this.liveRules[neighbors];
  }

  toggleDeadRule(neighbors: number) {
    this.deadRules[neighbors] = !this.deadRules[neighbors];
  }

  applyRulePreset(preset: string) {
    // Reset all rules first
    this.liveRules = [false, false, false, false, false, false, false, false, false];
    this.deadRules = [false, false, false, false, false, false, false, false, false];

    switch (preset) {
      case 'conway':
        // B3/S23 - Classic Conway's Game of Life
        this.liveRules[2] = true;
        this.liveRules[3] = true;
        this.deadRules[3] = true;
        break;
      case 'highlife':
        // B36/S23 - HighLife
        this.liveRules[2] = true;
        this.liveRules[3] = true;
        this.deadRules[3] = true;
        this.deadRules[6] = true;
        break;
      case 'seeds':
        // B2/S - Seeds
        this.deadRules[2] = true;
        break;
      case 'coagulations':
        // B3/S235 - Coagulations
        this.liveRules[2] = true;
        this.liveRules[3] = true;
        this.liveRules[5] = true;
        this.deadRules[3] = true;
        break;
    }
  }

  getCellClass(x: number, y: number): string {
    return this.grid[y][x] ? 'alive' : 'dead';
  }

  getAliveCount(): number {
    return this.grid.reduce((sum, row) => sum + row.filter(c => c).length, 0);
  }

  getBPM(): number {
    // Convert milliseconds to BPM (beats per minute)
    // BPM = 60000 / animationSpeed
    return Math.round(60000 / this.animationSpeed);
  }

  setBPM(event: any): void {
    const input = event.target as HTMLInputElement;
    let bpm = parseInt(input.value, 10);

    // Clamp to valid range: 120-6000 BPM
    bpm = Math.max(120, Math.min(6000, bpm));

    // Convert BPM back to milliseconds
    // animationSpeed = 60000 / BPM
    this.animationSpeed = Math.max(10, Math.min(500, Math.round(60000 / bpm)));
  }

  // Shape drawing methods
  initializeShape(): void {
    this.shapeGrid = Array(this.shapeSize)
      .fill(null)
      .map(() => Array(this.shapeSize).fill(false));
  }

  toggleShapeCell(x: number, y: number, event?: MouseEvent): void {
    if (event?.ctrlKey) {
      this.shapeOriginX = x;
      this.shapeOriginY = y;
    } else {
      this.shapeGrid[y][x] = !this.shapeGrid[y][x];
    }
  }

  toggleShapePlacingMode(): void {
    this.isShapePlacingMode = !this.isShapePlacingMode;
  }

  hasShapeContent(): boolean {
    for (let sy = 0; sy < this.shapeSize; sy++) {
      for (let sx = 0; sx < this.shapeSize; sx++) {
        if (this.shapeGrid[sy][sx]) return true;
      }
    }
    return false;
  }

  placeShape(boardX: number, boardY: number): void {
    // Only place if shape has content
    if (!this.hasShapeContent()) return;

    // Create a completely new grid (like evolve does) to avoid race conditions
    const newGrid = this.grid.map(row => [...row]);

    let placed = false;
    for (let sy = 0; sy < this.shapeSize; sy++) {
      for (let sx = 0; sx < this.shapeSize; sx++) {
        if (!this.shapeGrid[sy][sx]) continue;

        const bx = boardX + (sx - this.shapeOriginX);
        const by = boardY + (sy - this.shapeOriginY);

        if (bx >= 0 && bx < this.gridSize && by >= 0 && by < this.gridSize) {
          newGrid[by][bx] = true;
          placed = true;
        }
      }
    }

    // Replace grid with new grid reference only if we placed something
    if (placed) {
      this.grid = newGrid;
      // Skip evolution for 0.1ms after placement - pause is instant
      this.skipEvolveUntil = Date.now() + 0.1;
      // Force change detection so the grid renders immediately
      this.cdr.detectChanges();
      // Resume animation after placement completes
      if (this.wasRunningBeforeMouseDown) {
        this.wasRunningBeforeMouseDown = false;
        this.play();
      }
    }
  }

  clearShape(): void {
    this.initializeShape();
  }

  setShapeOrigin(x: number, y: number): void {
    this.shapeOriginX = x;
    this.shapeOriginY = y;
  }

  getShapeCellClass(x: number, y: number): string {
    return this.shapeGrid[y][x] ? 'alive' : 'dead';
  }

  loadPreset(preset: any): void {
    this.shapeGrid = preset.pattern.map((row: boolean[]) => [...row]);
    this.shapeOriginX = preset.originX;
    this.shapeOriginY = preset.originY;
  }
}

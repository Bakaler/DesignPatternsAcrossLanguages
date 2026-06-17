// ============================================================
//  Strategy Pattern: Game of Life
//  Run: npx ts-node typescript.ts
// ============================================================
//
//  Participants
//  ────────────────────────────────────────────────────────
//  Strategy          LifeRule
//  Concrete Strategies CellRule (composite rule holder)
//  Context           GameOfLife
//  Client            Demo
//
//  Problem
//  ────────────────────────────────────────────────────────
//  Game of Life's evolution depends on rules. Different
//  rulesets (Conway, HighLife, Seeds, etc.) use the same
//  core algorithm but different decision logic. Adding new
//  rulesets means new subclasses or hardcoded conditionals.
//
//  Solution: Strategy Pattern
//  ────────────────────────────────────────────────────────
//  Encapsulate rule logic in LifeRule strategies. GameOfLife
//  uses a ruleset (collection of rules) to evolve the grid.
//  Rules are interchangeable and composable at runtime.
//
//  Consequences demonstrated
//  ────────────────────────────────────────────────────────
//  Interchangeable algorithms    swap rulesets dynamically
//  Avoids subclass explosion     no *_Conway, *_HighLife
//  Open/Closed principle         new rules without changes
//  Composition over inheritance  rules are composed, not inherited
// ============================================================

// SECTION:: Rule Interface
// ═════════════════════════════════════════════════════════════

export interface LifeRule {
  outcome(aliveNeighbors: number, isCurrentlyAlive: boolean): boolean;
}

// SECTION:: Cell Rules (Concrete Strategies)
// ═════════════════════════════════════════════════════════════

export class SurvivalRule implements LifeRule {
  private validNeighbors: Set<number>;

  constructor(validNeighbors: number[]) {
    this.validNeighbors = new Set(validNeighbors);
  }

  outcome(aliveNeighbors: number, isCurrentlyAlive: boolean): boolean {
    if (!isCurrentlyAlive) return false;
    return this.validNeighbors.has(aliveNeighbors);
  }
}

export class BirthRule implements LifeRule {
  private validNeighbors: Set<number>;

  constructor(validNeighbors: number[]) {
    this.validNeighbors = new Set(validNeighbors);
  }

  outcome(aliveNeighbors: number, isCurrentlyAlive: boolean): boolean {
    if (isCurrentlyAlive) return false;
    return this.validNeighbors.has(aliveNeighbors);
  }
}

// SECTION:: Ruleset (Collection of Strategies)
// ═════════════════════════════════════════════════════════════

export class Ruleset {
  private rules: LifeRule[] = [];

  addRule(rule: LifeRule): void {
    this.rules.push(rule);
  }

  removeRule(rule: LifeRule): void {
    this.rules = this.rules.filter(r => r !== rule);
  }

  getRules(): LifeRule[] {
    return [...this.rules];
  }

  decide(aliveNeighbors: number, isCurrentlyAlive: boolean): boolean {
    return this.rules.some(rule => rule.outcome(aliveNeighbors, isCurrentlyAlive));
  }

  clear(): void {
    this.rules = [];
  }
}

// SECTION:: Game of Life (Context)
// ═════════════════════════════════════════════════════════════

export interface CellState {
  x: number;
  y: number;
  alive: boolean;
  neighbors: number;
}

export class GameOfLife {
  private grid: boolean[][];
  private width: number;
  private height: number;
  private ruleset: Ruleset;
  private generation: number = 0;

  constructor(width: number, height: number, ruleset: Ruleset) {
    this.width = width;
    this.height = height;
    this.ruleset = ruleset;
    this.grid = Array(height)
      .fill(null)
      .map(() => Array(width).fill(false));
  }

  setRuleset(ruleset: Ruleset): void {
    this.ruleset = ruleset;
  }

  getRuleset(): Ruleset {
    return this.ruleset;
  }

  getGeneration(): number {
    return this.generation;
  }

  setCellAlive(x: number, y: number, alive: boolean): void {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      this.grid[y][x] = alive;
    }
  }

  getCellAlive(x: number, y: number): boolean {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;
    return this.grid[y][x];
  }

  private countNeighbors(x: number, y: number): number {
    let count = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        if (this.getCellAlive(x + dx, y + dy)) count++;
      }
    }
    return count;
  }

  evolve(): void {
    const nextGrid = this.grid.map((row, y) =>
      row.map((cell, x) => {
        const aliveNeighbors = this.countNeighbors(x, y);
        return this.ruleset.decide(aliveNeighbors, cell);
      })
    );
    this.grid = nextGrid;
    this.generation++;
  }

  getGrid(): boolean[][] {
    return this.grid.map(row => [...row]);
  }

  getState(): CellState[] {
    const states: CellState[] = [];
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        states.push({
          x,
          y,
          alive: this.grid[y][x],
          neighbors: this.countNeighbors(x, y),
        });
      }
    }
    return states;
  }

  clear(): void {
    this.grid = Array(this.height)
      .fill(null)
      .map(() => Array(this.width).fill(false));
    this.generation = 0;
  }

  // Random population
  randomize(fillRatio: number = 0.3): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.grid[y][x] = Math.random() < fillRatio;
      }
    }
  }
}

// SECTION:: Preset Rulesets
// ═════════════════════════════════════════════════════════════

export function createConwayRuleset(): Ruleset {
  const ruleset = new Ruleset();
  ruleset.addRule(new SurvivalRule([2, 3]));
  ruleset.addRule(new BirthRule([3]));
  return ruleset;
}

export function createHighLifeRuleset(): Ruleset {
  const ruleset = new Ruleset();
  ruleset.addRule(new SurvivalRule([2, 3]));
  ruleset.addRule(new BirthRule([3, 6]));
  return ruleset;
}

export function createSeedsRuleset(): Ruleset {
  const ruleset = new Ruleset();
  ruleset.addRule(new BirthRule([2]));
  return ruleset;
}

// SECTION:: Demo
function main() {
  console.log('Game of Life — Strategy Pattern Demo\n');

  const game = new GameOfLife(5, 5, createConwayRuleset());
  game.randomize(0.4);

  console.log('Initial grid (Conway rules):');
  printGrid(game.getGrid());
  console.log();

  for (let i = 0; i < 3; i++) {
    game.evolve();
    console.log(`Generation ${game.getGeneration()} (Conway):`);
    printGrid(game.getGrid());
    console.log();
  }

  // Switch to HighLife strategy
  console.log('Switching to HighLife rules...\n');
  game.setRuleset(createHighLifeRuleset());
  game.clear();
  game.randomize(0.4);

  console.log('Initial grid (HighLife rules):');
  printGrid(game.getGrid());
  console.log();

  for (let i = 0; i < 3; i++) {
    game.evolve();
    console.log(`Generation ${game.getGeneration()} (HighLife):`);
    printGrid(game.getGrid());
    console.log();
  }

  console.log('Strategy pattern allows seamless ruleset swapping.');
  console.log('Same grid, different evolution rules, different outcomes.');
}

function printGrid(grid: boolean[][]): void {
  for (const row of grid) {
    console.log(
      row.map(cell => (cell ? '█' : '·')).join(' ')
    );
  }
}

main();

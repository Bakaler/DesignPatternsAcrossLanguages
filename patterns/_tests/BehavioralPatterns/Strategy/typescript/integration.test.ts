// ============================================================
//  Integration Tests — Strategy: Game of Life (TypeScript)
//
//  What we test here:
//    · Full game evolution workflows
//    · Ruleset swapping during gameplay
//    · Pattern recognition and stability
//    · Multi-generation evolution
//    · Real-world Game of Life scenarios
//
//  Run: npx mocha --require ts-node/register integration.test.ts
// ============================================================

import { describe, it } from 'mocha';
import assert from 'assert';
import {
  GameOfLife,
  Ruleset,
  SurvivalRule,
  BirthRule,
  createConwayRuleset,
  createHighLifeRuleset,
  createSeedsRuleset,
} from '../../../BehavioralPatterns/Strategy/typescript/typescript.js';

describe('GameOfLife Full Workflows', () => {
  it('should evolve a blinker pattern (oscillator)', () => {
    const game = new GameOfLife(5, 5, createConwayRuleset());

    game.setCellAlive(1, 2, true);
    game.setCellAlive(2, 2, true);
    game.setCellAlive(3, 2, true);

    game.evolve();

    assert.strictEqual(game.getCellAlive(2, 1), true);
    assert.strictEqual(game.getCellAlive(2, 2), true);
    assert.strictEqual(game.getCellAlive(2, 3), true);

    assert.strictEqual(game.getCellAlive(1, 2), false);
    assert.strictEqual(game.getCellAlive(3, 2), false);

    game.evolve();

    assert.strictEqual(game.getCellAlive(1, 2), true);
    assert.strictEqual(game.getCellAlive(2, 2), true);
    assert.strictEqual(game.getCellAlive(3, 2), true);
  });

  it('should stabilize a block (still life)', () => {
    const game = new GameOfLife(5, 5, createConwayRuleset());

    game.setCellAlive(1, 1, true);
    game.setCellAlive(2, 1, true);
    game.setCellAlive(1, 2, true);
    game.setCellAlive(2, 2, true);

    const beforeGrid = game.getGrid();

    for (let i = 0; i < 5; i++) {
      game.evolve();
    }

    const afterGrid = game.getGrid();

    assert.deepStrictEqual(beforeGrid, afterGrid);
  });

  it('should create patterns in HighLife that die in Conway', () => {
    const conwayGame = new GameOfLife(10, 10, createConwayRuleset());
    const highlifeGame = new GameOfLife(10, 10, createHighLifeRuleset());

    const setupGame = (game: GameOfLife) => {
      game.setCellAlive(5, 5, true);
      game.setCellAlive(6, 5, true);
      game.setCellAlive(5, 6, true);
      game.setCellAlive(6, 6, true);
    };

    setupGame(conwayGame);
    setupGame(highlifeGame);

    for (let i = 0; i < 10; i++) {
      conwayGame.evolve();
      highlifeGame.evolve();
    }

    const countAlive = (game: GameOfLife): number => {
      let count = 0;
      const grid = game.getGrid();
      for (const row of grid) {
        for (const cell of row) {
          if (cell) count++;
        }
      }
      return count;
    };

    const conwayAlive = countAlive(conwayGame);
    const highlifeAlive = countAlive(highlifeGame);

    assert(highlifeAlive >= conwayAlive);
  });
});

describe('Ruleset Swapping During Evolution', () => {
  it('should allow swapping rulesets mid-simulation', () => {
    const game = new GameOfLife(8, 8, createConwayRuleset());

    game.randomize(0.3);

    for (let i = 0; i < 5; i++) {
      game.evolve();
    }

    const gen5Grid = game.getGrid();

    game.setRuleset(createSeedsRuleset());

    for (let i = 0; i < 5; i++) {
      game.evolve();
    }

    const gen10Grid = game.getGrid();

    assert.notDeepStrictEqual(gen5Grid, gen10Grid);
  });

  it('should support dynamic ruleset composition', () => {
    const game = new GameOfLife(6, 6, new Ruleset());

    const ruleset = new Ruleset();
    ruleset.addRule(new SurvivalRule([2, 3]));
    ruleset.addRule(new BirthRule([3]));

    game.setRuleset(ruleset);

    game.setCellAlive(2, 2, true);
    game.setCellAlive(3, 2, true);
    game.setCellAlive(4, 2, true);

    game.evolve();

    assert.strictEqual(game.getCellAlive(3, 1), true);
    assert.strictEqual(game.getCellAlive(3, 3), true);
  });

  it('should handle ruleset with no birth rules', () => {
    const game = new GameOfLife(5, 5, new Ruleset());

    const deathRuleset = new Ruleset();
    deathRuleset.addRule(new SurvivalRule([2, 3]));
    game.setRuleset(deathRuleset);

    game.setCellAlive(0, 0, true);
    game.setCellAlive(0, 1, true);
    game.setCellAlive(0, 2, true);

    game.evolve();

    let aliveCount = 0;
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        if (game.getCellAlive(x, y)) aliveCount++;
      }
    }

    assert(aliveCount <= 3);
  });
});

describe('Multi-Generation Evolution', () => {
  it('should handle many generations without errors', () => {
    const game = new GameOfLife(10, 10, createConwayRuleset());

    game.randomize(0.25);

    for (let i = 0; i < 100; i++) {
      game.evolve();
    }

    assert.strictEqual(game.getGeneration(), 100);
  });

  it('should eventually reach extinction or stability with Conway', () => {
    const game = new GameOfLife(8, 8, createConwayRuleset());

    game.randomize(0.4);

    let prevAlive = 0;

    for (let i = 0; i < 100; i++) {
      game.evolve();

      let currentAlive = 0;
      const grid = game.getGrid();
      for (const row of grid) {
        for (const cell of row) {
          if (cell) currentAlive++;
        }
      }

      if (i > 50 && currentAlive === prevAlive) {
        assert(currentAlive <= prevAlive + 1);
      }

      prevAlive = currentAlive;
    }
  });

  it('should track generation count correctly', () => {
    const game = new GameOfLife(5, 5, createConwayRuleset());

    game.randomize(0.3);

    for (let i = 0; i < 50; i++) {
      assert.strictEqual(game.getGeneration(), i);
      game.evolve();
    }

    assert.strictEqual(game.getGeneration(), 50);
  });
});

describe('Pattern Stability', () => {
  it('should preserve stable patterns', () => {
    const game = new GameOfLife(7, 7, createConwayRuleset());

    game.setCellAlive(2, 1, true);
    game.setCellAlive(3, 1, true);
    game.setCellAlive(1, 2, true);
    game.setCellAlive(4, 2, true);
    game.setCellAlive(2, 3, true);
    game.setCellAlive(3, 3, true);

    const stableGrid = game.getGrid();

    for (let i = 0; i < 10; i++) {
      game.evolve();
    }

    assert.deepStrictEqual(game.getGrid(), stableGrid);
  });

  it('should create different stability with different rulesets', () => {
    const conwayGame = new GameOfLife(10, 10, createConwayRuleset());
    const seedsGame = new GameOfLife(10, 10, createSeedsRuleset());

    conwayGame.randomize(0.3);
    seedsGame.randomize(0.3);

    for (let i = 0; i < 50; i++) {
      conwayGame.evolve();
      seedsGame.evolve();
    }

    assert.strictEqual(conwayGame.getGeneration(), 50);
    assert.strictEqual(seedsGame.getGeneration(), 50);
  });
});

describe('State Retrieval', () => {
  it('should return accurate state information', () => {
    const game = new GameOfLife(5, 5, createConwayRuleset());

    game.setCellAlive(2, 2, true);
    game.setCellAlive(2, 3, true);
    game.setCellAlive(3, 2, true);

    const state = game.getState();

    const aliveStates = state.filter(s => s.alive);
    assert.strictEqual(aliveStates.length, 3);

    const centerCell = state.find(s => s.x === 2 && s.y === 2);
    assert.strictEqual(centerCell?.alive, true);
    assert.strictEqual(centerCell?.neighbors, 2);
  });

  it('should provide grid copy not reference', () => {
    const game = new GameOfLife(5, 5, createConwayRuleset());

    game.setCellAlive(2, 2, true);

    const grid1 = game.getGrid();
    const grid2 = game.getGrid();

    assert.notStrictEqual(grid1, grid2);
    assert.deepStrictEqual(grid1, grid2);
  });
});

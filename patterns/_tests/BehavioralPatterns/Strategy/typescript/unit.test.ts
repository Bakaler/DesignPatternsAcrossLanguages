// ============================================================
//  Unit Tests — Strategy: Game of Life (TypeScript)
//
//  What we test here:
//    · Rule creation and basic behavior
//    · Rule application logic
//    · Ruleset composition
//    · Game of Life grid operations
//    · Neighbor counting accuracy
//
//  Run: npx mocha --require ts-node/register unit.test.ts
// ============================================================

import { describe, it } from 'mocha';
import assert from 'assert';
import {
  SurvivalRule,
  BirthRule,
  Ruleset,
  GameOfLife,
  createConwayRuleset,
  createHighLifeRuleset,
  createSeedsRuleset,
} from '../../../BehavioralPatterns/Strategy/typescript/typescript.js';

describe('SurvivalRule', () => {
  it('should identify live cells that survive', () => {
    const rule = new SurvivalRule([2, 3]);

    assert.strictEqual(rule.outcome(2, true), true);
    assert.strictEqual(rule.outcome(3, true), true);
    assert.strictEqual(rule.outcome(1, true), false);
    assert.strictEqual(rule.outcome(4, true), false);
  });

  it('should not affect dead cells', () => {
    const rule = new SurvivalRule([2, 3]);

    assert.strictEqual(rule.outcome(2, false), false);
    assert.strictEqual(rule.outcome(3, false), false);
  });

  it('should handle no survival neighbors', () => {
    const rule = new SurvivalRule([]);

    assert.strictEqual(rule.outcome(0, true), false);
    assert.strictEqual(rule.outcome(8, true), false);
  });

  it('should handle all survival neighbors', () => {
    const rule = new SurvivalRule([0, 1, 2, 3, 4, 5, 6, 7, 8]);

    for (let i = 0; i <= 8; i++) {
      assert.strictEqual(rule.outcome(i, true), true);
    }
  });
});

describe('BirthRule', () => {
  it('should identify dead cells that are born', () => {
    const rule = new BirthRule([3]);

    assert.strictEqual(rule.outcome(3, false), true);
    assert.strictEqual(rule.outcome(2, false), false);
    assert.strictEqual(rule.outcome(4, false), false);
  });

  it('should not affect live cells', () => {
    const rule = new BirthRule([3]);

    assert.strictEqual(rule.outcome(3, true), false);
    assert.strictEqual(rule.outcome(2, true), false);
  });

  it('should handle multiple birth neighbors', () => {
    const rule = new BirthRule([3, 6]);

    assert.strictEqual(rule.outcome(3, false), true);
    assert.strictEqual(rule.outcome(6, false), true);
    assert.strictEqual(rule.outcome(2, false), false);
    assert.strictEqual(rule.outcome(4, false), false);
  });

  it('should handle no birth neighbors', () => {
    const rule = new BirthRule([]);

    assert.strictEqual(rule.outcome(0, false), false);
    assert.strictEqual(rule.outcome(8, false), false);
  });
});

describe('Ruleset', () => {
  it('should add and execute rules', () => {
    const ruleset = new Ruleset();
    const survival = new SurvivalRule([2, 3]);
    const birth = new BirthRule([3]);

    ruleset.addRule(survival);
    ruleset.addRule(birth);

    assert.strictEqual(ruleset.decide(2, true), true);
    assert.strictEqual(ruleset.decide(3, false), true);
    assert.strictEqual(ruleset.decide(1, true), false);
  });

  it('should support rule removal', () => {
    const ruleset = new Ruleset();
    const rule = new SurvivalRule([2, 3]);

    ruleset.addRule(rule);
    assert.strictEqual(ruleset.decide(2, true), true);

    ruleset.removeRule(rule);
    assert.strictEqual(ruleset.decide(2, true), false);
  });

  it('should use OR logic for multiple rules', () => {
    const ruleset = new Ruleset();

    ruleset.addRule(new SurvivalRule([2]));
    ruleset.addRule(new BirthRule([3]));

    assert.strictEqual(ruleset.decide(2, true), true);
    assert.strictEqual(ruleset.decide(3, false), true);
    assert.strictEqual(ruleset.decide(3, true), false);
  });

  it('should allow clearing all rules', () => {
    const ruleset = new Ruleset();

    ruleset.addRule(new SurvivalRule([2, 3]));
    ruleset.addRule(new BirthRule([3]));

    assert.strictEqual(ruleset.getRules().length, 2);

    ruleset.clear();

    assert.strictEqual(ruleset.getRules().length, 0);
    assert.strictEqual(ruleset.decide(2, true), false);
  });
});

describe('GameOfLife', () => {
  it('should initialize with dimensions', () => {
    const game = new GameOfLife(10, 10, new Ruleset());

    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        assert.strictEqual(game.getCellAlive(x, y), false);
      }
    }
  });

  it('should toggle cells', () => {
    const game = new GameOfLife(5, 5, new Ruleset());

    assert.strictEqual(game.getCellAlive(2, 2), false);

    game.setCellAlive(2, 2, true);
    assert.strictEqual(game.getCellAlive(2, 2), true);

    game.setCellAlive(2, 2, false);
    assert.strictEqual(game.getCellAlive(2, 2), false);
  });

  it('should count neighbors correctly', () => {
    const game = new GameOfLife(5, 5, new Ruleset());

    game.setCellAlive(1, 1, true);
    game.setCellAlive(2, 1, true);
    game.setCellAlive(3, 1, true);

    const state = game.getState();
    const centerState = state.find(s => s.x === 2 && s.y === 2);
    assert.strictEqual(centerState?.neighbors, 3);
  });

  it('should handle out-of-bounds neighbor queries', () => {
    const game = new GameOfLife(3, 3, new Ruleset());

    game.setCellAlive(0, 0, true);

    const state = game.getState();
    const cornerState = state.find(s => s.x === 0 && s.y === 0);
    assert.strictEqual(cornerState?.neighbors, 1);
  });

  it('should evolve with custom ruleset', () => {
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
  });

  it('should support ruleset swapping', () => {
    const game = new GameOfLife(5, 5, createConwayRuleset());

    game.setCellAlive(2, 2, true);
    game.setCellAlive(2, 3, true);

    const conwayRuleset = game.getRuleset();

    game.evolve();
    assert.strictEqual(game.getGeneration(), 1);

    game.setRuleset(createSeedsRuleset());
    assert.notStrictEqual(game.getRuleset(), conwayRuleset);

    game.evolve();
    assert.strictEqual(game.getGeneration(), 2);
  });

  it('should track generation count', () => {
    const game = new GameOfLife(5, 5, createConwayRuleset());

    assert.strictEqual(game.getGeneration(), 0);

    game.evolve();
    assert.strictEqual(game.getGeneration(), 1);

    game.evolve();
    assert.strictEqual(game.getGeneration(), 2);
  });

  it('should clear grid and reset generation', () => {
    const game = new GameOfLife(5, 5, createConwayRuleset());

    game.setCellAlive(2, 2, true);
    game.evolve();

    assert.strictEqual(game.getGeneration(), 1);

    game.clear();

    assert.strictEqual(game.getGeneration(), 0);
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        assert.strictEqual(game.getCellAlive(x, y), false);
      }
    }
  });

  it('should randomize grid', () => {
    const game = new GameOfLife(10, 10, new Ruleset());

    game.randomize(0.5);

    let aliveCount = 0;
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        if (game.getCellAlive(x, y)) aliveCount++;
      }
    }

    assert(aliveCount > 0);
    assert(aliveCount < 100);
  });
});

describe('Preset Rulesets', () => {
  it('should create Conway ruleset', () => {
    const ruleset = createConwayRuleset();

    assert.strictEqual(ruleset.decide(2, true), true);
    assert.strictEqual(ruleset.decide(3, true), true);
    assert.strictEqual(ruleset.decide(1, true), false);
    assert.strictEqual(ruleset.decide(3, false), true);
  });

  it('should create HighLife ruleset', () => {
    const ruleset = createHighLifeRuleset();

    assert.strictEqual(ruleset.decide(2, true), true);
    assert.strictEqual(ruleset.decide(3, false), true);
    assert.strictEqual(ruleset.decide(6, false), true);
  });

  it('should create Seeds ruleset', () => {
    const ruleset = createSeedsRuleset();

    assert.strictEqual(ruleset.decide(2, false), true);
    assert.strictEqual(ruleset.decide(0, true), false);
    assert.strictEqual(ruleset.decide(8, true), false);
  });
});

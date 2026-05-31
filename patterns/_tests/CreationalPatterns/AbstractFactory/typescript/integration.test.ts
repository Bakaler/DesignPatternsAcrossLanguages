// ============================================================
//  Integration Tests — Abstract Factory: Biome World Builder
//
//  What we test here:
//    · Real factory singletons produce correct, consistent output
//    · WorldGenerator generates the full product pipeline end-to-end
//    · Swapping the factory changes every product (terrain + enemies + weather + loot)
//    · Product families stay isolated (no cross-biome contamination)
//    · Prototype registration at runtime propagates into the next generation
//
//  No stubs. All concrete classes interact exactly as in production.
//
//  Run: npx mocha --require ts-node/register integration.test.ts
// ============================================================

// SECTION:: Imports
import { describe, it, before } from 'mocha';
import assert from 'assert';
import { captureOutput, findMissing } from '../../../_helpers/typescript/helpers';
import {
  DesertBiomeKit,
  ArcticBiomeKit,
  ForestBiomeKit,
  WorldGenerator,
} from '../../../../CreationalPatterns/AbstractFactory/typescript/typescript';

// SECTION:: WorldGenerator — Desert Integration
describe('WorldGenerator — Desert Biome', () => {
  let lines: string[];

  before(() => {
    lines = captureOutput(() => new WorldGenerator(DesertBiomeKit.getInstance()).generate());
  });

  it('output contains desert terrain name', () => {
    assert.ok(lines.some(l => l.includes('Sand Dunes')));
  });

  it('output contains all 3 default desert enemies', () => {
    assert.strictEqual(findMissing(lines, ['Scorpion', 'Sand Worm', 'Desert Bandit']), null);
  });

  it('output contains Sandstorm weather', () => {
    assert.ok(lines.some(l => l.includes('Sandstorm')));
  });

  it('output contains desert loot table name', () => {
    assert.ok(lines.some(l => l.includes('Desert Loot Table')));
  });
});

// SECTION:: WorldGenerator — Arctic & Forest Integration
describe('WorldGenerator — Arctic Biome', () => {
  let lines: string[];

  before(() => {
    lines = captureOutput(() => new WorldGenerator(ArcticBiomeKit.getInstance()).generate());
  });

  it('output contains Frozen Tundra terrain', () => {
    assert.ok(lines.some(l => l.includes('Frozen Tundra')));
  });

  it('output contains all 3 arctic enemies', () => {
    assert.strictEqual(findMissing(lines, ['Polar Bear', 'Ice Wolf', 'Frost Troll']), null);
  });

  it('output contains Blizzard weather', () => {
    assert.ok(lines.some(l => l.includes('Blizzard')));
  });
});

describe('WorldGenerator — Forest Biome', () => {
  let lines: string[];

  before(() => {
    lines = captureOutput(() => new WorldGenerator(ForestBiomeKit.getInstance()).generate());
  });

  it('output contains Dense Forest Floor terrain', () => {
    assert.ok(lines.some(l => l.includes('Dense Forest Floor')));
  });

  it('output contains all 3 forest enemies', () => {
    assert.strictEqual(findMissing(lines, ['Wolf', 'Wild Boar', 'Forest Bandit']), null);
  });
});

// SECTION:: Product Family Consistency
describe('Product Family Consistency', () => {
  it('swapping factory changes every part of the output', () => {
    const desert = captureOutput(() => new WorldGenerator(DesertBiomeKit.getInstance()).generate()).join('\n');
    const arctic  = captureOutput(() => new WorldGenerator(ArcticBiomeKit.getInstance()).generate()).join('\n');

    assert.ok(desert.includes('Sand Dunes'));
    assert.ok(!desert.includes('Frozen Tundra'));
    assert.ok(arctic.includes('Frozen Tundra'));
    assert.ok(!arctic.includes('Sand Dunes'));
    assert.ok(!desert.includes('Polar Bear'));
    assert.ok(!arctic.includes('Scorpion'));
  });

  it('desert loot table never appears in arctic output', () => {
    const arctic = captureOutput(() => new WorldGenerator(ArcticBiomeKit.getInstance()).generate()).join('\n');
    assert.ok(!arctic.includes('Desert Loot Table'));
    assert.ok(arctic.includes('Arctic Loot Table'));
  });

  it('weather events are biome-specific', () => {
    const desert = captureOutput(() => new WorldGenerator(DesertBiomeKit.getInstance()).generate()).join('\n');
    const arctic  = captureOutput(() => new WorldGenerator(ArcticBiomeKit.getInstance()).generate()).join('\n');
    assert.ok(desert.includes('heat_wave'));
    assert.ok(arctic.includes('whiteout'));
    assert.ok(!desert.includes('whiteout'));
    assert.ok(!arctic.includes('heat_wave'));
  });
});

// SECTION:: Prototype Registration
describe('Prototype Registration (runtime enemy injection)', () => {
  it('registerEnemy adds a new enemy to the next generate() call', () => {
    const kit    = DesertBiomeKit.getInstance();
    const before = captureOutput(() => new WorldGenerator(kit).generate()).join('\n');

    kit.registerEnemy({
      name: 'Giant Scorpion (Boss)', health: 400, damage: 60,
      attack: 'Tail sweep — hits all nearby players', drop: 'Ancient Venom Sac',
      clone() { return this; },
    });

    const after = captureOutput(() => new WorldGenerator(kit).generate()).join('\n');
    assert.ok(!before.includes('Giant Scorpion'));
    assert.ok(after.includes('Giant Scorpion'));
  });

  it('registration is isolated — arctic kit is unaffected by desert registration', () => {
    const arctic = captureOutput(() => new WorldGenerator(ArcticBiomeKit.getInstance()).generate()).join('\n');
    assert.ok(!arctic.includes('Giant Scorpion'));
  });

  it('registered enemy is cloned on generate() — clone() is called', () => {
    let cloneCalled = false;
    ForestBiomeKit.getInstance().registerEnemy({
      name: 'Tracker', health: 1, damage: 1, attack: 'Track', drop: 'Data',
      clone() { cloneCalled = true; return this; },
    });
    captureOutput(() => new WorldGenerator(ForestBiomeKit.getInstance()).generate());
    assert.ok(cloneCalled);
  });
});

// ============================================================
//  Unit Tests — Abstract Factory: Biome World Builder
//
//  What we test here:
//    · Each concrete terrain satisfies the Terrain contract
//    · Enemy.clone() produces an independent, equal-valued copy
//    · Each factory method returns the correct product type
//    · WorldGenerator calls every factory method exactly once
//    · Swapping a factory completely changes the output
//
//  Run: npx mocha --require ts-node/register unit.test.ts
// ============================================================

// SECTION:: Imports
import { describe, it } from 'mocha';
import assert from 'assert';
import {
  // Interfaces (type-only — erased at runtime)
  type Terrain, type Enemy, type BiomeKit,
  // Shared class
  WeatherSystem,
  // Terrain products
  SandTerrain, IceTerrain, MudTerrain,
  // Enemy products
  Scorpion, PolarBear, Wolf,
  // Concrete factories (Singletons — use getInstance())
  DesertBiomeKit, ArcticBiomeKit,
  // Client
  WorldGenerator,
} from '../../../../CreationalPatterns/AbstractFactory/typescript/typescript';

// SECTION:: Terrain Products
describe('Terrain Products', () => {
  it('SandTerrain satisfies the Terrain contract', () => {
    const t: Terrain = new SandTerrain();
    assert.strictEqual(t.name, 'Sand Dunes');
    assert.ok(t.movementPenalty.includes('-20%'));
    assert.ok(t.description.length > 0);
  });

  it('IceTerrain satisfies the Terrain contract', () => {
    const t: Terrain = new IceTerrain();
    assert.strictEqual(t.name, 'Frozen Tundra');
    assert.ok(t.movementPenalty.includes('-15%'));
  });

  it('MudTerrain satisfies the Terrain contract', () => {
    const t: Terrain = new MudTerrain();
    assert.strictEqual(t.name, 'Dense Forest Floor');
    assert.ok(t.movementPenalty.includes('-10%'));
  });
});

// SECTION:: Enemy Prototype Cloning
describe('Enemy Prototype Cloning', () => {
  it('Scorpion clone is a distinct object with identical stats', () => {
    const original = new Scorpion(50, 15);
    const cloned   = original.clone();
    assert.notStrictEqual(cloned, original);
    assert.strictEqual(cloned.health, original.health);
    assert.strictEqual(cloned.damage, original.damage);
    assert.strictEqual(cloned.name, 'Scorpion');
  });

  it('PolarBear clone preserves all stats', () => {
    const original = new PolarBear(180, 35);
    const cloned   = original.clone();
    assert.notStrictEqual(cloned, original);
    assert.strictEqual(cloned.health, 180);
    assert.strictEqual(cloned.damage, 35);
  });

  it('Wolf clone is independent — mutating clone does not affect original', () => {
    const original = new Wolf(90, 18);
    const cloned   = original.clone() as any;
    cloned.health  = 999;
    assert.strictEqual(original.health, 90);
  });
});

// SECTION:: Factory Method Isolation
// ── Factories are Singletons — use getInstance(), not new ────────────────────
describe('Factory Method Isolation — DesertBiomeKit', () => {
  const kit = DesertBiomeKit.getInstance();

  it('createTerrain returns Sand Dunes terrain', () => {
    assert.strictEqual(kit.createTerrain().name, 'Sand Dunes');
  });

  it('createEnemies returns clones — successive calls produce distinct objects', () => {
    const [a] = kit.createEnemies();
    const [b] = kit.createEnemies();
    assert.notStrictEqual(a, b);        // two separate clones
    assert.strictEqual(a.name, b.name); // same prototype values
  });

  it('createWeather has Sandstorm as base weather', () => {
    const ws = kit.createWeather();
    assert.strictEqual(ws.a.name, 'Sandstorm');
    assert.ok(ws.b.has('heat_wave'));
    assert.ok(ws.b.has('mirage'));
  });

  it('createLoot rolls at least one item', () => {
    assert.ok(kit.createLoot().roll().length >= 1);
  });

  it('registerEnemy expands the enemy pool by one', () => {
    const before = kit.createEnemies().length;
    kit.registerEnemy(new Wolf(90, 18));
    assert.strictEqual(kit.createEnemies().length, before + 1);
  });
});

describe('Factory Method Isolation — ArcticBiomeKit', () => {
  const kit = ArcticBiomeKit.getInstance();

  it('createTerrain returns Frozen Tundra', () => {
    assert.strictEqual(kit.createTerrain().name, 'Frozen Tundra');
  });

  it('createWeather has Blizzard as base weather', () => {
    assert.strictEqual(kit.createWeather().a.name, 'Blizzard');
  });
});

// SECTION:: WorldGenerator Decoupling
describe('WorldGenerator — BiomeKit Interface Contract', () => {
  it('calls every factory method exactly once during construction', () => {
    const calls = { createTerrain: 0, createEnemies: 0, createWeather: 0, createLoot: 0 };
    const spyKit: BiomeKit = {
      kitName:       'SpyKit',
      createTerrain() { calls.createTerrain++; return new SandTerrain(); },
      createEnemies() { calls.createEnemies++; return []; },
      createWeather() { calls.createWeather++; return new WeatherSystem({ name: 'Clear', effect: 'None' }, new Map()); },
      createLoot()    { calls.createLoot++;    return { name: 'Mock', roll: () => [] }; },
      registerEnemy() {},
    };

    new WorldGenerator(spyKit);

    assert.strictEqual(calls.createTerrain, 1);
    assert.strictEqual(calls.createEnemies, 1);
    assert.strictEqual(calls.createWeather, 1);
    assert.strictEqual(calls.createLoot,    1);
  });

  it('accepts any BiomeKit-shaped object — never references a concrete class', () => {
    const alienKit: BiomeKit = {
      kitName:       'AlienKit',
      createTerrain: () => ({ name: 'Lava Field', movementPenalty: '-50%', description: 'Hot' }),
      createEnemies: () => [],
      createWeather: () => new WeatherSystem({ name: 'Ash Cloud', effect: 'Burns' }, new Map()),
      createLoot:    () => ({ name: 'Alien Loot', roll: () => ['Alien Gem'] }),
      registerEnemy: () => {},
    };
    assert.doesNotThrow(() => new WorldGenerator(alienKit).generate());
  });

  it('swapping factory completely changes terrain and weather output', () => {
    const lines: string[] = [];
    const orig = console.log;
    console.log = (...args: unknown[]) => lines.push(args.join(' '));

    new WorldGenerator(DesertBiomeKit.getInstance()).generate();
    const desertOut = lines.join('\n');
    lines.length = 0;

    new WorldGenerator(ArcticBiomeKit.getInstance()).generate();
    const arcticOut = lines.join('\n');

    console.log = orig;

    assert.ok(desertOut.includes('Sand Dunes'));
    assert.ok(arcticOut.includes('Frozen Tundra'));
    assert.ok(!desertOut.includes('Frozen Tundra'));
    assert.ok(!arcticOut.includes('Sand Dunes'));
  });
});

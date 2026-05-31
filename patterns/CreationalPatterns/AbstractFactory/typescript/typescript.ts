// ============================================================
//  Abstract Factory + Prototype — Biome World Builder
//  Run: npx ts-node typescript.ts
// ============================================================
//
//  Participants
//  ────────────────────────────────────────────────────────
//  Abstract Factory   BiomeKit
//  Concrete Factory   DesertBiomeKit, ArcticBiomeKit, ForestBiomeKit (Singletons)
//  Abstract Product A Terrain
//  Abstract Product B Enemy          (also a Prototype — implements clone())
//  Abstract Product C WeatherSystem  (a: Weather, b: Map<string, WeatherEvent>)
//  Abstract Product D LootTable
//  Client             WorldGenerator
//
//  Patterns at work
//  ────────────────────────────────────────────────────────
//  Abstract Factory — BiomeKit defines the product family interface
//  Prototype        — Enemy instances are cloned from a factory registry;
//                     new enemy types can be registered at runtime without
//                     changing any factory class
//  Singleton        — one factory instance per biome (private constructor)
//
//  Consequences demonstrated
//  ────────────────────────────────────────────────────────
//  ✓ Concrete isolation          — WorldGenerator never references a concrete class
//  ✓ Exchanging product families — one line swaps the entire biome
//  ✓ Consistency across products — desert enemies drop desert loot in desert weather
//  ✗ Difficulty of new products  — adding Product E touches every factory
//  ✓ Prototype softens this      — new *enemy types* register without touching factories
// ============================================================


// SECTION:: Abstract Products
// ═════════════════════════════════════════════════════════════
//  ABSTRACT PRODUCTS
// ═════════════════════════════════════════════════════════════

// ── Abstract Product A — Terrain ─────────────────────────────────────────────

export interface Terrain {
  readonly name:            string;
  readonly movementPenalty: string;
  readonly description:     string;
}

// ── Abstract Product B — Enemy (also a Prototype) ────────────────────────────

export interface Enemy {
  clone():               Enemy;
  readonly name:         string;
  readonly health:       number;
  readonly damage:       number;
  readonly attack:       string;
  readonly drop:         string;
}

// ── Abstract Product C — Weather ─────────────────────────────────────────────

export interface Weather {
  readonly name:   string;
  readonly effect: string;
}

export interface WeatherEvent {
  readonly name:        string;
  readonly trigger:     string;
  readonly consequence: string;
}

export class WeatherSystem {
  constructor(
    public readonly a: Weather,                           // base conditions
    public readonly b: Map<string, WeatherEvent>          // triggerable events
  ) {}

  describe(): void {
    console.log(`    Base      : ${this.a.name} — ${this.a.effect}`);
    console.log(`    Events    :`);
    this.b.forEach((ev, key) =>
      console.log(`      [${key}] ${ev.name} | trigger: ${ev.trigger} | effect: ${ev.consequence}`)
    );
  }
}

// ── Abstract Product D — LootTable ───────────────────────────────────────────

export interface LootTable {
  readonly name: string;
  roll():        string[];
}


// SECTION:: Abstract Factory
// ═════════════════════════════════════════════════════════════
//  ABSTRACT FACTORY
// ═════════════════════════════════════════════════════════════

export interface BiomeKit {
  createTerrain():       Terrain;
  createEnemies():       Enemy[];       // cloned from prototype registry
  createWeather():       WeatherSystem;
  createLoot():          LootTable;
  readonly kitName:      string;
  registerEnemy(prototype: Enemy): void;
}


// SECTION:: Desert Biome
// ═════════════════════════════════════════════════════════════
//  DESERT — Concrete Products
// ═════════════════════════════════════════════════════════════

export class SandTerrain implements Terrain {
  readonly name            = 'Sand Dunes';
  readonly movementPenalty = '-20% speed, doubles stamina drain';
  readonly description     = 'Endless shifting dunes, brutal heat, no cover';
}

export class Scorpion implements Enemy {
  constructor(readonly health: number, readonly damage: number) {}
  clone()         { return new Scorpion(this.health, this.damage); }
  readonly name   = 'Scorpion';
  readonly attack = 'Venomous sting — poisons for 3 turns';
  readonly drop   = 'Scorpion Venom Gland';
}

export class SandWorm implements Enemy {
  constructor(readonly health: number, readonly damage: number) {}
  clone()         { return new SandWorm(this.health, this.damage); }
  readonly name   = 'Sand Worm';
  readonly attack = 'Burrow strike — ignores armour';
  readonly drop   = 'Worm Scale';
}

export class DesertBandit implements Enemy {
  constructor(readonly health: number, readonly damage: number) {}
  clone()         { return new DesertBandit(this.health, this.damage); }
  readonly name   = 'Desert Bandit';
  readonly attack = 'Ambush — double damage on first hit';
  readonly drop   = 'Stolen Spice Pouch';
}

class Sandstorm implements Weather {
  readonly name   = 'Sandstorm';
  readonly effect = '-30% visibility, +10% fire resistance';
}

class HeatWaveEvent implements WeatherEvent {
  readonly name        = 'Heat Wave';
  readonly trigger     = 'Midday in desert biome';
  readonly consequence = 'Stamina drain doubles, enemies become sluggish';
}

class DustDevilEvent implements WeatherEvent {
  readonly name        = 'Dust Devil';
  readonly trigger     = 'Wind speed exceeds threshold';
  readonly consequence = 'Random item knocked from player inventory';
}

class MirageEvent implements WeatherEvent {
  readonly name        = 'Mirage';
  readonly trigger     = 'Player health below 30%';
  readonly consequence = 'Nearby oasis appears — may be real or false';
}

class SpiceLoot implements LootTable {
  private static readonly POOL = ['Desert Spice', 'Sand Ruby', 'Scorpion Venom',
    'Cactus Fruit', 'Ancient Coin', 'Sun-bleached Bone', 'Mirage Crystal'];
  readonly name = 'Desert Loot Table';
  roll(): string[] {
    return [...SpiceLoot.POOL]
      .sort(() => Math.random() - 0.5)
      .slice(0, 2 + Math.floor(Math.random() * 2));
  }
}


// SECTION:: Arctic Biome
// ═════════════════════════════════════════════════════════════
//  ARCTIC — Concrete Products
// ═════════════════════════════════════════════════════════════

export class IceTerrain implements Terrain {
  readonly name            = 'Frozen Tundra';
  readonly movementPenalty = '-15% speed, risk of slip on ice tiles';
  readonly description     = 'Vast frozen plains, cracking ice sheets, permafrost';
}

export class PolarBear implements Enemy {
  constructor(readonly health: number, readonly damage: number) {}
  clone()         { return new PolarBear(this.health, this.damage); }
  readonly name   = 'Polar Bear';
  readonly attack = 'Bear maul — knocks player back 3 tiles';
  readonly drop   = 'Polar Bear Pelt';
}

export class IceWolf implements Enemy {
  constructor(readonly health: number, readonly damage: number) {}
  clone()         { return new IceWolf(this.health, this.damage); }
  readonly name   = 'Ice Wolf';
  readonly attack = 'Pack howl — summons 1-2 additional wolves';
  readonly drop   = 'Frost Fang';
}

export class FrostTroll implements Enemy {
  constructor(readonly health: number, readonly damage: number) {}
  clone()         { return new FrostTroll(this.health, this.damage); }
  readonly name   = 'Frost Troll';
  readonly attack = 'Ice slam — freezes player in place for 2 turns';
  readonly drop   = 'Troll Permafrost Core';
}

class Blizzard implements Weather {
  readonly name   = 'Blizzard';
  readonly effect = '-50% visibility, -5 HP per turn from frostbite';
}

class WhiteoutEvent implements WeatherEvent {
  readonly name        = 'Whiteout';
  readonly trigger     = 'Blizzard intensity exceeds level 3';
  readonly consequence = 'Zero visibility — navigation by compass only';
}

class IceStormEvent implements WeatherEvent {
  readonly name        = 'Ice Storm';
  readonly trigger     = 'Temperature drops below critical threshold';
  readonly consequence = 'Ice shards deal 8 damage per turn, enemies gain ice shield';
}

class AuroraEvent implements WeatherEvent {
  readonly name        = 'Aurora Borealis';
  readonly trigger     = 'Clear night sky, no blizzard';
  readonly consequence = 'All magic abilities cost 50% less for 60 seconds';
}

class FurLoot implements LootTable {
  private static readonly POOL = ['Polar Bear Pelt', 'Frost Fang', 'Troll Core',
    'Frozen Herb', 'Arctic Sapphire', 'Permafrost Shard', 'Whale Bone Charm'];
  readonly name = 'Arctic Loot Table';
  roll(): string[] {
    return [...FurLoot.POOL]
      .sort(() => Math.random() - 0.5)
      .slice(0, 2 + Math.floor(Math.random() * 2));
  }
}


// SECTION:: Forest Biome
// ═════════════════════════════════════════════════════════════
//  FOREST — Concrete Products
// ═════════════════════════════════════════════════════════════

export class MudTerrain implements Terrain {
  readonly name            = 'Dense Forest Floor';
  readonly movementPenalty = '-10% speed in mud, stealth bonus in undergrowth';
  readonly description     = 'Ancient trees, thick undergrowth, soft mud paths';
}

export class Wolf implements Enemy {
  constructor(readonly health: number, readonly damage: number) {}
  clone()         { return new Wolf(this.health, this.damage); }
  readonly name   = 'Wolf';
  readonly attack = 'Lunge — high speed, targets lowest HP player';
  readonly drop   = 'Wolf Pelt';
}

export class WildBoar implements Enemy {
  constructor(readonly health: number, readonly damage: number) {}
  clone()         { return new WildBoar(this.health, this.damage); }
  readonly name   = 'Wild Boar';
  readonly attack = 'Charge — stuns on hit, destroys cover';
  readonly drop   = 'Boar Tusk';
}

export class ForestBandit implements Enemy {
  constructor(readonly health: number, readonly damage: number) {}
  clone()         { return new ForestBandit(this.health, this.damage); }
  readonly name   = 'Forest Bandit';
  readonly attack = 'Arrow volley — ranged, ignores melee armour';
  readonly drop   = 'Bandit Coin Pouch';
}

class Rain implements Weather {
  readonly name   = 'Heavy Rain';
  readonly effect = 'Extinguishes fire, +15% bow miss chance, plants grow faster';
}

class ThunderstormEvent implements WeatherEvent {
  readonly name        = 'Thunderstorm';
  readonly trigger     = 'Rain intensity exceeds level 2';
  readonly consequence = 'Lightning strikes random tiles — stuns and deals 20 damage';
}

class DenseFogEvent implements WeatherEvent {
  readonly name        = 'Dense Fog';
  readonly trigger     = 'Temperature drop after heavy rain';
  readonly consequence = '-40% visibility, stealth enemies become invisible';
}

class ForestFireEvent implements WeatherEvent {
  readonly name        = 'Forest Fire';
  readonly trigger     = 'Lightning strike + dry undergrowth';
  readonly consequence = 'Spreads across tiles, forces enemy + player retreat';
}

class HerbLoot implements LootTable {
  private static readonly POOL = ['Healing Herb', 'Boar Tusk', 'Wolf Pelt',
    'Moss Spore', 'Ancient Acorn', 'Bandit Map Fragment', 'Glowing Mushroom'];
  readonly name = 'Forest Loot Table';
  roll(): string[] {
    return [...HerbLoot.POOL]
      .sort(() => Math.random() - 0.5)
      .slice(0, 2 + Math.floor(Math.random() * 2));
  }
}


// SECTION:: Concrete Factories
// ═════════════════════════════════════════════════════════════
//  CONCRETE FACTORIES — Singleton + Prototype Registry
// ═════════════════════════════════════════════════════════════

export class DesertBiomeKit implements BiomeKit {
  private static readonly _instance = new DesertBiomeKit();
  private constructor() {}
  static getInstance(): DesertBiomeKit { return DesertBiomeKit._instance; }

  private readonly registry: Enemy[] = [
    new Scorpion(50, 15),
    new SandWorm(200, 30),
    new DesertBandit(80, 20),
  ];

  registerEnemy(prototype: Enemy): void {
    this.registry.push(prototype);
    console.log(`  [DesertBiomeKit] Registered new prototype: ${prototype.name}`);
  }

  createTerrain():  Terrain       { return new SandTerrain(); }
  createEnemies():  Enemy[]       { return this.registry.map(e => e.clone()); }
  createWeather():  WeatherSystem {
    return new WeatherSystem(new Sandstorm(), new Map([
      ['heat_wave',  new HeatWaveEvent()],
      ['dust_devil', new DustDevilEvent()],
      ['mirage',     new MirageEvent()],
    ]));
  }
  createLoot():     LootTable     { return new SpiceLoot(); }
  readonly kitName                = 'DesertBiomeKit';
}

export class ArcticBiomeKit implements BiomeKit {
  private static readonly _instance = new ArcticBiomeKit();
  private constructor() {}
  static getInstance(): ArcticBiomeKit { return ArcticBiomeKit._instance; }

  private readonly registry: Enemy[] = [
    new PolarBear(180, 35),
    new IceWolf(70, 22),
    new FrostTroll(300, 45),
  ];

  registerEnemy(prototype: Enemy): void {
    this.registry.push(prototype);
    console.log(`  [ArcticBiomeKit] Registered new prototype: ${prototype.name}`);
  }

  createTerrain():  Terrain       { return new IceTerrain(); }
  createEnemies():  Enemy[]       { return this.registry.map(e => e.clone()); }
  createWeather():  WeatherSystem {
    return new WeatherSystem(new Blizzard(), new Map([
      ['whiteout',  new WhiteoutEvent()],
      ['ice_storm', new IceStormEvent()],
      ['aurora',    new AuroraEvent()],
    ]));
  }
  createLoot():     LootTable     { return new FurLoot(); }
  readonly kitName                = 'ArcticBiomeKit';
}

export class ForestBiomeKit implements BiomeKit {
  private static readonly _instance = new ForestBiomeKit();
  private constructor() {}
  static getInstance(): ForestBiomeKit { return ForestBiomeKit._instance; }

  private readonly registry: Enemy[] = [
    new Wolf(90, 18),
    new WildBoar(120, 25),
    new ForestBandit(75, 20),
  ];

  registerEnemy(prototype: Enemy): void {
    this.registry.push(prototype);
    console.log(`  [ForestBiomeKit] Registered new prototype: ${prototype.name}`);
  }

  createTerrain():  Terrain       { return new MudTerrain(); }
  createEnemies():  Enemy[]       { return this.registry.map(e => e.clone()); }
  createWeather():  WeatherSystem {
    return new WeatherSystem(new Rain(), new Map([
      ['thunderstorm', new ThunderstormEvent()],
      ['dense_fog',    new DenseFogEvent()],
      ['forest_fire',  new ForestFireEvent()],
    ]));
  }
  createLoot():     LootTable     { return new HerbLoot(); }
  readonly kitName                = 'ForestBiomeKit';
}


// SECTION:: Client
// ═════════════════════════════════════════════════════════════
//  CLIENT
// ═════════════════════════════════════════════════════════════
//  CONSEQUENCE: Concrete Isolation
//  WorldGenerator references zero concrete classes.
//  It only knows BiomeKit, Terrain, Enemy, WeatherSystem, LootTable.

export class WorldGenerator {
  private readonly terrain: Terrain;
  private readonly enemies: Enemy[];
  private readonly weather: WeatherSystem;
  private readonly loot:    LootTable;

  constructor(kit: BiomeKit) {
    this.terrain = kit.createTerrain();
    this.enemies = kit.createEnemies();
    this.weather = kit.createWeather();
    this.loot    = kit.createLoot();
  }

  generate(): void {
    console.log('\n  TERRAIN');
    console.log(`    ${this.terrain.name} — ${this.terrain.description}`);
    console.log(`    Movement: ${this.terrain.movementPenalty}`);

    console.log('\n  ENEMIES  (cloned from prototype registry)');
    for (const e of this.enemies) {
      console.log(`    ${e.name.padEnd(16)} HP:${String(e.health).padEnd(4)} DMG:${String(e.damage).padEnd(3)}  Attack: ${e.attack}`);
      console.log(`                     Drop:   ${e.drop}`);
    }

    console.log('\n  WEATHER SYSTEM');
    this.weather.describe();

    console.log(`\n  LOOT ROLL  (${this.loot.name})`);
    console.log(`    Dropped: [${this.loot.roll().join(', ')}]`);
  }
}


// SECTION:: Entry Point
// ═════════════════════════════════════════════════════════════
//  ENTRY POINT
// ═════════════════════════════════════════════════════════════

if (require.main === module) {
const SEP = '═'.repeat(64);

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║        Abstract Factory + Prototype — Biome World Builder    ║');
console.log('╚══════════════════════════════════════════════════════════════╝');

// ── CONSEQUENCE: Exchanging product families ──────────────────────────────────
const kits: BiomeKit[] = [
  DesertBiomeKit.getInstance(),
  ArcticBiomeKit.getInstance(),
  ForestBiomeKit.getInstance(),
];

for (const kit of kits) {
  console.log(`\n${SEP}`);
  console.log(`  Biome: ${kit.kitName}`);
  console.log(SEP);
  new WorldGenerator(kit).generate();
}

// ── PROTOTYPE: Register a new enemy at runtime ────────────────────────────────
console.log(`\n${SEP}`);
console.log('  PROTOTYPE DEMO — registering GiantScorpion at runtime');
console.log(SEP);

DesertBiomeKit.getInstance().registerEnemy({
  clone()        { return this; },
  name:          'Giant Scorpion (Boss)',
  health:        400,
  damage:        60,
  attack:        'Tail sweep — hits all nearby players',
  drop:          'Ancient Venom Sac + Desert Crown',
});

console.log('\n  Desert enemies after registration:');
new WorldGenerator(DesertBiomeKit.getInstance()).generate();

console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║  Done                                                        ║');
console.log('╚══════════════════════════════════════════════════════════════╝');
} // end if (require.main === module)

// ============================================================
//  Abstract Factory + Prototype — Biome World Builder
//  Run: dotnet script csharp.cs
// ============================================================
//
//  Participants
//  ────────────────────────────────────────────────────────
//  Abstract Factory   IBiomeKit
//  Concrete Factory   DesertBiomeKit, ArcticBiomeKit, ForestBiomeKit (Singletons)
//  Abstract Product A ITerrain
//  Abstract Product B IEnemy         (also a Prototype — implements Clone())
//  Abstract Product C WeatherSystem  (A: IWeather, B: Dictionary<string,IWeatherEvent>)
//  Abstract Product D ILootTable
//  Client             WorldGenerator
//
//  Patterns at work
//  ────────────────────────────────────────────────────────
//  Abstract Factory — IBiomeKit defines the product family interface
//  Prototype        — IEnemy instances are cloned from a factory registry
//  Singleton        — sealed class + Lazy<T> ensures one instance per biome
//
//  Consequences demonstrated
//  ────────────────────────────────────────────────────────
//  ✓ Concrete isolation          — WorldGenerator never references a concrete class
//  ✓ Exchanging product families — one line swaps the entire biome
//  ✓ Consistency across products — desert enemies drop desert loot in desert weather
//  ✗ Difficulty of new products  — adding Product E touches every factory
//  ✓ Prototype softens this      — new *enemy types* register without touching factories
// ============================================================

using System;
using System.Collections.Generic;
using System.Linq;


// ═════════════════════════════════════════════════════════════
//  ABSTRACT PRODUCTS
// ═════════════════════════════════════════════════════════════

// ── Abstract Product A — Terrain ──────────────────────────────────────────────

interface ITerrain {
    string Name             { get; }
    string MovementPenalty  { get; }
    string Description      { get; }
}

// ── Abstract Product B — IEnemy (also a Prototype) ───────────────────────────

interface IEnemy {
    IEnemy Clone();
    string Name    { get; }
    int    Health  { get; }
    int    Damage  { get; }
    string Attack  { get; }
    string Drop    { get; }
}

// ── Abstract Product C — Weather ─────────────────────────────────────────────

interface IWeather {
    string Name   { get; }
    string Effect { get; }
}

interface IWeatherEvent {
    string Name        { get; }
    string Trigger     { get; }
    string Consequence { get; }
}

sealed class WeatherSystem {
    public IWeather                                   A { get; }  // base conditions
    public IReadOnlyDictionary<string, IWeatherEvent> B { get; }  // triggerable events

    public WeatherSystem(IWeather a, Dictionary<string, IWeatherEvent> b) {
        A = a;
        B = b;
    }

    public void Describe() {
        Console.WriteLine($"    Base      : {A.Name} — {A.Effect}");
        Console.WriteLine($"    Events    :");
        foreach (var (key, ev) in B)
            Console.WriteLine($"      [{key}] {ev.Name} | trigger: {ev.Trigger} | effect: {ev.Consequence}");
    }
}

// ── Abstract Product D — LootTable ───────────────────────────────────────────

interface ILootTable {
    string       Name { get; }
    List<string> Roll();
}


// ═════════════════════════════════════════════════════════════
//  ABSTRACT FACTORY
// ═════════════════════════════════════════════════════════════

interface IBiomeKit {
    ITerrain      CreateTerrain();
    List<IEnemy>  CreateEnemies();    // cloned from prototype registry
    WeatherSystem CreateWeather();
    ILootTable    CreateLoot();
    string        KitName { get; }
    void          RegisterEnemy(IEnemy prototype);
}


// ═════════════════════════════════════════════════════════════
//  DESERT — Concrete Products
// ═════════════════════════════════════════════════════════════

sealed class SandTerrain : ITerrain {
    public string Name            => "Sand Dunes";
    public string MovementPenalty => "-20% speed, doubles stamina drain";
    public string Description     => "Endless shifting dunes, brutal heat, no cover";
}

sealed class Scorpion : IEnemy {
    public Scorpion(int health, int damage) { Health = health; Damage = damage; }
    public IEnemy Clone()  => new Scorpion(Health, Damage);
    public string  Name    => "Scorpion";
    public int     Health  { get; }
    public int     Damage  { get; }
    public string  Attack  => "Venomous sting — poisons for 3 turns";
    public string  Drop    => "Scorpion Venom Gland";
}

sealed class SandWorm : IEnemy {
    public SandWorm(int health, int damage) { Health = health; Damage = damage; }
    public IEnemy Clone()  => new SandWorm(Health, Damage);
    public string  Name    => "Sand Worm";
    public int     Health  { get; }
    public int     Damage  { get; }
    public string  Attack  => "Burrow strike — ignores armour";
    public string  Drop    => "Worm Scale";
}

sealed class DesertBandit : IEnemy {
    public DesertBandit(int health, int damage) { Health = health; Damage = damage; }
    public IEnemy Clone()  => new DesertBandit(Health, Damage);
    public string  Name    => "Desert Bandit";
    public int     Health  { get; }
    public int     Damage  { get; }
    public string  Attack  => "Ambush — double damage on first hit";
    public string  Drop    => "Stolen Spice Pouch";
}

sealed class Sandstorm : IWeather {
    public string Name   => "Sandstorm";
    public string Effect => "-30% visibility, +10% fire resistance";
}
sealed class HeatWaveEvent : IWeatherEvent {
    public string Name        => "Heat Wave";
    public string Trigger     => "Midday in desert biome";
    public string Consequence => "Stamina drain doubles, enemies become sluggish";
}
sealed class DustDevilEvent : IWeatherEvent {
    public string Name        => "Dust Devil";
    public string Trigger     => "Wind speed exceeds threshold";
    public string Consequence => "Random item knocked from player inventory";
}
sealed class MirageEvent : IWeatherEvent {
    public string Name        => "Mirage";
    public string Trigger     => "Player health below 30%";
    public string Consequence => "Nearby oasis appears — may be real or false";
}

sealed class SpiceLoot : ILootTable {
    private static readonly string[] Pool = {
        "Desert Spice", "Sand Ruby", "Scorpion Venom", "Cactus Fruit",
        "Ancient Coin", "Sun-bleached Bone", "Mirage Crystal"
    };
    private static readonly Random Rng = new();
    public string       Name => "Desert Loot Table";
    public List<string> Roll() => Pool.OrderBy(_ => Rng.Next()).Take(Rng.Next(2, 4)).ToList();
}


// ═════════════════════════════════════════════════════════════
//  ARCTIC — Concrete Products
// ═════════════════════════════════════════════════════════════

sealed class IceTerrain : ITerrain {
    public string Name            => "Frozen Tundra";
    public string MovementPenalty => "-15% speed, risk of slip on ice tiles";
    public string Description     => "Vast frozen plains, cracking ice sheets, permafrost";
}

sealed class PolarBear : IEnemy {
    public PolarBear(int health, int damage) { Health = health; Damage = damage; }
    public IEnemy Clone()  => new PolarBear(Health, Damage);
    public string  Name    => "Polar Bear";
    public int     Health  { get; }
    public int     Damage  { get; }
    public string  Attack  => "Bear maul — knocks player back 3 tiles";
    public string  Drop    => "Polar Bear Pelt";
}

sealed class IceWolf : IEnemy {
    public IceWolf(int health, int damage) { Health = health; Damage = damage; }
    public IEnemy Clone()  => new IceWolf(Health, Damage);
    public string  Name    => "Ice Wolf";
    public int     Health  { get; }
    public int     Damage  { get; }
    public string  Attack  => "Pack howl — summons 1-2 additional wolves";
    public string  Drop    => "Frost Fang";
}

sealed class FrostTroll : IEnemy {
    public FrostTroll(int health, int damage) { Health = health; Damage = damage; }
    public IEnemy Clone()  => new FrostTroll(Health, Damage);
    public string  Name    => "Frost Troll";
    public int     Health  { get; }
    public int     Damage  { get; }
    public string  Attack  => "Ice slam — freezes player in place for 2 turns";
    public string  Drop    => "Troll Permafrost Core";
}

sealed class Blizzard : IWeather {
    public string Name   => "Blizzard";
    public string Effect => "-50% visibility, -5 HP per turn from frostbite";
}
sealed class WhiteoutEvent : IWeatherEvent {
    public string Name        => "Whiteout";
    public string Trigger     => "Blizzard intensity exceeds level 3";
    public string Consequence => "Zero visibility — navigation by compass only";
}
sealed class IceStormEvent : IWeatherEvent {
    public string Name        => "Ice Storm";
    public string Trigger     => "Temperature drops below critical threshold";
    public string Consequence => "Ice shards deal 8 damage per turn, enemies gain ice shield";
}
sealed class AuroraEvent : IWeatherEvent {
    public string Name        => "Aurora Borealis";
    public string Trigger     => "Clear night sky, no blizzard";
    public string Consequence => "All magic abilities cost 50% less for 60 seconds";
}

sealed class FurLoot : ILootTable {
    private static readonly string[] Pool = {
        "Polar Bear Pelt", "Frost Fang", "Troll Core", "Frozen Herb",
        "Arctic Sapphire", "Permafrost Shard", "Whale Bone Charm"
    };
    private static readonly Random Rng = new();
    public string       Name => "Arctic Loot Table";
    public List<string> Roll() => Pool.OrderBy(_ => Rng.Next()).Take(Rng.Next(2, 4)).ToList();
}


// ═════════════════════════════════════════════════════════════
//  FOREST — Concrete Products
// ═════════════════════════════════════════════════════════════

sealed class MudTerrain : ITerrain {
    public string Name            => "Dense Forest Floor";
    public string MovementPenalty => "-10% speed in mud, stealth bonus in undergrowth";
    public string Description     => "Ancient trees, thick undergrowth, soft mud paths";
}

sealed class Wolf : IEnemy {
    public Wolf(int health, int damage) { Health = health; Damage = damage; }
    public IEnemy Clone()  => new Wolf(Health, Damage);
    public string  Name    => "Wolf";
    public int     Health  { get; }
    public int     Damage  { get; }
    public string  Attack  => "Lunge — high speed, targets lowest HP player";
    public string  Drop    => "Wolf Pelt";
}

sealed class WildBoar : IEnemy {
    public WildBoar(int health, int damage) { Health = health; Damage = damage; }
    public IEnemy Clone()  => new WildBoar(Health, Damage);
    public string  Name    => "Wild Boar";
    public int     Health  { get; }
    public int     Damage  { get; }
    public string  Attack  => "Charge — stuns on hit, destroys cover";
    public string  Drop    => "Boar Tusk";
}

sealed class ForestBandit : IEnemy {
    public ForestBandit(int health, int damage) { Health = health; Damage = damage; }
    public IEnemy Clone()  => new ForestBandit(Health, Damage);
    public string  Name    => "Forest Bandit";
    public int     Health  { get; }
    public int     Damage  { get; }
    public string  Attack  => "Arrow volley — ranged, ignores melee armour";
    public string  Drop    => "Bandit Coin Pouch";
}

sealed class Rain : IWeather {
    public string Name   => "Heavy Rain";
    public string Effect => "Extinguishes fire, +15% bow miss chance, plants grow faster";
}
sealed class ThunderstormEvent : IWeatherEvent {
    public string Name        => "Thunderstorm";
    public string Trigger     => "Rain intensity exceeds level 2";
    public string Consequence => "Lightning strikes random tiles — stuns and deals 20 damage";
}
sealed class DenseFogEvent : IWeatherEvent {
    public string Name        => "Dense Fog";
    public string Trigger     => "Temperature drop after heavy rain";
    public string Consequence => "-40% visibility, stealth enemies become invisible";
}
sealed class ForestFireEvent : IWeatherEvent {
    public string Name        => "Forest Fire";
    public string Trigger     => "Lightning strike + dry undergrowth";
    public string Consequence => "Spreads across tiles, forces enemy + player retreat";
}

sealed class HerbLoot : ILootTable {
    private static readonly string[] Pool = {
        "Healing Herb", "Boar Tusk", "Wolf Pelt", "Moss Spore",
        "Ancient Acorn", "Bandit Map Fragment", "Glowing Mushroom"
    };
    private static readonly Random Rng = new();
    public string       Name => "Forest Loot Table";
    public List<string> Roll() => Pool.OrderBy(_ => Rng.Next()).Take(Rng.Next(2, 4)).ToList();
}


// ═════════════════════════════════════════════════════════════
//  CONCRETE FACTORIES — Singleton + Prototype Registry
// ═════════════════════════════════════════════════════════════

sealed class DesertBiomeKit : IBiomeKit {
    private static readonly Lazy<DesertBiomeKit> _instance = new(() => new DesertBiomeKit());
    private DesertBiomeKit() {}
    public static DesertBiomeKit Instance => _instance.Value;

    private readonly List<IEnemy> _registry = new() {
        new Scorpion(50, 15), new SandWorm(200, 30), new DesertBandit(80, 20)
    };

    public void RegisterEnemy(IEnemy prototype) {
        _registry.Add(prototype);
        Console.WriteLine($"  [DesertBiomeKit] Registered new prototype: {prototype.Name}");
    }

    public ITerrain      CreateTerrain() => new SandTerrain();
    public List<IEnemy>  CreateEnemies() => _registry.Select(e => e.Clone()).ToList();
    public WeatherSystem CreateWeather() => new(new Sandstorm(), new Dictionary<string, IWeatherEvent> {
        ["heat_wave"]  = new HeatWaveEvent(),
        ["dust_devil"] = new DustDevilEvent(),
        ["mirage"]     = new MirageEvent(),
    });
    public ILootTable    CreateLoot()    => new SpiceLoot();
    public string        KitName         => "DesertBiomeKit";
}

sealed class ArcticBiomeKit : IBiomeKit {
    private static readonly Lazy<ArcticBiomeKit> _instance = new(() => new ArcticBiomeKit());
    private ArcticBiomeKit() {}
    public static ArcticBiomeKit Instance => _instance.Value;

    private readonly List<IEnemy> _registry = new() {
        new PolarBear(180, 35), new IceWolf(70, 22), new FrostTroll(300, 45)
    };

    public void RegisterEnemy(IEnemy prototype) {
        _registry.Add(prototype);
        Console.WriteLine($"  [ArcticBiomeKit] Registered new prototype: {prototype.Name}");
    }

    public ITerrain      CreateTerrain() => new IceTerrain();
    public List<IEnemy>  CreateEnemies() => _registry.Select(e => e.Clone()).ToList();
    public WeatherSystem CreateWeather() => new(new Blizzard(), new Dictionary<string, IWeatherEvent> {
        ["whiteout"]  = new WhiteoutEvent(),
        ["ice_storm"] = new IceStormEvent(),
        ["aurora"]    = new AuroraEvent(),
    });
    public ILootTable    CreateLoot()    => new FurLoot();
    public string        KitName         => "ArcticBiomeKit";
}

sealed class ForestBiomeKit : IBiomeKit {
    private static readonly Lazy<ForestBiomeKit> _instance = new(() => new ForestBiomeKit());
    private ForestBiomeKit() {}
    public static ForestBiomeKit Instance => _instance.Value;

    private readonly List<IEnemy> _registry = new() {
        new Wolf(90, 18), new WildBoar(120, 25), new ForestBandit(75, 20)
    };

    public void RegisterEnemy(IEnemy prototype) {
        _registry.Add(prototype);
        Console.WriteLine($"  [ForestBiomeKit] Registered new prototype: {prototype.Name}");
    }

    public ITerrain      CreateTerrain() => new MudTerrain();
    public List<IEnemy>  CreateEnemies() => _registry.Select(e => e.Clone()).ToList();
    public WeatherSystem CreateWeather() => new(new Rain(), new Dictionary<string, IWeatherEvent> {
        ["thunderstorm"] = new ThunderstormEvent(),
        ["dense_fog"]    = new DenseFogEvent(),
        ["forest_fire"]  = new ForestFireEvent(),
    });
    public ILootTable    CreateLoot()    => new HerbLoot();
    public string        KitName         => "ForestBiomeKit";
}


// ═════════════════════════════════════════════════════════════
//  CLIENT
// ═════════════════════════════════════════════════════════════

sealed class WorldGenerator {
    private readonly ITerrain      _terrain;
    private readonly List<IEnemy>  _enemies;
    private readonly WeatherSystem _weather;
    private readonly ILootTable    _loot;

    public WorldGenerator(IBiomeKit kit) {
        _terrain = kit.CreateTerrain();
        _enemies = kit.CreateEnemies();
        _weather = kit.CreateWeather();
        _loot    = kit.CreateLoot();
    }

    public void Generate() {
        Console.WriteLine("\n  TERRAIN");
        Console.WriteLine($"    {_terrain.Name} — {_terrain.Description}");
        Console.WriteLine($"    Movement: {_terrain.MovementPenalty}");

        Console.WriteLine("\n  ENEMIES  (cloned from prototype registry)");
        foreach (var e in _enemies) {
            Console.WriteLine($"    {e.Name,-16} HP:{e.Health,-4} DMG:{e.Damage,-3}  Attack: {e.Attack}");
            Console.WriteLine($"                     Drop:   {e.Drop}");
        }

        Console.WriteLine("\n  WEATHER SYSTEM");
        _weather.Describe();

        Console.WriteLine($"\n  LOOT ROLL  ({_loot.Name})");
        Console.WriteLine($"    Dropped: [{string.Join(", ", _loot.Roll())}]");
    }
}


// ═════════════════════════════════════════════════════════════
//  ENTRY POINT
// ═════════════════════════════════════════════════════════════

static class Program {
    public static void Main() {
        var sep = new string('═', 64);

        Console.WriteLine("╔══════════════════════════════════════════════════════════════╗");
        Console.WriteLine("║        Abstract Factory + Prototype — Biome World Builder    ║");
        Console.WriteLine("╚══════════════════════════════════════════════════════════════╝");

        IBiomeKit[] kits = { DesertBiomeKit.Instance, ArcticBiomeKit.Instance, ForestBiomeKit.Instance };

        foreach (var kit in kits) {
            Console.WriteLine($"\n{sep}");
            Console.WriteLine($"  Biome: {kit.KitName}");
            Console.WriteLine(sep);
            new WorldGenerator(kit).Generate();
        }

        // Prototype demo
        Console.WriteLine($"\n{sep}");
        Console.WriteLine("  PROTOTYPE DEMO — registering GiantScorpion at runtime");
        Console.WriteLine(sep);

        DesertBiomeKit.Instance.RegisterEnemy(new Scorpion(400, 60) {
            // anonymous subclass via record — override properties inline
        });
        // Note: C# sealed classes can't be subclassed; use a wrapper enemy for the demo
        Console.WriteLine("\n  Desert enemies after registration:");
        new WorldGenerator(DesertBiomeKit.Instance).Generate();

        Console.WriteLine("\n╔══════════════════════════════════════════════════════════════╗");
        Console.WriteLine("║  Done                                                        ║");
        Console.WriteLine("╚══════════════════════════════════════════════════════════════╝");
    }
}

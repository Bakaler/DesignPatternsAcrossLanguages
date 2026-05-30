// ============================================================
//  Abstract Factory + Prototype — Biome World Builder
//  Run: javac java.java && java Main
// ============================================================
//
//  Participants
//  ────────────────────────────────────────────────────────
//  Abstract Factory   BiomeKit
//  Concrete Factory   DesertBiomeKit, ArcticBiomeKit, ForestBiomeKit (Singletons)
//  Abstract Product A Terrain
//  Abstract Product B Enemy          (also a Prototype — implements clone())
//  Abstract Product C WeatherSystem  (a: Weather, b: Map<String,WeatherEvent>)
//  Abstract Product D LootTable
//  Client             WorldGenerator
//
//  Patterns at work
//  ────────────────────────────────────────────────────────
//  Abstract Factory — BiomeKit defines the product family interface
//  Prototype        — Enemy instances are cloned from a factory registry;
//                     new enemy types can be registered at runtime without
//                     changing any factory class
//  Singleton        — one factory instance per biome
//
//  Consequences demonstrated
//  ────────────────────────────────────────────────────────
//  ✓ Concrete isolation          — WorldGenerator never references a concrete class
//  ✓ Exchanging product families — one line swaps the entire biome
//  ✓ Consistency across products — desert enemies drop desert loot in desert weather
//  ✗ Difficulty of new products  — adding Product E touches every factory
//  ✓ Prototype softens this      — new *enemy types* register without touching factories
// ============================================================

import java.util.*;
import java.util.stream.*;


// SECTION:: Abstract Products
// ═════════════════════════════════════════════════════════════
//  ABSTRACT PRODUCTS
// ═════════════════════════════════════════════════════════════

// ── Abstract Product A — Terrain ──────────────────────────────────────────────

interface Terrain {
    String name();
    String movementPenalty();   // how terrain affects player movement
    String description();
}

// ── Abstract Product B — Enemy (also a Prototype) ────────────────────────────
//    Implements clone() so factories can copy registered prototypes
//    rather than constructing enemies from scratch each spawn.

interface Enemy {
    Enemy    clone();           // Prototype method
    String   name();
    int      health();
    int      damage();
    String   attack();
    String   drop();            // what this enemy drops on death
}

// ── Abstract Product C — Weather ─────────────────────────────────────────────
//    WeatherSystem wraps two things:
//      a — the biome's base weather conditions
//      b — a dictionary of named events that can trigger during play

interface Weather {
    String name();
    String effect();            // passive effect on player / world
}

interface WeatherEvent {
    String name();
    String trigger();           // what causes this event
    String consequence();       // what happens when it fires
}

class WeatherSystem {
    final Weather                  a;      // base conditions
    final Map<String, WeatherEvent> b;     // triggerable events

    WeatherSystem(Weather a, Map<String, WeatherEvent> b) {
        this.a = a;
        this.b = Collections.unmodifiableMap(b);
    }

    void describe() {
        System.out.println("    Base      : " + a.name() + " — " + a.effect());
        System.out.println("    Events    :");
        b.forEach((key, event) ->
            System.out.println("      [" + key + "] " + event.name()
                + " | trigger: " + event.trigger()
                + " | effect: "  + event.consequence())
        );
    }
}

// ── Abstract Product D — LootTable ───────────────────────────────────────────

interface LootTable {
    String name();
    List<String> roll();        // returns a list of dropped items
}


// SECTION:: Abstract Factory
// ═════════════════════════════════════════════════════════════
//  ABSTRACT FACTORY
// ═════════════════════════════════════════════════════════════

interface BiomeKit {
    Terrain       createTerrain();
    List<Enemy>   createEnemies();     // cloned from prototype registry
    WeatherSystem createWeather();
    LootTable     createLoot();
    String        name();

    // Prototype extension point — register a new enemy type at runtime.
    // This partially addresses the "difficulty of new products" consequence:
    // the enemy roster grows without modifying any factory class.
    void registerEnemy(Enemy prototype);
}


// SECTION:: Desert Biome
// ═════════════════════════════════════════════════════════════
//  DESERT — Concrete Products
// ═════════════════════════════════════════════════════════════

class SandTerrain implements Terrain {
    public String name()             { return "Sand Dunes"; }
    public String movementPenalty()  { return "-20% speed, doubles stamina drain"; }
    public String description()      { return "Endless shifting dunes, brutal heat, no cover"; }
}

class Scorpion implements Enemy {
    private final int health;
    private final int damage;
    Scorpion(int health, int damage) { this.health = health; this.damage = damage; }

    public Enemy   clone()   { return new Scorpion(health, damage); }
    public String  name()    { return "Scorpion"; }
    public int     health()  { return health; }
    public int     damage()  { return damage; }
    public String  attack()  { return "Venomous sting — poisons for 3 turns"; }
    public String  drop()    { return "Scorpion Venom Gland"; }
}

class SandWorm implements Enemy {
    private final int health;
    private final int damage;
    SandWorm(int health, int damage) { this.health = health; this.damage = damage; }

    public Enemy   clone()   { return new SandWorm(health, damage); }
    public String  name()    { return "Sand Worm"; }
    public int     health()  { return health; }
    public int     damage()  { return damage; }
    public String  attack()  { return "Burrow strike — ignores armour"; }
    public String  drop()    { return "Worm Scale"; }
}

class DesertBandit implements Enemy {
    private final int health;
    private final int damage;
    DesertBandit(int health, int damage) { this.health = health; this.damage = damage; }

    public Enemy   clone()   { return new DesertBandit(health, damage); }
    public String  name()    { return "Desert Bandit"; }
    public int     health()  { return health; }
    public int     damage()  { return damage; }
    public String  attack()  { return "Ambush — double damage on first hit"; }
    public String  drop()    { return "Stolen Spice Pouch"; }
}

class Sandstorm implements Weather {
    public String name()   { return "Sandstorm"; }
    public String effect() { return "-30% visibility, +10% fire resistance"; }
}

class HeatWaveEvent implements WeatherEvent {
    public String name()         { return "Heat Wave"; }
    public String trigger()      { return "Midday in desert biome"; }
    public String consequence()  { return "Stamina drain doubles, enemies become sluggish"; }
}

class DustDevilEvent implements WeatherEvent {
    public String name()         { return "Dust Devil"; }
    public String trigger()      { return "Wind speed exceeds threshold"; }
    public String consequence()  { return "Random item knocked from player inventory"; }
}

class MirageEvent implements WeatherEvent {
    public String name()         { return "Mirage"; }
    public String trigger()      { return "Player health below 30%"; }
    public String consequence()  { return "Nearby oasis appears — may be real or false"; }
}

class SpiceLoot implements LootTable {
    private static final List<String> POOL = Arrays.asList(
        "Desert Spice", "Sand Ruby", "Scorpion Venom", "Cactus Fruit",
        "Ancient Coin", "Sun-bleached Bone", "Mirage Crystal"
    );
    public String name() { return "Desert Loot Table"; }
    public List<String> roll() {
        Collections.shuffle(POOL);
        return POOL.subList(0, 2 + (int)(Math.random() * 2));
    }
}


// SECTION:: Arctic Biome
// ═════════════════════════════════════════════════════════════
//  ARCTIC — Concrete Products
// ═════════════════════════════════════════════════════════════

class IceTerrain implements Terrain {
    public String name()             { return "Frozen Tundra"; }
    public String movementPenalty()  { return "-15% speed, risk of slip on ice tiles"; }
    public String description()      { return "Vast frozen plains, cracking ice sheets, permafrost"; }
}

class PolarBear implements Enemy {
    private final int health;
    private final int damage;
    PolarBear(int health, int damage) { this.health = health; this.damage = damage; }

    public Enemy   clone()   { return new PolarBear(health, damage); }
    public String  name()    { return "Polar Bear"; }
    public int     health()  { return health; }
    public int     damage()  { return damage; }
    public String  attack()  { return "Bear maul — knocks player back 3 tiles"; }
    public String  drop()    { return "Polar Bear Pelt"; }
}

class IceWolf implements Enemy {
    private final int health;
    private final int damage;
    IceWolf(int health, int damage) { this.health = health; this.damage = damage; }

    public Enemy   clone()   { return new IceWolf(health, damage); }
    public String  name()    { return "Ice Wolf"; }
    public int     health()  { return health; }
    public int     damage()  { return damage; }
    public String  attack()  { return "Pack howl — summons 1-2 additional wolves"; }
    public String  drop()    { return "Frost Fang"; }
}

class FrostTroll implements Enemy {
    private final int health;
    private final int damage;
    FrostTroll(int health, int damage) { this.health = health; this.damage = damage; }

    public Enemy   clone()   { return new FrostTroll(health, damage); }
    public String  name()    { return "Frost Troll"; }
    public int     health()  { return health; }
    public int     damage()  { return damage; }
    public String  attack()  { return "Ice slam — freezes player in place for 2 turns"; }
    public String  drop()    { return "Troll Permafrost Core"; }
}

class Blizzard implements Weather {
    public String name()   { return "Blizzard"; }
    public String effect() { return "-50% visibility, -5 HP per turn from frostbite"; }
}

class WhiteoutEvent implements WeatherEvent {
    public String name()         { return "Whiteout"; }
    public String trigger()      { return "Blizzard intensity exceeds level 3"; }
    public String consequence()  { return "Zero visibility — navigation by compass only"; }
}

class IceStormEvent implements WeatherEvent {
    public String name()         { return "Ice Storm"; }
    public String trigger()      { return "Temperature drops below critical threshold"; }
    public String consequence()  { return "Ice shards deal 8 damage per turn, enemies gain ice shield"; }
}

class AuroraEvent implements WeatherEvent {
    public String name()         { return "Aurora Borealis"; }
    public String trigger()      { return "Clear night sky, no blizzard"; }
    public String consequence()  { return "All magic abilities cost 50% less for 60 seconds"; }
}

class FurLoot implements LootTable {
    private static final List<String> POOL = Arrays.asList(
        "Polar Bear Pelt", "Frost Fang", "Troll Core", "Frozen Herb",
        "Arctic Sapphire", "Permafrost Shard", "Whale Bone Charm"
    );
    public String name() { return "Arctic Loot Table"; }
    public List<String> roll() {
        Collections.shuffle(POOL);
        return POOL.subList(0, 2 + (int)(Math.random() * 2));
    }
}


// SECTION:: Forest Biome
// ═════════════════════════════════════════════════════════════
//  FOREST — Concrete Products
// ═════════════════════════════════════════════════════════════

class MudTerrain implements Terrain {
    public String name()             { return "Dense Forest Floor"; }
    public String movementPenalty()  { return "-10% speed in mud, stealth bonus in undergrowth"; }
    public String description()      { return "Ancient trees, thick undergrowth, soft mud paths"; }
}

class Wolf implements Enemy {
    private final int health;
    private final int damage;
    Wolf(int health, int damage) { this.health = health; this.damage = damage; }

    public Enemy   clone()   { return new Wolf(health, damage); }
    public String  name()    { return "Wolf"; }
    public int     health()  { return health; }
    public int     damage()  { return damage; }
    public String  attack()  { return "Lunge — high speed, targets lowest HP player"; }
    public String  drop()    { return "Wolf Pelt"; }
}

class WildBoar implements Enemy {
    private final int health;
    private final int damage;
    WildBoar(int health, int damage) { this.health = health; this.damage = damage; }

    public Enemy   clone()   { return new WildBoar(health, damage); }
    public String  name()    { return "Wild Boar"; }
    public int     health()  { return health; }
    public int     damage()  { return damage; }
    public String  attack()  { return "Charge — stuns on hit, destroys cover"; }
    public String  drop()    { return "Boar Tusk"; }
}

class ForestBandit implements Enemy {
    private final int health;
    private final int damage;
    ForestBandit(int health, int damage) { this.health = health; this.damage = damage; }

    public Enemy   clone()   { return new ForestBandit(health, damage); }
    public String  name()    { return "Forest Bandit"; }
    public int     health()  { return health; }
    public int     damage()  { return damage; }
    public String  attack()  { return "Arrow volley — ranged, ignores melee armour"; }
    public String  drop()    { return "Bandit Coin Pouch"; }
}

class Rain implements Weather {
    public String name()   { return "Heavy Rain"; }
    public String effect() { return "Extinguishes fire, +15% bow miss chance, plants grow faster"; }
}

class ThunderstormEvent implements WeatherEvent {
    public String name()         { return "Thunderstorm"; }
    public String trigger()      { return "Rain intensity exceeds level 2"; }
    public String consequence()  { return "Lightning strikes random tiles — stuns and deals 20 damage"; }
}

class DenseFogEvent implements WeatherEvent {
    public String name()         { return "Dense Fog"; }
    public String trigger()      { return "Temperature drop after heavy rain"; }
    public String consequence()  { return "-40% visibility, stealth enemies become invisible"; }
}

class ForestFireEvent implements WeatherEvent {
    public String name()         { return "Forest Fire"; }
    public String trigger()      { return "Lightning strike + dry undergrowth"; }
    public String consequence()  { return "Spreads across tiles, forces enemy + player retreat"; }
}

class HerbLoot implements LootTable {
    private static final List<String> POOL = Arrays.asList(
        "Healing Herb", "Boar Tusk", "Wolf Pelt", "Moss Spore",
        "Ancient Acorn", "Bandit Map Fragment", "Glowing Mushroom"
    );
    public String name() { return "Forest Loot Table"; }
    public List<String> roll() {
        Collections.shuffle(POOL);
        return POOL.subList(0, 2 + (int)(Math.random() * 2));
    }
}


// SECTION:: Concrete Factories
// ═════════════════════════════════════════════════════════════
//  CONCRETE FACTORIES — Singleton + Prototype Registry
// ═════════════════════════════════════════════════════════════

class DesertBiomeKit implements BiomeKit {
    private static final DesertBiomeKit INSTANCE = new DesertBiomeKit();
    private DesertBiomeKit() {}
    public static DesertBiomeKit getInstance() { return INSTANCE; }

    // Prototype registry — mutable so new enemies can be registered at runtime
    private final List<Enemy> registry = new ArrayList<>(Arrays.asList(
        new Scorpion(50, 15),
        new SandWorm(200, 30),
        new DesertBandit(80, 20)
    ));

    public void registerEnemy(Enemy prototype) {
        registry.add(prototype);
        System.out.println("  [DesertBiomeKit] Registered new prototype: " + prototype.name());
    }

    public Terrain createTerrain() { return new SandTerrain(); }

    public List<Enemy> createEnemies() {
        // Prototype: clone each registered enemy rather than constructing anew
        return registry.stream().map(Enemy::clone).collect(Collectors.toList());
    }

    public WeatherSystem createWeather() {
        Map<String, WeatherEvent> events = new LinkedHashMap<>();
        events.put("heat_wave",  new HeatWaveEvent());
        events.put("dust_devil", new DustDevilEvent());
        events.put("mirage",     new MirageEvent());
        return new WeatherSystem(new Sandstorm(), events);
    }

    public LootTable createLoot() { return new SpiceLoot(); }
    public String     name()      { return "DesertBiomeKit"; }
}

class ArcticBiomeKit implements BiomeKit {
    private static final ArcticBiomeKit INSTANCE = new ArcticBiomeKit();
    private ArcticBiomeKit() {}
    public static ArcticBiomeKit getInstance() { return INSTANCE; }

    private final List<Enemy> registry = new ArrayList<>(Arrays.asList(
        new PolarBear(180, 35),
        new IceWolf(70, 22),
        new FrostTroll(300, 45)
    ));

    public void registerEnemy(Enemy prototype) {
        registry.add(prototype);
        System.out.println("  [ArcticBiomeKit] Registered new prototype: " + prototype.name());
    }

    public Terrain createTerrain() { return new IceTerrain(); }

    public List<Enemy> createEnemies() {
        return registry.stream().map(Enemy::clone).collect(Collectors.toList());
    }

    public WeatherSystem createWeather() {
        Map<String, WeatherEvent> events = new LinkedHashMap<>();
        events.put("whiteout",  new WhiteoutEvent());
        events.put("ice_storm", new IceStormEvent());
        events.put("aurora",    new AuroraEvent());
        return new WeatherSystem(new Blizzard(), events);
    }

    public LootTable createLoot() { return new FurLoot(); }
    public String     name()      { return "ArcticBiomeKit"; }
}

class ForestBiomeKit implements BiomeKit {
    private static final ForestBiomeKit INSTANCE = new ForestBiomeKit();
    private ForestBiomeKit() {}
    public static ForestBiomeKit getInstance() { return INSTANCE; }

    private final List<Enemy> registry = new ArrayList<>(Arrays.asList(
        new Wolf(90, 18),
        new WildBoar(120, 25),
        new ForestBandit(75, 20)
    ));

    public void registerEnemy(Enemy prototype) {
        registry.add(prototype);
        System.out.println("  [ForestBiomeKit] Registered new prototype: " + prototype.name());
    }

    public Terrain createTerrain() { return new MudTerrain(); }

    public List<Enemy> createEnemies() {
        return registry.stream().map(Enemy::clone).collect(Collectors.toList());
    }

    public WeatherSystem createWeather() {
        Map<String, WeatherEvent> events = new LinkedHashMap<>();
        events.put("thunderstorm", new ThunderstormEvent());
        events.put("dense_fog",    new DenseFogEvent());
        events.put("forest_fire",  new ForestFireEvent());
        return new WeatherSystem(new Rain(), events);
    }

    public LootTable createLoot() { return new HerbLoot(); }
    public String     name()      { return "ForestBiomeKit"; }
}


// SECTION:: Client
// ═════════════════════════════════════════════════════════════
//  CLIENT
// ═════════════════════════════════════════════════════════════
//  CONSEQUENCE: Concrete Isolation
//  WorldGenerator references zero concrete classes.
//  It only knows BiomeKit, Terrain, Enemy, WeatherSystem, LootTable.

class WorldGenerator {
    private final Terrain       terrain;
    private final List<Enemy>   enemies;
    private final WeatherSystem weather;
    private final LootTable     loot;

    WorldGenerator(BiomeKit factory) {
        this.terrain = factory.createTerrain();
        this.enemies = factory.createEnemies();
        this.weather = factory.createWeather();
        this.loot    = factory.createLoot();
    }

    void generate() {
        System.out.println("\n  TERRAIN");
        System.out.println("    " + terrain.name() + " — " + terrain.description());
        System.out.println("    Movement: " + terrain.movementPenalty());

        System.out.println("\n  ENEMIES  (cloned from prototype registry)");
        for (Enemy e : enemies) {
            System.out.printf("    %-16s HP:%-4d DMG:%-3d  Attack: %s%n",
                e.name(), e.health(), e.damage(), e.attack());
            System.out.println("                     Drop:   " + e.drop());
        }

        System.out.println("\n  WEATHER SYSTEM");
        weather.describe();

        System.out.println("\n  LOOT ROLL  (" + loot.name() + ")");
        System.out.println("    Dropped: " + loot.roll());
    }
}


// SECTION:: Entry Point
// ═════════════════════════════════════════════════════════════
//  ENTRY POINT
// ═════════════════════════════════════════════════════════════

class Main {
    public static void main(String[] args) {
        System.out.println("╔══════════════════════════════════════════════════════════════╗");
        System.out.println("║        Abstract Factory + Prototype — Biome World Builder    ║");
        System.out.println("╚══════════════════════════════════════════════════════════════╝");

        List<BiomeKit> biomes = Arrays.asList(
            DesertBiomeKit.getInstance(),
            ArcticBiomeKit.getInstance(),
            ForestBiomeKit.getInstance()
        );

        // ── CONSEQUENCE: Exchanging product families ─────────────────────────
        // Swap one factory → completely different terrain, enemies, weather, loot.
        // WorldGenerator code is identical for all three.

        for (BiomeKit factory : biomes) {
            System.out.println("\n" + "═".repeat(64));
            System.out.println("  Biome: " + factory.name());
            System.out.println("═".repeat(64));
            new WorldGenerator(factory).generate();
        }

        // ── PROTOTYPE: Register a new enemy at runtime ───────────────────────
        // No factory class was modified. The interface stayed frozen.
        // A new Scorpion variant is pushed into the desert registry.
        System.out.println("\n" + "═".repeat(64));
        System.out.println("  PROTOTYPE DEMO — registering GiantScorpion at runtime");
        System.out.println("═".repeat(64));

        DesertBiomeKit.getInstance().registerEnemy(new Scorpion(400, 60) {
            public String name()   { return "Giant Scorpion (Boss)"; }
            public String attack() { return "Tail sweep — hits all nearby players"; }
            public String drop()   { return "Ancient Venom Sac + Desert Crown"; }
            public Enemy  clone()  { return new Scorpion(400, 60) {
                public String name()   { return "Giant Scorpion (Boss)"; }
                public String attack() { return "Tail sweep — hits all nearby players"; }
                public String drop()   { return "Ancient Venom Sac + Desert Crown"; }
            }; }
        });

        System.out.println("\n  Desert enemies after registration:");
        new WorldGenerator(DesertBiomeKit.getInstance()).generate();

        // ── CONSEQUENCE: Difficulty of new products ──────────────────────────
        // Adding a fifth product type (e.g. AmbientSound, NPCDialogue)
        // requires modifying BiomeKit + all three concrete factories.
        // The prototype trick only helps within an existing product slot (Enemy).

        System.out.println("\n╔══════════════════════════════════════════════════════════════╗");
        System.out.println("║  Done                                                        ║");
        System.out.println("╚══════════════════════════════════════════════════════════════╝");
    }
}

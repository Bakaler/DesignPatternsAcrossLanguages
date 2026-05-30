// ============================================================
//  Abstract Factory + Prototype — Biome World Builder
//  Compile: g++ -std=c++17 -o cpp cpp.cpp && ./cpp
// ============================================================
//
//  Participants
//  ────────────────────────────────────────────────────────
//  Abstract Factory   BiomeKit
//  Concrete Factory   DesertBiomeKit, ArcticBiomeKit, ForestBiomeKit (Singletons)
//  Abstract Product A Terrain
//  Abstract Product B Enemy          (also a Prototype — implements clone())
//  Abstract Product C WeatherSystem  (a: Weather, b: map<string, WeatherEvent>)
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

#include <iostream>
#include <string>
#include <vector>
#include <map>
#include <memory>
#include <algorithm>
#include <random>
#include <iomanip>


// SECTION:: Abstract Products
// ═════════════════════════════════════════════════════════════
//  ABSTRACT PRODUCTS
// ═════════════════════════════════════════════════════════════

// ── Abstract Product A — Terrain ─────────────────────────────────────────────

struct Terrain {
    virtual ~Terrain() = default;
    virtual std::string name()            const = 0;
    virtual std::string movementPenalty() const = 0;
    virtual std::string description()     const = 0;
};

// ── Abstract Product B — Enemy (also a Prototype) ────────────────────────────

struct Enemy {
    virtual ~Enemy() = default;
    virtual std::unique_ptr<Enemy> clone()  const = 0;
    virtual std::string name()              const = 0;
    virtual int         health()            const = 0;
    virtual int         damage()            const = 0;
    virtual std::string attack()            const = 0;
    virtual std::string drop()              const = 0;
};

// ── Abstract Product C — Weather ─────────────────────────────────────────────

struct Weather {
    virtual ~Weather() = default;
    virtual std::string name()   const = 0;
    virtual std::string effect() const = 0;
};

struct WeatherEvent {
    virtual ~WeatherEvent() = default;
    virtual std::string name()        const = 0;
    virtual std::string trigger()     const = 0;
    virtual std::string consequence() const = 0;
};

struct WeatherSystem {
    std::unique_ptr<Weather>                                base;
    std::map<std::string, std::unique_ptr<WeatherEvent>>   events;

    void describe() const {
        std::cout << "    Base      : " << base->name() << " — " << base->effect() << "\n";
        std::cout << "    Events    :\n";
        for (auto& [key, ev] : events) {
            std::cout << "      [" << key << "] " << ev->name()
                      << " | trigger: " << ev->trigger()
                      << " | effect: "  << ev->consequence() << "\n";
        }
    }
};

// ── Abstract Product D — LootTable ───────────────────────────────────────────

struct LootTable {
    virtual ~LootTable() = default;
    virtual std::string          name() const = 0;
    virtual std::vector<std::string> roll()   = 0;
};


// SECTION:: Abstract Factory
// ═════════════════════════════════════════════════════════════
//  ABSTRACT FACTORY
// ═════════════════════════════════════════════════════════════

struct BiomeKit {
    virtual ~BiomeKit() = default;
    virtual std::unique_ptr<Terrain>      createTerrain()    = 0;
    virtual std::vector<std::unique_ptr<Enemy>> createEnemies() = 0;
    virtual WeatherSystem                 createWeather()    = 0;
    virtual std::unique_ptr<LootTable>    createLoot()       = 0;
    virtual std::string                   kitName()    const = 0;
    virtual void registerEnemy(std::unique_ptr<Enemy> proto) = 0;
};


// SECTION:: Desert Biome
// ═════════════════════════════════════════════════════════════
//  DESERT — Concrete Products
// ═════════════════════════════════════════════════════════════

struct SandTerrain : Terrain {
    std::string name()            const override { return "Sand Dunes"; }
    std::string movementPenalty() const override { return "-20% speed, doubles stamina drain"; }
    std::string description()     const override { return "Endless shifting dunes, brutal heat, no cover"; }
};

struct Scorpion : Enemy {
    int hp, dmg;
    Scorpion(int h, int d) : hp(h), dmg(d) {}
    std::unique_ptr<Enemy> clone()  const override { return std::make_unique<Scorpion>(hp, dmg); }
    std::string name()              const override { return "Scorpion"; }
    int         health()            const override { return hp; }
    int         damage()            const override { return dmg; }
    std::string attack()            const override { return "Venomous sting — poisons for 3 turns"; }
    std::string drop()              const override { return "Scorpion Venom Gland"; }
};

struct SandWorm : Enemy {
    int hp, dmg;
    SandWorm(int h, int d) : hp(h), dmg(d) {}
    std::unique_ptr<Enemy> clone()  const override { return std::make_unique<SandWorm>(hp, dmg); }
    std::string name()              const override { return "Sand Worm"; }
    int         health()            const override { return hp; }
    int         damage()            const override { return dmg; }
    std::string attack()            const override { return "Burrow strike — ignores armour"; }
    std::string drop()              const override { return "Worm Scale"; }
};

struct DesertBandit : Enemy {
    int hp, dmg;
    DesertBandit(int h, int d) : hp(h), dmg(d) {}
    std::unique_ptr<Enemy> clone()  const override { return std::make_unique<DesertBandit>(hp, dmg); }
    std::string name()              const override { return "Desert Bandit"; }
    int         health()            const override { return hp; }
    int         damage()            const override { return dmg; }
    std::string attack()            const override { return "Ambush — double damage on first hit"; }
    std::string drop()              const override { return "Stolen Spice Pouch"; }
};

struct Sandstorm : Weather {
    std::string name()   const override { return "Sandstorm"; }
    std::string effect() const override { return "-30% visibility, +10% fire resistance"; }
};
struct HeatWaveEvent : WeatherEvent {
    std::string name()        const override { return "Heat Wave"; }
    std::string trigger()     const override { return "Midday in desert biome"; }
    std::string consequence() const override { return "Stamina drain doubles, enemies become sluggish"; }
};
struct DustDevilEvent : WeatherEvent {
    std::string name()        const override { return "Dust Devil"; }
    std::string trigger()     const override { return "Wind speed exceeds threshold"; }
    std::string consequence() const override { return "Random item knocked from player inventory"; }
};
struct MirageEvent : WeatherEvent {
    std::string name()        const override { return "Mirage"; }
    std::string trigger()     const override { return "Player health below 30%"; }
    std::string consequence() const override { return "Nearby oasis appears — may be real or false"; }
};

struct SpiceLoot : LootTable {
    std::string name() const override { return "Desert Loot Table"; }
    std::vector<std::string> roll() override {
        std::vector<std::string> pool = {
            "Desert Spice", "Sand Ruby", "Scorpion Venom",
            "Cactus Fruit",  "Ancient Coin", "Sun-bleached Bone", "Mirage Crystal"
        };
        std::shuffle(pool.begin(), pool.end(), std::mt19937{std::random_device{}()});
        int count = 2 + (std::rand() % 2);
        return { pool.begin(), pool.begin() + count };
    }
};


// SECTION:: Arctic Biome
// ═════════════════════════════════════════════════════════════
//  ARCTIC — Concrete Products
// ═════════════════════════════════════════════════════════════

struct IceTerrain : Terrain {
    std::string name()            const override { return "Frozen Tundra"; }
    std::string movementPenalty() const override { return "-15% speed, risk of slip on ice tiles"; }
    std::string description()     const override { return "Vast frozen plains, cracking ice sheets, permafrost"; }
};
struct PolarBear : Enemy {
    int hp, dmg;
    PolarBear(int h, int d) : hp(h), dmg(d) {}
    std::unique_ptr<Enemy> clone()  const override { return std::make_unique<PolarBear>(hp, dmg); }
    std::string name()              const override { return "Polar Bear"; }
    int         health()            const override { return hp; }
    int         damage()            const override { return dmg; }
    std::string attack()            const override { return "Bear maul — knocks player back 3 tiles"; }
    std::string drop()              const override { return "Polar Bear Pelt"; }
};
struct IceWolf : Enemy {
    int hp, dmg;
    IceWolf(int h, int d) : hp(h), dmg(d) {}
    std::unique_ptr<Enemy> clone()  const override { return std::make_unique<IceWolf>(hp, dmg); }
    std::string name()              const override { return "Ice Wolf"; }
    int         health()            const override { return hp; }
    int         damage()            const override { return dmg; }
    std::string attack()            const override { return "Pack howl — summons 1-2 additional wolves"; }
    std::string drop()              const override { return "Frost Fang"; }
};
struct FrostTroll : Enemy {
    int hp, dmg;
    FrostTroll(int h, int d) : hp(h), dmg(d) {}
    std::unique_ptr<Enemy> clone()  const override { return std::make_unique<FrostTroll>(hp, dmg); }
    std::string name()              const override { return "Frost Troll"; }
    int         health()            const override { return hp; }
    int         damage()            const override { return dmg; }
    std::string attack()            const override { return "Ice slam — freezes player in place for 2 turns"; }
    std::string drop()              const override { return "Troll Permafrost Core"; }
};
struct Blizzard : Weather {
    std::string name()   const override { return "Blizzard"; }
    std::string effect() const override { return "-50% visibility, -5 HP per turn from frostbite"; }
};
struct WhiteoutEvent : WeatherEvent {
    std::string name()        const override { return "Whiteout"; }
    std::string trigger()     const override { return "Blizzard intensity exceeds level 3"; }
    std::string consequence() const override { return "Zero visibility — navigation by compass only"; }
};
struct IceStormEvent : WeatherEvent {
    std::string name()        const override { return "Ice Storm"; }
    std::string trigger()     const override { return "Temperature drops below critical threshold"; }
    std::string consequence() const override { return "Ice shards deal 8 damage per turn, enemies gain ice shield"; }
};
struct AuroraEvent : WeatherEvent {
    std::string name()        const override { return "Aurora Borealis"; }
    std::string trigger()     const override { return "Clear night sky, no blizzard"; }
    std::string consequence() const override { return "All magic abilities cost 50% less for 60 seconds"; }
};
struct FurLoot : LootTable {
    std::string name() const override { return "Arctic Loot Table"; }
    std::vector<std::string> roll() override {
        std::vector<std::string> pool = {
            "Polar Bear Pelt", "Frost Fang", "Troll Core",
            "Frozen Herb", "Arctic Sapphire", "Permafrost Shard", "Whale Bone Charm"
        };
        std::shuffle(pool.begin(), pool.end(), std::mt19937{std::random_device{}()});
        int count = 2 + (std::rand() % 2);
        return { pool.begin(), pool.begin() + count };
    }
};


// SECTION:: Forest Biome
// ═════════════════════════════════════════════════════════════
//  FOREST — Concrete Products
// ═════════════════════════════════════════════════════════════

struct MudTerrain : Terrain {
    std::string name()            const override { return "Dense Forest Floor"; }
    std::string movementPenalty() const override { return "-10% speed in mud, stealth bonus in undergrowth"; }
    std::string description()     const override { return "Ancient trees, thick undergrowth, soft mud paths"; }
};
struct Wolf : Enemy {
    int hp, dmg;
    Wolf(int h, int d) : hp(h), dmg(d) {}
    std::unique_ptr<Enemy> clone()  const override { return std::make_unique<Wolf>(hp, dmg); }
    std::string name()              const override { return "Wolf"; }
    int         health()            const override { return hp; }
    int         damage()            const override { return dmg; }
    std::string attack()            const override { return "Lunge — high speed, targets lowest HP player"; }
    std::string drop()              const override { return "Wolf Pelt"; }
};
struct WildBoar : Enemy {
    int hp, dmg;
    WildBoar(int h, int d) : hp(h), dmg(d) {}
    std::unique_ptr<Enemy> clone()  const override { return std::make_unique<WildBoar>(hp, dmg); }
    std::string name()              const override { return "Wild Boar"; }
    int         health()            const override { return hp; }
    int         damage()            const override { return dmg; }
    std::string attack()            const override { return "Charge — stuns on hit, destroys cover"; }
    std::string drop()              const override { return "Boar Tusk"; }
};
struct ForestBandit : Enemy {
    int hp, dmg;
    ForestBandit(int h, int d) : hp(h), dmg(d) {}
    std::unique_ptr<Enemy> clone()  const override { return std::make_unique<ForestBandit>(hp, dmg); }
    std::string name()              const override { return "Forest Bandit"; }
    int         health()            const override { return hp; }
    int         damage()            const override { return dmg; }
    std::string attack()            const override { return "Arrow volley — ranged, ignores melee armour"; }
    std::string drop()              const override { return "Bandit Coin Pouch"; }
};
struct Rain : Weather {
    std::string name()   const override { return "Heavy Rain"; }
    std::string effect() const override { return "Extinguishes fire, +15% bow miss chance, plants grow faster"; }
};
struct ThunderstormEvent : WeatherEvent {
    std::string name()        const override { return "Thunderstorm"; }
    std::string trigger()     const override { return "Rain intensity exceeds level 2"; }
    std::string consequence() const override { return "Lightning strikes random tiles — stuns and deals 20 damage"; }
};
struct DenseFogEvent : WeatherEvent {
    std::string name()        const override { return "Dense Fog"; }
    std::string trigger()     const override { return "Temperature drop after heavy rain"; }
    std::string consequence() const override { return "-40% visibility, stealth enemies become invisible"; }
};
struct ForestFireEvent : WeatherEvent {
    std::string name()        const override { return "Forest Fire"; }
    std::string trigger()     const override { return "Lightning strike + dry undergrowth"; }
    std::string consequence() const override { return "Spreads across tiles, forces enemy + player retreat"; }
};
struct HerbLoot : LootTable {
    std::string name() const override { return "Forest Loot Table"; }
    std::vector<std::string> roll() override {
        std::vector<std::string> pool = {
            "Healing Herb", "Boar Tusk", "Wolf Pelt",
            "Moss Spore", "Ancient Acorn", "Bandit Map Fragment", "Glowing Mushroom"
        };
        std::shuffle(pool.begin(), pool.end(), std::mt19937{std::random_device{}()});
        int count = 2 + (std::rand() % 2);
        return { pool.begin(), pool.begin() + count };
    }
};


// SECTION:: Concrete Factories
// ═════════════════════════════════════════════════════════════
//  CONCRETE FACTORIES — Singleton + Prototype Registry
// ═════════════════════════════════════════════════════════════

class DesertBiomeKit : public BiomeKit {
    std::vector<std::unique_ptr<Enemy>> registry;
    DesertBiomeKit() {
        registry.push_back(std::make_unique<Scorpion>(50, 15));
        registry.push_back(std::make_unique<SandWorm>(200, 30));
        registry.push_back(std::make_unique<DesertBandit>(80, 20));
    }
public:
    static DesertBiomeKit& getInstance() {
        static DesertBiomeKit instance;
        return instance;
    }
    DesertBiomeKit(const DesertBiomeKit&)            = delete;
    DesertBiomeKit& operator=(const DesertBiomeKit&) = delete;

    void registerEnemy(std::unique_ptr<Enemy> proto) override {
        std::cout << "  [DesertBiomeKit] Registered new prototype: " << proto->name() << "\n";
        registry.push_back(std::move(proto));
    }

    std::unique_ptr<Terrain> createTerrain() override { return std::make_unique<SandTerrain>(); }

    std::vector<std::unique_ptr<Enemy>> createEnemies() override {
        std::vector<std::unique_ptr<Enemy>> out;
        for (auto& e : registry) out.push_back(e->clone());
        return out;
    }

    WeatherSystem createWeather() override {
        WeatherSystem ws;
        ws.base = std::make_unique<Sandstorm>();
        ws.events["heat_wave"]  = std::make_unique<HeatWaveEvent>();
        ws.events["dust_devil"] = std::make_unique<DustDevilEvent>();
        ws.events["mirage"]     = std::make_unique<MirageEvent>();
        return ws;
    }

    std::unique_ptr<LootTable> createLoot() override { return std::make_unique<SpiceLoot>(); }
    std::string kitName() const override { return "DesertBiomeKit"; }
};

class ArcticBiomeKit : public BiomeKit {
    std::vector<std::unique_ptr<Enemy>> registry;
    ArcticBiomeKit() {
        registry.push_back(std::make_unique<PolarBear>(180, 35));
        registry.push_back(std::make_unique<IceWolf>(70, 22));
        registry.push_back(std::make_unique<FrostTroll>(300, 45));
    }
public:
    static ArcticBiomeKit& getInstance() {
        static ArcticBiomeKit instance;
        return instance;
    }
    ArcticBiomeKit(const ArcticBiomeKit&)            = delete;
    ArcticBiomeKit& operator=(const ArcticBiomeKit&) = delete;

    void registerEnemy(std::unique_ptr<Enemy> proto) override {
        std::cout << "  [ArcticBiomeKit] Registered new prototype: " << proto->name() << "\n";
        registry.push_back(std::move(proto));
    }

    std::unique_ptr<Terrain> createTerrain() override { return std::make_unique<IceTerrain>(); }

    std::vector<std::unique_ptr<Enemy>> createEnemies() override {
        std::vector<std::unique_ptr<Enemy>> out;
        for (auto& e : registry) out.push_back(e->clone());
        return out;
    }

    WeatherSystem createWeather() override {
        WeatherSystem ws;
        ws.base = std::make_unique<Blizzard>();
        ws.events["whiteout"]  = std::make_unique<WhiteoutEvent>();
        ws.events["ice_storm"] = std::make_unique<IceStormEvent>();
        ws.events["aurora"]    = std::make_unique<AuroraEvent>();
        return ws;
    }

    std::unique_ptr<LootTable> createLoot() override { return std::make_unique<FurLoot>(); }
    std::string kitName() const override { return "ArcticBiomeKit"; }
};

class ForestBiomeKit : public BiomeKit {
    std::vector<std::unique_ptr<Enemy>> registry;
    ForestBiomeKit() {
        registry.push_back(std::make_unique<Wolf>(90, 18));
        registry.push_back(std::make_unique<WildBoar>(120, 25));
        registry.push_back(std::make_unique<ForestBandit>(75, 20));
    }
public:
    static ForestBiomeKit& getInstance() {
        static ForestBiomeKit instance;
        return instance;
    }
    ForestBiomeKit(const ForestBiomeKit&)            = delete;
    ForestBiomeKit& operator=(const ForestBiomeKit&) = delete;

    void registerEnemy(std::unique_ptr<Enemy> proto) override {
        std::cout << "  [ForestBiomeKit] Registered new prototype: " << proto->name() << "\n";
        registry.push_back(std::move(proto));
    }

    std::unique_ptr<Terrain> createTerrain() override { return std::make_unique<MudTerrain>(); }

    std::vector<std::unique_ptr<Enemy>> createEnemies() override {
        std::vector<std::unique_ptr<Enemy>> out;
        for (auto& e : registry) out.push_back(e->clone());
        return out;
    }

    WeatherSystem createWeather() override {
        WeatherSystem ws;
        ws.base = std::make_unique<Rain>();
        ws.events["thunderstorm"] = std::make_unique<ThunderstormEvent>();
        ws.events["dense_fog"]    = std::make_unique<DenseFogEvent>();
        ws.events["forest_fire"]  = std::make_unique<ForestFireEvent>();
        return ws;
    }

    std::unique_ptr<LootTable> createLoot() override { return std::make_unique<HerbLoot>(); }
    std::string kitName() const override { return "ForestBiomeKit"; }
};


// SECTION:: Client
// ═════════════════════════════════════════════════════════════
//  CLIENT
// ═════════════════════════════════════════════════════════════
//  CONSEQUENCE: Concrete Isolation
//  WorldGenerator references zero concrete classes.
//  It only knows BiomeKit, Terrain, Enemy, WeatherSystem, LootTable.

class WorldGenerator {
    std::unique_ptr<Terrain>            terrain;
    std::vector<std::unique_ptr<Enemy>> enemies;
    WeatherSystem                       weather;
    std::unique_ptr<LootTable>          loot;
public:
    explicit WorldGenerator(BiomeKit& kit) {
        terrain = kit.createTerrain();
        enemies = kit.createEnemies();
        weather = kit.createWeather();
        loot    = kit.createLoot();
    }

    void generate() const {
        std::cout << "\n  TERRAIN\n";
        std::cout << "    " << terrain->name() << " — " << terrain->description() << "\n";
        std::cout << "    Movement: " << terrain->movementPenalty() << "\n";

        std::cout << "\n  ENEMIES  (cloned from prototype registry)\n";
        for (auto& e : enemies) {
            std::cout << "    " << std::left << std::setw(16) << e->name()
                      << " HP:"  << std::setw(4) << e->health()
                      << " DMG:" << std::setw(3) << e->damage()
                      << "  Attack: " << e->attack() << "\n";
            std::cout << "                     Drop:   " << e->drop() << "\n";
        }

        std::cout << "\n  WEATHER SYSTEM\n";
        weather.describe();

        auto drops = const_cast<LootTable*>(loot.get())->roll();
        std::cout << "\n  LOOT ROLL  (" << loot->name() << ")\n";
        std::cout << "    Dropped: [";
        for (size_t i = 0; i < drops.size(); ++i) {
            std::cout << drops[i];
            if (i + 1 < drops.size()) std::cout << ", ";
        }
        std::cout << "]\n";
    }
};


// SECTION:: Entry Point
// ═════════════════════════════════════════════════════════════
//  ENTRY POINT
// ═════════════════════════════════════════════════════════════

static const std::string SEP(64, static_cast<char>(0xE2));  // visual separator

int main() {
    const std::string sep(64, '=');

    std::cout << "╔══════════════════════════════════════════════════════════════╗\n";
    std::cout << "║        Abstract Factory + Prototype — Biome World Builder    ║\n";
    std::cout << "╚══════════════════════════════════════════════════════════════╝\n";

    // ── CONSEQUENCE: Exchanging product families ──────────────────────────────
    std::vector<std::reference_wrapper<BiomeKit>> kits = {
        DesertBiomeKit::getInstance(),
        ArcticBiomeKit::getInstance(),
        ForestBiomeKit::getInstance(),
    };

    for (BiomeKit& kit : kits) {
        std::cout << "\n" << sep << "\n";
        std::cout << "  Biome: " << kit.kitName() << "\n";
        std::cout << sep << "\n";
        WorldGenerator(kit).generate();
    }

    // ── PROTOTYPE: Register a new enemy at runtime ────────────────────────────
    std::cout << "\n" << sep << "\n";
    std::cout << "  PROTOTYPE DEMO — registering GiantScorpion at runtime\n";
    std::cout << sep << "\n";

    struct GiantScorpion : Enemy {
        std::unique_ptr<Enemy> clone()  const override { return std::make_unique<GiantScorpion>(); }
        std::string name()              const override { return "Giant Scorpion (Boss)"; }
        int         health()            const override { return 400; }
        int         damage()            const override { return 60; }
        std::string attack()            const override { return "Tail sweep — hits all nearby players"; }
        std::string drop()              const override { return "Ancient Venom Sac + Desert Crown"; }
    };

    DesertBiomeKit::getInstance().registerEnemy(std::make_unique<GiantScorpion>());

    std::cout << "\n  Desert enemies after registration:\n";
    WorldGenerator(DesertBiomeKit::getInstance()).generate();

    std::cout << "\n╔══════════════════════════════════════════════════════════════╗\n";
    std::cout << "║  Done                                                        ║\n";
    std::cout << "╚══════════════════════════════════════════════════════════════╝\n";

    return 0;
}

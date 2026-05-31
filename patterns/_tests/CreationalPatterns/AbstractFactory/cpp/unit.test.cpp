// ============================================================
//  Unit Tests — Abstract Factory: Biome World Builder
//
//  What we test here:
//    · Each concrete terrain satisfies the Terrain contract
//    · Enemy::clone() produces an independent, equal-valued copy
//    · Each factory method returns the correct product type
//    · WorldGenerator calls every factory method exactly once
//    · Swapping a factory completely changes the output
//
//  Compile & run:
//    g++ -std=c++17 -DTESTING \
//        -lgtest -lgtest_main \
//        unit_test.cpp -o unit_test && ./unit_test
//
//  The -DTESTING flag suppresses main() in the source file.
//  See cpp.cpp entry point: #ifndef TESTING ... #endif
// ============================================================

// SECTION:: Include Source
// Pull in all types by including the source directly.
// main() is guarded by #ifndef TESTING in cpp.cpp.
#define TESTING
#include "../../../../CreationalPatterns/AbstractFactory/cpp/cpp.cpp"

#include <gtest/gtest.h>
#include <sstream>

// SECTION:: Terrain Products
TEST(TerrainProducts, SandTerrain_Name) {
    SandTerrain t;
    EXPECT_EQ(t.name(), "Sand Dunes");
}
TEST(TerrainProducts, SandTerrain_PenaltyMentionsSpeed) {
    EXPECT_NE(SandTerrain().movementPenalty().find("-20%"), std::string::npos);
}
TEST(TerrainProducts, SandTerrain_DescriptionNonEmpty) {
    EXPECT_GT(SandTerrain().description().size(), 0u);
}
TEST(TerrainProducts, IceTerrain_Name) {
    EXPECT_EQ(IceTerrain().name(), "Frozen Tundra");
}
TEST(TerrainProducts, IceTerrain_PenaltyMentionsSpeed) {
    EXPECT_NE(IceTerrain().movementPenalty().find("-15%"), std::string::npos);
}
TEST(TerrainProducts, MudTerrain_Name) {
    EXPECT_EQ(MudTerrain().name(), "Dense Forest Floor");
}
TEST(TerrainProducts, MudTerrain_PenaltyMentionsSpeed) {
    EXPECT_NE(MudTerrain().movementPenalty().find("-10%"), std::string::npos);
}

// SECTION:: Enemy Prototype Cloning
TEST(EnemyCloning, Scorpion_Clone_IsDistinctPointer) {
    auto orig  = std::make_shared<Scorpion>(50, 15);
    auto clone = orig->clone();
    EXPECT_NE(orig.get(), clone.get());
}
TEST(EnemyCloning, Scorpion_Clone_SameStats) {
    auto orig  = std::make_shared<Scorpion>(50, 15);
    auto clone = orig->clone();
    EXPECT_EQ(clone->health(), orig->health());
    EXPECT_EQ(clone->damage(), orig->damage());
    EXPECT_EQ(clone->name(),   "Scorpion");
}
TEST(EnemyCloning, PolarBear_Clone_PreservesStats) {
    auto orig  = std::make_shared<PolarBear>(180, 35);
    auto clone = orig->clone();
    EXPECT_NE(orig.get(), clone.get());
    EXPECT_EQ(clone->health(), 180);
    EXPECT_EQ(clone->damage(), 35);
}
TEST(EnemyCloning, Wolf_Clone_IsDistinctPointer) {
    auto orig  = std::make_shared<Wolf>(90, 18);
    auto clone = orig->clone();
    EXPECT_NE(orig.get(), clone.get());
    EXPECT_EQ(clone->health(), orig->health());
}

// SECTION:: Factory Method Isolation
class DesertKitTest : public testing::Test {
protected:
    DesertBiomeKit& kit = DesertBiomeKit::getInstance();
};

TEST_F(DesertKitTest, CreateTerrain_ReturnsSandDunes) {
    EXPECT_EQ(kit.createTerrain()->name(), "Sand Dunes");
}
TEST_F(DesertKitTest, CreateEnemies_ReturnsClones) {
    auto a = kit.createEnemies();
    auto b = kit.createEnemies();
    ASSERT_FALSE(a.empty());
    EXPECT_NE(a[0].get(), b[0].get());
    EXPECT_EQ(a[0]->name(), b[0]->name());
}
TEST_F(DesertKitTest, CreateWeather_BaseIsSandstorm) {
    EXPECT_EQ(kit.createWeather().a.name, "Sandstorm");
}
TEST_F(DesertKitTest, CreateWeather_HasHeatWaveEvent) {
    auto ws = kit.createWeather();
    EXPECT_TRUE(ws.b.count("heat_wave") > 0);
}
TEST_F(DesertKitTest, CreateLoot_RollsItems) {
    EXPECT_GE(kit.createLoot()->roll().size(), 1u);
}
TEST_F(DesertKitTest, RegisterEnemy_ExpandsPool) {
    auto before = kit.createEnemies().size();
    kit.registerEnemy(std::make_shared<Wolf>(90, 18));
    EXPECT_EQ(kit.createEnemies().size(), before + 1);
}

TEST(ArcticKitTest, CreateTerrain_ReturnsFrozenTundra) {
    EXPECT_EQ(ArcticBiomeKit::getInstance().createTerrain()->name(), "Frozen Tundra");
}
TEST(ArcticKitTest, CreateWeather_BaseIsBlizzard) {
    EXPECT_EQ(ArcticBiomeKit::getInstance().createWeather().a.name, "Blizzard");
}

// SECTION:: WorldGenerator Decoupling
TEST(WorldGeneratorTest, CallsEveryFactoryMethodOnce) {
    int terrain = 0, enemies = 0, weather = 0, loot = 0;

    struct SpyKit : BiomeKit {
        int& t; int& e; int& w; int& l;
        SpyKit(int& t, int& e, int& w, int& l) : t(t), e(e), w(w), l(l) {}
        std::string kitName() const override { return "SpyKit"; }
        std::shared_ptr<Terrain> createTerrain() override {
            t++; return std::make_shared<SandTerrain>();
        }
        std::vector<std::shared_ptr<Enemy>> createEnemies() override {
            e++; return {};
        }
        WeatherSystem createWeather() override {
            w++; return WeatherSystem{{"Clear","None"}, {}};
        }
        std::shared_ptr<LootTable> createLoot() override {
            l++;
            struct FakeLoot : LootTable {
                std::string name() const override { return "Mock"; }
                std::vector<std::string> roll() override { return {}; }
            };
            return std::make_shared<FakeLoot>();
        }
        void registerEnemy(std::shared_ptr<Enemy>) override {}
    };

    SpyKit spy{terrain, enemies, weather, loot};
    // Redirect cout to suppress output
    std::ostringstream buf;
    auto* orig = std::cout.rdbuf(buf.rdbuf());
    WorldGenerator(spy).generate();
    std::cout.rdbuf(orig);

    EXPECT_EQ(terrain, 1);
    EXPECT_EQ(enemies, 1);
    EXPECT_EQ(weather, 1);
    EXPECT_EQ(loot,    1);
}

TEST(WorldGeneratorTest, SwappingFactoryChangesTerrain) {
    std::ostringstream desert_buf, arctic_buf;

    auto* orig = std::cout.rdbuf(desert_buf.rdbuf());
    WorldGenerator(DesertBiomeKit::getInstance()).generate();
    std::cout.rdbuf(arctic_buf.rdbuf());
    WorldGenerator(ArcticBiomeKit::getInstance()).generate();
    std::cout.rdbuf(orig);

    EXPECT_NE(desert_buf.str().find("Sand Dunes"),    std::string::npos);
    EXPECT_NE(arctic_buf.str().find("Frozen Tundra"), std::string::npos);
    EXPECT_EQ(desert_buf.str().find("Frozen Tundra"), std::string::npos);
    EXPECT_EQ(arctic_buf.str().find("Sand Dunes"),    std::string::npos);
}

// ============================================================
//  Integration Tests — Abstract Factory: Biome World Builder
//
//  What we test here:
//    · Real factory singletons produce correct, consistent output
//    · WorldGenerator generates the full product pipeline end-to-end
//    · Swapping the factory changes every product
//    · Product families stay isolated (no cross-biome contamination)
//    · Prototype registration at runtime propagates into the next generation
//
//  No stubs. All concrete classes interact exactly as in production.
//
//  Compile & run:
//    g++ -std=c++17 -DTESTING \
//        -lgtest -lgtest_main \
//        integration_test.cpp -o integration_test && ./integration_test
// ============================================================

// SECTION:: Include Source
#define TESTING
#include "../../../../CreationalPatterns/AbstractFactory/cpp/cpp.cpp"

#include <gtest/gtest.h>
#include <sstream>

// Helper — captures WorldGenerator::generate() output as a string
static std::string capture(BiomeKit& kit) {
    std::ostringstream buf;
    auto* orig = std::cout.rdbuf(buf.rdbuf());
    WorldGenerator(kit).generate();
    std::cout.rdbuf(orig);
    return buf.str();
}

// SECTION:: Desert Biome Integration
class DesertBiomeTest : public testing::Test {
protected:
    std::string output = capture(DesertBiomeKit::getInstance());
};
TEST_F(DesertBiomeTest, ContainsTerrainName)     { EXPECT_NE(output.find("Sand Dunes"),       std::string::npos); }
TEST_F(DesertBiomeTest, ContainsScorpion)        { EXPECT_NE(output.find("Scorpion"),          std::string::npos); }
TEST_F(DesertBiomeTest, ContainsSandWorm)        { EXPECT_NE(output.find("Sand Worm"),         std::string::npos); }
TEST_F(DesertBiomeTest, ContainsDesertBandit)    { EXPECT_NE(output.find("Desert Bandit"),     std::string::npos); }
TEST_F(DesertBiomeTest, ContainsSandstorm)       { EXPECT_NE(output.find("Sandstorm"),         std::string::npos); }
TEST_F(DesertBiomeTest, ContainsDesertLootTable) { EXPECT_NE(output.find("Desert Loot Table"), std::string::npos); }

// SECTION:: Arctic & Forest Biome Integration
class ArcticBiomeTest : public testing::Test {
protected:
    std::string output = capture(ArcticBiomeKit::getInstance());
};
TEST_F(ArcticBiomeTest, ContainsTerrainName) { EXPECT_NE(output.find("Frozen Tundra"),   std::string::npos); }
TEST_F(ArcticBiomeTest, ContainsPolarBear)   { EXPECT_NE(output.find("Polar Bear"),       std::string::npos); }
TEST_F(ArcticBiomeTest, ContainsIceWolf)     { EXPECT_NE(output.find("Ice Wolf"),         std::string::npos); }
TEST_F(ArcticBiomeTest, ContainsFrostTroll)  { EXPECT_NE(output.find("Frost Troll"),      std::string::npos); }
TEST_F(ArcticBiomeTest, ContainsBlizzard)    { EXPECT_NE(output.find("Blizzard"),         std::string::npos); }

class ForestBiomeTest : public testing::Test {
protected:
    std::string output = capture(ForestBiomeKit::getInstance());
};
TEST_F(ForestBiomeTest, ContainsTerrainName)  { EXPECT_NE(output.find("Dense Forest Floor"), std::string::npos); }
TEST_F(ForestBiomeTest, ContainsWolf)         { EXPECT_NE(output.find("Wolf"),               std::string::npos); }
TEST_F(ForestBiomeTest, ContainsWildBoar)     { EXPECT_NE(output.find("Wild Boar"),          std::string::npos); }
TEST_F(ForestBiomeTest, ContainsForestBandit) { EXPECT_NE(output.find("Forest Bandit"),      std::string::npos); }

// SECTION:: Product Family Consistency
TEST(ProductFamilyConsistency, SwappingFactoryChangesEveryProduct) {
    std::string desert = capture(DesertBiomeKit::getInstance());
    std::string arctic  = capture(ArcticBiomeKit::getInstance());

    EXPECT_NE(desert.find("Sand Dunes"),    std::string::npos);
    EXPECT_EQ(desert.find("Frozen Tundra"), std::string::npos);
    EXPECT_NE(arctic.find("Frozen Tundra"), std::string::npos);
    EXPECT_EQ(arctic.find("Sand Dunes"),    std::string::npos);
    EXPECT_EQ(desert.find("Polar Bear"),    std::string::npos);
    EXPECT_EQ(arctic.find("Scorpion"),      std::string::npos);
}

TEST(ProductFamilyConsistency, DesertLootAbsentFromArctic) {
    std::string arctic = capture(ArcticBiomeKit::getInstance());
    EXPECT_EQ(arctic.find("Desert Loot Table"), std::string::npos);
    EXPECT_NE(arctic.find("Arctic Loot Table"), std::string::npos);
}

TEST(ProductFamilyConsistency, WeatherEventsAreBiomeSpecific) {
    std::string desert = capture(DesertBiomeKit::getInstance());
    std::string arctic  = capture(ArcticBiomeKit::getInstance());
    EXPECT_NE(desert.find("heat_wave"), std::string::npos);
    EXPECT_NE(arctic.find("whiteout"),  std::string::npos);
    EXPECT_EQ(desert.find("whiteout"),  std::string::npos);
    EXPECT_EQ(arctic.find("heat_wave"), std::string::npos);
}

// SECTION:: Prototype Registration
TEST(PrototypeRegistration, RegisteredEnemyAppearsInNextGeneration) {
    auto& kit    = DesertBiomeKit::getInstance();
    std::string before = capture(kit);

    struct GiantScorpion : Enemy {
        std::shared_ptr<Enemy> clone() const override {
            return std::make_shared<GiantScorpion>(*this);
        }
        std::string name()   const override { return "Giant Scorpion (Boss)"; }
        int         health() const override { return 400; }
        int         damage() const override { return 60; }
        std::string attack() const override { return "Tail sweep"; }
        std::string drop()   const override { return "Ancient Venom Sac"; }
    };

    kit.registerEnemy(std::make_shared<GiantScorpion>());
    std::string after = capture(kit);

    EXPECT_EQ(before.find("Giant Scorpion"), std::string::npos);
    EXPECT_NE(after.find("Giant Scorpion"),  std::string::npos);
}

TEST(PrototypeRegistration, RegistrationIsolatedToDesertKit) {
    std::string arctic = capture(ArcticBiomeKit::getInstance());
    EXPECT_EQ(arctic.find("Giant Scorpion"), std::string::npos);
}

TEST(PrototypeRegistration, RegisteredEnemyIsClonedOnEachGeneration) {
    bool cloneCalled = false;

    struct TrackingEnemy : Enemy {
        bool& flag;
        explicit TrackingEnemy(bool& f) : flag(f) {}
        std::shared_ptr<Enemy> clone() const override {
            flag = true;
            return std::make_shared<TrackingEnemy>(*this);
        }
        std::string name()   const override { return "Tracker"; }
        int         health() const override { return 1; }
        int         damage() const override { return 1; }
        std::string attack() const override { return "Track"; }
        std::string drop()   const override { return "Data"; }
    };

    ForestBiomeKit::getInstance().registerEnemy(std::make_shared<TrackingEnemy>(cloneCalled));
    capture(ForestBiomeKit::getInstance());
    EXPECT_TRUE(cloneCalled);
}

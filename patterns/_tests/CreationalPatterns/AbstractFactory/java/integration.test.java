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
//  Compile & run:
//    javac -cp .:<junit-jar> \
//          ../../../../CreationalPatterns/AbstractFactory/java/java.java \
//          IntegrationTest.java
//    java  -cp .:<junit-jar> org.junit.platform.console.standalone.ConsoleLauncher \
//          --select-class=IntegrationTest
// ============================================================

import org.junit.jupiter.api.*;
import static org.junit.jupiter.api.Assertions.*;
import java.util.*;
import java.io.*;

// SECTION:: Helpers
class IntegrationTest {

    private static String capture(BiomeKit kit) throws Exception {
        PrintStream orig = System.out;
        ByteArrayOutputStream buf = new ByteArrayOutputStream();
        System.setOut(new PrintStream(buf));
        new WorldGenerator(kit).generate();
        System.setOut(orig);
        return buf.toString();
    }

    // SECTION:: Desert Biome
    @Nested @DisplayName("WorldGenerator — Desert Biome")
    class DesertBiome {
        String output;
        @BeforeEach void run() throws Exception { output = capture(DesertBiomeKit.getInstance()); }

        @Test void containsTerrainName()    { assertTrue(output.contains("Sand Dunes"));       }
        @Test void containsScorpion()       { assertTrue(output.contains("Scorpion"));          }
        @Test void containsSandWorm()       { assertTrue(output.contains("Sand Worm"));         }
        @Test void containsDesertBandit()   { assertTrue(output.contains("Desert Bandit"));     }
        @Test void containsSandstorm()      { assertTrue(output.contains("Sandstorm"));         }
        @Test void containsDesertLootTable(){ assertTrue(output.contains("Desert Loot Table")); }
    }

    // SECTION:: Arctic & Forest Biomes
    @Nested @DisplayName("WorldGenerator — Arctic Biome")
    class ArcticBiome {
        String output;
        @BeforeEach void run() throws Exception { output = capture(ArcticBiomeKit.getInstance()); }

        @Test void containsTerrainName()  { assertTrue(output.contains("Frozen Tundra"));   }
        @Test void containsPolarBear()    { assertTrue(output.contains("Polar Bear"));       }
        @Test void containsIceWolf()      { assertTrue(output.contains("Ice Wolf"));         }
        @Test void containsFrostTroll()   { assertTrue(output.contains("Frost Troll"));      }
        @Test void containsBlizzard()     { assertTrue(output.contains("Blizzard"));         }
    }

    @Nested @DisplayName("WorldGenerator — Forest Biome")
    class ForestBiome {
        String output;
        @BeforeEach void run() throws Exception { output = capture(ForestBiomeKit.getInstance()); }

        @Test void containsTerrainName()  { assertTrue(output.contains("Dense Forest Floor")); }
        @Test void containsWolf()         { assertTrue(output.contains("Wolf"));               }
        @Test void containsWildBoar()     { assertTrue(output.contains("Wild Boar"));          }
        @Test void containsForestBandit() { assertTrue(output.contains("Forest Bandit"));      }
    }

    // SECTION:: Product Family Consistency
    @Nested @DisplayName("Product Family Consistency")
    class ProductFamilyConsistency {
        @Test void swappingFactoryChangesEveryProduct() throws Exception {
            String desert = capture(DesertBiomeKit.getInstance());
            String arctic  = capture(ArcticBiomeKit.getInstance());

            assertTrue(desert.contains("Sand Dunes"));
            assertFalse(desert.contains("Frozen Tundra"));
            assertTrue(arctic.contains("Frozen Tundra"));
            assertFalse(arctic.contains("Sand Dunes"));
            assertFalse(desert.contains("Polar Bear"));
            assertFalse(arctic.contains("Scorpion"));
        }

        @Test void desertLootAbsentFromArctic() throws Exception {
            String arctic = capture(ArcticBiomeKit.getInstance());
            assertFalse(arctic.contains("Desert Loot Table"));
            assertTrue(arctic.contains("Arctic Loot Table"));
        }

        @Test void weatherEventsAreBiomeSpecific() throws Exception {
            String desert = capture(DesertBiomeKit.getInstance());
            String arctic  = capture(ArcticBiomeKit.getInstance());
            assertTrue(desert.contains("heat_wave"));
            assertTrue(arctic.contains("whiteout"));
            assertFalse(desert.contains("whiteout"));
            assertFalse(arctic.contains("heat_wave"));
        }
    }

    // SECTION:: Prototype Registration
    @Nested @DisplayName("Prototype Registration")
    class PrototypeRegistration {
        @Test void registeredEnemyAppearsInNextGeneration() throws Exception {
            DesertBiomeKit kit = DesertBiomeKit.getInstance();
            String before = capture(kit);

            kit.registerEnemy(new Enemy() {
                public Enemy  clone()  { return this; }
                public String name()   { return "Giant Scorpion (Boss)"; }
                public int    health() { return 400; }
                public int    damage() { return 60; }
                public String attack() { return "Tail sweep"; }
                public String drop()   { return "Ancient Venom Sac"; }
            });

            String after = capture(kit);
            assertFalse(before.contains("Giant Scorpion"));
            assertTrue(after.contains("Giant Scorpion"));
        }

        @Test void registrationIsolatedToDesertKit() throws Exception {
            String arctic = capture(ArcticBiomeKit.getInstance());
            assertFalse(arctic.contains("Giant Scorpion"));
        }

        @Test void registeredEnemyIsClonedOnEachGeneration() throws Exception {
            boolean[] cloneCalled = {false};
            ForestBiomeKit.getInstance().registerEnemy(new Enemy() {
                public Enemy  clone()  { cloneCalled[0] = true; return this; }
                public String name()   { return "Tracker"; }
                public int    health() { return 1; }
                public int    damage() { return 1; }
                public String attack() { return "Track"; }
                public String drop()   { return "Data"; }
            });
            capture(ForestBiomeKit.getInstance());
            assertTrue(cloneCalled[0]);
        }
    }
}

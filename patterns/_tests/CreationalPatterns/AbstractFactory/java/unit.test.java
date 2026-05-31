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
//  Compile & run:
//    javac -cp .:<junit-jar> \
//          ../../../../CreationalPatterns/AbstractFactory/java/java.java \
//          UnitTest.java
//    java  -cp .:<junit-jar> org.junit.platform.console.standalone.ConsoleLauncher \
//          --select-class=UnitTest
// ============================================================

import org.junit.jupiter.api.*;
import org.junit.jupiter.api.BeforeEach;
import static org.junit.jupiter.api.Assertions.*;
import java.util.*;
import java.io.*;

// SECTION:: Terrain Products
@DisplayName("Terrain Products")
class UnitTest {

    @Nested @DisplayName("Terrain Products")
    class TerrainProducts {
        @Test void sandTerrainName() {
            Terrain t = new SandTerrain();
            assertEquals("Sand Dunes", t.name());
        }
        @Test void sandTerrainPenaltyMentionsSpeed() {
            assertTrue(new SandTerrain().movementPenalty().contains("-20%"));
        }
        @Test void sandTerrainDescriptionNonEmpty() {
            assertFalse(new SandTerrain().description().isEmpty());
        }
        @Test void iceTerrainName() {
            assertEquals("Frozen Tundra", new IceTerrain().name());
        }
        @Test void iceTerrainPenalty() {
            assertTrue(new IceTerrain().movementPenalty().contains("-15%"));
        }
        @Test void mudTerrainName() {
            assertEquals("Dense Forest Floor", new MudTerrain().name());
        }
        @Test void mudTerrainPenalty() {
            assertTrue(new MudTerrain().movementPenalty().contains("-10%"));
        }
    }

    // SECTION:: Enemy Prototype Cloning
    @Nested @DisplayName("Enemy Prototype Cloning")
    class EnemyCloning {
        @Test void scorpionCloneIsDistinctObject() {
            Enemy original = new Scorpion(50, 15);
            Enemy cloned   = original.clone();
            assertNotSame(original, cloned);
        }
        @Test void scorpionCloneHasSameStats() {
            Enemy original = new Scorpion(50, 15);
            Enemy cloned   = original.clone();
            assertEquals(original.health(), cloned.health());
            assertEquals(original.damage(), cloned.damage());
            assertEquals("Scorpion", cloned.name());
        }
        @Test void polarBearClonePreservesStats() {
            Enemy original = new PolarBear(180, 35);
            Enemy cloned   = original.clone();
            assertNotSame(original, cloned);
            assertEquals(180, cloned.health());
            assertEquals(35,  cloned.damage());
        }
        @Test void wolfCloneIsIndependent() {
            // Wolf has no mutable setters; verify clone() returns a new object
            Enemy original = new Wolf(90, 18);
            Enemy cloned   = original.clone();
            assertNotSame(original, cloned);
            assertEquals(original.health(), cloned.health());
        }
    }

    // SECTION:: Factory Method Isolation
    @Nested @DisplayName("Factory Method Isolation — DesertBiomeKit")
    class DesertBiomeKitTests {
        private DesertBiomeKit kit;
        @BeforeEach void setUp() { kit = DesertBiomeKit.getInstance(); }

        @Test void createTerrainReturnsSandDunes() {
            assertEquals("Sand Dunes", kit.createTerrain().name());
        }
        @Test void createEnemiesReturnsClones() {
            List<Enemy> a = kit.createEnemies();
            List<Enemy> b = kit.createEnemies();
            assertNotSame(a.get(0), b.get(0));
            assertEquals(a.get(0).name(), b.get(0).name());
        }
        @Test void createWeatherBaseSandstorm() {
            assertEquals("Sandstorm", kit.createWeather().a().name());
        }
        @Test void createWeatherHasHeatWaveEvent() {
            assertTrue(kit.createWeather().b().containsKey("heat_wave"));
        }
        @Test void createLootRollsItems() {
            assertTrue(kit.createLoot().roll().size() >= 1);
        }
        @Test void registerEnemyExpandsPool() {
            int before = kit.createEnemies().size();
            kit.registerEnemy(new Wolf(90, 18));
            assertEquals(before + 1, kit.createEnemies().size());
        }
    }

    @Nested @DisplayName("Factory Method Isolation — ArcticBiomeKit")
    class ArcticBiomeKitTests {
        @Test void createTerrainReturnsFrozenTundra() {
            assertEquals("Frozen Tundra", ArcticBiomeKit.getInstance().createTerrain().name());
        }
        @Test void createWeatherBaseBlizzard() {
            assertEquals("Blizzard", ArcticBiomeKit.getInstance().createWeather().a().name());
        }
    }

    // SECTION:: WorldGenerator Decoupling
    @Nested @DisplayName("WorldGenerator — BiomeKit Contract")
    class WorldGeneratorTests {
        @Test void callsEveryFactoryMethodOnce() {
            int[] calls = {0, 0, 0, 0}; // terrain, enemies, weather, loot

            BiomeKit spyKit = new BiomeKit() {
                public String   kitName()           { return "SpyKit"; }
                public Terrain  createTerrain()     { calls[0]++; return new SandTerrain(); }
                public List<Enemy> createEnemies()  { calls[1]++; return List.of(); }
                public WeatherSystem createWeather(){ calls[2]++;
                    return new WeatherSystem(new Weather(){
                        public String name(){return "Clear";} public String effect(){return "None";}},
                        Map.of());
                }
                public LootTable createLoot()       { calls[3]++;
                    return new LootTable() {
                        public String name(){return "Mock";}
                        public List<String> roll(){return List.of();}};
                }
                public void registerEnemy(Enemy e)  {}
            };

            new WorldGenerator(spyKit);

            assertEquals(1, calls[0], "createTerrain");
            assertEquals(1, calls[1], "createEnemies");
            assertEquals(1, calls[2], "createWeather");
            assertEquals(1, calls[3], "createLoot");
        }

        @Test void swappingFactoryChangesTerrain() throws Exception {
            PrintStream orig = System.out;
            ByteArrayOutputStream desert = new ByteArrayOutputStream();
            ByteArrayOutputStream arctic  = new ByteArrayOutputStream();

            System.setOut(new PrintStream(desert));
            new WorldGenerator(DesertBiomeKit.getInstance()).generate();
            System.setOut(new PrintStream(arctic));
            new WorldGenerator(ArcticBiomeKit.getInstance()).generate();
            System.setOut(orig);

            assertTrue(desert.toString().contains("Sand Dunes"));
            assertTrue(arctic.toString().contains("Frozen Tundra"));
            assertFalse(desert.toString().contains("Frozen Tundra"));
            assertFalse(arctic.toString().contains("Sand Dunes"));
        }
    }
}

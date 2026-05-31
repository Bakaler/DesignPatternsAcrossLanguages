# ============================================================
#  Unit Tests — Abstract Factory: Biome World Builder
#
#  What we test here:
#    · Each concrete terrain satisfies the Terrain contract
#    · Enemy.clone() produces an independent, equal-valued copy
#    · Each factory method returns the correct product type
#    · WorldGenerator calls every factory method exactly once
#    · Swapping a factory completely changes the output
#
#  Run: pytest test_unit.py -v
# ============================================================

# SECTION:: Imports
import sys, os, io
from contextlib import redirect_stdout
from unittest.mock import MagicMock

sys.path.insert(0, os.path.join(os.path.dirname(__file__),
    '../../../../CreationalPatterns/AbstractFactory/python'))

from python import (
    Terrain, Enemy, BiomeKit, WeatherSystem,
    SandTerrain, IceTerrain, MudTerrain,
    Scorpion, PolarBear, Wolf,
    DesertBiomeKit, ArcticBiomeKit, ForestBiomeKit,
    WorldGenerator,
)

# SECTION:: Terrain Products
class TestTerrainProducts:
    def test_sand_terrain_name(self):
        t: Terrain = SandTerrain()
        assert t.name == 'Sand Dunes'

    def test_sand_terrain_penalty_mentions_speed(self):
        assert '-20%' in SandTerrain().movement_penalty

    def test_sand_terrain_description_non_empty(self):
        assert len(SandTerrain().description) > 0

    def test_ice_terrain_name(self):
        assert IceTerrain().name == 'Frozen Tundra'

    def test_ice_terrain_penalty_mentions_speed(self):
        assert '-15%' in IceTerrain().movement_penalty

    def test_mud_terrain_name(self):
        assert MudTerrain().name == 'Dense Forest Floor'

    def test_mud_terrain_penalty_mentions_speed(self):
        assert '-10%' in MudTerrain().movement_penalty


# SECTION:: Enemy Prototype Cloning
class TestEnemyCloning:
    def test_scorpion_clone_is_distinct_object(self):
        original = Scorpion(50, 15)
        cloned   = original.clone()
        assert cloned is not original

    def test_scorpion_clone_has_same_stats(self):
        original = Scorpion(50, 15)
        cloned   = original.clone()
        assert cloned.health == original.health
        assert cloned.damage == original.damage
        assert cloned.name   == 'Scorpion'

    def test_polar_bear_clone_preserves_stats(self):
        original = PolarBear(180, 35)
        cloned   = original.clone()
        assert cloned is not original
        assert cloned.health == 180
        assert cloned.damage == 35

    def test_wolf_clone_is_independent(self):
        original = Wolf(90, 18)
        cloned   = original.clone()
        cloned._health = 999          # mutate the clone's backing field
        assert original.health == 90  # original unchanged


# SECTION:: Factory Method Isolation
class TestDesertBiomeKit:
    # Singletons — get the shared instance
    kit = DesertBiomeKit()

    def test_create_terrain_returns_sand_dunes(self):
        assert self.kit.create_terrain().name == 'Sand Dunes'

    def test_create_enemies_returns_clones_not_same_references(self):
        a = self.kit.create_enemies()[0]
        b = self.kit.create_enemies()[0]
        assert a is not b
        assert a.name == b.name

    def test_create_weather_base_is_sandstorm(self):
        ws = self.kit.create_weather()
        assert ws.a.name == 'Sandstorm'

    def test_create_weather_has_heat_wave_event(self):
        assert 'heat_wave' in self.kit.create_weather().b

    def test_create_loot_rolls_items(self):
        assert len(self.kit.create_loot().roll()) >= 1

    def test_register_enemy_expands_pool(self):
        before = len(self.kit.create_enemies())
        self.kit.register_enemy(Wolf(90, 18))
        assert len(self.kit.create_enemies()) == before + 1


class TestArcticBiomeKit:
    kit = ArcticBiomeKit()

    def test_create_terrain_returns_frozen_tundra(self):
        assert self.kit.create_terrain().name == 'Frozen Tundra'

    def test_create_weather_base_is_blizzard(self):
        assert self.kit.create_weather().a.name == 'Blizzard'


# SECTION:: WorldGenerator Decoupling
class TestWorldGeneratorDecoupling:
    def test_calls_every_factory_method_exactly_once(self):
        calls = {'terrain': 0, 'enemies': 0, 'weather': 0, 'loot': 0}

        kit = MagicMock(spec=BiomeKit)
        kit.create_terrain.side_effect = lambda: (calls.update(terrain=calls['terrain']+1), SandTerrain())[1]
        kit.create_enemies.side_effect = lambda: (calls.update(enemies=calls['enemies']+1), [])[1]
        kit.create_weather.side_effect = lambda: (calls.update(weather=calls['weather']+1),
            WeatherSystem(MagicMock(), {}))[1]
        kit.create_loot.side_effect    = lambda: (calls.update(loot=calls['loot']+1),
            MagicMock())[1]

        WorldGenerator(kit)

        assert calls['terrain'] == 1
        assert calls['enemies'] == 1
        assert calls['weather'] == 1
        assert calls['loot']    == 1

    def test_accepts_any_biomekit_shaped_object(self):
        class AlienKit:
            kit_name = 'AlienKit'
            def create_terrain(self): return SandTerrain()
            def create_enemies(self): return []
            def create_weather(self): return WeatherSystem(MagicMock(), {})
            def create_loot(self):
                m = MagicMock(); m.name = 'Alien Loot'; m.roll.return_value = ['Gem']
                return m
            def register_enemy(self, p): pass

        buf = io.StringIO()
        with redirect_stdout(buf):
            WorldGenerator(AlienKit()).generate()  # must not raise

    def test_swapping_factory_changes_terrain(self):
        desert_buf = io.StringIO()
        arctic_buf = io.StringIO()
        with redirect_stdout(desert_buf):
            WorldGenerator(DesertBiomeKit()).generate()
        with redirect_stdout(arctic_buf):
            WorldGenerator(ArcticBiomeKit()).generate()

        assert 'Sand Dunes'    in desert_buf.getvalue()
        assert 'Frozen Tundra' in arctic_buf.getvalue()
        assert 'Frozen Tundra' not in desert_buf.getvalue()
        assert 'Sand Dunes'    not in arctic_buf.getvalue()

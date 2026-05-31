# ============================================================
#  Integration Tests — Abstract Factory: Biome World Builder
#
#  What we test here:
#    · Real factory singletons produce correct, consistent output
#    · WorldGenerator generates the full product pipeline end-to-end
#    · Swapping the factory changes every product
#    · Product families stay isolated (no cross-biome contamination)
#    · Prototype registration at runtime propagates into the next generation
#
#  No stubs. All concrete classes interact exactly as in production.
#
#  Run: pytest test_integration.py -v
# ============================================================

# SECTION:: Imports
import sys, os, io
from contextlib import redirect_stdout

sys.path.insert(0, os.path.join(os.path.dirname(__file__),
    '../../../../CreationalPatterns/AbstractFactory/python'))

from python import (
    DesertBiomeKit, ArcticBiomeKit, ForestBiomeKit,
    WorldGenerator, Scorpion, Wolf,
)

def capture(kit) -> str:
    buf = io.StringIO()
    with redirect_stdout(buf):
        WorldGenerator(kit).generate()
    return buf.getvalue()


# SECTION:: WorldGenerator — Desert Integration
class TestDesertBiome:
    def setup_method(self):
        self.out = capture(DesertBiomeKit())

    def test_contains_terrain_name(self):
        assert 'Sand Dunes' in self.out

    def test_contains_all_default_enemies(self):
        for name in ['Scorpion', 'Sand Worm', 'Desert Bandit']:
            assert name in self.out

    def test_contains_sandstorm_weather(self):
        assert 'Sandstorm' in self.out

    def test_contains_desert_loot_table(self):
        assert 'Desert Loot Table' in self.out


# SECTION:: WorldGenerator — Arctic & Forest Integration
class TestArcticBiome:
    def setup_method(self):
        self.out = capture(ArcticBiomeKit())

    def test_contains_terrain_name(self):
        assert 'Frozen Tundra' in self.out

    def test_contains_all_arctic_enemies(self):
        for name in ['Polar Bear', 'Ice Wolf', 'Frost Troll']:
            assert name in self.out

    def test_contains_blizzard_weather(self):
        assert 'Blizzard' in self.out


class TestForestBiome:
    def setup_method(self):
        self.out = capture(ForestBiomeKit())

    def test_contains_terrain_name(self):
        assert 'Dense Forest Floor' in self.out

    def test_contains_all_forest_enemies(self):
        for name in ['Wolf', 'Wild Boar', 'Forest Bandit']:
            assert name in self.out


# SECTION:: Product Family Consistency
class TestProductFamilyConsistency:
    def test_swapping_factory_changes_every_product(self):
        desert = capture(DesertBiomeKit())
        arctic  = capture(ArcticBiomeKit())

        assert 'Sand Dunes'    in desert
        assert 'Frozen Tundra' not in desert
        assert 'Frozen Tundra' in arctic
        assert 'Sand Dunes'    not in arctic
        assert 'Polar Bear'    not in desert
        assert 'Scorpion'      not in arctic

    def test_desert_loot_absent_from_arctic(self):
        arctic = capture(ArcticBiomeKit())
        assert 'Desert Loot Table' not in arctic
        assert 'Arctic Loot Table' in arctic

    def test_weather_events_are_biome_specific(self):
        desert = capture(DesertBiomeKit())
        arctic  = capture(ArcticBiomeKit())
        assert 'heat_wave' in desert
        assert 'whiteout'  in arctic
        assert 'whiteout'  not in desert
        assert 'heat_wave' not in arctic


# SECTION:: Prototype Registration
class TestPrototypeRegistration:
    def test_register_enemy_appears_in_next_generation(self):
        kit    = DesertBiomeKit()
        before = capture(kit)

        class GiantScorpion(Scorpion):
            @property
            def name(self): return 'Giant Scorpion (Boss)'

        kit.register_enemy(GiantScorpion(400, 60))
        after = capture(kit)

        assert 'Giant Scorpion' not in before
        assert 'Giant Scorpion' in after

    def test_registration_isolated_to_desert_kit(self):
        arctic = capture(ArcticBiomeKit())
        assert 'Giant Scorpion' not in arctic

    def test_registered_enemy_is_cloned_each_generation(self):
        clone_calls = []

        class TrackingEnemy:
            name   = 'Tracker'
            health = 1
            damage = 1
            attack = 'Track'
            drop   = 'Data'
            def clone(self):
                clone_calls.append(1)
                return self

        ForestBiomeKit().register_enemy(TrackingEnemy())
        capture(ForestBiomeKit())
        assert len(clone_calls) >= 1

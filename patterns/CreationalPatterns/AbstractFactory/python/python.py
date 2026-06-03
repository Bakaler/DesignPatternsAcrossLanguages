# ============================================================
#  Abstract Factory + Prototype — Biome World Builder
#  Run: python python.py
# ============================================================
#
#  Participants
#  ────────────────────────────────────────────────────────
#  Abstract Factory   BiomeKit
#  Concrete Factory   DesertBiomeKit, ArcticBiomeKit, ForestBiomeKit (Singletons)
#  Abstract Product A Terrain
#  Abstract Product B Enemy          (also a Prototype — implements clone())
#  Abstract Product C WeatherSystem  (a: Weather, b: dict[str, WeatherEvent])
#  Abstract Product D LootTable
#  Client             WorldGenerator
#
#  Patterns at work
#  ────────────────────────────────────────────────────────
#  Abstract Factory — BiomeKit defines the product family interface
#  Prototype        — Enemy instances are cloned from a factory registry
#  Singleton        — metaclass ensures one instance per concrete kit
#
#  Consequences demonstrated
#  ────────────────────────────────────────────────────────
#  ✓ Concrete isolation          — WorldGenerator never references a concrete class
#  ✓ Exchanging product families — one line swaps the entire biome
#  ✓ Consistency across products — desert enemies drop desert loot in desert weather
#  ✗ Difficulty of new products  — adding Product E touches every factory
#  ✓ Prototype softens this      — new *enemy types* register without touching factories
# ============================================================

from __future__ import annotations
from abc import ABC, ABCMeta, abstractmethod
from copy import copy
from random import sample
from typing import override


# SECTION:: Singleton Metaclass
# ═════════════════════════════════════════════════════════════
#  SINGLETON METACLASS
# ═════════════════════════════════════════════════════════════

class SingletonMeta(ABCMeta):
    _instances: dict = {}

    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            cls._instances[cls] = super().__call__(*args, **kwargs)
        return cls._instances[cls]


# SECTION:: Abstract Products
# ═════════════════════════════════════════════════════════════
#  ABSTRACT PRODUCTS
# ═════════════════════════════════════════════════════════════

# ── Abstract Product A — Terrain ──────────────────────────────────────────────

class Terrain(ABC):
    @property
    @abstractmethod
    def name(self) -> str: ...

    @property
    @abstractmethod
    def movement_penalty(self) -> str: ...

    @property
    @abstractmethod
    def description(self) -> str: ...


# ── Abstract Product B — Enemy (also a Prototype) ────────────────────────────

class Enemy(ABC):
    def __init__(self, health: int, damage: int) -> None:
        self._health = health
        self._damage = damage

    def clone(self) -> Enemy:
        return copy(self)

    @property
    def health(self) -> int:  return self._health

    @property
    def damage(self) -> int:  return self._damage

    @property
    @abstractmethod
    def name(self) -> str: ...

    @property
    @abstractmethod
    def attack(self) -> str: ...

    @property
    @abstractmethod
    def drop(self) -> str: ...


# ── Abstract Product C — Weather ─────────────────────────────────────────────

class Weather(ABC):
    @property
    @abstractmethod
    def name(self) -> str: ...

    @property
    @abstractmethod
    def effect(self) -> str: ...


class WeatherEvent(ABC):
    @property
    @abstractmethod
    def name(self) -> str: ...

    @property
    @abstractmethod
    def trigger(self) -> str: ...

    @property
    @abstractmethod
    def consequence(self) -> str: ...


class WeatherSystem:
    def __init__(self, a: Weather, b: dict[str, WeatherEvent]) -> None:
        self.a = a   # base conditions
        self.b = b   # triggerable events

    def describe(self) -> None:
        print(f"    Base      : {self.a.name} — {self.a.effect}")
        print(f"    Events    :")
        for key, ev in self.b.items():
            print(f"      [{key}] {ev.name} | trigger: {ev.trigger} | effect: {ev.consequence}")


# ── Abstract Product D — LootTable ───────────────────────────────────────────

class LootTable(ABC):
    @property
    @abstractmethod
    def name(self) -> str: ...

    @abstractmethod
    def roll(self) -> list[str]: ...


# SECTION:: Abstract Factory
# ═════════════════════════════════════════════════════════════
#  ABSTRACT FACTORY
# ═════════════════════════════════════════════════════════════

class BiomeKit(ABC):
    @abstractmethod
    def create_terrain(self) -> Terrain: ...

    @abstractmethod
    def create_enemies(self) -> list[Enemy]: ...    # cloned from prototype registry

    @abstractmethod
    def create_weather(self) -> WeatherSystem: ...

    @abstractmethod
    def create_loot(self) -> LootTable: ...

    @property
    @abstractmethod
    def kit_name(self) -> str: ...

    @abstractmethod
    def register_enemy(self, prototype: Enemy) -> None: ...


# SECTION:: Desert Biome
# ═════════════════════════════════════════════════════════════
#  DESERT — Concrete Products
# ═════════════════════════════════════════════════════════════

class SandTerrain(Terrain):
    @property
    def name(self)             -> str: return "Sand Dunes"
    @property
    def movement_penalty(self) -> str: return "-20% speed, doubles stamina drain"
    @property
    def description(self)      -> str: return "Endless shifting dunes, brutal heat, no cover"


class Scorpion(Enemy):
    @property
    def name(self)   -> str: return "Scorpion"
    @property
    def attack(self) -> str: return "Venomous sting — poisons for 3 turns"
    @property
    def drop(self)   -> str: return "Scorpion Venom Gland"


class SandWorm(Enemy):
    @property
    def name(self)   -> str: return "Sand Worm"
    @property
    def attack(self) -> str: return "Burrow strike — ignores armour"
    @property
    def drop(self)   -> str: return "Worm Scale"


class DesertBandit(Enemy):
    @property
    def name(self)   -> str: return "Desert Bandit"
    @property
    def attack(self) -> str: return "Ambush — double damage on first hit"
    @property
    def drop(self)   -> str: return "Stolen Spice Pouch"


class Sandstorm(Weather):
    @property
    def name(self)   -> str: return "Sandstorm"
    @property
    def effect(self) -> str: return "-30% visibility, +10% fire resistance"


class HeatWaveEvent(WeatherEvent):
    @property
    def name(self)        -> str: return "Heat Wave"
    @property
    def trigger(self)     -> str: return "Midday in desert biome"
    @property
    def consequence(self) -> str: return "Stamina drain doubles, enemies become sluggish"


class DustDevilEvent(WeatherEvent):
    @property
    def name(self)        -> str: return "Dust Devil"
    @property
    def trigger(self)     -> str: return "Wind speed exceeds threshold"
    @property
    def consequence(self) -> str: return "Random item knocked from player inventory"


class MirageEvent(WeatherEvent):
    @property
    def name(self)        -> str: return "Mirage"
    @property
    def trigger(self)     -> str: return "Player health below 30%"
    @property
    def consequence(self) -> str: return "Nearby oasis appears — may be real or false"


class SpiceLoot(LootTable):
    _POOL = ["Desert Spice", "Sand Ruby", "Scorpion Venom", "Cactus Fruit",
             "Ancient Coin", "Sun-bleached Bone", "Mirage Crystal"]
    @property
    def name(self) -> str: return "Desert Loot Table"
    def roll(self) -> list[str]: return sample(self._POOL, k=2)


# SECTION:: Arctic Biome
# ═════════════════════════════════════════════════════════════
#  ARCTIC — Concrete Products
# ═════════════════════════════════════════════════════════════

class IceTerrain(Terrain):
    @property
    def name(self)             -> str: return "Frozen Tundra"
    @property
    def movement_penalty(self) -> str: return "-15% speed, risk of slip on ice tiles"
    @property
    def description(self)      -> str: return "Vast frozen plains, cracking ice sheets, permafrost"


class PolarBear(Enemy):
    @property
    def name(self)   -> str: return "Polar Bear"
    @property
    def attack(self) -> str: return "Bear maul — knocks player back 3 tiles"
    @property
    def drop(self)   -> str: return "Polar Bear Pelt"


class IceWolf(Enemy):
    @property
    def name(self)   -> str: return "Ice Wolf"
    @property
    def attack(self) -> str: return "Pack howl — summons 1-2 additional wolves"
    @property
    def drop(self)   -> str: return "Frost Fang"


class FrostTroll(Enemy):
    @property
    def name(self)   -> str: return "Frost Troll"
    @property
    def attack(self) -> str: return "Ice slam — freezes player in place for 2 turns"
    @property
    def drop(self)   -> str: return "Troll Permafrost Core"


class Blizzard(Weather):
    @property
    def name(self)   -> str: return "Blizzard"
    @property
    def effect(self) -> str: return "-50% visibility, -5 HP per turn from frostbite"


class WhiteoutEvent(WeatherEvent):
    @property
    def name(self)        -> str: return "Whiteout"
    @property
    def trigger(self)     -> str: return "Blizzard intensity exceeds level 3"
    @property
    def consequence(self) -> str: return "Zero visibility — navigation by compass only"


class IceStormEvent(WeatherEvent):
    @property
    def name(self)        -> str: return "Ice Storm"
    @property
    def trigger(self)     -> str: return "Temperature drops below critical threshold"
    @property
    def consequence(self) -> str: return "Ice shards deal 8 damage per turn, enemies gain ice shield"


class AuroraEvent(WeatherEvent):
    @property
    def name(self)        -> str: return "Aurora Borealis"
    @property
    def trigger(self)     -> str: return "Clear night sky, no blizzard"
    @property
    def consequence(self) -> str: return "All magic abilities cost 50% less for 60 seconds"


class FurLoot(LootTable):
    _POOL = ["Polar Bear Pelt", "Frost Fang", "Troll Core", "Frozen Herb",
             "Arctic Sapphire", "Permafrost Shard", "Whale Bone Charm"]
    @property
    def name(self) -> str: return "Arctic Loot Table"
    def roll(self) -> list[str]: return sample(self._POOL, k=2)


# SECTION:: Forest Biome
# ═════════════════════════════════════════════════════════════
#  FOREST — Concrete Products
# ═════════════════════════════════════════════════════════════

class MudTerrain(Terrain):
    @property
    def name(self)             -> str: return "Dense Forest Floor"
    @property
    def movement_penalty(self) -> str: return "-10% speed in mud, stealth bonus in undergrowth"
    @property
    def description(self)      -> str: return "Ancient trees, thick undergrowth, soft mud paths"


class Wolf(Enemy):
    @property
    def name(self)   -> str: return "Wolf"
    @property
    def attack(self) -> str: return "Lunge — high speed, targets lowest HP player"
    @property
    def drop(self)   -> str: return "Wolf Pelt"


class WildBoar(Enemy):
    @property
    def name(self)   -> str: return "Wild Boar"
    @property
    def attack(self) -> str: return "Charge — stuns on hit, destroys cover"
    @property
    def drop(self)   -> str: return "Boar Tusk"


class ForestBandit(Enemy):
    @property
    def name(self)   -> str: return "Forest Bandit"
    @property
    def attack(self) -> str: return "Arrow volley — ranged, ignores melee armour"
    @property
    def drop(self)   -> str: return "Bandit Coin Pouch"


class Rain(Weather):
    @property
    def name(self)   -> str: return "Heavy Rain"
    @property
    def effect(self) -> str: return "Extinguishes fire, +15% bow miss chance, plants grow faster"


class ThunderstormEvent(WeatherEvent):
    @property
    def name(self)        -> str: return "Thunderstorm"
    @property
    def trigger(self)     -> str: return "Rain intensity exceeds level 2"
    @property
    def consequence(self) -> str: return "Lightning strikes random tiles — stuns and deals 20 damage"


class DenseFogEvent(WeatherEvent):
    @property
    def name(self)        -> str: return "Dense Fog"
    @property
    def trigger(self)     -> str: return "Temperature drop after heavy rain"
    @property
    def consequence(self) -> str: return "-40% visibility, stealth enemies become invisible"


class ForestFireEvent(WeatherEvent):
    @property
    def name(self)        -> str: return "Forest Fire"
    @property
    def trigger(self)     -> str: return "Lightning strike + dry undergrowth"
    @property
    def consequence(self) -> str: return "Spreads across tiles, forces enemy + player retreat"


class HerbLoot(LootTable):
    _POOL = ["Healing Herb", "Boar Tusk", "Wolf Pelt", "Moss Spore",
             "Ancient Acorn", "Bandit Map Fragment", "Glowing Mushroom"]
    @property
    def name(self) -> str: return "Forest Loot Table"
    def roll(self) -> list[str]: return sample(self._POOL, k=2)


# SECTION:: Concrete Factories
# ═════════════════════════════════════════════════════════════
#  CONCRETE FACTORIES — Singleton + Prototype Registry
# ═════════════════════════════════════════════════════════════

class DesertBiomeKit(BiomeKit, metaclass=SingletonMeta):
    def __init__(self) -> None:
        self._registry: list[Enemy] = [
            Scorpion(50, 15),
            SandWorm(200, 30),
            DesertBandit(80, 20),
        ]

    def register_enemy(self, prototype: Enemy) -> None:
        self._registry.append(prototype)
        print(f"  [DesertBiomeKit] Registered new prototype: {prototype.name}")

    def create_terrain(self)  -> Terrain:       return SandTerrain()
    def create_enemies(self)  -> list[Enemy]:   return [e.clone() for e in self._registry]
    def create_weather(self)  -> WeatherSystem:
        return WeatherSystem(Sandstorm(), {
            "heat_wave":  HeatWaveEvent(),
            "dust_devil": DustDevilEvent(),
            "mirage":     MirageEvent(),
        })
    def create_loot(self)     -> LootTable:     return SpiceLoot()

    @property
    def kit_name(self) -> str: return "DesertBiomeKit"


class ArcticBiomeKit(BiomeKit, metaclass=SingletonMeta):
    def __init__(self) -> None:
        self._registry: list[Enemy] = [
            PolarBear(180, 35),
            IceWolf(70, 22),
            FrostTroll(300, 45),
        ]

    def register_enemy(self, prototype: Enemy) -> None:
        self._registry.append(prototype)
        print(f"  [ArcticBiomeKit] Registered new prototype: {prototype.name}")

    def create_terrain(self)  -> Terrain:       return IceTerrain()
    def create_enemies(self)  -> list[Enemy]:   return [e.clone() for e in self._registry]
    def create_weather(self)  -> WeatherSystem:
        return WeatherSystem(Blizzard(), {
            "whiteout":  WhiteoutEvent(),
            "ice_storm": IceStormEvent(),
            "aurora":    AuroraEvent(),
        })
    def create_loot(self)     -> LootTable:     return FurLoot()

    @property
    def kit_name(self) -> str: return "ArcticBiomeKit"


class ForestBiomeKit(BiomeKit, metaclass=SingletonMeta):
    def __init__(self) -> None:
        self._registry: list[Enemy] = [
            Wolf(90, 18),
            WildBoar(120, 25),
            ForestBandit(75, 20),
        ]

    def register_enemy(self, prototype: Enemy) -> None:
        self._registry.append(prototype)
        print(f"  [ForestBiomeKit] Registered new prototype: {prototype.name}")

    def create_terrain(self)  -> Terrain:       return MudTerrain()
    def create_enemies(self)  -> list[Enemy]:   return [e.clone() for e in self._registry]
    def create_weather(self)  -> WeatherSystem:
        return WeatherSystem(Rain(), {
            "thunderstorm": ThunderstormEvent(),
            "dense_fog":    DenseFogEvent(),
            "forest_fire":  ForestFireEvent(),
        })
    def create_loot(self)     -> LootTable:     return HerbLoot()

    @property
    def kit_name(self) -> str: return "ForestBiomeKit"


# SECTION:: Client
# ═════════════════════════════════════════════════════════════
#  CLIENT
# ═════════════════════════════════════════════════════════════

class WorldGenerator:
    def __init__(self, kit: BiomeKit) -> None:
        self._terrain = kit.create_terrain()
        self._enemies = kit.create_enemies()
        self._weather = kit.create_weather()
        self._loot    = kit.create_loot()

    def generate(self) -> None:
        print("\n  TERRAIN")
        print(f"    {self._terrain.name} — {self._terrain.description}")
        print(f"    Movement: {self._terrain.movement_penalty}")

        print("\n  ENEMIES  (cloned from prototype registry)")
        for e in self._enemies:
            print(f"    {e.name:<16} HP:{e.health:<4} DMG:{e.damage:<3}  Attack: {e.attack}")
            print(f"                     Drop:   {e.drop}")

        print("\n  WEATHER SYSTEM")
        self._weather.describe()

        print(f"\n  LOOT ROLL  ({self._loot.name})")
        print(f"    Dropped: {self._loot.roll()}")


# SECTION:: Entry Point
# ═════════════════════════════════════════════════════════════
#  ENTRY POINT
# ═════════════════════════════════════════════════════════════

if __name__ == "__main__":
    SEP = "═" * 64

    print("╔══════════════════════════════════════════════════════════════╗")
    print("║        Abstract Factory + Prototype — Biome World Builder    ║")
    print("╚══════════════════════════════════════════════════════════════╝")

    kits: list[BiomeKit] = [
        DesertBiomeKit(),
        ArcticBiomeKit(),
        ForestBiomeKit(),
    ]

    for kit in kits:
        print(f"\n{SEP}")
        print(f"  Biome: {kit.kit_name}")
        print(SEP)
        WorldGenerator(kit).generate()

    # Prototype demo
    print(f"\n{SEP}")
    print("  PROTOTYPE DEMO — registering GiantScorpion at runtime")
    print(SEP)

    class GiantScorpion(Scorpion):
        @property
        def name(self)   -> str: return "Giant Scorpion (Boss)"
        @property
        def attack(self) -> str: return "Tail sweep — hits all nearby players"
        @property
        def drop(self)   -> str: return "Ancient Venom Sac + Desert Crown"

    DesertBiomeKit().register_enemy(GiantScorpion(400, 60))

    print("\n  Desert enemies after registration:")
    WorldGenerator(DesertBiomeKit()).generate()

    print("\n╔══════════════════════════════════════════════════════════════╗")
    print("║  Done                                                        ║")
    print("╚══════════════════════════════════════════════════════════════╝")

# ============================================================
#  Abstract Factory + Prototype — Biome World Builder
#  Run: ruby ruby.rb
# ============================================================
#
#  Participants
#  ────────────────────────────────────────────────────────
#  Abstract Factory   BiomeKit (module)
#  Concrete Factory   DesertBiomeKit, ArcticBiomeKit, ForestBiomeKit (Singletons)
#  Abstract Product A Terrain (module)
#  Abstract Product B Enemy          (module, also Prototype — uses dup)
#  Abstract Product C WeatherSystem  (base WeatherData + event hash)
#  Abstract Product D LootTable (module)
#  Client             WorldGenerator
#
#  Patterns at work
#  ────────────────────────────────────────────────────────
#  Abstract Factory — BiomeKit defines the product family interface
#  Prototype        — Enemy instances are cloned via dup; new types
#                     register at runtime without changing any factory class
#  Singleton        — one factory instance per biome (via Singleton module)
#
#  Consequences demonstrated
#  ────────────────────────────────────────────────────────
#  ✓ Concrete isolation          — WorldGenerator never references a concrete class
#  ✓ Exchanging product families — one line swaps the entire biome
#  ✓ Consistency across products — desert enemies drop desert loot in desert weather
#  ✗ Difficulty of new products  — adding a product slot touches every factory
#  ✓ Prototype softens this      — new enemy types register without touching factories
# ============================================================

require 'singleton'


# SECTION:: Abstract Products
# ═════════════════════════════════════════════════════════════
#  ABSTRACT PRODUCTS  (modules used as duck-type interfaces)
# ═════════════════════════════════════════════════════════════

module Terrain
  def name             = raise(NotImplementedError, "#{self.class}#name")
  def movement_penalty = raise(NotImplementedError, "#{self.class}#movement_penalty")
  def description      = raise(NotImplementedError, "#{self.class}#description")
end

module Enemy
  def clone  = raise(NotImplementedError, "#{self.class}#clone")
  def name   = raise(NotImplementedError, "#{self.class}#name")
  def health = raise(NotImplementedError, "#{self.class}#health")
  def damage = raise(NotImplementedError, "#{self.class}#damage")
  def attack = raise(NotImplementedError, "#{self.class}#attack")
  def drop   = raise(NotImplementedError, "#{self.class}#drop")
end

WeatherData  = Struct.new(:name, :effect)
WeatherEvent = Struct.new(:name, :trigger, :consequence)

class WeatherSystem
  attr_reader :base, :events

  def initialize(base, events)
    @base   = base    # WeatherData
    @events = events  # Hash<Symbol, WeatherEvent>
  end

  def describe
    puts "    Base      : #{@base.name} — #{@base.effect}"
    puts "    Events    :"
    @events.each do |key, ev|
      puts "      [#{key}] #{ev.name} | trigger: #{ev.trigger} | effect: #{ev.consequence}"
    end
  end
end

module LootTable
  def name = raise(NotImplementedError, "#{self.class}#name")
  def roll = raise(NotImplementedError, "#{self.class}#roll")
end

module BiomeKit
  def create_terrain        = raise(NotImplementedError, "#{self.class}#create_terrain")
  def create_enemies        = raise(NotImplementedError, "#{self.class}#create_enemies")
  def create_weather        = raise(NotImplementedError, "#{self.class}#create_weather")
  def create_loot           = raise(NotImplementedError, "#{self.class}#create_loot")
  def kit_name              = raise(NotImplementedError, "#{self.class}#kit_name")
  def register_enemy(proto) = raise(NotImplementedError, "#{self.class}#register_enemy")
end


# SECTION:: Desert Biome
# ═════════════════════════════════════════════════════════════
#  DESERT — Concrete Products
# ═════════════════════════════════════════════════════════════

class SandTerrain
  include Terrain
  def name             = 'Sand Dunes'
  def movement_penalty = '-20% speed, doubles stamina drain'
  def description      = 'Endless shifting dunes, brutal heat, no cover'
end

class Scorpion
  include Enemy
  attr_reader :health, :damage
  def initialize(health, damage) = (@health = health; @damage = damage)
  def clone  = dup
  def name   = 'Scorpion'
  def attack = 'Venomous sting — poisons for 3 turns'
  def drop   = 'Scorpion Venom Gland'
end

class SandWorm
  include Enemy
  attr_reader :health, :damage
  def initialize(health, damage) = (@health = health; @damage = damage)
  def clone  = dup
  def name   = 'Sand Worm'
  def attack = 'Burrow strike — ignores armour'
  def drop   = 'Worm Scale'
end

class DesertBandit
  include Enemy
  attr_reader :health, :damage
  def initialize(health, damage) = (@health = health; @damage = damage)
  def clone  = dup
  def name   = 'Desert Bandit'
  def attack = 'Ambush — double damage on first hit'
  def drop   = 'Stolen Spice Pouch'
end

class SpiceLoot
  include LootTable
  POOL = ['Desert Spice', 'Sand Ruby', 'Scorpion Venom',
          'Cactus Fruit', 'Ancient Coin', 'Sun-bleached Bone', 'Mirage Crystal'].freeze
  def name = 'Desert Loot Table'
  def roll = POOL.sample(2 + rand(2))
end


# SECTION:: Arctic Biome
# ═════════════════════════════════════════════════════════════
#  ARCTIC — Concrete Products
# ═════════════════════════════════════════════════════════════

class IceTerrain
  include Terrain
  def name             = 'Frozen Tundra'
  def movement_penalty = '-15% speed, risk of slip on ice tiles'
  def description      = 'Vast frozen plains, cracking ice sheets, permafrost'
end

class PolarBear
  include Enemy
  attr_reader :health, :damage
  def initialize(health, damage) = (@health = health; @damage = damage)
  def clone  = dup
  def name   = 'Polar Bear'
  def attack = 'Bear maul — knocks player back 3 tiles'
  def drop   = 'Polar Bear Pelt'
end

class IceWolf
  include Enemy
  attr_reader :health, :damage
  def initialize(health, damage) = (@health = health; @damage = damage)
  def clone  = dup
  def name   = 'Ice Wolf'
  def attack = 'Pack howl — summons 1-2 additional wolves'
  def drop   = 'Frost Fang'
end

class FrostTroll
  include Enemy
  attr_reader :health, :damage
  def initialize(health, damage) = (@health = health; @damage = damage)
  def clone  = dup
  def name   = 'Frost Troll'
  def attack = 'Ice slam — freezes player in place for 2 turns'
  def drop   = 'Troll Permafrost Core'
end

class FurLoot
  include LootTable
  POOL = ['Polar Bear Pelt', 'Frost Fang', 'Troll Core',
          'Frozen Herb', 'Arctic Sapphire', 'Permafrost Shard', 'Whale Bone Charm'].freeze
  def name = 'Arctic Loot Table'
  def roll = POOL.sample(2 + rand(2))
end


# SECTION:: Forest Biome
# ═════════════════════════════════════════════════════════════
#  FOREST — Concrete Products
# ═════════════════════════════════════════════════════════════

class MudTerrain
  include Terrain
  def name             = 'Dense Forest Floor'
  def movement_penalty = '-10% speed in mud, stealth bonus in undergrowth'
  def description      = 'Ancient trees, thick undergrowth, soft mud paths'
end

class Wolf
  include Enemy
  attr_reader :health, :damage
  def initialize(health, damage) = (@health = health; @damage = damage)
  def clone  = dup
  def name   = 'Wolf'
  def attack = 'Lunge — high speed, targets lowest HP player'
  def drop   = 'Wolf Pelt'
end

class WildBoar
  include Enemy
  attr_reader :health, :damage
  def initialize(health, damage) = (@health = health; @damage = damage)
  def clone  = dup
  def name   = 'Wild Boar'
  def attack = 'Charge — stuns on hit, destroys cover'
  def drop   = 'Boar Tusk'
end

class ForestBandit
  include Enemy
  attr_reader :health, :damage
  def initialize(health, damage) = (@health = health; @damage = damage)
  def clone  = dup
  def name   = 'Forest Bandit'
  def attack = 'Arrow volley — ranged, ignores melee armour'
  def drop   = 'Bandit Coin Pouch'
end

class HerbLoot
  include LootTable
  POOL = ['Healing Herb', 'Boar Tusk', 'Wolf Pelt',
          'Moss Spore', 'Ancient Acorn', 'Bandit Map Fragment', 'Glowing Mushroom'].freeze
  def name = 'Forest Loot Table'
  def roll = POOL.sample(2 + rand(2))
end


# SECTION:: Concrete Factories
# ═════════════════════════════════════════════════════════════
#  CONCRETE FACTORIES — Singleton + Prototype Registry
# ═════════════════════════════════════════════════════════════

class DesertBiomeKit
  include Singleton
  include BiomeKit

  def initialize
    @registry = [Scorpion.new(50, 15), SandWorm.new(200, 30), DesertBandit.new(80, 20)]
  end

  def register_enemy(proto)
    @registry << proto
    puts "  [DesertBiomeKit] Registered new prototype: #{proto.name}"
  end

  def create_terrain = SandTerrain.new
  def create_enemies = @registry.map(&:clone)
  def create_loot    = SpiceLoot.new
  def kit_name       = 'DesertBiomeKit'

  def create_weather
    WeatherSystem.new(
      WeatherData.new('Sandstorm', '-30% visibility, +10% fire resistance'),
      {
        heat_wave:  WeatherEvent.new('Heat Wave',  'Midday in desert biome',          'Stamina drain doubles, enemies become sluggish'),
        dust_devil: WeatherEvent.new('Dust Devil', 'Wind speed exceeds threshold',     'Random item knocked from player inventory'),
        mirage:     WeatherEvent.new('Mirage',     'Player health below 30%',          'Nearby oasis appears — may be real or false'),
      }
    )
  end
end

class ArcticBiomeKit
  include Singleton
  include BiomeKit

  def initialize
    @registry = [PolarBear.new(180, 35), IceWolf.new(70, 22), FrostTroll.new(300, 45)]
  end

  def register_enemy(proto)
    @registry << proto
    puts "  [ArcticBiomeKit] Registered new prototype: #{proto.name}"
  end

  def create_terrain = IceTerrain.new
  def create_enemies = @registry.map(&:clone)
  def create_loot    = FurLoot.new
  def kit_name       = 'ArcticBiomeKit'

  def create_weather
    WeatherSystem.new(
      WeatherData.new('Blizzard', '-50% visibility, -5 HP per turn from frostbite'),
      {
        whiteout:  WeatherEvent.new('Whiteout',       'Blizzard intensity exceeds level 3',         'Zero visibility — navigation by compass only'),
        ice_storm: WeatherEvent.new('Ice Storm',      'Temperature drops below critical threshold',  'Ice shards deal 8 damage per turn, enemies gain ice shield'),
        aurora:    WeatherEvent.new('Aurora Borealis','Clear night sky, no blizzard',               'All magic abilities cost 50% less for 60 seconds'),
      }
    )
  end
end

class ForestBiomeKit
  include Singleton
  include BiomeKit

  def initialize
    @registry = [Wolf.new(90, 18), WildBoar.new(120, 25), ForestBandit.new(75, 20)]
  end

  def register_enemy(proto)
    @registry << proto
    puts "  [ForestBiomeKit] Registered new prototype: #{proto.name}"
  end

  def create_terrain = MudTerrain.new
  def create_enemies = @registry.map(&:clone)
  def create_loot    = HerbLoot.new
  def kit_name       = 'ForestBiomeKit'

  def create_weather
    WeatherSystem.new(
      WeatherData.new('Heavy Rain', 'Extinguishes fire, +15% bow miss chance, plants grow faster'),
      {
        thunderstorm: WeatherEvent.new('Thunderstorm', 'Rain intensity exceeds level 2',      'Lightning strikes random tiles — stuns and deals 20 damage'),
        dense_fog:    WeatherEvent.new('Dense Fog',    'Temperature drop after heavy rain',   '-40% visibility, stealth enemies become invisible'),
        forest_fire:  WeatherEvent.new('Forest Fire',  'Lightning strike + dry undergrowth',  'Spreads across tiles, forces enemy + player retreat'),
      }
    )
  end
end


# SECTION:: Client
# ═════════════════════════════════════════════════════════════
#  CLIENT
# ═════════════════════════════════════════════════════════════
#  CONSEQUENCE: Concrete Isolation
#  WorldGenerator references zero concrete classes.
#  It only knows BiomeKit, Terrain, Enemy, WeatherSystem, LootTable.

class WorldGenerator
  def initialize(kit)
    @terrain = kit.create_terrain
    @enemies = kit.create_enemies
    @weather = kit.create_weather
    @loot    = kit.create_loot
  end

  def generate
    puts "\n  TERRAIN"
    puts "    #{@terrain.name} — #{@terrain.description}"
    puts "    Movement: #{@terrain.movement_penalty}"

    puts "\n  ENEMIES  (cloned from prototype registry)"
    @enemies.each do |e|
      puts "    #{e.name.ljust(16)} HP:#{e.health.to_s.ljust(4)} DMG:#{e.damage.to_s.ljust(3)}  Attack: #{e.attack}"
      puts "                     Drop:   #{e.drop}"
    end

    puts "\n  WEATHER SYSTEM"
    @weather.describe

    puts "\n  LOOT ROLL  (#{@loot.name})"
    puts "    Dropped: [#{@loot.roll.join(', ')}]"
  end
end


# SECTION:: Entry Point
# ═════════════════════════════════════════════════════════════
#  ENTRY POINT
# ═════════════════════════════════════════════════════════════

if __FILE__ == $PROGRAM_NAME

SEP = '═' * 64

puts '╔══════════════════════════════════════════════════════════════╗'
puts '║        Abstract Factory + Prototype — Biome World Builder    ║'
puts '╚══════════════════════════════════════════════════════════════╝'

# CONSEQUENCE: Exchanging product families
[DesertBiomeKit.instance, ArcticBiomeKit.instance, ForestBiomeKit.instance].each do |kit|
  puts "\n#{SEP}"
  puts "  Biome: #{kit.kit_name}"
  puts SEP
  WorldGenerator.new(kit).generate
end

# PROTOTYPE: Register a new enemy at runtime
puts "\n#{SEP}"
puts '  PROTOTYPE DEMO — registering GiantScorpion at runtime'
puts SEP

GiantScorpion = Struct.new(:name, :health, :damage, :attack, :drop) do
  def clone = dup
end

DesertBiomeKit.instance.register_enemy(
  GiantScorpion.new('Giant Scorpion (Boss)', 400, 60,
                    'Tail sweep — hits all nearby players',
                    'Ancient Venom Sac + Desert Crown')
)

puts "\n  Desert enemies after registration:"
WorldGenerator.new(DesertBiomeKit.instance).generate

puts "\n╔══════════════════════════════════════════════════════════════╗"
puts "║  Done                                                        ║"
puts "╚══════════════════════════════════════════════════════════════╝"

end # if __FILE__ == $PROGRAM_NAME

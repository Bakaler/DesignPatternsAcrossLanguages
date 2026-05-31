# ============================================================
#  Unit Tests — Abstract Factory: Biome World Builder
#
#  What we test here:
#    · Each concrete terrain satisfies the Terrain contract
#    · Enemy#clone produces an independent, equal-valued copy
#    · Each factory method returns the correct product type
#    · WorldGenerator calls every factory method exactly once
#    · Swapping a factory completely changes the output
#
#  Run: rspec unit_spec.rb
# ============================================================

# SECTION:: Imports
require_relative '../../../../CreationalPatterns/AbstractFactory/ruby/ruby'

# SECTION:: Terrain Products
RSpec.describe 'Terrain Products' do
  it 'SandTerrain satisfies the Terrain contract' do
    t = SandTerrain.new
    expect(t).to be_a(SandTerrain)
    expect(t.name).to eq('Sand Dunes')
    expect(t.movement_penalty).to include('-20%')
    expect(t.description.length).to be > 0
  end

  it 'IceTerrain satisfies the Terrain contract' do
    t = IceTerrain.new
    expect(t.name).to eq('Frozen Tundra')
    expect(t.movement_penalty).to include('-15%')
  end

  it 'MudTerrain satisfies the Terrain contract' do
    t = MudTerrain.new
    expect(t.name).to eq('Dense Forest Floor')
    expect(t.movement_penalty).to include('-10%')
  end
end

# SECTION:: Enemy Prototype Cloning
RSpec.describe 'Enemy Prototype Cloning' do
  it 'Scorpion clone is a distinct object with identical stats' do
    original = Scorpion.new(50, 15)
    cloned   = original.clone
    expect(cloned).not_to be(original)
    expect(cloned.health).to eq(original.health)
    expect(cloned.damage).to eq(original.damage)
    expect(cloned.name).to eq('Scorpion')
  end

  it 'PolarBear clone preserves all stats' do
    original = PolarBear.new(180, 35)
    cloned   = original.clone
    expect(cloned).not_to be(original)
    expect(cloned.health).to eq(180)
    expect(cloned.damage).to eq(35)
  end

  it 'Wolf clone is independent — mutating clone does not affect original' do
    original = Wolf.new(90, 18)
    cloned   = original.clone
    cloned.instance_variable_set(:@health, 999)
    expect(original.health).to eq(90)
  end
end

# SECTION:: Factory Method Isolation
# Singletons — use .instance, not .new
RSpec.describe 'Factory Method Isolation — DesertBiomeKit' do
  let(:kit) { DesertBiomeKit.instance }

  it 'create_terrain returns Sand Dunes' do
    expect(kit.create_terrain.name).to eq('Sand Dunes')
  end

  it 'create_enemies returns clones — successive calls give distinct objects' do
    a = kit.create_enemies.first
    b = kit.create_enemies.first
    expect(a).not_to be(b)
    expect(a.name).to eq(b.name)
  end

  it 'create_weather base is Sandstorm' do
    ws = kit.create_weather
    expect(ws.base.name).to eq('Sandstorm')
  end

  it 'create_weather includes heat_wave event' do
    expect(kit.create_weather.events).to have_key(:heat_wave)
  end

  it 'create_loot rolls at least one item' do
    expect(kit.create_loot.roll.length).to be >= 1
  end

  it 'register_enemy expands the enemy pool by one' do
    before = kit.create_enemies.length
    kit.register_enemy(Wolf.new(90, 18))
    expect(kit.create_enemies.length).to eq(before + 1)
  end
end

RSpec.describe 'Factory Method Isolation — ArcticBiomeKit' do
  let(:kit) { ArcticBiomeKit.instance }

  it 'create_terrain returns Frozen Tundra' do
    expect(kit.create_terrain.name).to eq('Frozen Tundra')
  end

  it 'create_weather base is Blizzard' do
    expect(kit.create_weather.base.name).to eq('Blizzard')
  end
end

# SECTION:: WorldGenerator Decoupling
RSpec.describe 'WorldGenerator — BiomeKit Interface Contract' do
  it 'calls every factory method exactly once during construction' do
    calls = { terrain: 0, enemies: 0, weather: 0, loot: 0 }

    spy_kit = double('SpyKit')
    allow(spy_kit).to receive(:create_terrain) { calls[:terrain] += 1; SandTerrain.new }
    allow(spy_kit).to receive(:create_enemies) { calls[:enemies] += 1; [] }
    allow(spy_kit).to receive(:create_weather) {
      calls[:weather] += 1
      WeatherSystem.new(WeatherData.new('Clear', 'None'), {})
    }
    allow(spy_kit).to receive(:create_loot) {
      calls[:loot] += 1
      double('Loot', name: 'Mock', roll: [])
    }

    WorldGenerator.new(spy_kit)

    expect(calls[:terrain]).to eq(1)
    expect(calls[:enemies]).to eq(1)
    expect(calls[:weather]).to eq(1)
    expect(calls[:loot]).to eq(1)
  end

  it 'accepts any BiomeKit-duck-typed object' do
    alien_kit = double('AlienKit',
      create_terrain: double(name: 'Lava Field', description: 'Hot', movement_penalty: '-50%'),
      create_enemies: [],
      create_weather: WeatherSystem.new(WeatherData.new('Ash', 'Burns'), {}),
      create_loot:    double(name: 'Alien Loot', roll: ['Gem'])
    )
    expect { WorldGenerator.new(alien_kit).generate }.to output.to_stdout
  end

  it 'swapping factory changes terrain output' do
    desert_out = capture_io { WorldGenerator.new(DesertBiomeKit.instance).generate }
    arctic_out  = capture_io { WorldGenerator.new(ArcticBiomeKit.instance).generate }

    expect(desert_out).to include('Sand Dunes')
    expect(arctic_out).to include('Frozen Tundra')
    expect(desert_out).not_to include('Frozen Tundra')
    expect(arctic_out).not_to include('Sand Dunes')
  end

  def capture_io
    old = $stdout
    $stdout = StringIO.new
    yield
    $stdout.string
  ensure
    $stdout = old
  end
end

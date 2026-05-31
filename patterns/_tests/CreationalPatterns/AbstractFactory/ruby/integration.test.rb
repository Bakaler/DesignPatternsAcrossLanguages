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
#  Run: rspec integration_spec.rb
# ============================================================

# SECTION:: Imports
require 'stringio'
require_relative '../../../../CreationalPatterns/AbstractFactory/ruby/ruby'

def capture_generate(kit)
  old = $stdout
  $stdout = StringIO.new
  WorldGenerator.new(kit).generate
  $stdout.string
ensure
  $stdout = old
end

# SECTION:: WorldGenerator — Desert Integration
RSpec.describe 'WorldGenerator — Desert Biome' do
  let(:output) { capture_generate(DesertBiomeKit.instance) }

  it 'contains desert terrain name'       do expect(output).to include('Sand Dunes')       end
  it 'contains Scorpion enemy'            do expect(output).to include('Scorpion')          end
  it 'contains Sand Worm enemy'           do expect(output).to include('Sand Worm')         end
  it 'contains Desert Bandit enemy'       do expect(output).to include('Desert Bandit')     end
  it 'contains Sandstorm weather'         do expect(output).to include('Sandstorm')         end
  it 'contains Desert Loot Table'         do expect(output).to include('Desert Loot Table') end
end

# SECTION:: WorldGenerator — Arctic & Forest Integration
RSpec.describe 'WorldGenerator — Arctic Biome' do
  let(:output) { capture_generate(ArcticBiomeKit.instance) }

  it 'contains Frozen Tundra terrain'     do expect(output).to include('Frozen Tundra')    end
  it 'contains Polar Bear enemy'          do expect(output).to include('Polar Bear')        end
  it 'contains Ice Wolf enemy'            do expect(output).to include('Ice Wolf')          end
  it 'contains Frost Troll enemy'         do expect(output).to include('Frost Troll')       end
  it 'contains Blizzard weather'          do expect(output).to include('Blizzard')          end
end

RSpec.describe 'WorldGenerator — Forest Biome' do
  let(:output) { capture_generate(ForestBiomeKit.instance) }

  it 'contains Dense Forest Floor terrain' do expect(output).to include('Dense Forest Floor') end
  it 'contains Wolf enemy'                 do expect(output).to include('Wolf')               end
  it 'contains Wild Boar enemy'            do expect(output).to include('Wild Boar')          end
  it 'contains Forest Bandit enemy'        do expect(output).to include('Forest Bandit')      end
end

# SECTION:: Product Family Consistency
RSpec.describe 'Product Family Consistency' do
  it 'swapping factory changes every part of the output' do
    desert = capture_generate(DesertBiomeKit.instance)
    arctic  = capture_generate(ArcticBiomeKit.instance)

    expect(desert).to     include('Sand Dunes')
    expect(desert).not_to include('Frozen Tundra')
    expect(arctic).to     include('Frozen Tundra')
    expect(arctic).not_to include('Sand Dunes')
    expect(desert).not_to include('Polar Bear')
    expect(arctic).not_to include('Scorpion')
  end

  it 'desert loot table never appears in arctic output' do
    arctic = capture_generate(ArcticBiomeKit.instance)
    expect(arctic).not_to include('Desert Loot Table')
    expect(arctic).to     include('Arctic Loot Table')
  end

  it 'weather events are biome-specific' do
    desert = capture_generate(DesertBiomeKit.instance)
    arctic  = capture_generate(ArcticBiomeKit.instance)
    expect(desert).to     include('heat_wave')
    expect(arctic).to     include('whiteout')
    expect(desert).not_to include('whiteout')
    expect(arctic).not_to include('heat_wave')
  end
end

# SECTION:: Prototype Registration
RSpec.describe 'Prototype Registration (runtime enemy injection)' do
  it 'registered enemy appears in the next generate call' do
    kit    = DesertBiomeKit.instance
    before = capture_generate(kit)

    giant = Struct.new(:name, :health, :damage, :attack, :drop) { def clone = dup }
    kit.register_enemy(giant.new('Giant Scorpion (Boss)', 400, 60,
                                 'Tail sweep', 'Ancient Venom Sac'))

    after = capture_generate(kit)
    expect(before).not_to include('Giant Scorpion')
    expect(after).to      include('Giant Scorpion')
  end

  it 'registration is isolated — arctic kit unaffected' do
    arctic = capture_generate(ArcticBiomeKit.instance)
    expect(arctic).not_to include('Giant Scorpion')
  end

  it 'registered enemy is cloned on each generate call' do
    clone_calls = 0
    tracker = Object.new
    tracker.define_singleton_method(:name)   { 'Tracker' }
    tracker.define_singleton_method(:health) { 1 }
    tracker.define_singleton_method(:damage) { 1 }
    tracker.define_singleton_method(:attack) { 'Track' }
    tracker.define_singleton_method(:drop)   { 'Data' }
    tracker.define_singleton_method(:clone)  { clone_calls += 1; tracker }

    ForestBiomeKit.instance.register_enemy(tracker)
    capture_generate(ForestBiomeKit.instance)
    expect(clone_calls).to be >= 1
  end
end

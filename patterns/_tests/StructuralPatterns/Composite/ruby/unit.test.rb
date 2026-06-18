# ============================================================
#  Unit Tests — Composite: Airline Network
#
#  What we test here:
#    · Airport returns its own capacity and route count
#    · RegionalNetwork.get_capacity sums its airports
#    · AirportNetwork.get_capacity recurses through regions
#    · get_route_count propagates the same way as get_capacity
#    · Client calls get_capacity identically on leaf and composite
#    · remove() detaches a node and updates totals accordingly
#
#  Run: rspec unit.test.rb
# ============================================================

require 'rspec'
require 'stringio'
require_relative '../../../../StructuralPatterns/Composite/ruby/ruby'

def capture_output(&block)
  old = $stdout
  $stdout = StringIO.new
  block.call
  $stdout.string.lines.map(&:chomp)
ensure
  $stdout = old
end

# ── Airport (Leaf) ────────────────────────────────────────────
RSpec.describe Airport do
  subject(:ap) { described_class.new('LAX', 4) }

  it 'returns the airport name' do
    expect(ap.get_name).to eq('LAX')
  end

  it 'returns own capacity' do
    expect(ap.get_capacity).to eq(4)
  end

  it 'starts with zero routes' do
    expect(ap.get_route_count).to eq(0)
  end

  it 'increments route count with add_route' do
    ap.add_route('JFK')
    ap.add_route('ORD')
    expect(ap.get_route_count).to eq(2)
  end

  it 'print_tree includes the name' do
    lines = capture_output { ap.print_tree }
    expect(lines).to include(a_string_including('LAX'))
  end

  it 'print_tree includes the capacity' do
    lines = capture_output { ap.print_tree }
    expect(lines.join).to include('4')
  end
end

# ── RegionalNetwork (Composite) ───────────────────────────────
RSpec.describe RegionalNetwork do
  it 'returns the region name' do
    expect(RegionalNetwork.new('West Region').get_name).to eq('West Region')
  end

  it 'get_capacity sums its airports' do
    r = RegionalNetwork.new('West')
    r.add(Airport.new('LAX', 4))
    r.add(Airport.new('SFO', 3))
    expect(r.get_capacity).to eq(7)
  end

  it 'get_route_count sums routes across airports' do
    r   = RegionalNetwork.new('West')
    lax = Airport.new('LAX', 4)
    sfo = Airport.new('SFO', 3)
    lax.add_route('JFK'); lax.add_route('ORD')
    sfo.add_route('SEA')
    r.add(lax); r.add(sfo)
    expect(r.get_route_count).to eq(3)
  end

  it 'remove reduces get_capacity' do
    r   = RegionalNetwork.new('West')
    lax = Airport.new('LAX', 4)
    sfo = Airport.new('SFO', 3)
    r.add(lax); r.add(sfo)
    r.remove(lax)
    expect(r.get_capacity).to eq(3)
  end

  it 'empty region has capacity 0 and route count 0' do
    r = RegionalNetwork.new('Empty')
    expect(r.get_capacity).to    eq(0)
    expect(r.get_route_count).to eq(0)
  end

  it 'print_tree includes name and airports' do
    r = RegionalNetwork.new('West')
    r.add(Airport.new('LAX', 4))
    lines = capture_output { r.print_tree }
    expect(lines).to include(a_string_including('West'))
    expect(lines).to include(a_string_including('LAX'))
  end
end

# ── AirportNetwork (Root Composite) ──────────────────────────
RSpec.describe AirportNetwork do
  it 'get_capacity recurses through regions' do
    west = RegionalNetwork.new('West')
    west.add(Airport.new('LAX', 4))
    west.add(Airport.new('SFO', 3))
    east = RegionalNetwork.new('East')
    east.add(Airport.new('JFK', 5))
    net = AirportNetwork.new('Global')
    net.add(west); net.add(east)
    expect(net.get_capacity).to eq(12)
  end

  it 'get_route_count recurses through all levels' do
    west = RegionalNetwork.new('West')
    lax  = Airport.new('LAX', 4)
    lax.add_route('JFK'); lax.add_route('LHR')
    west.add(lax)
    east = RegionalNetwork.new('East')
    jfk  = Airport.new('JFK', 5)
    jfk.add_route('LAX')
    east.add(jfk)
    net = AirportNetwork.new('Global')
    net.add(west); net.add(east)
    expect(net.get_route_count).to eq(3)
  end

  it 'remove region updates totals' do
    west = RegionalNetwork.new('West')
    west.add(Airport.new('LAX', 4))
    east = RegionalNetwork.new('East')
    east.add(Airport.new('JFK', 5))
    net = AirportNetwork.new('Global')
    net.add(west); net.add(east)
    net.remove(west)
    expect(net.get_capacity).to eq(5)
  end
end

# ── Uniformity ────────────────────────────────────────────────
RSpec.describe 'Uniformity (core pattern guarantee)' do
  it 'same call on leaf and composite' do
    leaf      = Airport.new('LAX', 4)
    composite = RegionalNetwork.new('West')
    composite.add(Airport.new('LAX', 4))
    expect(leaf.get_capacity).to eq(composite.get_capacity)
  end

  it 'three-level tree resolves from root with one call' do
    region = RegionalNetwork.new('West')
    region.add(Airport.new('LAX', 4))
    region.add(Airport.new('SFO', 3))
    network = AirportNetwork.new('Global')
    network.add(region)
    expect(network.get_capacity).to eq(7)
  end
end

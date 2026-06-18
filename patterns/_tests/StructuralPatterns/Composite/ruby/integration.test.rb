# ============================================================
#  Integration Tests — Composite: Airline Network
#
#  What we test here:
#    · Full three-level tree builds and resolves correctly end-to-end
#    · Root get_capacity equals the true sum of every airport
#    · Mutations to a leaf propagate up to the root in one call
#    · Removing a region removes all its airports from root totals
#    · Adding a new region doesn't break existing queries
#    · print_tree renders the full tree with correct structure
#
#  Run: rspec integration.test.rb
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

def build_network
  lax = Airport.new('LAX', 4)
  lax.add_route('JFK'); lax.add_route('ORD'); lax.add_route('LHR')
  sfo = Airport.new('SFO', 3)
  sfo.add_route('SEA'); sfo.add_route('DEN')
  west = RegionalNetwork.new('West Region')
  west.add(lax); west.add(sfo)

  jfk = Airport.new('JFK', 5)
  jfk.add_route('LAX'); jfk.add_route('LHR'); jfk.add_route('CDG'); jfk.add_route('NRT')
  ord = Airport.new('ORD', 3)
  ord.add_route('LAX'); ord.add_route('JFK')
  east = RegionalNetwork.new('East Region')
  east.add(jfk); east.add(ord)

  network = AirportNetwork.new('Global Network')
  network.add(west); network.add(east)
  [network, west, east, lax, jfk]
end

TOTAL_CAPACITY = 4 + 3 + 5 + 3  # 15
TOTAL_ROUTES   = 3 + 2 + 4 + 2  # 11

# ── End-to-end totals ─────────────────────────────────────────
RSpec.describe 'Full network — totals' do
  let(:tree) { build_network }

  it 'root get_capacity equals sum of every airport' do
    expect(tree[0].get_capacity).to eq(TOTAL_CAPACITY)
  end

  it 'root get_route_count equals sum of every route' do
    expect(tree[0].get_route_count).to eq(TOTAL_ROUTES)
  end

  it 'region capacity is independent of siblings' do
    expect(tree[1].get_capacity).to eq(4 + 3)
  end
end

# ── Mutations propagate up ────────────────────────────────────
RSpec.describe 'Full network — mutations propagate to root' do
  it 'adding an airport increases root capacity' do
    network, west, * = build_network
    before = network.get_capacity
    west.add(Airport.new('SEA', 2))
    expect(network.get_capacity).to eq(before + 2)
  end

  it 'removing an airport decreases root capacity' do
    network, west, _, lax, * = build_network
    before = network.get_capacity
    west.remove(lax)
    expect(network.get_capacity).to eq(before - lax.get_capacity)
  end

  it 'removing a region removes all its airports from totals' do
    network, west, * = build_network
    west_cap    = west.get_capacity
    west_routes = west.get_route_count
    cap_before    = network.get_capacity
    routes_before = network.get_route_count
    network.remove(west)
    expect(network.get_capacity).to    eq(cap_before    - west_cap)
    expect(network.get_route_count).to eq(routes_before - west_routes)
  end
end

# ── Adding a new region ────────────────────────────────────────
RSpec.describe 'Full network — adding a new region' do
  it 'new region resolves from root correctly' do
    network, * = build_network
    before  = network.get_capacity
    central = RegionalNetwork.new('Central Region')
    central.add(Airport.new('DFW', 4))
    central.add(Airport.new('DEN', 3))
    network.add(central)
    expect(network.get_capacity).to eq(before + 4 + 3)
  end
end

# ── print_tree output ─────────────────────────────────────────
RSpec.describe 'Full network — print_tree output' do
  let(:lines) do
    network, * = build_network
    capture_output { network.print_tree }
  end

  it 'root network appears first' do
    expect(lines.first).to include('Global Network')
  end

  it 'all regions appear in output' do
    expect(lines).to include(a_string_including('West Region'))
    expect(lines).to include(a_string_including('East Region'))
  end

  it 'all airports appear in output' do
    %w[LAX SFO JFK ORD].each do |code|
      expect(lines).to include(a_string_including(code))
    end
  end

  it 'airports are indented more than their parent region' do
    west_line = lines.find { |l| l.include?('West Region') }
    lax_line  = lines.find { |l| l.include?('LAX') }
    west_indent = west_line.length - west_line.lstrip.length
    lax_indent  = lax_line.length  - lax_line.lstrip.length
    expect(lax_indent).to be > west_indent
  end
end

# ============================================================
#  Composite — Airline Network
#  Run: ruby ruby.rb
# ============================================================
#
#  Participants
#  ────────────────────────────────────────────────────────
#  Component    AirNetworkComponent (module — interface contract)
#  Leaf         Airport
#  Composite    RegionalNetwork, AirportNetwork
#  Client       Entry point
#
#  Consequences demonstrated
#  ────────────────────────────────────────────────────────
#  ✓ Uniformity   — get_capacity works identically at every level
#  ✓ Recursion    — composites delegate down; client writes zero loops
#  ✓ Extensibility — add a continent level without touching existing code
#  ✗ Over-general  — every node must implement add/remove even if leaf
# ============================================================


# SECTION:: Component
# ═════════════════════════════════════════════════════════════
#  COMPONENT — AirNetworkComponent
# ═════════════════════════════════════════════════════════════
#  Shared interface every node in the tree must satisfy.
#  The client never checks whether it is talking to a leaf
#  or a composite — it just calls the interface.

module AirNetworkComponent
  def get_name        = raise NotImplementedError, "#{self.class}#get_name"
  def get_capacity    = raise NotImplementedError, "#{self.class}#get_capacity"
  def get_route_count = raise NotImplementedError, "#{self.class}#get_route_count"
  def print_tree(_indent = 0) = raise NotImplementedError, "#{self.class}#print_tree"
end


# SECTION:: Leaf
# ═════════════════════════════════════════════════════════════
#  LEAF — Airport
# ═════════════════════════════════════════════════════════════
#  Terminal node. Owns its own capacity and outgoing routes.

class Airport
  include AirNetworkComponent

  def initialize(name, capacity)
    @name     = name
    @capacity = capacity
    @routes   = []
  end

  def add_route(destination) = @routes << destination

  def get_name        = @name
  def get_capacity    = @capacity
  def get_route_count = @routes.size

  def print_tree(indent = 0)
    pad = '  ' * indent
    puts "#{pad}[airport] #{@name}  (cap: #{@capacity}, routes: #{@routes.size})"
  end
end


# SECTION:: Composite
# ═════════════════════════════════════════════════════════════
#  COMPOSITE — RegionalNetwork
# ═════════════════════════════════════════════════════════════
#  Mid-level composite. Holds a collection of Airports.
#  Delegates every query down to its children.

class RegionalNetwork
  include AirNetworkComponent

  def initialize(name)
    @name     = name
    @airports = []
  end

  def add(airport)    = @airports << airport
  def remove(airport) = @airports.delete(airport)

  def get_name        = @name
  def get_capacity    = @airports.sum(&:get_capacity)
  def get_route_count = @airports.sum(&:get_route_count)

  def print_tree(indent = 0)
    pad = '  ' * indent
    puts "#{pad}[region] #{@name}/"
    @airports.each { |a| a.print_tree(indent + 1) }
  end
end


# SECTION:: Root Composite
# ═════════════════════════════════════════════════════════════
#  COMPOSITE — AirportNetwork
# ═════════════════════════════════════════════════════════════
#  Top-level composite. Holds a collection of RegionalNetworks.
#  Same interface, one level higher. Entry point for all queries.

class AirportNetwork
  include AirNetworkComponent

  def initialize(name)
    @name    = name
    @regions = []
  end

  def add(region)    = @regions << region
  def remove(region) = @regions.delete(region)

  def get_name        = @name
  def get_capacity    = @regions.sum(&:get_capacity)
  def get_route_count = @regions.sum(&:get_route_count)

  def print_tree(indent = 0)
    pad = '  ' * indent
    puts "#{pad}[network] #{@name}/"
    @regions.each { |r| r.print_tree(indent + 1) }
  end
end


# SECTION:: Client
# ═════════════════════════════════════════════════════════════
#  CLIENT
# ═════════════════════════════════════════════════════════════

if __FILE__ == $PROGRAM_NAME
  SEP = '=' * 64

  puts '╔══════════════════════════════════════════════════════════════╗'
  puts '║           Composite — Airline Network                        ║'
  puts '╚══════════════════════════════════════════════════════════════╝'

  # Build the three-level tree
  network = AirportNetwork.new('Global Network')

  west = RegionalNetwork.new('West Region')
  lax  = Airport.new('LAX', 4)
  sfo  = Airport.new('SFO', 3)
  lax.add_route('JFK'); lax.add_route('ORD'); lax.add_route('LHR')
  sfo.add_route('SEA'); sfo.add_route('DEN')
  west.add(lax); west.add(sfo)

  east = RegionalNetwork.new('East Region')
  jfk  = Airport.new('JFK', 5)
  ord  = Airport.new('ORD', 3)
  jfk.add_route('LAX'); jfk.add_route('LHR'); jfk.add_route('CDG'); jfk.add_route('NRT')
  ord.add_route('LAX'); ord.add_route('JFK')
  east.add(jfk); east.add(ord)

  network.add(west); network.add(east)

  puts "\n#{SEP}"
  puts '  Network tree'
  puts "#{SEP}\n\n"
  network.print_tree

  puts "\n#{SEP}"
  puts '  Client queries — same call regardless of node type'
  puts "#{SEP}\n\n"

  nodes = [
    ['Global Network', network],
    ['West Region',    west],
    ['East Region',    east],
    ['LAX (leaf)',     lax],
    ['JFK (leaf)',     jfk],
  ]

  nodes.each do |label, node|
    puts "  #{label.ljust(16)} get_capacity=#{node.get_capacity.to_s.rjust(2)}   get_route_count=#{node.get_route_count}"
  end

  puts "\n#{SEP}"
  puts '  Without Composite'
  puts SEP
  puts ''
  puts '  Every caller would need:'
  puts '    if node.is_a?(Airport)         return node.capacity'
  puts '    if node.is_a?(RegionalNetwork) loop airports'
  puts '    if node.is_a?(AirportNetwork)  loop regions + loop airports'
  puts '    if new level added             add another branch...'
  puts ''
  puts '  With Composite:'
  puts '    node.get_capacity  — works at every level, always'

  puts "\n╔══════════════════════════════════════════════════════════════╗"
  puts '║  Done                                                        ║'
  puts '╚══════════════════════════════════════════════════════════════╝'
end

# ============================================================
#  Integration Tests — Composite: Airline Network
#
#  What we test here:
#    · Full three-level tree builds and resolves correctly end-to-end
#    · Root get_capacity() equals the true sum of every airport
#    · Mutations to a leaf propagate up to the root in one call
#    · Removing a region removes all its airports from root totals
#    · Adding a new region doesn't break existing queries
#    · print_tree() renders the full tree with correct structure
#
#  Run: pytest integration.test.py -v
# ============================================================

import sys, os, io
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../../../StructuralPatterns/Composite/python'))
from python import Airport, RegionalNetwork, AirportNetwork


def capture(fn):
    buf = io.StringIO()
    sys.stdout = buf
    try:
        fn()
    finally:
        sys.stdout = sys.__stdout__
    return buf.getvalue().splitlines()


def build_network():
    lax = Airport('LAX', 4)
    lax.add_route('JFK'); lax.add_route('ORD'); lax.add_route('LHR')
    sfo = Airport('SFO', 3)
    sfo.add_route('SEA'); sfo.add_route('DEN')
    west = RegionalNetwork('West Region')
    west.add(lax); west.add(sfo)

    jfk = Airport('JFK', 5)
    jfk.add_route('LAX'); jfk.add_route('LHR'); jfk.add_route('CDG'); jfk.add_route('NRT')
    ord_ = Airport('ORD', 3)
    ord_.add_route('LAX'); ord_.add_route('JFK')
    east = RegionalNetwork('East Region')
    east.add(jfk); east.add(ord_)

    network = AirportNetwork('Global Network')
    network.add(west); network.add(east)
    return network, west, east, lax, jfk


TOTAL_CAPACITY = 4 + 3 + 5 + 3  # 15
TOTAL_ROUTES   = 3 + 2 + 4 + 2  # 11


# ── End-to-end totals ─────────────────────────────────────────
class TestFullNetworkTotals:
    def test_root_capacity(self):
        network, *_ = build_network()
        assert network.get_capacity() == TOTAL_CAPACITY

    def test_root_route_count(self):
        network, *_ = build_network()
        assert network.get_route_count() == TOTAL_ROUTES

    def test_region_capacity_independent_of_siblings(self):
        _, west, *_ = build_network()
        assert west.get_capacity() == 4 + 3


# ── Mutations propagate up ────────────────────────────────────
class TestMutationsPropagateUp:
    def test_add_airport_increases_root_capacity(self):
        network, west, *_ = build_network()
        before = network.get_capacity()
        west.add(Airport('SEA', 2))
        assert network.get_capacity() == before + 2

    def test_remove_airport_decreases_root_capacity(self):
        network, west, _, lax, _ = build_network()
        before = network.get_capacity()
        west.remove(lax)
        assert network.get_capacity() == before - lax.get_capacity()

    def test_remove_region_removes_all_its_airports(self):
        network, west, *_ = build_network()
        west_cap    = west.get_capacity()
        west_routes = west.get_route_count()
        cap_before  = network.get_capacity()
        routes_before = network.get_route_count()
        network.remove(west)
        assert network.get_capacity()    == cap_before    - west_cap
        assert network.get_route_count() == routes_before - west_routes


# ── Adding a new region ────────────────────────────────────────
class TestAddingNewRegion:
    def test_new_region_resolves_from_root(self):
        network, *_ = build_network()
        before = network.get_capacity()
        central = RegionalNetwork('Central Region')
        central.add(Airport('DFW', 4))
        central.add(Airport('DEN', 3))
        network.add(central)
        assert network.get_capacity() == before + 4 + 3


# ── print_tree output ─────────────────────────────────────────
class TestPrintTree:
    def setup_method(self):
        network, *_ = build_network()
        self.lines = capture(lambda: network.print_tree())

    def test_root_appears_first(self):
        assert 'Global Network' in self.lines[0]

    def test_all_regions_present(self):
        assert any('West Region' in l for l in self.lines)
        assert any('East Region' in l for l in self.lines)

    def test_all_airports_present(self):
        for code in ['LAX', 'SFO', 'JFK', 'ORD']:
            assert any(code in l for l in self.lines), f'expected {code} in output'

    def test_airports_indented_more_than_region(self):
        west_line = next(l for l in self.lines if 'West Region' in l)
        lax_line  = next(l for l in self.lines if 'LAX' in l)
        west_indent = len(west_line) - len(west_line.lstrip())
        lax_indent  = len(lax_line)  - len(lax_line.lstrip())
        assert lax_indent > west_indent

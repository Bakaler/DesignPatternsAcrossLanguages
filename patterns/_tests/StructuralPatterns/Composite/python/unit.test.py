# ============================================================
#  Unit Tests — Composite: Airline Network
#
#  What we test here:
#    · Airport returns its own capacity and route count
#    · RegionalNetwork.get_capacity() sums its airports
#    · AirportNetwork.get_capacity() recurses through regions
#    · get_route_count() propagates the same way as get_capacity()
#    · Client calls get_capacity() identically on leaf and composite
#    · remove() detaches a node and updates totals accordingly
#
#  Run: pytest unit.test.py -v
# ============================================================

import sys, os, io
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../../../StructuralPatterns/Composite/python'))
from python import Airport, RegionalNetwork, AirportNetwork, AirNetworkComponent


def capture(fn):
    buf = io.StringIO()
    sys.stdout = buf
    try:
        fn()
    finally:
        sys.stdout = sys.__stdout__
    return buf.getvalue().splitlines()


# ── Airport (Leaf) ────────────────────────────────────────────
class TestAirport:
    def test_get_name(self):
        assert Airport('LAX', 4).get_name() == 'LAX'

    def test_get_capacity(self):
        assert Airport('LAX', 4).get_capacity() == 4

    def test_get_route_count_starts_zero(self):
        assert Airport('LAX', 4).get_route_count() == 0

    def test_get_route_count_increments(self):
        ap = Airport('SFO', 3)
        ap.add_route('JFK')
        ap.add_route('ORD')
        assert ap.get_route_count() == 2

    def test_print_includes_name(self):
        lines = capture(lambda: Airport('LAX', 4).print_tree())
        assert any('LAX' in l for l in lines)

    def test_print_includes_capacity(self):
        lines = capture(lambda: Airport('LAX', 4).print_tree())
        assert any('4' in l for l in lines)


# ── RegionalNetwork (Composite) ───────────────────────────────
class TestRegionalNetwork:
    def test_get_name(self):
        assert RegionalNetwork('West Region').get_name() == 'West Region'

    def test_get_capacity_sums_airports(self):
        r = RegionalNetwork('West')
        r.add(Airport('LAX', 4))
        r.add(Airport('SFO', 3))
        assert r.get_capacity() == 7

    def test_get_route_count_sums_airports(self):
        r   = RegionalNetwork('West')
        lax = Airport('LAX', 4)
        sfo = Airport('SFO', 3)
        lax.add_route('JFK'); lax.add_route('ORD')
        sfo.add_route('SEA')
        r.add(lax); r.add(sfo)
        assert r.get_route_count() == 3

    def test_remove_reduces_capacity(self):
        r   = RegionalNetwork('West')
        lax = Airport('LAX', 4)
        sfo = Airport('SFO', 3)
        r.add(lax); r.add(sfo)
        r.remove(lax)
        assert r.get_capacity() == 3

    def test_empty_region(self):
        r = RegionalNetwork('Empty')
        assert r.get_capacity()    == 0
        assert r.get_route_count() == 0

    def test_print_includes_name_and_airports(self):
        r = RegionalNetwork('West')
        r.add(Airport('LAX', 4))
        lines = capture(lambda: r.print_tree())
        assert any('West' in l for l in lines)
        assert any('LAX'  in l for l in lines)


# ── AirportNetwork (Root Composite) ──────────────────────────
class TestAirportNetwork:
    def test_get_capacity_recurses(self):
        west = RegionalNetwork('West')
        west.add(Airport('LAX', 4))
        west.add(Airport('SFO', 3))
        east = RegionalNetwork('East')
        east.add(Airport('JFK', 5))
        net = AirportNetwork('Global')
        net.add(west); net.add(east)
        assert net.get_capacity() == 12

    def test_get_route_count_recurses(self):
        west = RegionalNetwork('West')
        lax  = Airport('LAX', 4)
        lax.add_route('JFK'); lax.add_route('LHR')
        west.add(lax)
        east = RegionalNetwork('East')
        jfk  = Airport('JFK', 5)
        jfk.add_route('LAX')
        east.add(jfk)
        net = AirportNetwork('Global')
        net.add(west); net.add(east)
        assert net.get_route_count() == 3

    def test_remove_region_updates_totals(self):
        west = RegionalNetwork('West')
        west.add(Airport('LAX', 4))
        east = RegionalNetwork('East')
        east.add(Airport('JFK', 5))
        net = AirportNetwork('Global')
        net.add(west); net.add(east)
        net.remove(west)
        assert net.get_capacity() == 5


# ── Uniformity ────────────────────────────────────────────────
class TestUniformity:
    def test_same_call_on_leaf_and_composite(self):
        leaf      = Airport('LAX', 4)
        composite = RegionalNetwork('West')
        composite.add(Airport('LAX', 4))
        assert leaf.get_capacity() == composite.get_capacity()

    def test_three_level_tree_resolves_from_root(self):
        region = RegionalNetwork('West')
        region.add(Airport('LAX', 4))
        region.add(Airport('SFO', 3))
        network = AirportNetwork('Global')
        network.add(region)
        assert network.get_capacity() == 7

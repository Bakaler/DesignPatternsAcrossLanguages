# ============================================================
#  Composite — Airline Network
#  Run: python python.py
# ============================================================
#
#  Participants
#  ────────────────────────────────────────────────────────
#  Component    AirNetworkComponent (ABC)
#  Leaf         Airport
#  Composite    RegionalNetwork, AirportNetwork
#  Client       Entry point
#
#  Consequences demonstrated
#  ────────────────────────────────────────────────────────
#  ✓ Uniformity   — get_capacity() works identically at every level
#  ✓ Recursion    — composites delegate down; client writes zero loops
#  ✓ Extensibility — add a continent level without touching existing code
#  ✗ Over-general  — every node must implement add/remove even if leaf
# ============================================================

from __future__ import annotations
from abc import ABC, abstractmethod
import sys
import io


# SECTION:: Component
# ═════════════════════════════════════════════════════════════
#  COMPONENT — AirNetworkComponent
# ═════════════════════════════════════════════════════════════
#  Shared interface every node in the tree must satisfy.
#  The client never checks whether it is talking to a leaf
#  or a composite — it just calls the interface.

class AirNetworkComponent(ABC):
    @abstractmethod
    def get_name(self) -> str: ...

    @abstractmethod
    def get_capacity(self) -> int:
        """leaf: own slots  |  composite: sum of children"""

    @abstractmethod
    def get_route_count(self) -> int:
        """leaf: own routes  |  composite: recursive sum"""

    @abstractmethod
    def print_tree(self, indent: int = 0) -> None: ...


# SECTION:: Leaf
# ═════════════════════════════════════════════════════════════
#  LEAF — Airport
# ═════════════════════════════════════════════════════════════
#  Terminal node. Owns its own capacity and outgoing routes.

class Airport(AirNetworkComponent):
    def __init__(self, name: str, capacity: int) -> None:
        self._name     = name
        self._capacity = capacity
        self._routes:  list[str] = []

    def add_route(self, destination: str) -> None:
        self._routes.append(destination)

    def get_name(self)        -> str: return self._name
    def get_capacity(self)    -> int: return self._capacity
    def get_route_count(self) -> int: return len(self._routes)

    def print_tree(self, indent: int = 0) -> None:
        pad = '  ' * indent
        print(f'{pad}[airport] {self._name}  (cap: {self._capacity}, routes: {len(self._routes)})')


# SECTION:: Composite
# ═════════════════════════════════════════════════════════════
#  COMPOSITE — RegionalNetwork
# ═════════════════════════════════════════════════════════════
#  Mid-level composite. Holds a collection of Airports.
#  Delegates every query down to its children.

class RegionalNetwork(AirNetworkComponent):
    def __init__(self, name: str) -> None:
        self._name     = name
        self._airports: list[Airport] = []

    def add(self, airport: Airport)    -> None: self._airports.append(airport)
    def remove(self, airport: Airport) -> None: self._airports.remove(airport)

    def get_name(self)        -> str: return self._name
    def get_capacity(self)    -> int: return sum(a.get_capacity()    for a in self._airports)
    def get_route_count(self) -> int: return sum(a.get_route_count() for a in self._airports)

    def print_tree(self, indent: int = 0) -> None:
        pad = '  ' * indent
        print(f'{pad}[region] {self._name}/')
        for a in self._airports:
            a.print_tree(indent + 1)


# SECTION:: Root Composite
# ═════════════════════════════════════════════════════════════
#  COMPOSITE — AirportNetwork
# ═════════════════════════════════════════════════════════════
#  Top-level composite. Holds a collection of RegionalNetworks.
#  Same interface, one level higher. Entry point for all queries.

class AirportNetwork(AirNetworkComponent):
    def __init__(self, name: str) -> None:
        self._name    = name
        self._regions: list[RegionalNetwork] = []

    def add(self, region: RegionalNetwork)    -> None: self._regions.append(region)
    def remove(self, region: RegionalNetwork) -> None: self._regions.remove(region)

    def get_name(self)        -> str: return self._name
    def get_capacity(self)    -> int: return sum(r.get_capacity()    for r in self._regions)
    def get_route_count(self) -> int: return sum(r.get_route_count() for r in self._regions)

    def print_tree(self, indent: int = 0) -> None:
        pad = '  ' * indent
        print(f'{pad}[network] {self._name}/')
        for r in self._regions:
            r.print_tree(indent + 1)


# SECTION:: Client
# ═════════════════════════════════════════════════════════════
#  CLIENT
# ═════════════════════════════════════════════════════════════

if __name__ == '__main__':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    SEP = '=' * 64

    print('╔══════════════════════════════════════════════════════════════╗')
    print('║           Composite — Airline Network                        ║')
    print('╚══════════════════════════════════════════════════════════════╝')

    # Build the three-level tree
    network = AirportNetwork('Global Network')

    west = RegionalNetwork('West Region')
    lax  = Airport('LAX', 4)
    sfo  = Airport('SFO', 3)
    lax.add_route('JFK'); lax.add_route('ORD'); lax.add_route('LHR')
    sfo.add_route('SEA'); sfo.add_route('DEN')
    west.add(lax); west.add(sfo)

    east = RegionalNetwork('East Region')
    jfk  = Airport('JFK', 5)
    ord_ = Airport('ORD', 3)
    jfk.add_route('LAX'); jfk.add_route('LHR'); jfk.add_route('CDG'); jfk.add_route('NRT')
    ord_.add_route('LAX'); ord_.add_route('JFK')
    east.add(jfk); east.add(ord_)

    network.add(west); network.add(east)

    print(f'\n{SEP}')
    print('  Network tree')
    print(f'{SEP}\n')
    network.print_tree()

    print(f'\n{SEP}')
    print('  Client queries — same call regardless of node type')
    print(f'{SEP}\n')

    nodes: list[tuple[str, AirNetworkComponent]] = [
        ('Global Network', network),
        ('West Region',    west),
        ('East Region',    east),
        ('LAX (leaf)',     lax),
        ('JFK (leaf)',     jfk),
    ]

    for label, node in nodes:
        print(f'  {label:<16} get_capacity()={node.get_capacity():>2}   get_route_count()={node.get_route_count()}')

    print(f'\n{SEP}')
    print('  Without Composite')
    print(SEP)
    print('')
    print('  Every caller would need:')
    print('    if isinstance(node, Airport):        return node.capacity')
    print('    if isinstance(node, RegionalNetwork): loop airports')
    print('    if isinstance(node, AirportNetwork):  loop regions + loop airports')
    print('    if new level added:                   add another branch...')
    print('')
    print('  With Composite:')
    print('    node.get_capacity()  — works at every level, always')

    print('\n╔══════════════════════════════════════════════════════════════╗')
    print('║  Done                                                        ║')
    print('╚══════════════════════════════════════════════════════════════╝')

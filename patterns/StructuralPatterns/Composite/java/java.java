// ============================================================
//  Composite — Airline Network
//  Run: javac java.java && java Main
// ============================================================
//
//  Participants
//  ────────────────────────────────────────────────────────
//  Component    AirNetworkComponent (interface)
//  Leaf         Airport
//  Composite    RegionalNetwork, AirportNetwork
//  Client       Main
//
//  Consequences demonstrated
//  ────────────────────────────────────────────────────────
//  ✓ Uniformity   — getCapacity() works identically at every level
//  ✓ Recursion    — composites delegate down; client writes zero loops
//  ✓ Extensibility — add a continent level without touching existing code
//  ✗ Over-general  — every node must implement add/remove even if leaf
// ============================================================

import java.util.*;


// SECTION:: Component
// ═════════════════════════════════════════════════════════════
//  COMPONENT — AirNetworkComponent
// ═════════════════════════════════════════════════════════════
//  Shared interface every node in the tree must satisfy.
//  The client never checks whether it is talking to a leaf
//  or a composite — it just calls the interface.

interface AirNetworkComponent {
    String getName();
    int    getCapacity();    // leaf: own slots  |  composite: sum of children
    int    getRouteCount();  // leaf: own routes |  composite: recursive sum
    void   print(int indent);
}


// SECTION:: Leaf
// ═════════════════════════════════════════════════════════════
//  LEAF — Airport
// ═════════════════════════════════════════════════════════════
//  Terminal node. Owns its own capacity and outgoing routes.

class Airport implements AirNetworkComponent {
    private final String       name;
    private final int          capacity;
    private final List<String> routes = new ArrayList<>();

    Airport(String name, int capacity) {
        this.name     = name;
        this.capacity = capacity;
    }

    void addRoute(String destination) { routes.add(destination); }

    @Override public String getName()       { return name; }
    @Override public int    getCapacity()   { return capacity; }
    @Override public int    getRouteCount() { return routes.size(); }

    @Override public void print(int indent) {
        String pad = "  ".repeat(indent);
        System.out.printf("%s[airport] %s  (cap: %d, routes: %d)%n", pad, name, capacity, routes.size());
    }
}


// SECTION:: Composite
// ═════════════════════════════════════════════════════════════
//  COMPOSITE — RegionalNetwork
// ═════════════════════════════════════════════════════════════
//  Mid-level composite. Holds a collection of Airports.
//  Delegates every query down to its children.

class RegionalNetwork implements AirNetworkComponent {
    private final String        name;
    private final List<Airport> airports = new ArrayList<>();

    RegionalNetwork(String name) { this.name = name; }

    void add(Airport a)    { airports.add(a); }
    void remove(Airport a) { airports.remove(a); }

    @Override public String getName()       { return name; }
    @Override public int    getCapacity()   { return airports.stream().mapToInt(Airport::getCapacity).sum(); }
    @Override public int    getRouteCount() { return airports.stream().mapToInt(Airport::getRouteCount).sum(); }

    @Override public void print(int indent) {
        String pad = "  ".repeat(indent);
        System.out.printf("%s[region] %s/%n", pad, name);
        airports.forEach(a -> a.print(indent + 1));
    }
}


// SECTION:: Root Composite
// ═════════════════════════════════════════════════════════════
//  COMPOSITE — AirportNetwork
// ═════════════════════════════════════════════════════════════
//  Top-level composite. Holds a collection of RegionalNetworks.
//  Same interface, one level higher. Entry point for all queries.

class AirportNetwork implements AirNetworkComponent {
    private final String               name;
    private final List<RegionalNetwork> regions = new ArrayList<>();

    AirportNetwork(String name) { this.name = name; }

    void add(RegionalNetwork r)    { regions.add(r); }
    void remove(RegionalNetwork r) { regions.remove(r); }

    @Override public String getName()       { return name; }
    @Override public int    getCapacity()   { return regions.stream().mapToInt(RegionalNetwork::getCapacity).sum(); }
    @Override public int    getRouteCount() { return regions.stream().mapToInt(RegionalNetwork::getRouteCount).sum(); }

    @Override public void print(int indent) {
        String pad = "  ".repeat(indent);
        System.out.printf("%s[network] %s/%n", pad, name);
        regions.forEach(r -> r.print(indent + 1));
    }
}


// SECTION:: Client
// ═════════════════════════════════════════════════════════════
//  CLIENT
// ═════════════════════════════════════════════════════════════

class Main {
    static final String SEP = "═".repeat(64);

    public static void main(String[] args) {
        System.out.println("╔══════════════════════════════════════════════════════════════╗");
        System.out.println("║           Composite — Airline Network                        ║");
        System.out.println("╚══════════════════════════════════════════════════════════════╝");

        // Build the three-level tree
        AirportNetwork network = new AirportNetwork("Global Network");

        RegionalNetwork west = new RegionalNetwork("West Region");
        Airport lax = new Airport("LAX", 4);
        Airport sfo = new Airport("SFO", 3);
        lax.addRoute("JFK"); lax.addRoute("ORD"); lax.addRoute("LHR");
        sfo.addRoute("SEA"); sfo.addRoute("DEN");
        west.add(lax); west.add(sfo);

        RegionalNetwork east = new RegionalNetwork("East Region");
        Airport jfk = new Airport("JFK", 5);
        Airport ord = new Airport("ORD", 3);
        jfk.addRoute("LAX"); jfk.addRoute("LHR"); jfk.addRoute("CDG"); jfk.addRoute("NRT");
        ord.addRoute("LAX"); ord.addRoute("JFK");
        east.add(jfk); east.add(ord);

        network.add(west); network.add(east);

        System.out.println("\n" + SEP);
        System.out.println("  Network tree");
        System.out.println(SEP + "\n");
        network.print(0);

        System.out.println("\n" + SEP);
        System.out.println("  Client queries — same call regardless of node type");
        System.out.println(SEP + "\n");

        List<Object[]> nodes = List.of(
            new Object[]{ "Global Network", network },
            new Object[]{ "West Region",    west    },
            new Object[]{ "East Region",    east    },
            new Object[]{ "LAX (leaf)",     lax     },
            new Object[]{ "JFK (leaf)",     jfk     }
        );

        for (Object[] entry : nodes) {
            String label = (String) entry[0];
            AirNetworkComponent node = (AirNetworkComponent) entry[1];
            System.out.printf("  %-16s getCapacity()=%2d   getRouteCount()=%d%n",
                label, node.getCapacity(), node.getRouteCount());
        }

        System.out.println("\n" + SEP);
        System.out.println("  Without Composite");
        System.out.println(SEP);
        System.out.println();
        System.out.println("  Every caller would need:");
        System.out.println("    if (node instanceof Airport)         return node.capacity");
        System.out.println("    if (node instanceof RegionalNetwork) { loop airports }");
        System.out.println("    if (node instanceof AirportNetwork)  { loop regions + loop airports }");
        System.out.println("    if (new level added)                   add another branch...");
        System.out.println();
        System.out.println("  With Composite:");
        System.out.println("    node.getCapacity()  — works at every level, always");

        System.out.println("\n╔══════════════════════════════════════════════════════════════╗");
        System.out.println("║  Done                                                        ║");
        System.out.println("╚══════════════════════════════════════════════════════════════╝");
    }
}

// ============================================================
//  Unit Tests — Composite: Airline Network
//
//  What we test here:
//    · Airport returns its own capacity and route count
//    · RegionalNetwork.getCapacity() sums its airports
//    · AirportNetwork.getCapacity() recurses through regions
//    · getRouteCount() propagates the same way as getCapacity()
//    · Client calls getCapacity() identically on leaf and composite
//    · remove() detaches a node and updates totals accordingly
//
//  Run: Use your IDE / Maven / Gradle test runner
// ============================================================

import org.junit.jupiter.api.*;
import org.junit.jupiter.api.Nested;
import java.io.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

public class unit {

    static List<String> capture(Runnable fn) {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PrintStream old = System.out;
        System.setOut(new PrintStream(baos));
        try { fn.run(); } finally { System.setOut(old); }
        return Arrays.asList(baos.toString().split("\n"));
    }

    // ── Airport (Leaf) ────────────────────────────────────────
    @Nested class AirportTests {
        Airport ap = new Airport("LAX", 4);

        @Test void getName() { assertEquals("LAX", ap.getName()); }
        @Test void getCapacity() { assertEquals(4, ap.getCapacity()); }
        @Test void getRouteCountStartsZero() { assertEquals(0, ap.getRouteCount()); }

        @Test void getRouteCountIncrements() {
            Airport a = new Airport("SFO", 3);
            a.addRoute("JFK"); a.addRoute("ORD");
            assertEquals(2, a.getRouteCount());
        }

        @Test void printIncludesName() {
            List<String> lines = capture(() -> ap.print(0));
            assertTrue(lines.stream().anyMatch(l -> l.contains("LAX")));
        }

        @Test void printIncludesCapacity() {
            List<String> lines = capture(() -> ap.print(0));
            assertTrue(lines.stream().anyMatch(l -> l.contains("4")));
        }
    }

    // ── RegionalNetwork (Composite) ───────────────────────────
    @Nested class RegionalNetworkTests {
        @Test void getName() { assertEquals("West Region", new RegionalNetwork("West Region").getName()); }

        @Test void getCapacitySumsAirports() {
            RegionalNetwork r = new RegionalNetwork("West");
            r.add(new Airport("LAX", 4));
            r.add(new Airport("SFO", 3));
            assertEquals(7, r.getCapacity());
        }

        @Test void getRouteCountSumsAirports() {
            RegionalNetwork r   = new RegionalNetwork("West");
            Airport         lax = new Airport("LAX", 4);
            Airport         sfo = new Airport("SFO", 3);
            lax.addRoute("JFK"); lax.addRoute("ORD");
            sfo.addRoute("SEA");
            r.add(lax); r.add(sfo);
            assertEquals(3, r.getRouteCount());
        }

        @Test void removeReducesCapacity() {
            RegionalNetwork r   = new RegionalNetwork("West");
            Airport         lax = new Airport("LAX", 4);
            Airport         sfo = new Airport("SFO", 3);
            r.add(lax); r.add(sfo);
            r.remove(lax);
            assertEquals(3, r.getCapacity());
        }

        @Test void emptyRegion() {
            RegionalNetwork r = new RegionalNetwork("Empty");
            assertEquals(0, r.getCapacity());
            assertEquals(0, r.getRouteCount());
        }

        @Test void printIncludesNameAndAirports() {
            RegionalNetwork r = new RegionalNetwork("West");
            r.add(new Airport("LAX", 4));
            List<String> lines = capture(() -> r.print(0));
            assertTrue(lines.stream().anyMatch(l -> l.contains("West")));
            assertTrue(lines.stream().anyMatch(l -> l.contains("LAX")));
        }
    }

    // ── AirportNetwork (Root Composite) ──────────────────────
    @Nested class AirportNetworkTests {
        @Test void getCapacityRecurses() {
            RegionalNetwork west = new RegionalNetwork("West");
            west.add(new Airport("LAX", 4)); west.add(new Airport("SFO", 3));
            RegionalNetwork east = new RegionalNetwork("East");
            east.add(new Airport("JFK", 5));
            AirportNetwork net = new AirportNetwork("Global");
            net.add(west); net.add(east);
            assertEquals(12, net.getCapacity());
        }

        @Test void getRouteCountRecurses() {
            RegionalNetwork west = new RegionalNetwork("West");
            Airport lax = new Airport("LAX", 4);
            lax.addRoute("JFK"); lax.addRoute("LHR");
            west.add(lax);
            RegionalNetwork east = new RegionalNetwork("East");
            Airport jfk = new Airport("JFK", 5);
            jfk.addRoute("LAX");
            east.add(jfk);
            AirportNetwork net = new AirportNetwork("Global");
            net.add(west); net.add(east);
            assertEquals(3, net.getRouteCount());
        }

        @Test void removeRegionUpdatesTotals() {
            RegionalNetwork west = new RegionalNetwork("West");
            west.add(new Airport("LAX", 4));
            RegionalNetwork east = new RegionalNetwork("East");
            east.add(new Airport("JFK", 5));
            AirportNetwork net = new AirportNetwork("Global");
            net.add(west); net.add(east);
            net.remove(west);
            assertEquals(5, net.getCapacity());
        }
    }

    // ── Uniformity ────────────────────────────────────────────
    @Nested class UniformityTests {
        @Test void sameCallOnLeafAndComposite() {
            AirNetworkComponent leaf      = new Airport("LAX", 4);
            RegionalNetwork     composite = new RegionalNetwork("West");
            composite.add(new Airport("LAX", 4));
            assertEquals(leaf.getCapacity(), composite.getCapacity());
        }

        @Test void threeLevelTreeFromRoot() {
            RegionalNetwork region = new RegionalNetwork("West");
            region.add(new Airport("LAX", 4));
            region.add(new Airport("SFO", 3));
            AirportNetwork network = new AirportNetwork("Global");
            network.add(region);
            assertEquals(7, network.getCapacity());
        }
    }
}

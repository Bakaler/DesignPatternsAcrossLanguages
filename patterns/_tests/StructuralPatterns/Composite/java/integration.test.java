// ============================================================
//  Integration Tests — Composite: Airline Network
//
//  What we test here:
//    · Full three-level tree builds and resolves correctly end-to-end
//    · Root getCapacity() equals the true sum of every airport
//    · Mutations to a leaf propagate up to the root in one call
//    · Removing a region removes all its airports from root totals
//    · Adding a new region doesn't break existing queries
//    · print() renders the full tree with correct structure
//
//  Run: Use your IDE / Maven / Gradle test runner
// ============================================================

import org.junit.jupiter.api.*;
import org.junit.jupiter.api.Nested;
import java.io.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

public class integration {

    static final int TOTAL_CAPACITY = 4 + 3 + 5 + 3; // 15
    static final int TOTAL_ROUTES   = 3 + 2 + 4 + 2; // 11

    static List<String> capture(Runnable fn) {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PrintStream old = System.out;
        System.setOut(new PrintStream(baos));
        try { fn.run(); } finally { System.setOut(old); }
        return Arrays.asList(baos.toString().split("\n"));
    }

    static Object[] buildNetwork() {
        Airport lax = new Airport("LAX", 4);
        lax.addRoute("JFK"); lax.addRoute("ORD"); lax.addRoute("LHR");
        Airport sfo = new Airport("SFO", 3);
        sfo.addRoute("SEA"); sfo.addRoute("DEN");
        RegionalNetwork west = new RegionalNetwork("West Region");
        west.add(lax); west.add(sfo);

        Airport jfk = new Airport("JFK", 5);
        jfk.addRoute("LAX"); jfk.addRoute("LHR"); jfk.addRoute("CDG"); jfk.addRoute("NRT");
        Airport ord = new Airport("ORD", 3);
        ord.addRoute("LAX"); ord.addRoute("JFK");
        RegionalNetwork east = new RegionalNetwork("East Region");
        east.add(jfk); east.add(ord);

        AirportNetwork network = new AirportNetwork("Global Network");
        network.add(west); network.add(east);
        return new Object[]{ network, west, east, lax, jfk };
    }

    // ── End-to-end totals ─────────────────────────────────────
    @Nested class FullNetworkTotals {
        @Test void rootCapacity() {
            assertEquals(TOTAL_CAPACITY, ((AirportNetwork) buildNetwork()[0]).getCapacity());
        }

        @Test void rootRouteCount() {
            assertEquals(TOTAL_ROUTES, ((AirportNetwork) buildNetwork()[0]).getRouteCount());
        }

        @Test void regionCapacityIndependentOfSiblings() {
            assertEquals(4 + 3, ((RegionalNetwork) buildNetwork()[1]).getCapacity());
        }
    }

    // ── Mutations propagate up ────────────────────────────────
    @Nested class MutationsPropagateUp {
        @Test void addAirportIncreasesRootCapacity() {
            Object[] t = buildNetwork();
            AirportNetwork  net  = (AirportNetwork)  t[0];
            RegionalNetwork west = (RegionalNetwork) t[1];
            int before = net.getCapacity();
            west.add(new Airport("SEA", 2));
            assertEquals(before + 2, net.getCapacity());
        }

        @Test void removeAirportDecreasesRootCapacity() {
            Object[] t = buildNetwork();
            AirportNetwork  net  = (AirportNetwork)  t[0];
            RegionalNetwork west = (RegionalNetwork) t[1];
            Airport         lax  = (Airport)         t[3];
            int before = net.getCapacity();
            west.remove(lax);
            assertEquals(before - lax.getCapacity(), net.getCapacity());
        }

        @Test void removeRegionRemovesAllAirports() {
            Object[] t = buildNetwork();
            AirportNetwork  net  = (AirportNetwork)  t[0];
            RegionalNetwork west = (RegionalNetwork) t[1];
            int westCap    = west.getCapacity();
            int westRoutes = west.getRouteCount();
            int capBefore    = net.getCapacity();
            int routesBefore = net.getRouteCount();
            net.remove(west);
            assertEquals(capBefore    - westCap,    net.getCapacity());
            assertEquals(routesBefore - westRoutes, net.getRouteCount());
        }
    }

    // ── Adding a new region ────────────────────────────────────
    @Nested class AddingNewRegion {
        @Test void newRegionResolvesFromRoot() {
            Object[]        t       = buildNetwork();
            AirportNetwork  network = (AirportNetwork) t[0];
            int before = network.getCapacity();
            RegionalNetwork central = new RegionalNetwork("Central Region");
            central.add(new Airport("DFW", 4));
            central.add(new Airport("DEN", 3));
            network.add(central);
            assertEquals(before + 4 + 3, network.getCapacity());
        }
    }

    // ── print() output ────────────────────────────────────────
    @Nested class PrintOutput {
        List<String> lines;

        @BeforeEach void setup() {
            AirportNetwork network = (AirportNetwork) buildNetwork()[0];
            lines = capture(() -> network.print(0));
        }

        @Test void rootAppearsFirst() {
            assertTrue(lines.get(0).contains("Global Network"));
        }

        @Test void allRegionsPresent() {
            assertTrue(lines.stream().anyMatch(l -> l.contains("West Region")));
            assertTrue(lines.stream().anyMatch(l -> l.contains("East Region")));
        }

        @Test void allAirportsPresent() {
            for (String code : List.of("LAX", "SFO", "JFK", "ORD")) {
                assertTrue(lines.stream().anyMatch(l -> l.contains(code)), "expected " + code);
            }
        }

        @Test void airportsIndentedMoreThanRegion() {
            String westLine = lines.stream().filter(l -> l.contains("West Region")).findFirst().orElseThrow();
            String laxLine  = lines.stream().filter(l -> l.contains("LAX")).findFirst().orElseThrow();
            int westIndent = westLine.length() - westLine.stripLeading().length();
            int laxIndent  = laxLine.length()  - laxLine.stripLeading().length();
            assertTrue(laxIndent > westIndent);
        }
    }
}

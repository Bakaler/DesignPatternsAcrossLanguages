// ============================================================
//  Integration Tests — Composite: Airline Network
//
//  What we test here:
//    · Full three-level tree builds and resolves correctly end-to-end
//    · Root GetCapacity() equals the true sum of every airport
//    · Mutations to a leaf propagate up to the root in one call
//    · Removing a region removes all its airports from root totals
//    · Adding a new region doesn't break existing queries
//    · Print() renders the full tree with correct structure
//
//  Run: dotnet test
// ============================================================

using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Xunit;

public class CompositeIntegrationTests
{
    const int TotalCapacity = 4 + 3 + 5 + 3; // 15
    const int TotalRoutes   = 3 + 2 + 4 + 2; // 11

    static List<string> Capture(Action fn)
    {
        var sb  = new System.Text.StringBuilder();
        var old = Console.Out;
        Console.SetOut(new StringWriter(sb));
        try { fn(); } finally { Console.SetOut(old); }
        return sb.ToString().Split('\n', StringSplitOptions.RemoveEmptyEntries)
                            .Select(l => l.TrimEnd('\r')).ToList();
    }

    static (AirportNetwork network, RegionalNetwork west, RegionalNetwork east, Airport lax, Airport jfk) BuildNetwork()
    {
        var lax = new Airport("LAX", 4);
        lax.AddRoute("JFK"); lax.AddRoute("ORD"); lax.AddRoute("LHR");
        var sfo = new Airport("SFO", 3);
        sfo.AddRoute("SEA"); sfo.AddRoute("DEN");
        var west = new RegionalNetwork("West Region");
        west.Add(lax); west.Add(sfo);

        var jfk = new Airport("JFK", 5);
        jfk.AddRoute("LAX"); jfk.AddRoute("LHR"); jfk.AddRoute("CDG"); jfk.AddRoute("NRT");
        var ord = new Airport("ORD", 3);
        ord.AddRoute("LAX"); ord.AddRoute("JFK");
        var east = new RegionalNetwork("East Region");
        east.Add(jfk); east.Add(ord);

        var network = new AirportNetwork("Global Network");
        network.Add(west); network.Add(east);
        return (network, west, east, lax, jfk);
    }

    // ── End-to-end totals ─────────────────────────────────────
    [Fact] public void RootCapacityEqualsAllAirports()
    {
        var (network, _, _, _, _) = BuildNetwork();
        Assert.Equal(TotalCapacity, network.GetCapacity());
    }

    [Fact] public void RootRouteCountEqualsAllRoutes()
    {
        var (network, _, _, _, _) = BuildNetwork();
        Assert.Equal(TotalRoutes, network.GetRouteCount());
    }

    [Fact] public void RegionCapacityIndependentOfSiblings()
    {
        var (_, west, _, _, _) = BuildNetwork();
        Assert.Equal(4 + 3, west.GetCapacity());
    }

    // ── Mutations propagate up ────────────────────────────────
    [Fact] public void AddAirportIncreasesRootCapacity()
    {
        var (network, west, _, _, _) = BuildNetwork();
        int before = network.GetCapacity();
        west.Add(new Airport("SEA", 2));
        Assert.Equal(before + 2, network.GetCapacity());
    }

    [Fact] public void RemoveAirportDecreasesRootCapacity()
    {
        var (network, west, _, lax, _) = BuildNetwork();
        int before = network.GetCapacity();
        west.Remove(lax);
        Assert.Equal(before - lax.GetCapacity(), network.GetCapacity());
    }

    [Fact] public void RemoveRegionRemovesAllItsAirports()
    {
        var (network, west, _, _, _) = BuildNetwork();
        int westCap      = west.GetCapacity();
        int westRoutes   = west.GetRouteCount();
        int capBefore    = network.GetCapacity();
        int routesBefore = network.GetRouteCount();
        network.Remove(west);
        Assert.Equal(capBefore    - westCap,    network.GetCapacity());
        Assert.Equal(routesBefore - westRoutes, network.GetRouteCount());
    }

    // ── Adding a new region ────────────────────────────────────
    [Fact] public void NewRegionResolvesFromRoot()
    {
        var (network, _, _, _, _) = BuildNetwork();
        int before  = network.GetCapacity();
        var central = new RegionalNetwork("Central Region");
        central.Add(new Airport("DFW", 4));
        central.Add(new Airport("DEN", 3));
        network.Add(central);
        Assert.Equal(before + 4 + 3, network.GetCapacity());
    }

    // ── Print() output ────────────────────────────────────────
    [Fact] public void PrintRootAppearsFirst()
    {
        var (network, _, _, _, _) = BuildNetwork();
        var lines = Capture(() => network.Print());
        Assert.Contains("Global Network", lines[0]);
    }

    [Fact] public void PrintAllRegionsPresent()
    {
        var (network, _, _, _, _) = BuildNetwork();
        var lines = Capture(() => network.Print());
        Assert.Contains(lines, l => l.Contains("West Region"));
        Assert.Contains(lines, l => l.Contains("East Region"));
    }

    [Fact] public void PrintAllAirportsPresent()
    {
        var (network, _, _, _, _) = BuildNetwork();
        var lines = Capture(() => network.Print());
        foreach (var code in new[] { "LAX", "SFO", "JFK", "ORD" })
            Assert.Contains(lines, l => l.Contains(code));
    }

    [Fact] public void PrintAirportsIndentedMoreThanRegion()
    {
        var (network, _, _, _, _) = BuildNetwork();
        var lines    = Capture(() => network.Print());
        var westLine = lines.First(l => l.Contains("West Region"));
        var laxLine  = lines.First(l => l.Contains("LAX"));
        int westIndent = westLine.Length - westLine.TrimStart().Length;
        int laxIndent  = laxLine.Length  - laxLine.TrimStart().Length;
        Assert.True(laxIndent > westIndent);
    }
}

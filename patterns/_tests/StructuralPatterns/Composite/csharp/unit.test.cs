// ============================================================
//  Unit Tests — Composite: Airline Network
//
//  What we test here:
//    · Airport returns its own capacity and route count
//    · RegionalNetwork.GetCapacity() sums its airports
//    · AirportNetwork.GetCapacity() recurses through regions
//    · GetRouteCount() propagates the same way as GetCapacity()
//    · Client calls GetCapacity() identically on leaf and composite
//    · Remove() detaches a node and updates totals accordingly
//
//  Run: dotnet test
// ============================================================

using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Xunit;

[assembly: CollectionBehavior(DisableTestParallelization = true)]

public class CompositeUnitTests
{
    static List<string> Capture(Action fn)
    {
        var sb  = new System.Text.StringBuilder();
        var old = Console.Out;
        Console.SetOut(new StringWriter(sb));
        try { fn(); } finally { Console.SetOut(old); }
        return sb.ToString().Split('\n', StringSplitOptions.RemoveEmptyEntries)
                            .Select(l => l.TrimEnd('\r')).ToList();
    }

    // ── Airport (Leaf) ────────────────────────────────────────
    public class AirportTests
    {
        readonly Airport _ap = new Airport("LAX", 4);

        [Fact] public void GetName()              => Assert.Equal("LAX", _ap.GetName());
        [Fact] public void GetCapacity()          => Assert.Equal(4, _ap.GetCapacity());
        [Fact] public void GetRouteCountZero()    => Assert.Equal(0, _ap.GetRouteCount());

        [Fact] public void GetRouteCountIncrements()
        {
            var a = new Airport("SFO", 3);
            a.AddRoute("JFK"); a.AddRoute("ORD");
            Assert.Equal(2, a.GetRouteCount());
        }

        [Fact] public void PrintIncludesName()
        {
            var lines = Capture(() => _ap.Print());
            Assert.Contains(lines, l => l.Contains("LAX"));
        }

        [Fact] public void PrintIncludesCapacity()
        {
            var lines = Capture(() => _ap.Print());
            Assert.Contains(lines, l => l.Contains("4"));
        }
    }

    // ── RegionalNetwork (Composite) ───────────────────────────
    public class RegionalNetworkTests
    {
        [Fact] public void GetName() => Assert.Equal("West Region", new RegionalNetwork("West Region").GetName());

        [Fact] public void GetCapacitySumsAirports()
        {
            var r = new RegionalNetwork("West");
            r.Add(new Airport("LAX", 4));
            r.Add(new Airport("SFO", 3));
            Assert.Equal(7, r.GetCapacity());
        }

        [Fact] public void GetRouteCountSumsAirports()
        {
            var r   = new RegionalNetwork("West");
            var lax = new Airport("LAX", 4);
            var sfo = new Airport("SFO", 3);
            lax.AddRoute("JFK"); lax.AddRoute("ORD");
            sfo.AddRoute("SEA");
            r.Add(lax); r.Add(sfo);
            Assert.Equal(3, r.GetRouteCount());
        }

        [Fact] public void RemoveReducesCapacity()
        {
            var r   = new RegionalNetwork("West");
            var lax = new Airport("LAX", 4);
            var sfo = new Airport("SFO", 3);
            r.Add(lax); r.Add(sfo);
            r.Remove(lax);
            Assert.Equal(3, r.GetCapacity());
        }

        [Fact] public void EmptyRegion()
        {
            var r = new RegionalNetwork("Empty");
            Assert.Equal(0, r.GetCapacity());
            Assert.Equal(0, r.GetRouteCount());
        }

        [Fact] public void PrintIncludesNameAndAirports()
        {
            var r = new RegionalNetwork("West");
            r.Add(new Airport("LAX", 4));
            var lines = Capture(() => r.Print());
            Assert.Contains(lines, l => l.Contains("West"));
            Assert.Contains(lines, l => l.Contains("LAX"));
        }
    }

    // ── AirportNetwork (Root Composite) ──────────────────────
    public class AirportNetworkTests
    {
        [Fact] public void GetCapacityRecurses()
        {
            var west = new RegionalNetwork("West");
            west.Add(new Airport("LAX", 4)); west.Add(new Airport("SFO", 3));
            var east = new RegionalNetwork("East");
            east.Add(new Airport("JFK", 5));
            var net = new AirportNetwork("Global");
            net.Add(west); net.Add(east);
            Assert.Equal(12, net.GetCapacity());
        }

        [Fact] public void GetRouteCountRecurses()
        {
            var west = new RegionalNetwork("West");
            var lax  = new Airport("LAX", 4);
            lax.AddRoute("JFK"); lax.AddRoute("LHR");
            west.Add(lax);
            var east = new RegionalNetwork("East");
            var jfk  = new Airport("JFK", 5);
            jfk.AddRoute("LAX");
            east.Add(jfk);
            var net = new AirportNetwork("Global");
            net.Add(west); net.Add(east);
            Assert.Equal(3, net.GetRouteCount());
        }

        [Fact] public void RemoveRegionUpdatesTotals()
        {
            var west = new RegionalNetwork("West");
            west.Add(new Airport("LAX", 4));
            var east = new RegionalNetwork("East");
            east.Add(new Airport("JFK", 5));
            var net = new AirportNetwork("Global");
            net.Add(west); net.Add(east);
            net.Remove(west);
            Assert.Equal(5, net.GetCapacity());
        }
    }

    // ── Uniformity ────────────────────────────────────────────
    public class UniformityTests
    {
        [Fact] public void SameCallOnLeafAndComposite()
        {
            IAirNetworkComponent leaf      = new Airport("LAX", 4);
            var                  composite = new RegionalNetwork("West");
            composite.Add(new Airport("LAX", 4));
            Assert.Equal(leaf.GetCapacity(), composite.GetCapacity());
        }

        [Fact] public void ThreeLevelTreeFromRoot()
        {
            var region = new RegionalNetwork("West");
            region.Add(new Airport("LAX", 4));
            region.Add(new Airport("SFO", 3));
            var network = new AirportNetwork("Global");
            network.Add(region);
            Assert.Equal(7, network.GetCapacity());
        }
    }
}

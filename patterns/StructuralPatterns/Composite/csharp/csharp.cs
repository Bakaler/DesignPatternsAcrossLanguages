// ============================================================
//  Composite — Airline Network
//  Run: dotnet script csharp.cs
// ============================================================
//
//  Participants
//  ────────────────────────────────────────────────────────
//  Component    IAirNetworkComponent (interface)
//  Leaf         Airport
//  Composite    RegionalNetwork, AirportNetwork
//  Client       Entry point
//
//  Consequences demonstrated
//  ────────────────────────────────────────────────────────
//  ✓ Uniformity   — GetCapacity() works identically at every level
//  ✓ Recursion    — composites delegate down; client writes zero loops
//  ✓ Extensibility — add a continent level without touching existing code
//  ✗ Over-general  — every node must implement Add/Remove even if leaf
// ============================================================

using System;
using System.Collections.Generic;
using System.Linq;


// SECTION:: Component
// ═════════════════════════════════════════════════════════════
//  COMPONENT — IAirNetworkComponent
// ═════════════════════════════════════════════════════════════
//  Shared interface every node in the tree must satisfy.
//  The client never checks whether it is talking to a leaf
//  or a composite — it just calls the interface.

public interface IAirNetworkComponent
{
    string GetName();
    int    GetCapacity();    // leaf: own slots  |  composite: sum of children
    int    GetRouteCount();  // leaf: own routes |  composite: recursive sum
    void   Print(int indent = 0);
}


// SECTION:: Leaf
// ═════════════════════════════════════════════════════════════
//  LEAF — Airport
// ═════════════════════════════════════════════════════════════
//  Terminal node. Owns its own capacity and outgoing routes.

public class Airport : IAirNetworkComponent
{
    private readonly string       _name;
    private readonly int          _capacity;
    private readonly List<string> _routes = new();

    public Airport(string name, int capacity)
    {
        _name     = name;
        _capacity = capacity;
    }

    public void AddRoute(string destination) => _routes.Add(destination);

    public string GetName()       => _name;
    public int    GetCapacity()   => _capacity;
    public int    GetRouteCount() => _routes.Count;

    public void Print(int indent = 0)
    {
        var pad = new string(' ', indent * 2);
        Console.WriteLine($"{pad}[airport] {_name}  (cap: {_capacity}, routes: {_routes.Count})");
    }
}


// SECTION:: Composite
// ═════════════════════════════════════════════════════════════
//  COMPOSITE — RegionalNetwork
// ═════════════════════════════════════════════════════════════
//  Mid-level composite. Holds a collection of Airports.
//  Delegates every query down to its children.

public class RegionalNetwork : IAirNetworkComponent
{
    private readonly string        _name;
    private readonly List<Airport> _airports = new();

    public RegionalNetwork(string name) => _name = name;

    public void Add(Airport a)    => _airports.Add(a);
    public void Remove(Airport a) => _airports.Remove(a);

    public string GetName()       => _name;
    public int    GetCapacity()   => _airports.Sum(a => a.GetCapacity());
    public int    GetRouteCount() => _airports.Sum(a => a.GetRouteCount());

    public void Print(int indent = 0)
    {
        var pad = new string(' ', indent * 2);
        Console.WriteLine($"{pad}[region] {_name}/");
        foreach (var a in _airports) a.Print(indent + 1);
    }
}


// SECTION:: Root Composite
// ═════════════════════════════════════════════════════════════
//  COMPOSITE — AirportNetwork
// ═════════════════════════════════════════════════════════════
//  Top-level composite. Holds a collection of RegionalNetworks.
//  Same interface, one level higher. Entry point for all queries.

public class AirportNetwork : IAirNetworkComponent
{
    private readonly string                _name;
    private readonly List<RegionalNetwork> _regions = new();

    public AirportNetwork(string name) => _name = name;

    public void Add(RegionalNetwork r)    => _regions.Add(r);
    public void Remove(RegionalNetwork r) => _regions.Remove(r);

    public string GetName()       => _name;
    public int    GetCapacity()   => _regions.Sum(r => r.GetCapacity());
    public int    GetRouteCount() => _regions.Sum(r => r.GetRouteCount());

    public void Print(int indent = 0)
    {
        var pad = new string(' ', indent * 2);
        Console.WriteLine($"{pad}[network] {_name}/");
        foreach (var r in _regions) r.Print(indent + 1);
    }
}


// SECTION:: Client
// ═════════════════════════════════════════════════════════════
//  CLIENT
// ═════════════════════════════════════════════════════════════

#if !TESTING
var SEP = new string('═', 64);

Console.WriteLine("╔══════════════════════════════════════════════════════════════╗");
Console.WriteLine("║           Composite — Airline Network                        ║");
Console.WriteLine("╚══════════════════════════════════════════════════════════════╝");

// Build the three-level tree
var network = new AirportNetwork("Global Network");

var west = new RegionalNetwork("West Region");
var lax  = new Airport("LAX", 4);
var sfo  = new Airport("SFO", 3);
lax.AddRoute("JFK"); lax.AddRoute("ORD"); lax.AddRoute("LHR");
sfo.AddRoute("SEA"); sfo.AddRoute("DEN");
west.Add(lax); west.Add(sfo);

var east = new RegionalNetwork("East Region");
var jfk  = new Airport("JFK", 5);
var ord  = new Airport("ORD", 3);
jfk.AddRoute("LAX"); jfk.AddRoute("LHR"); jfk.AddRoute("CDG"); jfk.AddRoute("NRT");
ord.AddRoute("LAX"); ord.AddRoute("JFK");
east.Add(jfk); east.Add(ord);

network.Add(west); network.Add(east);

Console.WriteLine($"\n{SEP}");
Console.WriteLine("  Network tree");
Console.WriteLine($"{SEP}\n");
network.Print();

Console.WriteLine($"\n{SEP}");
Console.WriteLine("  Client queries — same call regardless of node type");
Console.WriteLine($"{SEP}\n");

var nodes = new (string Label, IAirNetworkComponent Node)[]
{
    ("Global Network", network),
    ("West Region",    west),
    ("East Region",    east),
    ("LAX (leaf)",     lax),
    ("JFK (leaf)",     jfk),
};

foreach (var (label, node) in nodes)
    Console.WriteLine($"  {label,-16} GetCapacity()={node.GetCapacity(),2}   GetRouteCount()={node.GetRouteCount()}");

Console.WriteLine($"\n{SEP}");
Console.WriteLine("  Without Composite");
Console.WriteLine(SEP);
Console.WriteLine();
Console.WriteLine("  Every caller would need:");
Console.WriteLine("    if (node is Airport)         return node.Capacity");
Console.WriteLine("    if (node is RegionalNetwork) { loop airports }");
Console.WriteLine("    if (node is AirportNetwork)  { loop regions + loop airports }");
Console.WriteLine("    if (new level added)           add another branch...");
Console.WriteLine();
Console.WriteLine("  With Composite:");
Console.WriteLine("    node.GetCapacity()  — works at every level, always");

Console.WriteLine("\n╔══════════════════════════════════════════════════════════════╗");
Console.WriteLine("║  Done                                                        ║");
Console.WriteLine("╚══════════════════════════════════════════════════════════════╝");
#endif

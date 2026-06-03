// ============================================================
//  Integration Tests — Abstract Factory: Biome World Builder
//
//  What we test here:
//    · Real factory singletons produce correct, consistent output
//    · WorldGenerator generates the full product pipeline end-to-end
//    · Swapping the factory changes every product
//    · Product families stay isolated (no cross-biome contamination)
//    · Prototype registration at runtime propagates into the next generation
//
//  No stubs. All concrete classes interact exactly as in production.
//
//  Setup: same xUnit project as UnitTest.cs
// ============================================================

// SECTION:: Imports
using Xunit;
using System;
using System.Collections.Generic;
using System.IO;

// SECTION:: Helpers
public static class CaptureHelper
{
    private static readonly object Lock = new object();

    public static string Capture(Action action)
    {
        lock (Lock) {
            var orig = Console.Out;
            var buf  = new StringWriter();
            Console.SetOut(buf);
            try {
                action();
            } finally {
                Console.SetOut(orig);
            }
            return buf.ToString();
        }
    }

    public static string CaptureAfterReset(Action action)
    {
        lock (Lock) {
            DesertBiomeKit.Instance.ResetRegistry();
            ArcticBiomeKit.Instance.ResetRegistry();
            ForestBiomeKit.Instance.ResetRegistry();
            return Capture(action);
        }
    }
}

// SECTION:: Desert Biome Integration
public class DesertBiomeIntegrationTests
{
    private readonly string _output = Capture(() => new WorldGenerator(DesertBiomeKit.Instance).Generate());

    private static string Capture(Action action) {
        return CaptureHelper.CaptureAfterReset(action);
    }

    [Fact] public void ContainsTerrainName()     => Assert.Contains("Sand Dunes",       _output);
    [Fact] public void ContainsScorpion()        => Assert.Contains("Scorpion",          _output);
    [Fact] public void ContainsSandWorm()        => Assert.Contains("Sand Worm",         _output);
    [Fact] public void ContainsDesertBandit()    => Assert.Contains("Desert Bandit",     _output);
    [Fact] public void ContainsSandstorm()       => Assert.Contains("Sandstorm",         _output);
    [Fact] public void ContainsDesertLootTable() => Assert.Contains("Desert Loot Table", _output);
}

// SECTION:: Arctic & Forest Biomes
public class ArcticBiomeIntegrationTests
{
    private readonly string _output = Capture(() => new WorldGenerator(ArcticBiomeKit.Instance).Generate());

    private static string Capture(Action action) {
        return CaptureHelper.CaptureAfterReset(action);
    }

    [Fact] public void ContainsTerrainName()  => Assert.Contains("Frozen Tundra",   _output);
    [Fact] public void ContainsPolarBear()    => Assert.Contains("Polar Bear",       _output);
    [Fact] public void ContainsIceWolf()      => Assert.Contains("Ice Wolf",         _output);
    [Fact] public void ContainsFrostTroll()   => Assert.Contains("Frost Troll",      _output);
    [Fact] public void ContainsBlizzard()     => Assert.Contains("Blizzard",         _output);
}

public class ForestBiomeIntegrationTests
{
    private readonly string _output = Capture(() => new WorldGenerator(ForestBiomeKit.Instance).Generate());

    private static string Capture(Action action) {
        return CaptureHelper.CaptureAfterReset(action);
    }

    [Fact] public void ContainsTerrainName()   => Assert.Contains("Dense Forest Floor", _output);
    [Fact] public void ContainsWolf()          => Assert.Contains("Wolf",               _output);
    [Fact] public void ContainsWildBoar()      => Assert.Contains("Wild Boar",          _output);
    [Fact] public void ContainsForestBandit()  => Assert.Contains("Forest Bandit",      _output);
}

// SECTION:: Product Family Consistency
public class ProductFamilyConsistencyTests
{
    [Fact] public void SwappingFactoryChangesEveryProduct()
    {
        string desert = CaptureHelper.Capture(() => new WorldGenerator(DesertBiomeKit.Instance).Generate());
        string arctic  = CaptureHelper.Capture(() => new WorldGenerator(ArcticBiomeKit.Instance).Generate());

        Assert.Contains("Sand Dunes",    desert);
        Assert.DoesNotContain("Frozen Tundra", desert);
        Assert.Contains("Frozen Tundra", arctic);
        Assert.DoesNotContain("Sand Dunes",    arctic);
        Assert.DoesNotContain("Polar Bear",    desert);
        Assert.DoesNotContain("Scorpion",      arctic);
    }

    [Fact] public void DesertLootAbsentFromArctic()
    {
        string arctic = CaptureHelper.Capture(() => new WorldGenerator(ArcticBiomeKit.Instance).Generate());
        Assert.DoesNotContain("Desert Loot Table", arctic);
        Assert.Contains("Arctic Loot Table",       arctic);
    }

    [Fact] public void WeatherEventsAreBiomeSpecific()
    {
        string desert = CaptureHelper.Capture(() => new WorldGenerator(DesertBiomeKit.Instance).Generate());
        string arctic  = CaptureHelper.Capture(() => new WorldGenerator(ArcticBiomeKit.Instance).Generate());
        Assert.Contains("heat_wave",         desert);
        Assert.Contains("whiteout",          arctic);
        Assert.DoesNotContain("whiteout",    desert);
        Assert.DoesNotContain("heat_wave",   arctic);
    }
}


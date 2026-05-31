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
    public static string Capture(Action action)
    {
        var orig = Console.Out;
        var buf  = new StringWriter();
        Console.SetOut(buf);
        action();
        Console.SetOut(orig);
        return buf.ToString();
    }
}

// SECTION:: Desert Biome Integration
public class DesertBiomeIntegrationTests
{
    private readonly string _output =
        CaptureHelper.Capture(() => new WorldGenerator(DesertBiomeKit.Instance).Generate());

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
    private readonly string _output =
        CaptureHelper.Capture(() => new WorldGenerator(ArcticBiomeKit.Instance).Generate());

    [Fact] public void ContainsTerrainName()  => Assert.Contains("Frozen Tundra",   _output);
    [Fact] public void ContainsPolarBear()    => Assert.Contains("Polar Bear",       _output);
    [Fact] public void ContainsIceWolf()      => Assert.Contains("Ice Wolf",         _output);
    [Fact] public void ContainsFrostTroll()   => Assert.Contains("Frost Troll",      _output);
    [Fact] public void ContainsBlizzard()     => Assert.Contains("Blizzard",         _output);
}

public class ForestBiomeIntegrationTests
{
    private readonly string _output =
        CaptureHelper.Capture(() => new WorldGenerator(ForestBiomeKit.Instance).Generate());

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

// SECTION:: Prototype Registration
public class PrototypeRegistrationTests
{
    private sealed class InlineEnemy : IEnemy
    {
        public string Name   { get; init; } = "";
        public int    Health { get; init; }
        public int    Damage { get; init; }
        public string Attack { get; init; } = "";
        public string Drop   { get; init; } = "";
        public IEnemy Clone() => this;
    }

    [Fact] public void RegisteredEnemyAppearsInNextGeneration()
    {
        var kit    = DesertBiomeKit.Instance;
        string before = CaptureHelper.Capture(() => new WorldGenerator(kit).Generate());

        kit.RegisterEnemy(new InlineEnemy {
            Name = "Giant Scorpion (Boss)", Health = 400, Damage = 60,
            Attack = "Tail sweep", Drop = "Ancient Venom Sac"
        });

        string after = CaptureHelper.Capture(() => new WorldGenerator(kit).Generate());
        Assert.DoesNotContain("Giant Scorpion", before);
        Assert.Contains("Giant Scorpion",       after);
    }

    [Fact] public void RegistrationIsolatedToDesertKit()
    {
        string arctic = CaptureHelper.Capture(() => new WorldGenerator(ArcticBiomeKit.Instance).Generate());
        Assert.DoesNotContain("Giant Scorpion", arctic);
    }

    [Fact] public void RegisteredEnemyIsClonedOnEachGeneration()
    {
        bool cloneCalled = false;
        ForestBiomeKit.Instance.RegisterEnemy(new TrackingEnemy(() => cloneCalled = true));
        CaptureHelper.Capture(() => new WorldGenerator(ForestBiomeKit.Instance).Generate());
        Assert.True(cloneCalled);
    }

    private sealed class TrackingEnemy : IEnemy
    {
        private readonly Action _onClone;
        public TrackingEnemy(Action onClone) { _onClone = onClone; }
        public string Name   => "Tracker";
        public int    Health => 1;
        public int    Damage => 1;
        public string Attack => "Track";
        public string Drop   => "Data";
        public IEnemy Clone() { _onClone(); return this; }
    }
}

// ============================================================
//  Unit Tests — Abstract Factory: Biome World Builder
//
//  What we test here:
//    · Each concrete terrain satisfies the ITerrain contract
//    · IEnemy.Clone() produces an independent, equal-valued copy
//    · Each factory method returns the correct product type
//    · WorldGenerator calls every factory method exactly once
//    · Swapping a factory completely changes the output
//
//  Setup:
//    dotnet new xunit -n AbstractFactoryTests
//    # Copy csharp.cs into the project (remove top-level statements or wrap in a class)
//    dotnet test
// ============================================================

// SECTION:: Imports
using Xunit;
using System;
using System.Collections.Generic;
using System.IO;

// ── Source types are compiled into the same project ──────────────────────────
// Include csharp.cs in the project; its interfaces and classes are referenced directly.

// SECTION:: Terrain Products
public class TerrainProductTests
{
    [Fact] public void SandTerrain_Name()
        => Assert.Equal("Sand Dunes", new SandTerrain().Name);

    [Fact] public void SandTerrain_PenaltyMentionsSpeed()
        => Assert.Contains("-20%", new SandTerrain().MovementPenalty);

    [Fact] public void SandTerrain_DescriptionNonEmpty()
        => Assert.NotEmpty(new SandTerrain().Description);

    [Fact] public void IceTerrain_Name()
        => Assert.Equal("Frozen Tundra", new IceTerrain().Name);

    [Fact] public void IceTerrain_PenaltyMentionsSpeed()
        => Assert.Contains("-15%", new IceTerrain().MovementPenalty);

    [Fact] public void MudTerrain_Name()
        => Assert.Equal("Dense Forest Floor", new MudTerrain().Name);

    [Fact] public void MudTerrain_PenaltyMentionsSpeed()
        => Assert.Contains("-10%", new MudTerrain().MovementPenalty);
}

// SECTION:: Enemy Prototype Cloning
public class EnemyCloningTests
{
    [Fact] public void Scorpion_Clone_IsDistinctObject()
    {
        var original = new Scorpion(50, 15);
        var cloned   = original.Clone();
        Assert.NotSame(original, cloned);
    }

    [Fact] public void Scorpion_Clone_HasSameStats()
    {
        var original = new Scorpion(50, 15);
        var cloned   = original.Clone();
        Assert.Equal(original.Health, cloned.Health);
        Assert.Equal(original.Damage, cloned.Damage);
        Assert.Equal("Scorpion", cloned.Name);
    }

    [Fact] public void PolarBear_Clone_PreservesStats()
    {
        var original = new PolarBear(180, 35);
        var cloned   = original.Clone();
        Assert.NotSame(original, cloned);
        Assert.Equal(180, cloned.Health);
        Assert.Equal(35,  cloned.Damage);
    }

    [Fact] public void Wolf_Clone_IsDistinctObject()
    {
        var original = new Wolf(90, 18);
        var cloned   = original.Clone();
        Assert.NotSame(original, cloned);
        Assert.Equal(original.Health, cloned.Health);
    }
}

// SECTION:: Factory Method Isolation
public class DesertBiomeKitTests
{
    private readonly DesertBiomeKit _kit = DesertBiomeKit.Instance;

    [Fact] public void CreateTerrain_ReturnsSandDunes()
        => Assert.Equal("Sand Dunes", _kit.CreateTerrain().Name);

    [Fact] public void CreateEnemies_ReturnsClones_NotSameReferences()
    {
        var a = _kit.CreateEnemies();
        var b = _kit.CreateEnemies();
        Assert.NotSame(a[0], b[0]);
        Assert.Equal(a[0].Name, b[0].Name);
    }

    [Fact] public void CreateWeather_BaseIsSandstorm()
        => Assert.Equal("Sandstorm", _kit.CreateWeather().A.Name);

    [Fact] public void CreateWeather_HasHeatWaveEvent()
        => Assert.True(_kit.CreateWeather().B.ContainsKey("heat_wave"));

    [Fact] public void CreateLoot_RollsAtLeastOneItem()
        => Assert.NotEmpty(_kit.CreateLoot().Roll());

    [Fact] public void RegisterEnemy_ExpandsPool()
    {
        int before = _kit.CreateEnemies().Count;
        _kit.RegisterEnemy(new Wolf(90, 18));
        Assert.Equal(before + 1, _kit.CreateEnemies().Count);
    }
}

public class ArcticBiomeKitTests
{
    [Fact] public void CreateTerrain_ReturnsFrozenTundra()
        => Assert.Equal("Frozen Tundra", ArcticBiomeKit.Instance.CreateTerrain().Name);

    [Fact] public void CreateWeather_BaseIsBlizzard()
        => Assert.Equal("Blizzard", ArcticBiomeKit.Instance.CreateWeather().A.Name);
}

// SECTION:: WorldGenerator Decoupling
public class WorldGeneratorTests
{
    private sealed class SpyKit : IBiomeKit
    {
        public int TerrainCalls, EnemiesCalls, WeatherCalls, LootCalls;
        public string KitName => "SpyKit";
        public ITerrain  CreateTerrain()  { TerrainCalls++; return new SandTerrain(); }
        public List<IEnemy> CreateEnemies() { EnemiesCalls++; return new(); }
        public WeatherSystem CreateWeather() {
            WeatherCalls++;
            return new WeatherSystem(new FakeWeather(), new Dictionary<string, IWeatherEvent>());
        }
        public ILootTable CreateLoot()    { LootCalls++; return new FakeLoot(); }
        public void RegisterEnemy(IEnemy e) {}

        private class FakeWeather : IWeather {
            public string Name => "Clear"; public string Effect => "None";
        }
        private class FakeLoot : ILootTable {
            public string Name => "Mock"; public List<string> Roll() => new();
        }
    }

    [Fact] public void CallsEveryFactoryMethodExactlyOnce()
    {
        var spy = new SpyKit();
        _ = new WorldGenerator(spy);
        Assert.Equal(1, spy.TerrainCalls);
        Assert.Equal(1, spy.EnemiesCalls);
        Assert.Equal(1, spy.WeatherCalls);
        Assert.Equal(1, spy.LootCalls);
    }

    [Fact] public void SwappingFactoryChangesTerrain()
    {
        string desert = Capture(() => new WorldGenerator(DesertBiomeKit.Instance).Generate());
        string arctic  = Capture(() => new WorldGenerator(ArcticBiomeKit.Instance).Generate());

        Assert.Contains("Sand Dunes",    desert);
        Assert.Contains("Frozen Tundra", arctic);
        Assert.DoesNotContain("Frozen Tundra", desert);
        Assert.DoesNotContain("Sand Dunes",    arctic);
    }

    private static string Capture(Action action)
    {
        var orig = Console.Out;
        var buf  = new StringWriter();
        Console.SetOut(buf);
        action();
        Console.SetOut(orig);
        return buf.ToString();
    }
}

// ============================================================
//  Unit Tests — Observer: Weather Station (C#)
//
//  What we test here:
//    · Observer registration/removal mechanics
//    · Notification broadcast to all registered observers
//    · Pull model — observers get current readings
//    · Reading history maintained correctly
//    · Observer independence — removal doesn't affect others
//
//  Run: dotnet test
// ============================================================

using System;
using System.Collections.Generic;
using Xunit;


class MockObserver : Observer
{
    public int UpdateCount { get; set; } = 0;
    public WeatherStation LastStation { get; set; }

    public void Update(WeatherStation station)
    {
        UpdateCount++;
        LastStation = station;
    }
}


public class UnitTest
{
    private WeatherStation _station;
    private MockObserver _observer1;
    private MockObserver _observer2;

    public UnitTest()
    {
        _station = new WeatherStation();
        _observer1 = new MockObserver();
        _observer2 = new MockObserver();
    }

    // ── Observer Registration Tests
    [Fact]
    public void TestRegistersASingleObserver()
    {
        _station.RegisterObserver(_observer1);
        Assert.Equal(0, _observer1.UpdateCount); // No update yet
    }

    [Fact]
    public void TestPreventsDuplicateRegistration()
    {
        _station.RegisterObserver(_observer1);
        _station.RegisterObserver(_observer1); // Try again
        _station.SetWeatherData(20, 60, 1010, 10);
        Assert.Equal(1, _observer1.UpdateCount); // Called only once
    }

    [Fact]
    public void TestRemovesAnObserverFromTheList()
    {
        _station.RegisterObserver(_observer1);
        _station.RegisterObserver(_observer2);
        _station.RemoveObserver(_observer1);
        _station.SetWeatherData(20, 60, 1010, 10);
        Assert.Equal(0, _observer1.UpdateCount); // Not notified
        Assert.Equal(1, _observer2.UpdateCount); // Still notified
    }

    // ── Notification Broadcast Tests
    [Fact]
    public void TestNotifiesAllRegisteredObservers()
    {
        var obs3 = new MockObserver();
        _station.RegisterObserver(_observer1);
        _station.RegisterObserver(_observer2);
        _station.RegisterObserver(obs3);

        _station.SetWeatherData(25, 70, 1015, 15);

        Assert.Equal(1, _observer1.UpdateCount);
        Assert.Equal(1, _observer2.UpdateCount);
        Assert.Equal(1, obs3.UpdateCount);
    }

    [Fact]
    public void TestNotifiesRepeatedlyOnMultipleUpdates()
    {
        _station.RegisterObserver(_observer1);

        _station.SetWeatherData(20, 60, 1010, 10);
        Assert.Equal(1, _observer1.UpdateCount);

        _station.SetWeatherData(25, 70, 1015, 15);
        Assert.Equal(2, _observer1.UpdateCount);

        _station.SetWeatherData(30, 80, 1020, 20);
        Assert.Equal(3, _observer1.UpdateCount);
    }

    [Fact]
    public void TestPassesTheStationItselfToUpdate()
    {
        _station.RegisterObserver(_observer1);
        _station.SetWeatherData(25, 70, 1015, 15);

        Assert.Same(_observer1.LastStation, _station);
    }

    // ── Pull Model Tests
    [Fact]
    public void TestGetCurrentReadingReturnsLatestData()
    {
        _station.RegisterObserver(_observer1);
        _station.SetWeatherData(25, 70, 1015, 15);

        var reading = _observer1.LastStation.GetCurrentReading();
        Assert.Equal(25, reading.Temperature);
        Assert.Equal(70, reading.Humidity);
        Assert.Equal(1015, reading.Pressure);
        Assert.Equal(15, reading.WindSpeed);
    }

    [Fact]
    public void TestGetReadingsReturnsFullHistory()
    {
        _station.RegisterObserver(_observer1);

        _station.SetWeatherData(20, 60, 1010, 10);
        _station.SetWeatherData(25, 70, 1015, 15);
        _station.SetWeatherData(30, 80, 1020, 20);

        var readings = _observer1.LastStation.GetReadings();
        Assert.Equal(4, readings.Count); // initial + 3 updates
        Assert.Equal(22, readings[0].Temperature);
        Assert.Equal(30, readings[3].Temperature);
    }

    [Fact]
    public void TestMaintainsLast10ReadingsMax()
    {
        _station.RegisterObserver(_observer1);

        for (int i = 0; i < 12; i++)
        {
            _station.SetWeatherData(20 + i, 60, 1010, 10);
        }

        var readings = _observer1.LastStation.GetReadings();
        Assert.Equal(10, readings.Count);
    }

    // ── Concrete Observers Tests
    [Fact]
    public void TestTemperatureChartRegistersAndUpdates()
    {
        var chart = new TemperatureChart("Test Temp");
        _station.RegisterObserver(chart);
        _station.SetWeatherData(25, 70, 1015, 15); // Should not throw
    }

    [Fact]
    public void TestHumidityChartRegistersAndUpdates()
    {
        var chart = new HumidityChart("Test Humidity");
        _station.RegisterObserver(chart);
        _station.SetWeatherData(25, 70, 1015, 15); // Should not throw
    }

    [Fact]
    public void TestPressureWindChartRegistersAndUpdates()
    {
        var chart = new PressureWindChart("Test Pressure");
        _station.RegisterObserver(chart);
        _station.SetWeatherData(25, 70, 1015, 15); // Should not throw
    }

    [Fact]
    public void TestAllThreeCanRegisterTogether()
    {
        var temp = new TemperatureChart("Temp");
        var humid = new HumidityChart("Humidity");
        var pressure = new PressureWindChart("Pressure");

        _station.RegisterObserver(temp);
        _station.RegisterObserver(humid);
        _station.RegisterObserver(pressure);

        _station.SetWeatherData(25, 70, 1015, 15); // Should not throw
    }

    // ── Loose Coupling Tests
    [Fact]
    public void TestObserversAreIndependent()
    {
        var obs3 = new MockObserver();
        _station.RegisterObserver(_observer1);
        _station.RegisterObserver(_observer2);
        _station.RegisterObserver(obs3);

        _station.RemoveObserver(_observer2);
        _station.SetWeatherData(25, 70, 1015, 15);

        Assert.Equal(1, _observer1.UpdateCount);
        Assert.Equal(0, _observer2.UpdateCount); // Never notified
        Assert.Equal(1, obs3.UpdateCount);
    }

    [Fact]
    public void TestDynamicSubscription()
    {
        _station.SetWeatherData(20, 60, 1010, 10); // Before registration

        _station.RegisterObserver(_observer1);
        _station.SetWeatherData(25, 70, 1015, 15); // After registration

        Assert.Equal(1, _observer1.UpdateCount); // Only the second one

        _station.RemoveObserver(_observer1);
        _station.SetWeatherData(30, 80, 1020, 20); // After removal

        Assert.Equal(1, _observer1.UpdateCount); // Still only one
    }

    [Fact]
    public void TestStationDoesNotDependOnConcreteObserverTypes()
    {
        var custom = new CustomObserver();
        _station.RegisterObserver(custom);
        _station.SetWeatherData(25, 70, 1015, 15);

        Assert.True(custom.Called);
    }
}


public class CustomObserver : Observer
{
    public bool Called { get; set; } = false;

    public void Update(WeatherStation station)
    {
        Called = true;
    }
}

// ============================================================
//  Integration Tests — Observer: Weather Station (C#)
//
//  What we test here:
//    · Full workflow with multiple observers
//    · Correct behavior across subscription lifecycle
//    · Data consistency across all observers
//    · Real-world scenario with mixed operations
//
//  Run: dotnet test
// ============================================================

using System;
using System.Collections.Generic;
using Xunit;


class WeatherUpdate
{
    public double Temperature { get; set; }
    public double Humidity { get; set; }
    public double Pressure { get; set; }
    public double WindSpeed { get; set; }
}

class TrackingObserver : Observer
{
    public List<WeatherUpdate> Updates { get; } = new();

    public void Update(WeatherStation station)
    {
        var reading = station.GetCurrentReading();
        Updates.Add(new WeatherUpdate
        {
            Temperature = reading.Temperature,
            Humidity = reading.Humidity,
            Pressure = reading.Pressure,
            WindSpeed = reading.WindSpeed,
        });
    }
}


public class IntegrationTest
{
    private WeatherStation _station;
    private TemperatureChart _tempChart;
    private HumidityChart _humidityChart;
    private PressureWindChart _pressureChart;
    private TrackingObserver _tracker;

    public IntegrationTest()
    {
        _station = new WeatherStation();
        _tempChart = new TemperatureChart("Temp");
        _humidityChart = new HumidityChart("Humidity");
        _pressureChart = new PressureWindChart("Pressure");
        _tracker = new TrackingObserver();
    }

    [Fact]
    public void TestMultipleObserversTrackMultipleUpdates()
    {
        _station.RegisterObserver(_tempChart);
        _station.RegisterObserver(_humidityChart);
        _station.RegisterObserver(_pressureChart);
        _station.RegisterObserver(_tracker);

        _station.SetWeatherData(18, 45, 1015, 10);
        _station.SetWeatherData(22, 60, 1010, 8);
        _station.SetWeatherData(25, 70, 1015, 12);

        Assert.Equal(3, _tracker.Updates.Count);
        Assert.Equal(18, _tracker.Updates[0].Temperature);
        Assert.Equal(22, _tracker.Updates[1].Temperature);
        Assert.Equal(25, _tracker.Updates[2].Temperature);
    }

    [Fact]
    public void TestUnsubscribeMidStreamStopsUpdates()
    {
        _station.RegisterObserver(_tracker);

        _station.SetWeatherData(18, 45, 1015, 10);
        Assert.Equal(1, _tracker.Updates.Count);

        _station.RemoveObserver(_tracker);

        _station.SetWeatherData(22, 60, 1010, 8);
        Assert.Equal(1, _tracker.Updates.Count); // No new update

        _station.RegisterObserver(_tracker);

        _station.SetWeatherData(25, 70, 1015, 12);
        Assert.Equal(2, _tracker.Updates.Count); // Resumes after re-subscribe
    }

    [Fact]
    public void TestAllObserversSeesSameCurrentReading()
    {
        var tracker1 = new TrackingObserver();
        var tracker2 = new TrackingObserver();
        var tracker3 = new TrackingObserver();

        _station.RegisterObserver(tracker1);
        _station.RegisterObserver(tracker2);
        _station.RegisterObserver(tracker3);

        _station.SetWeatherData(25, 70, 1015, 15);

        var u1 = tracker1.Updates[0];
        var u2 = tracker2.Updates[0];
        var u3 = tracker3.Updates[0];

        Assert.Equal(u1.Temperature, u2.Temperature);
        Assert.Equal(u2.Temperature, u3.Temperature);
        Assert.Equal(u1.Humidity, u2.Humidity);
        Assert.Equal(u1.Pressure, u2.Pressure);
    }

    [Fact]
    public void TestReadingHistoryRemainConsistentAcrossObserverLifespan()
    {
        var tracker1 = new TrackingObserver();

        _station.RegisterObserver(tracker1);
        _station.SetWeatherData(18, 45, 1015, 10);
        _station.SetWeatherData(22, 60, 1010, 8);

        // Get history at first observation point
        var history1 = _station.GetReadings();

        _station.SetWeatherData(25, 70, 1015, 12);

        // Get history after another update
        var history2 = _station.GetReadings();

        Assert.True(history1.Count < history2.Count);
        Assert.Equal(history1[0].Temperature, history2[0].Temperature);
        Assert.Equal(history1[1].Temperature, history2[1].Temperature);
    }

    [Fact]
    public void TestWorksWithMixedObserverSubscribeUnsubscribeSequence()
    {
        var tracker1 = new TrackingObserver();
        var tracker2 = new TrackingObserver();
        var tracker3 = new TrackingObserver();

        // Day 1: Only tracker1
        _station.RegisterObserver(tracker1);
        _station.SetWeatherData(18, 45, 1015, 10);
        Assert.Equal(1, tracker1.Updates.Count);
        Assert.Equal(0, tracker2.Updates.Count);
        Assert.Equal(0, tracker3.Updates.Count);

        // Day 2: Add tracker2
        _station.RegisterObserver(tracker2);
        _station.SetWeatherData(22, 60, 1010, 8);
        Assert.Equal(2, tracker1.Updates.Count);
        Assert.Equal(1, tracker2.Updates.Count);
        Assert.Equal(0, tracker3.Updates.Count);

        // Day 3: Add tracker3, remove tracker1
        _station.RegisterObserver(tracker3);
        _station.RemoveObserver(tracker1);
        _station.SetWeatherData(25, 70, 1015, 12);
        Assert.Equal(2, tracker1.Updates.Count); // Stopped
        Assert.Equal(2, tracker2.Updates.Count);
        Assert.Equal(1, tracker3.Updates.Count);

        // Day 4: Re-add tracker1
        _station.RegisterObserver(tracker1);
        _station.SetWeatherData(28, 75, 1020, 14);
        Assert.Equal(3, tracker1.Updates.Count); // Resumed
        Assert.Equal(3, tracker2.Updates.Count);
        Assert.Equal(2, tracker3.Updates.Count);
    }

    [Fact]
    public void TestRespectsLast10ReadingsHistoryLimit()
    {
        var tracker = new TrackingObserver();
        _station.RegisterObserver(tracker);

        // Generate 15 readings
        for (int i = 0; i < 15; i++)
        {
            _station.SetWeatherData(10 + i, 50 + i, 1010 + i, 10);
        }

        // Should have exactly 10 readings in history
        var readings = _station.GetReadings();
        Assert.Equal(10, readings.Count);

        // Should be the last 10 updates
        Assert.Equal(15, readings[0].Temperature);
        Assert.Equal(24, readings[9].Temperature);
    }

    [Fact]
    public void TestSupportsArbitraryObserverImplementations()
    {
        var avgObserver = new TempAverageObserver();
        _station.RegisterObserver(avgObserver);

        _station.SetWeatherData(20, 60, 1010, 10);
        _station.SetWeatherData(24, 65, 1015, 12);
        _station.SetWeatherData(26, 70, 1020, 15);

        var avg = avgObserver.GetAverage();
        Assert.Equal((20 + 24 + 26) / 3.0, avg, 2);
    }

    [Fact]
    public void TestAllThreeConcreteObserversCoexistWithoutInterference()
    {
        var tracker = new TrackingObserver();

        _station.RegisterObserver(_tempChart);
        _station.RegisterObserver(_humidityChart);
        _station.RegisterObserver(_pressureChart);
        _station.RegisterObserver(tracker);

        // Perform updates
        _station.SetWeatherData(18, 45, 1015, 10);
        _station.SetWeatherData(25, 70, 1020, 15);

        // All should have been notified
        Assert.Equal(2, tracker.Updates.Count);

        // Reading history accessible to all
        var readings = _station.GetReadings();
        Assert.True(readings.Count > 2);
    }
}


public class TempAverageObserver : Observer
{
    private double _tempSum = 0;
    private int _count = 0;

    public void Update(WeatherStation station)
    {
        var current = station.GetCurrentReading();
        _tempSum += current.Temperature;
        _count++;
    }

    public double GetAverage()
    {
        return _count > 0 ? _tempSum / _count : 0;
    }
}

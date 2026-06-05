// ============================================================
//  Observer Pattern: Weather Station Live Dashboard
//  Run: dotnet run (or csc csharp.cs && csharp.exe)
// ============================================================
//
//  Participants
//  ────────────────────────────────────────────────────────
//  Subject (WeatherStation)  maintains list of observers,
//                            notifies them of state changes
//  Observer (interface)      defines Update() contract
//  ConcreteObservers         TemperatureChart, HumidityChart,
//                            PressureWindChart
//  ConcreteSubject           WeatherStation holds weather data
//
//  Problem
//  ────────────────────────────────────────────────────────
//  A weather station produces readings (temperature, humidity,
//  pressure, wind speed) that need to display on multiple
//  charts. When the station gets a new reading, all charts
//  must update automatically without tight coupling.
//
//  Solution: Observer Pattern
//  ────────────────────────────────────────────────────────
//  WeatherStation (Subject) maintains a list of Observer
//  objects. When new weather data arrives, WeatherStation
//  notifies all observers via Update(). Each observer pulls
//  the data it needs from the Subject.
//
//  Consequences demonstrated
//  ────────────────────────────────────────────────────────
//  Loose coupling       observers know only the Subject interface
//  Dynamic updates      add/remove observers at runtime
//  Broadcast updates    one notification reaches all observers
//  Automatic sync       observers sync without polling
// ============================================================

using System;
using System.Collections.Generic;
using System.Linq;


// SECTION:: WeatherData Type
public class WeatherData
{
    public double Temperature { get; }    // 10-35°C
    public double Humidity { get; }       // 0-100%
    public double Pressure { get; }       // 950-1050 hPa
    public double WindSpeed { get; }      // 0-50 km/h

    public WeatherData(double temperature, double humidity, double pressure, double windSpeed)
    {
        Temperature = Math.Round(temperature, 1);
        Humidity = Math.Round(humidity, 1);
        Pressure = Math.Round(pressure, 1);
        WindSpeed = Math.Round(windSpeed, 1);
    }
}


// SECTION:: Observer Interface
public interface Observer
{
    void Update(WeatherStation station);
}


// SECTION:: Subject - WeatherStation
public class WeatherStation
{
    private List<Observer> _observers = new();
    private List<WeatherData> _readings = new();
    private WeatherData _currentReading;

    public WeatherStation()
    {
        _currentReading = new WeatherData(22, 65, 1013, 12);
        _readings.Add(_currentReading);
    }

    // Observer registration
    public void RegisterObserver(Observer observer)
    {
        if (!_observers.Contains(observer))
        {
            _observers.Add(observer);
        }
    }

    public void RemoveObserver(Observer observer)
    {
        _observers.Remove(observer);
    }

    // Notify all observers of state change
    private void NotifyObservers()
    {
        foreach (Observer observer in _observers)
        {
            observer.Update(this);
        }
    }

    // Set new weather reading and notify
    public void SetWeatherData(double temperature, double humidity, double pressure, double windSpeed)
    {
        _currentReading = new WeatherData(temperature, humidity, pressure, windSpeed);

        // Keep last 10 readings
        _readings.Add(_currentReading);
        if (_readings.Count > 10)
        {
            _readings.RemoveAt(0);
        }

        NotifyObservers();
    }

    // Observers pull data when they update
    public WeatherData GetCurrentReading()
    {
        return _currentReading;
    }

    public List<WeatherData> GetReadings()
    {
        return new List<WeatherData>(_readings);
    }

    public int GetObserverCount()
    {
        return _observers.Count;
    }
}


// SECTION:: Concrete Observer - TemperatureChart
public class TemperatureChart : Observer
{
    private string _name;

    public TemperatureChart(string name)
    {
        _name = name;
    }

    public void Update(WeatherStation station)
    {
        var readings = station.GetReadings();
        var temps = string.Join(", ", readings.Select(r => r.Temperature + "°C"));
        Console.WriteLine($"{_name} updated: temps {temps}");
    }
}


// SECTION:: Concrete Observer - HumidityChart
public class HumidityChart : Observer
{
    private string _name;

    public HumidityChart(string name)
    {
        _name = name;
    }

    public void Update(WeatherStation station)
    {
        var current = station.GetCurrentReading();
        Console.WriteLine($"{_name} updated: humidity {current.Humidity}%");
    }
}


// SECTION:: Concrete Observer - PressureWindChart
public class PressureWindChart : Observer
{
    private string _name;

    public PressureWindChart(string name)
    {
        _name = name;
    }

    public void Update(WeatherStation station)
    {
        var current = station.GetCurrentReading();
        Console.WriteLine($"{_name} updated: pressure {current.Pressure}hPa, wind {current.WindSpeed}km/h");
    }
}


// SECTION:: Demo
#if !TESTING
class WeatherStationDemo
{
    static void Main(string[] args)
    {
        Console.WriteLine("Weather Station Observer Pattern Demo\n");

        // Create the subject
        var station = new WeatherStation();

        // Create and register observers (charts)
        var tempChart = new TemperatureChart("Temperature Chart");
        var humidityChart = new HumidityChart("Humidity Gauge");
        var pressureChart = new PressureWindChart("Pressure & Wind Chart");

        station.RegisterObserver(tempChart);
        station.RegisterObserver(humidityChart);
        station.RegisterObserver(pressureChart);

        Console.WriteLine("→ Day 1: All charts registered. New reading...\n");
        station.SetWeatherData(18, 45, 1015, 10);

        Console.WriteLine("\n→ Day 2: Temperature drops, humidity rises...\n");
        station.SetWeatherData(15, 75, 1018, 15);

        Console.WriteLine("\n→ Day 3: Pressure and wind spike...\n");
        station.SetWeatherData(22, 55, 1005, 35);

        Console.WriteLine("\n→ Humidity chart unsubscribes...\n");
        station.RemoveObserver(humidityChart);

        Console.WriteLine("→ Day 4: Only temp and pressure charts update...\n");
        station.SetWeatherData(25, 40, 1010, 8);

        Console.WriteLine("\n✓ Demo complete. Observer pattern decouples the");
        Console.WriteLine("  weather station (subject) from charts (observers).");
        Console.WriteLine("  Charts subscribe/unsubscribe dynamically.");
    }
}
#endif

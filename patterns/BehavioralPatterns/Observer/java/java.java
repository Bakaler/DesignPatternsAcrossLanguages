// ============================================================
//  Observer Pattern: Weather Station Live Dashboard
//  Run: javac java.java && java WeatherStationDemo
// ============================================================
//
//  Participants
//  ────────────────────────────────────────────────────────
//  Subject (WeatherStation)  maintains list of observers,
//                            notifies them of state changes
//  Observer (interface)      defines update() contract
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
//  notifies all observers via update(). Each observer pulls
//  the data it needs from the Subject.
//
//  Consequences demonstrated
//  ────────────────────────────────────────────────────────
//  Loose coupling       observers know only the Subject interface
//  Dynamic updates      add/remove observers at runtime
//  Broadcast updates    one notification reaches all observers
//  Automatic sync       observers sync without polling
// ============================================================

import java.util.*;


// SECTION:: WeatherData Type
class WeatherData {
    double temperature;  // 10-35°C
    double humidity;     // 0-100%
    double pressure;     // 950-1050 hPa
    double windSpeed;    // 0-50 km/h

    public WeatherData(double temperature, double humidity, double pressure, double windSpeed) {
        this.temperature = Math.round(temperature * 10.0) / 10.0;
        this.humidity = Math.round(humidity * 10.0) / 10.0;
        this.pressure = Math.round(pressure * 10.0) / 10.0;
        this.windSpeed = Math.round(windSpeed * 10.0) / 10.0;
    }
}


// SECTION:: Observer Interface
interface Observer {
    void update(WeatherStation station);
}


// SECTION:: Subject - WeatherStation
class WeatherStation {
    private List<Observer> observers = new ArrayList<>();
    private List<WeatherData> readings = new ArrayList<>();
    private WeatherData currentReading;

    public WeatherStation() {
        this.currentReading = new WeatherData(22, 65, 1013, 12);
        this.readings.add(this.currentReading);
    }

    // Observer registration
    public void registerObserver(Observer observer) {
        if (!observers.contains(observer)) {
            observers.add(observer);
        }
    }

    public void removeObserver(Observer observer) {
        observers.remove(observer);
    }

    // Notify all observers of state change
    private void notifyObservers() {
        for (Observer observer : observers) {
            observer.update(this);
        }
    }

    // Set new weather reading and notify
    public void setWeatherData(double temperature, double humidity, double pressure, double windSpeed) {
        this.currentReading = new WeatherData(temperature, humidity, pressure, windSpeed);

        // Keep last 10 readings
        readings.add(this.currentReading);
        if (readings.size() > 10) {
            readings.remove(0);
        }

        notifyObservers();
    }

    // Observers pull data when they update
    public WeatherData getCurrentReading() {
        return currentReading;
    }

    public List<WeatherData> getReadings() {
        return new ArrayList<>(readings);
    }

    public int getObserverCount() {
        return observers.size();
    }
}


// SECTION:: Concrete Observer - TemperatureChart
class TemperatureChart implements Observer {
    private String name;

    public TemperatureChart(String name) {
        this.name = name;
    }

    @Override
    public void update(WeatherStation station) {
        List<WeatherData> readings = station.getReadings();
        StringBuilder temps = new StringBuilder();
        for (int i = 0; i < readings.size(); i++) {
            if (i > 0) temps.append(", ");
            temps.append(readings.get(i).temperature).append("°C");
        }
        System.out.println(name + " updated: temps " + temps);
    }
}


// SECTION:: Concrete Observer - HumidityChart
class HumidityChart implements Observer {
    private String name;

    public HumidityChart(String name) {
        this.name = name;
    }

    @Override
    public void update(WeatherStation station) {
        WeatherData current = station.getCurrentReading();
        System.out.println(name + " updated: humidity " + current.humidity + "%");
    }
}


// SECTION:: Concrete Observer - PressureWindChart
class PressureWindChart implements Observer {
    private String name;

    public PressureWindChart(String name) {
        this.name = name;
    }

    @Override
    public void update(WeatherStation station) {
        WeatherData current = station.getCurrentReading();
        System.out.println(name + " updated: pressure " + current.pressure + "hPa, wind " + current.windSpeed + "km/h");
    }
}


// SECTION:: Demo
class WeatherStationDemo {
    public static void main(String[] args) {
        System.out.println("Weather Station Observer Pattern Demo\n");

        // Create the subject
        WeatherStation station = new WeatherStation();

        // Create and register observers (charts)
        TemperatureChart tempChart = new TemperatureChart("Temperature Chart");
        HumidityChart humidityChart = new HumidityChart("Humidity Gauge");
        PressureWindChart pressureChart = new PressureWindChart("Pressure & Wind Chart");

        station.registerObserver(tempChart);
        station.registerObserver(humidityChart);
        station.registerObserver(pressureChart);

        System.out.println("→ Day 1: All charts registered. New reading...\n");
        station.setWeatherData(18, 45, 1015, 10);

        System.out.println("\n→ Day 2: Temperature drops, humidity rises...\n");
        station.setWeatherData(15, 75, 1018, 15);

        System.out.println("\n→ Day 3: Pressure and wind spike...\n");
        station.setWeatherData(22, 55, 1005, 35);

        System.out.println("\n→ Humidity chart unsubscribes...\n");
        station.removeObserver(humidityChart);

        System.out.println("→ Day 4: Only temp and pressure charts update...\n");
        station.setWeatherData(25, 40, 1010, 8);

        System.out.println("\n✓ Demo complete. Observer pattern decouples the");
        System.out.println("  weather station (subject) from charts (observers).");
        System.out.println("  Charts subscribe/unsubscribe dynamically.");
    }
}

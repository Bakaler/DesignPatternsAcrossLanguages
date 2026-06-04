// ============================================================
//  Observer Pattern: Weather Station Live Dashboard
//  Run: npx ts-node typescript.ts
// ============================================================
//
//  Participants
//  ────────────────────────────────────────────────────────
//  Subject (WeatherStation)  maintains list of observers,
//                            notifies them of state changes
//  Observer (Chart)          defines update() interface
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
//  WeatherStation (Subject) maintains a list of Chart (Observer)
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

// SECTION:: WeatherData Type
interface WeatherData {
  temperature: number;    // 10-35°C
  humidity: number;       // 0-100%
  pressure: number;       // 950-1050 hPa
  windSpeed: number;      // 0-50 km/h
}

// SECTION:: Observer Interface
interface Observer {
  update(station: WeatherStation): void;
}

// SECTION:: Subject - WeatherStation
class WeatherStation {
  private observers: Observer[] = [];
  private readings: WeatherData[] = [];
  private currentReading: WeatherData;

  constructor() {
    this.currentReading = {
      temperature: 22,
      humidity: 65,
      pressure: 1013,
      windSpeed: 12,
    };
    this.readings = [this.currentReading];
  }

  // Observer registration
  registerObserver(observer: Observer): void {
    if (!this.observers.includes(observer)) {
      this.observers.push(observer);
    }
  }

  removeObserver(observer: Observer): void {
    const index = this.observers.indexOf(observer);
    if (index > -1) {
      this.observers.splice(index, 1);
    }
  }

  // Notify all observers of state change
  private notifyObservers(): void {
    for (const observer of this.observers) {
      observer.update(this);
    }
  }

  // Set new weather reading and notify
  setWeatherData(
    temperature: number,
    humidity: number,
    pressure: number,
    windSpeed: number
  ): void {
    this.currentReading = {
      temperature: Math.round(temperature * 10) / 10,
      humidity: Math.round(humidity * 10) / 10,
      pressure: Math.round(pressure * 10) / 10,
      windSpeed: Math.round(windSpeed * 10) / 10,
    };

    // Keep last 10 readings
    this.readings.push(this.currentReading);
    if (this.readings.length > 10) {
      this.readings.shift();
    }

    this.notifyObservers();
  }

  // Observers pull data when they update
  getCurrentReading(): WeatherData {
    return this.currentReading;
  }

  getReadings(): WeatherData[] {
    return [...this.readings];
  }
}

// SECTION:: Concrete Observer - TemperatureChart
class TemperatureChart implements Observer {
  constructor(private name: string) {}

  update(station: WeatherStation): void {
    const readings = station.getReadings();
    const temps = readings.map((r) => r.temperature);
    console.log(
      `${this.name} updated: temps ${temps.map((t) => t + '°C').join(', ')}`
    );
  }
}

// SECTION:: Concrete Observer - HumidityChart
class HumidityChart implements Observer {
  constructor(private name: string) {}

  update(station: WeatherStation): void {
    const current = station.getCurrentReading();
    console.log(`${this.name} updated: humidity ${current.humidity}%`);
  }
}

// SECTION:: Concrete Observer - PressureWindChart
class PressureWindChart implements Observer {
  constructor(private name: string) {}

  update(station: WeatherStation): void {
    const current = station.getCurrentReading();
    console.log(
      `${this.name} updated: pressure ${current.pressure}hPa, ` +
        `wind ${current.windSpeed}km/h`
    );
  }
}

// SECTION:: Demo
function main(): void {
  console.log('🌦️  Weather Station Observer Pattern Demo\n');

  // Create the subject
  const station = new WeatherStation();

  // Create and register observers (charts)
  const tempChart = new TemperatureChart('📊 Temperature Chart');
  const humidityChart = new HumidityChart('💧 Humidity Gauge');
  const pressureChart = new PressureWindChart('🌪️  Pressure & Wind Chart');

  station.registerObserver(tempChart);
  station.registerObserver(humidityChart);
  station.registerObserver(pressureChart);

  console.log('→ Day 1: All charts registered. New reading...\n');
  station.setWeatherData(18, 45, 1015, 10);

  console.log('\n→ Day 2: Temperature drops, humidity rises...\n');
  station.setWeatherData(15, 75, 1018, 15);

  console.log('\n→ Day 3: Pressure and wind spike...\n');
  station.setWeatherData(22, 55, 1005, 35);

  console.log('\n→ Humidity chart unsubscribes...\n');
  station.removeObserver(humidityChart);

  console.log('→ Day 4: Only temp and pressure charts update...\n');
  station.setWeatherData(25, 40, 1010, 8);

  console.log('\n✓ Demo complete. Observer pattern decouples the');
  console.log('  weather station (subject) from charts (observers).');
  console.log('  Charts subscribe/unsubscribe dynamically.');
}

main();

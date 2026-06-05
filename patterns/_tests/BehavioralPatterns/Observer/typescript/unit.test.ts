// ============================================================
//  Unit Tests — Observer: Weather Station
//
//  What we test here:
//    · Observer registration/removal mechanics
//    · Notification broadcast to all registered observers
//    · Pull model — observers get current readings
//    · Reading history maintained correctly
//    · Observer independence — removal doesn't affect others
//
//  Run: npx mocha --require ts-node/register unit.test.ts
// ============================================================

import { describe, it } from 'mocha';
import assert from 'assert';
import {
  Observer,
  WeatherStation,
  TemperatureChart,
  HumidityChart,
  PressureWindChart,
} from '../../../../BehavioralPatterns/Observer/typescript/typescript';

// SECTION:: Test Observer
class MockObserver implements Observer {
  updateCount = 0;
  lastStation: WeatherStation | null = null;

  update(station: WeatherStation): void {
    this.updateCount++;
    this.lastStation = station;
  }
}

// SECTION:: Observer Registration
describe('Observer Registration', () => {
  let station: WeatherStation;
  let observer1: MockObserver;
  let observer2: MockObserver;

  beforeEach(() => {
    station = new WeatherStation();
    observer1 = new MockObserver();
    observer2 = new MockObserver();
  });

  it('registers a single observer', () => {
    station.registerObserver(observer1);
    assert.strictEqual(observer1.updateCount, 0); // No update yet
  });

  it('prevents duplicate registration', () => {
    station.registerObserver(observer1);
    station.registerObserver(observer1); // Try to register same observer again
    station.setWeatherData(20, 60, 1010, 10);
    assert.strictEqual(observer1.updateCount, 1); // Called only once
  });

  it('removes an observer from the list', () => {
    station.registerObserver(observer1);
    station.registerObserver(observer2);
    station.removeObserver(observer1);
    station.setWeatherData(20, 60, 1010, 10);
    assert.strictEqual(observer1.updateCount, 0); // Not notified
    assert.strictEqual(observer2.updateCount, 1); // Still notified
  });
});

// SECTION:: Notification Broadcast
describe('Notification Broadcast', () => {
  let station: WeatherStation;
  let observer1: MockObserver;
  let observer2: MockObserver;
  let observer3: MockObserver;

  beforeEach(() => {
    station = new WeatherStation();
    observer1 = new MockObserver();
    observer2 = new MockObserver();
    observer3 = new MockObserver();
  });

  it('notifies all registered observers', () => {
    station.registerObserver(observer1);
    station.registerObserver(observer2);
    station.registerObserver(observer3);

    station.setWeatherData(25, 70, 1015, 15);

    assert.strictEqual(observer1.updateCount, 1);
    assert.strictEqual(observer2.updateCount, 1);
    assert.strictEqual(observer3.updateCount, 1);
  });

  it('notifies repeatedly on multiple updates', () => {
    station.registerObserver(observer1);

    station.setWeatherData(20, 60, 1010, 10);
    assert.strictEqual(observer1.updateCount, 1);

    station.setWeatherData(25, 70, 1015, 15);
    assert.strictEqual(observer1.updateCount, 2);

    station.setWeatherData(30, 80, 1020, 20);
    assert.strictEqual(observer1.updateCount, 3);
  });

  it('passes the station itself to update()', () => {
    station.registerObserver(observer1);
    station.setWeatherData(25, 70, 1015, 15);

    assert.strictEqual(observer1.lastStation, station);
  });
});

// SECTION:: Pull Model
describe('Pull Model — Observers Query Station', () => {
  let station: WeatherStation;
  let observer1: MockObserver;

  beforeEach(() => {
    station = new WeatherStation();
    observer1 = new MockObserver();
  });

  it('getCurrentReading returns latest data', () => {
    station.registerObserver(observer1);
    station.setWeatherData(25, 70, 1015, 15);

    const reading = observer1.lastStation!.getCurrentReading();
    assert.strictEqual(reading.temperature, 25);
    assert.strictEqual(reading.humidity, 70);
    assert.strictEqual(reading.pressure, 1015);
    assert.strictEqual(reading.windSpeed, 15);
  });

  it('getReadings returns full history', () => {
    station.registerObserver(observer1);

    station.setWeatherData(20, 60, 1010, 10);
    station.setWeatherData(25, 70, 1015, 15);
    station.setWeatherData(30, 80, 1020, 20);

    const readings = observer1.lastStation!.getReadings();
    assert.strictEqual(readings.length, 4); // initial + 3 updates
    assert.strictEqual(readings[0].temperature, 22); // initial
    assert.strictEqual(readings[3].temperature, 30); // latest
  });

  it('maintains last 10 readings max', () => {
    station.registerObserver(observer1);

    for (let i = 0; i < 12; i++) {
      station.setWeatherData(20 + i, 60, 1010, 10);
    }

    const readings = observer1.lastStation!.getReadings();
    assert.strictEqual(readings.length, 10);
  });
});

// SECTION:: Concrete Observers
describe('Concrete Observers', () => {
  let station: WeatherStation;

  beforeEach(() => {
    station = new WeatherStation();
  });

  it('TemperatureChart registers and updates', () => {
    const chart = new TemperatureChart('Test Temp');
    station.registerObserver(chart);
    assert.doesNotThrow(() => station.setWeatherData(25, 70, 1015, 15));
  });

  it('HumidityChart registers and updates', () => {
    const chart = new HumidityChart('Test Humidity');
    station.registerObserver(chart);
    assert.doesNotThrow(() => station.setWeatherData(25, 70, 1015, 15));
  });

  it('PressureWindChart registers and updates', () => {
    const chart = new PressureWindChart('Test Pressure');
    station.registerObserver(chart);
    assert.doesNotThrow(() => station.setWeatherData(25, 70, 1015, 15));
  });

  it('all three can register together', () => {
    const temp = new TemperatureChart('Temp');
    const humid = new HumidityChart('Humidity');
    const pressure = new PressureWindChart('Pressure');

    station.registerObserver(temp);
    station.registerObserver(humid);
    station.registerObserver(pressure);

    assert.doesNotThrow(() => station.setWeatherData(25, 70, 1015, 15));
  });
});

// SECTION:: Loose Coupling
describe('Loose Coupling', () => {
  let station: WeatherStation;

  beforeEach(() => {
    station = new WeatherStation();
  });

  it('observers are independent — removal of one does not affect others', () => {
    const obs1 = new MockObserver();
    const obs2 = new MockObserver();
    const obs3 = new MockObserver();

    station.registerObserver(obs1);
    station.registerObserver(obs2);
    station.registerObserver(obs3);

    station.removeObserver(obs2);
    station.setWeatherData(25, 70, 1015, 15);

    assert.strictEqual(obs1.updateCount, 1);
    assert.strictEqual(obs2.updateCount, 0); // Never notified
    assert.strictEqual(obs3.updateCount, 1);
  });

  it('dynamic subscription — can add/remove at runtime', () => {
    const obs = new MockObserver();

    station.setWeatherData(20, 60, 1010, 10); // Before registration

    station.registerObserver(obs);
    station.setWeatherData(25, 70, 1015, 15); // After registration

    assert.strictEqual(obs.updateCount, 1); // Only the second one

    station.removeObserver(obs);
    station.setWeatherData(30, 80, 1020, 20); // After removal

    assert.strictEqual(obs.updateCount, 1); // Still only one
  });

  it('station does not depend on concrete observer types', () => {
    // Create a custom observer that station knows nothing about
    class CustomObserver implements Observer {
      called = false;
      update(_station: WeatherStation): void {
        this.called = true;
      }
    }

    const custom = new CustomObserver();
    station.registerObserver(custom);
    station.setWeatherData(25, 70, 1015, 15);

    assert.ok(custom.called);
  });
});

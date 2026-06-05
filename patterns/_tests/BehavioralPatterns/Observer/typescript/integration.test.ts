// ============================================================
//  Integration Tests — Observer: Weather Station
//
//  What we test here:
//    · Full workflow with multiple observers
//    · Correct behavior across subscription lifecycle
//    · Data consistency across all observers
//    · Real-world scenario with mixed operations
//
//  Run: npx mocha --require ts-node/register integration.test.ts
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

// SECTION:: Test Observer that tracks updates
class TrackingObserver implements Observer {
  updates: any[] = [];

  update(station: WeatherStation): void {
    const reading = station.getCurrentReading();
    this.updates.push({
      timestamp: new Date(),
      temperature: reading.temperature,
      humidity: reading.humidity,
      pressure: reading.pressure,
      windSpeed: reading.windSpeed,
    });
  }
}

// SECTION:: Integration Scenarios
describe('Observer Pattern — Full Workflow', () => {
  let station: WeatherStation;
  let tempChart: TemperatureChart;
  let humidityChart: HumidityChart;
  let pressureChart: PressureWindChart;
  let tracker: TrackingObserver;

  beforeEach(() => {
    station = new WeatherStation();
    tempChart = new TemperatureChart('Temp');
    humidityChart = new HumidityChart('Humidity');
    pressureChart = new PressureWindChart('Pressure');
    tracker = new TrackingObserver();
  });

  it('multiple observers track multiple updates', () => {
    station.registerObserver(tempChart);
    station.registerObserver(humidityChart);
    station.registerObserver(pressureChart);
    station.registerObserver(tracker);

    station.setWeatherData(18, 45, 1015, 10);
    station.setWeatherData(22, 60, 1010, 8);
    station.setWeatherData(25, 70, 1015, 12);

    assert.strictEqual(tracker.updates.length, 3);
    assert.strictEqual(tracker.updates[0].temperature, 18);
    assert.strictEqual(tracker.updates[1].temperature, 22);
    assert.strictEqual(tracker.updates[2].temperature, 25);
  });

  it('unsubscribe mid-stream stops updates', () => {
    station.registerObserver(tracker);

    station.setWeatherData(18, 45, 1015, 10);
    assert.strictEqual(tracker.updates.length, 1);

    station.removeObserver(tracker);

    station.setWeatherData(22, 60, 1010, 8);
    assert.strictEqual(tracker.updates.length, 1); // No new update

    station.registerObserver(tracker);

    station.setWeatherData(25, 70, 1015, 12);
    assert.strictEqual(tracker.updates.length, 2); // Resumes after re-subscribe
  });

  it('all observers see same current reading', () => {
    const tracker1 = new TrackingObserver();
    const tracker2 = new TrackingObserver();
    const tracker3 = new TrackingObserver();

    station.registerObserver(tracker1);
    station.registerObserver(tracker2);
    station.registerObserver(tracker3);

    station.setWeatherData(25, 70, 1015, 15);

    assert.deepStrictEqual(tracker1.updates[0], tracker2.updates[0]);
    assert.deepStrictEqual(tracker2.updates[0], tracker3.updates[0]);
  });

  it('reading history remains consistent across observer lifespan', () => {
    const tracker1 = new TrackingObserver();

    station.registerObserver(tracker1);
    station.setWeatherData(18, 45, 1015, 10);
    station.setWeatherData(22, 60, 1010, 8);

    // Get history at first observation point
    const history1 = station.getReadings();

    station.setWeatherData(25, 70, 1015, 12);

    // Get history after another update
    const history2 = station.getReadings();

    assert.ok(history1.length < history2.length);
    assert.deepStrictEqual(history1[0], history2[0]); // Old readings stay same
    assert.deepStrictEqual(history1[1], history2[1]);
  });

  it('works with mixed observer subscribe/unsubscribe sequence', () => {
    const tracker1 = new TrackingObserver();
    const tracker2 = new TrackingObserver();
    const tracker3 = new TrackingObserver();

    // Day 1: Only tracker1
    station.registerObserver(tracker1);
    station.setWeatherData(18, 45, 1015, 10);
    assert.strictEqual(tracker1.updates.length, 1);
    assert.strictEqual(tracker2.updates.length, 0);
    assert.strictEqual(tracker3.updates.length, 0);

    // Day 2: Add tracker2
    station.registerObserver(tracker2);
    station.setWeatherData(22, 60, 1010, 8);
    assert.strictEqual(tracker1.updates.length, 2);
    assert.strictEqual(tracker2.updates.length, 1);
    assert.strictEqual(tracker3.updates.length, 0);

    // Day 3: Add tracker3, remove tracker1
    station.registerObserver(tracker3);
    station.removeObserver(tracker1);
    station.setWeatherData(25, 70, 1015, 12);
    assert.strictEqual(tracker1.updates.length, 2); // Stopped
    assert.strictEqual(tracker2.updates.length, 2);
    assert.strictEqual(tracker3.updates.length, 1);

    // Day 4: Re-add tracker1
    station.registerObserver(tracker1);
    station.setWeatherData(28, 75, 1020, 14);
    assert.strictEqual(tracker1.updates.length, 3); // Resumed
    assert.strictEqual(tracker2.updates.length, 3);
    assert.strictEqual(tracker3.updates.length, 2);
  });

  it('respects 10-reading history limit across observer lifecycle', () => {
    const tracker = new TrackingObserver();
    station.registerObserver(tracker);

    // Generate 15 readings
    for (let i = 0; i < 15; i++) {
      station.setWeatherData(10 + i, 50 + i, 1010 + i, 10);
    }

    // Should have exactly 10 readings in history
    const readings = station.getReadings();
    assert.strictEqual(readings.length, 10);

    // Should be the last 10 updates
    assert.strictEqual(readings[0].temperature, 15); // 10 + 5
    assert.strictEqual(readings[9].temperature, 24); // 10 + 14
  });

  it('supports arbitrary observer implementations', () => {
    // Custom observer that sums temperatures
    class TempAverageObserver implements Observer {
      tempSum = 0;
      count = 0;

      update(station: WeatherStation): void {
        const current = station.getCurrentReading();
        this.tempSum += current.temperature;
        this.count++;
      }

      getAverage(): number {
        return this.count > 0 ? this.tempSum / this.count : 0;
      }
    }

    const avgObserver = new TempAverageObserver();
    station.registerObserver(avgObserver);

    station.setWeatherData(20, 60, 1010, 10);
    station.setWeatherData(24, 65, 1015, 12);
    station.setWeatherData(26, 70, 1020, 15);

    const avg = avgObserver.getAverage();
    assert.strictEqual(avg, (20 + 24 + 26) / 3);
  });

  it('all three concrete observers coexist without interference', () => {
    const tracker = new TrackingObserver();

    station.registerObserver(tempChart);
    station.registerObserver(humidityChart);
    station.registerObserver(pressureChart);
    station.registerObserver(tracker);

    // Perform updates
    station.setWeatherData(18, 45, 1015, 10);
    station.setWeatherData(25, 70, 1020, 15);

    // All should have been notified
    assert.strictEqual(tracker.updates.length, 2);

    // Reading history accessible to all
    const readings = station.getReadings();
    assert.ok(readings.length > 2);
  });
});

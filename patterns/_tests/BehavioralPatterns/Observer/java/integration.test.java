// ============================================================
//  Integration Tests — Observer: Weather Station (Java)
//
//  What we test here:
//    · Full workflow with multiple observers
//    · Correct behavior across subscription lifecycle
//    · Data consistency across all observers
//    · Real-world scenario with mixed operations
//
//  Run: javac -cp .:junit-4.13.2.jar:hamcrest-core-1.3.jar ObserverIntegrationTest.java && java -cp .:junit-4.13.2.jar:hamcrest-core-1.3.jar org.junit.runner.JUnitCore ObserverIntegrationTest
// ============================================================

import org.junit.*;
import static org.junit.Assert.*;
import java.util.*;


public class IntegrationTest {
    private WeatherStation station;
    private TemperatureChart tempChart;
    private HumidityChart humidityChart;
    private PressureWindChart pressureChart;
    private TrackingObserver tracker;

    @Before
    public void setUp() {
        station = new WeatherStation();
        tempChart = new TemperatureChart("Temp");
        humidityChart = new HumidityChart("Humidity");
        pressureChart = new PressureWindChart("Pressure");
        tracker = new TrackingObserver();
    }

    @Test
    public void testMultipleObserversTrackMultipleUpdates() {
        station.registerObserver(tempChart);
        station.registerObserver(humidityChart);
        station.registerObserver(pressureChart);
        station.registerObserver(tracker);

        station.setWeatherData(18, 45, 1015, 10);
        station.setWeatherData(22, 60, 1010, 8);
        station.setWeatherData(25, 70, 1015, 12);

        assertEquals(3, tracker.updates.size());
        assertEquals(18, tracker.updates.get(0).temperature, 0.01);
        assertEquals(22, tracker.updates.get(1).temperature, 0.01);
        assertEquals(25, tracker.updates.get(2).temperature, 0.01);
    }

    @Test
    public void testUnsubscribeMidStreamStopsUpdates() {
        station.registerObserver(tracker);

        station.setWeatherData(18, 45, 1015, 10);
        assertEquals(1, tracker.updates.size());

        station.removeObserver(tracker);

        station.setWeatherData(22, 60, 1010, 8);
        assertEquals(1, tracker.updates.size()); // No new update

        station.registerObserver(tracker);

        station.setWeatherData(25, 70, 1015, 12);
        assertEquals(2, tracker.updates.size()); // Resumes after re-subscribe
    }

    @Test
    public void testAllObserversSeesSameCurrentReading() {
        TrackingObserver tracker1 = new TrackingObserver();
        TrackingObserver tracker2 = new TrackingObserver();
        TrackingObserver tracker3 = new TrackingObserver();

        station.registerObserver(tracker1);
        station.registerObserver(tracker2);
        station.registerObserver(tracker3);

        station.setWeatherData(25, 70, 1015, 15);

        TrackingObserver.Update u1 = tracker1.updates.get(0);
        TrackingObserver.Update u2 = tracker2.updates.get(0);
        TrackingObserver.Update u3 = tracker3.updates.get(0);

        assertEquals(u1.temperature, u2.temperature, 0.01);
        assertEquals(u2.temperature, u3.temperature, 0.01);
        assertEquals(u1.humidity, u2.humidity, 0.01);
        assertEquals(u1.pressure, u2.pressure, 0.01);
    }

    @Test
    public void testReadingHistoryRemainConsistentAcrossObserverLifespan() {
        TrackingObserver tracker1 = new TrackingObserver();

        station.registerObserver(tracker1);
        station.setWeatherData(18, 45, 1015, 10);
        station.setWeatherData(22, 60, 1010, 8);

        // Get history at first observation point
        List<WeatherData> history1 = station.getReadings();

        station.setWeatherData(25, 70, 1015, 12);

        // Get history after another update
        List<WeatherData> history2 = station.getReadings();

        assertTrue(history1.size() < history2.size());
        assertEquals(history1.get(0).temperature, history2.get(0).temperature, 0.01);
        assertEquals(history1.get(1).temperature, history2.get(1).temperature, 0.01);
    }

    @Test
    public void testWorksWithMixedObserverSubscribeUnsubscribeSequence() {
        TrackingObserver tracker1 = new TrackingObserver();
        TrackingObserver tracker2 = new TrackingObserver();
        TrackingObserver tracker3 = new TrackingObserver();

        // Day 1: Only tracker1
        station.registerObserver(tracker1);
        station.setWeatherData(18, 45, 1015, 10);
        assertEquals(1, tracker1.updates.size());
        assertEquals(0, tracker2.updates.size());
        assertEquals(0, tracker3.updates.size());

        // Day 2: Add tracker2
        station.registerObserver(tracker2);
        station.setWeatherData(22, 60, 1010, 8);
        assertEquals(2, tracker1.updates.size());
        assertEquals(1, tracker2.updates.size());
        assertEquals(0, tracker3.updates.size());

        // Day 3: Add tracker3, remove tracker1
        station.registerObserver(tracker3);
        station.removeObserver(tracker1);
        station.setWeatherData(25, 70, 1015, 12);
        assertEquals(2, tracker1.updates.size()); // Stopped
        assertEquals(2, tracker2.updates.size());
        assertEquals(1, tracker3.updates.size());

        // Day 4: Re-add tracker1
        station.registerObserver(tracker1);
        station.setWeatherData(28, 75, 1020, 14);
        assertEquals(3, tracker1.updates.size()); // Resumed
        assertEquals(3, tracker2.updates.size());
        assertEquals(2, tracker3.updates.size());
    }

    @Test
    public void testRespectsLast10ReadingsHistoryLimitAcrossObserverLifecycle() {
        TrackingObserver tracker = new TrackingObserver();
        station.registerObserver(tracker);

        // Generate 15 readings
        for (int i = 0; i < 15; i++) {
            station.setWeatherData(10 + i, 50 + i, 1010 + i, 10);
        }

        // Should have exactly 10 readings in history
        List<WeatherData> readings = station.getReadings();
        assertEquals(10, readings.size());

        // Should be the last 10 updates
        assertEquals(15, readings.get(0).temperature, 0.01); // 10 + 5
        assertEquals(24, readings.get(9).temperature, 0.01); // 10 + 14
    }

    @Test
    public void testSupportsArbitraryObserverImplementations() {
        class TempAverageObserver implements Observer {
            double tempSum = 0;
            int count = 0;

            @Override
            public void update(WeatherStation station) {
                WeatherData current = station.getCurrentReading();
                tempSum += current.temperature;
                count++;
            }

            double getAverage() {
                return count > 0 ? tempSum / count : 0;
            }
        }

        TempAverageObserver avgObserver = new TempAverageObserver();
        station.registerObserver(avgObserver);

        station.setWeatherData(20, 60, 1010, 10);
        station.setWeatherData(24, 65, 1015, 12);
        station.setWeatherData(26, 70, 1020, 15);

        double avg = avgObserver.getAverage();
        assertEquals((20 + 24 + 26) / 3.0, avg, 0.01);
    }

    @Test
    public void testAllThreeConcreteObserversCoexistWithoutInterference() {
        TrackingObserver tracker = new TrackingObserver();

        station.registerObserver(tempChart);
        station.registerObserver(humidityChart);
        station.registerObserver(pressureChart);
        station.registerObserver(tracker);

        // Perform updates
        station.setWeatherData(18, 45, 1015, 10);
        station.setWeatherData(25, 70, 1020, 15);

        // All should have been notified
        assertEquals(2, tracker.updates.size());

        // Reading history accessible to all
        List<WeatherData> readings = station.getReadings();
        assertTrue(readings.size() > 2);
    }
}

// Tracking Observer (package-private, not a test class)
class TrackingObserver implements Observer {
    static class Update {
        double temperature, humidity, pressure, windSpeed;
        Update(double t, double h, double p, double w) {
            temperature = t;
            humidity = h;
            pressure = p;
            windSpeed = w;
        }
    }

    List<Update> updates = new ArrayList<>();

    @Override
    public void update(WeatherStation station) {
        WeatherData reading = station.getCurrentReading();
        updates.add(new Update(reading.temperature, reading.humidity, reading.pressure, reading.windSpeed));
    }
}

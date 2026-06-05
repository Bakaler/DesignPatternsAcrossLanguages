// ============================================================
//  Unit Tests — Observer: Weather Station (Java)
//
//  What we test here:
//    · Observer registration/removal mechanics
//    · Notification broadcast to all registered observers
//    · Pull model — observers get current readings
//    · Reading history maintained correctly
//    · Observer independence — removal doesn't affect others
//
//  Run: javac -cp .:junit-4.13.2.jar:hamcrest-core-1.3.jar ObserverUnitTest.java && java -cp .:junit-4.13.2.jar:hamcrest-core-1.3.jar org.junit.runner.JUnitCore ObserverUnitTest
// ============================================================

import org.junit.*;
import static org.junit.Assert.*;
import java.util.*;


public class UnitTest {
    private WeatherStation station;
    private MockObserver observer1;
    private MockObserver observer2;

    @Before
    public void setUp() {
        station = new WeatherStation();
        observer1 = new MockObserver();
        observer2 = new MockObserver();
    }

    // ── Observer Registration Tests
    @Test
    public void testRegistersASingleObserver() {
        station.registerObserver(observer1);
        assertEquals(0, observer1.updateCount); // No update yet
    }

    @Test
    public void testPreventsDuplicateRegistration() {
        station.registerObserver(observer1);
        station.registerObserver(observer1); // Try again
        station.setWeatherData(20, 60, 1010, 10);
        assertEquals(1, observer1.updateCount); // Called only once
    }

    @Test
    public void testRemovesAnObserverFromTheList() {
        station.registerObserver(observer1);
        station.registerObserver(observer2);
        station.removeObserver(observer1);
        station.setWeatherData(20, 60, 1010, 10);
        assertEquals(0, observer1.updateCount); // Not notified
        assertEquals(1, observer2.updateCount); // Still notified
    }

    // ── Notification Broadcast Tests
    @Test
    public void testNotifiesAllRegisteredObservers() {
        MockObserver obs3 = new MockObserver();
        station.registerObserver(observer1);
        station.registerObserver(observer2);
        station.registerObserver(obs3);

        station.setWeatherData(25, 70, 1015, 15);

        assertEquals(1, observer1.updateCount);
        assertEquals(1, observer2.updateCount);
        assertEquals(1, obs3.updateCount);
    }

    @Test
    public void testNotifiesRepeatedlyOnMultipleUpdates() {
        station.registerObserver(observer1);

        station.setWeatherData(20, 60, 1010, 10);
        assertEquals(1, observer1.updateCount);

        station.setWeatherData(25, 70, 1015, 15);
        assertEquals(2, observer1.updateCount);

        station.setWeatherData(30, 80, 1020, 20);
        assertEquals(3, observer1.updateCount);
    }

    @Test
    public void testPassesTheStationItselfToUpdate() {
        station.registerObserver(observer1);
        station.setWeatherData(25, 70, 1015, 15);

        assertSame(observer1.lastStation, station);
    }

    // ── Pull Model Tests
    @Test
    public void testGetCurrentReadingReturnsLatestData() {
        station.registerObserver(observer1);
        station.setWeatherData(25, 70, 1015, 15);

        WeatherData reading = observer1.lastStation.getCurrentReading();
        assertEquals(25, reading.temperature, 0.01);
        assertEquals(70, reading.humidity, 0.01);
        assertEquals(1015, reading.pressure, 0.01);
        assertEquals(15, reading.windSpeed, 0.01);
    }

    @Test
    public void testGetReadingsReturnsFullHistory() {
        station.registerObserver(observer1);

        station.setWeatherData(20, 60, 1010, 10);
        station.setWeatherData(25, 70, 1015, 15);
        station.setWeatherData(30, 80, 1020, 20);

        List<WeatherData> readings = observer1.lastStation.getReadings();
        assertEquals(4, readings.size()); // initial + 3 updates
        assertEquals(22, readings.get(0).temperature, 0.01); // initial
        assertEquals(30, readings.get(3).temperature, 0.01); // latest
    }

    @Test
    public void testMaintainsLast10ReadingsMax() {
        station.registerObserver(observer1);

        for (int i = 0; i < 12; i++) {
            station.setWeatherData(20 + i, 60, 1010, 10);
        }

        List<WeatherData> readings = observer1.lastStation.getReadings();
        assertEquals(10, readings.size());
    }

    // ── Concrete Observers Tests
    @Test
    public void testTemperatureChartRegistersAndUpdates() {
        TemperatureChart chart = new TemperatureChart("Test Temp");
        station.registerObserver(chart);
        station.setWeatherData(25, 70, 1015, 15); // Should not throw
    }

    @Test
    public void testHumidityChartRegistersAndUpdates() {
        HumidityChart chart = new HumidityChart("Test Humidity");
        station.registerObserver(chart);
        station.setWeatherData(25, 70, 1015, 15); // Should not throw
    }

    @Test
    public void testPressureWindChartRegistersAndUpdates() {
        PressureWindChart chart = new PressureWindChart("Test Pressure");
        station.registerObserver(chart);
        station.setWeatherData(25, 70, 1015, 15); // Should not throw
    }

    @Test
    public void testAllThreeCanRegisterTogether() {
        TemperatureChart temp = new TemperatureChart("Temp");
        HumidityChart humid = new HumidityChart("Humidity");
        PressureWindChart pressure = new PressureWindChart("Pressure");

        station.registerObserver(temp);
        station.registerObserver(humid);
        station.registerObserver(pressure);

        station.setWeatherData(25, 70, 1015, 15); // Should not throw
    }

    // ── Loose Coupling Tests
    @Test
    public void testObserversAreIndependent() {
        MockObserver obs3 = new MockObserver();
        station.registerObserver(observer1);
        station.registerObserver(observer2);
        station.registerObserver(obs3);

        station.removeObserver(observer2);
        station.setWeatherData(25, 70, 1015, 15);

        assertEquals(1, observer1.updateCount);
        assertEquals(0, observer2.updateCount); // Never notified
        assertEquals(1, obs3.updateCount);
    }

    @Test
    public void testDynamicSubscription() {
        station.setWeatherData(20, 60, 1010, 10); // Before registration

        station.registerObserver(observer1);
        station.setWeatherData(25, 70, 1015, 15); // After registration

        assertEquals(1, observer1.updateCount); // Only the second one

        station.removeObserver(observer1);
        station.setWeatherData(30, 80, 1020, 20); // After removal

        assertEquals(1, observer1.updateCount); // Still only one
    }

    @Test
    public void testStationDoesNotDependOnConcreteObserverTypes() {
        class CustomObserver implements Observer {
            boolean called = false;
            @Override
            public void update(WeatherStation station) {
                called = true;
            }
        }

        CustomObserver custom = new CustomObserver();
        station.registerObserver(custom);
        station.setWeatherData(25, 70, 1015, 15);

        assertTrue(custom.called);
    }
}

// Test Observer (package-private, not a test class)
class MockObserver implements Observer {
    int updateCount = 0;
    WeatherStation lastStation = null;

    @Override
    public void update(WeatherStation station) {
        updateCount++;
        lastStation = station;
    }
}

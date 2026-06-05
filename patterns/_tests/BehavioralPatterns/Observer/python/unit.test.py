#!/usr/bin/env python3
# ============================================================
#  Unit Tests — Observer: Weather Station (Python)
#
#  What we test here:
#    · Observer registration/removal mechanics
#    · Notification broadcast to all registered observers
#    · Pull model — observers get current readings
#    · Reading history maintained correctly
#    · Observer independence — removal doesn't affect others
#
#  Run: python -m pytest unit.test.py -v
# ============================================================

import pytest
import sys
from pathlib import Path

# Add pattern directory to path
pattern_dir = Path(__file__).parent.parent.parent.parent.parent / 'BehavioralPatterns' / 'Observer' / 'python'
sys.path.insert(0, str(pattern_dir))

from python import Observer, WeatherStation, TemperatureChart, HumidityChart, PressureWindChart


# SECTION:: Test Observer
class MockObserver(Observer):
    """Mock observer for testing"""
    def __init__(self):
        self.update_count = 0
        self.last_station = None

    def update(self, station: WeatherStation) -> None:
        self.update_count += 1
        self.last_station = station


# SECTION:: Observer Registration Tests
class TestObserverRegistration:
    def setup_method(self):
        self.station = WeatherStation()
        self.observer1 = MockObserver()
        self.observer2 = MockObserver()

    def test_registers_a_single_observer(self):
        self.station.register_observer(self.observer1)
        assert self.observer1.update_count == 0  # No update yet

    def test_prevents_duplicate_registration(self):
        self.station.register_observer(self.observer1)
        self.station.register_observer(self.observer1)  # Try again
        self.station.set_weather_data(20, 60, 1010, 10)
        assert self.observer1.update_count == 1  # Called only once

    def test_removes_an_observer_from_the_list(self):
        self.station.register_observer(self.observer1)
        self.station.register_observer(self.observer2)
        self.station.remove_observer(self.observer1)
        self.station.set_weather_data(20, 60, 1010, 10)
        assert self.observer1.update_count == 0  # Not notified
        assert self.observer2.update_count == 1  # Still notified


# SECTION:: Notification Broadcast Tests
class TestNotificationBroadcast:
    def setup_method(self):
        self.station = WeatherStation()
        self.observer1 = MockObserver()
        self.observer2 = MockObserver()
        self.observer3 = MockObserver()

    def test_notifies_all_registered_observers(self):
        self.station.register_observer(self.observer1)
        self.station.register_observer(self.observer2)
        self.station.register_observer(self.observer3)

        self.station.set_weather_data(25, 70, 1015, 15)

        assert self.observer1.update_count == 1
        assert self.observer2.update_count == 1
        assert self.observer3.update_count == 1

    def test_notifies_repeatedly_on_multiple_updates(self):
        self.station.register_observer(self.observer1)

        self.station.set_weather_data(20, 60, 1010, 10)
        assert self.observer1.update_count == 1

        self.station.set_weather_data(25, 70, 1015, 15)
        assert self.observer1.update_count == 2

        self.station.set_weather_data(30, 80, 1020, 20)
        assert self.observer1.update_count == 3

    def test_passes_the_station_itself_to_update(self):
        self.station.register_observer(self.observer1)
        self.station.set_weather_data(25, 70, 1015, 15)

        assert self.observer1.last_station is self.station


# SECTION:: Pull Model Tests
class TestPullModel:
    def setup_method(self):
        self.station = WeatherStation()
        self.observer1 = MockObserver()

    def test_get_current_reading_returns_latest_data(self):
        self.station.register_observer(self.observer1)
        self.station.set_weather_data(25, 70, 1015, 15)

        reading = self.observer1.last_station.get_current_reading()
        assert reading.temperature == 25
        assert reading.humidity == 70
        assert reading.pressure == 1015
        assert reading.wind_speed == 15

    def test_get_readings_returns_full_history(self):
        self.station.register_observer(self.observer1)

        self.station.set_weather_data(20, 60, 1010, 10)
        self.station.set_weather_data(25, 70, 1015, 15)
        self.station.set_weather_data(30, 80, 1020, 20)

        readings = self.observer1.last_station.get_readings()
        assert len(readings) == 4  # initial + 3 updates
        assert readings[0].temperature == 22  # initial
        assert readings[3].temperature == 30  # latest

    def test_maintains_last_10_readings_max(self):
        self.station.register_observer(self.observer1)

        for i in range(12):
            self.station.set_weather_data(20 + i, 60, 1010, 10)

        readings = self.observer1.last_station.get_readings()
        assert len(readings) == 10


# SECTION:: Concrete Observers Tests
class TestConcreteObservers:
    def setup_method(self):
        self.station = WeatherStation()

    def test_temperature_chart_registers_and_updates(self):
        chart = TemperatureChart('Test Temp')
        self.station.register_observer(chart)
        # Should not raise
        self.station.set_weather_data(25, 70, 1015, 15)

    def test_humidity_chart_registers_and_updates(self):
        chart = HumidityChart('Test Humidity')
        self.station.register_observer(chart)
        # Should not raise
        self.station.set_weather_data(25, 70, 1015, 15)

    def test_pressure_wind_chart_registers_and_updates(self):
        chart = PressureWindChart('Test Pressure')
        self.station.register_observer(chart)
        # Should not raise
        self.station.set_weather_data(25, 70, 1015, 15)

    def test_all_three_can_register_together(self):
        temp = TemperatureChart('Temp')
        humid = HumidityChart('Humidity')
        pressure = PressureWindChart('Pressure')

        self.station.register_observer(temp)
        self.station.register_observer(humid)
        self.station.register_observer(pressure)

        # Should not raise
        self.station.set_weather_data(25, 70, 1015, 15)


# SECTION:: Loose Coupling Tests
class TestLooseCoupling:
    def setup_method(self):
        self.station = WeatherStation()

    def test_observers_are_independent(self):
        obs1 = MockObserver()
        obs2 = MockObserver()
        obs3 = MockObserver()

        self.station.register_observer(obs1)
        self.station.register_observer(obs2)
        self.station.register_observer(obs3)

        self.station.remove_observer(obs2)
        self.station.set_weather_data(25, 70, 1015, 15)

        assert obs1.update_count == 1
        assert obs2.update_count == 0  # Never notified
        assert obs3.update_count == 1

    def test_dynamic_subscription(self):
        obs = MockObserver()

        self.station.set_weather_data(20, 60, 1010, 10)  # Before registration

        self.station.register_observer(obs)
        self.station.set_weather_data(25, 70, 1015, 15)  # After registration

        assert obs.update_count == 1  # Only the second one

        self.station.remove_observer(obs)
        self.station.set_weather_data(30, 80, 1020, 20)  # After removal

        assert obs.update_count == 1  # Still only one

    def test_station_does_not_depend_on_concrete_observer_types(self):
        # Create a custom observer
        class CustomObserver(Observer):
            def __init__(self):
                self.called = False

            def update(self, station: WeatherStation) -> None:
                self.called = True

        custom = CustomObserver()
        self.station.register_observer(custom)
        self.station.set_weather_data(25, 70, 1015, 15)

        assert custom.called is True


if __name__ == '__main__':
    pytest.main([__file__, '-v'])

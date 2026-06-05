#!/usr/bin/env python3
# ============================================================
#  Integration Tests — Observer: Weather Station (Python)
#
#  What we test here:
#    · Full workflow with multiple observers
#    · Correct behavior across subscription lifecycle
#    · Data consistency across all observers
#    · Real-world scenario with mixed operations
#
#  Run: python -m pytest integration.test.py -v
# ============================================================

import pytest
import sys
from pathlib import Path
from datetime import datetime

# Add pattern directory to path
pattern_dir = Path(__file__).parent.parent.parent.parent.parent / 'BehavioralPatterns' / 'Observer' / 'python'
sys.path.insert(0, str(pattern_dir))

from python import Observer, WeatherStation, TemperatureChart, HumidityChart, PressureWindChart


# SECTION:: Test Observer that tracks updates
class TrackingObserver(Observer):
    """Observer that tracks all updates"""
    def __init__(self):
        self.updates = []

    def update(self, station: WeatherStation) -> None:
        reading = station.get_current_reading()
        self.updates.append({
            'timestamp': datetime.now(),
            'temperature': reading.temperature,
            'humidity': reading.humidity,
            'pressure': reading.pressure,
            'wind_speed': reading.wind_speed,
        })


# SECTION:: Integration Scenarios
class TestObserverPatternFullWorkflow:
    def setup_method(self):
        self.station = WeatherStation()
        self.temp_chart = TemperatureChart('Temp')
        self.humidity_chart = HumidityChart('Humidity')
        self.pressure_chart = PressureWindChart('Pressure')
        self.tracker = TrackingObserver()

    def test_multiple_observers_track_multiple_updates(self):
        self.station.register_observer(self.temp_chart)
        self.station.register_observer(self.humidity_chart)
        self.station.register_observer(self.pressure_chart)
        self.station.register_observer(self.tracker)

        self.station.set_weather_data(18, 45, 1015, 10)
        self.station.set_weather_data(22, 60, 1010, 8)
        self.station.set_weather_data(25, 70, 1015, 12)

        assert len(self.tracker.updates) == 3
        assert self.tracker.updates[0]['temperature'] == 18
        assert self.tracker.updates[1]['temperature'] == 22
        assert self.tracker.updates[2]['temperature'] == 25

    def test_unsubscribe_mid_stream_stops_updates(self):
        self.station.register_observer(self.tracker)

        self.station.set_weather_data(18, 45, 1015, 10)
        assert len(self.tracker.updates) == 1

        self.station.remove_observer(self.tracker)

        self.station.set_weather_data(22, 60, 1010, 8)
        assert len(self.tracker.updates) == 1  # No new update

        self.station.register_observer(self.tracker)

        self.station.set_weather_data(25, 70, 1015, 12)
        assert len(self.tracker.updates) == 2  # Resumes after re-subscribe

    def test_all_observers_see_same_current_reading(self):
        tracker1 = TrackingObserver()
        tracker2 = TrackingObserver()
        tracker3 = TrackingObserver()

        self.station.register_observer(tracker1)
        self.station.register_observer(tracker2)
        self.station.register_observer(tracker3)

        self.station.set_weather_data(25, 70, 1015, 15)

        assert tracker1.updates[0] == tracker2.updates[0]
        assert tracker2.updates[0] == tracker3.updates[0]

    def test_reading_history_remains_consistent_across_observer_lifespan(self):
        tracker1 = TrackingObserver()

        self.station.register_observer(tracker1)
        self.station.set_weather_data(18, 45, 1015, 10)
        self.station.set_weather_data(22, 60, 1010, 8)

        # Get history at first observation point
        history1 = self.station.get_readings()

        self.station.set_weather_data(25, 70, 1015, 12)

        # Get history after another update
        history2 = self.station.get_readings()

        assert len(history1) < len(history2)
        assert history1[0].temperature == history2[0].temperature
        assert history1[1].temperature == history2[1].temperature

    def test_works_with_mixed_observer_subscribe_unsubscribe_sequence(self):
        tracker1 = TrackingObserver()
        tracker2 = TrackingObserver()
        tracker3 = TrackingObserver()

        # Day 1: Only tracker1
        self.station.register_observer(tracker1)
        self.station.set_weather_data(18, 45, 1015, 10)
        assert len(tracker1.updates) == 1
        assert len(tracker2.updates) == 0
        assert len(tracker3.updates) == 0

        # Day 2: Add tracker2
        self.station.register_observer(tracker2)
        self.station.set_weather_data(22, 60, 1010, 8)
        assert len(tracker1.updates) == 2
        assert len(tracker2.updates) == 1
        assert len(tracker3.updates) == 0

        # Day 3: Add tracker3, remove tracker1
        self.station.register_observer(tracker3)
        self.station.remove_observer(tracker1)
        self.station.set_weather_data(25, 70, 1015, 12)
        assert len(tracker1.updates) == 2  # Stopped
        assert len(tracker2.updates) == 2
        assert len(tracker3.updates) == 1

        # Day 4: Re-add tracker1
        self.station.register_observer(tracker1)
        self.station.set_weather_data(28, 75, 1020, 14)
        assert len(tracker1.updates) == 3  # Resumed
        assert len(tracker2.updates) == 3
        assert len(tracker3.updates) == 2

    def test_respects_10_reading_history_limit_across_observer_lifecycle(self):
        tracker = TrackingObserver()
        self.station.register_observer(tracker)

        # Generate 15 readings
        for i in range(15):
            self.station.set_weather_data(10 + i, 50 + i, 1010 + i, 10)

        # Should have exactly 10 readings in history
        readings = self.station.get_readings()
        assert len(readings) == 10

        # Should be the last 10 updates
        assert readings[0].temperature == 15  # 10 + 5
        assert readings[9].temperature == 24  # 10 + 14

    def test_supports_arbitrary_observer_implementations(self):
        # Custom observer that sums temperatures
        class TempAverageObserver(Observer):
            def __init__(self):
                self.temp_sum = 0
                self.count = 0

            def update(self, station: WeatherStation) -> None:
                current = station.get_current_reading()
                self.temp_sum += current.temperature
                self.count += 1

            def get_average(self) -> float:
                return self.temp_sum / self.count if self.count > 0 else 0

        avg_observer = TempAverageObserver()
        self.station.register_observer(avg_observer)

        self.station.set_weather_data(20, 60, 1010, 10)
        self.station.set_weather_data(24, 65, 1015, 12)
        self.station.set_weather_data(26, 70, 1020, 15)

        avg = avg_observer.get_average()
        assert avg == (20 + 24 + 26) / 3

    def test_all_three_concrete_observers_coexist_without_interference(self):
        tracker = TrackingObserver()

        self.station.register_observer(self.temp_chart)
        self.station.register_observer(self.humidity_chart)
        self.station.register_observer(self.pressure_chart)
        self.station.register_observer(tracker)

        # Perform updates
        self.station.set_weather_data(18, 45, 1015, 10)
        self.station.set_weather_data(25, 70, 1020, 15)

        # All should have been notified
        assert len(tracker.updates) == 2

        # Reading history accessible to all
        readings = self.station.get_readings()
        assert len(readings) > 2


if __name__ == '__main__':
    pytest.main([__file__, '-v'])

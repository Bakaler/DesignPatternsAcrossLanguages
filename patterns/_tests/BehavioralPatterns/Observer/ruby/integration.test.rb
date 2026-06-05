#!/usr/bin/env ruby
# ============================================================
#  Integration Tests — Observer: Weather Station (Ruby)
#
#  What we test here:
#    · Full workflow with multiple observers
#    · Correct behavior across subscription lifecycle
#    · Data consistency across all observers
#    · Real-world scenario with mixed operations
#
#  Run: ruby -I../../../BehavioralPatterns/Observer/ruby integration_test.rb
# ============================================================

require 'minitest/autorun'

# Require the implementation file
require_relative '../../../../BehavioralPatterns/Observer/ruby/ruby.rb'


# Tracking Observer
class TrackingObserver
  include Observer

  attr_reader :updates

  def initialize
    @updates = []
  end

  def update(station)
    reading = station.get_current_reading
    @updates << {
      'temperature' => reading.temperature,
      'humidity' => reading.humidity,
      'pressure' => reading.pressure,
      'wind_speed' => reading.wind_speed,
    }
  end
end


# Custom Observers
class TempAverageObserver
  include Observer

  attr_reader :temp_sum, :count

  def initialize
    @temp_sum = 0
    @count = 0
  end

  def update(station)
    current = station.get_current_reading
    @temp_sum += current.temperature
    @count += 1
  end

  def get_average
    @count > 0 ? @temp_sum / @count : 0
  end
end


class ObserverIntegrationTest < Minitest::Test
  def setup
    @station = WeatherStation.new
    @temp_chart = TemperatureChart.new('Temp')
    @humidity_chart = HumidityChart.new('Humidity')
    @pressure_chart = PressureWindChart.new('Pressure')
    @tracker = TrackingObserver.new
  end

  def test_multiple_observers_track_multiple_updates
    @station.register_observer(@temp_chart)
    @station.register_observer(@humidity_chart)
    @station.register_observer(@pressure_chart)
    @station.register_observer(@tracker)

    @station.set_weather_data(18, 45, 1015, 10)
    @station.set_weather_data(22, 60, 1010, 8)
    @station.set_weather_data(25, 70, 1015, 12)

    assert_equal 3, @tracker.updates.length
    assert_in_delta 18, @tracker.updates[0]['temperature'], 0.01
    assert_in_delta 22, @tracker.updates[1]['temperature'], 0.01
    assert_in_delta 25, @tracker.updates[2]['temperature'], 0.01
  end

  def test_unsubscribe_mid_stream_stops_updates
    @station.register_observer(@tracker)

    @station.set_weather_data(18, 45, 1015, 10)
    assert_equal 1, @tracker.updates.length

    @station.remove_observer(@tracker)

    @station.set_weather_data(22, 60, 1010, 8)
    assert_equal 1, @tracker.updates.length # No new update

    @station.register_observer(@tracker)

    @station.set_weather_data(25, 70, 1015, 12)
    assert_equal 2, @tracker.updates.length # Resumes after re-subscribe
  end

  def test_all_observers_see_same_current_reading
    tracker1 = TrackingObserver.new
    tracker2 = TrackingObserver.new
    tracker3 = TrackingObserver.new

    @station.register_observer(tracker1)
    @station.register_observer(tracker2)
    @station.register_observer(tracker3)

    @station.set_weather_data(25, 70, 1015, 15)

    u1 = tracker1.updates[0]
    u2 = tracker2.updates[0]
    u3 = tracker3.updates[0]

    assert_equal u1['temperature'], u2['temperature']
    assert_equal u2['temperature'], u3['temperature']
    assert_equal u1['humidity'], u2['humidity']
    assert_equal u1['pressure'], u2['pressure']
  end

  def test_reading_history_remains_consistent_across_observer_lifespan
    tracker1 = TrackingObserver.new

    @station.register_observer(tracker1)
    @station.set_weather_data(18, 45, 1015, 10)
    @station.set_weather_data(22, 60, 1010, 8)

    # Get history at first observation point
    history1 = @station.get_readings

    @station.set_weather_data(25, 70, 1015, 12)

    # Get history after another update
    history2 = @station.get_readings

    assert history1.length < history2.length
    assert_in_delta history1[0].temperature, history2[0].temperature, 0.01
    assert_in_delta history1[1].temperature, history2[1].temperature, 0.01
  end

  def test_works_with_mixed_observer_subscribe_unsubscribe_sequence
    tracker1 = TrackingObserver.new
    tracker2 = TrackingObserver.new
    tracker3 = TrackingObserver.new

    # Day 1: Only tracker1
    @station.register_observer(tracker1)
    @station.set_weather_data(18, 45, 1015, 10)
    assert_equal 1, tracker1.updates.length
    assert_equal 0, tracker2.updates.length
    assert_equal 0, tracker3.updates.length

    # Day 2: Add tracker2
    @station.register_observer(tracker2)
    @station.set_weather_data(22, 60, 1010, 8)
    assert_equal 2, tracker1.updates.length
    assert_equal 1, tracker2.updates.length
    assert_equal 0, tracker3.updates.length

    # Day 3: Add tracker3, remove tracker1
    @station.register_observer(tracker3)
    @station.remove_observer(tracker1)
    @station.set_weather_data(25, 70, 1015, 12)
    assert_equal 2, tracker1.updates.length # Stopped
    assert_equal 2, tracker2.updates.length
    assert_equal 1, tracker3.updates.length

    # Day 4: Re-add tracker1
    @station.register_observer(tracker1)
    @station.set_weather_data(28, 75, 1020, 14)
    assert_equal 3, tracker1.updates.length # Resumed
    assert_equal 3, tracker2.updates.length
    assert_equal 2, tracker3.updates.length
  end

  def test_respects_10_reading_history_limit_across_observer_lifecycle
    tracker = TrackingObserver.new
    @station.register_observer(tracker)

    # Generate 15 readings
    15.times do |i|
      @station.set_weather_data(10 + i, 50 + i, 1010 + i, 10)
    end

    # Should have exactly 10 readings in history
    readings = @station.get_readings
    assert_equal 10, readings.length

    # Should be the last 10 updates
    assert_in_delta 15, readings[0].temperature, 0.01 # 10 + 5
    assert_in_delta 24, readings[9].temperature, 0.01 # 10 + 14
  end

  def test_supports_arbitrary_observer_implementations
    avg_observer = TempAverageObserver.new
    @station.register_observer(avg_observer)

    @station.set_weather_data(20, 60, 1010, 10)
    @station.set_weather_data(24, 65, 1015, 12)
    @station.set_weather_data(26, 70, 1020, 15)

    avg = avg_observer.get_average
    assert_in_delta (20 + 24 + 26) / 3.0, avg, 0.01
  end

  def test_all_three_concrete_observers_coexist_without_interference
    tracker = TrackingObserver.new

    @station.register_observer(@temp_chart)
    @station.register_observer(@humidity_chart)
    @station.register_observer(@pressure_chart)
    @station.register_observer(tracker)

    # Perform updates
    @station.set_weather_data(18, 45, 1015, 10)
    @station.set_weather_data(25, 70, 1020, 15)

    # All should have been notified
    assert_equal 2, tracker.updates.length

    # Reading history accessible to all
    readings = @station.get_readings
    assert readings.length > 2
  end
end

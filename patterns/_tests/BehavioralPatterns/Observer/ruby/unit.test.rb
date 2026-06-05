#!/usr/bin/env ruby
# ============================================================
#  Unit Tests — Observer: Weather Station (Ruby)
#
#  What we test here:
#    · Observer registration/removal mechanics
#    · Notification broadcast to all registered observers
#    · Pull model — observers get current readings
#    · Reading history maintained correctly
#    · Observer independence — removal doesn't affect others
#
#  Run: ruby -I../../../BehavioralPatterns/Observer/ruby unit_test.rb
# ============================================================

require 'minitest/autorun'

# Require the implementation file
require_relative '../../../../BehavioralPatterns/Observer/ruby/ruby.rb'


# Test Observer
class MockObserver
  include Observer

  attr_accessor :update_count, :last_station

  def initialize
    @update_count = 0
    @last_station = nil
  end

  def update(station)
    @update_count += 1
    @last_station = station
  end
end


class CustomObserver
  include Observer

  attr_accessor :called

  def initialize
    @called = false
  end

  def update(station)
    @called = true
  end
end


class ObserverUnitTest < Minitest::Test
  def setup
    @station = WeatherStation.new
    @observer1 = MockObserver.new
    @observer2 = MockObserver.new
  end

  # ── Observer Registration Tests
  def test_registers_a_single_observer
    @station.register_observer(@observer1)
    assert_equal 0, @observer1.update_count # No update yet
  end

  def test_prevents_duplicate_registration
    @station.register_observer(@observer1)
    @station.register_observer(@observer1) # Try again
    @station.set_weather_data(20, 60, 1010, 10)
    assert_equal 1, @observer1.update_count # Called only once
  end

  def test_removes_an_observer_from_the_list
    @station.register_observer(@observer1)
    @station.register_observer(@observer2)
    @station.remove_observer(@observer1)
    @station.set_weather_data(20, 60, 1010, 10)
    assert_equal 0, @observer1.update_count # Not notified
    assert_equal 1, @observer2.update_count # Still notified
  end

  # ── Notification Broadcast Tests
  def test_notifies_all_registered_observers
    obs3 = MockObserver.new
    @station.register_observer(@observer1)
    @station.register_observer(@observer2)
    @station.register_observer(obs3)

    @station.set_weather_data(25, 70, 1015, 15)

    assert_equal 1, @observer1.update_count
    assert_equal 1, @observer2.update_count
    assert_equal 1, obs3.update_count
  end

  def test_notifies_repeatedly_on_multiple_updates
    @station.register_observer(@observer1)

    @station.set_weather_data(20, 60, 1010, 10)
    assert_equal 1, @observer1.update_count

    @station.set_weather_data(25, 70, 1015, 15)
    assert_equal 2, @observer1.update_count

    @station.set_weather_data(30, 80, 1020, 20)
    assert_equal 3, @observer1.update_count
  end

  def test_passes_the_station_itself_to_update
    @station.register_observer(@observer1)
    @station.set_weather_data(25, 70, 1015, 15)

    assert_same @observer1.last_station, @station
  end

  # ── Pull Model Tests
  def test_get_current_reading_returns_latest_data
    @station.register_observer(@observer1)
    @station.set_weather_data(25, 70, 1015, 15)

    reading = @observer1.last_station.get_current_reading
    assert_in_delta 25, reading.temperature, 0.01
    assert_in_delta 70, reading.humidity, 0.01
    assert_in_delta 1015, reading.pressure, 0.01
    assert_in_delta 15, reading.wind_speed, 0.01
  end

  def test_get_readings_returns_full_history
    @station.register_observer(@observer1)

    @station.set_weather_data(20, 60, 1010, 10)
    @station.set_weather_data(25, 70, 1015, 15)
    @station.set_weather_data(30, 80, 1020, 20)

    readings = @observer1.last_station.get_readings
    assert_equal 4, readings.length # initial + 3 updates
    assert_in_delta 22, readings[0].temperature, 0.01 # initial
    assert_in_delta 30, readings[3].temperature, 0.01 # latest
  end

  def test_maintains_last_10_readings_max
    @station.register_observer(@observer1)

    12.times do |i|
      @station.set_weather_data(20 + i, 60, 1010, 10)
    end

    readings = @observer1.last_station.get_readings
    assert_equal 10, readings.length
  end

  # ── Concrete Observers Tests
  def test_temperature_chart_registers_and_updates
    chart = TemperatureChart.new('Test Temp')
    @station.register_observer(chart)
    @station.set_weather_data(25, 70, 1015, 15) # Should not raise
  end

  def test_humidity_chart_registers_and_updates
    chart = HumidityChart.new('Test Humidity')
    @station.register_observer(chart)
    @station.set_weather_data(25, 70, 1015, 15) # Should not raise
  end

  def test_pressure_wind_chart_registers_and_updates
    chart = PressureWindChart.new('Test Pressure')
    @station.register_observer(chart)
    @station.set_weather_data(25, 70, 1015, 15) # Should not raise
  end

  def test_all_three_can_register_together
    temp = TemperatureChart.new('Temp')
    humid = HumidityChart.new('Humidity')
    pressure = PressureWindChart.new('Pressure')

    @station.register_observer(temp)
    @station.register_observer(humid)
    @station.register_observer(pressure)

    @station.set_weather_data(25, 70, 1015, 15) # Should not raise
  end

  # ── Loose Coupling Tests
  def test_observers_are_independent
    obs3 = MockObserver.new
    @station.register_observer(@observer1)
    @station.register_observer(@observer2)
    @station.register_observer(obs3)

    @station.remove_observer(@observer2)
    @station.set_weather_data(25, 70, 1015, 15)

    assert_equal 1, @observer1.update_count
    assert_equal 0, @observer2.update_count # Never notified
    assert_equal 1, obs3.update_count
  end

  def test_dynamic_subscription
    @station.set_weather_data(20, 60, 1010, 10) # Before registration

    @station.register_observer(@observer1)
    @station.set_weather_data(25, 70, 1015, 15) # After registration

    assert_equal 1, @observer1.update_count # Only the second one

    @station.remove_observer(@observer1)
    @station.set_weather_data(30, 80, 1020, 20) # After removal

    assert_equal 1, @observer1.update_count # Still only one
  end

  def test_station_does_not_depend_on_concrete_observer_types
    custom = CustomObserver.new
    @station.register_observer(custom)
    @station.set_weather_data(25, 70, 1015, 15)

    assert custom.called
  end
end

#!/usr/bin/env ruby
# ============================================================
#  Observer Pattern: Weather Station Live Dashboard
#  Run: ruby ruby.rb
# ============================================================
#
#  Participants
#  ────────────────────────────────────────────────────────
#  Subject (WeatherStation)  maintains list of observers,
#                            notifies them of state changes
#  Observer (Module)         defines update() interface
#  ConcreteObservers         TemperatureChart, HumidityChart,
#                            PressureWindChart
#  ConcreteSubject           WeatherStation holds weather data
#
#  Problem
#  ────────────────────────────────────────────────────────
#  A weather station produces readings (temperature, humidity,
#  pressure, wind speed) that need to display on multiple
#  charts. When the station gets a new reading, all charts
#  must update automatically without tight coupling.
#
#  Solution: Observer Pattern
#  ────────────────────────────────────────────────────────
#  WeatherStation (Subject) maintains a list of Observer
#  objects. When new weather data arrives, WeatherStation
#  notifies all observers via update(). Each observer pulls
#  the data it needs from the Subject.
#
#  Consequences demonstrated
#  ────────────────────────────────────────────────────────
#  Loose coupling       observers know only the Subject interface
#  Dynamic updates      add/remove observers at runtime
#  Broadcast updates    one notification reaches all observers
#  Automatic sync       observers sync without polling
# ============================================================


# SECTION:: WeatherData Class
class WeatherData
  attr_reader :temperature, :humidity, :pressure, :wind_speed

  def initialize(temperature, humidity, pressure, wind_speed)
    @temperature = (temperature * 10).round / 10.0    # 10-35°C
    @humidity = (humidity * 10).round / 10.0          # 0-100%
    @pressure = (pressure * 10).round / 10.0          # 950-1050 hPa
    @wind_speed = (wind_speed * 10).round / 10.0      # 0-50 km/h
  end
end


# SECTION:: Observer Module
module Observer
  def update(station)
    raise NotImplementedError, "Subclasses must implement update()"
  end
end


# SECTION:: Subject - WeatherStation
class WeatherStation
  def initialize
    @observers = []
    @readings = []
    @current_reading = WeatherData.new(22, 65, 1013, 12)
    @readings << @current_reading
  end

  # Observer registration
  def register_observer(observer)
    @observers << observer unless @observers.include?(observer)
  end

  def remove_observer(observer)
    @observers.delete(observer)
  end

  # Notify all observers of state change
  private def notify_observers
    @observers.each { |observer| observer.update(self) }
  end

  # Set new weather reading and notify
  def set_weather_data(temperature, humidity, pressure, wind_speed)
    @current_reading = WeatherData.new(temperature, humidity, pressure, wind_speed)

    # Keep last 10 readings
    @readings << @current_reading
    @readings.shift if @readings.length > 10

    notify_observers
  end

  # Observers pull data when they update
  def get_current_reading
    @current_reading
  end

  def get_readings
    @readings.dup
  end

  def observer_count
    @observers.length
  end
end


# SECTION:: Concrete Observer - TemperatureChart
class TemperatureChart
  include Observer

  def initialize(name)
    @name = name
  end

  def update(station)
    readings = station.get_readings
    temps = readings.map { |r| "#{r.temperature}°C" }.join(', ')
    puts "#{@name} updated: temps #{temps}"
  end
end


# SECTION:: Concrete Observer - HumidityChart
class HumidityChart
  include Observer

  def initialize(name)
    @name = name
  end

  def update(station)
    current = station.get_current_reading
    puts "#{@name} updated: humidity #{current.humidity}%"
  end
end


# SECTION:: Concrete Observer - PressureWindChart
class PressureWindChart
  include Observer

  def initialize(name)
    @name = name
  end

  def update(station)
    current = station.get_current_reading
    puts "#{@name} updated: pressure #{current.pressure}hPa, wind #{current.wind_speed}km/h"
  end
end


# SECTION:: Demo
def main
  puts "Weather Station Observer Pattern Demo\n"

  # Create the subject
  station = WeatherStation.new

  # Create and register observers (charts)
  temp_chart = TemperatureChart.new('Temperature Chart')
  humidity_chart = HumidityChart.new('Humidity Gauge')
  pressure_chart = PressureWindChart.new('Pressure & Wind Chart')

  station.register_observer(temp_chart)
  station.register_observer(humidity_chart)
  station.register_observer(pressure_chart)

  puts "→ Day 1: All charts registered. New reading...\n"
  station.set_weather_data(18, 45, 1015, 10)

  puts "\n→ Day 2: Temperature drops, humidity rises...\n"
  station.set_weather_data(15, 75, 1018, 15)

  puts "\n→ Day 3: Pressure and wind spike...\n"
  station.set_weather_data(22, 55, 1005, 35)

  puts "\n→ Humidity chart unsubscribes...\n"
  station.remove_observer(humidity_chart)

  puts "→ Day 4: Only temp and pressure charts update...\n"
  station.set_weather_data(25, 40, 1010, 8)

  puts "\n✓ Demo complete. Observer pattern decouples the"
  puts "  weather station (subject) from charts (observers)."
  puts "  Charts subscribe/unsubscribe dynamically."
end

main if __FILE__ == $PROGRAM_NAME

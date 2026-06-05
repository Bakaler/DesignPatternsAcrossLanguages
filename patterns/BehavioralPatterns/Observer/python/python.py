#!/usr/bin/env python3
# ============================================================
#  Observer Pattern: Weather Station Live Dashboard
#  Run: python python.py
# ============================================================
#
#  Participants
#  ────────────────────────────────────────────────────────
#  Subject (WeatherStation)  maintains list of observers,
#                            notifies them of state changes
#  Observer (ABC)            defines update() interface
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

from abc import ABC, abstractmethod
from typing import List, Dict, Any


# SECTION:: WeatherData Type
class WeatherData:
    """Data class to hold weather readings"""
    def __init__(self, temperature: float, humidity: float, pressure: float, wind_speed: float):
        self.temperature = temperature    # 10-35°C
        self.humidity = humidity          # 0-100%
        self.pressure = pressure          # 950-1050 hPa
        self.wind_speed = wind_speed      # 0-50 km/h

    def to_dict(self) -> Dict[str, float]:
        return {
            'temperature': self.temperature,
            'humidity': self.humidity,
            'pressure': self.pressure,
            'windSpeed': self.wind_speed,
        }


# SECTION:: Observer Interface
class Observer(ABC):
    """Abstract observer interface"""
    @abstractmethod
    def update(self, station: 'WeatherStation') -> None:
        pass


# SECTION:: Subject - WeatherStation
class WeatherStation:
    """Subject that notifies observers of weather changes"""

    def __init__(self):
        self._observers: List[Observer] = []
        self._readings: List[WeatherData] = []
        self._current_reading = WeatherData(22, 65, 1013, 12)
        self._readings.append(self._current_reading)

    def register_observer(self, observer: Observer) -> None:
        """Register an observer"""
        if observer not in self._observers:
            self._observers.append(observer)

    def remove_observer(self, observer: Observer) -> None:
        """Remove an observer"""
        if observer in self._observers:
            self._observers.remove(observer)

    def _notify_observers(self) -> None:
        """Notify all observers of state change"""
        for observer in self._observers:
            observer.update(self)

    def set_weather_data(self, temperature: float, humidity: float, pressure: float, wind_speed: float) -> None:
        """Set new weather reading and notify observers"""
        self._current_reading = WeatherData(
            round(temperature, 1),
            round(humidity, 1),
            round(pressure, 1),
            round(wind_speed, 1)
        )

        # Keep last 10 readings
        self._readings.append(self._current_reading)
        if len(self._readings) > 10:
            self._readings.pop(0)

        self._notify_observers()

    def get_current_reading(self) -> WeatherData:
        """Get current weather reading (pull model)"""
        return self._current_reading

    def get_readings(self) -> List[WeatherData]:
        """Get all historical readings (pull model)"""
        return list(self._readings)


# SECTION:: Concrete Observer - TemperatureChart
class TemperatureChart(Observer):
    """Concrete observer that tracks temperature"""

    def __init__(self, name: str):
        self.name = name

    def update(self, station: WeatherStation) -> None:
        readings = station.get_readings()
        temps = [str(r.temperature) + '°C' for r in readings]
        print(f"{self.name} updated: temps {', '.join(temps)}")


# SECTION:: Concrete Observer - HumidityChart
class HumidityChart(Observer):
    """Concrete observer that tracks humidity"""

    def __init__(self, name: str):
        self.name = name

    def update(self, station: WeatherStation) -> None:
        current = station.get_current_reading()
        print(f"{self.name} updated: humidity {current.humidity}%")


# SECTION:: Concrete Observer - PressureWindChart
class PressureWindChart(Observer):
    """Concrete observer that tracks pressure and wind"""

    def __init__(self, name: str):
        self.name = name

    def update(self, station: WeatherStation) -> None:
        current = station.get_current_reading()
        print(f"{self.name} updated: pressure {current.pressure}hPa, wind {current.wind_speed}km/h")


# SECTION:: Demo
def main():
    print('Weather Station Observer Pattern Demo\n')

    # Create the subject
    station = WeatherStation()

    # Create and register observers (charts)
    temp_chart = TemperatureChart('Temperature Chart')
    humidity_chart = HumidityChart('Humidity Gauge')
    pressure_chart = PressureWindChart('Pressure & Wind Chart')

    station.register_observer(temp_chart)
    station.register_observer(humidity_chart)
    station.register_observer(pressure_chart)

    print('→ Day 1: All charts registered. New reading...\n')
    station.set_weather_data(18, 45, 1015, 10)

    print('\n→ Day 2: Temperature drops, humidity rises...\n')
    station.set_weather_data(15, 75, 1018, 15)

    print('\n→ Day 3: Pressure and wind spike...\n')
    station.set_weather_data(22, 55, 1005, 35)

    print('\n→ Humidity chart unsubscribes...\n')
    station.remove_observer(humidity_chart)

    print('→ Day 4: Only temp and pressure charts update...\n')
    station.set_weather_data(25, 40, 1010, 8)

    print('\n✓ Demo complete. Observer pattern decouples the')
    print('  weather station (subject) from charts (observers).')
    print('  Charts subscribe/unsubscribe dynamically.')


if __name__ == '__main__':
    main()

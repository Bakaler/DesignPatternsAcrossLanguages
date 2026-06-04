import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// SECTION:: Observer Interface
interface Observer {
  update(station: WeatherStation): void;
}

// SECTION:: Weather Data Type
interface WeatherReading {
  temperature: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
}

// SECTION:: WeatherStation (Subject)
class WeatherStation {
  private temperatureObservers: Observer[] = [];
  private humidityObservers: Observer[] = [];
  private pressureObservers: Observer[] = [];
  private readings: WeatherReading[] = [];
  private currentReading: WeatherReading;

  constructor() {
    // Default initial reading
    this.currentReading = {
      temperature: 22,
      humidity: 65,
      pressure: 1013,
      windSpeed: 12,
    };
    this.readings = [this.currentReading];
  }

  registerObserver(observer: Observer, metric: 'temperature' | 'humidity' | 'pressure' = 'temperature'): void {
    if (metric === 'temperature') {
      if (!this.temperatureObservers.includes(observer)) this.temperatureObservers.push(observer);
    } else if (metric === 'humidity') {
      if (!this.humidityObservers.includes(observer)) this.humidityObservers.push(observer);
    } else if (metric === 'pressure') {
      if (!this.pressureObservers.includes(observer)) this.pressureObservers.push(observer);
    }
  }

  removeObserver(observer: Observer): void {
    [this.temperatureObservers, this.humidityObservers, this.pressureObservers].forEach(list => {
      const index = list.indexOf(observer);
      if (index > -1) list.splice(index, 1);
    });
  }

  private notifyTemperatureObservers(): void {
    this.temperatureObservers.forEach(observer => observer.update(this));
  }

  private notifyHumidityObservers(): void {
    this.humidityObservers.forEach(observer => observer.update(this));
  }

  private notifyPressureObservers(): void {
    this.pressureObservers.forEach(observer => observer.update(this));
  }

  setWeatherData(
    temperature: number,
    humidity: number,
    pressure: number,
    windSpeed: number
  ): void {
    this.currentReading = {
      temperature: Math.round(temperature * 10) / 10,
      humidity: Math.round(humidity * 10) / 10,
      pressure: Math.round(pressure * 10) / 10,
      windSpeed: Math.round(windSpeed * 10) / 10,
    };

    this.readings.push(this.currentReading);
    if (this.readings.length > 10) {
      this.readings.shift();
    }

    this.notifyTemperatureObservers();
    this.notifyHumidityObservers();
    this.notifyPressureObservers();
  }

  updateTemperature(temperature: number): void {
    this.currentReading.temperature = Math.round(temperature * 10) / 10;
    this.readings[this.readings.length - 1] = this.currentReading;
    this.notifyTemperatureObservers();
  }

  updateHumidity(humidity: number): void {
    this.currentReading.humidity = Math.round(humidity * 10) / 10;
    this.readings[this.readings.length - 1] = this.currentReading;
    this.notifyHumidityObservers();
  }

  updatePressure(pressure: number): void {
    this.currentReading.pressure = Math.round(pressure * 10) / 10;
    this.readings[this.readings.length - 1] = this.currentReading;
    this.notifyPressureObservers();
  }

  updateWindSpeed(windSpeed: number): void {
    this.currentReading.windSpeed = Math.round(windSpeed * 10) / 10;
    this.readings[this.readings.length - 1] = this.currentReading;
    this.notifyPressureObservers();
  }

  getCurrentReading(): WeatherReading {
    return this.currentReading;
  }

  getReadings(): WeatherReading[] {
    return [...this.readings];
  }
}

@Component({
  selector: 'app-observer-weather-demo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './observer-weather-demo.component.html',
  styleUrl: './observer-weather-demo.component.css',
})
export class ObserverWeatherDemoComponent implements OnInit {
  @ViewChild('tempBeeper') tempBeeper!: ElementRef;
  @ViewChild('humidityBeeper') humidityBeeper!: ElementRef;
  @ViewChild('pressureBeeper') pressureBeeper!: ElementRef;
  @ViewChild('tagTemp') tagTemp!: ElementRef;
  @ViewChild('tagHumidity') tagHumidity!: ElementRef;
  @ViewChild('tagPressure') tagPressure!: ElementRef;

  station: WeatherStation | null = null;

  // Control lock
  buttonsLocked: boolean = false;
  private lockDuration = 2500; // 2.5 seconds (covers all 4 beats)
  activeInputWires: string[] = []; // Input wires (control → station)
  activeOutputWires: string[] = []; // Output wires (station → charts)

  // Observer glow state
  observerGlow = {
    temp: false,
    humidity: false,
    pressure: false,
  };

  // Chart gleaming states
  chartGleaming = {
    temp: false,
    humidity: false,
    pressure: false,
  };

  // Form controls
  temperature: number = 22;
  humidity: number = 65;
  pressure: number = 1013;
  windSpeed: number = 12;

  // Last submitted values (for individual submissions)
  lastTemperature: number = 22;
  lastHumidity: number = 65;
  lastPressure: number = 1013;
  lastWindSpeed: number = 12;

  // Chart data
  temperatureData: number[] = [];
  humidityData: number[] = [];
  pressureData: number[] = [];
  windSpeedData: number[] = [];
  dayLabels: string[] = [];

  // Constraints
  temperatureMin = 10;
  temperatureMax = 35;
  humidityMin = 0;
  humidityMax = 100;
  pressureMin = 950;
  pressureMax = 1050;
  windSpeedMin = 0;
  windSpeedMax = 50;

  private dayCounter = 1;
  private audioContext: AudioContext | null = null;
  soundEnabled = true;

  ngOnInit(): void {
    this.initializeStation();
    this.generateDefaultReadings();
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      this.soundEnabled = false;
    }
  }

  private playTone(frequency: number, duration: number): void {
    if (!this.soundEnabled || !this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    oscillator.connect(gain);
    gain.connect(this.audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';

    gain.gain.setValueAtTime(0.2, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  private initializeStation(): void {
    this.station = new WeatherStation();
    this.station.getReadings(); // Clear default reading

    // Create observers
    const tempObserver: Observer = {
      update: (station: WeatherStation) => {
        this.updateTemperatureChart(station);
      },
    };

    const humidityObserver: Observer = {
      update: (station: WeatherStation) => {
        this.updateHumidityChart(station);
      },
    };

    const pressureObserver: Observer = {
      update: (station: WeatherStation) => {
        this.updatePressureChart(station);
      },
    };

    // Register observers for specific metrics
    this.station.registerObserver(tempObserver, 'temperature');
    this.station.registerObserver(humidityObserver, 'humidity');
    this.station.registerObserver(pressureObserver, 'pressure');

    // Initialize with default reading
    this.updateCharts();
  }

  private generateDefaultReadings(): void {
    if (!this.station) return;
    // Generate 10 days of realistic weather data
    const readings = [
      { temp: 18, humid: 45, press: 1015, wind: 10 },
      { temp: 16, humid: 52, press: 1016, wind: 12 },
      { temp: 14, humid: 60, press: 1014, wind: 8 },
      { temp: 17, humid: 55, press: 1012, wind: 15 },
      { temp: 20, humid: 48, press: 1010, wind: 18 },
      { temp: 22, humid: 42, press: 1013, wind: 12 },
      { temp: 21, humid: 50, press: 1015, wind: 10 },
      { temp: 19, humid: 58, press: 1014, wind: 14 },
      { temp: 18, humid: 62, press: 1011, wind: 16 },
      { temp: 20, humid: 55, press: 1013, wind: 11 },
    ];
    readings.forEach(r =>
      this.station!.setWeatherData(r.temp, r.humid, r.press, r.wind)
    );
    // Set last submitted values to the final reading
    const last = readings[readings.length - 1];
    this.lastTemperature = last.temp;
    this.lastHumidity = last.humid;
    this.lastPressure = last.press;
    this.lastWindSpeed = last.wind;
  }

  private updateTemperatureChart(station: WeatherStation): void {
    const readings = station.getReadings();
    this.temperatureData = readings.map((r) => r.temperature);
  }

  private updateHumidityChart(station: WeatherStation): void {
    const readings = station.getReadings();
    this.humidityData = readings.map((r) => r.humidity);
  }

  private updatePressureChart(station: WeatherStation): void {
    const readings = station.getReadings();
    this.pressureData = readings.map((r) => r.pressure);
    this.windSpeedData = readings.map((r) => r.windSpeed);
  }

  private triggerBeeper(beeper: ElementRef): void {
    if (!beeper) return;
    const el = beeper.nativeElement as HTMLElement;
    el.classList.remove('observing');
    // Trigger reflow to restart animation
    void el.offsetWidth;
    el.classList.add('observing');
  }

  private lockButtons(): void {
    this.buttonsLocked = true;
    setTimeout(() => {
      this.buttonsLocked = false;
    }, this.lockDuration);
  }

  private glowObserverTag(tagRef: ElementRef, metric: 'temp' | 'humidity' | 'pressure'): void {
    if (!tagRef) return;
    this.observerGlow[metric] = true;
    setTimeout(() => {
      this.observerGlow[metric] = false;
    }, 600);
  }

  private updateCharts(): void {
    if (!this.station) return;
    const readings = this.station.getReadings();
    this.dayLabels = Array.from(
      { length: readings.length },
      (_, i) => `Day ${i + 1}`
    );
    this.updateTemperatureChart(this.station);
    this.updateHumidityChart(this.station);
    this.updatePressureChart(this.station);
  }

  submitDay(): void {
    if (!this.station || this.buttonsLocked) return;

    this.activeInputWires = ['wire-temp', 'wire-humidity', 'wire-pressure', 'wire-wind'];
    this.playTone(300, 0.2); // Beat 1 - low tone (input)
    this.lockButtons();

    setTimeout(() => {
      this.playTone(400, 0.2); // Beat 2 - medium tone (station processing)
      this.glowObserverTag(this.tagTemp, 'temp');
      this.glowObserverTag(this.tagHumidity, 'humidity');
      this.glowObserverTag(this.tagPressure, 'pressure');
    }, 500);

    setTimeout(() => {
      this.playTone(500, 0.2); // Beat 3 - high tone (output)
      this.activeInputWires = [];
      this.activeOutputWires = ['wire-temp', 'wire-humidity', 'wire-pressure', 'wire-wind'];
      // Trigger beepers on third beat
      this.triggerBeeper(this.tempBeeper);
      this.triggerBeeper(this.humidityBeeper);
      this.triggerBeeper(this.pressureBeeper);
    }, 1000);

    setTimeout(() => {
      this.playTone(600, 0.2); // Beat 4 - highest tone (display complete)
      // Update data on fourth beat
      this.station!.setWeatherData(
        this.temperature,
        this.humidity,
        this.pressure,
        this.windSpeed
      );
      this.chartGleaming.temp = true;
      this.chartGleaming.humidity = true;
      this.chartGleaming.pressure = true;
    }, 1500);

    setTimeout(() => {
      this.activeOutputWires = [];
    }, 1800);

    setTimeout(() => {
      this.chartGleaming.temp = false;
      this.chartGleaming.humidity = false;
      this.chartGleaming.pressure = false;
    }, 2100);

    this.lastTemperature = this.temperature;
    this.lastHumidity = this.humidity;
    this.lastPressure = this.pressure;
    this.lastWindSpeed = this.windSpeed;

    // Randomize values after everything completes
    setTimeout(() => {
      this.temperature = Math.random() * (this.temperatureMax - this.temperatureMin) + this.temperatureMin;
      this.humidity = Math.random() * this.humidityMax;
      this.pressure = Math.random() * (this.pressureMax - this.pressureMin) + this.pressureMin;
      this.windSpeed = Math.random() * this.windSpeedMax;
    }, 2100);

    this.dayCounter++;
  }

  submitTemperature(): void {
    if (!this.station || this.buttonsLocked) return;
    this.activeInputWires = ['wire-temp'];
    this.playTone(300, 0.2);
    this.lockButtons();
    setTimeout(() => {
      this.playTone(400, 0.2);
      this.glowObserverTag(this.tagTemp, 'temp');
    }, 500);
    setTimeout(() => {
      this.playTone(500, 0.2);
      this.activeInputWires = [];
      this.activeOutputWires = ['wire-temp'];
      this.triggerBeeper(this.tempBeeper);
    }, 1000);
    setTimeout(() => {
      this.playTone(600, 0.2);
      this.station!.updateTemperature(this.temperature);
      this.chartGleaming.temp = true;
    }, 1500);
    setTimeout(() => {
      this.activeOutputWires = [];
    }, 1800);
    setTimeout(() => {
      this.chartGleaming.temp = false;
    }, 2100);
    this.temperature = Math.random() * (this.temperatureMax - this.temperatureMin) + this.temperatureMin;
  }

  submitHumidity(): void {
    if (!this.station || this.buttonsLocked) return;
    this.activeInputWires = ['wire-humidity'];
    this.playTone(300, 0.2);
    this.lockButtons();
    setTimeout(() => {
      this.playTone(400, 0.2);
      this.glowObserverTag(this.tagHumidity, 'humidity');
    }, 500);
    setTimeout(() => {
      this.playTone(500, 0.2);
      this.activeInputWires = [];
      this.activeOutputWires = ['wire-humidity'];
      this.triggerBeeper(this.humidityBeeper);
    }, 1000);
    setTimeout(() => {
      this.playTone(600, 0.2);
      this.station!.updateHumidity(this.humidity);
      this.chartGleaming.humidity = true;
    }, 1500);
    setTimeout(() => {
      this.activeOutputWires = [];
    }, 1800);
    setTimeout(() => {
      this.chartGleaming.humidity = false;
    }, 2100);
    this.humidity = Math.random() * 100;
  }

  submitPressure(): void {
    if (!this.station || this.buttonsLocked) return;
    this.activeInputWires = ['wire-pressure'];
    this.playTone(300, 0.2);
    this.lockButtons();
    setTimeout(() => {
      this.playTone(400, 0.2);
      this.glowObserverTag(this.tagPressure, 'pressure');
    }, 500);
    setTimeout(() => {
      this.playTone(500, 0.2);
      this.activeInputWires = [];
      this.activeOutputWires = ['wire-pressure'];
      this.triggerBeeper(this.pressureBeeper);
    }, 1000);
    setTimeout(() => {
      this.playTone(600, 0.2);
      this.station!.updatePressure(this.pressure);
      this.chartGleaming.pressure = true;
    }, 1500);
    setTimeout(() => {
      this.activeOutputWires = [];
    }, 1800);
    setTimeout(() => {
      this.chartGleaming.pressure = false;
    }, 2100);
    this.pressure = Math.random() * (this.pressureMax - this.pressureMin) + this.pressureMin;
  }

  submitWindSpeed(): void {
    if (!this.station || this.buttonsLocked) return;
    this.activeInputWires = ['wire-wind'];
    this.playTone(300, 0.2);
    this.lockButtons();
    setTimeout(() => {
      this.playTone(400, 0.2);
      this.glowObserverTag(this.tagPressure, 'pressure');
    }, 500);
    setTimeout(() => {
      this.playTone(500, 0.2);
      this.activeInputWires = [];
      this.activeOutputWires = ['wire-wind'];
      this.triggerBeeper(this.pressureBeeper);
    }, 1000);
    setTimeout(() => {
      this.playTone(600, 0.2);
      this.station!.updateWindSpeed(this.windSpeed);
      this.chartGleaming.pressure = true;
    }, 1500);
    setTimeout(() => {
      this.activeOutputWires = [];
    }, 1800);
    setTimeout(() => {
      this.chartGleaming.pressure = false;
    }, 2100);
    this.windSpeed = Math.random() * this.windSpeedMax;
  }

  randomizeValues(): void {
    this.temperature = Math.random() * (this.temperatureMax - this.temperatureMin) + this.temperatureMin;
    this.humidity = Math.random() * 100;
    this.pressure = Math.random() * (this.pressureMax - this.pressureMin) + this.pressureMin;
    this.windSpeed = Math.random() * this.windSpeedMax;
  }

  reset(): void {
    if (this.buttonsLocked) return;
    this.temperature = 22;
    this.humidity = 65;
    this.pressure = 1013;
    this.windSpeed = 12;
    this.lastTemperature = 22;
    this.lastHumidity = 65;
    this.lastPressure = 1013;
    this.lastWindSpeed = 12;
    this.dayCounter = 1;
    this.initializeStation();
    this.generateDefaultReadings();
    this.updateCharts();
  }

  getTemperaturePath(): string {
    if (this.temperatureData.length === 0) return '';

    const points = this.temperatureData.map((temp, index) => {
      const x = (index / (this.temperatureData.length - 1 || 1)) * 300;
      const y = 100 - ((temp - this.temperatureMin) / (this.temperatureMax - this.temperatureMin)) * 100;
      return `${x},${y}`;
    });

    return points.join(' ');
  }
}

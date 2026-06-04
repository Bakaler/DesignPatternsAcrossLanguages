# Observer Pattern — Weather Station Live Dashboard

## Intent

Define a one-to-many dependency between objects such that when one object changes state, all its dependents are notified automatically and update themselves. This pattern promotes loose coupling: the subject knows nothing about the structure of its observers, and observers can be added or removed dynamically.

## Problem

A weather station collects readings (temperature, humidity, pressure, wind speed) that multiple charts need to display and keep in sync. If each chart polls the station continuously, it wastes CPU. If the station pushes data directly to each chart, it becomes tightly coupled to their interfaces.

**How can we decouple data source from data consumers?**

## Solution: Observer Pattern

The `WeatherStation` (Subject) maintains a list of observers and calls their `update()` method whenever its state changes. Each observer (Chart) decides what to do with the notification — some display temperature history, others show a current humidity gauge, etc.

### Key Insight

When the subject notifies observers, it **does not send the data**. Instead, observers get a reference to the subject and **pull the data they need**. This gives observers fine-grained control without forcing the subject to know how many observers exist or what they'll do with the data.

## Participants

| Role | Class(es) | Responsibility |
|---|---|---|
| **Subject** | `WeatherStation` | Maintains observer list, notifies on state change |
| **Observer** (interface) | `Observer` | Defines `update(subject)` contract |
| **Concrete Observers** | `TemperatureChart`, `HumidityChart`, `PressureWindChart` | Implement `update()`, pull data from subject |

## Behavior Flow

### Step 1: Registration
```
station.registerObserver(tempChart)
station.registerObserver(humidityChart)
```

### Step 2: State Change
```
station.setWeatherData(22°C, 65%, 1013hPa, 12km/h)
```

### Step 3: Notification
```
notifyObservers() calls:
  → tempChart.update(station)
  → humidityChart.update(station)
```

### Step 4: Observers Pull Data
```
tempChart.update():
  readings = station.getReadings()
  display temperature line chart

humidityChart.update():
  current = station.getCurrentReading()
  display humidity gauge at 65%
```

## Consequences

- **✓ Loose coupling** — subject & observers are independent
- **✓ Dynamic updates** — add/remove observers at runtime
- **✓ Broadcast** — one notification reaches all observers
- **✓ Automatic synchronization** — no polling needed

## Real-World Examples

| Domain | Subject | Observers |
|---|---|---|
| **UI Events** | Button | Click handlers, logging, analytics |
| **MVC/MVVM** | Model | Views (auto-sync on data change) |
| **Event Emitters** | Event source | Event listeners (Node.js, browsers) |
| **Pub/Sub** | Message broker | Subscribers |
| **Reactive streams** | Observable | Subscribers (RxJS, Reactor) |

## Pattern Variants

### 1. Push Model (shown above)
- Subject sends data: `observer.update(data)`
- **Pro:** Less coupling, observer doesn't need subject reference
- **Con:** Subject must know which data observers need

### 2. Pull Model (more common)
- Subject notifies only: `observer.update(subject)`
- **Pro:** Flexible, observers pull only what they need
- **Con:** Observers must know subject interface

### 3. Event-Driven Variant
- Subject publishes named events: `notify('temperature-changed')`
- Observers subscribe to specific events
- **Pro:** Fine-grained control, can ignore unneeded events
- **Con:** More boilerplate, harder to trace

## Key Takeaway

**Observer decouples producers from consumers.** The subject doesn't care who listens—observers are pluggable. When you need one-to-many notifications with dynamic subscription, Observer is your pattern.

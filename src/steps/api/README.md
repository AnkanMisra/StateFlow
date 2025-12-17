# api/ – API Steps

HTTP endpoint handlers.

## Steps

| Step | Endpoint | Method | Purpose |
|------|----------|--------|---------|
| `api.sensor.ingest` | `/api/sensor/ingest` | POST | Ingest sensor readings |
| `api.user.preferences` | `/api/user/preferences` | POST | Update user thresholds |

## Usage

```bash
# Ingest a sensor reading
curl -X POST http://localhost:3000/api/sensor/ingest \
  -H "Content-Type: application/json" \
  -d '{"sensorId": "sensor-1", "value": 50}'

# Set user preferences
curl -X POST http://localhost:3000/api/user/preferences \
  -H "Content-Type: application/json" \
  -d '{"thresholds": {"dailyMax": 100}}'
```

## State Written

- `sensors/{sensorId}` – Latest sensor reading
- `usage/raw/{timestamp}` – Raw usage record
- `user/preferences` – User threshold configuration

## Events Emitted

- `sensor.reading.created` – Triggers downstream processing

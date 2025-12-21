# StateFlow Demo - Curl Commands Guide

This document lists the curl commands used during demos and explains what each command demonstrates.

---

## 1. Trigger Full Optimization (Primary Demo)

### Command
```bash
curl -X POST http://localhost:3000/api/sensor/ingest \
  -H "Content-Type: application/json" \
  -d '{"sensorId":"sensor-001","value":150,"unit":"kWh","type":"energy"}'
```

### What This Shows
- Ingests a single IoT sensor reading via the public API
- Value exceeds the daily threshold (100 kWh default)
- Triggers the entire backend pipeline:
  - Event processing
  - Workflow orchestration
  - AI decision (Gemini or fallback)
  - Background job execution
  - Real-time streaming updates


---

## 2. Idempotency Check (Duplicate Prevention)

### Command
```bash
curl -X POST http://localhost:3000/api/sensor/ingest \
  -H "Content-Type: application/json" \
  -d '{"sensorId":"sensor-001","value":160,"unit":"kWh","type":"energy"}'
```

### What This Shows
- Sends another high sensor reading on the same day
- Confirms no duplicate optimization is created
- The existing `optimizationTriggered` state prevents re-triggering
- Demonstrates idempotency and production safety


---

## 3. Normal Reading (No Optimization Path)

### Command
```bash
curl -X POST http://localhost:3000/api/sensor/ingest \
  -H "Content-Type: application/json" \
  -d '{"sensorId":"sensor-002","value":30,"unit":"kWh","type":"energy"}'
```

### What This Shows
- Ingests a low-value sensor reading
- Value stays below the threshold
- No workflow, AI, or job is triggered
- Confirms the system behaves correctly when no action is needed


---

## 4. Set Custom Threshold (Optional)

### Command
```bash
curl -X POST http://localhost:3000/api/user/preferences \
  -H "Content-Type: application/json" \
  -d '{"thresholds":{"dailyMax":50,"peakHourLimit":25},"costSensitivity":"high","automationLevel":"automatic"}'
```

### What This Shows
- Configures user preferences
- Sets a lower threshold (50 kWh) for easier triggering
- Demonstrates configurability

---

## Demo Notes

| Command | When to Use |
|---------|-------------|
| Command 1 | Every demo (primary flow) |
| Command 2 | Show robustness/idempotency |
| Command 3 | If asked about non-trigger scenarios |
| Command 4 | If asked about configurability |

---

## Deployed Version

For deployed demos, replace `http://localhost:3000` with your Motia Cloud API Gateway URL:

```bash
curl -X POST https://your-project.motia.cloud/api/sensor/ingest \
  -H "Content-Type: application/json" \
  -d '{"sensorId":"sensor-001","value":150,"unit":"kWh","type":"energy"}'
```

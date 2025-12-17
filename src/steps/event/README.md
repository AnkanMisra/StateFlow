# event/ – Event Steps

Event-driven processing Steps.

## Steps

| Step | Subscribes To | Emits | Purpose |
|------|--------------|-------|---------|
| `event.sensor.process` | `sensor.reading.created` | `optimization.required` | Aggregates usage, checks thresholds |

## Architecture

```
sensor.reading.created
        │
        ▼
┌───────────────────────────────────┐
│     event.sensor.process          │
│  ─────────────────────────────    │
│  1. Read usage/daily/{date}       │
│  2. Aggregate new reading         │
│  3. Read user/preferences         │
│  4. Compare against threshold     │
│  5. Emit optimization.required?   │
└───────────────────────────────────┘
        │
        ▼ (if exceeded)
optimization.required → workflow.energy.optimize
```

## Idempotency

This Step includes an **idempotency guard** to prevent duplicate `optimization.required` emissions on the same day:

1. Checks `usage/daily/{date}/optimizationTriggered`
2. If already triggered → skips emission
3. If not → sets flag BEFORE emitting (race-safe)

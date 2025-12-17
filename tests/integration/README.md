# integration/ – Integration Tests

Tests that verify Step handlers work correctly with mocked context.

## Test Files

| File | Step Under Test | Tests |
|------|----------------|-------|
| `api-sensor-ingest.test.ts` | `api.sensor.ingest` | 15 |
| `event-processing.test.ts` | `event.sensor.process` | 16 |
| `workflow-lifecycle.test.ts` | `workflow.energy.optimize` | 17 |

## Run

```bash
pnpm test
```

## Test Categories

### api-sensor-ingest.test.ts
- Input validation (missing fields, negative values)
- Default values (unit, type)
- State persistence
- Event emission
- Response structure

### event-processing.test.ts
- Daily usage aggregation
- Threshold checking
- **Idempotency guard** (critical!)
- Edge cases: boundaries, multiple sensors, threshold updates

### workflow-lifecycle.test.ts
- State transitions (RECEIVED → COMPLETED)
- Decision persistence
- Deterministic analysis tiers
- Extreme values and state isolation

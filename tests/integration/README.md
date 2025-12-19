# integration/ – Integration Tests

Tests that verify Step handlers work correctly with mocked context.

## Test Files

| File | Step Under Test | Tests |
|------|----------------|-------|
| `api-sensor-ingest.test.ts` | `api.sensor.ingest` | 15 |
| `event-processing.test.ts` | `event.sensor.process` | 16 |
| `gemini-analyzer.test.ts` | `gemini-analyzer` | 21 |
| `workflow-lifecycle.test.ts` | `workflow.energy.optimize` | 17 |

Total: 69 tests

## Run

```bash
pnpm test
```

## Test Categories

### api-sensor-ingest.test.ts
- Input validation (missing fields, negative values)
- Default values (unit, type)
- State persistence and event emission

### event-processing.test.ts
- Daily usage aggregation
- Threshold checking
- Idempotency guard (critical)

### gemini-analyzer.test.ts (Phase 3)
- `isGeminiAvailable()` checks
- Fallback behavior when no API key
- Decision logic tiers
- Edge cases

### workflow-lifecycle.test.ts
- State transitions (RECEIVED to COMPLETED)
- AI-powered analysis (Phase 3)
- Extreme values and isolation

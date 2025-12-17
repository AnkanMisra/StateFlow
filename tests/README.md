# tests/ – Test Suite

Integration and unit tests for StateFlow.

## Running Tests

```bash
# Run all tests
pnpm test

# Run in watch mode
pnpm test:watch
```

## Structure

```
tests/
├── helpers/           # Test utilities and mocks
│   └── mock-context.ts
└── integration/       # Integration tests
    ├── api-sensor-ingest.test.ts
    ├── event-processing.test.ts
    └── workflow-lifecycle.test.ts
```

## Test Coverage

| File | Tests | Coverage |
|------|-------|----------|
| `api-sensor-ingest.test.ts` | 15 | Input validation, defaults, state, events |
| `event-processing.test.ts` | 16 | Aggregation, thresholds, idempotency, edge cases |
| `workflow-lifecycle.test.ts` | 17 | State transitions, decisions, isolation |

**Total: 48 tests**

## Dependencies

- `vitest` – Test runner
- Mock context helpers for Motia state/emit/logger

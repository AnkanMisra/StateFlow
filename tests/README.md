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
│   ├── README.md
│   └── mock-context.ts
└── integration/       # Integration tests
    ├── README.md
    ├── api-sensor-ingest.test.ts
    ├── event-processing.test.ts
    ├── gemini-analyzer.test.ts
    └── workflow-lifecycle.test.ts
```

## Test Coverage

| File | Tests | Coverage |
|------|-------|----------|
| `api-sensor-ingest.test.ts` | 15 | Input validation, defaults, state, events |
| `event-processing.test.ts` | 16 | Aggregation, thresholds, idempotency, edge cases |
| `gemini-analyzer.test.ts` | 21 | AI availability, fallback, tier thresholds, edge cases |
| `workflow-lifecycle.test.ts` | 17 | State transitions, decisions, isolation |

**Total: 69 tests**

## Dependencies

- `vitest` – Test runner
- Mock context helpers for Motia state/emit/logger

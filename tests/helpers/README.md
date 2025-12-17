# helpers/ – Test Utilities

Mock implementations for testing Motia Steps.

## Files

| File | Purpose |
|------|---------|
| `mock-context.ts` | Mock state, emit, and logger for unit tests |

## Usage

```typescript
import { createMockContext, hasLogMessage } from '../helpers/mock-context';

const ctx = createMockContext();

// Pass to handler
await handler(input, {
    state: ctx.state,
    emit: ctx.emit,
    logger: ctx.logger,
} as any);

// Assert emissions
expect(ctx.emitCalls.length).toBe(1);

// Assert logs
expect(hasLogMessage(ctx.logger, 'success')).toBe(true);

// Assert state
const data = await ctx.state.get('group', 'key');
```

## Mock Features

- **State** – In-memory Map with `get`/`set`
- **Emit** – Records all `{ topic, data }` calls
- **Logger** – Records all `{ level, message, data }` logs
- **Reset** – Clears all mocks between tests

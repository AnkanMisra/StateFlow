# job/ - Background Job Steps

Phase 4: Async job execution with Motia's infrastructure-backed durability.

## Steps

| Step | Subscribes To | Status |
|------|--------------|--------|
| `job.energy.execute` | `execution.requested` | Active |

## Infrastructure Config

Motia handles retries and durability via infrastructure config:

```typescript
infrastructure: {
    handler: { timeout: 30 },
    queue: { maxRetries: 3, visibilityTimeout: 60 }
}
```

## Responsibilities

- Execute optimization actions asynchronously
- Write `optimizations/{id}/executionResult` to state
- Let Motia handle retries (no custom retry logic)

## State Ownership

Writes to: `optimizations/{id}/executionResult`

```typescript
{
  success: boolean;
  appliedAt: string;
  details: string;
}
```

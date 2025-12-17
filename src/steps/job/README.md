# job/ – Background Job Steps

> **Phase 4** – Not yet implemented

## Planned

| Step | Purpose |
|------|---------|
| `job.energy.execute` | Execute optimization actions asynchronously |

## Features (Phase 4)

- Retries on failure
- Backoff strategy
- Dead letter handling
- State updates on success/failure

## Will Replace

Currently `workflow.energy.optimize` uses `simulateExecution()`. Phase 4 will replace this with real async job execution.

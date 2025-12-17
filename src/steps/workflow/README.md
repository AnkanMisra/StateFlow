# workflow/ – Workflow Steps

Durable workflow orchestration Steps.

## Steps

| Step | Subscribes To | Purpose |
|------|--------------|---------|
| `workflow.energy.optimize` | `optimization.required` | Orchestrates optimization lifecycle |

## Lifecycle States

```
RECEIVED → ANALYZING → DECIDED → EXECUTING → COMPLETED
                                          ↘ FAILED
```

Each transition:
1. Updates `optimizations/{id}` state
2. Logs the transition
3. Proceeds to next stage

## State Ownership

This Step is the **exclusive owner** of `optimizations/{id}`. No other Step mutates this state.

## Deterministic Analysis (Phase 2)

Current decision logic based on excess percentage:

| Excess % | Action | Target Window |
|----------|--------|---------------|
| > 20% | `SHIFT_LOAD` | 02:00-05:00 |
| 10-20% | `REDUCE_CONSUMPTION` | 18:00-22:00 |
| < 10% | `OPTIMIZE_SCHEDULING` | 12:00-16:00 |

**Phase 3** will replace this with Gemini AI.

## State Structure

```typescript
{
  id: string;
  status: 'RECEIVED' | 'ANALYZING' | 'DECIDED' | 'EXECUTING' | 'COMPLETED' | 'FAILED';
  triggeredAt: string;
  completedAt?: string;
  decision?: {
    action: string;
    targetWindow: string;
    expectedSavingsPercent: number;
    confidence: number;
    reasoning: string;
  };
  executionResult?: {
    success: boolean;
    appliedAt: string;
    details: string;
  };
}
```

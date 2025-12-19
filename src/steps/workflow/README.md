# workflow/ – Workflow Steps

Durable workflow orchestration Steps.

## Steps

| Step | Subscribes To | Status |
|------|--------------|--------|
| `workflow.energy.optimize` | `optimization.required` | Active + AI (Phase 3) |

## AI Integration (Phase 3)

The workflow now uses Gemini AI for analysis:

```typescript
import { analyzeWithGemini } from '../../ai/gemini-analyzer';

const analysisResult = await analyzeWithGemini(
    { totalConsumption, threshold, excessAmount, date },
    logger
);
// analysisResult.source is 'ai' or 'fallback'
```

## Lifecycle States

```
RECEIVED -> ANALYZING -> DECIDED -> EXECUTING -> COMPLETED
                                              \-> FAILED
```

## State Ownership

This Step is the exclusive owner of `optimizations/{id}`.

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
    source: 'ai' | 'fallback';  // Phase 3
  };
}
```

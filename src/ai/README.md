# ai/ – Gemini AI Integration

Phase 3 – AI-powered energy optimization analysis.

## Files

| File | Purpose |
|------|---------|
| `gemini-analyzer.ts` | Gemini API client with structured prompts and fallback |

## Model

- Model: `gemini-3-flash-preview`
- SDK: `@google/genai`

## Usage

```typescript
import { analyzeWithGemini } from '../ai/gemini-analyzer';

const decision = await analyzeWithGemini(
    { totalConsumption: 150, threshold: 100, excessAmount: 50, date: '2025-12-19' },
    logger
);
// decision.source is 'ai' or 'fallback'
```

## Environment

```bash
# .env.local
GEMINI_API_KEY=your_key_here
```

## Fallback Strategy

If API fails or key missing:

| Excess % | Action | Target Window |
|----------|--------|---------------|
| > 20% | SHIFT_LOAD | 02:00-05:00 |
| 10-20% | REDUCE_CONSUMPTION | 18:00-22:00 |
| < 10% | OPTIMIZE_SCHEDULING | 12:00-16:00 |

## Response Structure

```typescript
interface AIDecision {
    action: 'SHIFT_LOAD' | 'REDUCE_CONSUMPTION' | 'OPTIMIZE_SCHEDULING';
    targetWindow: string;
    expectedSavingsPercent: number;
    confidence: number;
    reasoning: string;
    source: 'ai' | 'fallback';
    model?: string;
}
```

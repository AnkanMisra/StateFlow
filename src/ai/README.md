# ai/ – AI Agent Module

AI-powered analysis using Google Gemini.

## Files

| File | Purpose |
|------|---------|
| `gemini-analyzer.ts` | Gemini API integration with fallback |

## Usage

```typescript
import { analyzeWithGemini } from '../../ai/gemini-analyzer';

const decision = await analyzeWithGemini(
    { totalConsumption: 150, threshold: 100, excessAmount: 50, date: '2025-12-18' },
    logger
);
// decision.source is 'ai' or 'fallback'
```

## Environment

Requires `GEMINI_API_KEY` environment variable:
```bash
export GEMINI_API_KEY=your_key_here
```

## Model

- **Model**: `gemini-3-flash-preview`
- **SDK**: `@google/genai`

## Fallback Strategy

If Gemini API fails:
1. Logs warning
2. Returns deterministic decision based on excess percentage
3. Marks `source: 'fallback'`

## Response Structure

```typescript
interface AIDecision {
    action: 'SHIFT_LOAD' | 'REDUCE_CONSUMPTION' | 'OPTIMIZE_SCHEDULING';
    targetWindow: string;      // e.g., "02:00-05:00"
    expectedSavingsPercent: number;
    confidence: number;        // 0.0-1.0
    reasoning: string;
    source: 'ai' | 'fallback';
    model?: string;
}
```

# ai/ – AI Agent Steps

> **Phase 3** – Not yet implemented

## Planned

| Step | Purpose |
|------|---------|
| `ai.energy.analyze` | Call Gemini 2.5 Flash for intelligent optimization decisions |

## Architecture (Phase 3)

```
optimization.required
        │
        ▼
workflow.energy.optimize
        │
        ▼ (in ANALYZING state)
┌─────────────────────────────────────┐
│        ai.energy.analyze            │
│  ─────────────────────────────────  │
│  Input: usage data, thresholds      │
│  Output: structured decision JSON   │
│  Model: gemini-2.5-flash            │
└─────────────────────────────────────┘
        │
        ▼
Returns to workflow with AI decision
```

## Will Replace

Currently `workflow.energy.optimize` uses deterministic `analyzeUsagePattern()`. Phase 3 will replace this with Gemini-powered analysis.

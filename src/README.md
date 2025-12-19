# src/ – Source Code

Core application logic for StateFlow.

## Contents

| Item | Description |
|------|-------------|
| `constants.ts` | Centralized constants: state keys, event topics, types |
| `ai/` | AI module: Gemini API integration with fallback |
| `steps/` | All Motia Step definitions |

## Architecture

```
src/
├── constants.ts          # Shared constants & types
├── ai/                   # AI module  
│   └── gemini-analyzer.ts # Gemini API with fallback
└── steps/
    ├── api/              # HTTP API Steps
    ├── event/            # Event-driven Steps  
    ├── workflow/         # Workflow orchestration Steps
    ├── ai/               # AI agent Steps (Phase 3)
    ├── job/              # Background job Steps (Phase 4)
    ├── cron/             # Scheduled Steps
    └── stream/           # Real-time streaming Steps (Phase 5)
```

## Key Files

- **`constants.ts`** – Defines `STATE_KEYS`, `TOPICS`, `FLOWS`, `OPTIMIZATION_STATUS`, and TypeScript types used across all Steps.
- **`ai/gemini-analyzer.ts`** – Google Gemini AI integration for energy optimization analysis with deterministic fallback.

## Dependencies

- `motia` – Core framework
- `zod` – Schema validation (via Motia)
- `@google/genai` – Google Gemini AI SDK
- `dotenv` – Environment variable loading

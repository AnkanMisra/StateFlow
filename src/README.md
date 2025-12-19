# src/ – Source Code

Core application logic for StateFlow.

## Contents

| Item | Description |
|------|-------------|
| `constants.ts` | Centralized constants: state keys, event topics, types |
| `steps/` | All Motia Step definitions |
| `ai/` | Phase 3: Gemini AI integration |

## Architecture

```
src/
  constants.ts          # Shared constants and types
  ai/
    gemini-analyzer.ts  # Gemini API integration (Phase 3)
  steps/
    api/                # HTTP API Steps
    event/              # Event-driven Steps  
    workflow/           # Workflow orchestration Steps
    ai/                 # AI agent Steps (placeholder)
    job/                # Background job Steps (Phase 4)
    cron/               # Scheduled Steps
    stream/             # Real-time streaming Steps (Phase 5)
```

## Dependencies

- `motia` – Core framework
- `zod` – Schema validation
- `@google/genai` – Gemini AI SDK (Phase 3)
- `dotenv` – Environment variable loading

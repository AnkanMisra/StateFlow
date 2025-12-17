# src/ – Source Code

Core application logic for StateFlow.

## Contents

| Item | Description |
|------|-------------|
| `constants.ts` | Centralized constants: state keys, event topics, types |
| `steps/` | All Motia Step definitions |

## Architecture

```
src/
├── constants.ts          # Shared constants & types
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

## Dependencies

- `motia` – Core framework
- `zod` – Schema validation (via Motia)

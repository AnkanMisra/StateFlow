# steps/ – Motia Step Definitions

All Motia Steps organized by type.

## Step Types

| Type | Trigger | Folder |
|------|---------|--------|
| API | HTTP request | `api/` |
| Event | Event topic | `event/` |
| Workflow | Event topic (orchestrates lifecycle) | `workflow/` |
| AI | Event topic (placeholder) | `ai/` |
| Job | Background execution | `job/` |
| Cron | Schedule | `cron/` |
| Stream | Real-time push | `stream/` |

## Active Steps (Phase 3)

| Step | File | Status |
|------|------|--------|
| `api.sensor.ingest` | `api/api.sensor.ingest.step.ts` | Active |
| `api.user.preferences` | `api/api.user.preferences.step.ts` | Active |
| `event.sensor.process` | `event/event.sensor.process.step.ts` | Active |
| `workflow.energy.optimize` | `workflow/workflow.energy.optimize.step.ts` | Active + AI |

## AI Integration (Phase 3)

The workflow now uses `analyzeWithGemini()` from `src/ai/gemini-analyzer.ts` instead of deterministic logic.

## State Ownership

| Step | Owns State Keys |
|------|----------------|
| `api.sensor.ingest` | `sensors/{id}`, `usage/raw/{ts}` |
| `event.sensor.process` | `usage/daily/{date}` |
| `workflow.energy.optimize` | `optimizations/{id}` |
| `api.user.preferences` | `user/preferences` |

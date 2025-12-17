# steps/ – Motia Step Definitions

All Motia Steps organized by type.

## Step Types

| Type | Trigger | Folder |
|------|---------|--------|
| **API** | HTTP request | `api/` |
| **Event** | Event topic | `event/` |
| **Workflow** | Event topic (orchestrates lifecycle) | `workflow/` |
| **AI** | Event topic (calls Gemini) | `ai/` |
| **Job** | Background execution | `job/` |
| **Cron** | Schedule | `cron/` |
| **Stream** | Real-time push | `stream/` |

## Active Steps (Phase 2)

| Step | File | Purpose |
|------|------|---------|
| `api.sensor.ingest` | `api/api.sensor.ingest.step.ts` | Ingests sensor readings |
| `api.user.preferences` | `api/api.user.preferences.step.ts` | Manages user thresholds |
| `event.sensor.process` | `event/event.sensor.process.step.ts` | Aggregates daily usage, triggers optimization |
| `workflow.energy.optimize` | `workflow/workflow.energy.optimize.step.ts` | Orchestrates optimization lifecycle |

## Naming Convention

All Steps follow canonical naming: `{type}.{domain}.{action}`.

Examples:
- `api.sensor.ingest`
- `event.sensor.process`
- `workflow.energy.optimize`

## State Ownership

| Step | Owns State Keys |
|------|----------------|
| `api.sensor.ingest` | `sensors/{id}`, `usage/raw/{ts}` |
| `event.sensor.process` | `usage/daily/{date}` |
| `workflow.energy.optimize` | `optimizations/{id}` |
| `api.user.preferences` | `user/preferences` |

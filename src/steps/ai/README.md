# ai/ – AI Agent Steps

Placeholder – Actual AI integration is in `src/ai/gemini-analyzer.ts`

This directory is reserved for future AI Step definitions if needed (e.g., using Motia's AI Step type).

## Current Implementation

AI analysis is integrated directly into `workflow.energy.optimize` via:
- `src/ai/gemini-analyzer.ts` – Gemini API client
- Model: `gemini-3-flash-preview`

## Future Use Cases

If separate AI Steps are needed:
- `ai.energy.forecast` – Predict usage patterns
- `ai.appliance.detect` – Identify high-consumption appliances

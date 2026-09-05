## Why

UltraIa already includes many free and local AI providers, memory, evaluations,
failover and a broad web surface, but users cannot easily see which provider is
available, why a model was selected, or how feedback becomes a reliable learning
signal. The next improvement should make the existing stack faster and easier to
operate before adding more providers or attempting real fine-tuning.

## What Changes

- Add a provider control surface that reports availability, latency, capability,
  quota/configuration status and the active fallback order without exposing
  secrets.
- Add a fast learning workflow based on feedback curation, deduplicated response
  caching, parallel regression evaluation and optional Qdrant synchronization.
- Add a guided agent-creation experience where users choose the task outcome,
  speed/quality preference and enabled capabilities without needing to understand
  provider internals.
- Add learning and provider metrics for latency, cache hit rate, evaluation
  throughput, regression score and fallback usage.
- Document the recommended free/local API stack, tradeoffs and the boundary
  between prompt/evaluation learning and future fine-tuning.

## Capabilities

### New Capabilities

- `provider-control`: Safe provider discovery, health status, routing explanation
  and user-facing model strategy selection.
- `learning-acceleration`: Feedback curation, cache-aware evaluation batching,
  parallel regression checks and measurable learning telemetry.
- `guided-agent-creation`: Outcome-first onboarding and agent configuration
  defaults that simplify creation while preserving advanced controls.
- `agent-evaluation`: Evaluation runs must support deduplication, parallel
  execution and visible regression/throughput results.
- `agent-chat-telemetry`: Chat responses must expose stable provider/fallback
  telemetry suitable for the user's metrics view without leaking credentials or
  prompts.

## Impact

- Core AI routing, model catalog, response cache, evaluation/improvement domains
  and provider health APIs.
- Agent creation, dashboard and metrics pages in `apps/web`.
- Possible Prisma schema additions for learning/provider telemetry; SQLite remains
  the local default and Postgres compatibility must be preserved.
- No mandatory paid API or new hosted dependency. Existing local providers,
  OpenRouter/free models and Qdrant remain optional with graceful fallbacks.

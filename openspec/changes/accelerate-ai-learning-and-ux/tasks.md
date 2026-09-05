## 1. Core contracts and persistence

- [ ] 1.1 Define provider strategy/status and privacy-safe telemetry contracts in core, with unit tests for valid strategies and secret exclusion
- [ ] 1.2 Add additive Prisma persistence for learning runs and aggregate provider/chat telemetry, then verify `npm run db:generate` and a local migration
- [ ] 1.3 Extend the existing model orchestrator and cache to emit bounded routing metadata and deterministic evaluation cache keys, with focused unit tests

## 2. Provider control and telemetry APIs

- [ ] 2.1 Implement authenticated provider status and routing-summary handlers backed by the existing catalog/orchestrator, with tests for unavailable providers and redacted output
- [ ] 2.2 Wire chat and provider telemetry aggregation into the existing API surface and verify metrics contain latency/cache/fallback fields without message content

## 3. Learning acceleration

- [ ] 3.1 Normalize and deduplicate feedback into approved, pending and rejected learning signals, with tests for duplicates and ambiguous feedback
- [ ] 3.2 Refactor regression evaluation to use valid cache entries and bounded parallel execution, with tests for cache hits, partial failures and retry behavior
- [ ] 3.3 Add learning-run progress and gate metrics to the existing evaluation/improvement flow, with tests for completed and interrupted runs
- [ ] 3.4 Keep Qdrant synchronization/search optional and fail-soft, and verify learning continues with Qdrant unavailable

## 4. Guided web experience

- [ ] 4.1 Update agent creation to collect outcome, audience/success criteria and a fast/balanced/high-quality/local-first preference while preserving existing defaults
- [ ] 4.2 Add progressive advanced controls for capabilities and provider strategy, with accessible validation and responsive layouts
- [ ] 4.3 Add provider status, routing explanation and learning progress panels to the existing dashboard/metrics surfaces
- [ ] 4.4 Add loading, empty, error and reduced-motion states for the new flows and verify the web typecheck/lint passes

## 5. Documentation and integration verification

- [ ] 5.1 Update the free/local API documentation with the final supported roles, limits, fallback behavior and no-fine-tuning boundary
- [ ] 5.2 Add focused core/web tests for provider control, learning acceleration, telemetry privacy and guided creation
- [ ] 5.3 Run `npm run typecheck`, `npm run lint`, `npm run test` and `npm run build`; resolve failures without changing unrelated worktree files
- [ ] 5.4 Review the scoped diff, stage only change files and implementation files for this feature, and create a conventional commit with the required Copilot trailer
- [ ] 5.5 Push the feature commit to the configured remote branch only after all gates are green and report the commit and remote result

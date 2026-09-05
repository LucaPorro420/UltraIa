## Context

The repository already has an AI gateway, model catalog, failover orchestrator,
response cache, evaluation/improvement domains, local memory and optional Qdrant.
The web app uses Next.js server routes and client pages, while SQLite is the
default local database. Existing changes in the worktree are unrelated and must
not be included.

## Goals / Non-Goals

**Goals:**

- Reuse the existing provider catalog and routing abstractions rather than add a
  second provider system.
- Make provider health, routing choice and learning throughput visible through
  authenticated APIs and the existing metrics surface.
- Add bounded parallelism and deterministic cache keys so evaluation gets faster
  without weakening regression gates.
- Keep local/keyless operation and graceful degradation as first-class paths.

**Non-Goals:**

- Real model fine-tuning, GPU training or automatic weight updates.
- Adding a paid provider as a required dependency.
- Replacing Prisma/SQLite, Qdrant, Next.js or the current design system.
- Exposing chain-of-thought, raw prompts or secrets in telemetry.

## Decisions

### Reuse the existing model orchestrator

Provider control will read from the current catalog and orchestrator. A small
safe status adapter will normalize provider availability and routing metadata.
Adding a separate gateway would create contradictory fallback behavior.

### Store telemetry as aggregates plus bounded run records

Learning and chat metrics will store only the fields required by the specs:
strategy, provider/tier, duration, cache/fallback counts and gate outcomes.
Raw content remains outside telemetry. SQLite-compatible Prisma fields are used
so production can migrate to Postgres without a new storage contract.

### Cache evaluation by an explicit content-addressed key

The key includes agent version, case input, rubric/configuration and evaluator
mode. Cached records are valid only for matching keys and an explicit freshness
policy. This prevents stale scores after prompt or rubric changes.

### Bound parallel evaluation

Independent cases run with a configurable small concurrency limit and retain
per-case outcomes. A single failure cannot be silently converted into success;
the existing regression gate remains authoritative.

### Guided UI with progressive disclosure

The first agent-creation screen asks for outcome and performance preference.
Capabilities and provider details remain behind an advanced section, preserving
power-user access while reducing cognitive load for first-time users.

## Risks / Trade-offs

- [Risk] Provider health checks can add latency or trigger rate limits -> use
  short timeouts, cached health status and explicit manual refresh.
- [Risk] Parallel evaluation can overload a provider -> enforce bounded
  concurrency and retain provider failover.
- [Risk] Telemetry can become sensitive over time -> use an allowlist schema and
  tests that reject prompt/token/header fields.
- [Risk] SQLite write contention can increase with metrics -> batch writes and
  keep aggregate records compact; allow telemetry to degrade without blocking
  chat or learning.

## Migration Plan

1. Add additive database fields/tables and migrate local SQLite.
2. Ship provider status and telemetry APIs behind authenticated routes.
3. Enable cache-aware bounded evaluation and verify existing gates.
4. Roll out guided creation UI with backward-compatible defaults.
5. Roll back by disabling new UI/routes and ignoring additive telemetry data;
   active agent versions and existing evaluation records remain unchanged.

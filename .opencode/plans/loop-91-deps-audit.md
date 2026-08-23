# Plan — iter-91: capability `deps` (dependency vulnerability audit / SCA)

**Objective (P):** Add a fail-soft `deps` capability that audits the dependency tree for known
vulnerabilities by wrapping `npm audit --json` (injectable runner for tests, so it stays
deterministic and offline-testable). Returns a structured `DepVuln[]` (name, severity, via,
title, url, fixAvailable) plus a `note` when the audit cannot run. Complements `security`
(secrets) and `codequality` (smells) to complete a code-health trio for the self-improving loop.

**Context:** User said "continuar" → keep building net-new safe capabilities. security (iter-89)
+ codequality (iter-90) done. This is the natural third member of the static-analysis family.
Grep confirmed no existing `deps`/`deps_audit` tool.

**ARCHIVOS A TOCAR:**
- `packages/core/src/tools/deps.ts` (NEW) — `parseAuditJson` (pure, testable) + `auditDeps`
  (spawns `npm audit --json` via injectable `runAudit`, fail-soft) + `DepVuln`/`DepAuditResult`.
- `packages/core/src/tools/deps.test.ts` (NEW) — parse + injected-runner tests.
- `packages/core/src/tools/index.ts` — export `./deps`, import namespace, add to `tools`,
  `TOOL_DESCRIPTIONS`, `Capability` union.
- `packages/core/src/ai/llm.ts` — static import + `deps_audit` tool (optional `cwd`).

**RECURSOS/PRESUPUESTO:** core tsc + core tests only. No new deps.
**NO-hacer:** don't touch concurrent #25 WIP, don't recreate existing modules, don't stage WIP.
**CRITERIOS scoped:** `npx tsc --noEmit -p packages/core` 0 + `npm run test` (core) green.
**CRITERIOS FULL (commit):** scoped + build unaffected.
**TOLERANCIAS:** fail-soft (never throws; `note` on error).
**RIESGOS:** low — pure additive; real `npm audit` only runs in the tool, tests inject a fake.
**ESFUERZO:** M.
**PRIORIDAD:** P1.

**Predicción:** gates green; `deps_audit` returns parsed vulns for a sample audit JSON and
`{vulns:[]}` with a note when the runner fails; commit `feat(core): add deps vulnerability-audit capability`.

# Plan — iter-90: capability `codequality` (static code-smell linter)

**Objective (P):** Add a deterministic, keyless, offline `codequality` capability that scans
text/files/dirs for common code smells (debugger statements, eval/Function, alert/prompt/confirm,
`any`/`@ts-ignore` abuse, empty catch blocks, TODO/FIXME without an issue ref, hardcoded
localhost/127.0.0.1/internal http URLs, `console.log` in source). Expose as tool `codequality_scan`.
Complements `security` (secrets-only) with a broader static-hygiene check for the self-improving loop.

**Context:** User said "continuar" → keep building net-new safe capabilities after iter-89 (security).
Exhaustive scan proved no documented safe target remains; this is a net-new, non-duplicative,
pure, testable capability (mirrors the security.ts pattern exactly). Grep confirmed no existing
`codequality`/`smell` tool.

**ARCHIVOS A TOCAR:**
- `packages/core/src/tools/codequality.ts` (NEW) — pure domain: `scanText`, `scanFile`, `scanRepo`,
  `QualityFinding`/`SmellSeverity`, rule table.
- `packages/core/src/tools/codequality.test.ts` (NEW) — unit + temp-dir walk tests.
- `packages/core/src/tools/index.ts` — export `./codequality`, import namespace, add to `tools`,
  `TOOL_DESCRIPTIONS`, `Capability` union.
- `packages/core/src/ai/llm.ts` — static import + `codequality_scan` tool (text|path|rootDir).

**RECURSOS/PRESUPUESTO:** core tsc + core tests only. No new deps.
**NO-hacer:** don't touch concurrent #25 WIP, don't recreate existing modules, don't stage WIP.
**CRITERIOS scoped:** `npx tsc --noEmit -p packages/core` 0 + `npm run test` (core) green.
**CRITERIOS FULL (commit):** scoped + build unaffected (tools not in build graph).
**TOLERANCIAS:** fail-soft (never throws); low false-positive (anchored patterns).
**RIESGOS:** low — pure additive capability.
**ESFUERZO:** M.
**PRIORIDAD:** P1.

**Predicción:** gates green; tool registers under `codequality`; `codequality_scan` returns findings
for sample smells and `[]` for clean input; commit `feat(core): add codequality static-linter capability`.

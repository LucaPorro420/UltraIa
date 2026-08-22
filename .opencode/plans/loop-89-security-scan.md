# Plan — iter-89: capability `security` (secret/leak scanner)

**Objective (P):** Add a deterministic, keyless, offline `security` capability that scans
text/files/dirs for leaked secrets and risky config (AWS/GCP/Slack/GitHub/GitLab/Stripe/OpenAI
keys, private-key blocks, JWTs, generic `api_key`/`secret`/`password` assignments, committed
`.env` files). Expose it as tool `security_scan`. Complements the advisory `cso` skill with an
automatable, testable tool.

**Context:** User said "inicia" → continue building net-new safe capabilities. Exhaustive scan of
STATE.md/RAZONAMIENTO-*/enlaces.txt proved no other safe, non-duplicative, non-blocked target:
LinkedIn already wired; `brain.ts` redundant with `brainpage`; CI already exists; GPU/Qdrant
blocked; `game`/`graphify` are concurrent-session #25 WIP (off-limits). Grep confirmed NO existing
`security` tool (only `genesis` description names "security" as a gate).

**ARCHIVOS A TOCAR:**
- `packages/core/src/tools/security.ts` (NEW) — pure domain: `scanText`, `scanFile`, `scanRepo`,
  `SecurityFinding`/`Severity`, rule table.
- `packages/core/src/tools/security.test.ts` (NEW) — unit + temp-dir walk tests.
- `packages/core/src/tools/index.ts` — export `./security`, import namespace, add to `tools`,
  `TOOL_DESCRIPTIONS`, `Capability` union.
- `packages/core/src/ai/llm.ts` — static import + `security_scan` tool (text|path|rootDir).

**RECURSOS/PRESUPUESTO:** core tsc + core tests only (no web/runtime change). No new deps.
**NO-hacer:** don't touch concurrent #25 WIP, don't recreate existing modules, don't stage WIP.
**CRITERIOS scoped:** `npx tsc --noEmit -p packages/core` 0 + `npm run test` (core) green.
**CRITERIOS FULL (commit):** scoped + lint on touched + build unaffected (scripts/tools not in build graph).
**TOLERANCIAS:** fail-soft (never throws); false-positive rate low (anchored patterns).
**RIESGOS:** low — pure additive capability; no API changes.
**ESFUERZO:** M (1 module + tests + wiring).
**PRIORIDAD:** P1.

**Predicción:** gates green; tool registers under `security` capability; `security_scan` returns
findings for sample secrets and `[]` for clean input; commit `feat(core): add security secret-scanner capability`.

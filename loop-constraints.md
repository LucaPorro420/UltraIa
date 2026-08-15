# Loop Constraints — UltraIa

> Reglas **vinculantes** del bucle PIVR. El agente DEBE seguirlas en cada ciclo.

## Push & Merge
- Don't push before telling me
- Never auto-merge to main without human approval
- Always create a draft PR first; let me review before marking ready

## Paths
- Never edit .env, .env.*, auth/, payments/, secrets/, credentials/
- Never edit infrastructure configs without human approval
- `.vscode/` es local-only (gitignored): no commitear fix Pylance

## Code
- Always run tests before proposing a fix
- Never disable tests to make CI green
- Never refactor unrelated code — one fix per run
- Max 3 fix attempts per item; escalate after (High Priority en STATE.md)
- Verificación FULL en cada commit: `npm run typecheck` → `npm run lint` → `npm run test` → `npm run build`
- Gates duales: scoped (paquete afectado) en iteraciones intermedias

## Communication
- Always tell me what you're about to do before doing it
- Never close an issue or PR without my approval
- Auto-switch P→B sin esperar confirmación humana (autorización permanente 15/08/2026), salvo push/merge

## Budget
- If token spend hits 80% of daily cap, switch to report-only
- If loop-pause-all is active, exit immediately

---
<!-- Add your own rules below. Use plain English. The loop reads this verbatim. -->

## UltraIa-specific
- Commits por iteración con mensaje `feat|fix|chore(scope): <descripción>`
- Tras editar código, si vitest da fallos raros → limpiar caché stale `node_modules/.vite` antes de diagnosticar
- PowerShell 5.1: no usar `Set-Content -Encoding UTF8` para JSON (BOM rompe json.loads); usar Write
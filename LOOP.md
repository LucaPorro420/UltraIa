# Loop Configuration — PIVR (Plan ⇒ Implement ⇒ Verify ⇒ Reiniciar) — UltraIa

> Harness de desarrollo continuo de UltraIa. CLI: `npx @cobusgreyling/loop` (v0.1.2, npm — NO pip).
> Patrón: PIVR (Plan ⇒ Implement ⇒ Verify ⇒ Reiniciar), inspirado en el Loop SWE/OODA de
> LOOPENGINEER.TXT: el agente percibe (STATE.md + run-log), razona (plan), actúa (build),
> valida (gates) y reinyecta errores al plan.

## Active Loops

| Pattern | Cadence | Status | Command |
|---------|---------|--------|---------|
| PIVR backlog | continua (auto P→B) | L2 habilitado por humano (15/08/2026) | `python scripts/loop_piv.py` o en-sesión |

## Fases (protocolo en AGENTS.md §Loop PIVR)

1. **P — Planificar**: leer STATE.md + learning/LEARNINGS.md + loop-run-log.md; tomar la primera
   tarea del backlog; escribir el plan en loop-run-log.md (objetivo, pasos, criterios). Sin editar código.
2. **I — Implementar**: ejecutar con tools del proyecto; commit por iteración (`feat|fix|chore(scope): …`).
3. **V — Verificar**: gates CI en orden: `npm run typecheck` → `npm run lint` → `npm run test` →
   `npm run build`. Dual: scoped en iteraciones intermedias, FULL en cada commit. Opcional:
   verifier sub-agent (APPROVE/REJECT). Evidencia en loop-run-log.md + STATE.md.
4. **R — Reiniciar**: V=GREEN → siguiente ciclo inmediato (auto-switch P→B sin esperar al humano);
   REJECT → reinyectar error al plan (máx 3 intentos por ítem, luego High Priority).

## Human Gates

- Push/merge: SIEMPRE requieren aprobación humana (nunca push automático).
- Kill switch: `loop-pause-all` en STATE.md o loop-run-log.md detiene el bucle.
- Denylist de paths: `.env*`, `auth/`, `payments/`, `secrets/`, `credentials/` — nunca editar.

## Worktrees

- En-sesión: trabajar en el repo principal (authorización permanente del usuario).
- L2+ con riesgo: usar `git worktree` y correr opencode con `--dir <worktree>`; descartar tras REJECT.

## Connectors (MCP)

- Opcionales. Para verificación: GitHub MCP solo lectura (CI/issues) hasta que sea confiable.

## Budget

- Ver loop-budget.md. Max 3 intentos de fix por ítem (registrar en loop-run-log.md).
- Si el gasto de tokens llega al 80% del cap diario → report-only.

## Links

- Estado: STATE.md · Bitácora: loop-run-log.md · Presupuesto: loop-budget.md · Reglas: loop-constraints.md
- Skill en-sesión: `.opencode/skills/loop-piv/SKILL.md` · Driver: `scripts/loop_piv.py`
- Brief del usuario: LOOPENGINEER.TXT
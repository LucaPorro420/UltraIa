# Loop Configuration — PIVR (Plan ⇒ Implement ⇒ Verify ⇒ Reiniciar) — UltraIa

> Harness de desarrollo continuo de UltraIa. CLI: `npx @cobusgreyling/loop` (v0.1.2, npm — NO pip).
> Patrón: PIVR (Plan ⇒ Implement ⇒ Verify ⇒ Reiniciar), inspirado en el Loop SWE/OODA de
> LOOPENGINEER.TXT: el agente percibe (STATE.md + run-log), razona (plan), actúa (build),
> valida (gates) y reinyecta errores al plan.

## Active Loops

| Pattern | Cadence | Status | Command |
|---------|---------|--------|---------|
| PIVR backlog | continua (auto P→B) | L2 habilitado por humano (15/08/2026) | `python scripts/loop_piv.py` o en-sesión |
| Daily Triage | 1/día | report-only | `python scripts/loop_piv.py --triage` |

## Fases (protocolo en AGENTS.md §Loop PIVR)

1. **P — Planificar**: leer STATE.md + learning/LEARNINGS.md + loop-run-log.md; tomar la primera
   tarea del backlog; escribir el plan en `.opencode/plans/loop-<taskid>-<slug>.md` (plantilla en
   skill loop-piv) + resumen `[P]` en loop-run-log.md. Sin editar código.
2. **I — Implementar**: leer el plan desde su archivo; ejecutar con tools del proyecto;
   staging explícito (`git add <archivos del plan>`, nunca `git add .`); commit por iteración
   (`feat|fix|chore(scope): …`).
3. **V — Verificar**: gates CI en orden: `npm run typecheck` → `npm run lint` → `npm run test` →
   `npm run build`. Dual: scoped en iteraciones intermedias, FULL en cada commit. Opcional:
   verifier sub-agent (skill `loop-verifier`, APPROVE/REJECT). Evidencia en loop-run-log.md + STATE.md.
4. **R — Reiniciar**: V=GREEN → siguiente ciclo inmediato (auto-switch P→B sin esperar al humano);
   REJECT → reinyectar error al plan (máx 3 intentos por ítem, luego High Priority).
   JSON de presupuesto por ciclo (formato loop-budget).

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
- Planes por tarea: `.opencode/plans/loop-<taskid>-<slug>.md` (plantilla en skill loop-piv)
- Skill en-sesión: `.opencode/skills/loop-piv/SKILL.md` · Verifier: `.opencode/skills/loop-verifier/SKILL.md`
- Triage: `.opencode/skills/loop-triage/SKILL.md` · Driver: `scripts/loop_piv.py`
- Brief del usuario: LOOPENGINEER.TXT
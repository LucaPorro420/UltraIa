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
| State Doctor (pre-flight) | antes de cada triage/ciclo | report-only | `python scripts/loop_piv.py --doctor` (o `--doctor --triage`) |

Flags del driver: `--cycles N` · `--gate-only` · `--plan-only` · `--triage` · `--doctor`
(pre-flight state-integrity-check ANTES de triage/gates/ciclos) · `--no-commit` · `--dry-run` · `--timeout S`.

## Fases (protocolo en AGENTS.md §Loop PIVR)

El loop PIVR es la implementación del **bucle IA de 4 fases** (skill `ultraia-request`,
Sensado/Razonamiento/Acción/Ajuste) mapeado en sus puntos:

| Fase IA | Punto PIVR | Qué hace |
|---------|-----------|----------|
| **Entrada (Sensado)** — recibe datos del entorno/estado, lee el problema | **P pasos 1-3 + pre-flight** | Leer STATE.md + run-log + LEARNINGS + constraints; lock (concurrency-guard); `git status`; tomar la primera tarea pendiente. NUNCA inventar estado |
| **Proceso (Razonamiento)** — elige la acción con su modelo, predice qué pasará | **P pasos 4-5** | Escribir plan file (plantilla ampliada: RECURSOS/PRESUPUESTO, NO-hacer, TOLERANCIAS, P0-P5) + PREDICCIÓN del resultado esperado + `[P]` en run-log |
| **Ejecución (Acción)** — aplica la decisión, cambia el estado | **I pasos 6-11** | Ejecutar el plan con tools; staging explícito (`git add <archivos>`, nunca `.`); commit por iteración |
| **Ajuste (Aprendizaje)** — mide (recompensa/error), guarda el dato, ajusta reglas | **V pasos 12-17 + R pasos 18-21** | Gates GREEN/RED = recompensa/error; evidencia en run-log + JSON presupuesto (tokens Y tiempo); lección en LEARNINGS.md; reinyectar error al plan (máx 3) |

Ciclo completo: `Sensado → Razonamiento → Acción → Ajuste` por cada tarea, 3 pasadas
(C1 base / C2 ajuste / C3 consolidación) para tareas grandes — decisión usuario 18/08/2026.

## Human Gates

- Push/merge: SIEMPRE requieren aprobación humana (nunca push automático).
- Kill switch: `loop-pause-all` en STATE.md o loop-run-log.md detiene el bucle. Detección
  por TOKEN ACTIVO (19/08/2026): menciones en prosa negadas ("sin `loop-pause-all`",
  "ausente") NO activan el kill switch (falso positivo real en loop-run-log.md L1959).
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
- Integridad: `.opencode/skills/state-integrity-check/SKILL.md` (13 checks) · agente `state-doctor`
- Brief del usuario: LOOPENGINEER.TXT
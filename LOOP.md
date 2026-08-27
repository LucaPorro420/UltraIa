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

## Modos de operación (P-P / P-B / L-T / S-D) — 20/08/2026, loop-75

| Modo | Rol | Sub-fases | Verificación | Dónde verlo |
|------|-----|-----------|--------------|-------------|
| **P-P** | Piv-Plan | Sensado → S-D (spec+design+diagrama) → L-T (learn+test) → Investigación (web/arXiv/GitHub/PDFs) → Razonamiento | Plan file ampliado + [P] + predicción | `docs/MODOS-OPERACION.md` · `.opencode/plans/` |
| **P-B** | Piv-Build | Leer plan → Adicionar mejoras → Implementar → Verificar proyecto completo → Ajuste | Gates FULL en orden CI + commit pathspec | `docs/MODOS-OPERACION.md` · commits |
| **L-T** | Aprender y testear | Learn (LEARNINGS + truth + fracasos) → Test (evidencia) | Evidencia de aprendizaje | `learning/` |
| **S-D** | Especificar y diseñar | Spec (requisitos/criterios) → Design (diseño + diagrama) | Artefactos spec/design | secciones SPEC/DESIGN del plan |

Repositorio propio: `.ultraia/vault/<kind>/` (tool `vault_manage`; export GitHub con
GH_TOKEN) · Búsquedas PDFs: `pdfsearch_search` (OpenAlex + DDG filetype:pdf) y fuente
`pdf` en `research_search` · Generador: `autolearn_run` accion `mode_plan`.

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

## Herramientas deterministas (CI)

Para que el harness corra en CI sin un runtime de agente, los subsistemas tienen un script
Python determinista como fuente de verdad (los skills de agente son wrappers in-session):

| Subsistema | Script canónico | Tests | Skill (wrapper) |
|---|---|---|---|
| Doctor (integridad STATE.md) | `scripts/state_doctor.py` | `scripts/state_doctor.test.py` (27) | `state-integrity-check` |
| Triage (priorización) | `scripts/loop_triage.py` | `scripts/loop_triage.test.py` (7) | `loop-triage` |
| Driver PIVR | `scripts/loop_piv.py` | `scripts/loop_piv_doctor.test.py` (11), `scripts/loop_piv_mark_done.test.py` (4) | `loop-piv` |
| Sync espejos de skills | `scripts/sync_skill_mirrors.py` | `scripts/sync_skill_mirrors.test.py` (5) | (mantenimiento) |
| Gate runner (fase V) | `scripts/loop_gate.py` | `scripts/loop_gate.test.py` (6) | (driver `--gate`) |

- El driver invoca `state_doctor.py` y `loop_triage.py` vía `subprocess` (advisory en ciclos;
  `as_gate=True` solo en `--doctor` aislado). NO usa `opencode run --agent` para doctor/triage.
- `loop_gate.py` es el corredor determinista de los 4 gates CI (typecheck→lint→test→build) con
  kill de dev servers antes del build (`--kill`); el driver lo invoca con `--gate`. Reutilizable
  en CI (`py -3.12 scripts/loop_gate.py --kill --json`).
- Verificación global: `npm run harness:test` corre los 6 harness tests y debe quedar en verde.
- Check-9 (espejos): `sync_skill_mirrors.py` sincroniza solo los ESPEJOS (skills con contraparte en
  ambos lados), omitiendo los *source-only*; `state_doctor.py` compara SHA-1 de los espejos reales.

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
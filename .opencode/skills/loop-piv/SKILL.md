---
name: loop-piv
description: >
  Protocolo en-sesión del bucle PIVR (Plan ⇒ Implement ⇒ Verificar ⇒ Reiniciar) de UltraIa.
  Usar SIEMPRE que se reciba una tarea de desarrollo o se quiera continuar el proyecto:
  leer STATE.md, tomar la primera tarea del backlog, escribir el plan en un archivo de plan,
  implementar, verificar con gates npm y reiniciar el ciclo sin esperar confirmación
  (autorización permanente del usuario).
user_invocable: true
---

# Loop PIVR — Protocolo del bucle de desarrollo continuo

Harness: `npx @cobusgreyling/loop` (CLI npm v0.1.2) + archivos del bucle + driver
`scripts/loop_piv.py`. Detalle completo en `AGENTS.md` §Loop PIVR.

## Archivos del harness (leer SIEMPRE al inicio)

- `STATE.md` — backlog priorizado + High Priority + Watch List.
- `loop-run-log.md` — bitácora de ciclos (plan, commits, evidencia de verificación).
- `LOOP.md` — configuración del bucle. `loop-constraints.md` — reglas vinculantes.
- `loop-budget.md` — límites diarios (ver skill `loop-budget`).
- `learning/LEARNINGS.md` — lecciones verificadas (no romperlas).
- `learning/memory/ultraia_memory.zip` — memoria comprimida (`learning-memory` skill).
- `.opencode/plans/` — archivos de plan por tarea (`loop-<taskid>-<slug>.md`).

## Protocolo obligatorio

### P — Planificar

1. Leer `STATE.md`, `learning/LEARNINGS.md`, `loop-run-log.md`, `loop-constraints.md`.
   **Pre-flight de integridad**: correr `state-integrity-check` (skill) ANTES de confiar en
   STATE.md — si hay ALERTAS (root-empty/root-truncated, banner-desync, IDs duplicados), el
   estado NO es fiable: reportarlo y no tomar tarea hasta aclararlo (precedente incidente raíz 19/08).
2. Si existe `loop-pause-all` en STATE.md o run-log → **detener el bucle** e informar.
3. Verificar que la PRIMERA tarea del backlog sigue `pendiente` en STATE.md (guard contra trabajo duplicado):
   - Es la primera fila `pendiente` en ORDEN DE ARCHIVO (lo que tomaría `next_task()`), no por número de ID.
   - **Colisión de plan files**: si `.opencode/plans/loop-<taskid>-*.md` ya existe, LEERLO primero —
     otra sesión pudo planificar la misma tarea (precedente loop-36-wiring vs loop-36-growth).
   - **Lock ajeno**: si el lock (`loop-concurrency-guard`) está ACTIVO para esa tarea → NO tomarla:
     registrar `[P] SKIP — lock activo de <session_id>` y salir (precedentes 58/60/61: CEDE sin duplicar).
4. Escribir el plan en `.opencode/plans/loop-<taskid>-<slug>.md` usando la plantilla de abajo.
   - Pre-flight: presupuesto (`loop-budget` skill) + kill switch + lecciones + lock propio tomado.
   - El plan debe listar EXPLÍCITAMENTE los archivos que se tocarán (clave para el staging del build).
5. Registrar en `loop-run-log.md` un resumen corto `[P]` (objetivo + ruta del plan file + PREDICCIÓN).
   NO editar código fuente en esta fase.

### I — Implementar

6. Leer el plan desde su archivo (`.opencode/plans/loop-<taskid>-<slug>.md`), no desde el prompt.
7. Pre-flight de working tree: `git status --porcelain` → inventario de ruido NO relacionado al plan.
   Refrescar el heartbeat del lock (`loop-concurrency-guard`) antes de gates y commit.
8. Ejecutar el plan con las tools del proyecto (workspaces, worktree si aplica).
9. Staging EXPLÍCITO: `git add <archivos listados en el plan>` — NUNCA `git add .` ni `git add -A`.
   El ruido externo (fetches de datos, docs ajenas) queda fuera del commit.
10. Un commit por iteración: `feat|fix|chore(scope): <descripción>`.
    **Commit SIEMPRE con pathspec**: `git commit -m "<msg>" -- <archivos del plan>` — NUNCA
    `git commit` sin paths (LECCIÓN CRÍTICA iter-58: b37fcfb arrastró 121 archivos staged ajenos
    del índice #25; el staging explícito sin pathspec no protege el commit).
11. NUNCA push ni merge (aprobación humana). NUNCA tocar paths denylisted
    (`.env`, `.env.*`, `auth/`, `payments/`, `secrets/`, `credentials/`).

### V — Verificar

12. Gates duales en orden CI:
    - Scoped (typecheck + tests del paquete afectado) en iteraciones intermedias.
    - FULL en cada commit: `npm run typecheck` → `npm run lint` → `npm run test` → `npm run build`.
13. Antes de `npm run build`: matar dev servers (`taskkill /T /F` sobre procesos `next dev`/uvicorn) —
    un dev server corriendo rompe el build (chunks `_next/static` 404). Limpiar `.next` si da errores raros.
14. **Cuarentena de WIP ajeno antes de gates FULL** (`loop-concurrency-guard`): cualquier archivo sucio
    que NO esté en `touching` ni en los archivos del plan es de otra sesión → copiar (nunca mover) a
    `%TEMP%\opencode\wip-quarantine-<fecha>\` conservando la ruta relativa, INCLUYENDO untracked
    `.ts`/`.test.ts` (no aparecen en el manifest de git); correr los gates; restaurar byte a byte con
    `Get-FileHash` antes/después (nunca dejar el árbol ajeno peor).
15. Si vitest da fallos raros tras editar → limpiar caché stale `node_modules/.vite` antes de diagnosticar.
16. Si gates RED → arreglar (máx 3 intentos por ítem). Si sigue RED → escalar a High Priority en
    STATE.md y parar el ciclo (no commitear con gates rojos).
17. Opcional: verifier sub-agent (`loop-verifier` skill) → APPROVE/REJECT con evidencia.
18. **Antes de commitear** (además de gates GREEN): verificar (a) raíz crítica > 0 bytes y sin
    truncados (check-6/8 de `state-integrity-check` — incidente 19/08), (b) NO hay `D ` staged de
    `.ts`/`.test.ts` ajenos al plan (deletions de #25), (c) el diff staged es SOLO del plan.
    Commit SOLO si gates GREEN. Registrar evidencia en `loop-run-log.md` ([I]/[V]/[R]) y actualizar
    `STATE.md` (marcar tarea DONE con commit hash + tests).

### R — Reiniciar

19. V=GREEN → siguiente ciclo inmediato (auto plan→build, sin esperar al humano).
20. V=REJECT → reinyectar el error al plan (máx 3 intentos por ítem; luego escalar a High Priority).
21. Backlog vacío o límites agotados (loop-budget.md) → reportar resumen en STATE.md y parar.
22. **Cerrar el lock propio** al terminar el ciclo (`loop-concurrency-guard`): borrar
    `.ultraia/loop/session.lock` SOLO si `session_id` coincide con el propio; nunca el de otra sesión.
23. Al final de cada ciclo, registrar el JSON de presupuesto (formato `loop-budget` skill).

## Plantilla de plan (`.opencode/plans/loop-<taskid>-<slug>.md`)

> Plantilla ampliada en el ciclo 57 (fuente FundamentosDeLaProgramacion Bloque B): prioridades
> P0-P5, RECURSOS/PRESUPUESTO, NO-hacer y TOLERANCIAS. Ampliada en el ciclo 75 con los modos
> de operación (docs/MODOS-OPERACION.md): P-P integra S-D (Spec-Design) y L-T (Learn-Test)
> ANTES de escribir el plan; P-B las implementa y verifica el proyecto completo. Para requests
> individuales ver el skill `ultraia-request` (plantilla 13 campos + config declarativa de loop).

```markdown
# PLAN: <título de la tarea> (tarea #<id> de STATE.md, prioridad <P0-P5>)

Fecha: <YYYY-MM-DD> · Modo: <P-P|P-B|L-T|S-D> · Patrón: <bucle IA 4 fases si aplica> · Presupuesto: <tiempo est. / tokens>

## Contexto
- <por qué existe la tarea, enlace a spec/docs si aplica>

## SPEC (S-D integrado — fase P-P)
- <requisitos precisos: entradas, salidas, criterios de aceptación, límites>

## DESIGN (S-D integrado — fase P-P)
- <diseño: arquitectura/flujo elegido; diagrama opcional vía capability `diagram` (timeline/data-flow/architecture/loop)>

## LEARN (L-T integrado — fase P-P)
- <qué verdad verificada aplica (learning/truth/* + semantic_memory); lecciones relevantes (LEARNINGS.md); biblioteca de fracasos; gaps de autolearn que esta tarea cierra>

## TEST (L-T integrado — fase P-P)
- <estrategia de verificación: casos, fixtures, gates scoped; qué medirá el éxito>

## MEJORAS A ADICIONAR
- <mejoras que esta iteración ADICIONA al sistema (pedido usuario: "adicionar mejoras -> implementar -> verificar proyecto completo")>

## TECNOLOGÍAS EVALUADAS
- <open-source/MCP/Docker/nubes/otros lenguajes evaluados para esta tarea y decisión con motivo>

## Objetivo
- <una frase medible>

## Pasos
1. <paso concreto — cada paso toca archivos concretos>
2. ...

## Archivos a tocar (staging explícito)
- `path/al/archivo.ts` — <qué cambio>
- `path/al/archivo.test.ts` — <qué tests>

## RECURSOS / PRESUPUESTO
- <tools/scripts/skills/fuentes disponibles; estimación de tiempo; límite de tokens>

## NO-hacer (guardas explícitas)
- <paths ajenos, denylisted, sesiones concurrentes, qué NO modificar>

## Criterios de verificación
- Scoped: `npm run typecheck` + tests del paquete afectado (<paquete>)
- FULL antes de commit: typecheck → lint → test → build
- Tests esperados: <n> nuevos en <paquete> (total repo <n>)

## TOLERANCIAS
- <qué desviaciones se aceptan y cuándo parar/escalar (máx 3 intentos)>

## Riesgos / guardas
- <riesgos, paths denylisted, qué NO tocar>

## Esfuerzo estimado
- <bajo|medio|alto> — <justificación breve>
```

## Modos de operación (P-P / P-B / L-T / S-D)

Ver `docs/MODOS-OPERACION.md` (mapa central) y la skill `modos-operacion`. Resumen:

| Modo | Rol | Sub-fases | Verificación |
|---|---|---|---|
| **P-P** (Piv-Plan) | Planificar | Sensado → **S-D** (spec+design+diagrama) → **L-T** (learn+test) → Investigación (web/arXiv/GitHub/PDFs + enlaces.txt + MCP + Docker) → Razonamiento (plan file + [P] + predicción) | Plan completo + criterios scoped/FULL |
| **P-B** (Piv-Build) | Construir | Leer plan del archivo → Adicionar mejoras → Implementar → **Verificar proyecto completo** (gates FULL + cuarentena + smoke) → Ajuste (LEARNINGS + fracasos + autolearn) | Gates FULL en orden CI |
| **L-T** | Aprender y testear | Learn (LEARNINGS + truth + memoria) → Test (evidencia) | Evidencia de aprendizaje |
| **S-D** | Especificar y diseñar | Spec (requisitos/criterios) → Design (diseño + diagrama) | Artefactos spec/design |

- Repositorio propio: guardar datos/creaciones/pruebas/prototipos/PDFs en
  `.ultraia/vault/<kind>/` (tool `vault_manage`; export GitHub opcional con GH_TOKEN).
- Búsquedas: `pdfsearch_search` (PDFs: OpenAlex + DDG filetype:pdf) y `research_search`
  (web/arXiv/GitHub, ahora con fuente `pdf`).

## Prioridades P0-P5 (criterio de orden del backlog)

- **P0** bloqueante/seguridad (gates RED, secrets, corrupción) → arreglar YA, escalar si aplica.
- **P1** alta (feature del backlog activo, bloquea a otras tareas).
- **P2** media (mejora verificable).
- **P3** baja (nice-to-have).
- **P4** deuda postergable.
- **P5** descartable/sin validar — NO planificar hasta validar.

## Auto-conmutación Plan→Build

- Driver: `python scripts/loop_piv.py [--cycles N] [--gate-only] [--gate] [--verify PLAN] [--plan-only] [--triage]
  [--no-commit] [--dry-run]` — emite la petición de build automáticamente al terminar P
  (`opencode run --agent piv-build "<plan>"`) pasando la RUTA del plan file.
  `--gate` corre el gate runner determinista (`scripts/loop_gate.py`): mata dev servers antes
  del build y ejecuta typecheck→lint→test→build; idóneo para la fase V de forma aislada.
  `--verify <plan.md>` corre el verifier determinista (`scripts/loop_verifier.py`): valida
  secciones obligatorias del plan + existencia de archivos planificados y responde APPROVE/REJECT.
- En-sesión: conmutar de plan a build sin esperar confirmación (autorización permanente del
  usuario 15/08/2026). Los gates humanos aplican SOLO a push/merge.

## Reglas de oro

- Gates FULL antes de CADA commit. Nunca deshabilitar tests para pasar CI.
- Máx 3 fix attempts por ítem. Un fix por run (no refactorizar código no relacionado).
- Si el estado es confuso → leer STATE.md y run-log ANTES de actuar; nunca inventar estado.
- El driver puede fallar → registrar el fallo en run-log y escalar; nunca loop infinito silencioso.

## Definition of Done (DoD) del harness PIVR

El harness se considera completo cuando:

- **C1 — Doctor determinista**: `scripts/state_doctor.py` implementa los 13 checks como
  funciones puras y es ejecutable en CI sin `opencode` (verificado por
  `scripts/state_doctor.test.py`, 27 tests). El driver `scripts/loop_piv.py --doctor`
  lo invoca como pre-flight *advisory* (no aborta el ciclo salvo `--doctor` aislado,
  que usa `as_gate=True` y devuelve el exit code real).
- **C2 — Triage determinista**: `scripts/loop_triage.py` corre `state_doctor` como paso 0
  y escribe un bloque idempotente `<!-- TRIAGE:AUTO:START -->…<!-- TRIAGE:AUTO:END -->`
  en STATE.md (no destructivo); verificado por `scripts/loop_triage.test.py`, 7 tests.
- **C3 — Espejos de skills en sync**: `scripts/sync_skill_mirrors.py` materializa
  `.opencode/skills/<n>/SKILL.md` → `skills/<n>/SKILL.md` SOLO para los ESPEJOS (skills
  con contraparte en ambos lados), omitiendo los *source-only*; verificado por
  `scripts/sync_skill_mirrors.test.py`, 5 tests. Los skills siguen siendo wrappers
  in-session; los scripts Python son la fuente canónica de ejecución.

Verificación global: `npm run harness:test` corre los 5 harness tests (doctor, triage,
loop_piv_doctor, loop_piv_mark_done, sync) y debe quedar en verde. En CI, `state_doctor`
es el pre-flight obligatorio (espejos, encoding, lock, kill switch, root crítico a 0 bytes).

### Drivers canónicos (scripts Python, no `opencode`)

Para que el harness corra en CI sin un agente, los tres subsistemas tienen script Python
determinista como fuente de verdad:

| Subsistema | Script canónico | Skill in-session (wrapper) |
|---|---|---|
| Doctor (integridad) | `scripts/state_doctor.py` | `state-integrity-check` |
| Triage (priorización) | `scripts/loop_triage.py` | `loop-triage` |
| Driver PIVR | `scripts/loop_piv.py` | `loop-piv` |
| Sync espejos | `scripts/sync_skill_mirrors.py` | (mantenimiento) |

El driver `scripts/loop_piv.py` invoca `state_doctor.py` y `loop_triage.py` vía
`subprocess` (advisory en ciclos, gate en `--doctor` aislado), NO via `opencode run
--agent`. Esto garantiza reproducibilidad y evita dependencias del runtime del agente.
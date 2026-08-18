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
2. Si existe `loop-pause-all` en STATE.md o run-log → **detener el bucle** e informar.
3. Verificar que la PRIMERA tarea del backlog sigue `pendiente` en STATE.md (guard contra trabajo duplicado).
4. Escribir el plan en `.opencode/plans/loop-<taskid>-<slug>.md` usando la plantilla de abajo.
   - Pre-flight: presupuesto (`loop-budget` skill) + kill switch + lecciones.
   - El plan debe listar EXPLÍCITAMENTE los archivos que se tocarán (clave para el staging del build).
5. Registrar en `loop-run-log.md` un resumen corto `[P]` (objetivo + ruta del plan file).
   NO editar código fuente en esta fase.

### I — Implementar

6. Leer el plan desde su archivo (`.opencode/plans/loop-<taskid>-<slug>.md`), no desde el prompt.
7. Pre-flight de working tree: `git status --porcelain` → inventario de ruido NO relacionado al plan.
8. Ejecutar el plan con las tools del proyecto (workspaces, worktree si aplica).
9. Staging EXPLÍCITO: `git add <archivos listados en el plan>` — NUNCA `git add .` ni `git add -A`.
   El ruido externo (fetches de datos, docs ajenas) queda fuera del commit.
10. Un commit por iteración: `feat|fix|chore(scope): <descripción>`.
11. NUNCA push ni merge (aprobación humana). NUNCA tocar paths denylisted
    (`.env`, `.env.*`, `auth/`, `payments/`, `secrets/`, `credentials/`).

### V — Verificar

12. Gates duales en orden CI:
    - Scoped (typecheck + tests del paquete afectado) en iteraciones intermedias.
    - FULL en cada commit: `npm run typecheck` → `npm run lint` → `npm run test` → `npm run build`.
13. Antes de `npm run build`: matar dev servers (`taskkill /T /F` sobre procesos `next dev`/uvicorn) —
    un dev server corriendo rompe el build (chunks `_next/static` 404).
14. Si vitest da fallos raros tras editar → limpiar caché stale `node_modules/.vite` antes de diagnosticar.
15. Si gates RED → arreglar (máx 3 intentos por ítem). Si sigue RED → escalar a High Priority en
    STATE.md y parar el ciclo (no commitear con gates rojos).
16. Opcional: verifier sub-agent (`loop-verifier` skill) → APPROVE/REJECT con evidencia.
17. Commit SOLO si gates GREEN. Registrar evidencia en `loop-run-log.md` ([I]/[V]/[R]) y actualizar
    `STATE.md` (marcar tarea DONE con commit hash + tests).

### R — Reiniciar

18. V=GREEN → siguiente ciclo inmediato (auto plan→build, sin esperar al humano).
19. V=REJECT → reinyectar el error al plan (máx 3 intentos por ítem; luego escalar a High Priority).
20. Backlog vacío o límites agotados (loop-budget.md) → reportar resumen en STATE.md y parar.
21. Al final de cada ciclo, registrar el JSON de presupuesto (formato `loop-budget` skill).

## Plantilla de plan (`.opencode/plans/loop-<taskid>-<slug>.md`)

```markdown
# PLAN: <título de la tarea> (tarea #<id> de STATE.md)

Fecha: <YYYY-MM-DD> · Modo: <plan|build>

## Contexto
- <por qué existe la tarea, enlace a spec/docs si aplica>

## Objetivo
- <una frase medible>

## Pasos
1. <paso concreto — cada paso toca archivos concretos>
2. ...

## Archivos a tocar (staging explícito)
- `path/al/archivo.ts` — <qué cambio>
- `path/al/archivo.test.ts` — <qué tests>

## Criterios de verificación
- Scoped: `npm run typecheck` + tests del paquete afectado (<paquete>)
- FULL antes de commit: typecheck → lint → test → build
- Tests esperados: <n> nuevos en <paquete> (total repo <n>)

## Riesgos / guardas
- <riesgos, paths denylisted, qué NO tocar>

## Esfuerzo estimado
- <bajo|medio|alto> — <justificación breve>
```

## Auto-conmutación Plan→Build

- Driver: `python scripts/loop_piv.py [--cycles N] [--gate-only] [--plan-only] [--triage]
  [--no-commit] [--dry-run]` — emite la petición de build automáticamente al terminar P
  (`opencode run --agent piv-build "<plan>"`) pasando la RUTA del plan file.
- En-sesión: conmutar de plan a build sin esperar confirmación (autorización permanente del
  usuario 15/08/2026). Los gates humanos aplican SOLO a push/merge.

## Reglas de oro

- Gates FULL antes de CADA commit. Nunca deshabilitar tests para pasar CI.
- Máx 3 fix attempts por ítem. Un fix por run (no refactorizar código no relacionado).
- Si el estado es confuso → leer STATE.md y run-log ANTES de actuar; nunca inventar estado.
- El driver puede fallar → registrar el fallo en run-log y escalar; nunca loop infinito silencioso.

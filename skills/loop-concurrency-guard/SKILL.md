---
name: loop-concurrency-guard
description: >
  Detecta y previene colisiones entre sesiones concurrentes del loop PIVR (dos opencode /
  loop_piv.py corriendo a la vez sobre el mismo working tree). Escribe/lee un lock file antes
  de tomar una tarea y formaliza la cuarentena de WIP ajeno para poder correr gates FULL sin
  perderlo. Usar SIEMPRE al inicio de la fase P (antes de considerar el repo "libre para
  trabajar") y antes de cualquier `npm run build` o commit.
user_invocable: true
---

# Loop Concurrency Guard

Este proyecto ya perdió tiempo real por esto, documentado en su propio STATE.md/AGENTS.md:
iteración 25/26 (archivos `cloud.ts` borrados 5+ veces por una sesión concurrente, `.next`
corrupto repetido), iteración 41 (wiring de discord/slack diferido porque `llm.ts`/`index.ts`
estaban sucios de otra sesión), iteración 46 (pausada horas — el banner de STATE.md quedó
diciendo "PAUSADA" mientras el kill switch real, `loop-pause-all`, nunca se activó). Cada vez
se resolvió a mano reinventando el mismo patrón de aislamiento a `%TEMP%\opencode\*`. Esta
skill formaliza ese patrón para que no se reinvente una quinta vez.

## Lock file

Ruta: `.ultraia/loop/session.lock` (JSON). **Confirmar que todo `.ultraia/` está en
`.gitignore`** — hoy solo están confirmadas `recordings/`, `logs/` y `screenshots/`; si el
resto del árbol no está cubierto, añadirlo antes de depender de este lock.

```json
{
  "session_id": "<pid>-<hostname>-<timestamp_inicio>",
  "started_at": "<ISO8601>",
  "task_id": 41,
  "touching": ["packages/core/src/tools/x.ts", "packages/core/src/tools/x.test.ts"],
  "heartbeat_at": "<ISO8601>"
}
```

## Protocolo

### Antes de la fase P (tomar el lock)

1. Leer `.ultraia/loop/session.lock` si existe.
2. Si existe y `heartbeat_at` es de hace menos de 30 minutos → **otra sesión está activa**. No
   tomar una tarea nueva del backlog. Registrar en `loop-run-log.md`:
   `[P] SKIP — lock activo de <session_id> desde <heartbeat_at>` y salir. No es un error, es
   cortesía entre sesiones.
3. Si no existe, o el heartbeat tiene más de 30 minutos (sesión muerta o crasheada sin limpiar
   su lock) → escribir el lock propio con el `task_id` elegido y la lista `touching` tomada del
   plan recién escrito.
4. Refrescar `heartbeat_at` al entrar a la fase I y antes de cada gate.

### Antes de `npm run build` / gates FULL

5. `git status --porcelain` → cualquier archivo sucio que NO esté en `touching` ni en los
   archivos del plan propio es de otra sesión (con o sin lock — el lock puede no cubrir
   ediciones manuales del usuario). Aislar con el patrón ya verificado en este proyecto:
   - Copiar (nunca mover) esos archivos a `%TEMP%\opencode\wip-quarantine-<fecha>\`
     conservando la ruta relativa — incluir también los `.test.ts`/`.ts` **untracked**, que no
     aparecen en ningún manifest de git y se pierden fácil.
   - Correr los gates.
   - Restaurar byte a byte (comparar `Get-FileHash` antes/después) — nunca dejar el árbol
     ajeno en peor estado del que estaba.
6. Nunca commitear archivos fuera de `touching` (esto ya lo exige `loop-constraints.md` —
   este paso es la comprobación mecánica de esa regla, no una regla nueva).

### Al terminar (fase R)

7. Si la tarea cerró (DONE) o se abandona → borrar `.ultraia/loop/session.lock`, pero **solo**
   si `session_id` coincide con el propio. Nunca borrar el lock de otra sesión.

## Cuándo NO aplica

- Ciclos `--gate-only` o `--dry-run` (no tocan el working tree más allá de leer) no necesitan
  tomar lock.
- `loop-triage` es report-only — no toma lock, pero sí debe leerlo: un lock activo es una línea
  útil en el reporte de triage ("sesión concurrente detectada, no tocar X").

## Relación con otras skills

- `loop-constraints` define QUÉ no se puede tocar (denylist, un fix por run); esta skill define
  CÓMO no pisar a otra sesión mientras se respeta lo anterior.
- `state-integrity-check` puede detectar el síntoma (banner desincronizado del kill switch);
  esta skill previene la causa (dos sesiones sin coordinarse).

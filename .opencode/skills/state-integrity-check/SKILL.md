---
name: state-integrity-check
description: >
  Verifica la integridad estructural de STATE.md antes de que loop-triage o loop_piv.py confíen
  en él: IDs de backlog duplicados, filas fuera de la tabla (después del separador de cierre),
  desincronización entre el banner superior y el kill switch real (`loop-pause-all`), artefactos
  de encoding, archivos críticos de la raíz a 0 bytes o truncados (incidentes 18-19/08/2026),
  espejos de skills desync, estado del lock de concurrencia, deletions staged, drift de bitácora
  y colisión de plan files. Usar al inicio de cada triage y antes de que el driver tome
  `next_task()` para una nueva tarea.
user_invocable: true
---

# State Integrity Check

`scripts/loop_piv.py::next_task()` toma la PRIMERA fila que matchea el patrón de "pendiente"
en orden de archivo — no por número de ID, no valida que sea único. Si la tabla tiene filas
duplicadas, filas fuera de orden, o el banner superior no refleja el kill switch real, un
humano (o el propio driver) puede actuar sobre información falsa sin darse cuenta. Esta skill
es una pasada de **lectura**: nunca escribe STATE.md por sí sola, solo reporta.

## Checks

1. **IDs duplicados**: parsear todas las filas `| # | Tarea | Scope | Gates | Estado |` de la
   tabla del backlog; agrupar por el número de la columna 1; reportar cualquier ID que aparezca
   más de una vez, con ambas descripciones (síntoma típico de dos sesiones escribiendo el mismo
   número de tarea sin coordinarse — ya pasó con #16, #17, #36, #41 en el historial de este
   proyecto).
2. **Filas fuera de la tabla**: cualquier fila `| N | ... |` que aparezca DESPUÉS de la línea
   `---` seguida de `Run log: loop-run-log.md` (el cierre visual de la sección) es una fila que
   se perdió del cuerpo de la tabla — debería estar dentro, ordenada por ID.
3. **Banner vs kill switch real**: si el banner superior de STATE.md contiene palabras como
   "PAUSADA", "DETENIDA" o "esperando confirmación", buscar el string literal `loop-pause-all`
   en STATE.md y en loop-run-log.md como TOKEN ACTIVO — ignorar menciones en prosa negadas
   ("sin `loop-pause-all`", "ausente", "no activo"; falso positivo real en loop-run-log.md
   L1959, fix 19/08/2026 en `kill_switch_active()` con ventana de 24 chars previos y
   negaciones sin/ausente/no activo). Si NO hay ocurrencia activa → **alerta**: el
   banner dice pausado pero el kill switch mecánico está apagado — cualquier ciclo nuevo
   procederá igual que si nunca se hubiera pausado. Reportar como High Priority; no decidir
   unilateralmente cuál de los dos "gana".
4. **Artefactos de encoding**: buscar el carácter de reemplazo Unicode (`�`) — señal de
   que alguna escritura pasada usó una codificación distinta a UTF-8 (ver
   `loop-constraints.md` §UltraIa-specific: PowerShell 5.1 + `Set-Content -Encoding UTF8` mete
   BOM y rompe texto). Reportar las líneas afectadas.
5. **Banner desactualizado**: si el banner tiene fecha/hora y existen filas DONE en la tabla
   con fecha posterior a esa, el banner es candidato a obsoleto — reportarlo, no borrarlo.

6. **Archivos criticos de la raiz a 0 bytes** (incidente 19/08/2026: 36+ archivos versionados vaciados por una sesion): comprobar que los archivos criticos del repo tienen tamano > 0: `package.json`, `package-lock.json`, `tsconfig.base.json`, `AGENTS.md`, `AGENT.md`, `LOOP.md`, `loop-constraints.md`, `loop-budget.md`, `loop-verifier.md`, `opencode.json`, `README.md`, `start.py`, `run-all.ps1`, `STATE.md`, `loop-run-log.md`, `.gitignore`. Cualquiera a 0 bytes = ALERTA ROJA (un commit sin pathspec lo arrastraria al repo). Reparacion: `git restore --source=HEAD -- <path>` si el archivo esta en git; si solo esta staged (no en HEAD), `git cat-file blob <hash-de-git-ls-files> > <path>`; si no esta en git, restaurar de copia/backup o reportar perdida. Existe `scripts/restore-empty-tracked.ps1` con el escaneo + restauracion automatizados.
7. **Firma temporal del vaciado masivo**: si varios archivos comparten un mismo `LastWriteTime` reciente y tamano 0, es una herramienta/escriba que vacio archivos en masa (se senal del incidente 22:53:27 18/08/2026). Reportar el mtime compartido como firma.
8. **Truncados selectivos (< 50% del blob en HEAD)** (incidente 19/08 iter-67: `.gitignore` paso de 78 a 1 linea y se restauro desde el index): un archivo TRACKED que no esta a 0 bytes pero su tamano es < 50% del tamano de su blob en HEAD es candidato a vaciado/truncado parcial (o a reescritura con codificacion rota). Comparar contra `git cat-file -s HEAD:<path>`; si el archivo NO esta en HEAD (nuevo) no aplica. Reportar la relacion `actual/HEAD` (ej: `.gitignore` 1/78 lineas). No corregir: reportar (reparacion igual que check-6).
9. **Espejos de skills desync** (patron iter-62): los skills del harness viven DUPLICADOS en `.opencode/skills/<name>/SKILL.md` y `skills/<name>/SKILL.md` (raiz) y deben ser byte-identicos. Calcular SHA-1 de los 8 espejos (`loop-piv`, `loop-triage`, `loop-verifier`, `state-integrity-check`, `loop-budget`, `loop-concurrency-guard`, `loop-constraints`, `ultraia-request`) y reportar cualquier DESYNC con ambos hashes. Un desync significa que una sesion edito un lado y no sincronizo — el siguiente agente que cargue el skill podria leer la version vieja.
10. **Estado del lock de concurrencia** (`.ultraia/loop/session.lock`, contrato del skill loop-concurrency-guard): reportar UNA linea — `activo` (heartbeat < 30 min: otra sesion trabajando, no tomar tarea), `stale` (heartbeat >= 30 min: sesion muerta, lock recuperable) o `ausente`. Incluir `session_id` y `task_id` si existen. Es lectura, no toma ni libera el lock.
11. **Deletions staged y batch del indice**: `git status --porcelain` — contar filas staged (columna 1 no vacia: `A`/`M`/`D`/`R`/`C`); alertar si hay `D ` de archivos `.ts`/`.test.ts` tracked (precedente iter-46: deletions staged de test files ajenos; un commit sin pathspec los elimina del repo) y si el batch total > 50 archivos staged (precedente INDEX ~128 de #25 — riesgo de commit accidental).
12. **Drift de bitacora**: leer las 3-5 ultimas entradas de `loop-run-log.md`; si la ULTIMA entrada de ciclo (patron `### Iteracion` o `[R]`) no termina en `[R]` con hash de commit o no incluye el JSON de presupuesto (bloque ```json con `duration_s`), es drift (precedente BITACORA DRIFT post-loop-52: entradas `[V]` sin `[R]`). Reportar la fecha de la ultima entrada completa.
13. **Colision de plan files**: `git ls-files .opencode/plans/` + untracked — agrupar por `loop-<taskid>-*`; si el mismo task_id tiene 2+ plan files distintos, dos sesiones planificaron la misma tarea (precedente loop-36-wiring vs loop-36-growth). Reportar los nombres; el ciclo PIVR decide cual gana (el mas reciente por mtime, o CEDE si el lock es ajeno).

## Salida

Bloque corto, pensado para insertarse en el reporte de `loop-triage` (o standalone si se invoca
sola):

```
STATE.md integrity: <N> issues
- duplicate-id: #16 (dos filas distintas — ver líneas X e Y)
- orphan-row: #47 (fuera de la tabla, después del separador de cierre)
- banner-desync: banner dice "PAUSADA", pero loop-pause-all está AUSENTE de STATE.md y loop-run-log.md
- encoding: N líneas con el carácter de reemplazo
- stale-banner: banner fechado <fecha>, hay filas DONE posteriores
- root-empty: N archivos criticos de la raiz a 0 bytes (<lista>) — ALERTA ROJA
- mass-wipe: N archivos con el mismo mtime reciente y 0 bytes (firma <mtime>) — posible vaciado en masa
- root-truncated: N archivos tracked < 50% del blob HEAD (<lista con ratio>) — ALERTA
- skill-mirror-desync: <skill> (.opencode=<hash> root=<hash>) — 1 de 8 espejos NO sincronizados
- lock: activo (task <id>, heartbeat <h>) | stale (task <id>) | ausente
- staged-deletions: N archivos .ts/.test.ts borrados en el indice (<lista>) — riesgo commit accidental
- index-batch: N archivos staged (>50) — riesgo commit sin pathspec
- run-log-drift: ultima entrada de ciclo sin [R]/hash o sin JSON presupuesto (<fecha>)
- plan-collision: task <id> tiene N plan files (<nombres>)
```

## Regla

Nunca edita STATE.md, loop-run-log.md ni ningún archivo fuente. Solo reporta — la corrección la
decide `loop-triage` o el humano (mismo principio que `loop-triage`: "signal, not invention").
# PLAN: Cierre L826 (midudev/libros-programacion-gratis) + corrección High Priority obsoletas (iteración 64, P1)

Fecha: 2026-08-18 · Modo: plan (este archivo) → build · Patrón: bucle IA 4 fases (C1 verificar/C2 corregir/C3 consolidar) · Presupuesto: ~20 min / 15-25k tokens (docs-only)

## Contexto
- Plan fundamentos 56-62 CERRADO por ambos lados (43121b1: push aprobado b4b3bf9..c729041, 29 commits, 0 restantes). Backlog sin filas pendientes de código (#6 GPU humana, #17 app review humana, #25 EN CURSO ajeno).
- High Priority L97 (STATE.md): "enlaces.txt L826 NUEVO: midudev/libros-programacion-gratis — pendiente de análisis per protocolo enlaces.txt".
- EVALUACIÓN (hecha en P): la L826 YA está procesada — learning/sources/libros-programacion-gratis.md declara "Fuente: https://github.com/midudev/libros-programacion-gratis (librosgratis.dev), enlaces.txt L826" + capability libros DONE (6b7e13d, 31 tests). La High Priority quedó OBSOLETA sin cerrar.
- Correcciones pendientes detectadas (lo que "corrige" esta iteración): High Priority con 6+ entradas obsoletas (L84 PLAN 61, L85 WIRINGS PENDIENTES, L86 PLAN 60, L88 ITER 58 CEDIDA, L89 r55, L90 r58 ACTIVA — todas cerradas ya).
- Petición NUEVA detectada: enlaces.txt fue REEMPLAZADO (MM, 3 líneas) con post Instagram DcL0G4MDiKV — pendiente de análisis (requiere acceso/auth; precedente L807 Facebook BLOQUEADO). NO inventar contenido.

## Objetivo
Cerrar la pendiente L826 con evidencia verificable y dejar High Priority corregida/condensada (sin entradas obsoletas), anotando la nueva petición Instagram. Docs-only (sin .ts → sin gates de código; precedente loop-44/56).

## Pasos
1. C1 verificación (evidencia L826): grep "L826" en learning/sources/libros-programacion-gratis.md + fila 55 STATE.md (6b7e13d, 31 tests) + paquete tools/libros.ts existe. Recopilar evidencia textual.
2. C2 corrección STATE.md (SOLO si estable — ver TOLERANCIAS): reemplazar la entrada L826-obsoleta por "CERRADO 18/08 (evidencia: fuente libros-programacion-gratis.md L826 + 6b7e13d)" y condensar las 6 entradas obsoletas de High Priority en UNA línea de cierre (sin borrar info única: PLAN 60/61 referencias a archivos de plan). Añadir 1 línea nueva: petición Instagram DcL0G4MDiKV pendiente (requiere acceso).
3. C3 commit + bitácora: `git commit -m "chore(loop-64): ..." -- STATE.md loop-run-log.md` (paths-only SIEMPRE). Entrada [I]/[V]/[R] en loop-run-log.md (al final; protocolo anti-raza).

## Archivos a tocar (staging explícito)
- `loop-run-log.md` — entrada [P] (esta) + [I]/[V]/[R] al final (append con verificación anti-raza)
- `STATE.md` — High Priority: cerrar L826 + condensar obsoletas + anotar Instagram (CONDICIONAL a estabilidad: mtime sin cambios > 5 min y git log sin toques recientes)
- `.opencode/plans/loop-64-cierre-l826-hp.md` — este plan (untracked, referencia)

## RECURSOS / PRESUPUESTO
- Evidencia local (sin red): learning/sources/libros-programacion-gratis.md, STATE.md fila 55, packages/core/src/tools/libros.ts, git log 6b7e13d.
- Scripts patrón en %TEMP%: state63b.py/fix-runlog63.py (edición STATE.md + append run-log con verificación).
- Presupuesto: ~20 min; un solo commit con pathspec.

## NO-hacer (guardas explícitas)
- NO tocar enlaces.txt (MM staged+worktree, reemplazado hace minutos — en edición; EVADIR).
- NO tocar .gitignore (MM, mtime 22:54), .env.example/.env.cloud.example (M, 22:53) — en edición por sesión 57b; EVADIR.
- NO tocar batch staged #25 (~128 archivos: planes 46-53, travel media, cuentas.txt, LEARNINGS, deletions de tests) — nunca `git add .` ni commit sin pathspec.
- NO tocar WIP #25 (recorder/automation/blueprint/reach) ni .ultraia/travel/ ni migrations connections.
- NO analizar el post de Instagram sin acceso (no inventar contenido — precedente L807).
- NO tocar learning/LEARNINGS.md (en batch staged ajeno).

## Criterios de verificación
- Scoped (docs-only): grep evidencia L826 (fuente contiene "L826" + fila 55 con 6b7e13d/31 tests) → PASS.
- STATE.md: diff SOLO de las líneas High Priority previstas (+2/-6 aprox); sin tocar filas de tabla ni banner.
- run-log: append de 1 sección; verificar que las líneas previas del archivo siguen intactas tras append (comparar count contra HEAD + delta).
- Commit: `git show --stat` = SOLO STATE.md + loop-run-log.md. `git status --porcelain` post-commit: sin M nuevos fuera de los esperados.
- FULL gates: NO aplican (docs-only, precedente loop-44/56/57).

## TOLERANCIAS
- Si STATE.md está en edición activa (mtime < 5 min o git log reciente) al momento de C2 → NO editar STATE.md en esta iteración; dejar evidencia en run-log y reportar (regla: evadir lo que se edita). La iteración cierra igual con la evidencia L826 en run-log.
- Si run-log colisiona con escritura concurrente (append sobre versión truncada — lección iter-63) → restaurar desde HEAD (git show HEAD:loop-run-log.md) + re-append + verificar; máx 2 intentos.
- Máx 3 intentos por ítem; si gates RED (imposible sin .ts, pero si el árbol queda sucio) → no commitear, escalar a High Priority.

## Riesgos / guardas
- Raza con sesión 57b (STATE.md/run-log mtime frescos 23:02/23:26) — mitigado por TOLERANCIAS + pathspec.
- Commit sin pathspec arrastra batch #25 (lección iter-58: b37fcfb) — SIEMPRE `-- <paths>`.
- TS2308/colisión: N/A (sin .ts).

## Esfuerzo estimado
- BAJO — verificación con grep + 2 ediciones de estado + 1 commit pathspec. Sin código, sin gates FULL.
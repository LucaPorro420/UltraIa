# Plan — loop-172: Mejoras de uso local inmediato (1-click + cuaderno MD + tech leído)

## Contexto
El usuario pide continuar con mejoras para usar la app YA en local. La base loop-170/171 está
implementada y verificada (smoke 38/38) pero SIN commitear (build bloqueado por sesión
concurrente). Estas mejoras son aditivas, offline, y entran en el MISMO commit pendiente
(un solo `feat(biblio)` con un solo pase FULL de gates).

## Objetivo
Cero fricción para abrir y estudiar + apuntes portables + progreso completo de tecnologías.

## SPEC (3 mejoras, alcance cerrado)
1. **`TECH-LIBRARY/Abrir-Biblioteca.cmd` (nuevo, ASCII puro)**: doble-click → `msedge --app`
   con `file:///…/index.html` (perfil `%TEMP%\ultraia-biblio`); fallback al navegador por
   defecto si no hay Edge. Sin Node, sin servidor, sin red.
2. **Exportar cuaderno a Markdown**: `rutaCarpeta(id)` (breadcrumb `A / B`) + `cuadernoMD()`
   (constructor puro testeable: `# Mi cuaderno` → `## carpeta` → `### título` + `_origen_` +
   `> cita` + `**Mi nota:**`) + `exportarCuadernoMD()` (descarga `mi-cuaderno.md`) + botón
   en Guardados. Límite honesto: citas se guardan (600/2000 chars), no el material completo.
3. **Tech leído/estudiado**: `state.techRead` + `tl_tech_read` + `isTechRead/toggleTechRead`
   (mismo patrón que favs) + botón en detalle tech + card en Estadísticas + incluido en
   export/import (merge aditivo, no borra lo ausente).

## ARCHIVOS A TOCAR (con los pendientes = 7 en el commit)
- `TECH-LIBRARY/Abrir-Biblioteca.cmd` (nuevo)
- `TECH-LIBRARY/index.html` (edit: 8 hunks pequeños)
- `TECH-LIBRARY/INDEX.md` (edit: línea de apertura)
- `.opencode/plans/loop-172-mejoras-uso-local.md` (este plan)
- (+ los 4 de loop-170/171 ya listos)

## NO-hacer
- NO tocar `apps/web`, `packages/*`, WIP ajeno. NO `git add .`. NO push. NO `</script>` en
  strings. NO fetch. El `.cmd` es ASCII estricto (sin tildes/emojis: `cmd.exe` + UTF-8 = riesgo).

## Verificación
- Scoped: smoke extendido (cuadernoMD contiene títulos importados; toggleTechRead on/off;
  import mergea techRead sin borrar clips; render de vistas con techRead) + `node --check`
  launcher (sin cambios desde el OK previo; no se re-toca).
- FULL: typecheck → lint → test → build (build solo con árbol quieto: sin `next build` ajeno;
  matar `next dev` por regla antes; si hay carrera → NO commitear, escalar).
- Aceptación: doble-click `.cmd` abre ventana app; estudiar tech → cuenta en Estadísticas;
  cuaderno → `.md` legible.

## Predicción
Smoke 41+/41+; gates GREEN; 1 commit `feat(biblio)` con pathspec de 7 archivos.

## Prioridad / Esfuerzo
P0 (desbloquea uso diario) / XS.

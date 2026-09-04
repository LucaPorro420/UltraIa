# Plan — loop-173: Leer mejor + buscar en contenido + progreso visible

## Contexto
"Mejoralo": iteración de pulido sobre la app commiteada en `7b49f1e`. Tres fricciones reales
detectadas al usarla: (1) el detalle tech vuelca el contenido casi en bruto (los `##`, tablas
y citas se ven como párrafos planos); (2) el buscador y el agente solo miran títulos/tags
(no encuentran nada que viva dentro del texto); (3) el avance del curso no se ve en
Estadísticas. Todo offline, todo en `index.html`.

## SPEC
1. **`renderMD(md)`** (puro, testeable): fences ```↔`<pre><code>` (apertura Y cierre — el
   anterior nunca cerraba), `##/###`→`<h4>`, tablas `|`→`<table class="kv-table">` (salta fila
   separadora `---`), `>`→cita `.clip-cita`, `- /1. `→`<ul><li>`, inline `` `code` `` y
   `**bold**` (vía split por backtick sobre texto ya escapado — sin regex con backticks).
   CSS: `.tech-content h4`. Sustituye el renderer ingenuo en `renderTechDetail`.
2. **Búsqueda en contenido**: `getFilteredTech` añade `co` (títulos+contenido, cap 6000 chars
   por tech para acotar coste) como alternativa OR por término. `buscarTodo` del agente suma
   +1 por match en contenido (mismo cap).
3. **Progreso del curso en stats**: cards dominadas (`box>=2`) `X/182` + repaso pendiente,
   ambas con salto a Curso. Reutiliza `mazoCompleto/cajaDe/tarjetasVencidas` (hoisting OK:
   `renderStatsView` solo se ejecuta en INIT, posterior a las consts).

## ARCHIVOS A TOCAR
- `TECH-LIBRARY/index.html` (edit: CSS h4 + renderMD + renderer + 2 búsquedas + stats)
- `.opencode/plans/loop-173-leer-buscar-progreso.md` (este plan)

## NO-hacer
- NO cambiar el DATA embebido, NO tocar `apps/web`, `packages/*`, WIP ajeno. NO `git add .`.
  NO push. NO `</script>` en strings. NO fetch. Sin deps nuevas.

## Verificación
- Scoped: smoke con markdown sintético que cubre los 7 constructos + probe data-driven de
  palabra solo-en-contenido (elige palabra len≥8 con docCount≤2 para determinismo) +
  stats/agente asserts. `renderOK` sigue pasando en las 6 vistas.
- FULL: typecheck → lint → test → build (build solo con árbol quieto; matar `next dev`
  por regla; ante carrera externa → NO commitear).
- Aceptación: detalle tech con headings/tablas/código legibles; buscar "hook"/"middleware"…
  halla por contenido; stats muestra dominadas/pendientes.

## Predicción
Smoke 50+/50+; gates GREEN; 1 commit `feat(biblio)` pathspec de 2 archivos.

## Prioridad / Esfuerzo
P1 / XS.

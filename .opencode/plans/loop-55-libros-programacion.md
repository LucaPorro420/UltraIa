# Plan iteración 55 — Capability `libros` (enlaces.txt L826 → midudev/libros-programacion-gratis)

## Contexto
- Fuente: `enlaces.txt` L826 — `github.com/midudev/libros-programacion-gratis` ("Adicion la informacion del enlace de github").
- Análisis (README 404 líneas, descargado y leído): catálogo **librosgratis.dev** — 115 recursos gratuitos de programación en español, 32 secciones, 8 categorías. Formato uniforme `[Título](url) — Autor · Formato`; cada sección tiene descripción; sección "Cómo proponer un recurso" define reglas de propuesta (título, autor, enlace oficial, formato, confirmación gratis+español).
- Patrón transferible (precedentes diagram/video_edit/growth/harness): capability keyless determinista en core + wiring llm.ts + tests.

## Objetivo
Capability `libros`: catálogo determinista de libros gratuitos de programación (datos públicos del README) con búsqueda multi-término con score, listado por sección, agregación por categoría y validador de propuestas (reglas del README). Cero I/O, cero deps.

## Pasos
1. `learning/sources/libros-programacion-gratis.md` — fuente cruda (README completo, idempotente, con header de origen).
2. `docs/RAZONAMIENTO-LIBROS-PROGRAMACION.md` — análisis + mapeo implementado/pendiente (pendiente: conectar /recursos web con el catálogo; ampliar catálogo).
3. `packages/core/src/tools/libros.ts` — dominio puro:
   - `LIBROS`: 115 recursos `{seccion, titulo, autor?, url, formato}` (port datos).
   - `SECCIONES_LIBROS`: 32 `{id, titulo, descripcion, categoria}`.
   - `buscarLibros(input)` — multi-término case-insensitive, todos los términos en título|autor|sección; score título 3 > autor 2 > sección 1; orden desc; filtros `seccion?`, `formato?`, `max?` (default 20).
   - `librosPorSeccion(seccion)` → recursos de la sección (id normalizado).
   - `categoriasLibros()` → 8 categorías `{id, nombre, secciones, total}`.
   - `validarPropuestaLibro({titulo, autor, url, formato, gratis, espanol})` → `{ok, errores[]}` (reglas README: título ≥3, url http(s), formato ∈ {PDF, HTML, ePub, eBook}, gratis===true, espanol===true).
4. Wiring: capability `libros` → tool `libros_buscar` (acciones buscar/seccion/categorias/proponer) en `ai/llm.ts` + export namespace `libros` + descriptor en `tools/index.ts`.
5. Tests `libros.test.ts` (~24): integridad catálogo (115/32/8, URLs http(s), sin duplicados, formatos válidos, ids de sección consistentes); búsqueda (simple, multi-término, acentos, filtros, max, orden por score, vacío); porSeccion; categorías (conteos exactos vs README: Fundamentos 13/4, Lenguajes 71/15, etc.); propuesta (ok + 5 casos error).
6. LEARNINGS.md: lección breve.
7. Gates: scoped vitest `libros.test.ts` + `tsc --noEmit` core; luego FULL (typecheck → lint → test → build; árbol contiene WIP #25 — aislamiento si sus tests rojos aparecen, restauración byte-exact desde backup).

## Archivos A TOCAR
- NUEVOS: `packages/core/src/tools/libros.ts`, `packages/core/src/tools/libros.test.ts`, `learning/sources/libros-programacion-gratis.md`, `docs/RAZONAMIENTO-LIBROS-PROGRAMACION.md`
- MODIFICADOS: `packages/core/src/ai/llm.ts`, `packages/core/src/tools/index.ts`, `learning/LEARNINGS.md`, `STATE.md`, `loop-run-log.md`
- NO TOCAR: WIP #25 (automation/recorder/blueprint/reach/connections/publications/publish + media + cuentas.txt + planes ajenos + index raíz core). llm.ts/index.ts verificado LIMPIO (sin staged #25).

## Criterios
- Scoped: `npx vitest run src/tools/libros.test.ts` 0 failed; `npx tsc --noEmit` core 0 errores propios.
- FULL: typecheck/lint/test/build verdes (test con aislamiento de #25 si aplica; flakes Tunetank re-intentados).

## Riesgos
- Sesión #25 activa (evidencia: borró 3 test files suyos tras iter-54): mitigado con pathspec + no tocar sus archivos; backup r54 disponible.
- Datos grandes (115 entradas): generación mecánica desde el README verificado línea a línea; títulos con comillas internas → template literals.

## Esfuerzo
Medio-alto (datos extensos, lógica simple). 1 iteración.
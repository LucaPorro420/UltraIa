# Plan — Hub de Herramientas (/herramientas) + export itsfree.dev

- **Task ID:** 126
- **Status:** DONE (committed `2dd1d66`)
- **Mode:** build (aprobado por el usuario: "Ambos" + "Full 70 x 5 langs now" + "Require login" + "inicia")

## Contexto
El usuario quiere integrar las ~62 capacidades existentes de UltraIa en un directorio type
itsfree.dev (estilo minimalista, cards, search, filtros, multi-idioma) DENTRO de la app web,
y ademas generar el export para su publicacion en itsfree.dev. La intencion mas profunda:
"mejorar el programa" -> usar las herramientas para detectar y consolidar capacidades redundantes.

## Objetivo
1. Hub interno `/herramientas` (requiere login, grupo `(app)`) con:
   - Grid de 62 capacidades, buscador, chips de categoria, selector de 14 idiomas (RTL para `ar`).
   - Cada card linkea a la ruta real de la herramienta (studio/gallery/dashboard/cloud/metrics/ebooks).
2. API `GET /api/tools?lang=` que expone el catalogo serializado (consumida por el hub y por los scripts de export).
3. Catalogo fuente de verdad en `packages/core/src/tools/catalog.ts`:
   - `CATALOG_META` (62 caps, categoria + ruta + relacionadas + consolida), `ES` (62 es),
     `PT/IT/DE/ZH/RU` (62 c/u), `getToolCatalog(locale)`, `CATALOG_LOCALES`.
4. `docs/HERRAMIENTAS-MAP.md`: mapa por categoria + analisis de solapamiento y propuestas de consolidacion.
5. Scripts `scripts/export-tools-catalog.mjs` y `scripts/analyze-tool-overlap.mjs` (API-driven, listos para itsfree.dev).

## Archivos tocados (commit 2dd1d66)
- `packages/core/src/tools/catalog.ts` (nuevo) — catalogo + i18n.
- `packages/core/src/tools/catalog.test.ts` (nuevo) — 3 tests (14 langs, cobertura 100%, fallback).
- `packages/core/src/tools/index.ts` (edit) — `export * from './catalog';`.
- `apps/web/src/app/api/tools/route.ts` (nuevo) — GET `?lang=`.
- `apps/web/src/app/(app)/herramientas/page.tsx` (nuevo) — server component, login-protected.
- `apps/web/src/app/(app)/herramientas/tool-catalog-client.tsx` (nuevo) — cliente 14 idiomas + RTL.
- `apps/web/src/components/ide/nav-items.ts` (edit) — entrada `Herramientas` (`/herramientas`, icono `Boxes`).
- `scripts/export-tools-catalog.mjs` (nuevo).
- `scripts/analyze-tool-overlap.mjs` (nuevo).
- `docs/HERRAMIENTAS-MAP.md` (nuevo).

## Verificacion (gates CI, todos GREEN)
- `npm run typecheck` (core + web + runtime): OK.
- `npm run lint` (next lint): sin warnings ni errores.
- `npm run test` (core 1766 + runtime 193 = 1959): OK incl. `catalog.test.ts`.
- `npm run build`: OK — `/herramientas` presente en el manifest (1.52 kB, dynamic).

## Prediccion (resultado real)
Hub funcional con 62 capacidades en 11 categorias, 7 idiomas con traduccion completa
(es/en/pt/it/de/zh/ru), fallback a es/en para los 7 restantes. Export itsfree.dev listo via scripts.

## Riesgos / notas
- **Conflicto de concurrencia (sesion #25):** durante este ciclo la sesion concurrente #25
  BORRO repetidamente `packages/core/src/tools/catalog.ts`, `catalog.test.ts` y revirtio el
  export en `index.ts` (y los archivos nuevos del hub) DESPUES de que pasaban los gates.
  Mitigado con el quarantine `%TEMP%\opencode\wip-quarantine-20260826\` (restauracion byte-exacta)
  + commit inmediato. **Recomendacion:** pausar/coordinar la sesion #25 antes de seguir para
  evitar borrados en cadena.
- No se hicieron pushes (requiere aprobacion humana).
- No se tocaron los archivos de la sesion concurrente (`connections-*`, `_diag.ts`, `ai/llm.ts`).

# Plan — Navegador de prototipos en /lab

## Contexto
Usuario aprobó ("Si.") ampliar /lab con un navegador de prototipos prefabricados que sirva los
HTML ya generados en `resultTask/` y un buscador/filtro por área. `resultTask/` NO está en
.gitignore (sí lo está solo `resultTask/browser-e2e/shots/`), así que los artefactos son versionables.

## Objetivo
- API `GET /api/prototypes` → lista `{id,name,category,ext}` caminando `resultTask/` (exts permitidas).
- API `GET /api/prototypes/[...slug]` → sirve el archivo con content-type correcto, con guarda
  anti path-traversal (resuelve y verifica prefijo `resultTask/`).
- `lab-client.tsx` → sección "Prototipos prefabricados" con input de búsqueda + chips de categoría
  y grid de cards (iframe para .html/.svg, <img> para imágenes, link para el resto).

## Archivos a tocar
- `apps/web/src/app/api/prototypes/route.ts` (nuevo) — listado.
- `apps/web/src/app/api/prototypes/[...slug]/route.ts` (nuevo) — servir archivo.
- `apps/web/src/components/lab-client.tsx` — sección `PrototypesSection`.
- `.opencode/plans/loop-128-prototype-browser.md` (plan).

## NO-hacer
- No servir fuera de `resultTask/`; validar `..` y prefijo.
- No exponer secrets; solo html/svg/png/jpg/gltf/obj/mp4/webm.

## Verificación
- typecheck (web) ✅ · lint ✅ · test ✅ · build ✅ (matar dev antes).

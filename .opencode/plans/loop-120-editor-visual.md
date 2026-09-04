# Plan loop-120 - Barrido de errores + Editor Visual no-code (notas/peticiones)

## Contexto
- Peticion usuario: "Revisa e corrige los errores y dame un apartado para que pueda
  modificar la pagina agregar nota e peticiones desde el navegador web como si fuera
  un wordpress, figma u otro editor de ui/ux no code".
- Dos frentes en UN ciclo: (A) QA real de la app corriendo (console errors + HTTP) con
  correccion de lo encontrado; (B) feature nueva: capa de anotacion/edicion visual.
- Estado: HEAD fbfd325 (= origin/master, v1.0.0 pusheada); WIP ajeno netwatch sigue en
  arbol (NO tocar). Sin dev servers activos. Gates FULL verdes en iter-119.

## A) Barrido de errores
- Dev server limpio (IPv4 explicito, leccion iter-66) + driver headless del skill
  browser-automation (--eval IIFE, NO --script con rutas absolutas - leccion Windows).
- Paginas publicas (/ ,/login,/register,/blog,/explore,/recursos,/roadmap) + redireccion
  de paginas auth a /login. Recolectar console errors + failed requests por pagina.
- FIX solo de errores REPRODUCIBLES encontrados; reportar lo que requiera decision.

## B) Editor Visual v1 (alcance)
- **Modelo Prisma `PageAnnotation`** (migracion add_page_annotations): page, selector?,
  anchorText?, kind (nota|peticion|texto), body, nuevoTexto?, estado (abierta|resuelta),
  visible, creadoPorId, timestamps.
- **Dominio puro** `packages/core/src/domain/page-editor.ts` + tests fake-db (patron
  publications.test.ts): crear/listar/resolver/reabrir/borrar + `buildOverrides`
  (Map selector->texto para el injector) + `uniqueSelectorPath` (generador determinista).
- **API auth**: GET/POST `/api/editor/annotations` (+filtro ?page=), PATCH/DELETE
  `/api/editor/annotations/[id]` (resolver/reabrir/visible; DELETE admin o autor).
  Regla: kind=texto SOLO ADMIN; nota/peticion cualquier usuario autenticado.
- **Capa cliente** `components/editor/annotation-layer.tsx` ('use client') montada en
  `(app)/layout.tsx`: aplica overrides de texto por selector tras hidratacion; pines
  fijos sobre getBoundingClientRect (recompute scroll/resize); popover de detalle;
  modo edicion con `?editar=1` (hover outline + click captura selector + toolbar:
  Editar texto / Nota / Peticion).
- **Panel admin** `/editor` (server requireUser + client): lista agrupada por pagina,
  crear nota general sin selector, resolver/reabrir, visibilidad, borrar, enlace
  "Abrir en modo edicion".
- **Nav**: entrada `Editor` (PenTool) en WORKSPACE_ITEMS tras Builder.

## NO-hacer
- Edicion visual de la landing publica (fuera del shell (app)) - roadmap v1.1.
- Drag&drop de layout (ya existe /builder) ni CSS visual completo (v1 = texto+notas).
- Tocar WIP netwatch concurrente; push NO (requiere aprobacion humana).

## Verificacion
- Dominio: vitest scoped page-editor (fake db, ~10 tests).
- FULL CI order tras matar dev server: typecheck/lint/test/build (~50 paginas, ahora 51 con /editor).
- Smoke navegador del modo edicion si el entorno lo permite (fail-soft).

## Riesgos
- Migracion Prisma sobre dev.db en uso -> patrón existente (db:migrate) probado.
- Selector frágil ante cambios de UI -> anchorText como pista + UI permite borrar pin huerfano.
- Carrera con sesion concurrente en llm.ts/index.ts -> yo NO toco esos archivos.

## Recursos/presupuesto
1 ciclo PIVR; esfuerzo M; gates ~15 min.

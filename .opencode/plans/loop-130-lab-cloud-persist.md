---
id: 130
slug: lab-cloud-persist
title: Persistir diseños subidos del Lab en Cloud y previsualizarlos
objective: >
  El tab "Tuyos" del Prototype Browser (loop-129) solo guarda previews en el navegador
  (object URLs), que se pierden al refrescar. Hacerlos persistentes: subir a Cloud
  (dir=prototypes, .ultraia/cloud gitignored) y listar/previsualizar los guardados vía
  un nuevo endpoint de servido de bytes (GET /api/cloud/file/[...path]).
context: >
  Cloud ya existe: POST /api/cloud/upload (multipart file+dir, auth), GET /api/cloud/files
  (?base=, auth, lista CloudFile[] con mime), LocalCloudAdapter escribe en .ultraia/cloud.
  No hay endpoint que sirva los BYTES de un archivo local para preview inline (R2 sí pone
  url, local no). /lab está bajo (app) autenticado => getCurrentUser funciona en upload/serve.
files:
  - apps/web/src/app/api/cloud/file/[...path]/route.ts   # NUEVO: sirve bytes (auth + isSafePath)
  - apps/web/src/components/lab-client.tsx               # PrototypesSection: persistir + listar cloud
  - .opencode/plans/loop-130-lab-cloud-persist.md        # este plan
steps:
  1. Crear GET /api/cloud/file/[...path]/route.ts: getCurrentUser->401; decode segmentos;
     isSafePath(rel)->400; service().adapter.read(rel) -> 404 si null; Content-Type = meta.mime.
  2. En PrototypesSection: estado cloudFiles[]; refreshCloud() hace GET /api/cloud/files?base=prototypes
     y mapea a {id,path,name,ext,mime}. Cargar al entrar al tab 'mine' (useEffect tab).
  3. addFiles(): por cada archivo válido, crear object URL local (preview instantánea) Y
     POST /api/cloud/upload (FormData file+dir=prototypes). Si OK, refreshCloud(); si falla, setUploadError.
  4. Tab 'mine': mostrar subgrupo "En este navegador" (uploads, obj URL) + "Guardados en Cloud"
     (cloudFiles vía /api/cloud/file/<path>). Helper cloudFileUrl(path) codifica segmentos.
  5. Gates orden CI: typecheck -> lint -> test -> build. Matar dev servers antes de build.
  6. Commit con pathspec explícito; push origin master (autorizado).
scoped_criteria: typecheck OK, lint OK, build OK, core tests OK
full_criteria: npm run typecheck && npm run lint && npm run test && npm run build (todos verdes)
tolerances: no tocar archivos de la sesión #25 (herramientas/, api/tools/route.ts, _diag.ts) ni G0DM0D3
risks: >
  - route handlers de Next 15 usan params: Promise<{path:string[]}>; codificar/decodificar bien.
  - LocalCloudAdapter.read puede devolver null; manejar 404.
  - uploads a .ultraia/cloud no deben commitearse (.gitignore ya lo excluye).
priority: P1
effort: M
---

# loop-130 — Persistir diseños del Lab en Cloud

## Predicción
- El endpoint GET /api/cloud/file/[...path] servirá bytes locales con el mime correcto => los
  diseños guardados se previsualizan inline (iframe/img) igual que los fabricados.
- "Tuyos" ahora sobrevive a refresh: al volver al tab se listan los archivos de Cloud.
- Gates FULL verdes; commit + push limpio (sin archivos .ultraia/cloud).

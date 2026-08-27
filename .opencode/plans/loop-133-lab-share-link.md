---
id: 133
slug: lab-share-link
title: Link público para compartir diseños guardados en Cloud
objective: >
  Permitir compartir un diseño guardado vía URL pública (sin login) para pegarlo en cualquier
  red social / chat. Cierra el eslabón "alcance" del objetivo del usuario.
context: >
  /api/cloud/file/[...path] es auth-gated (solo el dueño logueado). Para compartir se necesita
  una ruta pública que sirva los bytes con el mime correcto. LocalCloudAdapter.read ya acota a
  la carpeta base (.ultraia/cloud), así que no expone fuera del cloud.
files:
  - apps/web/src/app/share/[...path]/route.ts   # NUEVO: GET público, sirve bytes cloud
  - apps/web/src/components/lab-client.tsx       # botón "link" por cloud tile (copia URL)
  - .opencode/plans/loop-133-lab-share-link.md   # este plan
steps:
  1. Ruta pública /share/[...path]: isSafePath + read + sirve Blob con mime (inline).
  2. Lab "Tuyos": botón "link" copia `${origin}/share/<path>` al portapapeles.
  3. Gates CI: typecheck -> lint -> test -> build. Commit pathspec. Push.
scoped_criteria: typecheck OK, lint OK, build OK
full_criteria: npm run typecheck && npm run lint && npm run test && npm run build (verdes)
tolerances: no tocar #25 ni G0DM0D3
risks: >
  - Ruta pública expone cualquier archivo del cloud sin auth (aceptable para lab personal/local;
    en deploy multiusuario habría que firmar con token). isSafePath + base dir acotan alcance.
priority: P1
effort: S
---

# loop-133 — Link público de diseño

## Predicción
- /share/<path> sirve el diseño sin login (inline) => se puede pegar en cualquier red.
- Botón "link" en el Lab copia la URL. Gates FULL verdes; commit + push.

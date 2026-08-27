# Plan — loop-129: Lab interactivo "Tuyos" (subir y previsualizar diseños)

## Context
El usuario quiere usar el Design Lab de forma interactiva y sin fricción: "designing,
seeing changes, more interactively". El paso anterior (loop-128) entregó el navegador de
prototipos **prefabricados** (`resultTask/`) con búsqueda y filtro. Falta la mitad
"tuyos": que cualquier usuario (sin saber git ni rutas) pueda **arrastrar su propio
HTML/SVG/imagen y verlo al instante** en el mismo lab, lado a lado con los fabricados.

## Objective
Añadir una pestaña "Tuyos" en `PrototypesSection` (lab-client.tsx) con un drop-zone /
file-picker que crea una previsualización inmediata vía `URL.createObjectURL` (100%
client-side, sin backend, sin riesgo de build). No se persiste (eso es loop-130 Cloud).

## Archivos a tocar
- `apps/web/src/components/lab-client.tsx` — extender `PrototypesSection`:
  - import `useRef`.
  - estado `tab: 'fab'|'mine'`, `uploads: {id,name,ext,url}[]`, `dragOver`.
  - `addFiles(FileList)` → filtra extensiones y crea object URLs.
  - drop-zone con `onDragOver/onDragLeave/onDrop` + `<input type=file multiple>`.
  - helper `renderTile()` para no duplicar la tarjeta (embed iframe / img / placeholder).
  - pestañas Fabricados | Tuyos(N) y grid de `uploads`.

## NO hacer
- No tocar backend, Cloud, ni archivos de la sesión concurrente #25.
- No persistir en disco (fuera de scope; object URL vive solo en la sesión del navegador).

## Criterios de verificación (gates FULL)
- `npm run typecheck` ✅ · `npm run lint` ✅ · `npm run build` ✅ (matar dev + limpiar .next)
- core/runtime tests sin cambios de comportamiento (solo UI client) — se corre `npm run test`.

## Predicción
El build pasa (cambio puramente client-side, sin nuevos imports de servidor). El lab
mantiene los prototipos fabricados y gana la pestaña "Tuyos" con preview instantáneo.
Commit `feat(lab): pestaña 'Tuyos' para subir y previsualizar diseños al instante`.

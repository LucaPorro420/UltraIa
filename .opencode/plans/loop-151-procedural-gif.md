# Plan — loop-151: Procedural Playground · export GIF animado

**Contexto:** loop-150 entregó /lab/procedural (campos escalares + fbm-flow como frames
ciclados en <img>). No hay export permanente. `procvid.renderGifBytes` (TS puro, sin ffmpeg)
genera GIF89a animado determinista y aún no se usa en UI.

**Objetivo:** Permitir exportar la animación fbm-flow como GIF descargable, y previsualizar
vía frames (actual).

**Pasos:**
1. `apps/web/src/app/api/procedural/route.ts`: aceptar `format: 'frames' | 'gif'`
   (default 'frames'). Para fbm-flow + gif -> `await renderGifBytes(spec)` -> dataUrl
   `data:image/gif;base64,...`.
2. `apps/web/src/components/lab/procedural-client.tsx`: toggle de formato (solo fbm-flow);
   link "Descargar GIF" cuando aplica.

**ARCHIVOS A TOCAR:** los dos archivos del ciclo loop-150 (sin WIP concurrente).
- apps/web/src/app/api/procedural/route.ts
- apps/web/src/components/lab/procedural-client.tsx

**RECURSOS / PRESUPUESTO:** CPU local; sin LLM / sin costo. Sin ffmpeg.
**NO-hacer:** no tocar llm.ts / index.ts / geom.ts; no nuevas rutas; no cambiar generadores core.
**Criterios scoped:** typecheck + lint + test(web smoke). FULL: `npm run build`.
**TOLERANCIAS:** GIF <= 12 frames @24fps; dims pares <= 1024.
**Riesgos:** payload GIF grande -> cap de dims ya existe en clampDim.
**Esfuerzo:** S (2 archivos). **Prioridad:** P3.

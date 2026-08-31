# PLAN: Capability Playground — página interactiva unificada

Fecha: 2026-08-31 · Modo: P-P→P-B · Prioridad: P2 · Esfuerzo: M (5-7 archivos)

## Contexto
- UltraIa tiene 50+ capabilities deterministas (geometry, pngrender, procvid, diagram, codevfx, video-edit, travel, etc.)
- `/lab/procedural` solo muestra generación de ruido/imágenes
- No hay UI unificada para prochar: geometría 3D (superfórmula), diagramas editoriales, efectos de código, viajes
- El usuario pide "continuar con algo pendiente o planificar" — esto agrega valor tangible al producto

## SPEC
- **Nueva página**: `/playground` (dentro del app shell autenticado)
- **Categorías**: 
  1. **Procedural** (ya existe en /lab/procedural — reutilizar)
  2. **Geometry** — superfórmula de Gielis 2D/3D con parámetros ajustables
  3. **Diagrams** — generador de diagramas editoriales (timeline, data-flow, architecture)
  4. **CodeVFX** — efectos visuales 100% código (fire, ice, lightning, etc.)
  5. **Video** — planificación de EDL + render preview
  6. **Travel** — plan de video de viaje con prompts de imagen
- **Cada categoría**: card con descripción + botón "Try" → sub-página con controles interactivos
- **Export**: PNG/SVG/GIF/download para cada tipo de output

## ARCHIVOS A TOCAR
- `apps/web/src/app/(app)/playground/page.tsx` — page server (metadata + redirects)
- `apps/web/src/app/(app)/playground/playground-client.tsx` — client principal (tabs por categoría)
- `apps/web/src/app/(app)/playground/geometry-client.tsx` — interactivo geometry
- `apps/web/src/app/(app)/playground/diagrams-client.tsx` — interactivo diagrams
- `apps/web/src/app/(app)/playground/codevfx-client.tsx` — interactivo codevfx
- `apps/web/src/app/api/playground/geometry/route.ts` — API geometry
- `apps/web/src/app/api/playground/diagrams/route.ts` — API diagrams

## RECURSOS / PRESUPUESTO
- CPU local; sin LLM; sin costo
- Reutiliza capabilities existentes de @ultraia/core
- API routes para generación server-side

## NO-hacer
- No tocar llm.ts / index.ts (wiring de capabilities ya existe)
- No nuevos exports de core (ya están exportados)
- No tocar capabilities existentes

## Criterios de verificación
- typecheck 0 / lint 0 / build OK
- Cada sub-pagina genera output real (PNG/SVG)
- Responsive (mobile-friendly)
- Dark Obsidian theme consistente

## Tolerancias
- GIF animado opcional (solo fbm-flow por ahora)
- Geometry 2D first, 3D como futuro

## Riesgos
- Payloads grandes → mitigado por dims limits existentes
- Complejidad de CodeVFX → simplificar a 3-4 efectos iniciales

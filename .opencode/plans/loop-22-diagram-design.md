# Plan WS-1: diagram-design → capability `diagram`

## Contexto
Enlace de `enlaces.txt`: https://github.com/cathrynlavery/diagram-design (MIT, 19.7k⭐) —
skill de 27 tipos de diagramas editoriales HTML/SVG autocontenidos. Usuario aprobó alcance
1+3 (tool + aplicar a resultTask + redibujar diagramas del repo). Precedente: fable-5
(fuente → RAZONAMIENTO → capability memory).

## Objetivo
Tool `diagram` en packages/core: generador determinista de diagramas editoriales
HTML autocontenidos (timeline/data-flow/architecture/loop) con tokens Dark Obsidian,
a11y (`role="img"` + `aria-labelledby` + title/desc), sin `<script>`, coords ÷4,
1px hairlines, sin sombras. Aplicar a resultTask (timelines motion-specs + pipeline
Motion Engine) y docs/diagrams (roadmap, desktop A-E, gen-engine).

## Pasos
1. Fuente cruda: curl README → `learning/sources/diagram-design.md`
2. `docs/RAZONAMIENTO-DIAGRAM-DESIGN.md` (patrones + mapeo)
3. `packages/core/src/tools/diagram.ts` (renderEditorialDiagram: timeline/data-flow/architecture/loop)
4. `packages/core/src/tools/diagram.test.ts` (~18 tests, mocks)
5. tools/index.ts (exports + TOOL_DESCRIPTIONS + Capability) + ai/llm.ts (tool diagram_render)
6. `Task/generate-diagrams.ts` (vite-node) → resultTask/diagrams (3 HTML) + docs/diagrams (3 HTML + README)
7. LEARNINGS.md + AGENTS.md
8. Gates: scoped core → FULL (typecheck/lint/test/build) → commit

## Archivos a tocar
nuevo: learning/sources/diagram-design.md, docs/RAZONAMIENTO-DIAGRAM-DESIGN.md,
packages/core/src/tools/diagram.ts, diagram.test.ts, Task/generate-diagrams.ts,
resultTask/diagrams/*, docs/diagrams/*, .opencode/plans/loop-22-diagram-design.md
mod: packages/core/src/tools/index.ts, packages/core/src/ai/llm.ts,
resultTask/README.md, learning/LEARNINGS.md, AGENTS.md

## Criterios
Scoped: `npm run test -w @ultraia/core` (diagram.test.ts verde) + typecheck core.
FULL: typecheck → lint → test → build (matar dev servers antes del build).
HTML: offline, role="img", sin <script>, determinismo byte-a-byte.

## Riesgos
- No copiar código del repo (port original de principios, attribution header)
- Sin Google Fonts inline (HTML autocontenido)
- PS 5.1 encoding → usar tool Write

## Esfuerzo
Medio (~1 ciclo PIVR)

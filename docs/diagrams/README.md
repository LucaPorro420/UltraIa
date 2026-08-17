# Diagramas editoriales (capability \`diagram\`)

Diagramas HTML autocontenidos (sin JS, sin deps, a11y, Dark Obsidian) generados por
`Task/generate-diagrams.ts` — patrón de [diagram-design](https://github.com/cathrynlavery/diagram-design)
(port original, ver `docs/RAZONAMIENTO-DIAGRAM-DESIGN.md`). Ábrelos con doble clic.

| Diagrama | Tipo | Qué muestra |
|---|---|---|
| [roadmap-2026.html](roadmap-2026.html) | timeline | Hitos del roadmap 2026 |
| [desktop-architecture.html](desktop-architecture.html) | architecture | Fases A-E del plan Desktop |
| [gen-engine-pipeline.html](gen-engine-pipeline.html) | loop | Orquestador OMAG (correction loop) |

Regenerar: `node_modules\.bin\vite-node.cmd Task/generate-diagrams.ts`

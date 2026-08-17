# Razonamiento Diagram-Design — sistema de diagramas editoriales y su aplicación en UltraIa

Fecha: 2026-08-17 · Fuente: `enlaces.txt` (URL del usuario) · Fuente cruda local:
`learning/sources/diagram-design.md` (34 KB, README descargado con curl).

> **Procedencia**: repositorio público cathrynlavery/diagram-design (MIT, ~19.7k ⭐).
> Se analizan PATRONES DE DISEÑO y se implementa un port ORIGINAL (sin copiar código
> del repo). El skill es para Claude Code/Codex/Pi; UltraIa lo integra como
> capability `diagram` determinista en TypeScript.

## 1. Qué es el documento

Skill de **27 tipos de diagramas editoriales** para agentes de código: HTML/SVG
autocontenido (sin build step, sin JS, sin dependencias externas), en 3 variantes
(minimal light / minimal dark / full-editorial). Incluye import redraw de draw.io y
Mermaid, export PNG/SVG, onboarding de marca desde una URL (tokens semánticos),
accesibilidad obligatoria y 7 patrones semánticos de comportamiento.

## 2. Índice del documento

| Sección | Resumen |
|---|---|
| What it makes | 27 tipos visuales en 3 variantes, autocontenidos |
| Install | Instalación como plugin (Claude Code / Codex / Pi) |
| Onboarding | Extraer marca de una web → tokens semánticos (paper/ink/muted/accent) |
| Quickstart | Templates: template.html / template-full.html / template-motion.html |
| Import | Redraw de draw.io y Mermaid con 4 diales (formato/tamaño/detalle/audiencia) |
| Export | SVG (extraer <svg>) y PNG (Playwright 2×) |
| Architecture | SKILL.md → references por tipo (progressive disclosure) |
| Design system | 1 accent, 1-2 focos, hairlines 1px, sin sombras, coords ÷4 |
| Primitives | Annotation callout, sketchy filter, 55 iconos monochrome |
| When NOT | No listas, no antes/después, no un solo rectángulo |

## 3. Patrones extraídos (los que importan para UltraIa)

1. **Tokens semánticos** (implementado): el diagrama NO usa colores concretos — usa
   roles `paper / ink / muted / accent` que se resuelven a la paleta del proyecto.
   En UltraIa: Dark Obsidian (`#08080a`, `#e5e5ea`, `#8b8b98`, `#8b5cf6`).
2. **Reglas anti-slop** (implementado): 1px hairlines, **sin sombras**, border-radius
   máx 10px, **toda coordenada/width/gap divisible por 4** (lo que evita el "look
   AI-generado"), densidad 4/10, el accent solo en 1-2 elementos focales.
3. **Accesibilidad por defecto** (implementado): `role="img"` + `aria-labelledby`
   resolviendo + primer hijo `<title>`/`<desc>`; IDs prefijados por diagrama para
   inline múltiple seguro.
4. **Autocontenido** (implementado): un solo `.html` que se abre offline con doble
   clic, sin red más allá de fuentes opcionales; en UltraIa: **cero** recursos externos.
5. **Progressive disclosure** (mapeado): el agente carga solo el reference del tipo
   elegido — en UltraIa: la capability `diagram` expone 4 tipos con un solo renderer.
6. **Fidelity ledger en imports** (pendiente): al redibujar un diagrama fuente se
   reporta qué se fusionó/colapsó/descartó. Pendiente: import de Mermaid/drawio.
7. **Semantic patterns** (pendiente): 7 patrones de comportamiento (colas, bottlenecks,
   trust boundaries) que no crean tipos nuevos. Pendiente: patrones de UltraIa.
8. **Onboarding de marca** (mapeado): leer la web del cliente → tokens. UltraIa ya
   tiene DNA en `docs/design-dna.json` — el equivalente local del onboarding.

## 4. Mapeo implementado / pendiente

| Patrón | Estado | Dónde |
|---|---|---|
| Tokens semánticos + Dark Obsidian | ✅ implementado | `packages/core/src/tools/diagram.ts` (DIAGRAM_TOKENS) |
| Reglas anti-slop (÷4, hairline, sin sombras, 1-2 focos) | ✅ implementado | `diagram.ts` (round4, renderNode) |
| A11y (role="img" + aria-labelledby + title/desc) | ✅ implementado | `diagram.ts` (a11yId, wrapper) |
| HTML autocontenido sin `<script>` ni URLs externas | ✅ implementado | `diagram.ts` |
| Tipos: timeline, data-flow, architecture, loop | ✅ implementado | `diagram.ts` (4 kinds) |
| Variantes minimal-dark / full-editorial + tamaños doc-inline/doc-wide | ✅ implementado | `diagram.ts` |
| Aplicación a resultTask (timelines motion-specs + pipeline) | ✅ implementado | `Task/generate-diagrams.ts` → `resultTask/diagrams/` |
| Redibujo diagramas del repo (roadmap, desktop, gen-engine) | ✅ implementado | `docs/diagrams/` |
| Import redraw Mermaid/drawio + fidelity ledger | ⏳ pendiente | futura capability `diagram_import` |
| Semantic patterns (colas/trust boundaries) | ⏳ pendiente | futura extensión de kinds |
| Export PNG (Playwright) / SVG standalone | ⏳ pendiente | requiere playwright en CI |

## 5. Lecciones para el repo

- Un diagrama no es "una imagen": es HTML editable, accesible y de diseño propio —
  el reemplazo editorial de los ASCII diagrams en docs.
- Las reglas geométricas (÷4) se pueden TESTEAR: el renderer garantiza
  determinismo byte-a-byte → tests de snapshot sin tooling extra.
- El diseño del skill (progressive disclosure, tokens) es el mismo patrón de
  capability que ya usa UltraIa (tools por capability en `ai/llm.ts`).

# UltraIa — Design DNA & Design System (Master)

> Fuente de verdad del diseño. Generado con la skill `design-dna` (zanwei/design-dna) a partir de
> `IMAGE-INTEGRATIONS/ADDITIONS*.TXT`, `designs-ui-ux/01-design-system.md` y `DESIGN.png`.
> Datos cuantificados en `docs/design-dna.json`. Reglas operativas en `.opencode/skills/ultraia-design-system`.

## 1. Identidad

**UltraIa — Dark Obsidian Multimodal IDE.** SaaS que genera agentes de IA a medida y los mejora con
human-in-the-loop. Audiencia: developers & ML engineers → dark-mode por defecto es intencional
(override del anti-pattern "no dark by default").

Arquetipo: *Precision Instrument* — terminal-core con restraint editorial. No es "otro SaaS violeta":
el violeta es acento de estado, no decoración.

## 2. Paleta (solo dark, actual)

| Rol | Hex | Uso |
|---|---|---|
| Canvas | `#08080a` | Fondo viewport |
| Panel | `#111115` | Paneles primarios |
| Panel header | `#18181f` | Cabeceras/tabs |
| Panel hover | `#22222c` | Hover cards |
| Input | `#0d0d11` | Prompts/editors |
| Border subtle | `#1f1f2a` | Divisiones |
| Border muted | `#2e2e3d` | Inputs/contenedores |
| Border active | `#6366f1` | Foco |
| Primary | `#8b5cf6` | CTAs, links |
| Foreground | `#e4e4e7` | Texto |
| Muted | `#71717a` | Secundario |

**Acentos de modalidad** (identidad del producto, inmutables): video `#a855f7` · audio `#06b6d4` ·
text `#f59e0b` · code `#10b981` · web `#6366f1`. Estados: thinking `#3b82f6` · streaming `#10b981` ·
error `#ef4444` · PASS `#4ade80` · PENDING `#fbbf24` · FAIL `#f87171`.

### Paleta adicionada — "Neo Violet" (referencia externa, @uxintace)

Extraída por muestreo (cuantización) de la portada del post "Best Color Palette"
(https://www.instagram.com/p/Db8YpwEDBKl/). Hex aproximados — verificar antes de usar en producción.

| Rol | Hex (muestra) |
|---|---|
| Magenta claro | `#EE9CED` |
| Magenta | `#F69DEE` |
| Orquídea | `#D09AE6` |
| Lavanda | `#988CDB` |
| Púrpura | `#7578D3` |
| Índigo | `#5167CB` |
| Azul profundo | `#1854A1` |

Uso: acentos display y gradientes de marca (ej. hero landing) — NO reemplaza los tokens dark del
`@theme`. Ejemplos de aplicación sobre fondo blanco (slides 1-2 del mismo post): púrpura `#493394`/
`#241852` como texto/primario, azul `#5283AB`/`#A9CCD9` como secundario.

## 3. Tipografía

| Rol | Fuente | Notas |
|---|---|---|
| Display | **Plus Jakarta Sans** 600/700 | Landing H1/H2, headlines (anti-slop: no Inter display) |
| Body funcional | Inter 400-700 | Paneles, tabs, forms |
| Chat | Plus Jakarta Sans 400/500 | Mensajes, transcripciones |
| Mono | **JetBrains Mono** 400/600/700 | Logs, badges, títulos de agente, timestamps |

Escala: 12/13/14/16/20/28/32/48/56px. Espaciado base 4px: 8,12,16,20,24,32,40,48,56,64.

## 4. Densidad IDE

Header 38px · Activity bar 48px · Sidebar 280px · Gap 4px · Radii 4/8/12 · Sombras:
panel glow `0 0 20px -5px border-active`, card elevada `0 10px 30px -10px rgba(0,0,0,.7)`,
obsidian `0 8px 32px 0 rgba(0,0,0,.37)`.

## 5. Efectos visuales permitidos

Canvas generativo (partículas, nodos) · SVG animado (path draw, pulse) · scroll-driven (GSAP
ScrollTrigger) · aurora CSS radial · glassmorphism (`backdrop-filter: blur(16px) saturate(180%)`) ·
glow borders por modalidad · Lottie local · grid dots `radial-gradient(#27272a 1px, transparent 1px)`.

**Prohibido**: gradientes púrpura genéricos, Inter display, imágenes externas (CSP), animaciones sin
guard `prefers-reduced-motion`.

## 6. Vocabulario de motion

| Momento | Engine | Spec |
|---|---|---|
| Entrada hero | GSAP timeline | 0.6-0.9s, `power3.out`, stagger 0.08 |
| Scroll reveal | ScrollTrigger | `start: top 80%`, y 12% + opacity, stagger 0.1 |
| Micro-interacción | CSS/GSAP | 150-250ms, `power2.out`, glow en hover |
| Typing indicator | GSAP/CSS | 3 dots, stagger 0.15 |
| Loader largo (>5s) | Lottie | `public/animations/`, nunca spinner genérico |

Guard global: `@media (prefers-reduced-motion: reduce)` anula todo (ya en `globals.css`).

## 7. Componentes signature

- **AgentTileWindow** (ADDITIONS3): ventana con min 280×220px, header 36px, dot de estado con ping,
  badge modalidad mono, glow por acento, quick-prompt bar inferior.
- **WorkspaceGrid**: `grid-cols-[repeat(auto-fit,minmax(280px,1fr))]` — auto-parejas 2×1 antes de 1 col.
- **Hero landing**: headline display, aurora/grid CSS de fondo, mockup de chat animado, CTA primario.

## 8. Reglas de mantenimiento

1. Cambios visuales actualizan este archivo + `design-dna.json` + skill `ultraia-design-system` juntos.
2. No inventar hexes: usar tokens del `@theme` de `globals.css`.
3. Motion nuevo siempre con guard reduced-motion y budget de bundle.
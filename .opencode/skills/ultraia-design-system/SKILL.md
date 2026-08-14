---
name: ultraia-design-system
description: |
  Design system canónico de UltraIa — tokens "Dark Obsidian" (canvas #08080a, paneles,
  bordes, densidades IDE), acentos por modalidad de agente (video/audio/texto/código/web),
  tipografía (Inter funcional + Plus Jakarta Sans display/chat + JetBrains Mono badges/logs),
  vocabulario de motion (GSAP/Lottie/CSS) y reglas anti-AI-slop. Usar SIEMPRE antes de
  escribir o modificar cualquier UI de UltraIa (landing, dashboard, studio, chat, roadmap).
  Fuentes de verdad: IMAGE-INTEGRATIONS/ADDITIONS*.TXT, designs-ui-ux/01-design-system.md,
  docs/design-dna.json, DESIGN.md.
---

# UltraIa Design System (Dark Obsidian)

Producto: SaaS — generación de agentes de IA con human-in-the-loop. Stack: Next.js 15 App Router + Tailwind v4 + Vercel AI SDK. Audiencia: devs & ML engineers (dark-mode por defecto, intencional).

## 1. Tokens de color (Tailwind v4 CSS-first → `@theme` en `apps/web/src/app/globals.css`)

| Rol | Hex | Uso |
|---|---|---|
| `--color-canvas` | `#08080a` | Fondo general viewport |
| `--color-panel` | `#111115` | Paneles primarios |
| `--color-panel-header` | `#18181f` | Cabeceras de paneles/tabs |
| `--color-panel-hover` | `#22222c` | Hover de cards/ítems |
| `--color-input-active` | `#0d0d11` | Inputs de prompt/editor |
| `--color-border-subtle` | `#1f1f2a` | Divisiones estándar |
| `--color-border-muted` | `#2e2e3d` | Bordes de inputs/contenedores |
| `--color-border-active` | `#6366f1` | Panel con foco |
| `--color-primary` | `#8b5cf6` (violet-500) | Botones primarios, links |
| `--color-accent` | `#f472b6` (pink-400) | CTA destacados |
| `--color-destructive` | `#f87171` | Errores, destructive |

### Acentos por modalidad de agente (NO cambiar — son identidad del producto)

| Modalidad | Accent | Glow |
|---|---|---|
| video | `#a855f7` violeta | `rgba(168,85,247,.25)` |
| audio | `#06b6d4` cian | `rgba(6,182,212,.25)` |
| text | `#f59e0b` ámbar | `rgba(245,158,11,.25)` |
| code | `#10b981` esmeralda | `rgba(16,185,129,.25)` |
| web | `#6366f1` índigo | `rgba(99,102,241,.25)` |

### Estados de procesamiento

`thinking: #3b82f6` · `streaming: #10b981` · `error: #ef4444` · `idle: #6b7280` · PASS `#4ade80` · PENDING `#fbbf24` · FAIL `#f87171`

## 2. Tipografía (anti-AI-slop: Inter NO es display)

| Rol | Fuente | Tamaño/Peso |
|---|---|---|
| Código/logs/timestamps/badges | JetBrains Mono | 11-13px, 400-700 |
| Cabeceras de paneles y tabs | Inter | 12px, 600 |
| Display (landing H1/H2, headlines) | Plus Jakarta Sans | 700, tight tracking |
| Chat/transcripciones | Plus Jakarta Sans | 13-16px, 400 |
| Body funcional | Inter | 14-16px, 400 |

## 3. Densidad IDE

`--ide-header-height: 38px` · `--ide-activitybar-width: 48px` · `--ide-sidebar-width: 280px` · `--ide-panel-gap: 4px` · radii `4/8/12px` · espaciado base 4px (8,12,16,20,24,32,40,48,56,64)

## 4. Vocabulario de motion

- **Entrada/hero**: GSAP timeline, stagger 0.08s, ease `power3.out`, duración 0.6-0.9s
- **Scroll reveals**: ScrollTrigger, `start: "top 80%"`, yPercent 12 + opacity, stagger 0.1s
- **Micro-interacciones**: 150-250ms, ease `power2.out`; hovers con glow `box-shadow 0 0 18px -6px <accent>`
- **Estados activos**: dot con `animate-ping` (patrón AgentTileWindow) + glow de modalidad
- **Typing indicator**: 3 dots, GSAP stagger bounce 0.15s, o CSS keyframes
- **Loaders largos (>5s)**: Lottie local (`public/animations/`), nunca spinner genérico
- **prefers-reduced-motion**: TODO animación se desactiva (guard global en globals.css)

## 5. Anti-patterns (prohibido)

- ❌ Gradientes púrpura genéricos (violeta solo como acento puntual)
- ❌ Inter en titulares display
- ❌ Cards idénticas en fila sin variación estructural
- ❌ Spinner girando como único feedback de carga
- ❌ Animaciones sin guard `prefers-reduced-motion`
- ❌ Imágenes externas (CSP: `img-src 'self' data:` — usar canvas/SVG/CSS)

## 6. Reglas de uso para el agente

1. Antes de tocar UI: leer `docs/design-dna.json` + `DESIGN.md` (si existe) y este skill.
2. Acentos de modalidad: usar las variables `--agent-*`/`glow-*` existentes, nunca hexes inventados.
3. Motion: preferir CSS puro para micro-interacciones; GSAP solo cuando hay secuencia/scroll; Lottie para loaders de proceso.
4. Todo componente nuevo respeta densidad IDE (38px headers, 4px gaps) y espaciado base 4px.
5. Después de cambios visuales: verificar con `npm run typecheck` y revisión visual en navegador.

## 7. Workflow "Claude Design" (sistemas visuales completos)

Fuente: TikTok @migue.baena (https://www.tiktok.com/@migue.baena/video/7662739519938006294).
Aplica al diseñar con cualquier agente de diseño (Claude, GPT, gemini): el potencial real no está
en generar páginas sueltas sino **sistemas visuales completos**. Proceso de 4 pasos:

1. **No le pidas solo aplicaciones** — pide el sistema: tokens, componentes, patrones, densidades,
   estados (hover/active/disabled), no una página.
2. **Entrénalo con tu identidad visual** — dale el DNA: paleta, tipografía, radios, espaciados,
   referencias de marca (en UltraIa: `docs/design-dna.json` + `DESIGN.md` + este skill).
3. **Usa referencias visuales** — adjunta ejemplos del look deseado (screenshots, imágenes) y exige
   fidelidad a la referencia, no descripción textual.
4. **Activa el modo de Alta Fidelidad** — fuerza iteración detallada (medidas exactas, tokens
   reales, contraste WCAG) hasta que el resultado sea producible, no un mockup aproximado.

Clave: la diferencia no está en prompts más largos, sino en **dar contexto adecuado** (DNA +
referencias + criterio de calidad). Enlace del autor: https://monumental-design-docs-flow.base44.app

Fuentes adicionales adicionadas: `docs/CONTENIDO-ADICIONADO.md` (3 posts), `docs/recursos-ia.md`
(7 YouTubers IA), paleta "Neo Violet" en DESIGN.md §2.
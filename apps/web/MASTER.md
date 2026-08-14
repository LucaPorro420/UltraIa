# MASTER.md — UltraIa Web Design System (genjutsu paint)

> Stack: Next.js 15 App Router · Tailwind v4 (CSS-first) · React 19 · Vercel AI SDK.
> Fuente: DESIGN.md · docs/design-dna.json · skill `ultraia-design-system`.
> Toda implementación visual debe cumplir este documento.

## 1. Interaction Thesis

UltraIa es un *instrumento de precisión*: la interfaz comunica estados en vivo (thinking,
streaming, PASS/FAIL) mediante **glow de modalidad + dots con ping**, no decoración. El motion
existe para explicar el estado, nunca para adornar. Micro-interacciones 100-250ms; las únicas
secuencias largas son la entrada del hero (una vez por visita) y loaders de proceso (>5s → Lottie).

## 2. Motion tokens (aplicar siempre)

| Token | Valor | Uso |
|---|---|---|
| `--ease-ultra` | `cubic-bezier(0.16,1,0.3,1)` | Entradas y reveals (power3.out equivalente) |
| Micro-interacción | 100-250ms, `power2.out` | Hover, focus, toggle, badges |
| UI transition | 200-300ms | Modales, tabs, paneles |
| Hero entry | 600-900ms, stagger 0.08 | Una vez por visita |
| Scroll reveal | `top 80%`, y 12% + opacity, stagger 0.1 | Secciones landing |
| Exit | Siempre más corto que enter (200ms, opacity) | Desmontajes |

Regla de frecuencia: cuanto más se reproduce una animación, más corta y sutil (hover=100ms,
onboarding=600ms+).

## 3. GSAP (reglas React 19 / Next)

- Usar `gsap.context()` dentro de `useLayoutEffect` con cleanup; nunca tweens globales sueltos.
- Usar `gsap.matchMedia()` para `prefers-reduced-motion`: desactivar transforms en reduce.
- `ScrollTrigger` solo en client components (`'use client'`); registrar plugin una vez en módulo.
- Animar solo `transform`/`opacity` (compositor); nunca `top/left/width/height`.
- Bundle: importar `gsap/ScrollTrigger` solo donde se use (tree-shaking automático).

## 4. Lottie (Motion Design skill)

- Loaders de proceso >5s (builder "Designing your agent…", eval runner): `public/animations/*.json`.
- Fallback estático (póster) para reduced-motion; nunca animación infinita sin pausa.
- Preferir `lottie-react` (ya en deps) con `loop={true}` solo para estados activos.

## 5. CSS nativo (la mayoría de micro-interacciones)

- Hover/focus: `transition-colors`/`transition-all` 150ms con `--ease-ultra`.
- Glow: clases `.glow-*` existentes + `transition-shadow`.
- Dots de estado: `animate-ping` (Tailwind) o `--animate-glow-pulse`.
- Typing: `.typing-dot` (3 dots, stagger 0.15s).
- Streaming: `.stream-caret` (cursor parpadeante).
- Skeleton: `.shimmer`.
- Fondo: `.aurora-bg` (hero), `.grid-dots` (patterns).

## 6. Anti-patterns (bloqueados)

- ❌ Gradientes púrpura genéricos · Inter en display · spinners como único feedback · animaciones
  sin guard reduced-motion · imágenes externas (CSP) · hover instantáneo sin transition · lists
  `.map()` sin stagger.

## 7. Checklist de implementación (design-audit)

- [ ] Todo `hover:` tiene `transition-*` en la clase base
- [ ] Todo `.map()` de cards/mensajes tiene stagger de entrada (GSAP o CSS `animation-delay` por índice)
- [ ] Todo condicional que monta/desmonta UI tiene transición de entrada (y salida si es modal)
- [ ] `prefers-reduced-motion` cubierto en CSS **y** en JS (matchMedia/gsap.matchMedia)
- [ ] Contraste WCAG ≥4.5:1 en texto; focus visible en todo interactivo
- [ ] Animar solo transform/opacity; 60fps; sin layout thrash
- [ ] Loaders >5s son Lottie, no spinners
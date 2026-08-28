# Landing / Sitio web público — Arquitectura

Fuente de verdad para la estructura del sitio marketing de UltraIa (App Router, `apps/web`).

## Rutas públicas

| Ruta | Archivo | Auth | Notas |
|------|---------|------|-------|
| `/` | `src/app/page.tsx` | no | Landing multi-sección |
| `/explore` | `src/app/explore/page.tsx` | no | Agentes públicos |
| `/recursos` | `src/app/recursos/page.tsx` | no | Recursos IA |
| `/gallery` | `src/app/gallery/page.tsx` | no | Galería de prompts (Meigen) |
| `/roadmap` | `src/app/roadmap/page.tsx` | no | Inventario técnico |
| `/login` | `src/app/(auth)/login/page.tsx` | no | Acceso workspace |
| `/register` | `src/app/(auth)/register/page.tsx` | no | Alta workspace |

> `/gallery` y `/roadmap` **se movieron del grupo `(app)`** (que forzaba `requireUser` vía
> `IdeShell`) a rutas de primer nivel para que sean públicas. La URL no cambió.

## Componentes de la landing (`src/components/`)

- `marketing-header.tsx` — header sticky responsive. En `md+` muestra nav + CTA; en móvil
  colapsa a un **drawer hamburguesa** (`aria-expanded`/`aria-controls`). Si hay sesión, el CTA
  es **"Abrir app"** + formulario de logout; si no, "Log in" / "Get started".
- `landing/landing-hero.tsx` — hero con aurora + mock terminal. Usa `useIsomorphicLayoutEffect`
  (evita el warning SSR de `useLayoutEffect`). CTA adaptada a logueado.
- `landing/landing-features.tsx` — ciclo de 4 fases: **Generate → Run → Improve → Ship**.
- `landing/landing-ecosystem.tsx` — sección **AutoPublicación multicanal** (10 canales).
- `landing/landing-pillars.tsx` — **Ecosistema**: Agentes, OMAG, Cloud gratis, App móvil,
  Crecimiento + strip de métricas.
- `landing/landing-cta.tsx` — banda final de conversión.
- `site-footer.tsx` — footer unificado (Producto / Recursos / Legal).
- `landing/use-isomorphic-layout-effect.ts` — `useLayoutEffect` que degrada a `useEffect` en SSR.

## Sistema de diseño

- Tokens **Dark Obsidian + Neo Violet** en `globals.css` (`--color-primary`, `--color-neo-*`,
  `--agent-*`, `border-subtle`, `panel`, `panel-hover`, `canvas`).
- Utilidades usadas: `gradient-neo-text`, `gradient-neo-frame`, `card-glow-hover`, `neo-aura`,
  `glass-panel`, `grid-dots`, `stream-caret`.
- Motion: GSAP + `ScrollTrigger` con `gsap.matchMedia()` y `prefers-reduced-motion` respetado;
  las animaciones solo mueven `opacity`/`transform` y usan `clearProps` para no dejar estado.

## SEO

- `src/app/page.tsx` exporta `metadata` (title/description/openGraph).
- `src/app/sitemap.ts` incluye `/`, `/explore`, `/recursos`, `/gallery`, `/roadmap` + agentes públicos.
- `src/app/robots.ts` permite `/` y bloquea `/dashboard`, `/agents`, `/api`.

## Cómo extender

1. Crear `src/components/landing/landing-<seccion>.tsx` (cliente si usa GSAP) siguiendo el patrón
   de `landing-pillars.tsx` (ref + `useIsomorphicLayoutEffect` + reveal con `ScrollTrigger`).
2. Importarlo en `src/app/page.tsx` y colocarlo entre `LandingEcosystem` y `LandingCta`.
3. Si la sección enlaza a una página nueva, añadirla también a `sitemap.ts` y al footer.
4. Mantener los tokens/utilidades del design system; no introducir paleta nueva sin consenso.

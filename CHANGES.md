# CHANGES — Integración de skills de diseño & motion (13/08/2026)

## Resumen

Integración de las 5 Claude Code Skills del post de @sferro.ai (Design DNA, GSAP, Three.js,
Motion Design, Genjutsu) en UltraIa: design system "Dark Obsidian" cuantificado, motion system
con GSAP + Lottie, y micro-interacciones en toda la app. Sin Three.js en runtime (no requerido
por el alcance "Landing + polish").

## Fase 1 — Skills instaladas

- Clonados 5 repos a `%TEMP%\opencode\skills-repos\`: `zanwei/design-dna`, `greensock/gsap-skills`
  (8 skills), `cloudai-x/threejs-skills` (10 skills), `lottiefiles/motion-design-skill`,
  `AThevon/genjutsu`.
- Instaladas en global (`~/.config/opencode/skills/`, 92 SKILL.md) y proyecto
  (`.opencode/skills/`, 39 SKILL.md). Genjutsu: subset web (cast, paint, _jutsu); eliminadas las
  sub-skills Android/Apple (compose-*, swiftui-*).
- Skill propia: `.opencode/skills/ultraia-design-system/SKILL.md`.
- Revisión de seguridad: benigna (solo enlaces oficiales de documentación).

## Fase 2 — Design DNA

- `docs/design-dna.json`: DNA cuantificado (formato design-dna v1) — paleta obsidian, tipografías,
  efectos, vocabulario de motion.
- `DESIGN.md`: fuente de verdad de diseño (patrones, anti-patterns, especificaciones).
- `apps/web/src/lib/fonts.ts` + `apps/web/src/app/layout.tsx`: Inter (UI funcional),
  Plus Jakarta Sans (display/chat), JetBrains Mono (mono) — reemplazo de Inter-only (anti AI-slop).
- `apps/web/src/app/globals.css`: bloque `@theme` con tokens obsidian (canvas `#08080a`, panel
  `#111115`, border-subtle `#1f1f2a`, primary `#8b5cf6`…), acentos de modalidad inmutables,
  keyframes (aurora, grid-drift, glow-pulse, typing-bounce, stream-cursor, shimmer, chat-enter),
  utilidades `.aurora-bg`, `.grid-dots`, `.typing-dot`, `.stream-caret`, `.shimmer`, guard
  `prefers-reduced-motion` global.

## Fase 3 — Genjutsu MASTER + audit

- `apps/web/MASTER.md`: motion system stack-aware (duraciones 100-250ms micro / 200-300ms UI /
  600-900ms hero, easings `power3.out`/`--ease-ultra`, reglas GSAP React 19, Lottie, checklist
  design-audit).
- Audit: 15+ hovers sin transition corregidos, ~20 listas `.map()` evaluadas, 0 guards
  reduced-motion JS añadidos (gsap.matchMedia en hero/features/roadmap, matchMedia en Lottie).

## Fase 4 — Implementación

- **Landing** (`apps/web/src/app/page.tsx` + `components/landing/landing-hero.tsx` +
  `landing-features.tsx`): hero con entrada GSAP escalonada (badge → título → sub → CTAs → mock),
  fondo aurora + grid-dots enmascarado, mockup de consola "agent-architect" con terminal que
  escribe en loop y caret; features con ScrollTrigger reveal (stagger 0.12, `top 78%`, once).
  Todo bajo `gsap.matchMedia()` (reduced-motion: sin animación).
- **Chat** (`components/agent-chat.tsx` + studio `ChatPanel`): mensajes con entrada escalonada
  (CSS `--animate-chat-enter`, delay por índice, cap 240ms), caret de streaming en el último
  mensaje assistant, typing indicator de 3 dots (reemplaza "Thinking…").
- **Builder** (`components/pending-loader.tsx` + `create-agent-form.tsx`): loader Lottie
  "loading-dots" (3 dots pulse, `src/animations/loading-dots.json`, 3s loop, pausado en
  reduced-motion) durante "Designing your agent…".
- **Dashboard** (`dashboard/page.tsx`): cards con entrada escalonada (cap 480ms) + transitions.
- **Studio** (`studio-client.tsx`): resultados de video/música y mensajes de chat con stagger.
- **Roadmap** (`roadmap-diagram.tsx`): client component con líneas dibujadas (DrawSVGPlugin) +
  nodos revelados (stagger 0.07) bajo ScrollTrigger `top 80%`.
- **Micro-interacciones**: `transition-colors duration-200` en botones de
  version-actions/improve-button/eval-runner/eval-input-form/api-key-panel + header de marketing.

## Fase 5 — Verificación

- `npm run typecheck` ✓ · `npm run lint` ✓ · `npm run test` ✓ (61/61) · `npm run build` ✓.
- QA navegador (headless): landing HTTP 200, hero animado hasta opacity 1 (mock 302px visible),
  terminal en loop activo, 3 feature cards reveladas por ScrollTrigger, 0 console errors,
  0 requests fallidos. Roadmap: requiere sesión autenticada (redirect a /login) — pendiente QA
  visual con usuario.

## Pendiente

- QA visual de páginas autenticadas (dashboard, agent, roadmap, studio) con sesión real.
- `ffmpeg` en PATH y claves API reales en `.env` para render/assembly completo.
- Revisar skills nuevas tras reiniciar opencode (indexación de `available_skills`).
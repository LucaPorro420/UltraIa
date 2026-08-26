# Plan loop-121 — Integración de plataforma Ebook (3D) dentro de apps/web

## Contexto
- Petición usuario (26/08): "inicia los procesos... pidele al proyecto que inicie con ebook.md y
  mejora el react y su diseño en web que tienes fallas por su version".
- `Ebookweb.md` describe una plataforma 3D (React 18 + Vite + Three.js + backend Express/Stripe).
  Se integrará DENTRO de `apps/web` (Next.js + React 19 + Dark Obsidian) según decisión del usuario.
- Diagnóstico previo: `npm run typecheck` y `npm run lint` sobre el repo = EXIT 0. **No hay
  fallos reales de React/versión en apps/web** (React 19.1.0 fijado y consistente). La "falla de
  versión" era el desfase de stack entre el spec y UltraIa; se resuelve usando el stack real.

## Decisiones de alcance
- **Catálogo con datos semilla estáticos** (`apps/web/src/data/ebooks.ts`, patrón `recursos-ia.ts`)
  en vez de modelo Prisma nuevo → evita chocar con el WIP concurrente `#25`/`netwatch` que tiene
  migraciones de Prisma sin commit (regla: NO tocar WIP ajeno; migraciones = riesgo de drift).
- **Biblioteca / "compra" en `localStorage`** (cliente) → feature real y funcional sin DB ni
  Stripe. El pago real con Stripe + tabla `Purchase` queda como SEGUIMIENTO (requiere migración +
  claves + aprobación humana para pagos).
- **Playground 3D con `three`** (ya dependencia de apps/web, ^0.185.1), raw Three.js en client
  component (sin añadir @react-three/fiber para no inflar dependencias). Rotación auto + drag.
- **Diseño Dark Obsidian**: tokens `bg-canvas/panel`, `border-border-subtle`, `gradient-neo-text`,
  `card-glow-hover`, `neo-aura`, motion con `--animate-chat-enter`, hover transitions 200ms.

## Archivos a crear / tocar
- `apps/web/src/data/ebooks.ts` (N) — 3 ebooks del spec (Three.js / Unity / Procedural) tipados.
- `apps/web/src/components/ebooks/playground-canvas.tsx` (N, 'use client') — three.js interactivo.
- `apps/web/src/components/ebooks/library.ts` (N, 'use client') — hook localStorage biblioteca.
- `apps/web/src/components/ebooks/library-button.tsx` (N, 'use client') — comprar/añadir/abrir.
- `apps/web/src/app/ebooks/page.tsx` (N) — catálogo (server component).
- `apps/web/src/app/ebooks/[id]/page.tsx` (N) — detalle + LibraryButton.
- `apps/web/src/app/ebooks/playground/page.tsx` (N) — playground 3D.
- `apps/web/src/app/ebooks/library/page.tsx` (N, 'use client') — "Mis libros".
- `apps/web/src/components/marketing-header.tsx` (edit) — NAV_LINKS += Ebooks.

## NO-hacer
- NO migrar Prisma (riesgo WIP ajeno). NO Stripe real. NO backend Express (se reusa arquitectura Next).
- NO tocar `packages/core/src/ai/llm.ts`, `tools/index.ts` (WIP netwatch concurrente).
- NO push (requiere aprobación humana).

## Verificación
- Gates FULL tras matar dev servers: `npm run typecheck` → `npm run lint` → `npm run test`
  → `npm run build`. typecheck/lint ya verdes en baseline; build de ~51 páginas.
- Staging explícito solo de archivos de apps/web del plan (nunca `git add .`).

## Predicción
- typecheck/lint/build verdes; playground renderiza three.js en cliente; catálogo/detalle coherentes
  con Dark Obsidian. Plan evaluado sin errores de compilación esperados.

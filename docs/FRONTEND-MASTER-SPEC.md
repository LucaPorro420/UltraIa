# FRONTEND MASTER SPEC — UltraIa (App de Alto Alcance)

> Documento de especificación y mapa de archivos para construir/conectar el frontend de
> UltraIa de forma **visual e interactiva** (ver cambios, diseñar, buscar, prototipar) y
> delegable a otra IA o a este mismo agente.
>
> Objetivo complementario desde el día 1: que la app esté lista para **alto alcance** —
> cubrir todas las áreas, usabilidades, funciones, beneficios y soluciones a medida que crece.

---

## 0. VEREDICTO FINAL (análisis · razones · decisión)

### Análisis del estado real (verificado 26/08/2026)
- Monorepo npm workspaces: `apps/web` (Next.js 15 App Router, React 19, Tailwind v4, Vercel AI SDK),
  `apps/mobile` (Expo), `packages/core` (dominio + herramientas), `packages/runtime` (desktop Fase B).
- **Sistema de diseño ya existente**: Dark Obsidian + Neo Violet, tokens en `globals.css` (`@theme`),
  tipografía (Inter / Plus Jakarta Sans / JetBrains Mono), motion en `MASTER.md`. Fuentes de verdad:
  `DESIGN.md`, `docs/design-dna.json`, `.opencode/skills/ultraia-design-system/`.
- **UI kit** en `apps/web/src/components/ui/` (button, card, dialog, tabs, switch, badge, input,
  textarea, label, skeleton, tooltip, stat-card, empty-state, kbd).
- **App shell IDE** en `components/ide/ide-shell.tsx` + `components/ide/nav-items.ts`.
- **`/lab` YA EXISTE** (`app/(app)/lab/page.tsx` + `components/lab-client.tsx`) como navegador de
  demos de capacidades (SDF, CodeVFX, imaging, growth). Es la semilla exacta del sandbox visual.
- **Conexiones** ya es un Centro de integraciones (47 entradas, 11 categorías, estado en vivo).
- Keyless-first: sin llamadas externas en UI salvo que el usuario configure tokens.

### Razones consideradas
- **R1 — Cohesión visual.** Hay sistema de diseño, pero páginas nuevas pueden desviarse.
  → Decisión: el diseño es fuente de verdad única; cualquier frontend lo importa, no lo reinventa.
- **R2 — Iteración visual sin romper.** El usuario quiere VER/prototipar/rediseñar sin fricción.
  → Decisión: extender `/lab` como **Design Lab** (tokens en vivo + galería de componentes +
  navegador de prototipos prefabricados + entrada "pedir rediseño"). Sandbox aislado = sin riesgo.
- **R3 — Escalabilidad de áreas.** Alto alcance = muchas áreas que crecen.
  → Decisión: estructurar por **áreas matriculadas** (spec/beneficio/solución) y que cada área
  sea una página con contrato API/domain claro; nuevas áreas se enchufan, no parchan.
- **R4 — Handoff a otra IA.** Necesita mapa de archivos y contratos precisos.
  → Decisión: sección §3 con rutas exactas, props y contratos de API (§4).
- **R5 — Riesgo de rotura.** Los cambios visuales no deben romper gates.
  → Decisión: `/lab` es sandbox seguro; las páginas de producción pasan
  `typecheck → lint → test → build` (ver §5 paso 4).

### Veredicto
Adoptar **Design Lab + Component Library + Áreas matriculadas**, apuntando a alto alcance desde el
inicio:
1. Sistema de diseño único, enforceado.
2. `/lab` = sandbox interactivo (tokens, galería UI, prototipos, "pedir rediseño").
3. Cada área del producto = página con contrato backend claro.
4. Prototipos prefabricados navegables y forkables (diagramas, codevfx, procedural, aurora, landing).
5. Todo cambio verificado por gates; el lab nunca rompe producción.

---

## 1. ESPECIFICACIONES GENERALES (frontend)

| Ítem | Valor |
|---|---|
| Framework | Next.js 15 App Router, React 19, TypeScript |
| Estilos | Tailwind v4 (CSS-first con `@theme`), tokens en `globals.css` |
| Animación | GSAP 3.15 + Lottie (solo transform/opacity, `prefers-reduced-motion`) |
| Iconos | `lucide-react` |
| Tipografía | Inter (funcional), Plus Jakarta Sans (display/chat), JetBrains Mono (mono) |
| Tema | Dark Obsidian (`#08080a` canvas, `#111115` panel, `#8b5cf6` primary) + Neo Violet |
| Shell | IDE: sidebar 280px (`components/ide/ide-shell.tsx`), mobile-first |
| A11y | `role`/`aria` en diagramas, focus-visible rings, contraste AA |
| Móvil | `apps/mobile` (Expo) consume la API REST web vía `getCurrentUser(req)` |
| Keyless-first | UI no hace llamadas externas salvo token del usuario; fail-soft |

---

## 2. MATRIZ DE ÁREAS (alto alcance: spec · función · beneficio · solución)

| Área / Ruta | Función | Especificación | Beneficio (alcance) | Solución implementada |
|---|---|---|---|---|
| **Auth** `/login` `/register` | Login/registro + 2FA mail | `POST /api/auth/login\|register` → `{token,expiresAt,user}` | Acceso seguro multi-dispositivo | Session API + `emailCode` OTP |
| **Dashboard** `/dashboard` | KPIs + pipeline de agente | `skill-pipeline.tsx` (Plan→Build→Test→Review→Ship→Simplify, GSAP stagger) | Visibilidad de orquestación | GSAP + `ai/llm.ts` |
| **Connections** `/connections` | Centro de integraciones | 47 entradas, 11 categorías, estado en vivo, 2FA mail | Control central de crecimiento/monetización | `connections-catalog.ts` + API 2FA |
| **Gallery** `/gallery` | Showcase de prompts/media | infinite scroll, generate-drawer, detail-dialog, contribute | Comunidad + adquisición | `present`, `image.ts` |
| **Builder** `/builder` | No-code drag-drop → código | bloques HTML5 DnD, codegen HTML/React+Tailwind, localStorage | Crecimiento sin dev | `builder-client` |
| **Studio** `/studio` | Edición/creación media (OMAG) | timeline, efectos, críticos | Media propia recurrente | `omag/*`, `video-edit` |
| **Blog** `/blog` | Público, SEO | server component, revalidate 5min | Audiencia propia (no depende de redes) | `listBlogPosts` |
| **Cloud** `/cloud` | Almacenamiento personal | drag-drop, stats, R2/local | Control de assets $0 | `cloud.ts`, `CloudService` |
| **Metrics** `/metrics` | KPIs por canal | tabla + gráficos | Bucle de mejora (F5) | `computeChannelKpis` |
| **Roadmap** `/roadmap` | Timeline del producto | DrawSVG + ScrollTrigger | Transparencia/confianza | `diagram.ts` |
| **Agents** `/agents` `/agents/new` `/agents/[id]` | Gestión multi-agente | CRUD de agentes + capabilities | Orquestación a medida | `ai/llm.ts` |
| **Lab / Diseño** `/lab` | **Sandbox visual interactivo** | tokens en vivo, galería UI, prototipos | Diseñar/ver/prototipar sin riesgo | `lab-client.tsx` (extender) |
| **Mobile** `apps/mobile` | App Expo | login, dashboard, cola, cloud, blog | Alcance on-the-go | API REST web |
| **Desktop** `packages/runtime` | Runtime local (Fase B) | API HTTP/WS loopback | Privacidad/local-first | `runtime/api/*` |

---

## 3. MAPA DE ARCHIVOS PERTINENTES (para construir/conectar el frontend)

### 3.1 Sistema de diseño (fuente de verdad — importar, no reinventar)
- `apps/web/src/app/globals.css` — tokens `@theme` (colores, tipografía, espaciado, motion).
- `DESIGN.md` — sistema de diseño canónico.
- `docs/design-dna.json` — DNA (tokens/estilo/efectos).
- `apps/web/MASTER.md` — motion (GSAP, reglas anti-AI-slop).
- `.opencode/skills/ultraia-design-system/SKILL.md` — skill de consistencia.
- `apps/web/src/components/aurora/aurora-canvas.tsx` — hero WebGL aurora (Three.js + shader).

### 3.2 App shell + navegación (dónde añadir rutas)
- `apps/web/src/app/(app)/layout.tsx` — envuelve en `IdeShell`.
- `apps/web/src/components/ide/ide-shell.tsx` — shell IDE (sidebar 280px).
- `apps/web/src/components/ide/nav-items.ts` — **lista de enlaces del nav** (añadir "Lab / Diseño" aquí).

### 3.3 UI Kit (galería de componentes reutilizables)
- `apps/web/src/components/ui/button.tsx`, `card.tsx`, `dialog.tsx`, `tabs.tsx`, `switch.tsx`,
  `badge.tsx`, `input.tsx`, `textarea.tsx`, `label.tsx`, `skeleton.tsx`, `tooltip.tsx`,
  `stat-card.tsx`, `empty-state.tsx`, `kbd.tsx`.
- Para el Lab: renderizar cada uno con sus variantes (la "galería de componentes").

### 3.4 Páginas existentes (cada una = `page.tsx` server + `*‑client.tsx` cliente)
- `apps/web/src/app/(app)/{dashboard,connections,gallery,builder,studio,cloud,metrics,roadmap,lab,agents,agents/new,agents/[id]}/page.tsx`
- `apps/web/src/app/blog/page.tsx` (público, fuera de `(app)`).
- Clientes: `connections/connections-client.tsx`, `components/lab-client.tsx`,
  `components/app-shell/skill-pipeline.tsx`, etc.

### 3.5 APIs (contratos backend → frontend)
- `apps/web/src/app/api/connections/{route,send-code,test}/route.ts` — GET/POST/DELETE + 2FA mail.
- `apps/web/src/app/api/publications/{route,[id]/approve|reject|publish,publish-due}/route.ts`.
- `apps/web/src/app/api/auth/{login,register,me}/route.ts`.
- `apps/web/src/app/api/cloud/{route,status,upload}/route.ts`.
- `apps/web/src/app/api/omag/route.ts`, `apps/web/src/app/api/tools/*/route.ts`.
- Contexto de sesión: `apps/web/src/lib/server/context.ts` (`getCurrentUser(req)`).

### 3.6 Dominio / herramientas core (lo que el frontend orquesta)
- `packages/core/src/tools/*` (connections-catalog, publish, present, topics, cloud, omag/*,
  diagram, codevfx, video-edit, growth, metrics, vault, pdfsearch…).
- `packages/core/src/domain/*` (connections, publications, briefs, eval, feedback…).
- `packages/core/src/ai/llm.ts` — registro de tools/agents; `buildConnectionCatalog`,
  `groupCatalogByCategory` se importan solo como `import type` en cliente.

### 3.7 Prototipos prefabricados (navegables/forkables en `/lab`)
- `resultTask/diagrams/*.html` — diagramas editoriales SVG autocontenidos (timeline, data-flow, architecture, loop).
- `resultTask/codevfx/*.html` — efectos CodeVFX en canvas puro (fire/ice/plasma…).
- `Task/procedural-demo.ts` —几何体/procedural (supershape, mandelbrot, video).
- `components/aurora/aurora-canvas.tsx` — aurora WebGL del landing.
- `apps/web/src/app/(app)/lab/page.tsx` + `components/lab-client.tsx` — navegador de demos.

### 3.8 Mobile / Desktop
- `apps/mobile/src/*` (Expo; replica tipos de API en `src/api/types.ts` — Metro no resuelve `node:*`).
- `packages/runtime/src/api/*` — Local API loopback (Fase B).

---

## 4. CONTRATOS (cómo conectar un frontend a un backend)

- **Auth**: `POST /api/auth/login` `{identifier, password}` → `{token, expiresAt, user}`.
  El cliente guarda `token` y lo envía en `Authorization: Bearer` o header `x-ultraia-session`.
  `getCurrentUser(req)` lo resuelve para TODAS las APIs.
- **Connections**:
  - `GET /api/connections` → `{connections, ephemeral}` (estado por canal).
  - `POST /api/connections` `{canal, token, code}` (code = OTP mail 2FA).
  - `DELETE /api/connections?canal=`.
  - Catálogo completo: `buildConnectionCatalog({connectedChannels, env})` (servidor).
- **Publications**: `GET/POST /api/publications`, `POST /api/publications/[id]/approve|reject|publish`,
  `POST /api/publications/publish-due`.
- **Cloud**: `GET /api/cloud/files` (lista+manifest), `POST /api/cloud/upload` (multipart ≤100MiB),
  `GET /api/cloud/status`.

---

## 5. FLUJO INTERACTIVO RECOMENDADO (ver · diseñar · buscar · prototipar)

1. **Abrir `/lab` (Design Lab)** → ver tokens en vivo, galería de componentes del UI kit y
   prototipos prefabricados (`resultTask/diagrams`, `resultTask/codevfx`, aurora, landing).
2. **Diseñar / buscar variantes** con skills de diseño:
   - `ultraia-design-system` (consistencia), `design-shotgun` (variantes), `design-html` (finalizar),
   - o pedir a otra IA pegándole §3 + §4 de este documento.
3. **Hacer el cambio** en el archivo correcto (mapeado en §3): componente en `components/ui/`,
   página en `app/(app)/<area>/`, ruta de nav en `components/ide/nav-items.ts`.
4. **Verificar gates** (producción, no el lab):
   `npm run typecheck → npm run lint → npm run test → npm run build`.
   El `/lab` es sandbox seguro; las páginas de producción pasan gates antes de commitear.
5. **Prototipos forkables**: para iterar visualmente, copiar un `resultTask/.../*.html` o el
   `lab-client.tsx` y modificar aislado; al aprobar, promover a componente del UI kit.

---

## 6. CHECKLIST "ALTO ALCANCE" (meta complementaria desde el inicio)

- [ ] Cobertura de áreas (§2): las 14 áreas con página + contrato.
- [ ] Internacionalización: contenido es/ar ya en `present`/`enrutador`; UI i18n pendiente.
- [ ] Monetización: Connections + AdSense/Sponsors/affiliates enlazados al flujo AutoPub.
- [ ] Accesibilidad: audit por área (foco, contraste, aria en diagramas/canvas).
- [ ] Performance: build < umbral; matar dev server antes de `build`.
- [ ] Mobile (Expo) + Desktop (runtime) alineados con la misma API.
- [ ] Design Lab vivo: tokens + galería + prototipos navegables.

---

## 7. PRÓXIMO PASO SUGERIDO (implementable ahora)
Extender `/lab` en un **Design Lab** completo:
- `components/ide/nav-items.ts`: añadir entrada "Lab / Diseño".
- `app/(app)/lab/page.tsx` + `components/lab-client.tsx`: secciones
  (Tokens · Galería UI · Prototipos · Pedir rediseño) usando el UI kit y los prototipos de §3.7.
- Mantener sandbox aislado (no afecta gates de producción).

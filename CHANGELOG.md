# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.1.0/) y versionado
SemVer. Contrato de estabilidad de la linea 1.x: los cambios que rompan APIs publicas
(tools/dominio de `@ultraia/core`, contratos REST `/api/*`, esquema de las colas
`Publication`/`TopicBrief` en Prisma, contrato IPC de `@ultraia/runtime`) exigen bump
a 2.0.0. Lo keyless-first (degradacion elegante sin claves API) se mantiene como regla
de diseno en toda la linea 1.x.

## [1.5.0] - 2026-08-30

Performance, monitoring y production-readiness. Esta version deja el proyecto listo
para lanzamiento con optimizaciones de peso, tiempo de respuesta y observabilidad.

### Performance
- Web Vitals reporting (LCP, INP, CLS, FCP, TTFB) via `/api/vitals` con sendBeacon.
- `modularizeImports` para lucide-react (tree-shaking por icono individual).
- Service Worker para cache offline de assets estaticos.
- PWA manifest con iconos maskables y theme color Dark Obsidian.
- Performance hooks (`useRenderTime`, `useAsyncTimer`) para desarrollo.
- LoadingSpinner y PageLoading components reutilizables.

### Monitoring
- `/api/vitals` endpoint que almacena metricas en Prisma (fail-soft).
- ErrorBoundary component con retry automatico.
- WebVitalsReporter integrado en root layout.

### Content Engine (completo)
- `content-templates.ts` (blog/video/caption/thread, deterministic, keyless, es/ar).
- `content-sources.ts` (3 ebooks + 12 courses como fuentes).
- `content-engine.ts` (batch + atomic writes + manifests).
- `content-manifest.ts` (list/read/stats desde disco).
- `/content` page (form interactivo + batch generation).
- `/content/history` (manifest viewer + markdown preview + download).
- `/api/content` (POST generate single/batch).
- `/api/content/generate-due` (POST batch auto-gen para cerebro).
- `/api/content/list` (GET list files + stats).
- Cerebro integration: `crearContenido` phase en cada ciclo.
- Dashboard: Content Engine card con link rapido.

### Infra
- `next.config.ts`: `modularizeImports` para lucide-react.
- `public/manifest.json` + `public/sw.js` (PWA).
- `components/ui/error-boundary.tsx`, `components/ui/loading.tsx`.
- `components/performance/web-vitals.tsx`.
- `hooks/use-performance.ts`.

### Cifras
- 35 paginas, 58 API routes, 195 build entries.
- 2,250+ tests (2,071 core + 193 runtime).
- 70 capabilities registradas.

## [1.0.0] - 2026-08-26

Primera version estable de UltraIa: plataforma donde agentes IA generan otros agentes,
con pipeline de mejora eval-gated y aprobacion humana obligatoria para lo publicado.

### Plataforma
- Monorepo npm workspaces: `apps/web` (Next.js 15 App Router + Tailwind v4 + Vercel AI
  SDK), `packages/core` (dominio puro determinista + Prisma + Vitest), `packages/runtime`
  (runtime local con Local API HTTP/WS en loopback + token timing-safe + rate limit),
  `apps/mobile` (Expo SDK 57, tema Dark Obsidian).
- Generacion de agentes desde descripcion de tarea: 8 agentes `bp-*` sembrados con
  capabilities componibles, versions con aprobacion, API keys scoped por agente y
  mejora guiada por evals y senales de uso.
- Shell IDE todo-en-uno (rail + explorador + contenido + dock con HUD de conexiones y
  feed de publicaciones) y workspace multi-agente/multi-modo con splits reales.

### Fabrica de contenido (AutoPub)
- Pipeline completo F1-F5: motor de ideas (RSS+busqueda, dedupe, scoring), cola
  persistente de briefs, presentacion unificada por canal, distribucion a 9 plataformas
  (YouTube Shorts, TikTok, X, Instagram Reels, Threads, Telegram, Discord, Slack,
  LinkedIn y blog propio) con aprobacion humana hibrida (video/imagen -> DRAFT),
  calendario `publish-due`, KPIs + analytics reales por API de canal y playbook de
  crecimiento (perfil -> experimentos de una variable -> victorias compuestas).
- Contenido bilingue es/ar con TTS edge-tts keyless y guiones largos OMAG 60s+.

### Generacion multimodal
- OMAG: mundo MediaField (entidades/relaciones/eventos causales), timeline compartida,
  criticos fusionados y bucle de correccion; video procedural (10 animaciones +
  soundtrack sintetizado + mux AAC verificado ffprobe); renders 3D por software
  (supershape/torus-knot/Mobius -> PNG/OBJ/glTF sin GPU); imagenes generativas keyless.
- Studio v2 media hub: crear/guardar/reproducir/descargar/modificar assets en web,
  agentes y movil (reproduccion nativa expo-audio/expo-video, descarga con sesion).

### Infraestructura y autonomia
- Cerebro autonomo: ciclo LEARN->CREATE->PUBLISH programado (tarea Windows cada 120 min
  + workflow cloud cada 4h que corre con el PC apagado), creacion procedural desde cero
  y autopublicacion con aprobacion humana.
- `genesis.json` como contrato operativo del proyecto (agentes/memoria/workflows/
  research registry con decisiones y evidencia por repositorio).
- Cloud personal (adapters Local/R2 + CLI push/pull + vault), grabacion automatica de
  pantalla (screenflow) y revisor documental de repositorios (reporeview).
- Seguridad: sesiones opacas con TTL, API keys scoped, allowlist estricta de comandos
  del runtime, token timing-safe + origin loopback en la Local API, CSP endurecida y
  secretos nunca commiteados (enmascarados en disco).

[1.0.0]: https://github.com/LucaPorro420/UltraIa/releases/tag/v1.0.0

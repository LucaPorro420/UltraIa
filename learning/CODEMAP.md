# CODEMAP — Mapa del código de UltraIa (base local offline)

Propósito: permitir que un agente **comente/explica cualquier archivo del repo sin conexión**,
cargando este archivo (y `LEARNINGS.md` + `truth/`) desde `learning/memory/ultraia_memory.zip`.

## 1. Layout del monorepo (npm workspaces)

| Ruta | Qué es | Cómo comentarlo |
|---|---|---|
| `apps/web` | Next.js 15 App Router + Tailwind v4 + Vercel AI SDK. El producto visible. | UI + API routes (server). Client components solo `import type` de core. |
| `apps/mobile` | Expo SDK 57 (RN 0.86). Cliente de la API REST de `apps/web`. No importa `@ultraia/core` (Metro no resuelve `node:*`). | Replica tipos en `src/api/types.ts`. |
| `packages/core` | Dominio puro + lógica + Prisma + Vitest. Todas las "capabilities" (tools). | Cada `tools/<x>.ts` = una capacidad; `<x>.test.ts` = tests. |
| `packages/runtime` | `@ultraia/runtime` — runtime local desktop (Fase A/B). TS puro, sin deps nuevas. | Orchestrator + módulos load-on-demand. |
| `scripts` | Python/TS utilitarios (loop driver, cerebro, cloud-cli, start). | No son parte del build web. |
| `Task` | Runners `vite-node` (demos, diagramas, benchmarks, cerebro). | Ejecutables manuales, no importados por la app. |
| `desktop` | Shell desktop **WebView2** (C# net8.0-windows). Fase D paso 3. | Nativo; arranca `python start.py` y navega a `localhost:3000`. |
| `gen-engine` | Gen-Engine Python (FastAPI, open-weights). Self-host de media. | Degraded a keyless si no hay GPU/claves. |
| `learning` | Memoria verificada: `truth/` (hechos), `responses/`, `sources/`, `scripts/`, `nanoprompts/`. | Base de conocimiento; el zip se genera desde aquí. |
| `vendor` | Referencias externas (sin `.git`): G0DM0D3, video-use, etc. | Solo lectura/atribución. |
| `docs`, `cloudflare`, `*.md` | Documentación y guías (CLOUD-FREE-2026, MOBILE, SKILLS-INVENTARIO, RAZONAMIENTO-*). | — |

## 2. `packages/core/src/tools/` — catálogo de capacidades (dominio puro, determinista, keyless-first)

Cada archivo suele exportar: un dominio zod (tipos + funciones puras) + un `Tool` (schema + `execute`)
registrado en `ai/llm.ts` bajo una `capability`, y re-exportado en `tools/index.ts`. Los tests viven
al lado (`<x>.test.ts`). Agrupados por dominio:

- **IA / agentes / orquestación**: `agent-loop`, `autolearn` (mode_plan), `brain`/`brainpage`, `cerebro`,
  `skills` (plan/build/test/review/ship/simplify), `studio`/`studio-catalog` (IDE de agentes),
  `automation`, `genesis`/`genesis-runner`, `evolution`/`evo`, `autopub` (+`.wiring`), `goal`.
- **Contenido / media / AutoPub**: `content`/`content.live`, `enrutador` (brief→texto/guion), `present`
  (paquete de publicación), `topics` (briefs), `media-score`, `video`, `video-edit` (EDL ffmpeg),
  `image`/`imaging`/`meigen`, `music`, `generative` (arte procedural), `codevfx`/`vfx` (VFX por código),
  `sdf` (ray marching), `geometry`/`geom`/`pngrender`/`procvid` (librerías procedurales), `replica`
  (análisis-por-síntesis), `motion`, `videoqa` (métricas), `travel` (videos de paisajes), `designcompose`,
  `creativo`, `procedural-pub`.
- **Publicación social (PublisherAdapter)**: `publish` (orquesta YouTube/TikTok/Meta/X/Telegram/Discord/Slack),
  `telegram`, `discord`, `slack`, `whatsapp` (+`smtp`/`emailCode` para 2FA del Connections Center),
  `connections-catalog` (47 entradas del catálogo), `metrics`/`growth` (KPIs + playbook).
- **Conocimiento / memoria**: `memory-fs` (Fable-5), `semantic-memory`, `qdrant-memory` (+`.wiring`),
  `kgraph`/`knowledge-graph`, `learn-models`, `deps`, `catalog`, `libros`, `reporeview`, `codequality`,
  `security`, `calculator`, `physics2d`, `cadgeo`.
- **Búsqueda / scraping / fuentes**: `reach` (readWeb/searchWeb/DDG/Exa/r.jina), `research`/`research-firecrawl`,
  `pdfsearch` (OpenAlex + PDFs), `web`, `reddit`, `pinterest`, `enlaces`.
- **Cloud / vault**: `cloud` (layout 9 carpetas, R2/local), `vault` (repositorio propio `.ultraia/vault`).
- **Runtime / monitoreo / desktop**: `harness` (plugin runtime), `g0dm0d3` (Parseltongue/AutoTune/ UltraPlinian),
  `netwatch`, `vitals` (signos vitae del proyecto), `screenflow`, `recordly`, `stitch`, `gen-engine`, `recorder`, `game`.
- **Diagramas**: `diagram` (SVG/HTML editoriales offline).
- **OMAG** (no está en `tools/`, está en `packages/core/src/omag/`): `mediafield`, `world`, `timeline`,
  `memory`, `generators`, `critics`, `orchestrator`, `project` (long-form), `tts`, `sound`, `audiolibrary`,
  `prompt/director`. Núcleo de mundo audiovisual: IDEA→Director→MediaField→generadores→críticos→corrección.

> Para la lista **verificada** de capacidades propias (con `source` y `note` del repo), ver
> `learning/truth/truth_ultraia_capabilities.json` (incluido en el zip).

## 3. `apps/web/src/app/` — rutas y páginas

**API (`app/api/`)** — todas requieren `getCurrentUser(req)` salvo las públicas:
- `auth/{login,register,me}` — sesión opaca (token 30 días) para el móvil y el navegador.
- `agents` + `[id]/{apikeys,evals,improve,versions,[versionId]/approve}` — CRUD de agentes + evaluación.
- `chat/general` — chat con el modelo configurado.
- `cloud/{status,files,upload,file/[...path]}` — gestión de archivos en Cloud (local/R2); `file/[...path]` sirve bytes.
- `connections` (+`send-code`,`test`) — **guardado cifrado de claves + código por mail + verificar** (NO tocar: backend completo existente).
- `conversations/[id]/{messages}` — historial de chat.
- `goal` — objetivos del usuario.
- `lab/publish` — publica un diseño guardado en Cloud a Telegram/Discord/Slack como imagen. Resuelve el token con precedencia: credenciales de sesión (panel) > conexión guardada en DB (`getConnection` del dominio `connections`) > env. Leer el token crudo de la DB exige rol ADMIN; el token NUNCA se expone al cliente.
- `library/{assets,favorites,prompts}` — biblioteca de prompts/activos.
- `omag` — orquestador audiovisual.
- `prototypes/[...slug]` — sirve prototipos del Lab (objeto URL local).
- `publications` (+`metrics`,`publish-due`,`[id]/{approve,reject,publish,feedback}`) — cola AutoPub.
- `studio/chat` — chat del studio.
- `tools/{content,design,image,music,reach,video,web}` (+`web/screenshot`) — endpoints de capabilities.
- `v1/agents` + `[blueprintId]/{chat}` — API externa de agentes.
- `health` — health-check.
- `share/[...path]` — **GET público** que sirve cualquier archivo de Cloud (link para compartir sin auth).

**Páginas**: `(app)/` (shell IDE autenticado: dashboard, gallery, builder, cloud, connections, lab, blog,
recursos, ebooks, explore, share), `auth/` (login/register), `blog` (público), `share/[...path]` (público).

**Componentes clave**: `components/app-shell/nav.tsx`, `components/lab-client.tsx` (Tokens + UiGallery +
PrototypesSection "Tuyos" con persistir/publicar/compartir), `components/connections-client.tsx`,
`components/cloud-client.tsx`, `components/aurora/aurora-canvas.tsx` (WebGL landing).

**Lib server**: `lib/server/context.ts` (`getCurrentUser`), `lib/server/connections.ts` (NO existe por defecto;
el Connections Center usa su propio backend en `api/connections`), `api/cloud/providers.ts` (`localCloudAdapter`).

**Design system**: tokens "Dark Obsidian" en `globals.css` (`@theme`): canvas `#08080a`, panel `#111115`,
primary `#8b5cf6`, border-subtle `#1f1f2a`; acentos por modalidad (video/audio/text/code/web). Tipos:
Inter (funcional) + Plus Jakarta Sans (display/chat) + JetBrains Mono (mono). Ver `DESIGN.md`,
`docs/design-dna.json`, skill `ultraia-design-system`.

## 4. `packages/runtime/src/` — runtime local (Fase A + B)

- `runtime.ts` (`UltraRuntime`): orquestador; `startLocalApi`/`stopLocalApi` (Fase B). Módulo `system-api`.
- `paths`, `config` (secretos enmascarados en disco), `logger` (sinks console/json + memoria),
  `event-bus` (wildcards), `task-manager` (cancelación cooperativa), `module-registry`/`module-manager`
  (LOAD ONLY WHEN NEEDED), `resource-manager` (CPU real), `command-executor` (allowlist + roles),
  `health-manager`, `recovery`, `memory-manager` (dedup sha256, eviction), `context-selector`, `installer`.
- `api/`: `ws.ts` (RFC 6455), `server.ts` (`LocalApiServer`), `runtime-handlers.ts`. Token timing-safe,
  origin loopback, rate limit. Docs: `RUNTIME.md`, `MODULE_SYSTEM.md`, `MEMORY_SYSTEM.md`, `SECURITY.md`, `IPC.md`.

## 5. Gotchas para comentar código (reglas duras del repo)

1. **Client vs server**: un componente `'use client'` solo puede `import type` de `@ultraia/core`. Los
   valores que usan `node:*` (fs/net/smtp) deben ir en API routes o `lib/server/*`. Romper esto →
   `UnhandledSchemeError` en build.
2. **BodyInit**: en core no existe `BodyInit` (tsconfig `types:["node"]`, `lib:["ES2022"]`). Los adapters
   `telegram`/`discord`/`slack` devuelven `Uint8Array` y el fetch hace `body as unknown as ...`.
3. **Imports sin extensión**: relativos internos SIEMPRE sin `.js` (Next/webpack no resuelve `./x.js`).
4. **Build**: matar dev servers (`taskkill /T /F` sobre `next`) y borrar `apps/web/.next` antes de
   `npm run build` (si no, chunks corruptos / TS6053).
5. **Commit**: SIEMPRE `git commit -- <paths>` (pathspec). Nunca `git add .` / `-A`.
6. **Gates CI**: `npm run typecheck → lint → test → build` (core ~1766 tests; web/runtime por workspace).
7. **Concurrentes**: no tocar `vendor/G0DM0D3` (React 18) ni el WIP de la sesión #25 (herramientas/, api/tools/route.ts).
8. **Conexiones OAuth**: el backend en `api/connections` ya existe completo (cifrado + 2FA mail). No reimplementar.
9. **Keyless-first**: pollinations (imagen), edge-tts (TTS 14 idiomas), DDG/Exa (search), ffmpeg (video),
   Tunetank (música) funcionan sin clave; degradan con elegancia si falta el provider premium.

## 6. Receta para comentar un archivo offline (usando esta base)

1. Cargar `learning/memory/ultraia_memory.zip` (skill `learning-memory` o `restore_memory.py summary`).
2. Localizar el archivo en la sección 1–4 de este CODEMAP (workspace → paquete → módulo).
3. Si es un `tools/<x>.ts`, buscar `<x>` en la sección 2 y en `truth_ultraia_capabilities.json`.
4. Aplicar los gotchas de la sección 5 al explicar por qué algo se hace así (p. ej. "este client usa
   `import type` porque si importara el valor arrastraría `node:net` y rompería el bundle").
5. Para behavior/decisions históricas, cruzar con `LEARNINGS.md` (índice por ciclo/iteración).

> Mantener este archivo sincronizado con el tree: al añadir una capability o ruta, actualizar la sección 2/3.

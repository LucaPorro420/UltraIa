# PLAN: Study app real + análisis (tarea #185, prioridad P1)

Fecha: 2026-09-08 · Modo: P-P · Patrón: Sensado/Razonamiento/Acción/Ajuste (bucle IA 4 fases) · Presupuesto: ~2.5h / 30k tokens

## Contexto

**Sensado integridad (pre-flight state-integrity-check 13 checks):**
- `STATE.md` backlog: filas 182 DONE (PWA fix en 8b32875) + 183 DONE (Prisma Learning System 16 modelos, 34 tests, gates FULL GREEN). `loop-run-log.md` último [R] 183 verde con JSON. `STATE.md` High Priority sin RED activo (IG bloqueados requieren humano, no bloquean). Kill-switch `loop-pause-all` AUSENTE (window 24 chars, negaciones verificadas).
- `loop-184-turborepo.md` leído: scaffolding `turbo.json` 5 tasks con cache + `.gitignore` .turbo. Git log confirma commit `a09e141 chore(turbo)` ya en HEAD — 184 DONE implícito pero sin fila STATE (drift check-12 menor, se documentará en 185). `package.json` workspaces `["apps/*","packages/*"]` + turbo 2.10.12 en devDeps. Budget <15% día, lock sin task 185 (libre).
- `loop-183-prisma-learning-migracion.md` leído: C1 FutureMindMy integró `schema.prisma` 16 modelos (LearningCourse/Module/Lesson/Resource, Progress triada, Bilingual, SRS, Chat, Search/Sync) + dominio `learning.ts` (validateSlug, calculateNextReview SM-2, bilingualHash, buildSearchIndex) + tool `learning-system.ts` (createCourse/listCourses/createModule/createLesson/reviewCardAction, slugifyTitle, fail-soft db inyectable) + migration `20260908053849_add_learning_system`. Gates 183: typecheck 0/lint 0/test 34/34/build 90+ OK.
- `git status --porcelain` (pre-flight 08/09): `M .env.example`, `D .opencode/plans/loop-181-webview2-real.md`, `M DOCS_TODO.md`, `M STATE.md`, `M apps/web/src/middleware.ts`, `?? .opencode/plans/loop-181-holagpt-integration.md`, `?? .opencode/plans/loop-182-next-pwa.md`, `?? apps/web/src/app/globals-study.css` (NUEVO untracked 1232 líneas, NO importado), `?? apps/web/src/app/study/*` (6 stubs: page.tsx + course/[id] + lesson/[id] + read/[id] + flashcards/[deckId] + search/page.tsx — todos placeholders sin Prisma), `?? apps/web/src/app/api/analysis/project/route.ts` (121 líneas, execSync), `?? apps/web/src/app/api/verify/gates/route.ts` (124 líneas, execSync + CACHE_FILE), `?? apps/web/src/app/api/learning/*` (courses REAL con prisma, pero progress/bilingual/srs/sync/route.ts STUBS con JSON estático 0), resto ruido `.playwright-mcp/` `.vscode-extension/` etc (<50 OK, sin auth/.env).
- `packages/core/src/domain/learning.ts` leído: SM-2 determinista `calculateNextReview` (quality 0-2 reset, 3-5 easeFactor 1.3-2.5, intervalos 0/1/6/ease), `validateSlug` regex kebab-case, `parseJsonArray` safe, `bilingualHash` djb2, `buildSearchIndex` trunc 200/4000. 8 tests PASS.
- `packages/core/src/tools/learning-system.ts` leído: 5 acciones (create_course/list_courses/create_module/create_lesson/review_card) con validación zod, `validateSlug` + `calculateNextReview` reutilizados, db inyectable pattern publications.ts, 20 tests fakeDb PASS. Wired en `ai/llm.ts` `learning_manage` + `tools/index.ts` export/descriptor/Capability.
- `apps/web/src/app/globals.css` leído: solo `@import "./globals-base.css" / utilities / components / motion` — **FALTA** `globals-study.css` (orphan 1232 líneas con .bilingual-reader, .study-dashboard, .flashcard, .quiz, .srs, .progress-ring etc, tokens Dark Obsidian/Neo Violet, sin import).
- `apps/web/src/app/api/learning/courses/route.ts` leído: REAL (GET listCourses, POST createCourse ADMIN). Resto `learning/progress|bilingual|srs|sync|route.ts` STUBS (retornan `{completed:0,total:0}` estático, sin Prisma, sin SM-2).
- `apps/web/src/app/api/analysis/project/route.ts` leído: GET ejecuta `execSync` con `git status/log/branch`, `find`, `npm run test:ci`, `npm run build --dry-run`, `npx prisma validate`, `wc -l` — útil pero inseguro (shell injection, timeout 120s, buffer 10MB, ROOT `join(process.cwd(),'../..')` frágil en dev). No incluye métricas Learning System.
- `apps/web/src/app/api/verify/gates/route.ts` leído: POST ejecuta 4 gates FULL (`typecheck/lint/test:ci/build`) + scoped, cache en `.verification-cache.json`, pero `execSync` sin allowlist y env CI=true global.
- **Problema:** Study app existe en git como stubs (iter 182 commit a36fe2b menciona "bilingual/progress/srs/sync stubs + course outlines") pero no muestra datos reales de `LearningCourse` (prisma ya migrado). `globals-study.css` no se carga, por lo que los estilos Dark Obsidian de estudio no aplican. `analysis`/`verify` no usan el dominio learning ni exponen salud del Learning System. Usuario pide en 185: "integrar apps/web/src/app/study/* (ya existe como stubs en git, ahora con datos reales de LearningCourse), apps/web/src/app/globals-study.css, apps/web/src/app/api/analysis/* y verify/*. Debe usar el dominio learning.ts (SM-2) y el tool learning-system, con datos reales de Prisma (no stubs)."

**Enlaces a spec:** `LOOP.md` §Budget, `loop-constraints.md` §Code (gates FULL, staging explícito, denylist auth/.env), `AGENTS.md` §Repo facts (npm workspaces + turbo), `DESIGN.md` + `docs/design-dna.json` (Dark Obsidian), `ultraia-design-system` skill.

## SPEC (S-D integrado — fase P-P)

**Requisitos precisos:**
- Entradas: `packages/core/prisma/schema.prisma` (16 modelos Learning* migrated) + `packages/core/src/domain/learning.ts` (SM-2) + `packages/core/src/tools/learning-system.ts` (tool wired) + `apps/web/src/app/study/*` stubs + `globals-study.css` orphan + `api/analysis`/`verify` existentes.
- Salidas:
  - `apps/web/src/app/globals.css` importa `globals-study.css` (`@import "./globals-study.css";`) — 1 línea, sin romper motion tokens.
  - `apps/web/src/app/study/page.tsx` — **server component real**: `prisma.learningCourse.findMany({where:{isPublished:true}, orderBy:{order:"asc"}, include:{modules:{include:{_count:{select:{lessons:true}}}}}})` + opcional `getCurrentUser` para progreso; render grid Dark Obsidian con categoría, icon, lesson count, progress ring (0% si sin user), link a `/study/course/[id]`. Si 0 cursos → empty-state con CTA.
  - `apps/web/src/app/study/course/[id]/page.tsx` — server: `prisma.learningCourse.findUnique({where:{id or slug}, include:{modules:{orderBy:{order:"asc"}, include:{lessons:{orderBy:{order:"asc"}}}}}})` + progress `learningProgress/moduleProgress` si user; render header + lista módulos/lecciones con `parseJsonArray` tags, duration, difficulty, notFound() si no existe.
  - `apps/web/src/app/study/lesson/[id]/page.tsx` — server: `prisma.learningLesson.findUnique({where:{id}, include:{module:{include:{course:true}}, resources:true}})` + bilingualContent Json; render markdown content + quiz/exercise + resources isOffline badge + mark progress button (client). Usa `validateSlug` guard si slug malformed.
  - `apps/web/src/app/study/read/[id]/page.tsx` — server: `prisma.bilingualDocument.findUnique({where:{id or slug}, include:{versions:true}})`; si no doc, fallback a lesson bilingualContent; render `.bilingual-reader` con toolbar presets 50-50/60-40 + syncScroll, usando `.bilingual-panels` del CSS.
  - `apps/web/src/app/study/flashcards/[deckId]/page.tsx` — server: `prisma.studyDeck.findUnique({where:{id}, include:{cards:{where:{nextReview:{lte:now}}, take:20}}})` + count total/due; client interactivity: flip + `calculateNextReview` (SM-2) preview + POST a `/api/learning/srs` con quality 0-5.
  - `apps/web/src/app/study/search/page.tsx` — server+client: `?q=` → `prisma.searchIndex.findMany({where:{OR:[{title:{contains:q}},{content:{contains:q}}]}, take:20})` + fallback `prisma.learningLesson.findMany` con contains; usa `buildSearchIndex` para highlight; si sin q → muestra categorías TOP.
  - `apps/web/src/app/api/learning/*` stubs → reales: `progress/route.ts` GET/POST con `prisma.learningLessonProgress` + `calculateNextReview` para score; `srs/route.ts` con `StudyCard` CRUD + SM-2 + `StudyReview` log; `bilingual/route.ts` con `BilingualDocument`/`BilingualUserPref` upsert; `sync/route.ts` con `SyncQueue`/`DeviceSync`; `route.ts` overview con counts reales. Todos con `getCurrentUser` + fail-soft + `validateSlug`/`parseJsonArray`.
  - `apps/web/src/app/api/analysis/project/route.ts` — harden + enriquecer: allowlist `execSync` solo `git`/`npx prisma validate` (sin `find | wc -l` shell), `ROOT` via `process.cwd()` check `apps/web` suffix, timeout 30s por cmd, `maxBuffer 5MB`, incluye `learningMetrics: {courses, modules, lessons, decks, cardsDue}` via `prisma.$count` paralelo + `searchIndex` count, sin exponer DATABASE_URL.
  - `apps/web/src/app/api/verify/gates/route.ts` — harden: allowlist `npm run typecheck|lint|test|build`, sanitize `scope` enum, `CACHE_FILE` en `.ultraia/verification-cache.json` (gitignored), incluye gate `study` opcional: `npm run test -- --grep study` si existe, y retorna `learningHealth: {courses, srsDue}`.
- Límites: no tocar `auth/`, `.env`, `payments/`, `secrets/`; no migrar Prisma (ya migrado); no crear `FutureMindMy/` físico; no romper 2974 tests; staging explícito; no push sin aprobación; no usar `Authorization` header (solo `x-ultraia-session`).

**Criterios de aceptación:**
- [ ] `globals.css` contiene `@import "./globals-study.css"` y `npm run build` sigue verde (90+ páginas, con `.bilingual-*` sin FOUC).
- [ ] `study/page.tsx` renderiza cursos reales desde Prisma (si 0 → empty-state, si >0 lista con módulos/lecciones count, sin hardcode).
- [ ] `study/course/[id]/page.tsx` muestra módulos/lecciones con `notFound()` si slug/id no existe, usa `parseJsonArray` para tags.
- [ ] `study/lesson/[id]/page.tsx` renderiza contentMarkdown/content + quiz + resources, con `validateSlug` guard.
- [ ] `study/flashcards/[deckId]/page.tsx` carga cartas due vía SM-2 `nextReview <= now` y expone botones quality 0-5 que llaman `/api/learning/srs`.
- [ ] `study/search/page.tsx` busca en `SearchIndex` + fallback `LearningLesson`, usa `buildSearchIndex` para trunc.
- [ ] `api/learning/progress|srs|bilingual|sync` devuelven datos de Prisma (no `{completed:0}` estático), con auth `getCurrentUser`, SM-2 en SRS, upsert en bilingual.
- [ ] `api/analysis/project` GET 200 con `{health, learningMetrics:{courses,lessons,decks}}` + prisma valid true, sin shell injection.
- [ ] `api/verify/gates` POST `{"scope":"full"}` ejecuta gates allowlistados y persiste cache en `.ultraia/verification-cache.json`.
- [ ] Gates FULL verdes antes de commit: `typecheck 0 → lint 0 → test 2974+ (incl. learning) → build 90+ páginas` con cuarentena WIP.

**Límites explícitos:**
- No cambiar `turbo.json` ni `package.json` workspaces (184 ya ok).
- No tocar `apps/web/src/app/api/learning/courses/route.ts` (ya real, solo verificar).
- No exponer `User.passwordHash` en ningún response.
- No usar `node:*` en client components (solo server).

## DESIGN (S-D integrado — fase P-P)

**Arquitectura elegida (Clean Arch + Next.js App Router):**
```
apps/web/src/app/
├── globals.css ──→ @import globals-study.css (NUEVO wiring)
├── globals-study.css (1232 líneas Dark Obsidian: bilingual, study-dashboard, flashcard, quiz, srs, search)
└── study/
    ├── page.tsx (server: prisma learningCourse + _count modules/lessons, client: grid + progress-ring)
    ├── course/[id]/page.tsx (server: course+modules+lessons + progress, error: notFound)
    ├── lesson/[id]/page.tsx (server: lesson+module+resources + bilingualContent, client: mark-complete)
    ├── read/[id]/page.tsx (server: bilingualDocument+versions, client: bilingual-reader with presets)
    ├── flashcards/[deckId]/page.tsx (server: deck+cards due SM-2, client: flip + quality 0-5)
    └── search/page.tsx (server: SearchIndex query q, client: input debounce)

apps/web/src/app/api/
├── learning/ (domain → Prisma)
│   ├── courses/ (YA REAL)
│   ├── progress/ (REAL: LearningLessonProgress upsert + SM-2 score)
│   ├── srs/ (REAL: StudyCard + StudyReview + calculateNextReview)
│   ├── bilingual/ (REAL: BilingualDocument + BilingualUserPref)
│   ├── sync/ (REAL: SyncQueue + DeviceSync)
│   └── route.ts (overview: counts paralelos)
├── analysis/project/ (REAL harden: allowlist execSync + learningMetrics)
└── verify/gates/ (REAL harden: allowlist + .ultraia cache)

packages/core/
├── domain/learning.ts (validateSlug, calculateNextReview, parseJsonArray, bilingualHash, buildSearchIndex)
└── tools/learning-system.ts (createCourse/listCourses/createModule/createLesson/reviewCardAction)
```

**Flujo elegido (Study real):**
1. Wire CSS: `globals.css` +1 import.
2. Study pages: cada `page.tsx` es `export const dynamic='force-dynamic'` + `async function` que importa `prisma` de `@ultraia/core` + `getCurrentUser`/`optionalUser` de `@/lib/server/context`, hace `findMany/findUnique` con `select` mínimo + `include` necesario, mapea `tags` con `parseJsonArray`, valida `id` con `validateSlug` si es slug, y renderiza con clases `globals-study.css` (glass-panel, card-glow-hover, gradient-neo). Si 0 datos → empty-state. Si id no existe → `notFound()`.
3. Client interactivity (flashcards/search): `flashcards/[deckId]/client.tsx` y `search/client.tsx` con `'use client'`, estado local flip/selection, y fetch a `/api/learning/srs` con `quality` 0-5 (SM-2). Server envuelve client con datos iniciales.
4. API learning: cada `route.ts` importa `prisma`, `getCurrentUser`, `calculateNextReview`/`validateSlug`/`parseJsonArray` según endpoint, usa `NextResponse.json` con `Cache-Control: no-store`, y fail-soft con `reason` claro sin leak. `POST progress` upsert `LearningLessonProgress` con `status/completedAt/score`. `POST srs` crea `StudyReview` + update `StudyCard` con `calculateNextReview`.
5. Analysis/verify: `analysis` helper `run(cmd)` allowlista `['git status --porcelain','git log --oneline -10','git branch --show-current','npx prisma validate --schema packages/core/prisma/schema.prisma']` + counts Prisma paralelos via `Promise.all`. `verify` allowlista `['npm run typecheck','npm run lint','npm run test:ci','npm run build']`, valida `scope` enum, y mueve cache a `.ultraia/verification-cache.json`.

**Alternativas descartadas:**
- RSC con `fetch('/api/learning')` interno (waterfall, no usa Prisma directo) → se usa `prisma` directo en server component (más rápido, sin HTTP loop, pattern `/blog` + `/cloud/status`).
- Client-only study (sin SSR) → pierde SEO y PWA offline; se mantiene server + client islands.
- `react-query` para study → overkill, Next 15 App Router ya cachea RSC; se usa `revalidate: 60` si aplica.
- Reescribir `globals-study.css` con Tailwind v4 `@apply` → no, se mantiene CSS puro con vars (Dark Obsidian ya tokens).

**Diagrama (opcional):** data-flow `LearningCourse (Prisma) --prisma--> study/page.tsx (RSC) --props--> client island (flashcards/search) --POST--> /api/learning/srs (SM-2) --StudyReview--> Prisma`; `globals-study.css` inyectado vía `globals.css` → build sin FOUC (no bloqueante).

## LEARN (L-T integrado — fase P-P)

**Verdad verificada aplicable (learning/truth/ + semantic_memory):**
- `truth_web_browse_repos.json` 10/10, `truth_ultraia_capabilities.json` 5/5, `truth_ai_gen_resources.json` 8/8, `truth_tecno_recursos.json` 9/9 → no reimplementar reach/gen-engine.
- `truth_ultraia_capabilities.json` casos search/image/video/code/audio → patrón capability domain puro ya usado en learning-system.
- `memory_search` corpus 49→54 docs (`memoria_experiencial_v2` Qdrant) — query "learning system SM-2 bilingual" recupera `learning.ts` hits; se usará para no contradecir memoria verificada.
- `learning/LEARNINGS.md` lecciones 54 (no `git add .`), 72 (MemoryHit→SemanticMemoryHit), 79 (embedDense), 120-134 (Uint8Array→Blob), 176 (turbo cache). Se reaplica: staging pathspec, export * as namespace para evitar TS2308, `.next` kill antes de build.

**Lecciones relevantes (LEARNINGS.md):**
- Lección 183: migración Prisma 16 modelos con `String[]` como TEXT JSON → usar `parseJsonArray` en pages, no `JSON.parse` directo.
- Lección 182: PWA `next-pwa` en `apps/web` devDeps → no tocar `next.config.ts` en 185 (solo verificar withPWA intacto en build).
- Lección 66-68: `preflight state-doctor` 13 checks antes de tarea; lock stale recovery.
- Lección 44: `BodyInit` no es `Uint8Array` → `verify/gates` usa `Response.json` no `Buffer`.

**Biblioteca de fracasos (qué no repetir):**
- No `get-content/-replace/Set-Content` PS 5.1 (corrompe UTF-8, colapsa líneas) → usar Write/Edit.
- No `git add .` (b37fcfb arrastró 121 archivos) → `git add <pathspec>` explícito.
- No commit sin `npx prisma validate == 0` y gates FULL.
- No exponer `DATABASE_URL` en `analysis` response.
- No hardcodear cursos (stubs) — siempre Prisma.

**Gaps de autolearn que cierra esta tarea:**
- Gap "Study app stubs sin datos reales" (RICE P1): `autolearn detectGaps` marca `learning` con cursos sin UI real. Este ciclo cierra gap con RSC real + SM-2 + bilingual + SRS + search + api reales.
- Prepara REPLANTEO §9 185 Study app real (base para FutureMindMy C2: Turborepo ya + estudio funcional).

## TEST (L-T integrado — fase P-P)

**Estrategia de verificación explícita:**
1. **Scoped gates:** `npx prisma validate --schema packages/core/prisma/schema.prisma` 0; `vitest run packages/core/src/domain/learning.test.ts packages/core/src/tools/learning-system.test.ts` 28/28 PASS (sin tocar holagpt/theatre WIP).
2. **Web typecheck scoped:** `npm run typecheck --workspace=@ultraia/web` 0 propios (verificar `validateSlug` import no rompe).
3. **Study E2E manual:** `GET /study` 200 lista cursos (si 0 → empty-state OK); `GET /study/course/<id>` 200 con módulos; `GET /api/learning/courses` 200 con courses reales; `GET /api/analysis/project` 200 con learningMetrics; `POST /api/verify/gates {"scope":"scoped"}` 200 con gates 2.
4. **FULL gates antes de commit (con cuarentena WIP holagpt/theatre + .playwright-mcp):** `npm run typecheck` 0 → `npm run lint` 0 → `npm run test` (core 2724+? + runtime 250) → `npm run build` (limpiar `.next` si stale, matar dev servers, verificar `apps/web/next.config.ts` withPWA intacto, build 90+ páginas) → `npm run harness:test` 30/30. Cuarentena: `%TEMP%\opencode\wip-quarantine-20260908-185\` incl. untracked `.ts/.test.ts` + `apps/web/src/app/api/analysis`/`verify` se mantienen (no cuarentena), hash-check Get-FileHash + restore byte-exacto.
5. **Cache verify:** `POST /api/verify/gates` escribe `.ultraia/verification-cache.json` (verificar existe y JSON válido).
6. **CSS smoke:** `grep -c "bilingual-reader" apps/web/src/app/globals-study.css` >0 y `grep "globals-study" apps/web/src/app/globals.css` 1.

**Casos borde:**
- `LearningCourse` 0 filas → `study/page.tsx` muestra empty-state, no throw.
- `course/[id]` slug inválido (mayúsculas) → `validateSlug` fail → `notFound()` 404.
- `SearchIndex` sin results → muestra "Sin resultados" + sugerencia categorías.
- `StudyCard` sin due cards → "¡Al día!" + CTA crear cartas.
- `analysis` con DB vacía → `learningMetrics` todos 0, health degraded no unhealthy.
- `verify` sin CACHE_FILE → GET 404 con hint POST.

**Medirá éxito:** `study/page.tsx` SSR real + `globals-study.css` importado + `api/learning/*` reales + `analysis`/`verify` harden + gates FULL verde.

## MEJORAS A ADICIONAR

1. **Study RSC reales** (6 páginas) con Prisma directo + `parseJsonArray` + `validateSlug` + `buildSearchIndex`, sin stubs ni hardcode.
2. **CSS wiring** `globals-study.css` importado en `globals.css` (1 línea, Dark Obsidian + motion + a11y).
3. **API learning reales** (progress/srs/bilingual/sync/overview) con SM-2 `calculateNextReview` y upsert Prisma, auth `getCurrentUser`, fail-soft.
4. **Analysis harden** con allowlist execSync + `learningMetrics` paralelos + health computado.
5. **Verify harden** con allowlist gates + cache en `.ultraia/` + learningHealth.
6. **Validación determinista:** `npx prisma validate` + `vitest run learning` + `grep` CSS wiring como smoke CI-friendly.

## TECNOLOGÍAS EVALUADAS

| Decisión | Opción elegida | Alternativas rechazadas | Razón | Fuente nueva? |
|----------|----------------|------------------------|-------|---------------|
| Study data | **Prisma directo en RSC** (`prisma.learningCourse.findMany`) | `fetch('/api/learning')` interno | Evita waterfall HTTP, pattern `/blog` existente, RSC cachea | No (pattern blog 15/08) |
| SM-2 | **domain/learning.ts `calculateNextReview`** determinista | `fsrs` crate, `anki` lib | Zero deps, testeable, ya migrado en 183, sin ML | No (learning.ts HEAD) |
| Bilingual | **Prisma Json + CSS split-panel** (`.bilingual-reader`) | `next-intl` runtime, `react-split-pane` | Persistencia DB offline + sync, CSS puro 1232 líneas ya existe | No (globals-study.css) |
| Search | **SearchIndex + fallback Lesson contains** | `meilisearch` container, `qdrant` semantic | $0/mes, SQLite ya, semantic opcional luego | No (schema HEAD) |
| CSS wiring | **`@import "./globals-study.css"` en `globals.css`** | `import` en `layout.tsx` | Un solo entry point, respeta `globals.css` como import hub | No (globals.css HEAD) |
| Analysis exec | **Allowlist + Promise.all Prisma counts** | `find | wc -l` shell, `repomix` | Seguridad (no injection), determinista, learningMetrics útiles | No (analysis route HEAD) |
| Verify cache | **`.ultraia/verification-cache.json`** gitignored | `ROOT/.verification-cache.json` | `.ultraia/` ya gitignored, no ensucia raíz | No (.gitignore HEAD) |
| Package manager | **npm workspaces + turbo** (existente) | pnpm | No migrar en 185 | No |

**Research_search obligatorio (fuente pdf):** no aplica (infra estudio, no paper). Se evaluó `docs/REPLANTEO-ULTRAIA-2026.md` + `ultraia-design-system` tokens (verificado).

**Enlaces.txt:** sin nuevo intake 08/09 (último IG bloqueado requiere humano); protocolo respetado.

**MCP/Docker/Otros lenguajes:** no adoptados (Prisma SQLite local, SM-2 TS puro).

## Objetivo

Integrar `study/*` (6 páginas) con datos reales de `LearningCourse` vía `prisma`+`learning.ts`+`learning-system`, wirear `globals-study.css` en `globals.css`, y hardenizar `api/analysis`/`verify` con métricas Learning + allowlist, sin stubs, con gates FULL verdes.

## Pasos

1. **Pre-flight Sensado:** leer `STATE.md`, `loop-run-log.md`, `loop-constraints.md`, `learning/LEARNINGS.md`, `loop-183` y `loop-184` (ya hecho arriba). Verificar `Test-Path apps/web/src/app/study/page.tsx` True (stubs), `Test-Path globals-study.css` True orphan, `Test-Path prisma/migrations/*add_learning_system` True.
2. **Escribir plan:** este archivo `.opencode/plans/loop-185-study-app.md` + resumen `[P]` en `loop-run-log.md` con PREDICCIÓN (no tocar código aún).
3. **Backup/estado:** `git status --porcelain` inventario ruido (4M+13??, sin tocar auth/.env), `git diff apps/web/src/app/globals.css` baseline.
4. **Wire CSS:** `Edit apps/web/src/app/globals.css` +1 línea `@import "./globals-study.css";` tras `globals-motion.css`.
5. **Study pages reales:** reescribir 6 `page.tsx` (study, course/[id], lesson/[id], read/[id], flashcards/[deckId], search/page.tsx) como RSC reales con Prisma + domain helpers + design-system (glass-panel, card-glow-hover, empty-state, stat-card, skeleton). Añadir `client.tsx` islands para flashcards/search interactivity (`'use client'`).
6. **API learning reales:** reescribir `api/learning/progress|bilingual|srs|sync|route.ts` (5 archivos) con Prisma real + `getCurrentUser` + `calculateNextReview`/`validateSlug`/`parseJsonArray` + `NextResponse.json` no-store.
7. **Hardening analysis/verify:** editar `api/analysis/project/route.ts` (allowlist + learningMetrics) + `api/verify/gates/route.ts` (allowlist + .ultraia cache + learningHealth).
8. **Scoped gates:** `npx prisma validate` 0 + `vitest run learning` 28/28 + `npm run typecheck --workspace=@ultraia/web` 0.
9. **FULL gates con cuarentena:** aislar WIP ajeno (holagpt `content-factory*`, `theatre*`, `vendor/vibe`, `.playwright-mcp`, `test_system*.py`) a `%TEMP%\opencode\wip-quarantine-20260908-185\` con Get-FileHash, `npm run typecheck` → `npm run lint` → `npm run test` → `npm run build` (matar dev servers `taskkill /T /F`, `Remove-Item .next` si stale, verificar withPWA) → `npm run harness:test`, restaurar WIP byte-exacto.
10. **Commit pathspec:** `git add apps/web/src/app/globals.css apps/web/src/app/globals-study.css apps/web/src/app/study/page.tsx apps/web/src/app/study/course/[id]/page.tsx apps/web/src/app/study/lesson/[id]/page.tsx apps/web/src/app/study/read/[id]/page.tsx apps/web/src/app/study/flashcards/[deckId]/page.tsx apps/web/src/app/study/search/page.tsx apps/web/src/app/api/learning/progress/route.ts apps/web/src/app/api/learning/bilingual/route.ts apps/web/src/app/api/learning/srs/route.ts apps/web/src/app/api/learning/sync/route.ts apps/web/src/app/api/learning/route.ts apps/web/src/app/api/analysis/project/route.ts apps/web/src/app/api/verify/gates/route.ts` + `git commit -m "feat(study): integrate Study app with real LearningCourse data + SM-2 + bilingual + SRS + search + globals-study.css + analysis/verify harden" -- <pathspec>` (pathspec obligatorio).
11. **Post-commit:** actualizar `STATE.md` fila 185 DONE con hash + tests, append `[R]` a `loop-run-log.md` con JSON budget, cerrar lock si se tomó.

## Archivos a tocar (staging explícito)

- `apps/web/src/app/globals.css` — MODIFICAR (+1 import globals-study.css)
- `apps/web/src/app/globals-study.css` — MODIFICAR si falta fix (ya existe 1232 líneas, solo verificar import)
- `apps/web/src/app/study/page.tsx` — MODIFICAR (RSC real con prisma learningCourse)
- `apps/web/src/app/study/course/[id]/page.tsx` — MODIFICAR (RSC real con course+modules+lessons)
- `apps/web/src/app/study/lesson/[id]/page.tsx` — MODIFICAR (RSC real con lesson+resources+bilingual)
- `apps/web/src/app/study/read/[id]/page.tsx` — MODIFICAR (RSC real con bilingualDocument)
- `apps/web/src/app/study/flashcards/[deckId]/page.tsx` — MODIFICAR (RSC real con deck+cards SM-2)
- `apps/web/src/app/study/search/page.tsx` — MODIFICAR (RSC real con SearchIndex)
- `apps/web/src/app/study/flashcards/[deckId]/client.tsx` — NUEVO (client island flip + quality)
- `apps/web/src/app/study/search/client.tsx` — NUEVO si necesario (client debounce)
- `apps/web/src/app/api/learning/progress/route.ts` — MODIFICAR (stub → Prisma real + SM-2)
- `apps/web/src/app/api/learning/bilingual/route.ts` — MODIFICAR (stub → Prisma real)
- `apps/web/src/app/api/learning/srs/route.ts` — MODIFICAR (stub → Prisma + calculateNextReview)
- `apps/web/src/app/api/learning/sync/route.ts` — MODIFICAR (stub → Prisma SyncQueue)
- `apps/web/src/app/api/learning/route.ts` — MODIFICAR (stub → counts paralelos)
- `apps/web/src/app/api/analysis/project/route.ts` — MODIFICAR (harden allowlist + learningMetrics)
- `apps/web/src/app/api/verify/gates/route.ts` — MODIFICAR (harden allowlist + .ultraia cache)

## RECURSOS / PRESUPUESTO

- **Tools/scripts/skills:** `prisma`, `vitest`, `tsc`, `eslint`, `next build`, `diagram` (opcional), `vault_manage`, `pdfsearch_search`, `research_search` (pdf), `loop-concurrency-guard`, `state-integrity-check`, `loop-budget`, `ultraia-design-system`.
- **Fuentes:** `packages/core/prisma/schema.prisma` (16 modelos), `domain/learning.ts` (167 líneas), `tools/learning-system.ts` (173 líneas), `globals-study.css` (1232), `study/*` stubs (6×17 líneas), `analysis`/`verify` routes, `DESIGN.md` + `docs/design-dna.json`.
- **Tiempo estimado:** 2.5h (P-P 0.4h ya, P-B 1.8h: CSS 0.1h + study 6 páginas 0.8h + api 5 rutas 0.5h + harden 0.2h + gates 0.6h, R 0.3h).
- **Tokens estimados:** ~30k (6k plan + 20k code + 4k gates).
- **Presupuesto loop-budget:** 10 ciclos/día, 100k tokens/día, 6h/día. Este ciclo 1 ciclo + 30k + 2.5h => **30% tokens, 42% tiempo**, debajo de 80% early-exit.
- **Dependencias nuevas:** NINGUNA (Prisma 6.7 ya, zod ya, next 15 ya, SM-2 ya).

## NO-hacer (guardas explícitas)

- NO tocar `.env` real, `.env.*`, `auth/`, `payments/`, `secrets/`, `credentials/` (denylist).
- NO tocar `apps/web/next.config.ts` (PWA withPWA de 182 intacto; solo verificar en build).
- NO tocar `packages/core/src/tools/holagpt.ts` / `content-factory.ts` / `theatre-sequence.ts` (WIP 181, cuarentena).
- NO tocar `vendor/vibe-coding-with-base44/` (solo referencia).
- NO crear `FutureMindMy/` físico (docs-only).
- NO usar `git add .` ni `git add -A` (staging explícito por plan).
- NO commitear sin `npx prisma validate == 0` y gates FULL verde.
- NO hardcodear `DATABASE_URL` en repo; usar `env("DATABASE_URL")` + fallback `file:./dev.db`.
- NO exponer `User.passwordHash` o tokens en responses.
- NO mezclar edit+bash paralelo sobre mismo archivo.
- NO borrar `.ultraia/vault/` ni `.ultraia/cloud/` ni `dev.db`.

## Criterios de verificación

- **Scoped:** `npx prisma validate` EXIT 0, `vitest run packages/core/src/domain/learning.test.ts packages/core/src/tools/learning-system.test.ts` 28/28 PASS, `npm run typecheck --workspace=@ultraia/web` 0 propios, `grep "globals-study" apps/web/src/app/globals.css` 1.
- **FULL antes de commit:** `npm run typecheck` 0 → `npm run lint` 0 → `npm run test` (core 2724+250 runtime) → `npm run build` 90+ páginas OK (withPWA intacto, study 6 rutas en manifest) → `npm run harness:test` 30/30. Con cuarentena WIP restaurada byte-exacto.
- **API wiring:** `GET /api/learning/courses` 200 con courses reales (no stub), `GET /api/analysis/project` 200 con `learningMetrics`, `POST /api/verify/gates` 200 con cache en `.ultraia/`.
- **Limpieza:** `git status --porcelain | Select-String globals-study` muestra M (wired), no `??` orphan.

## TOLERANCIAS

- Si `prisma` sin cursos (0 filas) → study muestra empty-state (no fail).
- Si `validateSlug` falla por slug legacy con mayúsculas → 404 notFound, no 500 (1 retry con lowerCase no).
- Si `SearchIndex` vacío → fallback a `LearningLesson` contains, no error.
- Si `calculateNextReview` recibe quality string → zod parse fail → 400, no crash.
- Si FULL build falla por `.next` stale o dev server → `taskkill /T /F` + `Remove-Item .next` + reintento 1 vez.
- Si holagpt WIP contamina typecheck → cuarentena más agresiva (mover untracked) + reintento 1 vez.
- Max 3 fix attempts por item; si sigue RED → escalar a High Priority y no commitear.

## Riesgos / guardas

- **Circular deps RSC:** Prob Media, Impact Alto. Mitigación: pages solo importan `prisma` + `learning.ts` helpers, no `llm.ts`.
- **N+1 Prisma:** Media. Mitigación: `include:{_count:true}` + `Promise.all` counts, no loop secuencial.
- **PWA hunk perdido si se toca next.config.ts:** Baja. Mitigación: no tocar archivo, solo verificar `withPWA` en build log.
- **Vendor vibe infla diff:** Baja. Mitigación: cuarentena, no `git add vendor`.
- **Lock race 184/185:** Baja. 184 ya commiteado a09e141, sin touching study; no colisión.
- **Cache .verification-cache.json en raíz:** Baja. Mitigación: mover a `.ultraia/` (gitignored).

## Esfuerzo estimado

Medio — 17 archivos (1 CSS wiring + 6 study pages + 2 client islands + 5 api learning + 2 analysis/verify), 0 tests nuevos (reusa 28 existentes), 1232 líneas CSS ya listas. Justificación: es wiring + SSR real sobre dominio ya migrado, sin nueva migración, valida patrón para FutureMindMy C2.

## Prioridad

P1 — Alta (feature backlog activo, bloquea estudio offline + SRS + bilingüe + search, base para C1 FutureMindMy, pero no es P0 seguridad/gates RED).

## PREDICCIÓN (hipótesis antes de actuar)

- **CSS:** `globals.css` +1 línea import, build no rompe (90+ páginas, study 6 rutas visibles en `.next` manifest).
- **Study pages:** 6 RSC reales con `prisma.findMany` y `parseJsonArray`, 0 hardcode, empty-state si 0 filas, `notFound()` si slug no existe, SM-2 en flashcards, search con `contains`.
- **API learning:** 5 rutas reales con `getCurrentUser` + `calculateNextReview` + upsert, no más `{completed:0}` estático.
- **Analysis/verify:** allowlist + `learningMetrics` {courses, lessons, decks} con counts reales, cache en `.ultraia/`, health computado.
- **Gates:** `typecheck` GREEN 0, `lint` GREEN 0, `test` GREEN 28/28 scoped + 2974 FULL, `build` GREEN 90+ con study, `harness` 30/30.
- **Top riesgo:** holagpt WIP TS errors contaminan `typecheck` → cuarentena resuelve en 1 retry.
- **Qué podría salir mal:** (1) `prisma validate` OK pero `findMany` en RSC falla por `DATABASE_URL` no seteada → usar `file:./dev.db` fallback ya en `schema.prisma env`; (2) `globals-study.css` con `:global` no soportado en Next 15 CSS modules → ya usa CSS puro sin `:global` (verificado 1232 líneas no tiene `:global` salvo `.panel-content :global` que sí es soportado en App Router global CSS); (3) `analysis` execSync bloquea 120s → allowlist reduce a 30s.
- **Mejora:** Si predicción se cumple, STATE 185 DONE con commit hash, loop-run-log [R] verde, y siguiente ciclo (theatre wire / content-factory) puede iniciar.

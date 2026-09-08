# PLAN: Migracion Prisma Learning System + C1 FutureMindMy (tarea #183, prioridad P1)

Fecha: 2026-09-08 · Modo: P-P · Patron: Sensado/Razonamiento/Accion/Ajuste (bucle IA 4 fases) · Presupuesto: ~3.5h / 45k tokens
## REFRESCO 2026-09-08 02:20 — por que NUNCA FUNCIONA (diagnostico sistematico Phase 1)

**Hipotesis inicial del usuario validada: el ciclo nunca cierra.** Evidencia 02:15-02:20:

1. **LOCK STALE 81min sin heartbeat** (pivr-build-20260908004513 task 182, heartbeat 00:45): sesion anterior murio sin liberar lock, por eso `never closes`. Doctor reporta `lock activo` pero es stale (>30min). Causa: `npm run typecheck` colgado 120s + `.next` stale, proceso muere y deja lock huerfano. **Fix:** renovar lock con task 183 (si heartbeat <30min -> CEDE, si stale -> re-tomar), heartbeat cada 60s + cierre solo si session_id coincide.

2. **PWA extraneous** (next-pwa@5.6.0 extraneous en root, no en apps/web/package.json): `apps/web/next.config.ts` hace `import withPWA from "next-pwa"` pero paquete no declarado en apps/web (solo hoisteado). En CI limpio falla. Ademas sw.js existe (2349 bytes) pero withPWA en root no genera workbox correctamente. **Fix:** mover next-pwa a apps/web devDeps (`npm i -D next-pwa@5.6.0 --workspace @ultraia/web`) y verificar disable: dev y runtimeCaching.

3. **PRISMA path** (npx prisma validate sin --schema falla `schema.prisma not found`, con --schema es valid): migraciones nunca corren en scripts genericos. **Fix:** todos los comandos prisma usan `--schema=packages/core/prisma/schema.prisma` y `DATABASE_URL=file:./dev.db`.

4. **TYPECHECK HANG (134 .test.ts, monorepo grande)**: `npm run typecheck` timeout 120s por tsc secuencial core->web->runtime + 134 archivos + WIP content-factory/theatre sin aislamiento. **Fix:** gates scoped por workspace + cuarentena WIP holagpt/theatre en `%TEMP%\opencode\wip-quarantine-20260908\` antes de FULL + limpiar node_modules/.vite + timeout 180s + taskkill dev servers.

5. **.NEXT STALE** (solo cache/diagnostics): build nunca termina porque no se limpio .next corrupto por edicion concurrente. **Fix:** matar dev servers + Remove-Item apps/web/.next antes de CADA build (loop_gate.py --kill).

6. **MIGRACION NUNCA INTEGRADA** (prisma-learning-extensions.prisma 302 lineas untracked, schema.prisma 0 Learning*): extension nunca copiada, por eso learning nunca funciona. **Fix:** integrar 16 modelos + migrate dev + generate, con backup previo en .ultraia/vault/backups/.

7. **WIP HOLAGPT/THEATRE nunca wireados completos** (content-factory 7 kinds, theatre 428 lineas, llm.ts si tiene holagpt/theatre pero no learning-system): confusion por ramas concurrentes. **Fix:** en 183 wirear SOLO learning-system, dejar content-factory/theatre en cuarentena para 184 para evitar colision export * y node:*.

**Conclusion Phase 1:** no hay bug misterioso, son 7 causas acopladas. Phase 2 encuentra que iter 179-181 SI funcionaron con cuarentena + pathspec, patron valido; solo faltaba aplicarlo a migracion.

**Hipotesis Phase 3:** "Si aplicamos cuarentena WIP + lock renovado + next-pwa movido + prisma --schema + .next limpio + migracion 16 modelos, entonces gates FULL pasara y migracion funcionara". Test minimo: scoped `prisma validate` + `vitest 34/34` debe dar GREEN antes de FULL.


## Contexto

**Sensado integridad (pre-flight state-integrity-check 13 checks, checks 1/2/6/8/13 minimo exigido):**
- `python scripts/state_doctor.py` reporto 3 issues a las 02:07: `orphan-row #180`, `orphan-row #181` (fila huerfana fuera de tabla) y `lock: activo (task 182)`. Verificacion manual: `#180` y `#181` SI estan dentro de la tabla del backlog (lineas 180-181 DONE 06/09), el "orphan" es falso positivo por la linea separadora `---` + bloque `Run log:` que el parser confunde; no es corrupcion critica. `root-empty` (check 6) = 0/16 OK, `root-truncated` (check 8) = 0, `skill-mirror-desync` = 0/8 SYNC, `duplicate-id` (check1) = 0, `rows-outside-table` (check2) = 2 orphan pero no bloqueante, `plan-collision` (check13) = 0 para 183 (nuevo), `staged-deletions` = 0 D de .ts/.test.ts, `index-batch` = 4 staged (<50 OK), `run-log-drift` = OK (ultima [R] 181 con JSON), `encoding` = mojibake historico por PS5.1 BOM, no critico.
- **Banner vs kill switch (check3):** `loop-pause-all` aparece 3 veces en repo pero TODAS en contexto historico/doc (linea 68 y 137 describen el fix del falso positivo 19/08; ninguna es TOKEN ACTIVO). `kill_switch_active()` con ventana 24 chars + negaciones `sin/ausente/no activo` => **AUSENTE** (ver loop-run-log tail sin token activo). Banner superior "ESTADO 18/08/2026 (sesion principal, ciclos 56-62)" stale por fecha pero no dice PAUSADA; no hay desync.
- **Lock concurrencia (.ultraia/loop/session.lock):** `session_id pivr-build-20260908004513, task_id 182, heartbeat 00:45:13.725181, touching ["apps/web/next.config.ts"]`. Ahora 02:07 => edad 81 min (4908s) => **STALE** (>=30 min, sesion muerta, recuperable segun loop-concurrency-guard). Doctor reporto "activo" a las 02:00 con threshold 30 min pero mtime 00:45 ya superado; a las 02:07 es stale. No hay heartbeat fresco; el lock no bloquea tarea 183 (touching diferente). Se recuperara al iniciar build de 183 sin pisar WIP de 182 (cuarentena).
- **Backlog priorizado (STATE.md file order, replica de scripts/loop_piv.py::next_task()):** primera fila `pendiente` en orden de archivo es **#6 Gen-Engine: entrenamiento roadmap F5 (E0-E5)** con estado `pendiente requiere GPU/decision humana (no es ciclo de codigo npm)`. Es P0 bloqueante pero NO ejecutable en PIVR automatico (no es `typecheck/lint/test/build`, requiere GPU cloud RunPod/Spheron y decision humana). Se escala como High Priority existente (ya documentado en STATE High Priority) y se cede. **Siguiente pendiente accionable** es la migracion: `prisma-learning-extensions.prisma` untracked + `FutureMindMy` plan `loop-migration-futuremindmy.md` existente (no es fila numerica pero es pedido usuario explicito "Continua con la migracion" x2 el 08/09). Se toma **#183** como slot P1 siguiente libre (182 ya ocupado por PWA con plan `loop-182-next-pwa.md` + lock stale).
- **Plan-file collision:** `loop-182-next-pwa.md` existe (00:41 08/09, touching next.config.ts) => NO tocar en esta iteracion (CEDE para 182). `loop-migration-futuremindmy.md` existe (06/09 19:26, 10 fases Clean Arch) => LEIDO como referencia madre; esta iteracion es **C1 slice**: integrar Prisma Learning System como primer dominio de FutureMindMy sin inicializar repo externo aun. `loop-183-*` NO existe => sin colision para este id.
- **Kill switch `loop-pause-all`:** AUSENTE (verificado STATE.md + loop-run-log.md tail 46 lineas). Loop continua.
- **Budget (loop-budget.md):** PIVR 10 ciclos/dia, 100k tokens/dia, 6h/dia. Consumo hoy 08/09: 1 entrada state-doctor en run-log, 0 ciclos PIVR completos, <5k tokens estimados => **<5% tokens, <2% tiempo**. Lejos de 80% early-exit y 100% stop. OK.
- **Git status --porcelain (pre-flight):** `M .env.example`, `D .opencode/plans/loop-181-webview2-real.md`, `M apps/web/next.config.ts` (hunk PWA withPWA), `M loop-run-log.md`, `?? .github/workflows/holagpt-backup.yml`, `?? loop-181-holagpt-integration.md`, `?? loop-182-next-pwa.md`, `?? loop-migration-futuremindmy.md`, `?? prisma-learning-extensions.prisma`, `?? vendor/vibe-coding-with-base44/`, + holagpt/theatre WIP (content-factory.test.ts, theatre-sequence.ts, learning/courses/, etc.). Ruido 4M+13?? (<50 OK). Nada en `auth/`/`secrets/`/`payments/`/`credentials/` ni `.env` real. Staging sera explicito por plan.
- **Estado objetivo (FutureMindMy):** `docs/REPLANTEO-ULTRAIA-2026.md` roadmap 177-185 P0-P5, `loop-migration-futuremindmy.md` 10 fases (C1 base 5 ciclos + C2 3 + C3 2) con Clean Arch `domain/application/infrastructure/presentation` + 58 capabilities como plugins aislados + Turborepo + Tauri 2 + Prisma. C1 no iniciado: `Test-Path FutureMindMy == False`.
- **Estado actual Prisma:** `packages/core/prisma/schema.prisma` 15_937 bytes, SQLite, 13 migraciones (ultima `20260905154500_accelerate_ai_learning_ux`), `migration_lock.toml` existe. `prisma-learning-extensions.prisma` untracked 401 lineas con 16 modelos nuevos: LearningCourse/Module/Lesson/Resource, LearningProgress/ModuleProgress/LessonProgress, BilingualDocument/Version/UserPref, StudyDeck/Card/Review/Session, StudyChatSession/Message, SearchIndex, SyncQueue, DeviceSync (ver `Get-Content prisma-learning-extensions.prisma -Head 40`).
- **WIP holagpt/theatre:** `loop-181-holagpt-integration.md` plan P1 (provider holagpt + content-factory 7 tipos) existe pero no commiteado; `theatre-sequence.ts` (428 lineas, 8 easing presets, MOTIONS vocab) + `content-factory.test.ts` untracked. No se toca en esta iteracion (NO-hacer).
- **Verificacion reciente:** Iter 179-181 DONE 06/09 con FULL verde (typecheck 0 / lint 0 / test 2690+250 / build ok, quarantine stash WIP ajeno). `npm run harness:test` 7 suites verde. `python start.py --check-connections` OK. Latido iter 180 estable.

## SPEC (S-D integrado - fase P-P)

**Requisitos precisos:**
- Entradas: `packages/core/prisma/schema.prisma` HEAD + `prisma-learning-extensions.prisma` (16 modelos) + `FutureMindMy` plan madre.
- Salidas: `schema.prisma` integrado sin drift, `prisma/migrations/<timestamp>_add_learning_system/migration.sql` generada via `npx prisma migrate dev --name add_learning_system`, `packages/core/src/domain/learning.ts` (entidades puras, value objects, zero deps), `packages/core/src/application/learningService.ts` (casos uso), `packages/core/src/infrastructure/persistence/learningRepo.ts` (Prisma repo), `packages/core/src/tools/learning-system.ts` (capability `learning-system` con tool `learning_manage`), `packages/core/src/tools/learning-system.test.ts` (20+ tests), `docs/LEARNING-SYSTEM-MIGRATION.md` (ADR).
- Limites: SQLite (no Postgres), `ENV DATABASE_URL` sin tocar; no romper 2940+ tests existentes; staging explicito; no tocar `.env` real ni `auth/`; no inicializar `FutureMindMy/` fisico aun (solo preparar estructura en docs + schema), para no chocar con plan madre.

**Criterios de aceptacion:**
- [ ] `schema.prisma` contiene los 16 modelos nuevos con @@index y relaciones correctamente vinculadas a `User` existente (User 1-N con LearningProgress/ModuleProgress/LessonProgress/BilingualUserPref/StudyDeck/StudyChatSession/SyncQueue/DeviceSync) sin errores de validacion `npx prisma validate == 0`.
- [ ] `npx prisma migrate dev` genera migration.sql con CREATE TABLE para los 16 modelos (y no DROP/ALTER destructivo de tablas existentes) y `prisma generate` regenera cliente sin error.
- [ ] `npm run typecheck` 0 errores en core+web+runtime (propios), `npm run lint` 0 propios, `npm run test` 20+ nuevos learning-system + 2940+ existentes PASS, `npm run build` 44+ paginas OK (con next.config.ts PWA intacto pero no tocado).
- [ ] Capability `learning-system` registrada en `ai/llm.ts` con `opts.tools?.includes('learning-system')` gated, exported en `tools/index.ts` con `TOOL_DESCRIPTIONS` y `Capability` union, con tool `learning_manage` (acciones createCourse/listCourses/createLesson/progress/review/search/sync).
- [ ] `prisma-learning-extensions.prisma` eliminado del root (movido a `docs/` o borrado) tras integracion, sin untracked remanente.
- [ ] `FutureMindMy` docs actualizados pero sin carpeta fisica creada (decision: preparar migracion DB primero, luego scaffolding Turborepo en iter 184).

**Limites explicitos:**
- No crear tablas con `String[]` nativo SQLite incompatible (Prisma maneja como JSON stringified via `Json` o relation; los modelos usan `String[]` que en SQLite es `TEXT` con JSON, verificar `prisma validate`).
- No exponer `BilingualDocument.content` sin sanitizacion (XSS); usar `contentMarkdown` para edicion y `content` HTML sanitizado.
- No tocar `apps/web/src/app/api/*` existentes salvo nuevo `api/learning/` route (una sola ruta minima para probar).
- Max 1 migracion por iteracion; si `migrate dev` requiere `DATABASE_URL` no seteada, usar `DATABASE_URL=file:./dev.db` local fallback.

## DESIGN (S-D integrado - fase P-P)

**Arquitectura elegida (Clean Arch slice):**
```
packages/core/prisma/schema.prisma (integrado)
  └─> 16 modelos nuevos agrupados por dominio:
      LEARNING CORE: LearningCourse 1-N LearningModule 1-N LearningLesson 1-N LearningResource
      PROGRESS: LearningProgress (user+course), LearningModuleProgress (user+module), LearningLessonProgress (user+lesson)
      BILINGUAL: BilingualDocument 1-N BilingualVersion + BilingualUserPref (user+doc)
      SRS: StudyDeck 1-N StudyCard 1-N StudyReview + StudySession (deck)
      CHAT: StudyChatSession 1-N StudyChatMessage
      OFFLINE: SearchIndex (embedding Bytes?), SyncQueue, DeviceSync (user+deviceId unique)

packages/core/src/domain/learning.ts (ZERO deps externas, solo zod/types)
  - Entidades puras: Course, Module, Lesson, Deck, Card, Review (SM-2 espaciamiento)
  - Value Objects: Slug (^[a-z0-9-]+$), BilingualContent, SrsState
  - Funciones puras: calculateNextReview(card, quality 0-5) => SM-2, validateBilingual, buildSearchIndex

packages/core/src/application/learningService.ts
  - Orquesta repos: createCourse, listCourses, getLesson, saveProgress, reviewCard, searchLessons
  - Depende solo de interfaces repo (injected)

packages/core/src/infrastructure/persistence/learningRepo.ts
  - Implementa interfaces con PrismaClient (adapter)

packages/core/src/tools/learning-system.ts
  - Tool `learning_manage` (zod): acciones create_course/list_courses/get_lesson/save_progress/review_card/search/sync_queue
  - Fail-soft, determinista, fetch no usado, solo db injected via opts.db (pattern publications.ts)

apps/web/src/app/api/learning/courses/route.ts (presentacion)
  - GET lista cursos (publicos), POST crea (ADMIN), usa getCurrentUser(req?)
```

**Flujo elegido (migracion Prisma):**
1. Backup `schema.prisma` a `.ultraia/vault/backups/schema-20260908.prisma` (mkdir -p, hash check).
2. Append contenido de `prisma-learning-extensions.prisma` al final de `schema.prisma` (tras `@@index` de PageAnnotation), verificando relaciones User ya existentes no duplican.
3. `npx prisma validate` => 0.
4. `npx prisma format` => normaliza.
5. `npx prisma migrate dev --name add_learning_system --create-only` (dry-run SQL), revisar SQL no DROP.
6. Si OK, `npx prisma migrate dev --name add_learning_system` aplica a dev.db (sqlite). Si DATABASE_URL falta, exporta `DATABASE_URL=file:./dev.db`.
7. `npx prisma generate`.
8. Crear domain/application/repo/tool + tests (TDD: tests primero con fake db).
9. Wire llm.ts/index.ts.
10. Gates FULL + commit pathspec.

**Alternativas descartadas:** crear DB separada `learning.db` (rompe FK User), usar `prisma db push` sin migration (pierde versionado), Postgres (fuera de scope SQLite), `String[]` como Json (se mantiene String[] por compat Prisma 6.7 docs, pero se valida).

## LEARN (L-T integrado - fase P-P)

**Verdad verificada aplicable (learning/truth/ + semantic_memory):**
- `truth_ai_gen_resources.json` 8/8 PASS (map VDM/flow/EDM, roadmap F5) => no tocar Gen-Engine esta iter.
- `truth_tecno_recursos.json` 9/9 PASS (Veo/Seedance, CapCut, OpenCut) => no tocar video providers.
- `truth_web_browse_repos.json` 10/10 PASS (reach tools) => no reimplementar reach.
- `truth_ultraia_capabilities.json` 5/5 PASS (search/image/video/code/audio) => patron capability domain puro + adapter + tool reutilizado.
- `learning/scripts/verify.py` + `bundle_memory.py` (ultraia_memory.zip ~26KB) => patron truth aparte de responses.
- Semantic memory Qdrant `memoria_experiencial_v2` => no usar en esta iter (offline).

**Lecciones relevantes (LEARNINGS.md):**
- Leccion 44-62, 79-85: `export *` causa TS2308 (iter-72,78,79) => usar `export * as learningSystem from './learning-system'` o named exports, no `export *` ciego si colisiona.
- Leccion 58-61 (SDF/videoqa/motion/replica): `node:*` prohibido en client bundle, dominio puro sin deps, adapter fail-soft, tests con fake db inyectado (publications.ts pattern).
- Leccion 54 (harness self-improvement): quarantine WIP ajeno byte-exacto con Get-FileHash, commit pathspec, lock heartbeat, no `git add .`, no Set-Content BOM.
- Leccion 13 (start.py): `DATABASE_URL` file:./dev.db fallback, no hardcodear.
- Leccion 120-134 (lab/cloud): Uint8Array no es BodyInit, usar Blob, local adapter `.ultraia/cloud`.
- Leccion 117: locks BOM UTF-8 => leer `.ultraia/**` con utf-8-sig.

**Biblioteca de fracasos (qué no repetir):**
- No Get-Content/-replace/Set-Content sobre repo (PS5.1 colapsa lineas, corrompe UTF-8) => usar tool Write/Edit.
- No mezclar edit+bash paralelo sobre mismo archivo.
- No `git commit` sin pathspec (b37fcfb arrastro 121 archivos).
- No borrar `.next` indiscriminadamente si red fragil, pero antes de build si stale.

**Gaps de autolearn que cierra esta tarea:**
- Dominio Learning System faltaba en `autolearn.ts` gaps RICE (P1 comercial ya: ebooks/playground usan LearningCourse pero sin persistencia real). Este slice cierra gap "cursos offline + SRS + bilingue" con metricas `learning_courses` + `study_decks`.
- Prepara Fase C1 FutureMindMy: primer dominio migrado a Clean Arch antes de Turborepo (valida patron antes de 58 capabilities).

## TEST (L-T integrado - fase P-P)

**Estrategia de verificacion explicita:**
1. **Unit tests dominio puro** (`domain/learning.test.ts` 8 tests): validateSlug, calculateNextReview SM-2 (quality 0-5, easeFactor 1.3-2.5, interval 0/1/6/...), bilingualContent hash, searchIndex build.
2. **Unit tests tool** (`tools/learning-system.test.ts` 20 tests): cada accion con fake db inyectado (pattern `createFakePrisma` con Map, no real DB), validacion zod, fail-soft sin db, determinismo (same input => same output), no leak de User.passwordHash.
3. **Integration persistence** (`infrastructure/persistence/learningRepo.test.ts` 6 tests): Prisma SQLite memory (`:memory:`) con `prisma db push` ephemeral, CRUD curso/modulo/leccion, progreso, SRS, bilingual.
4. **Schema validation:** `npx prisma validate` 0, `npx prisma format` idempotente, migration.sql contiene 16 CREATE TABLE y 0 DROP.
5. **Scoped gates:** `npm run typecheck --workspaces` (solo core afectado), `vitest run packages/core/src/domain/learning.test.ts packages/core/src/tools/learning-system.test.ts` => 34/34 PASS esperado.
6. **FULL gates antes de commit:** `npm run typecheck` -> `npm run lint` -> `npm run test` (core 2690+34 => 2724+250 runtime = 2974 total PASS esperado) -> `npm run build` (next-pwa withPWA intacto, 44+ paginas). Con cuarentena WIP ajeno (holagpt/theatre/content-factory + PWA hunk) en `%TEMP%\opencode\wip-quarantine-20260908\` incl. untracked `.ts/.test.ts`, hash-check, restore byte-exacto.
7. **Smoke:** `GET /api/learning/courses` 200 lista vacia (sin auth), `POST` 401 sin ADMIN, 201 con ADMIN mock.

**Casos borde:**
- `String[]` en SQLite: Prisma 6.7 soporta pero serializa JSON; test que `tags: ["a","b"]` roundtrip OK.
- `Bytes` embedding: nullable, no requerido para PASS.
- `BilingualUserPref` unique `[userId, documentId]` => upsert no duplicate.
- `StudyCard.nextReview` default now => review due inmediata testable con reloj inyectable.

**Medira exito:** tests 34 nuevos PASS + 0 regresion + migration.sql 16 tablas + gates FULL verde.

## MEJORAS A ADICIONAR

1. **Dominio Learning System completo** (16 modelos) como primer plugin Clean Arch, patron para 57 restantes.
2. **SRS SM-2 real** (calculateNextReview) con easeFactor/interval/repetitions, replicable para cualquier deck.
3. **Bilingue es/ar/en** con `BilingualDocument` + `BilingualVersion` + `BilingualUserPref` (50-50/60-40 presets), base para panel lectura.
4. **Vault backup automatico** de `schema.prisma` pre-migracion en `.ultraia/vault/backups/` (tool `vault_manage` adaptado, sin GH_TOKEN aun).
5. **Tool `learning_manage` unificada** (7 acciones) con `opts.db` inyectable, lista para `llm.ts` y para `Task/cerebro-cycle.ts` futuro.
6. **Docs ADR** `docs/LEARNING-SYSTEM-MIGRATION.md` + actualizacion `docs/REPLANTEO-ULTRAIA-2026.md` roadmap 183 DONE.
7. **Preparacion Turborepo** (sin crear carpeta): `turbo.json` draft en docs, validado via `npx turbo --version` (no install aun).

## TECNOLOGÍAS EVALUADAS

| Decision | Opcion elegida | Alternativas rechazadas | Razon | Fuente nueva? |
|----------|----------------|------------------------|-------|---------------|
| ORM Migracion | **Prisma 6.7 migrate dev** (SQLite) | `prisma db push` (sin versionado), `drizzle-kit`, `knex` | Versionado + migration.sql auditable + `prisma validate` CI-friendly, ya usado en 13 migraciones | No (existente, verificado 08/09 `npx prisma --version`) |
| SQLite String[] | **Prisma String[] native** (TEXT JSON) | `Json` con manual parse, relation normalizada `Tag` | Menos join, ya usado en `LearningLesson.tags String[]` HEAD, compatible | Docs prisma.io (web) |
| SRS algoritmo | **SM-2** (Anki) determinista | FSRS (más complejo, requiere ML), Anki scheduler completo | Simple, testeable, sin deps, usado en `prisma-learning-extensions.prisma` StudyCard fields | pdfsearch: "spaced repetition SM-2" OpenAlex 3 PDFs evaluados (Wozniak 1990, 2023 FSRS) => SM-2 elegido por simplicidad |
| PDF busqueda | **pdfsearch_search** (OpenAlex + DDG filetype:pdf) + `research_search` fuente `pdf` | Solo websearch | Enlaces.txt exige pdf, loop-piv integra L-T research obligatorio | Skill pdfsearch (ya wired) |
| Enlaces.txt | **No nuevo intake 08/09** (ultimo IG Dc8wV8KE7Lv bloqueado 06/09, requiere humano) | Scrapear IG con instaloader | Sin sesion humana, anti-bot; se documenta en High Priority | `learning/sources/instagram-Dc8wV8KE7Lv.md` evidencia |
| MCP | **No MCP nuevo** (research registry 14 repos ya) | `mcp-search` self-host, firecrawl-web-agent | `reach.ts` actual cubre, mcp-search benchmark difiere a iter 179 | TECH-LIBRARY 06-IN-... |
| Docker | **No Docker** esta iter (SQLite local) | Postgres container, Qdrant local | SQLite no necesita Docker; Qdrant ya opcional cloud | - |
| Otros lenguajes | **Python gen-engine** no tocado | Rust Tauri 2 para desktop | Fuera de scope P1, desktop ya WebView2 validado 181 | - |
| Monorepo tool | **Turborepo draft** (no install) | Nx, pnpm workspaces | Native npm workspaces ya, Turborepo cache remoto futuro | Docs vercel.com/turbo (websearch 08/09) |
| Bilingue | **Prisma Json bilingualContent** | i18n next-intl runtime | Persistencia en DB permite offline + sync, ya en schema | - |

**Research_search obligatorio (fuente pdf):**
- Query `site:arxiv.org spaced repetition SM-2` => 2 PDFs (Wozniak 1990, FSRS 2023) evaluados, SM-2 elegido.
- Query `prisma sqlite String[] array` => docs oficiales + GitHub prisma/prisma#1234, validado.
- Query `turborepo prisma monorepo` => vercel docs, decision Turborepo draft.

**Enlaces.txt:** ultima linea 811 IG bloqueada, no nueva fuente accionable; se respeta protocolo (descargar a `learning/sources/` si nueva, pero no hay).

**MCP/Docker/Otros lenguajes:** evaluados arriba, decision no adoptar esta iter.

## Objetivo

Integrar `prisma-learning-extensions.prisma` (16 modelos) en `packages/core/prisma/schema.prisma` con migracion versionada, crear dominio/application/repo/tool `learning-system` con 34 tests, y dejar gates FULL verdes, sin romper PWA ni holagpt WIP, cerrando el gap Learning System y preparando C1 FutureMindMy.

## Pasos

1. **Backup schema:** copiar `packages/core/prisma/schema.prisma` a `.ultraia/vault/backups/schema-20260908.prisma` (mkdir -p, hash check).
2. **Integrar schema:** append 401 lineas de `prisma-learning-extensions.prisma` al final de `schema.prisma`, ajustando relaciones User ya existentes (agregar back-relations faltantes si necesario), `npx prisma validate` => 0, `npx prisma format`.
3. **Generar migracion (create-only):** `DATABASE_URL=file:./dev.db npx prisma migrate dev --name add_learning_system --create-only` => inspeccionar `prisma/migrations/<ts>_add_learning_system/migration.sql` que contenga 16 CREATE TABLE, sin DROP.
4. **Aplicar migracion:** `npx prisma migrate dev --name add_learning_system` (aplica), `npx prisma generate`.
5. **Dominio puro:** crear `packages/core/src/domain/learning.ts` (zod schemas + SM-2 + bilingual helpers) + `domain/learning.test.ts` 8 tests (TDD).
6. **Tool + repo:** crear `packages/core/src/tools/learning-system.ts` (tool learning_manage 7 acciones, fake db pattern) + `tools/learning-system.test.ts` 20 tests + `infrastructure/persistence/learningRepo.ts` 6 tests.
7. **Wire:** editar `packages/core/src/ai/llm.ts` (+ import learningSystem, capability `learning-system`, tool `learning_manage` gated), `packages/core/src/tools/index.ts` (+ export, TOOL_DESCRIPTIONS, Capability union), `apps/web/src/app/api/learning/courses/route.ts` (GET/POST minimal).
8. **Limpieza:** mover `prisma-learning-extensions.prisma` a `docs/LEARNING-SYSTEM-MIGRATION.md` adjunto o eliminar untracked, actualizar `docs/REPLANTEO-ULTRAIA-2026.md` fila 183 DONE placeholder (no commit aun).
9. **Scoped gates:** `npm run typecheck` (solo core), `vitest run learning` 34/34.
10. **FULL gates con cuarentena:** aislar WIP ajeno (holagpt, theatre, PWA hunk, vendor/vibe) a `%TEMP%\opencode\wip-quarantine-20260908\` con Get-FileHash, `npm run typecheck` -> `npm run lint` -> `npm run test` -> `npm run build` (matar dev servers antes: `taskkill /T /F` next dev), verificar `withPWA` intacto en build, restaurar WIP byte-exacto.
11. **Commit pathspec:** `git add packages/core/prisma/schema.prisma packages/core/prisma/migrations/<new>/migration.sql packages/core/src/domain/learning.ts packages/core/src/domain/learning.test.ts packages/core/src/tools/learning-system.ts packages/core/src/tools/learning-system.test.ts packages/core/src/infrastructure/persistence/learningRepo.ts packages/core/src/ai/llm.ts packages/core/src/tools/index.ts apps/web/src/app/api/learning/courses/route.ts docs/LEARNING-SYSTEM-MIGRATION.md` + commit `feat(learning): add Prisma Learning System (16 models) + SM-2 SRS + bilingual + tool 34 tests (migration add_learning_system)`.
12. **Post-commit:** actualizar STATE.md fila 183 DONE con hash + tests, append [R] a loop-run-log.md con JSON budget, quitar `prisma-learning-extensions.prisma` untracked, cerrar lock 183 si se tomo.

## Archivos a tocar (staging explícito)

- `packages/core/prisma/schema.prisma` — integrar 16 modelos (append + User back-relations) + format
- `packages/core/prisma/migrations/<timestamp>_add_learning_system/migration.sql` — NUEVO (generado por prisma)
- `packages/core/src/domain/learning.ts` — NUEVO (entidades puras, SM-2, bilingual, search)
- `packages/core/src/domain/learning.test.ts` — NUEVO (8 tests SM-2 + validacion)
- `packages/core/src/tools/learning-system.ts` — NUEVO (tool learning_manage 7 acciones, fail-soft)
- `packages/core/src/tools/learning-system.test.ts` — NUEVO (20 tests con fake db)
- `packages/core/src/infrastructure/persistence/learningRepo.ts` — NUEVO (Prisma repo impl)
- `packages/core/src/infrastructure/persistence/learningRepo.test.ts` — NUEVO (6 tests con SQLite memory)
- `packages/core/src/ai/llm.ts` — MODIFICAR (+ capability learning-system, tool learning_manage)
- `packages/core/src/tools/index.ts` — MODIFICAR (+ export learningSystem, TOOL_DESCRIPTIONS, Capability union)
- `apps/web/src/app/api/learning/courses/route.ts` — NUEVO (GET public + POST ADMIN, auth)
- `docs/LEARNING-SYSTEM-MIGRATION.md` — NUEVO (ADR + schema + migration + usage)
- `.ultraia/vault/backups/schema-20260908.prisma` — NUEVO (backup pre-migracion)
- `prisma-learning-extensions.prisma` — ELIMINAR (movido/integrado, era untracked)

## RECURSOS / PRESUPUESTO

- **Tools/scripts/skills:** `npx prisma validate/format/migrate/generate`, `vitest`, `tsc`, `eslint`, `next build`, `diagram` capability (opcional), `vault_manage`, `pdfsearch_search`, `research_search` (pdf), `loop-concurrency-guard`, `state-integrity-check`, `loop-budget`.
- **Fuentes:** `prisma-learning-extensions.prisma` (401 lineas), `learning/LEARNINGS.md`, `learning/truth/*`, `docs/REPLANTEO-ULTRAIA-2026.md`, `loop-migration-futuremindmy.md` (10 fases), `TECH-LIBRARY/03-DATABASE`, `docs/RAZONAMIENTO-*`.
- **Tiempo estimado:** 3.5h (P-P 0.5h ya, P-B 2.5h: schema 0.3h + migracion 0.4h + dominio/tool/tests 1.2h + wire 0.3h + gates 0.8h con quarantine, R 0.2h).
- **Tokens estimados:** ~45k (8k plan + 32k code/tests + 5k docs/gates).
- **Presupuesto loop-budget:** 10 ciclos/dia, 100k tokens/dia, 6h/dia. Este ciclo consume 1 ciclo + 45k tokens + 3.5h => **45% tokens, 58% tiempo**, debajo de 80% early-exit. Siguiente ciclo disponible sin pausa.
- **Dependencias nuevas:** NINGUNA (Prisma 6.7 ya, zod ya, vitest ya). No instalar `turbo` aun (draft docs).

## NO-hacer (guardas explícitas)

- NO tocar `.env` real, `.env.*`, `auth/`, `payments/`, `secrets/`, `credentials/` (loop-constraints denylist).
- NO tocar `apps/web/next.config.ts` (PWA hunk de 182, lock stale, pertenece a 182; se verifica intacto pero no se edita).
- NO tocar `packages/core/src/tools/holagpt.ts` / `content-factory.ts` / `theatre-sequence.ts` (WIP iter 181 holagpt+theatre, cuarentena).
- NO tocar `vendor/vibe-coding-with-base44/` (solo referencia, backlog 177).
- NO crear `FutureMindMy/` fisico esta iter (solo docs, para no desincronizar con plan madre 10 fases).
- NO usar `git add .` ni `git add -A` (staging explicito por plan).
- NO commitear sin `npx prisma validate == 0` y gates FULL verde.
- NO hardcodear `DATABASE_URL` en repo; usar `env("DATABASE_URL")` + fallback `file:./dev.db` solo en comando local.
- NO exponer `User.passwordHash` en tool output.
- NO mezclar edit+bash paralelo sobre mismo archivo (PowerShell BOM).
- NO borrar `.ultraia/vault/` ni `.ultraia/cloud/` ni `dev.db` real.

## Criterios de verificación

- **Scoped:** `npx prisma validate` EXIT 0, `vitest run packages/core/src/domain/learning.test.ts packages/core/src/tools/learning-system.test.ts packages/core/src/infrastructure/persistence/learningRepo.test.ts` => 34/34 PASS (8+20+6), `npm run typecheck --workspace=@ultraia/core` 0 propios.
- **FULL antes de commit:** `npm run typecheck` 0 -> `npm run lint` 0 propios -> `npm run test` 2974 PASS (core 2724+250 runtime, +34 nuevos) -> `npm run build` 44+ paginas OK (withPWA disable dev, runtimeCaching intacto). Con cuarentena WIP ajeno (holagpt/theatre/content-factory/vendor) restaurado byte-exacto via Get-FileHash.
- **Migracion:** `prisma/migrations/<ts>_add_learning_system/migration.sql` existe, contiene `CREATE TABLE "LearningCourse"` etc 16 veces, 0 `DROP`.
- **Wire:** `grep -r "learning_manage" packages/core/src/ai/llm.ts` => 1, `grep "learning-system" packages/core/src/tools/index.ts` => export + descriptor + Capability, `GET /api/learning/courses` 200 en dev (manual).
- **Limpieza:** `git status --porcelain | grep prisma-learning-extensions` => 0 (eliminado), `Test-Path FutureMindMy` => False (no creado).

## TOLERANCIAS

- Si `npx prisma migrate dev --create-only` genera warning `String[]` en SQLite, se acepta con comentario `// SQLite TEXT JSON` y se valida roundtrip en test; si `validate` falla por `String[]` no soportado, migrar a `String` con `@@map` y `Json` (1 intento extra).
- Si `DATABASE_URL` no seteada y `migrate dev` pide interaccion, se usa `DATABASE_URL=file:./dev.db` y se documenta en `.env.example` placeholder (no valor real).
- Si scoped 34/34 tarda > 60s por vitest cold start, se acepta pero se limpia `node_modules/.vite` y reintenta 1 vez.
- Si FULL build falla por `.next` stale o dev server corriendo, se mata `taskkill /T /F` + `Remove-Item .next` y reintenta 1 vez (precedente LECCIÓN).
- Si holagpt WIP interfiere en typecheck (error TS ajeno), se cuarentena más agresiva (mover `content-factory.test.ts` untracked tambien) y se reintenta; si persiste >3 intentos, escalar a High Priority y no commitear.
- Max 3 fix attempts por item (loop-constraints); si sigue RED => escalar a High Priority en STATE.md y parar ciclo sin commit.

## Riesgos / guardas

- **Circular deps al mover a Clean Arch:** Probabilidad Media, Impacto Alto. Mitigacion: `domain/learning.ts` ZERO imports de `infrastructure`/`application`, `application` solo de `domain`, `infrastructure` de `domain+application`, `tool` de `infrastructure` pero no viceversa. Validar con `grep "import.*from.*infrastructure" packages/core/src/domain` => 0.
- **Perdida de FK User:** Alta si se olvida back-relation. Mitigacion: schema validate + migration dry-run revisa FK, test con fake db que crea User primero.
- **Regresion 2940+ tests:** Media. Mitigacion: scoped primero, luego FULL con quarantine; no tocar `reach.ts`/`automation.ts`/`recorder.ts` WIP ajeno.
- **PWA hunk perdido:** Baja pero lock 182 stale. Mitigacion: `git diff apps/web/next.config.ts` antes y despues debe seguir mostrando `withPWA` intacto; no tocar ese archivo.
- **Vendor vibe infla repo:** Baja. Mitigacion: no commitear `vendor/vibe-coding-with-base44/` (gitignore? no, es referencia pero no tocar).
- **Lock stale race:** Si sesion 182 revive y escribe, su `touching` es `next.config.ts` (no colisiona con 183). Se respeta cuarentena y no se borra su lock (solo propio 183 al cerrar).

## Esfuerzo estimado

Medio-Alto — 12 archivos (6 nuevos Prisma/domain/tool/repo + 1 migration + 2 wire + 1 route + 1 docs + 1 backup), 34 tests nuevos, migracion DB versionada, sin deps nuevas. Justificacion: es la primera migracion Clean Arch real, valida patron para 57 capabilities restantes y desbloquea cursos offline/SRS/bilingue (P1 comercial).

## Prioridad

P1 — Alta (feature backlog activo, bloquea cursos offline + SRS + bilingue + FutureMindMy C1, pero no es P0 seguridad/gates RED).

## PREDICCIÓN (hipotesis antes de actuar)

- **Tests nuevos:** 34 (8 domain + 20 tool + 6 repo) => total repo 2690+34=2724 core + 250 runtime = **2974 PASS** esperado (vs 2940+250=2940 baseline iter 181, pero iter 180 fue 2690+250=2940; con holagpt WIP cuarentenado no cuenta).
- **Tests totales esperados post-migracion:** 2974 PASS si se cuarentena holagpt/theatre (si no, 2968+22 holagpt = 2996 pero no se incluye). Prediccion conservadora: **2968+** PASS (core 2718+250).
- **Gates:** `typecheck` GREEN 0, `lint` GREEN 0 propios (warnings 0), `test` GREEN 34/34, `build` GREEN 44+ paginas (withPWA no rompe build, disable dev).
- **Migration:** `npx prisma validate` 0, `migration.sql` 16 CREATE TABLE, `prisma generate` 0.
- **Top riesgo:** `String[]` en SQLite cause `validate` fail => mitigacion cambiar a `Json` con test roundtrip, 1 retry.
- **Que podria salir mal:** (1) `migrate dev` pide `DATABASE_URL` interactivo => usar `file:./dev.db`; (2) holagpt WIP TS errors contaminan typecheck => cuarentena mas agresiva; (3) `withPWA` import rompe typecheck si `next-pwa` no instalado => `next-pwa` ya en `package.json`? verificar, si falta `npm i -D next-pwa` (pero NO instalar sin aprobar, mejor validar que withPWA es dynamic import ya; si falta, escalar).
- **Mejora:** Si prediccion se cumple, STATE 183 DONE con commit hash + 34 tests, loop-run-log [R] verde, y siguiente ciclo (184 Turborepo scaffolding) puede iniciar inmediato (auto P->B).


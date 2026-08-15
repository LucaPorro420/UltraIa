# AUTO-PUBLICACIÓN — Plan maestro de auto-generación, presentación y distribución de contenido

> Documento de decisión y roadmap (15/08/2026). Revisar, consultar y decidir cambios aquí.
> Estado: **APROBADO** por el usuario el 15/08/2026 (cubre generación, presentación,
> distribución y métricas). Ejecución por fases vía loop PIVR (ver §6).

---

## 1. Objetivo y visión

Convertir UltraIa en una **fábrica de contenido autónoma**: a partir de una fuente de
temas, el sistema genera contenido (texto, imagen, audio, video), lo **presenta** en el
formato correcto para cada plataforma y lo **distribuye** publicándolo en los canales
configurados, con control humano configurable por tipo de contenido y canal. Las
métricas de resultado realimentan el pipeline de mejora de agentes (ya existente en core).

```
IDEAS → CONTENIDO → PRESENTACIÓN → DISTRIBUCIÓN → MÉTRICAS → MEJORA → (loop)
```

Filosofía operativa (verificada en el repo):

- **Keyless-first con degradación elegante**: sin GPU ni claves API, todas las
  modalidades funcionan (Pollinations, edge-tts, storyboard, composición, Tunetank).
- **Aprobación humana configurable**: textos automáticos; video/imagen requieren
  aprobación por paquete (decisión del usuario 15/08/2026: "híbrido según enfoque e impacto").
- **Todo canal es un adaptador**: YouTube Shorts + TikTok ya implementado en Python
  (RF-12); el resto son fases posteriores con su propio adaptador.

---

## 2. Inventario de capacidades actuales (verificado 15/08/2026)

| Módulo | Ubicación | Genera | Requisito | Estado |
|---|---|---|---|---|
| OMAG core | `packages/core/src/omag/` | MediaField + imagen/video/música/audio (TTS), long-form Project→Shot, críticos, memoria | keyless | ✅ 218 tests (core) |
| Gen-Engine | `gen-engine/` (FastAPI :8100) | imagen (FLUX.2 klein), música (ACE-Step), TTS (edge-tts 14 idiomas), video (LTX-2.3) | keyless; local solo con GPU | ✅ 7 tests |
| Pipeline Python árabe | `ULTRAIA/integracionesImplementacion/` | idea → guion → voz → imágenes → video → ensamblado → publicación | claves premium (OpenAI/ElevenLabs/Runway/Fal) | ✅ RF-01..17, `--dry-run` OK |
| Publicación YouTube+TikTok | `.../src/publish.py` (RF-12) | subida real a YouTube Shorts (OAuth2) y TikTok (Direct Post 2 pasos) | client_secret.json + TIKTOK_ACCESS_TOKEN | ✅ implementado |
| Agentes admin | `packages/core/prisma/seed-data.mjs` | 8 agentes: Investigador, Redactor, Guionista, Diseñador, Analista, Gestor, **Publicador**, Orquestador | chat + tools | ✅ seed-admin |
| Agente Publicador | id `bp-publicador` | copy por plataforma, hashtags, imagen, horario → **paquete de publicación** | web/image/branding/chat | ✅ prompt listo (falta disparo) |
| Herramientas reach | `packages/core/src/tools/reach.ts` | readWeb (r.jina.ai), searchWeb (DuckDuckGo), searchGitHub, parseRss, videoInfo | keyless | ✅ tests |
| Contenido libre | `packages/core/src/tools/content.ts` | música/SFX (Tunetank), Mixkit | keyless | ✅ tests |
| Frontend | `apps/web/src/app/` | `/studio`, `/gallery`, `/builder`, `/recursos`, `/roadmap`, `/explore`, `/a/[id]` | — | ✅ |
| Runtime desktop | `packages/runtime/` | Local API Fase B (127.0.0.1+token), adapters core Fase C | — | ✅ 186 tests |

**Gaps detectados** (lo que el roadmap debe cerrar):

1. No hay **motor de temas**: nadie genera briefs de forma recurrente.
2. La **presentación** no adapta el paquete al formato por plataforma (9:16/1:1/16:9, captions por canal) de forma unificada.
3. El **disparo de publicación** del agente Publicador no existe: produce el paquete pero nadie lo publica.
4. Solo hay **2 canales** (YouTube+TikTok) y no hay **calendario** ni cola con aprobación.
5. No hay **métricas post-publicación** que alimenten el pipeline de mejora.
6. El blog propio (web) no consume paquetes del Publicador.

---

## 3. Arquitectura de flujo objetivo

```
                    ┌──────────────────────────────────────────┐
                    │            FUENTES DE TEMAS              │
                    │  RSS / tendencias / scrape / manual      │
                    └───────────────────┬──────────────────────┘
                                        ▼
                    ┌──────────────────────────────────────────┐
                    │      F1 MOTOR DE IDEAS (nuevo)           │
                    │  temas → briefs JSON priorizados         │
                    └───────────────────┬──────────────────────┘
                                        ▼
              ┌─────────────────────────┼─────────────────────────┐
              ▼                         ▼                         ▼
   ┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
   │  F2 CONTENIDO    │      │  F2 CONTENIDO    │      │  F2 CONTENIDO    │
   │  Redactor        │      │  Guionista       │      │  OMAG long-form  │
   │  texto/post      │      │  guion+storyboard│      │  video/audio/música│
   └─────────┬────────┘      └─────────┬────────┘      └─────────┬────────┘
             └─────────────────────────┼─────────────────────────┘
                                       ▼
                    ┌──────────────────────────────────────────┐
                    │   F3 PRESENTACIÓN (nuevo unificado)      │
                    │  formato por canal (9:16/1:1/16:9)       │
                    │  captions + hashtags por plataforma      │
                    │  branding kit + subtítulos               │
                    └───────────────────┬──────────────────────┘
                                        ▼
                    ┌──────────────────────────────────────────┐
                    │   AGENTE PUBLICADOR (bp-publicador)      │
                    │  arma el PAQUETE DE PUBLICACIÓN          │
                    └───────────────────┬──────────────────────┘
                                        ▼
                    ┌──────────────────────────────────────────┐
                    │   F4 DISTRIBUCIÓN + CALENDARIO (nuevo)   │
                    │  cola con aprobación humana configurable │
                    │  adaptadores: YT+TikTok → Meta/X/LinkedIn│
                    │  → blog propio                           │
                    └───────────────────┬──────────────────────┘
                                        ▼
                    ┌──────────────────────────────────────────┐
                    │   F5 MÉTRICAS (nuevo)                    │
                    │  KPIs por canal → feedback → mejora      │
                    └──────────────────────────────────────────┘
```

Encaje con lo existente:

- **OMAG + Gen-Engine** = motores de F2 (ya implementados).
- **Pipeline Python** = referencia de F2/F4: su `publish.py` (RF-12) es la base del
  adaptador YouTube+TikTok; su `scrape_pipeline.py` (RF-15) es referencia del motor de temas.
- **Runtime desktop** (Fase B Local API) puede alojar el calendario/cola fuera de Next.js.
- **Vendor**: `vendor/everything-claude-code/skills/x-api` (patrón X API v2) y
  `social-publisher` (LinkedIn/Instagram) como referencia de adaptadores futuros.

---

## 4. Fases del roadmap

Cada fase: tareas, criterios de salida (gates npm `typecheck → lint → test → build`),
alternativas con pros/cons. Orden sugerido de ejecución (ajustable por el usuario).

### F1 — Motor de ideas (nuevo)

- **Objetivo**: generar briefs recurrentes sin intervención manual.
- Tareas:
  1. `scripts/topics.py` (o tool `topics` en core): fuentes = RSS (parseRss ya existe),
     searchWeb DuckDuckGo (tendencias), scrape de página de tendencias (reach.readWeb).
  2. Dedupe + priorización (score = novedad × relevancia × canal objetivo).
  3. Brief JSON estandarizado `{tema, canal, formato, tono, ángulo, fuentes}`.
  4. Cola de briefs persistente (SQLite/Prisma) consumible por el Orquestador.
- Criterios: `python scripts/topics.py --dry-run` produce N briefs; tests del parser;
  gates FULL verdes.
- Alternativas: (a) RSS solo (simple, keyless) — pros: cero fricción; cons: sin tendencias
  de plataforma. (b) scrape de tendencias (más data) — pros: alineado a la plataforma;
  cons: más frágil (anti-bot, ver lecciones). (c) manual (briefs escritos a mano) — pros:
  control total; cons: no es "auto". **Recomendado: (a)+(b) con degradación a (a).**

> **F1 implementado 15/08/2026 (iteración 7)**: tool `topics` en
> `packages/core/src/tools/topics.ts` (generateTopicBriefs: RSS + DDG, dedupe bigram,
> score novedad × relevancia de canal, formato/tono/ángulo por canal, briefs JSON;
> registrada como capability `topics` → tool `topics_briefs` en llm.ts; 14 tests) +
> CLI `scripts/topics.py --dry-run` (Python puro sin deps, mismo esquema, fuentes reales
> verificadas). Queda pendiente: cola de briefs persistente (Prisma, tarea 4 de F1).

### F2 — Contenido (completar)

- **Objetivo**: convertir briefs en contenido listo (texto, guion, media).
- Tareas:
  1. Enrutar brief → Redactor (texto/post) o Guionista (guion + storyboard) vía Orquestador.
  2. Multi-idioma: TTS edge-tts (14 idiomas ya soportados) para narración; textos es/ar
     (el pipeline Python ya produce metadatos bilingües es/ar — reutilizar patrón).
  3. OMAG long-form (Project→Shot, ya scaffolding en `omag/project.ts`) para piezas
     mayores de 60s.
- Criterios: 1 brief → 1 paquete de contenido en disco con manifest JSON; tests del
  enrutamiento; gates FULL.
- Alternativas: (a) OMAG completo (ambicioso, ya 218 tests) — pros: coherencia
  multimodal; cons: iteraciones lentas sin GPU. (b) pipeline Python (RF-01..17) como
  generador de video corto premium — pros: probado; cons: requiere claves. (c) solo
  texto+imagen keyless (Pollinations) — pros: gratis e ilimitado; cons: sin video real.

> **F2 tarea 1 implementada 15/08/2026 (iteración 12)**: enrutador en
> `packages/core/src/tools/enrutador.ts` — `redactar(brief)` (Redactor determinista:
> título/intro/cuerpo/cierre/CTA por canal/palabras clave; cita fuentes del brief) +
> `guionizar(brief)` (Guionista determinista: hook ≤3s, 5-7 escenas con cámara del
> vocabulario verificado `MOTIONS`/`normalizeMotion` de prompt/director.ts, narración
> completa, duración 45-60s, estilo por tono) + `enrutarBrief` (9:16→guion; 16:9/1:1→texto)
> + `generarContenido(brief,{dir,dryRun,tipo})` (1 brief → 1 `ContentPackage` +
> `manifest.json` en disco, atómico tmp+rename, idempotente con briefId hash FNV-1a del
> brief; default `.ultraia/content/<briefId>/manifest.json`). Capability `contenido` →
> tool `contenido_generar` en llm.ts (briefJson + dryRun/tipo override). 16 tests.
> Keyless-first: determinista sin LLM; LLM opcional en fase futura sin romper el contrato
> del manifest. Pendiente F2: tareas 2 (multi-idioma es/ar + TTS) y 3 (OMAG long-form 60s+).

### F3 — Presentación unificada (nuevo)

- **Objetivo**: un solo paquete que se adapta a cada canal.
- Tareas:
  1. Schema `PublicationPackage` en core: `{briefId, contenido, media[], captionsByChannel,
     hashtagsByChannel, visualByChannel, horarioSugerido, canales[]}`.
  2. Herramienta `present` en `packages/core/src/tools/`: dado contenido+canal devuelve
     formato (9:16 video / 1:1 imagen / 16:9 blog), caption con hashtags, thumbnail.
  3. Branding kit por marca (paleta + fuente + logo) reutilizando `design`/`branding`.
  4. Subtítulos: patrón SRT del pipeline Python (RF-11) para video.
- Criterios: `present(content, canal)` produce el paquete por canal; tests unitarios;
  gates FULL.
- Alternativas: (a) schema único + tool `present` (modular, testable) — **recomendado**.
  (b) plantillas por canal hardcodeadas (rápido, frágil). (c) delegar todo al Publicador
  vía chat (flexible, no determinista).

> **F3 implementado 15/08/2026 (iteración 8)**: tool `present` en
> `packages/core/src/tools/present.ts` — `PublicationPackage` completo (briefId, tema,
> contenido, media, captions/hashtags/visual/SRT/horario por canal, branding) + helpers
> deterministas (`captionFor`, `hashtagsFor`, `visualFor`, `srtFor` patrón RF-11,
> `brandingFor` kits Dark Obsidian/Neo Violet); capability `present` → tool
> `present_package` en llm.ts; 13 tests. Pendiente: branding kit editable por marca
> (tarea 3 de F3).

### F4 — Distribución + calendario (nuevo)

- **Objetivo**: publicar con cola, calendario y aprobación configurable.
- Tareas:
  1. **Adaptador base** `PublisherAdapter` (interfaz `publish(package): Promise<Result>`)
     + `YouTubeShortsAdapter` y `TikTokAdapter` portados de `publish.py` (RF-12) a TS en
     `packages/core/src/tools/publish/` (o exponer el Python vía Gen-Engine/webhook).
  2. **Cola de publicación**: tabla Prisma `Publication` (package JSON, canal, estado
     DRAFT/APPROVED/PUBLISHED/FAILED, scheduledAt) + endpoints API.
  3. **Aprobación por paquete**: endpoint de aprobar/rechazar; regla por tipo de contenido
     (texto auto; video/imagen requieren aprobación — decisión del usuario).
  4. **Calendario**: cron/intervalo en `start.py` o scheduler del runtime; publica lo
     programado y aprobado.
  5. Canales siguientes (fases posteriores): Meta Graph API (Instagram Reels + Threads —
     requiere app review), X API v2 (patrón en vendor `x-api`), LinkedIn (patrón
     `social-publisher`), **blog propio** (publicar paquete texto/imagen en `/recursos`
     o galería del web).
- Criterios: `publish --dry-run` valida paquete; publicación real en YouTube/TikTok con
  credenciales; cola + aprobación con tests; gates FULL.
- Alternativas: (a) adaptador TS en core (uniforme, testeable con mocks) — **recomendado**.
  (b) llamar `publish.py` por subprocess (reusa código verificado, pero acopla a Python y
  a credenciales del proceso). (c) Gen-Engine expone `/publish` (centraliza, pero mezcla
  generación con distribución).

> **F4 tarea 1 implementada 15/08/2026 (iteración 9)**: `packages/core/src/tools/publish.ts`
> — `PublisherAdapter` (interfaz `publish`/`validate` fail-soft) + `createYouTubeAdapter`
> (upload resumable v3: POST → Location → PUT, categoryId 28, madeForKids false) +
> `createTikTokAdapter` (Direct Post 2 pasos: init → PUT al upload_url, title+hashtags ≤150,
> FILE_UPLOAD 1 chunk) + `buildBilingualMetadata` (título es/ar + tags mixtos, port RF-12) +
> `publishToAll` (corre todos los adapters, agrega resultados por plataforma) +
> `createDefaultPublishers`. Tokens: options o env `YOUTUBE_ACCESS_TOKEN`/`TIKTOK_ACCESS_TOKEN`;
> fetch inyectable (tests con mocks, cero llamadas reales). Capability `publish` → tool
> `publish_submit` en llm.ts (valida tokens primero, fail-soft con razón clara, `toYoutube`/
> `toTiktok` opcionales); 15 tests. Pendiente F4: tarea 2 — cola `Publication` (Prisma) +
> endpoints API + aprobación por paquete (STATE.md #10).

> **F4 tarea 2 implementada 15/08/2026 (iteración 10)**: cola persistente `Publication`
> (Prisma SQLite, migración `add_publication_queue`) + dominio `domain/publications.ts`
> (createPublication con regla de aprobación híbrida: video/imagen → DRAFT requiere
> aprobación; texto/blog → APPROVED automático; approve/reject/markPublished/markFailed/
> publishDue para el calendario; 15 tests con fake db) + endpoints API con auth:
> `GET|POST /api/publications`, `POST /api/publications/[id]/approve|reject|publish`
> (solo DRAFT→aprobación; publish fail-soft sin tokens → FAILED con razón; ADMIN o creador).
> Capability `publications` → tool `publication_queue` en llm.ts (db inyectable vía `opts.db`).
> Pendiente F4: tareas 3-5 — calendario + blog propio + canales siguientes (STATE.md #11).

> **F4 tarea 4 + 5-parcial implementadas 15/08/2026 (iteración 11)**: calendario —
> `POST /api/publications/publish-due` (ADMIN) dispara `publishDue(prisma)` (publica los
> APPROVED con scheduledAt <= now, fail-soft sin tokens → FAILED). Uso: cron externo
> (Task Scheduler / intervalo futuro en start.py). Blog propio — página pública `/blog`
> (server component, `listBlogPosts(prisma)` = PUBLISHED/canal blog, ordenado por
> publishedAt desc, tarjetas Dark Obsidian con tema/caption/contenido/media, revalidate 5min)
> + helper `listBlogPosts` en dominio con 3 tests. Pendiente F4: tarea 5-resto — canales
> siguientes (Meta/X/LinkedIn) y tarea 3-doc — integración del blog con /recursos o galería
> (STATE.md #12/#13 siguen pendientes: F2 enrutamiento y F5 KPIs).

### F5 — Métricas y mejora (nuevo)

- **Objetivo**: cerrar el loop con datos reales.
- Tareas:
  1. KPIs por canal: vistas, engagement, guardados, clicks (según disponibilidad de API;
     YouTube Data API da analytics básicos).
  2. `media_score` (ya existe `ULTRAIA/integracionesImplementacion/media_score.py`) como
     score de calidad pre-publicación.
  3. Feedback post-publicación → `collectImprovementSignals` + pipeline de mejora de
     agentes (ya implementado en `packages/core/src/domain/improve.ts`) → nueva versión
     PENDING del agente Publicador/Redactor → evals de regresión.
- Criterios: dashboard/endpoint de KPIs; al menos 1 caso de mejora real impulsado por
  métricas; gates FULL.
- Alternativas: (a) solo score pre-publicación (media_score) — pros: ya existe; cons: no
  mide resultado real. (b) analytics por API de cada canal — pros: datos reales; cons:
  quotas y permisos. (c) ambos (recomendado).

> **F5 tareas 1-2 + conexión 3 implementadas 15/08/2026 (iteración 13)**: KPIs por canal —
> `tools/metrics.ts` `computeChannelKpis(db)` (publicadas/fallidas/pendientes, tasa de
> éxito, media de mediaScore; agrega sobre Publication) + endpoint `GET
> /api/publications/metrics` (ADMIN). media_score pre-pub — `tools/media-score.ts` port
> determinista de `media_score.py` (`puntuarMedia` 0-25 PASS≥20 para image/audio/video/tts/
> music/director + `puntuarPaquete` 0-100 del PublicationPackage: contenido/caption/
> hashtags/visual/SRT/horario); `createPublication` persiste `mediaScore` (migración
> `add_publication_metrics`). Feedback post-pub — `registrarFeedback(db,id,{rating,
> critique})` (feedbackJson acumulativo) + `publicationSignals(db)` → critiques BAD para el
> pipeline de mejora (improve.ts) + endpoint `POST /api/publications/[id]/feedback`
> (ADMIN/creador). Tool `publication_metrics` (capability `metrics`): kpis + signals.
> 21 tests nuevos. Pendiente F5: analytics reales por API de canal (quota/permisos) y
> promoción automática de agentes impulsada por signals (conectar con proposeImprovement).

### F6 — Escala (futuro)

- **Objetivo**: producción sostenida.
- Tareas: GPU cloud (RunPod/Spheron/Vast, ver `gen-engine/GENENGINE.md` deploy 3 comandos)
  para modelos locales (FLUX.2/ACE-Step/LTX-2.3); multi-marca (un branding kit por
  cliente); más idiomas (edge-tts 14 ya, extensible); providers premium de video
  (Veo 3.1 / Seedance 2.5 vía Gen-Engine — ver `learning/LEARNINGS.md` §tecno).
- Criterios: 1 pod GPU configurado con `/health` local_engine=true; 1 marca adicional
  publicando.

---

## 5. Decisiones abiertas (con opciones)

| # | Decisión | Opciones | Recomendación |
|---|---|---|---|
| D1 | Orden de despliegue de canales | (a) YT+TikTok → blog propio → Meta → X/LinkedIn; (b) YT+TikTok → Meta → X → LinkedIn; (c) todos a la vez | **(a)**: base ya verificada; blog propio sin app review |
| D2 | Cadencia por canal | diaria / semanal / bi-semanal | video 2-3/sem; texto 1/día; blog 1/sem |
| D3 | Nivel de aprobación | (a) todo aprueba; (b) textos auto + video/imagen aprueban (híbrido, **elegido**); (c) todo automático con kill-switch | **(b)** por defecto; por-canal configurable |
| D4 | Costos | keyless todo (lento, sin video real) / híbrido keyless+premium / premium (Veo, Seedance, ElevenLabs) | híbrido: keyless para volumen, premium para hero content |
| D5 | Fuente de temas | RSS / tendencias scrape / manual / mixta | mixta con degradación (F1) |
| D6 | Blog propio | (a) páginas estáticas en `/recursos`+`/gallery` (ya existen); (b) modelo `Post` en Prisma + editor; (c) CMS externo | (a) primero, (b) si crece |
| D7 | Dónde vive la cola | (a) Prisma en web; (b) Local API del runtime desktop (Fase B); (c) cron del pipeline Python | (a) para MVP web; (b) cuando la Shell Desktop esté (Fase D) |
| D8 | Marca/tono por canal | un solo tono / tono por canal / por marca | tono por canal (el Publicador ya lo hace) |

Decidir aquí los cambios y actualizar §4/§6 en consecuencia.

---

## 6. Backlog ejecutable para el loop PIVR

Tareas priorizadas (orden sugerido; se registran en `STATE.md` y se ejecutan vía
`python scripts/loop_piv.py` o en-sesión). Gates por commit: FULL
`typecheck → lint → test → build` (404/404 esperado hoy: core 218 + runtime 186).

| # | Tarea | Scope | Depende de |
|---|---|---|---|
| 6 | **F1**: tool `topics` en core + `scripts/topics.py --dry-run` (RSS + DDG, dedupe, briefs JSON) | packages/core + scripts | — |
| 7 | **F3**: schema `PublicationPackage` + tool `present` (formato por canal, captions/hashtags) | packages/core | 6 |
| 8 | **F4**: `PublisherAdapter` + YT/TikTok en TS (port RF-12) + tests con mocks | packages/core | 7 |
| 9 | **F4**: cola `Publication` (Prisma) + endpoints API + aprobación por paquete | packages/core + apps/web | 8 |
| 10 | **F4**: calendario (intervalo en start.py o scheduler runtime) + blog propio (publicar en /recursos) | scripts + apps/web | 9 |
| 11 | **F2**: enrutamiento brief→Redactor/Guionista vía Orquestador + manifest JSON | packages/core | 6 |
| 12 | **F5**: KPIs + media_score pre-pub + feedback → mejora de agentes | packages/core + scripts | 10 |

Prioridad de ejecución recomendada: 6 → 7 → 8 → 9 (primer ciclo completo publicable en
YT+TikTok con aprobación) → luego 10, 11, 12.

---

## 7. Riesgos y lecciones (verificadas)

- **Quotas**: YouTube Data API (unidades/día) y rate limits de Meta/X — mitigar con
  cola + backoff + `privacy_status` private en pruebas.
- **App review**: Meta (Instagram/Threads) y LinkedIn exigen revisión de app para
  publicar — iniciar temprano si se eligen (D1).
- **Licencias de modelos**: FLUX.2 klein Apache 2.0, ACE-Step MIT, LTX-2.3 Community
  (<$10M ingresos), edge-tts sin redistribución del motor. Respetar en producto comercial.
- **API directa > web search** para datos numéricos (lección del loop de verificación).
- **Tunetank solo matchea queries de una palabra** → fallback al primer token (ya en `content.ts`).
- **PowerShell 5.1**: JSON con comillas en argv se rompe; `Set-Content -Encoding UTF8`
  escribe BOM → usar Write / UTF8 sin BOM para JSON.
- **No correr `npm run build` mientras un dev server corre** (rompe chunks `_next/static`).
- **Laptop sin GPU** (i5-4210M, 8GB RAM, sin NVIDIA): media local requiere GPU cloud;
  keyless-first es la vía garantizada.
- **`node_modules/.vite` stale** puede dar fallos raros de vitest tras editar → limpiar
  antes de diagnosticar.

---

## 8. Referencias

- Diseño OMAG: `AUDIO/VIDEO/IMAGE.md` (visión) · `AUDIO/VIDEO/MVPModify.txt` (long-form)
- Implementación OMAG: `packages/core/src/omag/` (orchestrator, mediafield, timeline,
  memory, generators, critics, tts, sound, audiolibrary, project)
- Gen-Engine: `gen-engine/GENENGINE.md` · `gen-engine/app/main.py`
- Pipeline Python: `ULTRAIA/integracionesImplementacion/README.md` (RF-01..17) ·
  `src/publish.py` (RF-12) · `src/scraper.py` (RF-15) · `webhook_server.py` (RF-13)
- Agentes admin: `packages/core/prisma/seed-data.mjs` (bp-publicador y los 8 agentes)
- Mejora de agentes: `packages/core/src/domain/improve.ts` + `eval.ts` (regresión)
- Herramientas: `packages/core/src/tools/reach.ts`, `content.ts`, `image.ts`,
  `video.ts`, `music.ts`, `stitch.ts`, `skills.ts`
- Runtime desktop: `desktopFase/ARCHITECTURE.md` (Fase B Local API, Fase C adapters)
- Lecciones verificadas: `learning/LEARNINGS.md` · verdades en `learning/truth/`
- Adaptadores futuros (referencia): `vendor/everything-claude-code/skills/x-api/SKILL.md`,
  `vendor/everything-claude-code/skills/social-publisher/SKILL.md`
- Deploy: `DEPLOY.md` (hosting gratuito) · `gen-engine/GENENGINE.md` (GPU cloud)
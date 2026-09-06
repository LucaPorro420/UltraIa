# REPLANTEO ULTRAIA 2026 — Documento maestro

> Iteración 176 (06/09/2026) · Decisión usuario: **producto comercial ya** · Restricción: **$0/mes keyless-first** ·
> Alcance de esta iteración: documento maestro + diagnóstico P0 + higiene (huérfanos eliminados). Implementación por ciclos 177-185 (un fix por run).

## 0. Resumen ejecutivo

1. UltraIa es un monorepo funcional (web Next.js 15 + core con ~140 capabilities + runtime desktop + app móvil Expo + extensión VSCode + Gen-Engine Python) con 2683 tests core + 250 runtime en verde al cierre de iter-175.
2. El problema "localhost/web se rompe a cada rato" tiene causas identificadas (no misteriosas): iconos de marca eliminados de `lucide-react` (ya resuelto en HEAD), servidores `next dev` huérfanos que ocupan el puerto, `.next` corrupto por edición concurrente, y headers `Content-Encoding` manuales inválidos (fix en WIP pendiente de commit).
3. Todo el open-source disponible ya está inventariado (§3): 10 repos en `vendor/`, 12 categorías en `TECH-LIBRARY`, 29 fuentes en `learning/sources`, 33 análisis `RAZONAMIENTO-*`, más providers keyless. Solo 2 piezas siguen sin analizar: `vibe-coding-with-base44` y el resto de `everything-claude-code`.
4. La automatización ya existe (cerebro programado + workflow cloud + AutoPub + heartbeat/vitals + netwatch); lo que falta es **activarla y operarla**, no construirla.
5. El camino comercial $0 es: estabilizar P0 → cerrar WIP LAN → deploy web (Vercel/Cloudflare) + móvil (EAS) + desktop (WebView2) → operar AutoPub en 9 canales → monetizar (SaaS/freemium/API) sin tocar secretos ni auth/payments sin aprobación.
6. Regla de oro de aquí en adelante: un fix por run, staging explícito, gates FULL antes de cada commit de código, jamás push sin aprobación.

## 1. Inventario verificado — qué es UltraIa hoy (06/09/2026)

### 1.1 Monorepo y salud
| Pieza | Estado verificado |
|---|---|
| Raíz `UltraIa`, workspaces npm `apps/*` + `packages/*` | rama `master`, remoto GitHub al día hasta iter-175 |
| `apps/web` Next.js 15.3.3 + React 19.2.3 + Tailwind v4 + Vercel AI SDK 4.1.61 | build 44+ páginas |
| `packages/core` dominio + Prisma SQLite | **2683/2683 tests** (iter-175) |
| `packages/runtime` `@ultraia/runtime` Fases A+B+C | **250/250 tests** |
| `apps/mobile` Expo SDK 57 (6 rutas exportadas) | tsc 0, EAS configurado (dev/preview/prod) |
| `.vscode-extension` agente autónomo v2.0 (tool loop + diagnose) | en WIP local activo |
| `gen-engine/` FastAPI (TTS edge-tts real verificado :8100) | pytest 7/7 (Python 3.12) |
| Gates orden CI | `typecheck → lint → test → build` + `npm run gate` (mata dev servers) + `npm run harness:test` |

### 1.2 Capacidades del core por dominio (~140 tools)
| Dominio | Capabilities (archivo en `packages/core/src/tools/`) | Salida |
|---|---|---|
| Fábrica de contenido (AutoPub F1-F5) | `topics`, `present`, `enrutador` (contenido), `publish` (9 plataformas: YouTube/TikTok/X/IG/Threads/Telegram/Discord/Slack/LinkedIn), `publications` (cola+calendario+aprobación), `metrics` (+analytics reales YT), `media-score`, `growth`, `autopub` | `/blog`, `/metrics`, `Task/run-autopub.ts`, tasks programadas 09:00/14:00/19:00 |
| Media OMAG + procedural | `omag/*` (orquestador, tts edge-tts 14 idiomas, sound sintético, audiolibrary, project long-form, vfx-generator, design-generator), `image` (pollinations/meigen), `music` (Tunetank), `video-edit` (EDL/ffmpeg/self-eval), `vfx`, `codevfx` (+v2), `travel`, `screenflow`, `recordly`, `procvid`, `pngrender`, `geometry`, `generative`, `sdf`, `motion`, `videoqa`, `replica`, `imaging`, `remotion`, `website-clone` | `/studio` Media Hub, `/lab`, `resultTask/` demos reales (MP4 2.0s ffprobe exactos) |
| Conocimiento y memoria | `semantic-memory`, `qdrant-memory` (colección `memoria_experiencial_v2`), `brainpage`, `memory-fs`, `kgraph`, `research` (+firecrawl), `pdfsearch`, `enlaces`, `libros` (115), `reporeview`, `learn-models` | `learning/truth/*.json` (54+ docs), Qdrant local/cloud gratis |
| Sistema autónomo | `harness`, `genesis` (+runner, proposal, CLI `npm run genesis`), `autolearn` (gaps RICE + META-IA), `vitals` + `Task/heartbeat.ts` (latido), `netwatch` (watchdog WiFi), `prioritize`, `evo`/`evolution`, `goal`, `blackboard`, `cerebro` (+`Task/cerebro-cycle.ts`), `agent-loop`, `orchestrator-unified`, `loop-trigger` | Cerebro: tarea Windows cada 120 min + cron cloud cada 4h + manual |
| Plataforma y utilidades | `cloud` (Local/R2 + `/cloud` + CLI `cloud-cli.py` + worker Cloudflare), `vault`, `diagram`, `studio` (+catalog), `designcompose`, `perf-optimizer`, `codequality`, `tech-debt`, `deps`, `security`, `connections-catalog`, `browser-agent`, `chat-bridge`, `sandbox`, `observability`, `release-manager`, `batch-executor`, `model-orchestrator`, `model-memory`, `learning-tracker`, `content-engine`, `g0dm0d3`, `creativo`, `game`, `chaos-game`, `cadgeo`, `geom`, `physics2d`, `calculator`, `reach`, `meigen`, `video`, `web`, `content`, `emailCode`, `smtp`, `reddit`, `pinterest`, `whatsapp`, `zernio` | `/connections`, `/ebooks`, `/editor`, agentes `bp-*` (16 blueprints) |

### 1.3 Automatización que YA existe (activar, no construir)
| Sistema | Disparadores | Comando de activación |
|---|---|---|
| Cerebro (ciclo autónomo) | Tarea Windows `UltraIa-Cerebro` 120 min · workflow `.github/workflows/cerebro.yml` cron 4h · manual | `scripts/cerebro-schedule.ps1` · `npm run cerebro` / `npm run cerebro:plan` |
| AutoPub (fábrica contenido) | Tasks `UltraIA AutoPub 0900/1400/1900` · heartbeat observer dry-run | `scripts/schedule-autopub.ps1` · `npm run autopub -- --dry-run` |
| Latido/vitals | `Task/heartbeat.ts` (exit 0/1/2) | `vite-node Task/heartbeat.ts` (integrar a scheduler) |
| NetWatch (WiFi) | Task `UltraIa-NetWatch` cada 5 min | `scripts/netwatch-schedule.ps1` |
| Génesis (motor ingeniería) | manual/CI | `npm run genesis -- --dry-run` · `--propose` |
| Reporeview (auditor repo→memoria) | manual | `npm run reporeview -- --targets=docs,sources --dry-run` |

### 1.4 Documentos y memoria
- 73 docs en `docs/` (guías $0: `CLOUD-FREE-2026`, `APIS-GRATIS-2026`, `CANALES-CONFIG-2026`, `MOBILE`, `DEPLOY`, `REPOMIX`, `SCREENFLOW`, `GENESIS`, `SERVIDOR-LOCAL-Y-RED` en WIP).
- 33 `RAZONAMIENTO-*` (cada fuente externa analizada antes de portar — seguir el patrón).
- `learning/`: verdad aparte de respuestas, `verify.py`, `LEARNINGS.md` (reglas vinculantes), `ultraia_memory.zip`.
- `TECH-LIBRARY/`: referencia offline por 12 categorías + `RECURSOS.md` (URLs verificadas HTTP 200 el 04/09/2026).

## 2. Diagnóstico P0 — por qué "funciona y se rompe a cada rato"

| # | Causa | Evidencia verificada 06/09/2026 | Estado | Acción |
|---|---|---|---|---|
| D1 | Iconos de marca `lucide-react` (`Linkedin/Slack/Twitter/Youtube`) eliminados upstream | `dev.log`: `Attempted import error ... from '__barrel_optimize__'` en `landing-ecosystem.tsx` | **RESUELTO en HEAD** `031dc75` (usa `Play/Music2/ImageIcon/MessageCircle/AtSign/Briefcase/Rss/Send/Hash`); el log es stale | NO reintroducir brand icons jamás; si se necesita una marca, SVG inline propio |
| D2 | Servidores `next dev` huérfanos ocupando :3000 tras crash | PIDs 5896/16416/8976 vivos con `npm error 4294967295` en log | **RESUELTO iter-176**: terminados quirúrgicamente, 0 restantes | Arrancar solo con `python start.py` (preflight + `--clean` solo mata procesos UltraIa) o `scripts/dev-clean.ps1` |
| D3 | Headers `Content-Encoding: br, gzip` manuales en `next.config.ts` (Next gestiona compresión; rompe assets) | `git diff apps/web/next.config.ts` en WIP | Pendiente commit por su autor (batch LAN) | Backlog 177: verificar + commitear ese hunk con gates FULL |
| D4 | `.next` corrupto por edición concurrente / build con dev corriendo | 5+ precedentes en LEARNINGS | Recurrente | Siempre: matar dev → `Remove-Item .next` → `npm run build` (`npm run gate` lo hace) |
| D5 | `localhost`→`::1` (IPv6) mientras servidores escuchan IPv4 | ciclo 66 | Resuelto en `start.py` (`127.0.0.1` explícito) | No regressar: probes siempre IPv4 |
| D6 | `instrumentation.ts` compilado en edge arrastraba `node:*` | iter-48 (`UnhandledSchemeError`) | Resuelto (`await import` tras `NEXT_RUNTIME==='nodejs'`) | Mantener el patrón en cada import nuevo de core |
| D7 | Imports relativos con extensión `.js` rompen webpack | iter-47 | Resuelto (sin extensión) | Linter mental permanente |
| D8 | `start.py` WIP (`--lan`, `lan_addresses`, `CURRENT_HOST`) + `docs/SERVIDOR-LOCAL-Y-RED.md` + `scripts/permitir-red.ps1` + `landing-motion-atlas.tsx` + `reference-media/` sin commitear | `git status` 06/09 | **WIP local pendiente de verificación** | Backlog 178: gates Python + smoke `--lan` + commit pathspec de ese batch |

Receta de arranque sano (pegar en terminal, en este orden):
```powershell
cd C:\Users\UTEC-5695\Desktop\UltraIa
python start.py --check-connections
python start.py --clean
python start.py
```
Si el build falla raro: cerrar IDEs con watchers, `taskkill /F /IM node.exe` solo si ningún `next dev` ajeno importa, `Remove-Item -Recurse -Force apps/web/.next`, reintentar.

## 3. Inventario open-source — todo lo disponible y su estado

### 3.1 `vendor/` (10 repos, referencia sin .git salvo licencia)
| Repo | Licencia | Estado en UltraIa | Decisión |
|---|---|---|---|
| `ai-website-cloner` | MIT | ✅ capability `website-clone` (iter-175, 18 tests) | Operar; playground en Studio |
| `video-use` (browser-use) | MIT | ✅ principios en `video_edit` (29 tests) | Mantener referencia |
| `LinearAbiltyCastingThreeJS` | MIT | ✅ principios en `codevfx` + v2 (29+29 tests) | Mantener |
| `G0DM0D3` | AGPL-3.0 (solo referencia, nada copiado) | ✅ `g0dm0d3` original (29 tests) | Mantener attribution; no copiar código |
| `openbrowser` | ver repo | ✅ provider `screenshot` en `/api/tools/web` (iter-107) | Requiere `playwright install chromium` en cada máquina |
| `webharvest` | ver repo | ✅ `planWebHarvestArgv` wired en Studio (iter-106) | Requiere `pip install webharvest` para modo local |
| `firecrawl-web-agent` | ver repo | ✅ source `firecrawl` en `research` (fail-soft sin key, iter-107) | Free tier con `FIRECRAWL_API_KEY` |
| `mcp-search` | ver repo | ⚠️ parcial (patrón citado en LEARNINGS; MCPSearch self-host no empaquetado) | Backlog 179: evaluar runner local vs `reach` actual |
| `everything-claude-code` (skills x-api, social-publisher) | ver repo | ⚠️ parcial (X adapter propio iter-32/33; LinkedIn propio iter-49) | Backlog 178: diff contra `social-publisher` para no duplicar |
| `vibe-coding-with-base44` | LICENSE en repo (verificar tipo) | ❌ sin analizar | **Backlog 177**: protocolo enlaces.txt completo |

### 3.2 `TECH-LIBRARY/` (12 categorías, offline, verificada)
01-FRONTEND (Next 15.3.3, React 19.2.3, TS 5.8.2, Tailwind 4.1.4) · 02-BACKEND (AI SDK 4.1.61, zod, node) · 03-DATABASE (Prisma 6.7) · 04-AI-ML (providers, agents) · 05-MOBILE (Expo 57) · 06-ANIMATION-3D (GSAP, three, lottie) · 07-TESTING (vitest, playwright) · 08-INFRASTRUCTURE (workers, docker) · 09-REALTIME (websocket, webrtc) · 10-SECURITY (OWASP, JWT) · 11-DEVOPS (git, npm workspaces, eslint) · 12-TOOLS (repomix) + `RECURSOS.md` (24 videos + docs oficiales + podcasts, todo HTTP 200 el 04/09/2026). Regla: consultar antes de implementar/reparar; proponer PRs que la amplíen solo con URLs verificadas.

### 3.3 Fuentes externas ya portadas (protocolo enlaces.txt cumplido)
`diagram-design`→`diagram` · `video-use`→`video_edit` · `deepseek-harness`→`harness` · `openclaw`→`telegram`+`APIS-GRATIS` · `vidrush+abacus`→`growth` · `higgsfield`→`vfx` · `fable-5`→`memory-fs` · `fundamentos-programacion`→`sdf/videoqa/motion/replica`+`ultraia-request` · `meta-ia`→`autolearn` priorización · `sacd-nasa`→`semantic_memory`+Qdrant · `brain.md`/`mindmux`→`brainpage` · `graphify`→`kgraph` · `genesis-deepseek`→`genesis` · `kage-threejs`→análisis (landing 3D en Watch) · `instagram DcJDsghiJne`→`codevfx` · `recordly`→`recordly` · `game-dev-ai`→`game` · `motor-evolutivo`→`evo` · `midudev/libros`→`libros` · `media-automation`→automation/recorder.
Bloqueadas honestamente (requieren humano): IG `DcL0G4MDiKV` y FB share 807 (login wall), TikTok `@studioeditionoficial` 811 (anti-bot, solo referencia).

### 3.4 Providers keyless $0 (nunca inventar datos si faltan)
Imagen `image.pollinations.ai` · TTS `edge-tts` (14 idiomas, voces `es-MX-DaliaNeural`/`ar-SA-ZariyahNeural`) · Música Tunetank (query de UNA palabra, resto fallback composición) · Búsqueda DuckDuckGo + `r.jina.ai` + Exa opcional · Papers OpenAlex/arXiv · Analytics YouTube Data API v3 gratis con key · Síntesis WAV propia sin ffmpeg · FFmpeg + yt-dlp ya instalados en Windows.

## 4. Brechas y decisiones explícitas
1. `vibe-coding-with-base44` → analizar en 177 (puede aportar starter-kits/prompts al Builder y al modo P-B).
2. `social-publisher` vs adapters propios → auditar en 178; si duplica, documentar y no portar.
3. `mcp-search` self-host vs `reach` → benchmark en 179 (criterio: r@1 en corpus propio, mismo harness que `bench-embeddings`).
4. Kage/landing mundo 3D → decisión de producto pendiente (Watch List; cuesta bundle three.js ya separado en chunk).
5. Gen-Engine E0-E5 (entrenamiento) → requiere GPU cloud (RunPod/Spheron/Vast); NO en laptop (i5/8GB sin NVIDIA). Los adapters degradan por diseño.
6. Stripe/pagos, backend Express ebooks, refresh OAuth YouTube → requieren claves + aprobación humana; fuera de ciclos automáticos.
7. Carpeta `apps/web/public/reference-media/` + `landing-motion-atlas.tsx` (WIP): decidir versionar muestras vs `.gitignore` (los MP4 inflan el repo; sugerencia: LFS o solo pósters + URLs).

## 5. Plan P0–P5
- **P0 estabilidad**: 177 cerrar batch LAN (D3+D8) con gates FULL · 178 auditoría social-publisher + fix SVG `sanitizeSvg` ya hecho (verificar) · 179 benchmark mcp-search.
- **P1 comercial ya**: deploy web Vercel (recomendado Next) + dominio `pages.dev`/custom · `DEPLOY.md` + `CLOUD-FREE-2026` como checklist · EAS preview móvil · launcher WebView2 firmado interno · `/metrics` + AutoPub operando diario · pricing SaaS/freemium/API en `BussinesModel/`.
- **P2 mejora verificable**: vibe-base44 (177b) · `use()` React 19 sistemático · performance budgets (chunks three/vendor ya) · `editor:qa` sweep semanal.
- **P3 nice**: Kage landing 3D por sección · podcast RSS propio · gallery social.
- **P4 deuda**: migraciones `connections`/`annotations` consolidadas · `.ultraia/travel` en `.gitignore` (decidir) · repomix output siempre ignorado.
- **P5 descartable**: Titus (archivado), Mixkit API (no existe), Zapsplat/Adobe Enhance/Jitter (sin API).

## 6. Automatización objetivo (estado deseado operado)
```
Cada día (sin humano): Cerebro planifica → AutoPub genera (es/ar + TTS) → present empaqueta →
cola Publication (video/imagen = DRAFT humano; texto/blog = auto) → publishDue publica →
metrics/feedback → growth playbook → learnings → vitals decide reparar/explotar/optimizar/explorar.
Cada 5 min: NetWatch audita WiFi. Cada hora: heartbeat escribe pulso. Cada push a master: CI verde.
```
Activación mínima esta semana: registrar las 3 tasks Windows (cerebro/autopub/netwatch), verificar primer ciclo `--dry-run` de cada una, revisar `/metrics` el lunes.

## 7. Producto comercial $0 (límites honestos 2026)
- Web: Vercel Hobby (cláusula non-commercial → si hay ingresos, migrar a Cloudflare Pages $0 sin cláusula) · API/DB: Supabase Free (500MB + autopausa 7 días → cron keep-alive) o SQLite local + R2 (10GB) · Jobs: GitHub Actions (cron cerebro) · Móvil: EAS free (iOS store requiere Apple $99/año → Android primero).
- Canales: X free 17 posts/24h por app · Meta Standard Access sin app review para negocio propio · TikTok aprobación humana · YouTube OAuth propio OK · Telegram/Discord/Slack gratis (límites en `CANALES-CONFIG-2026`).
- Monetización: freemium (galería/plantillas) → SaaS (agentes a medida, AutoPub gestionado) → API-as-a-service (capabilities por endpoint). Precios región es/ar en `BussinesModel/`. Sin tocar `auth/` ni `payments/` sin aprobación explícita.

## 8. Reglas operativas (para no romper nunca más)
1. Un fix por run; máx 3 intentos por ítem; luego High Priority.
2. Staging explícito + commit siempre con pathspec; jamás `git add .`, jamás commit sin `git diff --cached` revisado.
3. Gates FULL en orden CI antes de cada commit de código; docs-only con precedente declarado.
4. Matar dev servers antes de build; limpiar `.next` si hay raza; probes a `127.0.0.1`.
5. WIP ajeno: cuarentena `%TEMP%\opencode\wip-quarantine-*` + hash, restaurar byte-exacto; lock ajeno = CEDE.
6. Push/merge/PR solo con aprobación humana. Kill switch `loop-pause-all` por TOKEN ACTIVO.
7. PowerShell 5.1: nunca `Set-Content` en repo (usar Write); JSON por archivo, no por argv; cuidado backticks en run-log.
8. Imports internos sin extensión; nada `node:*` en client/edge; `instrumentation.ts` solo dynamic import tras `NEXT_RUNTIME`.
9. Verdad verificada aparte de respuestas; API directa > websearch para números; fuentes nuevas por protocolo enlaces.txt.
10. Cada ciclo deja evidencia: bitácora [P/I/V/R] + STATE DONE con hash + lección si hubo aprendizaje.

## 9. Roadmap de ciclos propuesto
| Ciclo | Entregable | Gates |
|---|---|---|
| 177 | Analizar `vibe-coding-with-base44` (fuente+RAZONAMIENTO) + cerrar batch LAN D3/D8 | docs + FULL |
| 178 | Auditoría `social-publisher` vs adapters + `permitir-red.ps1` verificado admin | FULL |
| 179 | Benchmark `mcp-search` vs `reach` (mismo harness) + decisión | scoped+FULL |
| 180 | E2E `start.py --lan` real (2 máquinas) + guía SERVIDOR final | smoke real |
| 181 | Deploy staging Vercel + checklist `DEPLOY.md` + fijar dominio | deploy real |
| 182 | Activar 3 tasks Windows + primera semana operada AutoPub (evidencia `/metrics`) | evidencia |
| 183 | `use()` React 19 sistemático + `editor:qa` sweep + perf budgets | FULL |
| 184 | Decisión Kage 3D (sí/no con presupuesto de bundle medido) | medición |
| 185 | Corte comercial v1: pricing + landing oferta + onboarding | revisión humana |

## Anexos
### A. Comandos que siempre funcionan
```powershell
python start.py --check-connections   # diagnóstico
python start.py --clean               # libera puertos UltraIa
python start.py                       # web :3000 + webhooks :8000 + gen-engine :8100
npm run typecheck; npm run lint; npm run test; npm run build   # gates en orden CI
py -3.12 scripts/loop_gate.py --kill --json                    # gates deterministas
py -3.12 scripts/loop_verifier.py .opencode/plans/<plan>.md    # APPROVE/REJECT
npm run harness:test                  # salud del harness
```
### B. Mapa de documentos (leer en este orden)
`DESCRIPCION.md` (qué usa el usuario) → este REPLANTEO (qué somos y a dónde vamos) → `PLAN-ULTRAIA.md` → `docs/AUTO-PUBLICACION.md` → `CLOUD-FREE-2026`/`CANALES-CONFIG-2026`/`APIS-GRATIS-2026`/`MOBILE`/`DEPLOY` → `LOOP.md`+`STATE.md`+`loop-run-log.md` (operación diaria) → `TECH-LIBRARY/INDEX.md` (antes de codificar) → `learning/LEARNINGS.md` (antes de decidir).
### C. Glosario mínimo
PIVR (Plan→Implement→Verificar→Reiniciar) · capability (dominio puro + tool en `llm.ts` + export) · keyless-first (funciona sin claves, degrada elegante) · fail-soft (falla con razón, nunca inventa) · DRAFT/APPROVED (aprobación híbrida) · WIP (trabajo sin commitear) · pathspec (commit solo de rutas listadas) · stale (caché/log viejo que miente).

# Aprendizaje del loop de verificación (UltraIa)

## Resultado final: 26/26 casos resueltos (0 FAIL finales), 54 veredictos registrados

## Dataset (verdad guardada aparte, en `truth/` — NO se usa la respuesta para verificarla)

| Tipo | Casos | Fuente de verdad |
|---|---|---|
| math (6) | math_1..6 | Cálculo determinista en Python (independiente de LLM) |
| live (2) | live_weather_lima, live_fx_usd_pen | Respuesta cruda de API (Open-Meteo, open.er-api.com) |
| hechos gstack (8) | gstack_* | Extraído directo de setup/SKILL.md/README/filesystem |
| hechos web-browse (10) | firecrawl_web_agent, openbrowser, internet_search_mcp, browse_master, mcpsearch, web_rooter, scrapeagent, agent_browser_workspace, web_use, webharvest | Búsqueda web contra GitHub (AI mode de Google inaccesible por anti-bot; recuperado vía websearch y verificado 15/08/2026) |

## Iteraciones reales del loop (mejora → verificar → lograrlo)

1. **live_weather_lima** — Intento 1 (búsqueda web) **FAIL**: la web mezclaba pronóstico con datos actuales (humedad 69% vs 73%, viento 20 vs 4.8 km/h).
   → Mejora: pedir la API exacta (Open-Meteo) en el prompt. Intento 2 **PASS**.
2. **live_fx_usd_pen** — Intento 1 **FAIL**: fecha resumida ("2026-08-13") vs cruda de API.
   → Mejora: pedir `time_last_update_utc` exacto. Intento 2 **PASS**.
3. **gstack_opencode_dir / host_flag** — FAIL iniciales por normalización del verifier (comparaba tipos numéricos).
   → Mejora del verifier: agregar tipo `text` + normalizar `$HOME`→`~`. **PASS** tras corregir truth y verifier.

## Lecciones aprendidas (para prompts futuros)

- **No confiar en respuestas de búsqueda web para datos numéricos live**: las páginas agregan/pronostican; la API es la única fuente verificable. Regla: *"API directa > web search"* para valores medibles.
- **Cuando se pida un dato crudo, especificar el campo exacto** (`time_last_update_utc`, `current.temperature_2m`) para evitar resúmenes del modelo.
- **PowerShell 5.1 rompe JSON con comillas dobles en argv** → escribir archivos de respuesta directamente (Write) en vez de pasar JSON por CLI.
- **El tipo de comparación debe venir de la verdad** (exact/approx/dict/text), no inferirse de la respuesta.
- **Tunetank MCP (música/SFX gratis, sin key)**: `POST https://mcp.tunetank.com` con header `Accept: application/json, text/event-stream` (sin él → 406). Respuesta SSE, no JSON directo. Verificado 14/08/2026.
- **Mixkit**: NO tiene API (`api.mixkit.co` no resuelve). Automatizar parseando la web con readWeb (r.jina.ai) y extrayendo links de descarga directa.
- **Zapsplat/Adobe Enhance/Jitter**: sin API pública automatizable (Zapsplat anti-bot con download points; Adobe sin API; Jitter solo templates). Usar manualmente o alternativas locales (ffmpeg afir para noise).
- **share.google/aimode (AI mode de Google) NO es accesible por HTTP/fetch**: responde con challenge anti-bot (Search Guard, `emsg=SG_REL`) y el contenido queda dentro del JS — recuperar el tema vía `websearch`/`webfetch` de la query embebida en el redirect (parámetro `q=` del HTML) y verificar contra las fuentes oficiales.
- **verify.py exige rutas ABSOLUTAS** para `relative_to(ROOT)`: invocar con `C:\...\learning\responses\<id>\attempt_1.json`, no con `learning\responses\...`.
- **PowerShell 5.1 `Set-Content -Encoding UTF8` escribe BOM** que rompe `json.loads` de Python — usar `[System.IO.File]::WriteAllText(path, content, (New-Object System.Text.UTF8Encoding($false)))` para JSON generado por script.
- **Browsing web por agentes (catálogo verificado 15/08/2026)**: los patrones a reutilizar son browse = search → BM25 → fetch concurrente con fallback (internet-search-mcp), workflow reproducible SERP snapshot + Markdown (agent-browser-workspace), y la regla browser single-threaded (perfil de Chrome compartido). Para self-host keyless: MCPSearch o webharvest. El loop de self-improvement del producto sigue el modelo de scrapeagent (el agente escribe su propio SKILL.md por sitio).

## Armado total de generación de media (14/08/2026) — 6 fases completadas

Pipeline Python perfecto (pollinations keyless, TTS edge-tts 14 idiomas, Ken Burns direccional,
xfade, BGM, director multilingüe; **51 tests**) + Gen-Engine self-hosted (FastAPI, modelos open-weights
FLUX.2 klein / ACE-Step / LTX-2.3 con degradación keyless; **7 tests**) + adaptador multilingüe TS
(detector por script+stopwords, director plan; **11 tests**) + corpus de documentación (**14 casos**) +
integración web TS (**6 tests**) + media_score loop. Repo **120/120** tests, typecheck/lint/build verdes.

### Lecciones de media (verificadas)

- **Imagen keyless Pollinations es el camino libre garantizado**: `https://image.pollinations.ai/prompt/{prompt}?width=&height=&model=flux&nologo=true`. Sin clave, sin límite práctico, hotlinkable. Verificado 14/08/2026.
- **Detección de idioma CJK**: japonés y chino comparten kanji (CJK). Distinguir por **kana** (U+3040–30FF, exclusivo de japonés); el kanji puro solo es chino. Regex de script japonés = solo kana, no CJK completo.
- **esbuild vs node**: `node --experimental-strip-types` y vitest pueden dar resultados distintos si hay caché de transform; limpiar `node_modules/.vite` o usar `--no-cache` antes de descartar un bug real.
- **El Gen-Engine degrada por diseño**: sin GPU ni claves, TODAS las modalidades siguen funcionando (pollinations/edge-tts/storyboard/composición). El "modelo propio" (open-weights) se activa solo en GPU cloud (RunPod/Spheron/Vast). Requisito de robustez: `_HAS_LOCAL = torch.cuda.is_available()`.
- **edge-tts es TTS multilingüe gratis**: 100+ voces (`es-MX-DaliaNeural`, `ar-SA-ZariyahNeural`, `ja-JP-NanamiNeural`...), postproceso loudnorm -16 LUFS + fade 0.4/0.6s.
- **Provider premium (video/música reales) ≠ fake**: los hooks `setVideoProvider`/`setMusicProvider` deben apuntar a `$GEN_ENGINE_URL/generate/...`; sin engine, degraduan a storyboard/composición (documentado).
- **Video LTX-2.3 necesita ~16GB VRAM**; la laptop (i5-4210M, 8GB RAM, Intel HD 4600 sin NVIDIA) NO puede inferir media local → siempre deploy GPU cloud.

```
python learning/scripts/gen_truth_math.py     # regenera verdad math (ya en truth/)
python learning/scripts/gen_truth_live.py     # regenera verdad live desde APIs
python learning/scripts/gen_truth_gstack.py   # regenera verdad gstack desde archivos
# guardar respuesta en learning/responses/<id>/attempt_N.json (answer: ...)
python learning/scripts/verify.py <id> <path_response.json>
python learning/scripts/run_loop.py report    # resumen
python learning/media-corpus/verify_corpus.py --verbose   # valida corpus media (14 casos)
python ULTRAIA/integracionesImplementacion/media_score.py <resultado.json>  # puntua media 0-25
```

## Recursos IA generativa desde cero (14/08/2026) — 8 casos verificados

Extraído del AI mode de Google (`share.google/aimode/85V1fon3WxWeePSAN`) y verificado contra
arXiv + GitHub (8/8 PASS). Fuente de verdad: `learning/truth/truth_ai_gen_resources.json`.
Usar como **encaminamiento** para el roadmap de entrenamiento del Gen-Engine de OMAG:

| Recurso | Qué aporta |
|---|---|
| arXiv 2208.11970 (Unified Diffusion) | Teoría: VDM=VAE markoviano, 3 objetivos (x0/ruido/score), Tweedie |
| arXiv 2006.11239 (DDPM) | Paper fundacional: CIFAR-10 FID 3.17, timesteps 1000, lr 2e-4, EMA 0.995 |
| arXiv 2210.02747 (Flow Matching) | Alternativa moderna a difusión (OT paths): entrenamiento/sampling más rápidos |
| arXiv 2206.00364 (EDM) | Receta: FID 1.79 cond / 35 NFE (18 pasos Heun); NVlabs/edm |
| arXiv 2307.01952 (SDXL) | Latent diffusion: UNet 3x, 2º text encoder, refinement model |
| lucidrains/denoising-diffusion-pytorch | Código principal de entrenamiento (10.7k⭐, MIT); Unet1D para audio |
| karpathy/makemore | Pedagogía "generar de la nada": Bigram→Transformer, CPU, 1 archivo |
| NVlabs/edm | Repo oficial EDM (CC BY-NC-SA 4.0): CIFAR-10 32x32 ~6s/grid |

**Decisiones propuestas**: DDPM+lucidrains = base del Gen-Engine de entrenamiento;
Flow Matching para escalar a video/audio; EDM para sampling eficiente; makemore como
pedagogía para un generador desde cero en CreationsApp/mvp/.

## Recursos tecnológicos verificados (14/08/2026) — 9 casos, 9/9 PASS

Extraído de `integracionTecno.txt` (AI mode de Google `share.google/aimode/I6dSNWjGoPy4g6suJ`),
verificado contra sitios oficiales + GitHub. Fuente de verdad: `learning/truth/truth_tecno_recursos.json`.

| Recurso | URL verificada | Punto clave |
|---|---|---|
| Gemini Omni Video (Veo) | ai.google.dev/gemini-api/docs/video | Gemini Omni Flash (default) + Veo 3.1 (4K, audio nativo, SynthID) |
| CapCut Seedance 2.5 | capcut.com/features/seedance-2-5-for-video-editor | 4K 30s nativo, 50 refs multimodales, R2V, audio sync, 180s beta (31/07/2026) |
| OpenCut | github.com/OpenCut-app/OpenCut | MIT, rewrite Rust (Editor API, MCP server, headless); classic = usable |
| Netflix Titus | netflix.github.io/titus | Apache 2.0, 3M contenedores/semana 2018; repo ARCHIVADO 2022 |
| Spotify Backstage | github.com/backstage/backstage | 34k stars, CNCF Incubation, Software Catalog |
| Databricks AI Dev Kit | github.com/databricks-solutions/ai-dev-kit | installer unificado multi-agente + MCP 40-50 tools; skills vía `databricks aitools install` |
| Awesome AI Dev Tools | github.com/ColinEberhardt/awesome-ai-developer-tools | herramientas AI maduras con detalle y MCP |
| Remotion | github.com/remotion-dev/remotion | 55.7k stars; videos con React; ⚠ licencia propia (<3 empleados gratis) |
| OpenShorts | github.com/mutonby/openshorts | MIT, Docker, largo→9:16 (whisper+PySceneDetect+Gemini+MediaPipe+FFmpeg), MCP+API+CLI |

**Decisiones propuestas**: Veo 3.1/Seedance 2.5 = providers premium de video del Gen-Engine;
OpenShorts = pipeline self-host de clips 9:16 (MIT, usa ffmpeg/yt-dlp ya instalados);
OpenCut headless+MCP = referencia de editor automatizable; Remotion para render React→MP4
(licencia propia: gratis <3 empleados); Backstage = patrón de portal multi-tenant; Titus solo
referencia (archivado); patrón Databricks para distribuir skills/MCP de los agentes admin.

## Estado del testing de gstack

- ✅ 53 skills instaladas (frontmatter `name`+`description` válidos)
- ✅ Runtime root `~/.config/opencode/skills/gstack/` con bin/, browse/dist, design/dist, review/, qa/templates, ETHOS.md
- ✅ Binarios bash (gstack-config, update-check, repo-mode, session-kind) funcionan vía Git Bash
- ✅ browse.exe (98.5 MB) compilado; navegó a example.com, extrajo texto (200 OK), screenshot OK
- ✅ Scripts bash requieren Git Bash (no ejecutables directos en PowerShell)
- ⚠️ Primer arranque de browse tarda >15 s (servidor en frío); reintentar
- ⏭️ Skills opencode se cargan al iniciar sesión — reiniciar opencode para verlas en el listado

## Fable-5 memory filesystem (15/08/2026) — VERIFICADO 28/28

Fuente: enlaces.txt → learning/sources/claude-fable-5-system-prompt.md (system prompt filtrado de Claude Fable 5, Anthropic). Análisis: docs/RAZONAMIENTO-FABLE5.md. Implementación: capability `memory` (tools/memory-fs.ts).

- Memoria estructurada = razonamiento: version guards (ifVersion, hash FNV-1a) + strReplace match único + una ficha por sujeto con aliases es lo que hace la memoria de agente confiable entre sesiones.
- Escritura optimista sin locks: 1 hash + 1 comparación por op; conflicto → error claro con versión actual (releer antes de escribir).
- append sobre ficha inexistente la crea (patrón "primer hecho durable"): el primer hecho del turno se archiva sin esperar confirmación.
- Calibración de claims: una mención = [stated] mencionó X una vez; inferencia ≠ stated (no subir una mención a generalización).
- No archivar: atributos protegidos / info sensible / guardrails de comportamiento (nada de adulación o supresión de crítica).
- PowerShell: al inyectar regex en strings single-quoted, `\\s` queda literal doble-backslash en el archivo → usar Write tool o verificar el archivo escrito (lección recurrente de encoding/escaping en PS 5.1).

## Diagramas editoriales — diagram-design (17/08/2026) — VERIFICADO 22/22

Fuente: enlaces.txt -> learning/sources/diagram-design.md (README cathrynlavery/diagram-design, MIT).
Analisis: docs/RAZONAMIENTO-DIAGRAM-DESIGN.md. Implementacion: capability diagram (tools/diagram.ts) + Task/generate-diagrams.ts -> resultTask/diagrams/ + docs/diagrams/.

- Reglas anti-AI-slop GEOMETRICAS: coords/gaps divisibles por 4, hairlines 1px, sin sombras, border-radius <=10px, accent solo en 1-2 focos — hacen el output "editorial" y son TESTEABLES (determinismo byte-a-byte).
- A11y por defecto: role="img" + aria-labelledby resolviendo + title/desc primeros hijos; IDs prefijados por diagrama (inline multiple seguro).
- Autocontenido: 1 HTML offline, sin <script>, sin recursos externos (el xmlns w3.org es obligatorio en SVG — no testear contra 'http://' global).
- El patron "tokens semanticos paper/ink/muted/accent" = mismo patron de capability que ya usa UltraIa (tools por capability en ai/llm.ts).
- CSS: el nombre de clase editorial-card SIEMPRE esta en <style> aunque no se use — aserciones deben apuntar al ELEMENTO (<aside class=...>), no al string.

## Video editing — video-use (17/08/2026) — VERIFICADO 29/29

Fuente: enlaces.txt -> learning/sources/video-use.md + video-use-SKILL.md (browser-use/video-use, MIT). Referencia: vendor/video-use/ (clon sin .git). Analisis: docs/RAZONAMIENTO-VIDEO-USE.md. Implementacion: capability video_edit (tools/video-edit.ts) + Task/video-edit-demo.ts -> resultTask/edl/.

- Superficie compacta para razonar: takes_packed (~12KB, frases [start-end] + speaker) > JSON crudo de transcripcion (10x tokens) — mismo principio que la verdad comprimida de learning/ y los briefs de topics.
- Audio-first: candidatos de corte desde fronteras de palabra/silencios; timeline visual = zoom on-demand, nunca escaner.
- 12 hard rules de PRODUCCION (no gusto): fades 30ms por frontera (anti-pops), extract por segmento + concat -c copy (evita doble re-encode), subtitulos/overlays LAST, silencios >=400ms limpios / <150ms inseguros, padding 30-200ms, self-eval max 3 ciclos.
- Self-eval determinista = el eslabon que convierte un generador en pipeline verificable (DURATION_MISMATCH/UNSAFE_CUT/UNSAFE_GAP + score 0-100) — mismo patron que critics.ts en OMAG.
- Keyless-first: transcribir con provider configurable (Gemini si GOOGLE_API_KEY; degradar a captions manuales) — NUNCA inventar timestamps.
- PS 5.1 leccion REAFIRMADA (fallo real este ciclo): Get-Content + -replace + Set-Content en un .ts UTF-8 colapso el archivo a 1 linea y corrompio la codificacion (mojibake â€") — SIEMPRE usar la tool Write para archivos, jamas Set-Content. Nunca mezclar edit + bash en el MISMO bloque paralelo sobre el MISMO archivo (carrera: el disco termino con un identificador que nunca escribi).

## ScreenFlow — grabacion automatizada (17/08/2026) — VERIFICADO 22/22

Implementacion: capability screenflow (tools/screenflow.ts) + scripts/screenflow/ (actions.py, schedule.ps1, demo.json) + Task/run_screenflow.ts + docs/SCREENFLOW.md.

- Pipeline en 5 fases: Captura (ffmpeg gdigrab segmentado) -> Acciones (ActionScript declarativo, pyautogui) -> Edicion (capability video_edit) -> Publicacion local (.ultraia/recordings/<run-id>/) -> Continuidad (state.json resume idempotente, retry max 3, fail-soft).
- El dominio puro (zod + argv generation) es TESTEABLE sin ejecutar nada real: ffmpeg/pyautogui nunca corren en unit tests; el runner hace --dry-run para validar el pipeline entero sin efectos.
- Continuidad fail-soft: status running/capturing + attempts<3 -> resume; attempts>=3 -> give-up con error registrado. Mismo patron de resiliencia que el recovery de UltraRuntime.
- Nomenclatura determinista YYYYMMDD-HHMMSS-<slug>-v<N>.mp4 + latest.mp4 = paquete reproducible y ordenable; manifest.json con toolchain + hashes.
- Scheduling portado: schtasks (Windows, HH:mm diario) + cron (Linux) — misma funcion, dos backends, decididos por formato del string.
- z.prettifyError NO existe en zod v3 — usar parsed.error.issues.map(path+message).

## UltraIA Cloud + nube gratis 2026 (17/08/2026) — VERIFICADO 27/27 + FULL 655/655

Implementacion: capability cloud (tools/cloud.ts) + API /api/cloud/* + pagina /cloud + cloudflare/ worker R2 + docs/CLOUD-FREE-2026.md. Commit 046dfcf (17 archivos).

- humanSize: 100 MiB de limite de subida NO es "100 MB" — si divides por 1024 las unidades son binarias (KiB/MiB/GiB/TiB). Unidades decimales solo si divides por 1000. El test que esperaba '100 MiB' destapo la inconsistencia.
- sanitizeFileName: ademas de quitar guiones ANTES de punto (/-+(?=\.)/g) hay que quitar los que quedan DESPUES (\.-+/g): 'x. tar' -> 'x.-tar' sin la segunda regla.
- Los modules del core con `node:*` imports NO pueden ser importados por client components de Next (UnhandledSchemeError de webpack). Si el client solo necesita una util (humanSize), DUPLICARLA localmente en el componente (10 lineas) en vez de crear barriles/bundles especiales — patron ya usado por cloud-client.tsx. Las API routes (server) si pueden importar el modulo completo.
- Sesiones concurrentes sobre el mismo repo = guerra de archivos: la sesion #25 borro/aislo los archivos cloud 5+ veces DURANTE los gates. Mitigacion efectiva: watcher de restauracion en %TEMP% (backup de los archivos de la feature + loop de 2s que los restaura si desaparecen) + correr gates en UNA cadena sin pausas + commit apenas estan verdes. NUNCA git add . en estas condiciones — staging explicito de los 17 archivos exactos.
- .next/types de Next 15 se regenera SOLO en build; si la sesion concurrente lo borra a mitad, tsc falla con TS6053 (include pattern .next/types/**/*.ts apuntando a archivos inexistentes). Fix: borrar .next entero y re-correr (sin .next, el include no matchea nada y no falla).
- Aislamiento de gates entre sesiones (maniobra simetrica): mover los untracked de la OTRA sesion a %TEMP%\opencode\backup-* + git checkout de llm.ts/index.ts sucios, correr gates, RESTAURAR todo al final — las dos sesiones quedan con sus working trees intactos.
- Datos verificados 17/08 (websearch, citados en docs/CLOUD-FREE-2026.md): Meta/IG app review NO requerida para negocio propio (Standard Access, docs updated 2026-06-30); X API v2 Free = 17 posts/24h POR APP (el 1,500/mes era legacy 1.1); Supabase Free auto-pausa tras 7 dias sin actividad; Render Free Postgres expira a los 30 dias; Vercel Hobby tiene clausula "no commercial use"; Cloudflare Workers+D1+R2+Pages = $0 estable sin clausula comercial.

## DeepSeek Harness — port "everything is a plugin" (17/08/2026) — VERIFICADO 19/19

Implementacion: capability harness (tools/harness.ts) + tool harness_manage en llm.ts (runtime PERSISTENTE por sesion de chat) + export en tools/index.ts. Port ORIGINAL de principios (fuente learning/sources/deepseek-harness.md, analisis docs/RAZONAMIENTO-DEEPSEEK-HARNESS.md).

- "No privileged core" es portable a dominio puro: boot() valida TODO el arbol (ids/duplicados/ciclos) ANTES de activar nada; si un plugin falla al activar, rollback fail-soft de los ya activos en orden inverso.
- Efectos reversibles GARANTIZADOS por el runtime: trackear las unsubs de ctx.events.on POR PLUGIN y ejecutarlas en shutdown aunque el plugin no defina deactivate() — la reversibilidad no depende de la disciplina del plugin author.
- Estado compartido con claves NAMESPACED `<pluginId>:<clave>` = cero colisiones entre plugins sin locking; el Map proxy con `as unknown as Map` requiere ANOTAR los parametros de los metodos (TS7006: implicit any) — el cast no da tipos contextuales.
- Scheduler por ticks con reloj inyectable = tests deterministas sin timers reales (mismo patron que el reloj de UltraRuntime).
- LECCION CONCURRENCIA: declarar `let runtime` DENTRO del execute de la tool shadowea la variable del scope del bloque y TS narrowing degenera a 'never' — la declaracion debe vivir en el scope que persiste entre llamadas de la tool (por sesion de chat), no dentro del callback. La sesion concurrente lo movio al lugar correcto mientras esta sesion corria tsc: reconciliar leyendo el archivo ANTES de editar.

## VidRush + Abacus.AI — capability growth (17/08/2026) — VERIFICADO 19/19

Implementacion: capability growth (tools/growth.ts: analyzeChannel / planExperiments / buildPlaybook) + tool growth_plan en llm.ts + export en tools/index.ts. Port ORIGINAL de principios (fuentes learning/sources/vidrush-ai.md + abacus-ai.md, analisis docs/RAZONAMIENTO-VIDRUSH-ABACUS.md).

- Patron convergente de ambas fuentes: perfil de canal -> experimentos de UNA variable -> playbook que compone victorias. Ese es el pendiente F5 de AutoPub (promocion automatica via signals) en dominio puro.
- El playbook de "compounding wins" exige emparejar control/test SECUENCIALMENTE (cada par = un experimento): procesar el par por cada senal duplica el peso; procesar "una vez por variable" pierde las victorias repetidas. `Math.min(controles.length, tests.length)` pares por variable.
- Regla de decision determinista (test > control +5 KPI) es lo que hace el dominio testeable sin red ni LLM; el feedback post-pub (publicationSignals) es el canal natural de senales para buildPlaybook.
- Herramientas de video/IA en enlaces.txt pueden ser SAAS con API cerrada (VidRush: solo web app; Abacus: solo web app) — el port de PRINCIPIOS (dominio puro) es la unica via segura; nunca copiar codigo de un producto cerrado.

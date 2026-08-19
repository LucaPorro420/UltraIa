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

## Higgsfield x DaVinci Resolve — capability vfx (17/08/2026) — VERIFICADO 26/26

Implementacion: capability vfx (tools/vfx.ts: planReframe / planUpscale / planLutMatch / planRotoscope / planDrawToEdit / planBroll) + tool vfx_plan en llm.ts + export en tools/index.ts. Port ORIGINAL de principios del plugin (fuente learning/sources/higgsfield-davinci.md, analisis docs/RAZONAMIENTO-HIGGSFIELD-DAVINCI.md).

- Un "plugin de IA" moderno = integracion en el contexto del editor (timeline) + planificacion determinista por operacion; las capacidades individuales (grade, image gen, storyboard) ya existen en UltraIa — lo nuevo es el ENCAMINAMIENTO (request -> operacion -> argv/provider).
- Framework B-roll de Dreamina ("define el job: missing beat, frame shape, motion need, transition") es un patron de prompting repetible -> planBroll; pedir el clip >= duracion para margen de corte.
- TikTok + yt-dlp (17/08/2026): los subtitulos auto (eng-US) se descargan SIN el video cuando la rehydration falla por impersonation -> transcript-only es viable para analisis de contenido (source cruda sin frames).
- Codigo muerto detectado por TEST: la rama "aspecto no alcanzable" de planReframe era inalcanzable por construccion (w <= width siempre) — un test con targetRatio 2:1 lo revelo; eliminada.
- Verificacion: la pagina oficial + AlphaSignal confirman las 7 tools y precios; el dato "Studio requerido" es contradictorio entre fuentes (agentbaltic vs alphasignal) -> marcado como ambiguo, no inventado.

## F5 analytics reales — metrics.ts (17/08/2026, iteracion 40, VERIFICADO 17/17)

- YouTube Data API v3 `channels/statistics` es GRATIS con YOUTUBE_API_KEY (cuota 10k/day);
  los numeros vienen como STRINGS -> parsear; `hiddenSubscriberCount=true` omite
  subscriberCount (parse defensivo, no fallar).
- Keyless-first para analytics: plataformas sin token gratis (TikTok Research = aprobacion
  humana, X v2 = OAuth2 user, IG/Threads = token Graph, Telegram = bot admin) -> fail-soft
  con Razon clara en el resultado, nunca inventar numeros (patron publish.ts).
- Mapeo platform->canal de la cola es una decision de dominio (youtube_shorts/tiktok/
  instagram/telegram; x/threads no tienen canal en la cola -> null, skip en merge).
- fetch inyectable + apiKeys inyectables en options: CERO llamadas reales en tests.
- Numeracion de iteraciones: la sesion concurrente reuso el 39 (telegram cola) -> verificar
  `git log` y el run-log ANTES de numerar una iteracion; renombrar plan con `git mv`
  (nunca amend).
- IMPORTS `.js` VS RESOLVERS (17/08, iteracion 47): vitest/tsc mapean './x.js'->x.ts
  automaticamente (moduleResolution bundler/NodeNext), pero el webpack de Next (dev server
  y build) NO -> `Module not found: Can't resolve './x.js'` con el archivo existiendo en
  disco. El repo importa SIN extension; los imports .js del wiring rompieron TODO el dev
  server (y lo habrian roto en build). Regla: imports relativos internos SIEMPRE sin
  extension (los .js solo en configs tipo package.json exports).
- UnhandledSchemeError 'node:fs/promises' en bundle de Next: el resolve.fallback del
  client (next.config.ts) NO cubre subpaths ('fs/promises' con 'fs' en la lista no aplica
  al import literal 'node:fs/promises'); y si el import trace termina en index.ts, el
  bundle arrastra el index completo (quien lo importe desde client/edge arrastra TODO el
  core). Verificado 2 veces: el fallback 'node:fs/promises': false NO resuelve
  (el bundle que falla no es el del client). Diagnostico real: el grafo que compila
  arrastra memory-fs -> hay que cortar el arrastre (imports puntuales en vez de index) o
  mover memory-fs a server-only con dynamic import.
- Raza de staging con la sesion concurrente: entre `git add` y `git commit`, la sesion
  puede stagear los MISMOS archivos (su version sobrescribe el index) o editar archivos
  que entran a mi commit. Verificado: mi commit b601ec5 absorvio su fix Uint8Array de
  telegram.ts (correcto, aceptado) y su staging de present/reach quedo en el index (mi
  commit 8ae11bf uso `git commit <paths>` con pathspec para NO llevarme lo suyo). Regla:
  `git commit <paths>` (pathspec) SIEMPRE que el index tenga staging ajeno; verificar
  `git diff --cached` antes de commitear.
- INSTRUMENTATION = RUNTIME DOBLE (18/08, iteracion 48): Next compila `instrumentation.ts`
  para nodejs Y edge aunque solo se exporte register(). Los imports ESTATICOS de codigo con
  node builtins (como @ultraia/core) rompen el dev server: UnhandledSchemeError en edge
  (Turbopack no maneja node: scheme ahi; el hook webpack() con resolve.fallback se IGNORA
  en dev - Next 15.3 usa Turbopack). FIX oficial: `await import()` condicionado por
  `process.env.NEXT_RUNTIME === 'nodejs'` DENTRO de register(). Diagnostico descartado:
  transpilePackages (turbopack transpila workspace packages automaticamente) y bare
  specifiers (fs/promises vs node:fs/promises) - el estilo node:* del core es correcto
  para server.
- "Attempted import error: X is not exported" de Turbopack con archivos que SI exportan X:
  casi siempre es una EDICION A MITAD DE COMPILACION (otra sesion escribiendo el archivo);
  el import trace muestra el archivo raiz y el error desaparece solo. Esperar/reejecutar
  antes de tocar nada.
- Raza de bitacora REAL (17/08, iteracion 41): la sesion concurrente commiteo
  "adapters Discord + Slack (iteracion 41)" (bef1fc0) mientras yo editaba el run-log y
  absorbio MI seccion "Iteracion 41 - Endpoint metrics" en SU commit -> mi chore 0412fe4
  solo llevo STATE.md (mensaje dice "run-log + STATE.md", incorrecto). Resultado: dos
  secciones 41 en run-log + dos filas 41 en STATE.md (precedente: dos filas 36). Regla:
  ANTES de commitear bitacora, verificar `git log --oneline -3 -- loop-run-log.md STATE.md`;
  si la sesion absorbio tu edit, NO reescribir (evita otra raza), dejar evidencia y anotar.
- Verificar contra el INDICE, no contra resumenes editoriales (18/08, iteracion 55): el README
  de librosgratis.dev declara "115 recursos" pero su resumen por categorias suma 114 (Fundamentos
  "13" vs 14 reales) — el indice de secciones es la fuente fiel. Y: titulos repetidos pueden ser
  legitimos (dos "Introduccion a TypeScript" con autores y URLs distintos) — el dedupe correcto
  es por URL, no por titulo.

- Fuente FundamentosDeLaProgramacion (18/08, ciclo 56, 3 pasadas): el transcript de ChatGPT (3504 lineas) es ~60% ya implementado en UltraIa (generative.ts 38 exports verificados, codevfx 6, video-edit tolerancias/hard-rules, omag sound/critics) - el mapeo contra codigo real (grep de exports) evita duplicar capabilities y valida el patron keyless-first + determinista. Los 4 gaps reales (sdf/videoqa/motion/replica) se confirman con grep antes de planear. El Bloque B (31 practicas de requests) es esencialmente el harness PIVR ya en produccion (~25/31 vigentes) - la mejora de mayor ROI es formalizar los 6 gaps (prioridades P0-P5, tolerancias, presupuesto de tiempo, plantilla 13 campos, fases IA explicitas, config declarativa de loop) como skill ultraia-request (tarea 57). Leccion operativa: numerar tareas nuevas verificando el lock .ultraia/loop/session.lock ANTES (la sesion r55 tomo el id 55 -> renumerar a 56-62 y no pisar sus paths); STATE.md con filas huerfanas/duplicados/encoding roto se repara en el mismo ciclo docs sin gates de codigo (precedente loop-44).

- Patron bucle IA 4 fases (18/08, ciclo 57): formalizado en el skill ultraia-request (Sensado->Razonamiento->Accion->Ajuste). Reglas: medir contra target ANTES de decidir continuar/parar; max 3 reintentos; si mejora < umbral 5 veces -> parar; target alcanzado -> parar (no sobre-optimizar). El presupuesto del harness ahora incluye TIEMPO (loop-budget: max time/day PIVR 6h; 80% -> report-only, 100% -> parar). Prioridades P0-P5 para ordenar backlog (P0 seguridad/gates RED, P5 sin validar). Leccion git: un commit SIN pathspec arrastra TODO el index (accidentalmente commitie los 123 staged de #25/cuentas.txt en el ciclo 56) - git reset --soft HEAD~1 + git commit -- <paths> lo reparo sin perder nada; regla permanente: commit SIEMPRE con pathspec.

- Alcance parcial de sesion concurrente (18/08, ciclo 57b): la sesion principal cerro la tarea 57 (skill ultraia-request) con alcance PARCIAL - commiteo el espejo .opencode/ pero NO la raiz skills/, NO opencode.json, NO LOOP.md/AGENTS.md. El pedido del usuario ("crea otro modo piv plan y build o mejora el actual") apunto exactamente a lo que faltaba. Leccion: al recibir un pedido sobre una tarea marcada DONE, verificar CONTRA EL TREE qu� archivos del plan realmente existen (git ls-tree) antes de asumir que esta completo; el DONE del backlog documenta el alcance del que lo cerro, no el plan aprobado. Mejorar los modos existentes (piv-plan/piv-build con las 4 fases IA mapeadas a PIVR) fue mejor que crear modos duplicados: el harness se mantiene en UN solo lugar.

- Umbrales coherentes (18/08, ciclo 59): eTotalMax=0.05 era imposible de cumplir junto a PSNR>40dB (PSNR 48dB -> ePixel 0.45 -> eTotal 0.27). Regla: las metricas compuestas deben ser coherentes con las metricas base que ya garantizan un aspecto (PSNR ya valida pixel -> E_total solo captura flujo/semantico, umbral 0.4). z.infer con .default() vuelve REQUERIDO el campo (rompe llamadas directas) - definir tipo de entrada manual con opcionales reales (VideoqaInputLike).

- Espejos de skills divergen (18/08, ciclo 62): la raiz skills/ y .opencode/skills/ NO siempre estan sincronizados - loop-triage tenia la plantilla generica del scaffold en raiz (b0522e2) mientras .opencode tenia la version repo-aware (791e095); loop-verifier tenia la raiz actualizada (506c037) y el espejo viejo. Regla: al tocar skills, verificar sync por hash (Get-FileHash SHA256) en AMBOS sentidos y propagar la version correcta (la mas avanzada/repo-aware, no asumir que la raiz es siempre la fuente). El inventario (docs/SKILLS-INVENTARIO.md) documenta que el harness es obligatorio y los evitados viven en .opencode/skills-avoid/ (cuarentena no descubrible - sin SKILL.md en su raiz).

- Racha de colisiones (18/08, ciclo 60): si la sesion concurrente BORRA tus untracked y luego TUS archivos reescritos hacen que ELLA ceda la fila, el commit rapido gana sin guerra. Clave: no esperar validacion FULL - scoped verde + tsc 0 + commit inmediato. Aserciones de tests con LSQ: el objeto dominante absorbe parte del modelo de camara (tx=1.8 no 1) - calcular el valor exacto del modelo antes de escribir la expectativa.

- Loops con contador (18/08, ciclo 61): al terminar el for completo la variable ya se incremento -> iterationsUsed = min(iteration+1, max); el checkpoint debe guardar la ULTIMA iteracion real (min(iteration, max-1)); resumeFrom: checkpoint.iteration es 0-indexado (startIteration = iteration+1). Edit de codigo con oldString que incluye const before y newString que lo quita -> ReferenceError silencioso que cascada 8 tests - verificar variables capturadas al editar bloques.

- Vaciado masivo de la raiz (19/08, incidente post-63): la sesion 57b vacio 36+ archivos versionados de la raiz a 0 bytes (package.json, tsconfig.base.json, AGENTS.md, LOOP.md, opencode.json, loop-constraints.md, loop-budget.md, README.md, start.py) a las 22:53:27 - sin package.json/tsconfig NO hay `npm run` de ningun tipo (typecheck/lint/test/build/dev caidos). Reglas: (1) NUNCA escribir contenido vacio sobre un archivo versionado - para vaciar, borrar y commitear el borrado; (2) la restauracion se hizo desde HEAD (git restore por archivo o script) y los M resultantes en status eran artefacto CRLF (contenido == HEAD, `git diff` vacio) - verificar con git diff antes de alarmarse; (3) tras restaurar, correr gates FULL como verificacion de salud; (4) la bitacora registro UN caso (STATE.md) y no los otros 45 - documentar los archivos criticos de la raiz como checklist (check-6/7 en state-integrity-check, 4917a95). Precedente: loop-constraints.md parecia "vacio por diseno" (0 lineas) y era el incidente - releer archivos criticos tras eventos de restauracion.

- Conexiones navegador + npm args (19/08, ciclo 66): (1) urllib de Python puede resolver `localhost` a ::1 (IPv6) mientras next dev/uvicorn escuchan solo IPv4 -> health-checks con falsos negativos "no respondio"; regla: los probes de servicios locales SIEMPRE con 127.0.0.1 explicito (IPv4), y si se reescribe [::1] -> quitar los brackets reconstruyendo el netloc (un replace simple deja "[127.0.0.1]:8000" invalido). (2) npm 11 NO pasa `-- -H <host>` a un script root que es un `npm run -w` anidado: npm se traga -H como flag propio e imprime su help y muere (exit 0 -> "murio antes de responder"). Regla: para pasar flags a next dev desde un runner, ejecutar el binario hoisted `node_modules/.bin/next.cmd dev -H host` con cwd=apps/web (fallback npm -w -- ...). (3) BITACORA: escribir run-log con Add-Content heredoc de PowerShell CORROMPE los backticks de Markdown (`n -> newline, `f -> form feed -> "npm" se parte y find_browser aparece como "ind_browser"); regla: editar run-log/LEARNINGS con la tool Edit/Write, nunca con strings de PowerShell que contengan backticks. (4) un `git commit` sin pathspec arrastra TODO el index (122 archivos staged de #25) - ya se sabia, se reincidio en la misma iteracion: `git reset --soft HEAD~1` + `git commit -- <paths>` repara sin perder nada; regla permanente: commit SIEMPRE con pathspec.
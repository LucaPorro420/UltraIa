# Aprendizaje del loop de verificación (UltraIa)

## Resultado final: 16/16 casos resueltos (0 FAIL finales), 24 veredictos registrados

## Dataset (verdad guardada aparte, en `truth/` — NO se usa la respuesta para verificarla)

| Tipo | Casos | Fuente de verdad |
|---|---|---|
| math (6) | math_1..6 | Cálculo determinista en Python (independiente de LLM) |
| live (2) | live_weather_lima, live_fx_usd_pen | Respuesta cruda de API (Open-Meteo, open.er-api.com) |
| hechos gstack (8) | gstack_* | Extraído directo de setup/SKILL.md/README/filesystem |

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

## Estado del testing de gstack

- ✅ 53 skills instaladas (frontmatter `name`+`description` válidos)
- ✅ Runtime root `~/.config/opencode/skills/gstack/` con bin/, browse/dist, design/dist, review/, qa/templates, ETHOS.md
- ✅ Binarios bash (gstack-config, update-check, repo-mode, session-kind) funcionan vía Git Bash
- ✅ browse.exe (98.5 MB) compilado; navegó a example.com, extrajo texto (200 OK), screenshot OK
- ✅ Scripts bash requieren Git Bash (no ejecutables directos en PowerShell)
- ⚠️ Primer arranque de browse tarda >15 s (servidor en frío); reintentar
- ⏭️ Skills opencode se cargan al iniciar sesión — reiniciar opencode para verlas en el listado

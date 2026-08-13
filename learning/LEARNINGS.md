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

## Cómo re-ejecutar

```
python learning/scripts/gen_truth_math.py     # regenera verdad math (ya en truth/)
python learning/scripts/gen_truth_live.py     # regenera verdad live desde APIs
python learning/scripts/gen_truth_gstack.py   # regenera verdad gstack desde archivos
# guardar respuesta en learning/responses/<id>/attempt_N.json (answer: ...)
python learning/scripts/verify.py <id> <path_response.json>
python learning/scripts/run_loop.py report    # resumen
```

## Estado del testing de gstack

- ✅ 53 skills instaladas (frontmatter `name`+`description` válidos)
- ✅ Runtime root `~/.config/opencode/skills/gstack/` con bin/, browse/dist, design/dist, review/, qa/templates, ETHOS.md
- ✅ Binarios bash (gstack-config, update-check, repo-mode, session-kind) funcionan vía Git Bash
- ✅ browse.exe (98.5 MB) compilado; navegó a example.com, extrajo texto (200 OK), screenshot OK
- ✅ Scripts bash requieren Git Bash (no ejecutables directos en PowerShell)
- ⚠️ Primer arranque de browse tarda >15 s (servidor en frío); reintentar
- ⏭️ Skills opencode se cargan al iniciar sesión — reiniciar opencode para verlas en el listado

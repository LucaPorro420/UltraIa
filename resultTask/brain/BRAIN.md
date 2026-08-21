# BRAIN.md - memoria persistente del proyecto

> Protocolo brain.md (port UltraIa): decisiones, restricciones y razones
> durables en Markdown plano, viajan en git y sobreviven a cada sesion.
> Regla: toda escritura pasa por updateTruth (verdad + timeline en una
> operacion atomica). Nunca editar paginas a mano.

## Indice

- [Dataset (verdad guardada aparte, en `truth/` — NO se usa la respuesta para verificarla)](#leccion-1) (lesson)
- [Diagramas editoriales — diagram-design (17/08/2026) — VERIFICADO 22/22](#leccion-10) (lesson)
- [Iteraciones reales del loop (mejora → verificar → lograrlo)](#leccion-2) (lesson)
- [Lecciones aprendidas (para prompts futuros)](#leccion-3) (lesson)
- [Armado total de generación de media (14/08/2026) — 6 fases completadas](#leccion-4) (lesson)
- [Lecciones de media (verificadas)](#leccion-5) (lesson)
- [Recursos IA generativa desde cero (14/08/2026) — 8 casos verificados](#leccion-6) (lesson)
- [Recursos tecnológicos verificados (14/08/2026) — 9 casos, 9/9 PASS](#leccion-7) (lesson)
- [Estado del testing de gstack](#leccion-8) (lesson)
- [Fable-5 memory filesystem (15/08/2026) — VERIFICADO 28/28](#leccion-9) (lesson)

---

## leccion-1

- **Categoria**: lesson
- **Titulo**: Dataset (verdad guardada aparte, en `truth/` — NO se usa la respuesta para verificarla)

### compiled_truth

| Tipo | Casos | Fuente de verdad | |---|---|---| | math (6) | math_1..6 | Cálculo determinista en Python (independiente de LLM) | | live (2) | live_weather_lima, live_fx_usd_pen | Respuesta cruda de API (Open-Meteo, open.er-api.com) | | hechos gstack (8) | gstack_* | Extraído directo de setup/SKILL.md/README/filesystem | | hechos web-browse (10) | firecrawl_web_agent, openbrowser, internet_search

### timeline
- `2026-08-20` [note] Pagina creada
- `2026-08-20` [evidence] Origen: learning/LEARNINGS.md

---

## leccion-10

- **Categoria**: lesson
- **Titulo**: Diagramas editoriales — diagram-design (17/08/2026) — VERIFICADO 22/22

### compiled_truth

Fuente: enlaces.txt -> learning/sources/diagram-design.md (README cathrynlavery/diagram-design, MIT). Analisis: docs/RAZONAMIENTO-DIAGRAM-DESIGN.md. Implementacion: capability diagram (tools/diagram.ts) + Task/generate-diagrams.ts -> resultTask/diagrams/ + docs/diagrams/. - Reglas anti-AI-slop GEOMETRICAS: coords/gaps divisibles por 4, hairlines 1px, sin sombras, border-radius <=10px, accent solo

### timeline
- `2026-08-20` [note] Pagina creada
- `2026-08-20` [evidence] Origen: learning/LEARNINGS.md

---

## leccion-2

- **Categoria**: lesson
- **Titulo**: Iteraciones reales del loop (mejora → verificar → lograrlo)

### compiled_truth

1. **live_weather_lima** — Intento 1 (búsqueda web) **FAIL**: la web mezclaba pronóstico con datos actuales (humedad 69% vs 73%, viento 20 vs 4.8 km/h). → Mejora: pedir la API exacta (Open-Meteo) en el prompt. Intento 2 **PASS**. 2. **live_fx_usd_pen** — Intento 1 **FAIL**: fecha resumida ("2026-08-13") vs cruda de API. → Mejora: pedir `time_last_update_utc` exacto. Intento 2 **PASS**. 3. **gstack

### timeline
- `2026-08-20` [note] Pagina creada
- `2026-08-20` [evidence] Origen: learning/LEARNINGS.md

---

## leccion-3

- **Categoria**: lesson
- **Titulo**: Lecciones aprendidas (para prompts futuros)

### compiled_truth

- **No confiar en respuestas de búsqueda web para datos numéricos live**: las páginas agregan/pronostican; la API es la única fuente verificable. Regla: *"API directa > web search"* para valores medibles. - **Cuando se pida un dato crudo, especificar el campo exacto** (`time_last_update_utc`, `current.temperature_2m`) para evitar resúmenes del modelo. - **PowerShell 5.1 rompe JSON con comillas dob

### timeline
- `2026-08-20` [note] Pagina creada
- `2026-08-20` [evidence] Origen: learning/LEARNINGS.md

---

## leccion-4

- **Categoria**: lesson
- **Titulo**: Armado total de generación de media (14/08/2026) — 6 fases completadas

### compiled_truth

Pipeline Python perfecto (pollinations keyless, TTS edge-tts 14 idiomas, Ken Burns direccional, xfade, BGM, director multilingüe; **51 tests**) + Gen-Engine self-hosted (FastAPI, modelos open-weights FLUX.2 klein / ACE-Step / LTX-2.3 con degradación keyless; **7 tests**) + adaptador multilingüe TS (detector por script+stopwords, director plan; **11 tests**) + corpus de documentación (**14 casos**)

### timeline
- `2026-08-20` [note] Pagina creada
- `2026-08-20` [evidence] Origen: learning/LEARNINGS.md

---

## leccion-5

- **Categoria**: lesson
- **Titulo**: Lecciones de media (verificadas)

### compiled_truth

- **Imagen keyless Pollinations es el camino libre garantizado**: `https://image.pollinations.ai/prompt/{prompt}?width=&height=&model=flux&nologo=true`. Sin clave, sin límite práctico, hotlinkable. Verificado 14/08/2026. - **Detección de idioma CJK**: japonés y chino comparten kanji (CJK). Distinguir por **kana** (U+3040–30FF, exclusivo de japonés); el kanji puro solo es chino. Regex de script jap

### timeline
- `2026-08-20` [note] Pagina creada
- `2026-08-20` [evidence] Origen: learning/LEARNINGS.md

---

## leccion-6

- **Categoria**: lesson
- **Titulo**: Recursos IA generativa desde cero (14/08/2026) — 8 casos verificados

### compiled_truth

Extraído del AI mode de Google (`share.google/aimode/85V1fon3WxWeePSAN`) y verificado contra arXiv + GitHub (8/8 PASS). Fuente de verdad: `learning/truth/truth_ai_gen_resources.json`. Usar como **encaminamiento** para el roadmap de entrenamiento del Gen-Engine de OMAG: | Recurso | Qué aporta | |---|---| | arXiv 2208.11970 (Unified Diffusion) | Teoría: VDM=VAE markoviano, 3 objetivos (x0/ruido/scor

### timeline
- `2026-08-20` [note] Pagina creada
- `2026-08-20` [evidence] Origen: learning/LEARNINGS.md

---

## leccion-7

- **Categoria**: lesson
- **Titulo**: Recursos tecnológicos verificados (14/08/2026) — 9 casos, 9/9 PASS

### compiled_truth

Extraído de `integracionTecno.txt` (AI mode de Google `share.google/aimode/I6dSNWjGoPy4g6suJ`), verificado contra sitios oficiales + GitHub. Fuente de verdad: `learning/truth/truth_tecno_recursos.json`. | Recurso | URL verificada | Punto clave | |---|---|---| | Gemini Omni Video (Veo) | ai.google.dev/gemini-api/docs/video | Gemini Omni Flash (default) + Veo 3.1 (4K, audio nativo, SynthID) | | CapC

### timeline
- `2026-08-20` [note] Pagina creada
- `2026-08-20` [evidence] Origen: learning/LEARNINGS.md

---

## leccion-8

- **Categoria**: lesson
- **Titulo**: Estado del testing de gstack

### compiled_truth

- ✅ 53 skills instaladas (frontmatter `name`+`description` válidos) - ✅ Runtime root `~/.config/opencode/skills/gstack/` con bin/, browse/dist, design/dist, review/, qa/templates, ETHOS.md - ✅ Binarios bash (gstack-config, update-check, repo-mode, session-kind) funcionan vía Git Bash - ✅ browse.exe (98.5 MB) compilado; navegó a example.com, extrajo texto (200 OK), screenshot OK - ✅ Scripts bash re

### timeline
- `2026-08-20` [note] Pagina creada
- `2026-08-20` [evidence] Origen: learning/LEARNINGS.md

---

## leccion-9

- **Categoria**: lesson
- **Titulo**: Fable-5 memory filesystem (15/08/2026) — VERIFICADO 28/28

### compiled_truth

Fuente: enlaces.txt → learning/sources/claude-fable-5-system-prompt.md (system prompt filtrado de Claude Fable 5, Anthropic). Análisis: docs/RAZONAMIENTO-FABLE5.md. Implementación: capability `memory` (tools/memory-fs.ts). - Memoria estructurada = razonamiento: version guards (ifVersion, hash FNV-1a) + strReplace match único + una ficha por sujeto con aliases es lo que hace la memoria de agente co

### timeline
- `2026-08-20` [note] Pagina creada
- `2026-08-20` [evidence] Origen: learning/LEARNINGS.md

---

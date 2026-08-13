# AI Generative Suite — Pipeline Audiovisual Árabe (ar-SA)

Pipeline end-to-end de IA generativa para producción multimedia en idioma árabe:
**idea → guion JSON → voz (ElevenLabs) → imágenes (DALL-E 3/FLUX) → video (Runway/Fal.ai)**.

## Estructura del proyecto

```
integracionesImplementacion/
├── main.py, graphrag.py, scrape_pipeline.py, ads.py, audiovisual.py, webhook_server.py
├── pipeline_config.json      # configuración del pipeline (v2.0.0)
├── requirements.txt, .env.example, README.md
├── src/                      # código del pipeline (16 módulos)
├── web/                      # SynapseFlow: plataforma web de recursos IA
│   ├── ai_platform_config.json   # datos/CMS del sitio (4 categorías del ZIP)
│   └── App.jsx                   # componente React/Tailwind que consume el JSON
└── reference/                # materiales originales (NO modificados)
    ├── code/                 # scripts Python/Shell fuente (renombrados descriptivos)
    ├── config/               # pipeline_config_v1.json (schema original)
    ├── prompts/              # system_prompt_audiovisual.txt
    └── docs/                 # guías de investigación (.txt, incl. ing → guía publicación)
```

---

## 1. Requisitos del sistema

| Requisito | Descripción | Cumplido por |
| --- | --- | --- |
| Python | >= 3.10 (probado en 3.12) | — |
| Claves API | OpenAI, ElevenLabs, Runway y/o Fal.ai (ver `.env.example`) | `src/config.py` |
| Red | Salida a `api.openai.com`, `api.elevenlabs.io`, `api.dev.runwayml.com`, `queue.fal.run` | — |

## 2. Instalación

```bash
pip install -r requirements.txt
copy .env.example .env      # Windows
# completa las claves API en .env (NUNCA las subas a git)
```

## 3. Uso

```bash
python main.py "Ciudad inteligente en el desierto al atardecer"   # producción
python main.py "Tema..." --dry-run                                 # simulación sin claves
python main.py "Tema..." --steps audio,video                       # pasos selectivos
python main.py "Tema..." --steps assembly --publish                # ensamblar + publicar
python main.py --validate                                          # chequear config + claves
python webhook_server.py                                           # receptor de webhooks (RF-13)

# --- Soluciones high-demand (RF-14..17) ---
python graphrag.py add docs/politicas.txt --title "RRHH"          # indexar docs
python graphrag.py query "¿Cuántos días de vacaciones?"           # RAG con grafo
python scrape_pipeline.py "https://noticia.com/articulo"          # web → Shorts
python ads.py --city "Dubai" --product "café helado"              # anuncio con clima real
python ads.py --stock AAPL --product "iPhone"                     # anuncio con bolsa
python audiovisual.py pista.mp3 --style pulse                     # video con beats (ffmpeg)
```

Artefactos generados en `output/`:

```
output/
├── audio/<title>.mp3            # voz árabe diacritizada (ElevenLabs)
├── images/shot_<N>.png          # frames por shot (DALL-E 3 / FLUX)
├── video/manifest.json          # URLs finales de video + resumen completo
├── video/shot_<N>.mp4           # videos descargados por shot
├── video/subtitles.srt          # subtítulos del guion plano (árabe)
└── assembled/<title>_final.mp4  # MP4 final (video + audio + subtítulos)
```

## 4. Requisitos funcionales grabados (RF)

| ID | Requisito | Módulo |
| --- | --- | --- |
| RF-00 | Toda la configuración vive en `pipeline_config.json`; claves solo en entorno | `src/config.py` |
| RF-01 | El LLM devuelve JSON estricto (title, script_arabic_diacritized, script_arabic_plain, shot_list) | `src/llm.py`, `src/prompts.py` |
| RF-02 | Preprocesamiento árabe antes del TTS: coma árabe (،), espacios tras puntuación | `src/arabic.py` |
| RF-03 | Endpoint LLM compatible OpenAI/DeepSeek/Ollama, `response_format=json_object` | `src/llm.py` |
| RF-04 | ElevenLabs con guion diacritizado + voice_settings desde config | `src/audio.py` |
| RF-05 | Una imagen por shot (DALL-E 3 default, FLUX vía Fal.ai como alternativa) | `src/images.py` |
| RF-06 | Video asíncrono por shot (Runway Gen-3 default, Kling via Fal.ai) | `src/video.py` |
| RF-07 | Polling con backoff lineal 10s→30s, tope 20 intentos, manejo de FAILED/429 | `src/video.py` |
| RF-08 | Manifiesto JSON final con URLs de audio, imágenes y videos | `src/pipeline.py` |
| RF-09 | CLI con `--dry-run`, `--steps`, `--validate` | `main.py` |
| RF-10 | Caché SQLite por hash de prompt (ahorro de créditos API) | `src/cache.py` |
| RF-11 | Ensamblado FFmpeg: concat de shots + SRT + audio (subtítulos árabes quemados) | `src/assembly.py` |
| RF-12 | Publicación YouTube Shorts + TikTok con metadatos bilingües es/ar | `src/publish.py` |
| RF-13 | Servidor Webhook FastAPI (Runway/Fal.ai) como alternativa al polling | `webhook_server.py` |
| RF-14 | GraphRAG: knowledge graph (docs→chunks→entidades→vínculos) + RAG híbrido | `src/knowledge.py`, `graphrag.py` |
| RF-15 | Web-scraping → Shorts: URL → resumen LLM → pipeline completo | `src/scraper.py`, `scrape_pipeline.py` |
| RF-16 | Anuncios en tiempo real: clima (Open-Meteo)/bolsa (Yahoo)/JSON → prompt ad → imagen | `src/ads.py`, `ads.py` |
| RF-17 | Video audio-reactive: BPM/beats (Python puro) + waveform o destellos ffmpeg | `src/audiovisual.py`, `audiovisual.py` |

> **Nota RF-17:** la detección de BPM/beats es 100% Python puro (funciona con
> `.wav` sin ffmpeg); el renderizado del video requiere ffmpeg en el PATH
> (https://www.gyan.dev/ffmpeg/builds/).

## 4b. Web SynapseFlow (plataforma de recursos IA)

`web/` contiene el frontend basado en datos (JSON como CMS local):

- `ai_platform_config.json` — taxonomía del ZIP de recursos IA (4 categorías:
  Fundamentos, Agentes, Orquestadores, Implementación) + paleta de diseño
  (fondo `#0B0F19`, acentos `#3B82F6`/`#10B981`) + conceptos de diseño.
- `App.jsx` — componente React + Tailwind que renderiza hero, tarjetas
  modulares de cada categoría y footer, consumiendo el JSON.

Integración rápida (guía completa en `reference/docs/guia_web_synapseflow.txt`):

```bash
npm create vite@latest mi-plataforma-ia -- --template react
# instala Tailwind CSS y copia web/ai_platform_config.json + web/App.jsx a src/
npm run dev
```

## 5. Arquitectura

```
[Tema/Idea]
   │
   ▼
LLM (OpenAI-compatible) ──► JSON estricto (guion ar diacritizado + shot_list)
   │
   ├──► preprocess_arabic_for_tts ──► ElevenLabs ──► output/audio/<title>.mp3
   │
   └──► por cada shot:
         ├── DALL-E 3 / FLUX ──► output/images/shot_N.png
         └── Runway / Kling ──► polling (backoff) ──► output/video/manifest.json
```

## 6. Extensiones planificadas (backlog)

- [x] Ensamblado final: unir shots + audio en un solo MP4 (ffmpeg)
- [x] Subtítulos: `script_arabic_plain` → archivo `.srt` por shot
- [x] Caché SQLite para evitar costos duplicados
- [x] Publicación automática YouTube Shorts / TikTok (metadatos es/ar)
- [x] GraphRAG (Knowledge Graphs + RAG sobre documentos)
- [x] Web-scraping → Video Shorts automatizado
- [x] Anuncios generativos con datos en tiempo real (clima/bolsa)
- [x] Video audio-reactive sincronizado con la música
- [ ] Diacritización offline vía QCRI Farasa/Tashkeel como fallback si el LLM no tashkeela
- [ ] Modelos LLM nativos árabe: Jais / AceGPT como proveedor alternativo
- [ ] MCP server (FastMCP) exponiendo las 4 herramientas del pipeline
- [ ] Monitoreo de errores (Sentry) + alertas Telegram/Slack

## 7. Referencias del código original reutilizado

| Archivo original (ahora en `reference/`) | Reutilizado en |
| --- | --- |
| `code/preprocess_arabic_tts.py` | `src/arabic.py` (preprocess_arabic_for_tts) |
| `code/poll_runway_task.py` | `src/video.py` (poll_task_status) |
| `code/end_to_end_script.py` | `src/llm.py`, `src/audio.py`, `src/video.py` |
| `code/dalle3_image.py` | `src/images.py` (DALL-E) |
| `config/pipeline_config_v1.json` | `pipeline_config.json` (v2.0.0) |
| `prompts/system_prompt_audiovisual.txt` | `src/prompts.py` (system prompt director) |
| `code/ffmpeg_merge.py` | `src/assembly.py` (merge FFmpeg) |
| `code/sqlite_prompt_cache.py` | `src/cache.py` (caché SQLite) |
| `code/webhook_fastapi.py` | `webhook_server.py` (FastAPI) |
| `code/publish_youtube_tiktok.py` | `src/publish.py` (YouTube/TikTok) |
| `docs/guia_publicacion_youtube_tiktok.txt` (ing) | Documentación de publicación |
| `docs/taxonomia_zip_recursos_ia.txt` + `guia_web_synapseflow.txt` | `web/ai_platform_config.json` + `web/App.jsx` |

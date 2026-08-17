# Plan loop-38 — enlaces.txt línea 811: TikTok @studioeditionoficial

## Contexto
- Protocolo enlaces.txt: descargar fuente cruda → analizar → patrones transferibles →
  `docs/RAZONAMIENTO-<SLUG>.md` → implementar como ciclo PIVR (capability/tool/tests) →
  lecciones en LEARNINGS.md → fuente commiteada en `learning/sources/`.
- URL: https://www.tiktok.com/@studioeditionoficial/video/7650505845884685590
  "Verifica la informacion y adicionalo para hacerlo propio con analisis de funcionamiento".
- Skill `watch` disponible (yt-dlp + ffmpeg instalados; sin Whisper key → keyless frames-only
  si no hay captions nativas). Trabajo fuera del repo en %TEMP%.

## Objetivo
Determinar de qué trata el video, extraer el patrón de funcionamiento, y portarlo a una
capability/tool de packages/core con tests (port ORIGINAL de principios, nada copiado).

## Pasos
1. Descargar + frames + transcripción (watch.py --no-whisper, --detail balanced, cap ~50).
2. Analizar frames/transcript → identificar la herramienta/patrón (probable: edición de
   video/IA en español, canal "Studio Edition").
3. Buscar el repositorio/URL oficial si el video lo muestra (verificación web si aplica).
4. `learning/sources/<slug>.md` (fuente cruda: transcript + notas) + `docs/RAZONAMIENTO-<SLUG>.md`.
5. Implementar capability/tool + tests en packages/core (patrón diagram/video_edit/harness).
6. Gates scoped (vitest + tsc parcial + eslint) + commit staging explícito + bitácora.

## Archivos a tocar
- learning/sources/<slug>.md (nuevo)
- docs/RAZONAMIENTO-<SLUG>.md (nuevo)
- packages/core/src/tools/<tool>.ts + test (nuevo)
- packages/core/src/ai/llm.ts + tools/index.ts SOLO si wiring (¡llm.ts/index.ts los edita la
  sesión concurrente — telegram wiring en curso! → diferir wiring a post-iteración si hay
  conflicto, patrón cloud 7315d4d)
- loop-run-log.md + STATE.md

## Criterios de éxito
- Fuente cruda + análisis + capability con tests verdes (scoped).
- Si el contenido del video no es transferible (ej. tutorial de marketing), documentar el
  análisis y aportar lo accionable (lista de herramientas verificadas).

## Riesgos
- TikTok bloquea descarga sin cookies → fallback: webfetch de la página (HTML con captions
  frecuentemente) + websearch del canal/tema.
- Sesión concurrente activa en publish.ts/llm.ts (telegram wiring) → NO tocar esos archivos;
  si el wiring es necesario, diferir (High Priority) igual que telegram.

## Esfuerzo
- Medio (~1h).
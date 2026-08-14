# OMAG — Audio / Video Long-Form

Especificaciones y guías para la capa audiovisual de UltraIa OMAG.

| Archivo | Contenido |
|---|---|
| `IMAGE.md` | Diseño de generación de imágenes por modalidad |
| `imvidau.txt` / `imvidau2.txt` / `imvidau3.txt` | Diseño audiovisual (v1, v2, v3) |
| `MVPModify.txt` | **Spec long-form OMAG**: `Project → Act → Sequence → Scene → Shot`, `MasterTimeline`, `WorldCheckpoint`, `LongTermMemory`. Objetivo: 10 minutos por generación jerárquica de unidades de 5-10s. |
| `RepositorysGithubAi.txt` / `2` | Lista curada de repos open-source de IA |

## Implementación en el código

`packages/core/src/omag/` implementa el MVP-0.3 base del `MVPModify.txt`:

- `project.ts` — jerarquía `Project/Act/Sequence/Scene/Shot` + `MasterTimeline` + `WorldCheckpoint` + `LongTermMemory` (scaffolding long-form, **no toca el orquestador existente**).
- `tts.ts` — TTS edge-tts keyless (14 idiomas) para la modalidad `audio`.
- `generators.ts` — `AudioGeneratorAdapter` (narración) junto a image/video/music.
- `sound.ts` + `audiolibrary.ts` — síntesis procedimental desde cero y sampler de audio.

## Reglas verificadas (lecciones)

- **Tunetank MCP solo matchea queries de UNA palabra** ("cinematic epic" → `[]`, "cinematic" → hits). `searchMusic`/`searchSfx` y `TunetankMusicProvider` hacen fallback al primer token.
- **TTS edge-tts**: gratis, sin key, devuelve MP3. Usa el WebSocket global de Node 22+ (sin dependencia `ws`).
- **Audio**: normalizar loudness a −14 LUFS (YouTube estándar) y poner la música a ~15-20% de volumen bajo la voz (`amix`).
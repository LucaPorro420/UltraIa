# RAZONAMIENTO — Higgsfield × DaVinci Resolve (plugin IA en el timeline)

Fuente: enlaces.txt línea 811 (TikTok @studioeditionoficial) + verificación web 17/08/2026.
Fuente cruda: `learning/sources/higgsfield-davinci.md`.

## Qué es (verificado)

Higgsfield AI (higgsfield.ai) lanzó un plugin nativo **gratuito** para DaVinci Resolve 19+
con 7 tools de IA que corren DENTRO del timeline (sin exportar/cambiar de app):

| # | Tool | Función | Patrón transferible |
|---|------|---------|---------------------|
| 1 | Generate Video | clip por lenguaje natural (B-roll, cámara) | request builder "beat → frame shape → motion → transition" |
| 2 | Generate Image | text→imagen (covers, fondos) | YA cubierto (pollinations/meigen en image.ts + present thumbnails) |
| 3 | AI LUT Creator | clona un look desde UNA referencia | plan de grade determinista (presets + hints) |
| 4 | Draw to Edit | boceto → video realista animado | prompt builder estilo→motion |
| 5 | Reframe | 16:9 → 9:16 automático siguiendo la acción | crop windows centrados en acción + pan suave |
| 6 | Remove Background | rotoscopia IA 1 clic → alpha en timeline | plan de rotoscopia (keyframes/coste/alpha) |
| 7 | Upscale | 720p→4K/8K | ladder de resolución + argv ffmpeg lanczos |

Modelos: Nano Banana 2 (imágenes), Seedance 2.0 (video). Panel: Workspace → Scripts →
Higgsfield. Inferencia en servidores (créditos; "Unlimited" no aplica al plugin).

## Análisis de funcionamiento → mapeo UltraIa

El valor del plugin no es cada tool: es que **la operación se pide desde el contexto del
timeline** (clip activo) y el resultado vuelve al flujo sin fricción. En UltraIa eso se
traduce en: **planificación determinista keyless de operaciones VFX** (`plan*`) que luego
ejecuta ffmpeg (video_edit ya genera argv) o los providers (Gen-Engine).

### Implementado en este ciclo (capability `vfx`, packages/core/src/tools/vfx.ts)

- `planReframe` — 16:9→9:16 (o ratio arbitrario) con crop windows que siguen centros de
  acción normalizados, padding, límite de pan (lerp cuando el salto excede velocidad máx),
  y argv ffmpeg por segmento (crop → concat, re-encode).
- `planUpscale` — ladder 1080p/1440p/4K/8K (y 2x/4x), factor, argv ffmpeg lanczos, nota
  cuando el factor supera 4x (upscale generativo vs clásico).
- `planLutMatch` — presets de grade (warm-cinematic/neutral-punch/teal-orange/mono/custom,
  mismos nombres que video_edit grade) → hints exposición/contraste/temp/tint/sat + argv
  ffmpeg eq=, nota de 3DL (el match real de referencia requiere CV → se delega).
- `planRotoscope` — coste de keyframes vs full, modo alpha straight/premultiplied,
  pases de limpieza, estimación de minutos (modelo determinista documentado).
- `planDrawToEdit` — boceto→video: clasificador de estilo (lineart/scribble/colored/
  painterly) + motion → prompt compuesto (vocabulario MOTIONS de OMAG).
- `planBroll` — framework Dreamina: missing beat → frame shape → motion need → transition
  → request de clip B-roll (prompt + duración + provider routing).

### Pendiente (fuera de alcance del ciclo)

- Match real de LUT desde imagen de referencia (requiere CV/color analysis — hoy presets).
- Ejecución: los `plan*` producen argv/planes; el render lo hace video_edit/ffmpeg y la
  generación los providers (Gen-Engine). Unión plugin-timeline "sin exports" = futuro
  ScreenFlow/Desktop Fase D.
- Wiring de la tool `vfx_plan` en llm.ts/index.ts (ver High Priority en STATE.md — puede
  chocar con la sesión concurrente en esos archivos).

## Lecciones

- Un "plugin de IA" moderno = **integración en el contexto del editor** + planificación
  determinista por operación; las capacidades individuales ya existen (grade, image gen,
  storyboard). Lo nuevo es el *encaminamiento* (request → operación → argv/provider).
- El framework B-roll de Dreamina ("define el job: beat, frame shape, motion, transition")
  es un patrón de prompting repetible → `planBroll`.
- TikTok + yt-dlp: los subtítulos auto (eng-US) se descargan SIN video cuando falla la
  rehydration (impersonation) → transcript-only es viable para análisis de contenido.
- Verificación: la página oficial + AlphaSignal confirman las 7 tools y precios; el dato
  "Studio requerido" es contradictorio entre fuentes (agentbaltic vs alphasignal) → marcado
  como ambiguo, no inventado.
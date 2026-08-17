# RAZONAMIENTO — video-use (browser-use)

**Fuente**: `https://github.com/browser-use/video-use` (enlaces.txt, línea 5) — MIT.
**Cruda descargada**: `learning/sources/video-use.md` (README) + `learning/sources/video-use-SKILL.md` (SKILL 23KB).
**Referencia local**: `vendor/video-use/` (clon sin `.git`).
**Aplicado**: 17/08/2026 → capability `video_edit` (packTranscript, buildEdl, renderFfmpeg, selfEvalEdl, timelineViewSvg).

## Qué es

Skill de edición de video por conversación para Claude Code: **el modelo nunca ve el
video**, lee un transcript compacto a nivel de frase (`takes_packed.md`, ~12KB) y
consulta composiciones visuales on-demand (`timeline_view.py`: filmstrip + waveform).
Corta por AUDIO (fronteras de palabra y gaps de silencio) y solo entra a lo visual en
puntos de decisión. Render con ffmpeg: extract por segmento → concat lossless →
overlays → subtítulos LAST. Auto-verificación del render en cada corte antes de
entregar (máx 3 ciclos).

## Patrones extraídos (transferibles)

1. **Packed transcript como superficie de razonamiento** — 10x menos tokens que JSON
   crudo, precisión de frontera de palabra sin píxeles. Romper frases en silencio
   ≥0.5s O cambio de speaker.
2. **Audio-first, visual-on-demand** — los candidatos de corte nacen del audio; el
   timeline composite (filmstrip+waveform+labels) es un *zoom*, no un escáner.
3. **Hard rules de producción (12)**: subtítulos LAST; extract por segmento + concat
   `-c copy` (nunca filtergraph de un solo paso → doble re-encode); fades de audio
   30ms en cada frontera (anti-pops); silencios ≥400ms limpios / 150-400ms
   verificables / <150ms inseguros; padding de corte 30-200ms; self-eval en cada
   frontera; razonar audio+video juntos; preservar picos (risas/remates); aire entre
   hablantes 400-600ms; eventos `(laughs)` como beats; transcripción = superficie;
   verificar output propio (ffprobe duración vs EDL).
4. **Grado por segmento durante el extract** (nunca post-concat) — evita re-encode
   doble; presets como *worked examples*, no mandatos.
5. **Correction loop con presupuesto** (máx 3 intentos) — mismo patrón que los
   críticos de OMAG (`MAX_SELF_EVAL_ATTEMPTS`).
6. **Subtítulos con offset de línea de salida** (`output_time = word.start -
   segment_start + segment_offset`) — evita desalineación tras concat.
7. **Easing universal cubic** (nunca linear) para overlays/animation — coherente con
   la regla de motion de UltraIa (`--ease-ultra`).
8. **Hold 1s del frame final + payoff sync** para animaciones sincronizadas con
   narración.

## Mapeo implementado → código UltraIa

| Patrón | Implementación |
|---|---|
| Packed transcript | `packTranscript(segments)` → takes_packed, break en ≥0.5s/cambio speaker |
| Validación de cortes | `buildEdl` (in<out, ≥50ms, overlaps) + `silenceSafety` + `paddingOk` |
| Hard rules 1-6 | `HARD_RULES` (12, documentadas en selfeval.json del demo) |
| fades 30ms + grade por segmento | `renderFfmpeg` → argv ffmpeg (afade in/out d=0.03 + GRADE_FILTERS) |
| Concat lossless | `renderFfmpeg` → `-c copy` + `-movflags +faststart` |
| Self-eval con presupuesto | `selfEvalEdl` (DURATION_MISMATCH/UNSAFE_CUT/UNSAFE_GAP, score 0-100, máx 3) |
| Timeline on-demand | `timelineViewSvg` — SVG editorial Dark Obsidian (a11y, sin JS) |
| Registro de agente | capability `video_edit` → `video_edit_pack/edl/render/selfeval/timeline` en `ai/llm.ts` |
| Demo real | `Task/video-edit-demo.ts` → `resultTask/edl/download-{2,5}-mp4/` (takes_packed, edl.json, render.sh, selfeval.json, timeline.svg) |

## Decidido NO implementar (con razón)

- **Transcripción Whisper/local**: requiere pesos + GPU; UltraIa es keyless-first →
  `transcribe` con provider configurable (Gemini si `GOOGLE_API_KEY`, degradación a
  captions manuales). Nunca inventar timestamps.
- **Overlays animados (PIL/typing effects)**: manim/poster.html requieren deps
  pesadas; la animación de UltraIa vive en three.js/GSAP/Remotion (web). El EDL
  queda listo para overlays futuros vía argv ffmpeg.
- **Copiar helpers Python**: el port es original (attribution header), solo se
  portan *conceptos y reglas*, no código.

## Lecciones aprendidas

- Los 12 hard rules son el activo real del skill; el resto son *worked examples*.
- La superficie de razonamiento compacta (packed transcript) es el mismo principio
  que `learning/` (verdad comprimida) y que los briefs de `topics`.
- El self-eval del EDL es el eslabón que convierte un generador en un pipeline
  verificable — mismo patrón que `critics.ts` en OMAG.

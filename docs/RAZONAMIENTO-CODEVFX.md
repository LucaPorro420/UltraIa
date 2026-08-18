# RAZONAMIENTO-COD EVFX — Elemental Sandbox VFX (Instagram)

**Fuente**: `learning/sources/instagram-elemental-sandbox.md` (enlaces.txt → `https://www.instagram.com/p/DcJDsghiJne/`, post de @menteprompt republicando a **Chiro Visuals**, 140K views; vídeo original: X, 10/08/2026).
**Referencia técnica**: repo `achrefelouafi/LinearAbiltyCastingThreeJS` (MIT) — demo "Elemental Sandbox" de habilidades VFX en Three.js + Vite, shaders GLSL escritos a mano.
**Implementación**: capability `codevfx` → tool `vfx_code` (17/08/2026, Fase 2 de loop-45).

## Qué hace el original

Un sandbox donde el usuario lanza **6 habilidades elementales** (teclas Q/E/R/F/V/X):
fuego, hielo, rayo, meteoro, rayo focalizado y surge de tierra. Sin un solo asset
externo: **sin texturas, sin sprites, sin meshes 3D** — todo es matemática:
- Fragment shaders GLSL hand-written por habilidad (ruido, distancias, senos).
- Partículas procedimentales con física (gravedad, viento, fricción).
- Colorimetría coherente por habilidad (paleta base/acento/energía en el mismo rango HSL).
- Reactividad al input (tecla → intensidad, movimiento → dirección).

## Por qué "se siente real" (principios extraídos)

1. **Cero assets → cero dependencias**: el efecto ES el código. Transferible a cualquier
   runtime (web canvas, WebGL, video) sin pipeline de producción.
2. **Colorimetría primero**: cada habilidad define base/acento/energía dentro de una
   familia HSL coherente; la coherencia (spread de saturación ≤ 35, spread de calor ≤ 1.2)
   es lo que separa VFX "pro" de "AI-slop".
3. **Física creíble**: fuego sube (gravedad negativa), meteoro cae con estela, rayo es
   efímero (life corto), beam no cae. La física ES la personalidad del efecto.
4. **Capas con blend**: core (lighter) + humo/glow (screen/multiply) → profundidad sin 3D.
5. **Perspectiva por parallax**: capas con offsets proporcionales a la profundidad;
   cámara definida por fov/distancia/tilt.
6. **Curvatura**: el sombreado de superficies curvas (luz cerca, sombra lejos) da volumen.
7. **Reactividad**: el efecto responde a input (intensidad escala partículas/vida/velocidad).

## Mapeo implementado

| Principio del original | Implementación en `codevfx` |
|---|---|
| 6 habilidades (Q/E/R/F/V/X) | **9 kinds** (los 6 + void/plasma/frost) con hotkeys Q/W/E/R/F/V/X/C/B |
| Shaders GLSL hand-written | `shaderGlsl` por kind (snippet GLSL real, incluido como referencia comentada en el render) |
| Partículas procedimentales | `planEffect` → `particles {count, life}` escalado por intensidad; física `{gravity, wind, friction}` |
| Colorimetría coherente | `colorimetryAnalyze(hexes)` → HSL + calor + spread + `coherent` + dominante por luminancia |
| Capas con blend | `layers[]` (source-over/lighter/multiply/screen) con opacidad |
| Curvatura | `curvatureShade(hex, curvature, lightDir)` → shadow/highlight/gradient con factor |
| Perspectiva/parallax | `perspectivePlan(layers)` → fov desde distancia + offsets por profundidad |
| Reactividad al input | Render HTML: pointermove → intensity; keydown hotkey → 100 |
| Demo navegable | `renderEffectHtml` → HTML5 canvas autocontenido (sin URLs, sin deps) |

## Entregables

- `packages/core/src/tools/codevfx.ts` — dominio puro determinista (zod-free, sin deps).
- `packages/core/src/tools/codevfx.test.ts` — **29 tests** (planes, colorimetría, curvatura, perspectiva, render).
- Tool `vfx_code` (capability `codevfx`) en `ai/llm.ts` + export en `tools/index.ts`.
- Demo: `node_modules\.bin\vite-node.cmd Task/codevfx-demo.ts` → `resultTask/codevfx/`
  (plans.json, colorimetria.json, curvatura.json, perspectiva.json + `effects/*.html` ×9).
- Docs: `docs/MOBILE.md` (Fase 1) + `docs/RAZONAMIENTO-CODEVFX.md` (este).

## Pendiente

- Integrar con Gen-Engine/OMAG como render backend de efectos (hook del pipeline de video).
- Grading real de video (LUT por paleta) vía `vfx` (planLutMatch) + ffmpeg.
# RAZONAMIENTO — capability `imaging` (kernels de imagen en TS puro)

Fuente: `learning/sources/fundamentos-programacion.md` §A8 (procesamiento de imágenes),
§A9-A11 (optical flow / tracking) y §A22-A24 (comparación y métricas).
Ciclo PIVR 64 · 19/08/2026 · cierra los tres gaps `◑ parcial` que quedaban del Bloque A.

## Por qué esta capability y no otra

Tras los ciclos 56-63 el Bloque A quedó así (ver
`docs/RAZONAMIENTO-FUNDAMENTOS-PROGRAMACION.md`):

- `sdf` (A12-13) ✅, `videoqa` (A20-21) ✅, `motion` (A9-11 *planificación*) ✅, `replica` (A21/26-37) ✅
- **A8 kernels de imagen en TS puro** → seguía en `◑ parcial` ("sin implementación de kernels")
- **A9-A11** → `motion` solo genera el `argv` de un runner Python/OpenCV: **no calcula flujo**
- **A22-A24** → `videoqa` mide sobre buffers 1-D: **sin mapas de error 2D ni SSIM por ventana**

Los tres gaps son **el mismo eslabón que falta**: no había aritmética de imagen 2-D en el
proyecto. Sin ella, `replica` (análisis-por-síntesis) solo puede comparar firmas escalares,
y `videoqa` mide un promedio global que oculta defectos locales. `imaging` es la capa
numérica que faltaba entre `generative` (síntesis) y `videoqa`/`motion` (verificación).

Además es la elección de **menor riesgo de colisión**: dominio puro, sin red, sin claves, sin
deps, un archivo nuevo — con las sesiones concurrentes tocando `llm.ts`/`index.ts` esto
importa (regla de concurrencia de `AGENTS.md`).

## Qué se implementó (`packages/core/src/tools/imaging.ts`)

| Grupo | Funciones | Nota de diseño |
|---|---|---|
| Base | `createImage`, `imageFrom`, `cloneImage`, `fromRgba`, `toGrayBytes`, `toArray` | luminancia BT.709 en `Float64Array`; copia defensiva siempre |
| Muestreo | `sampleAt` (4 modos de borde), `bilinearSample` | `reflect` por defecto: sin artefactos de borde |
| Convolución | `convolve2d`, **`correlate2d`**, `convolveSeparable`, `flipKernel` | ver "lección 1" |
| Kernels | `gaussianKernel1d`, `boxKernel1d`, `kernel2d`, `SOBEL_X/Y`, `PREWITT_X/Y`, `LAPLACIAN4/8`, `SHARPEN`, `EMBOSS` | gaussiana con radio `ceil(3σ)` y suma 1 |
| Filtros | `gaussianBlur`, `boxBlur`, `medianFilter`, `unsharpMask`, `laplacianFilter`, `sobelGradients` | separable donde se puede: O(w·h·k) en vez de O(w·h·k²) |
| Morfología | `erodeImage`, `dilateImage`, `openImage`, `closeImage`, `morphGradient` | mín/máx local sobre grises (alimenta `vfx.planRotoscope`) |
| Tono | `imageStats` (+entropía), `imageHistogram`, `otsuThreshold`, `thresholdImage`, `normalizeImage`, `gammaCorrect`, `equalizeImage` (con `clipLimit`) | Otsu = varianza entre clases |
| Geometría | `cropImage`, `resizeBilinear`, `downsample2`, `gaussianPyramid` | resize alineado a centros de píxel |
| Bordes | `nonMaxSuppression`, `hysteresisThreshold`, `cannyEdges` | umbrales por Otsu si no se dan |
| **Puente `videoqa`** | `absDiffMap`, `squaredDiffMap`, `ssimMap`, `compareImages` | SSIM **local** (Wang et al. 2004) con ventana gaussiana |
| **Puente `motion`** | `lucasKanadeFlow`, `pyramidalFlow`, `warpByOffset`, `medianFlow` | devuelve un `FlowField` que `motion.flowStats`/`decomposeMotion` consumen tal cual |

Wiring: `tools/index.ts` (export + `tools.imaging` + `TOOL_DESCRIPTIONS` + union `Capability`)
y `ai/llm.ts` → tool **`imaging_process`** con 7 acciones
(`filtrar` · `morfologia` · `tono` · `analizar` · `bordes` · `comparar` · `flujo`).

## Lo que esto desbloquea (integraciones reales, no teóricas)

1. **`videoqa` deja de mentir por promedio.** `ssim` global da ~0.98 en un render con un
   bloque corrupto de 4×4 px; `ssimMap` devuelve `min < 0.5` **y la coordenada exacta**
   (`worstAt`). `compareImages` añade `worstQuadrant`, que responde "¿de dónde viene el
   fallo?" sin abrir el vídeo. Reutiliza `videoqa.mse`/`videoqa.psnr` — una sola definición
   de las métricas de píxel en el proyecto.
2. **`motion` pasa de planificar a medir.** `planFlowAnalysis` sigue siendo la vía cuando hay
   OpenCV; `lucasKanadeFlow` da flujo real sin salir de Node, y `pyramidalFlow` resuelve
   desplazamientos mayores que la ventana (probado: 6 px con ventana de 4). El campo entra
   directo en `decomposeMotion` → veredicto cámara vs escena **sin dependencias**.
3. **`replica` cierra el bucle.** `analyze → generate → compare → optimize` ya puede usar
   `compareImages` como función de coste 2-D real en vez de una firma escalar.
4. **`vfx`/`codevfx`/`omag`** ganan primitivas de verdad: `morphGradient` y `cannyEdges` para
   los planes de rotoscopia, `gaussianPyramid` para el ladder de `planUpscale`,
   `imageStats.entropy` como señal de detalle para `media-score`.

## Lecciones (→ LEARNINGS.md)

- **L1 — Convolución ≠ correlación, y el signo del gradiente depende de eso.** `convolve2d`
  voltea el kernel (definición matemática). Aplicar `SOBEL_X` así devuelve **−∂I/∂x**, lo que
  invertía el signo de todo el flujo óptico (síntoma: desplazamiento de +6 px medido como
  −6.0). Se añadió `correlate2d` (aplica el kernel tal cual, convención de visión por
  computador) y `sobelGradients` la usa. Test de regresión explícito para ambos.
- **L2 — Un guardia por cada caso degenerado en cadenas de umbral automático.** Otsu sobre un
  mapa de magnitud todo-ceros devuelve 0, y la histéresis con `>= 0` marcaba **el 100 %** de
  la imagen como borde. Una imagen plana debe dar `density === 0`: hay test.
- **L3 — En coarse-to-fine, el signo del warp es la mitad del algoritmo.** Para *deshacer* un
  desplazamiento ya estimado hay que muestrear en `x + u`, no en `x − u`. Con el signo malo
  el resultado no explota: converge a un valor plausible pero equivocado (3.63 en vez de 6) —
  el peor tipo de error. Se atrapa con un test de desplazamiento conocido, no revisando código.
- **L4 — El coste de un capability nuevo baja mucho si no colisiona.** 74 símbolos exportados,
  0 colisiones con los 28 módulos que `tools/index.ts` re-exporta con `export *`: se
  verificó por diferencia de conjuntos ANTES de escribir el wiring, en vez de descubrirlo con
  un TS2308 en el build (precedente: `catmullRom` motion↔generative, iteración 63).

## Verificación

- `vitest` scoped: **58/58 PASS** (`imaging.test.ts`), incluido el consumo del campo de flujo
  por `motion.flowStats`/`decomposeMotion` y dos tests de determinismo bit a bit.
- `tsc --noEmit` scoped: **EXIT 0** (imaging + motion + videoqa + réplica del bloque de
  `llm.ts` con los mismos tipos y llamadas).
- Gates FULL (`typecheck → lint → test → build`) **pendientes**: el árbol de trabajo está
  bloqueado por el incidente de archivos vacíos (`docs/INCIDENTE-ARCHIVOS-VACIOS-2026-08-19.md`)
  — sin `package.json` raíz no hay `npm run`. Ejecutar tras `scripts/restore-empty-tracked.ps1 -Apply`.

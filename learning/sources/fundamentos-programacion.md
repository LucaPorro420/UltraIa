# FundamentosDeLaProgramacion — fuente (transcript ChatGPT, 3504 líneas)

URL origen: https://chatgpt.com/share/6a84c8a2-fd50-83e9-b85d-4678d39ae3d9
Archivo local: `FundamentosDeLaProgramcon.txt` (raíz). Resumen fiel por secciones — la fuente
completa queda en el archivo raíz; esto es la versión commiteada para referencia.

## Bloque A — Guía avanzada: sistema de replicación de video a nivel de píxel (37 secciones)

Objetivo: reconstruir un video de referencia como **función matemática de píxeles**
`I(x,y,c,t)`, sin motores (Blender/Unity). Pipeline: `I_ref → Analizar → θ → Renderizar(θ) →
I_gen → Comparar → Error → Optimizar → θ'` (análisis por síntesis).

### A1-A5. Fundamentos y pixel engine
- Stack: C/C++ (memoria), Python (prototipado/visión), Rust, CUDA/OpenCL, Assembly/SIMD.
- Matemáticas: álgebra lineal (vectores, matrices, transformaciones `p'=Tp`, homogéneas),
  geometría analítica (rectas, circunferencias `x=cx+r·cos(θ)`, elipses, Bézier, intersecciones),
  trigonometría (fase, frecuencia, oscilaciones), cálculo (derivadas, integrales, `v(t)=dp/dt`,
  `a(t)=d²p/dt²`).
- Video = "secuencia temporal de matrices": frame RGB = `I_t(y,x,c)`. Framebuffer `w×h×c`
  (1920×1080×4 RGBA). `pixel(x,y)=f(x,y,t)` — la imagen completa es una función matemática.
- Rasterización: geometría → ecuación → test por píxel → RGBA → frame. Construir desde cero:
  líneas, círculos, elipses, polígonos, curvas, máscaras, gradientes, sombras, bordes, blur, composición.

### A6-A8. Shaders y procesamiento de imágenes
- GPU shaders: GLSL, HLSL, SPIR-V, compute shaders — `C(x,y)=f(x,y,t,θ)` en paralelo por píxel.
- Procesamiento digital: filtros (Gaussian/median/Sobel/Prewitt/Laplacian/sharpen/edge),
  morfológicos (erosion/dilation/opening/closing), segmentación (thresholding/color/connected
  components/watershed/clustering), transformaciones (resize/crop/rotation/affine/perspective/warping).
- Visión: extraer del video original no solo imagen sino información: frames → movimiento →
  contornos → color → profundidad → trayectorias → deformaciones → iluminación → modelo matemático.

### A9-A11. Movimiento
- **Optical flow**: `V(x,y,t)=(u,v)` desplazamiento horizontal/vertical por región — más útil que
  detectar objetos para réplica de movimiento. Métodos: Lucas-Kanade (sparse), Farnebäck (denso).
- Tracking: feature/point/contour/optical-flow tracking, template matching, **Kalman filters**,
  particle filters → trayectorias `p_i(t)=(x_i(t),y_i(t))` ajustables con splines.
- Movimiento global (cámara: pan/tilt/zoom/rotación/perspectiva/rolling shutter) vs local
  (deformaciones, articulaciones, partículas). `Motion_observed = Motion_camera + Motion_scene`
  (homografías, affine, fundamental/essential matrix, camera pose, bundle adjustment).

### A12-A13. SDF y ray marching (núcleo procedural)
- Reconstrucción sin objetos 2D/3D: "para cada píxel: distancia al centro → pertenece a
  superficie → iluminación → color". Esfera: `x²+y²+z²=r²`.
- **SDF**: `d(x,y,z)` distancia aproximada a superficie; primitivas sphere()/box()/torus()/capsule();
  combinación: `union=min(dA,dB)`, `intersection=max(dA,dB)`.
- Ray marching: rayo → función de distancia → avanzar → intersección → normal → iluminación → píxel.
- Recursos: Inigo Quilez, "Rendering Worlds with Two Triangles" (Shadertoy), Book of Shaders,
  LearnOpenGL, Vulkan Tutorial, NeRF, OpenCV optical flow, VMAF (Netflix).

### A14-A15. Generación procedural y audio
- Perlin/Simplex noise, fractal noise, cellular noise, wave functions, reaction-diffusion,
  particle systems, procedural textures/geometry → humo, fuego, agua, nubes, partículas, deformaciones.
- Audio como señal: `audio(t)` → FFT → frecuencias → eventos → animación (beat → escala/iluminación/partículas).

### A16-A19. Video I/O y GPU
- FFmpeg programático: codecs, containers, frames, packets, PTS/DTS, FPS, GOP, bitrate, pixel
  formats, chroma subsampling. Renderer → raw RGB frames → FFmpeg → encoder → MP4/MKV/MOV.
- C/C++: OpenCV C++, FFmpeg API (libavcodec/format/filter/swscale/swresample/avutil), SDL, GLFW,
  OpenGL, Vulkan. CUDA: threads/blocks/grids/warps, memoria, streams, CUDA graphs. OpenCL 3.1 portable.

### A20-A25. Comparación, métricas y rendimiento
- Arquitectura: Video → Decoder → (Image Analysis | Motion Analysis | Temporal) → Representación θ →
  (Procedural | Shader/GPU | Numérico) → Frames → Comparator → (Pixel | Structural | Motion error) →
  Optimizer → θ'.
- **Métricas**: MAE, MSE, **PSNR**, **SSIM** (Wang et al.), **VMAF** (libvmaf, Netflix), diferencia
  absoluta + error maps. Error de movimiento: `E_flow = (1/N)Σ‖F_ref − F_gen‖`.
  Compuesta: `E_total = w1·E_pixel + w2·E_structure + w3·E_flow + w4·E_temporal + w5·E_color`, Σw=1.
- Niveles de comparación: píxel (RGB), estructura (edges/contornos/regiones/textura), movimiento
  (`¿se movieron exactamente de la misma manera?` — SSIM excelente puede tener movimiento incorrecto).
- Rendimiento: 1920×1080×60fps = 124M píxeles/s; paralelización (multithreading/SIMD/GPU),
  memoria (cache locality, zero-copy, pinned memory), profiling por etapa (nunca optimizar "a ojo").

### A26-A37. Arquitectura, proyectos y ruta
- EVITAR: Python→OpenCV→Blender→Unity→export. USAR: Python→algoritmos→C++/Rust→CUDA/Vulkan→
  pixel buffer→FFmpeg. PyTorch como motor tensorial+autograd (diferenciable antes de C++).
- Aprendizaje 8 niveles: fundamentos → matemáticas → imagen → CV → graphics → video → GPU → reconstrucción.
- 11 proyectos progresivos: Pixel Engine → Procedural Image → Shader Renderer → Video Procedural →
  Optical Flow Analyzer → Motion Reconstruction → Frame Comparator → **Replica Engine v0.1** →
  Optimización automática (`θ_{n+1}=θ_n−η∇L`) → Replica Engine GPU → **Differentiable Replica Engine**
  (∂L/∂θ vía autograd).
- Investigación: differentiable rendering (surveys 2025), inverse graphics, NeRF/gaussian splatting,
  neural rendering, optimization (Gauss-Newton, Levenberg-Marquardt, Bayesian, evolutionary).
- Estructura repo ReplicaEngine/: apps/{analyzer,renderer,comparator,optimizer}, core/{math,image,
  video,geometry,motion,optimization}, graphics/{opengl,vulkan,shaders,sdf}, gpu/{cuda,opencl},
  vision/{optical_flow,tracking,segmentation,camera}, metrics/{pixel,structural,temporal}.
  Cada run produce: experiment/{reference,generated,difference,optical_flow,parameters.json,
  metrics.json,loss_curve.csv,benchmark.json}.
- Ciclo final: OBSERVAR→REPRESENTAR→RENDERIZAR→COMPARAR→OPTIMIZAR→RENDERIZAR.

## Bloque B — 31 habilidades expertas para crear requests/loops eficientes

1. Define el objetivo final (OBJETIVO/ENTRADA/PROCESAMIENTO/SALIDA/VALIDACIÓN/CONDICIÓN DE ÉXITO).
2. Separa "qué" de "cómo" (OBJETIVO/RESTRICCIONES/MÉTODO PREFERIDO/SALIDA).
3. Contratos de entrada/salida (INPUT/OUTPUT verificable).
4. Criterios de aceptación (SUCCESS IF: compila, ejecuta, genera, pasa tests, métricas > X).
5. Divide tareas grandes en loops pequeños especializados.
6. Una request = una transformación principal (fases separadas).
7. Estados explícitos (STATE: ANALYSIS/IMPLEMENTATION/TESTING/VALIDATION/OPTIMIZATION/COMPLETED).
8. Precondiciones (PRECONDITIONS: si falla → NO CONTINUAR + REPORTAR causa y solución).
9. Condiciones de salida (DONE WHEN: build/tests/benchmark PASS, outputs VALID).
10. Separa diagnóstico de modificación (Request A analiza, B implementa, C valida).
11. Pide evidencia, no afirmaciones (comando, resultado, tests, métricas, archivos, errores).
12. No permitas que el agente suponga (REGLA: no asumir; si falta → detectar, indicar, default solo autorizado).
13. Define prioridades (P0 seguridad → P5 mejoras opcionales).
14. Usa "NO hacer" (restricciones negativas).
15. Pide cambios mínimos (no refactorizar no relacionado).
16. Requests idempotentes (reutilizar/verificar/checksum antes de regenerar).
17. Checkpoints (reanudar desde el último OK, no desde cero).
18. Loops con continue/retry/abort (SUCCESS→CONTINUE, RECOVERABLE→RETRY, INVALID→ABORT, UNKNOWN→PAUSE+REPORT).
19. Limita retries (MAX_RETRIES=3, luego ABORT + diagnóstico).
20. Métricas para detener loops (STOP IF: loss<0.01 OR mejora<0.001×5 OR iteraciones>=100).
21. Tolerancias (|x−y|<ε: POSITION 0.001, COLOR 2/255, MOTION 0.5px).
22. Presupuestos de recursos (MAX_RUNTIME/MEMORY/GPU/RETRIES/OUTPUT; si supera → PAUSE+REPORT+OPTIMIZE).
23. Divide investigación de ejecución.
24. Formatos estructurados (JSON/YAML como lenguaje de instrucciones).
25. Plantilla universal: ROLE/OBJECTIVE/CONTEXT/INPUT/CONSTRAINTS/RESOURCES/PROCESS/VALIDATION/
    SUCCESS CRITERIA/FAILURE POLICY/RETRY POLICY/STOP CONDITIONS.
26. Request → Loop (máquina de estados: VALIDATE→EXECUTE→OBSERVE→COMPARE→DECIDE).
27. Para agentes de programación: ANALYZE→PLAN→IMPLEMENT→TEST→VERIFY→REPORT (PLAN_HASH/IMPL_HASH/TEST_RESULT).
28. "Diff mental" antes de ejecutar (qué archivos cambian, por qué, qué comportamiento, regresiones, qué tests).
29. Evita loops demasiado grandes (un loop = una pregunta).
30. Regla de oro: una request debe producir una decisión verificable (YES/NO, PASS/FAIL).
31. Patrón recomendado: OBSERVAR→PLANEAR→EJECUTAR→MEDIR→COMPARAR→(¿CUMPLE? SÍ→CHECKPOINT/NEXT, NO→AJUSTAR).
    Nivel experto: requests declarativas (OBJETIVO/MÉTRICA/TARGET/RESTRICCIONES/LOOP/STOP/FAILURE).
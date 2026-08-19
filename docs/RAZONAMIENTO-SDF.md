# RAZONAMIENTO — SDF + ray marching (capability `sdf`)

**Fuente**: `learning/sources/fundamentos-programacion.md` §A12-A13 (núcleo procedural,
fundamentos de programación — sección 13 de la fila 57b). **Iteración**: 58 (loop PIVR).
**Commit**: ver bitácora (`loop-run-log.md`).

## Índice de la fuente (secciones relevantes)

| Sección | Contenido |
|---|---|
| A12 | SDF: `d(x,y,z)` = distancia aproximada a una superficie; primitivas `sphere()`, `box()`, `torus()`, `capsule()`; combinación: `union = min(dA, dB)`, `intersection = max(dA, dB)` |
| A13 | Ray marching: rayo → función de distancia → avanzar → intersección → normal → iluminación → píxel; recursos: Inigo Quilez ("Rendering Worlds with Two Triangles", Shadertoy), Book of Shaders, LearnOpenGL, Vulkan Tutorial; visión: NeRF, OpenCV optical flow, VMAF |

## Patrones transferibles

1. **SDF como lenguaje procedural**: un escenario 3D completo se describe como *código* —
   primitivas evaluables (`d(p)`) combinadas por operaciones booleanas sobre distancias
   (min/max). No hay malla ni geometría explícita: la escena ES una función.
2. **Ray marching como render universal**: el mismo `map(p)` sirve para intersección
   (sphere tracing), normal (diferencias centrales) e iluminación — tres usos de UNA
   función de distancia.
3. **Composición algebráica**: smooth union (polynomial, IQ) extiende union con radio de
   fusión `k` — la familia de ops (union/intersection/subtract) cubre el modelado CSG.
4. **Educación procedural**: el patrón "todo es código, sin assets" (idéntico a la
   capability `codevfx`) permite enseñar y prototipar gráficos 3D sin GPU ni dependencias.

## Mapeo implementado

| Fuente | Implementación (`packages/core/src/tools/sdf.ts`) |
|---|---|
| primitivas sphere/box/torus/capsule (+plane) | `sdSphere`/`sdBox`/`sdTorus`/`sdCapsule`/`sdPlane` — fórmulas estándar IQ, dominio público |
| union = min / intersection = max | `opUnion` = `Math.min`, `opIntersection` = `Math.max` |
| subtract (CSG) | `opSubtract` = `Math.max(a, -b)` |
| combinación suave | `opSmoothUnion` (polynomial IQ: `mix(b,a,h) - k·h·(1-h)`, `h = clamp(0.5 + 0.5·(b-a)/k)`) |
| escena = función | `evalSdf(primitives, ops, root, p)` → `{d, material}` — árbol determinista: la primera op que contiene un índice lo produce (excluyendo el padre), el otro target se expande recursivamente; `planSdfScene` normaliza+valida y genera `formula` humana + `glsl` |
| ray marching | `rayMarchPlan` (steps 16-256, epsilon 0.001, maxDist 40, resolución 480×270 16:9, `estOpsPerFrame = w·h·steps·prims`) |
| render por píxel | `renderSdfHtml` — HTML5 canvas 2D autocontenido: rayos por píxel (ImageData), drag rotar, wheel zoom, R reset, GLSL de referencia comentado, Dark Obsidian, a11y |
| recursos externos | GLSL codegen de referencia (`sdfSceneGlsl` con solo las funciones usadas); NeRF/OpenCV/VMAF = difusión futura (gen-engine), fuera de alcance |
| tool de agente | `sdf_render` (acciones `plan`/`glsl`/`ray`/`html`) bajo capability `sdf` + export en `tools/index.ts` |

## Decisiones

- **Canvas 2D + ImageData** (no WebGL/Three.js): consistente con `codevfx` — autocontenido,
  sin URLs, sin `<script src>`, determinista y testeable en Node.
- **Árbol por convención**: los `targets` de las ops referencian índices de primitivas y
  una primitiva puede ser target de varias ops; la evaluación define productor = primera
  op en orden (excluyendo el padre) → cadena `union[0,1] + smooth[1,2]` con root 0 evalúa
  `union(0, smooth(1,2))`. Documentado en el JSDoc de `evalSdf` y replicado EXACTO en el
  JS del render (misma semántica).
- **Material**: la hoja ganadora lleva su índice → colores por primitiva (paleta
  base/accent/energy derivada de los colores de la escena).
- **Bugs encontrados en el ciclo** (corregidos antes de commit): `sdCapsule` calculaba
  `p - (c - a)` en vez de `p - c - a`; el `combine` TS y JS de `subtract` usaba `<=` en
  vez de `>=` (comparación invertida); `describeTree` (fórmula humana) recursaba infinito
  con índices usados — reescrito con el mismo modelo productor/padre que `evalSdf`.
- **Tests**: 31 — matemática de primitivas/ops, árbol (union/subtract/cadena smooth/
  auto-referencia), planSdfScene (defaults, validaciones, clamps, determinismo), codegen
  GLSL, rayMarchPlan y HTML autocontenido (sin URLs externas, a11y, determinismo).

## Pendiente / difusión futura

- Render WebGL real (GPU) como opción del HTML (hoy: software 2D).
- NeRF / optical flow / VMAF: dominio del Gen-Engine (roadmap F5), no del tool.
- Conexión con `video_edit`/`screenflow` para animar cámaras SDF (fly-through) — idea
  anotada en la Watch List.
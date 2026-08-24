# Plan loop-93 — Librerías procedurales: geometry / pngrender / procvid

Fecha: 23/08/2026 · Agente: piv-build (ox-alpha) · Estado: ACTIVO
Sub-agente en conflicto: otra instancia de la MISMA tarea 93 escribe geometry/pngrender/procvid
  + index.ts/llm.ts (WIP ajeno cuarentenado y restaurado byte-exact en
  %TEMP%\opencode\wip-quarantine-20260823). VER ABAJO el entregable `geom`.

## ENTREGABLE COMPLETADO — capability `geom` (23/08, piv-build)

Reemplaza el "geom.ts WIP ajeno" del SPEC por un módulo cohesionado y versionado:
- `packages/core/src/tools/geom.ts` (≈32 KB, 100% código, determinista, keyless, offline, 0 deps).
- `packages/core/src/tools/geom.test.ts` (50 tests PASS).
- Wiring: `packages/core/src/tools/index.ts` (export/import/tools/TOOL_DESCRIPTIONS/Capability)
  + `packages/core/src/ai/llm.ts` (tool `geom_program`, capability `geom`).
- Commits: `2c74084` (librería+tests) y `8de6080` (wiring). 
- Gates FULL (CI order): typecheck root ✅ · lint ✅ · test 1309 PASS (core, --no-cache) ·
  build web ✅ (BUILD_EXIT:0 tras rebuild limpio de .next).
- API: escalares+easings, Vec2/Vec3, Mat3/Mat4 row-major (rotation/translation/lookAt),
  quaternions (axis-angle/multiply/rotate/slerp/toMat4); 2D (polygon/star/spiral/lissajous/
  superellipse/grid/bezier/bbox + render2DSvg role=img); 3D (sphere/torus/box/cylinder/helix/
  parametricSurface + computeNormals + meshToOBJ/STL + projectMeshSvg); timeline sampleTimeline
  + renderGeomHtml (presets 2d/3d, canvas); implícitos SDF `implicitPointCloud(field, opts)`.
- Patrón: reutiliza el de sdf.ts/codevfx.ts. Renombres anti-colisión: `Vec3`→`GeomVec3`
  (omag), `Keyframe`→`GeomKeyframe` (generative). NO importa sdf (puente por parámetro).
Disparador: pedido usuario 23/08 "Inicia a crear librerias para crear objetos imagenes e
videos a partir de programacion basada en matematicas, geometria, logica y demas."
Aprobado en chat (decisiones: 3 capabilities separadas, OBJ + glTF 2.0,
tests puros + demo con render real, maniobra de cuarentena y wirinear hoy).

## SPEC

> **ENMIENDA 23/08 (post-sensado)**: existe `tools/geom.ts` UNTRACKED (WIP ajeno, sin commit,
> sin wiring en HEAD) que ya cubre álgebra Vec/Mat/Quat, formas 2D básicas, esfera/toro/caja/
> cilindro, OBJ/STL y proyección SVG. LEY: intocable y SIN importar. Por tanto `geometry.ts`
> queda REESCOPEADO a lo que geom NO cubre: superfórmula de Gielis (superShape 2D/3D),
> Möbius, ops de malla (transformMesh/mergeMeshes/meshStats) y export glTF 2.0 (+ obj texto
> propio con nombre único). Símbolos únicos (`GeoMesh`, `GeoPoint2`) para evitar TS2308 futuro.
> Se ELIMINA shapesToSvg del alcance (solape con geom.render2DSvg/diagram).

Tres capabilities nuevas en packages/core, dominio puro determinista keyless 0 deps:

1. **geometry** (`tools/geometry.ts`) — geometría constructiva:
   - Vec2 helpers: add/sub/scale/rotate/length/lerp.
   - 2D: regularPolygon, starPolygon, spiral (Arquímedes), bezierCubic (+muestreo),
     lissajous, superShape (superfórmula Gielis m,n1,n2,n3).
   - 3D: parametricSurface(uvFn,uSegs,vSegs) → Mesh{vertices:number[][], faces:number[][]
     (tris)} con triangulación grid; presets sphere/torus/mobius/cone/cylinder/
     superShape3D/helix.
   - Ops: transformMesh(translate/rotateXYZ/scale), mergeMeshes, meshStats(bbox).
   - Export: meshToObj (v/f 1-based, header UltraIa) · meshToGltf (glTF 2.0 JSON,
     buffer base64 float32 LE + indices uint32, accessors POSITION con min/max
     OBLIGATORIOS) · shapesToSvg (SVG autocontenido Dark Obsidian, role=img +
     aria-labelledby, sin JS, IDs prefijados — patrón diagram.ts).

2. **pngrender** (`tools/pngrender.ts`) — imágenes PNG REALES puro TS:
   - crc32 (tabla) + chunk(len+type+data+crc) + encodePng({width,height,rgba}) →
     Uint8Array (IHDR 8-bit RGBA color type 6, IDAT zlib.deflateSync nivel fijo 6 →
     determinismo byte-exact, IEND). encodePng SIN node:* (bundleable).
   - renderImage(spec, pixelFn(x,y)→[r,g,b,a]) + guardas ≤4096×4096.
   - valuesToRgba(Float32Array, paletteName) puente a generative.ts (perlin/simplex/
     mandelbrot existentes → imagen real).
   - Paletas: obsidian, neo-violet, fire, ice + hslToRgb.
   - writePngAtomic(path, bytes) con import dinámico node:fs/promises (patrón cloud).

3. **procvid** (`tools/procvid.ts`) — videos procedurales:
   - Catálogo ANIMATIONS serializable (x,y,t,params)→RGBA: plasma, waves, orbits,
     noise-flow (usa generative.perlinNoise por frame), fractal-zoom (mandelbrot),
     shape-morph (supershape geometry). Params zod por animación.
   - planProcVid(spec{width,height,fps,durationSec,animation,params,outName}) →
     {frameCount, framePattern, ffmpegArgv[], gifArgv[][]} (libx264 crf18 yuv420p
     faststart; dims pares obligatorias; GIF palettegen/paletteuse 2 pasos).
   - renderFrames(spec, outDir) → N PNGs vía pngrender.encodePng.
   - buildRenderScript(plan) → render.sh/steps.txt (patrón screenflow/travel).
   - writeManifest atómico idempotente. Guardas: durationSec≤60, frames≤1800.

## DESIGN

- Estilo repo: header attribution, zod schemas para inputs de tools, funciones puras,
  fetch/fs inyectables o dinámicos, exports namespace (`export const geometry = {...}`).
- Sin colisiones de exports (grep previo; catmullRom ya existe en motion/generative —
  NO re-exportar catmullRom desde geometry; bezier propio con nombre distinto).
- Wiring: capability `geometry`→tool `geometry_build` (acciones shape2d/surface/
  transform/export_obj/export_gltf/svg); capability `pngrender`→`png_render`
  (acciones render/values/palettes); capability `procvid`→`procvid_plan`+
  `procvid_frames` (plan/frames/script). Union Capability + TOOL_DESCRIPTIONS ×3.

## LEARN

- Precedentes aplicados: omag/sound.ts (WAV stdlib puro → aquí PNG zlib), travel/
  video-edit (argv ffmpeg sin ejecutar en tests), cloud.ts (import dinámico node:*),
  brainpage/qdrant (wiring tests ×3), iter-73/78/91 (restauración aditiva hunks).
- glTF spec: accessor POSITION exige min/max; buffer little-endian; índices uint32
  componentType 5125; target 34962/34963.

## TEST

- Scoped: geometry ~25 / pngrender ~20 / procvid ~18 / wiring 9 ≈ 72 tests PASS +
  tsc core 0 + eslint 0 propios.
- FULL en orden CI: typecheck → lint → test → build (dev servers muertos antes;
  recordly.ts/.test.ts en cuarentena durante test; restaurar byte-exact SHA256).
- Demo real (fuera de tests): Task/procedural-demo.ts → resultTask/procedural/:
  4 PNG + torus.obj + sphere.gltf + MP4 480×854@30fps 4s (ffmpeg real) verificado ffprobe.
- PREDICCIÓN: encodePng byte-idéntico entre runs; argv estable; MP4 duración 4.0±0.2s;
  core pasa de ~1254 a ~1317 tests; build 44 págs intactas.

## MEJORAS A ADICIONAR (guardar artefactos)

- resultTask/procedural/{README.md, manifest.json} como catálogo navegable del demo.
- Puente valuesToRgba hace que TODO generative.ts gane salida PNG real sin tocarlo.

## NO-hacer

- NO tocar WIP #92: recordly*, planes loop-92-*, SACD-P*, RoadMapLearning, pdf/,
  Task/poe-extract.py, scripts/iniciar-local.ps1, docs/INICIO-LOCAL-Y-NUBE.md,
  docs/RAZONAMIENTO-RECORDLY.md, learning/sources/recordly-README.md,
  resultTask/poe-demonio/, AGENT.md, start.py, enlaces.txt, DOCS_TODO.md,
  docs/DESPLIEGUE-GRATUITO.md, resultTask/qdrant/*.
- NO commitear MP4/binarios grandes (.ultraia/procedural/ → .gitignore; solo evidencia
  ligera: 2 PNG pequeños + manifests).
- NO ejecutar ffmpeg dentro de tests (solo argv); demo es paso aparte fuera de vitest.
- NO git add . — commit SIEMPRE pathspec explícito.
- NO push (requiere aprobación humana).

## RECURSOS / PRESUPUESTO

- Deps nuevas: CERO (node:zlib built-in). Esfuerzo ≈1 ciclo largo (magnitud iter-64).
- Presupuesto tiempo: gates FULL ~8-12 min; cuarentena/restauración ~10 min.

## TOLERANCIAS

- Tests ±10% del conteo estimado. Flakes Tunetank/red → retry ×2 antes de diagnosticar.
- Si restauración aditiva de hunks #92 entra en conflicto: merge manual aditivo
  conservando AMBOS lados (precedente iter-91) y reportarlo en [R].

## RIESGOS

| Riesgo | Mitigación |
|---|---|
| glTF inválido | tests estructurales (asset/buffer/accessor min/max/meshes.primitives) |
| Colisión exports TS2308 | exports EXPLÍCITOS si hace falta + grep símbolos pre-commit |
| Raza con sesión #92 en gates | heartbeat lock + backup SHA256 + commit pathspec apenas verdes |
| Perf demo (~61M px) | caps anti-runaway; 4s@480×854 aceptable |

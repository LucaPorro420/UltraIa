# PLAN: Motor Evolutivo - integracion al proyecto y subagentes (tarea #94, prioridad P1)

Fecha: 2026-08-24 · Modo: P-P (S-D + L-T integrados) · Patron: bucle IA 4 fases (Sensado/Razonamiento/Accion/Ajuste), 3 pasadas C1/C2/C3 · Presupuesto: ~3.5h / sesion unica PIVR

## Contexto
- Peticion del usuario (24/08/2026): "con la informacion de la carpeta planificacionImplementar crea un plan de mejoras para integrar al proyecto en general y sus subagentes".
- Fuente: `planificacionImplementar/` — `Manual_Completo_Motor_Evolutivo.docx` (20 capitulos: ciclo evolutivo Observar-Medir-Analizar-Proponer-Implementar-Probar-Evaluar-Aprender-Repetir; multiagente Matematico/Geometrico/Fisica/IA/Programador/Testing/Optimizacion/Investigador/Arquitecto; LLMs locales Ollama+RAG+LoRA; memoria Qdrant/Neo4j; geometria computacional Voronoi/Delaunay/BVH/Octree/Quadtree/NURBS/CAD; fisica colisiones/rigid bodies/particulas; procedural Perlin/Simplex/fractales/L-Systems/GA; RL; pipeline Investigacion-Diseno-Programacion-Simulacion-Benchmark-Analisis-Optimizacion-Nueva Generacion; roadmap F1 RAG -> F2 Multiagentes -> F3 AutoGen -> F4 Sistema Evolutivo -> F5 Automatizacion total) + `Chat_Motor_Evolutivo.docx` (resumen; arquitectura AutoGen/LangGraph/Qdrant/Neo4j/Blender/Godot/OpenCASCADE/ROS2).
- ALERTAS de la fuente: `automatizacion.json` esta a **0 bytes** (firma del incidente de vaciado conocido; NO inventar contenido - pedirlo al usuario). `Download (34).mp4` no es analizable por texto.
- Estado verificado en Sensado: kill switch NO activo; lock AUSENTE (iter-93 cerro GREEN ~23:58 23/08, commits ae5b32b/55a7030/fb4ed37; geom de loop-92 en 8de6080/2c74084); STATE.md == HEAD (check-8 OK); raiz critica >0 bytes (check-6 OK); sin IDs duplicados (check-1 OK); sin colision loop-94-* (check-13 OK); llm.ts/index.ts LIMPIOS; baseline FULL test 1452/1452 (core 1259 + runtime 193), build 44 paginas.

## SPEC (S-D integrado - fase P-P)
Requisitos precisos por mejora (todas dominio puro determinista keyless SIN deps nuevas):
- **M1 `physics2d.ts`** (capitulo Fisica): (a) Verlet posicional - particula {position, positionPrev, acceleration, radius}, velocidad implicita = position - positionPrev; substeps fijos orden gravity->collide->constrain->integrate; stick constraints {a,b,length}; contenedor circular/rectangular; response_coef 0.75 default. (b) Rigidos circulo/caja - masa/densidad, detencion circulo-circulo/circulo-caja/AABB-AABB, resolucion por impulso con restitucion (0..1) y friccion tangencial, timestep fijo dt=1/60. Criterios: misma entrada -> mismo estado final byte-exact; pilas que asientan sin explotar (energia monotonamente decreciente tras settle); API serializable JSON; renderPhysicsHtml canvas autocontenido (patron sdf/codevfx, sin JS externo).
- **M2 `cadgeo.ts`** (capitulo Geometria Computacional - archivo NUEVO, NO tocar geom.ts): delaunay2D Bowyer-Watson (super-triangulo circundante, test circumcircle, n<=2000, guardas puntos colineales/duplicados), voronoiFromDelaunay (dual por circuncentros, celdas como poligonos), bvhBuild median-split eje mayor + bvhRayQuery + bvhAabbQuery, quadtree insert/query circular, bsplineEval de Boor grado p<=5 (NURBS-lite uniforme, weights opcionales), extrudeMesh(profile,height)/revolveMesh(profile,segments) -> GeomMesh compatible con meshToOBJ/meshToSTL/glTF existentes. Criterios: triangulacion valida (ningun punto dentro de circumcircles ajenos), BVH devuelve el MISMO conjunto que fuerza bruta, exports reutilizan tipos de geom.ts.
- **M3 `evo.ts`** (capitulos GA/RL): Individual{genes:number[],fitness?} schema zod; PRNG xorshift32 semilla entera (determinista entre procesos); evolveGeneration(pop, fitnessFn, config{elite,tournamentK,crossover{kind:uniform|arithmetic|blend,rate},mutation{sigma,rate}}) PURO (fitnessFn inyectable, sin estado global); stats best/mean/worst/diversidad(std genes). Criterios: misma semilla+mismo fitness -> misma poblacion evolucionada; elitismo conserva mejor; convergencia demostrable en benchmark esferico (min x^2) < 50 generaciones.
- **M4 `evolution.ts`** (Motor Evolutivo sobre artefactos): mapea el pipeline del manual a capabilities existentes - poblacion = params de un GENERADOR inyectable (sdf scene params | procvid anim config | geometry preset), evaluar = fitnessFn (videoqa ssim/psnr vs objetivo | imaging stats | custom), ciclo runEvolutionCycle(generations, config) con checkpoint por generacion {index,bestGenes,bestFitness} persistible en brainpage (timeline append-only = memoria evolutiva) + vault (.ultraia/vault/creations). Criterios: 100% IO inyectable (tests sin fs/red); resume desde checkpoint produce mismos resultados que corrida completa.
- **M5 Subagentes** (`seed-data.mjs`, patron iter-70 "una sola fuente"): bp-matematico {geom, geometry, generative, evo}; bp-geometra {geometry, sdf, cadgeo, pngrender}; bp-fisico {physics2d, procvid, motion, videoqa}; bp-orquestador += cadgeo/evo/evolution/physics2d. Verificar en DB real post-seed (query Prisma status ACTIVE, conteo exacto por agente).
- **M6 Wiring aditivo**: tools `physics_sim` (acciones step/verlet/rigid/render), `cadgeo_compute` (delaunay/voronoi/bvh/quadtree/bspline/extrude/revolve), `evo_optimize` (evolve/stats/benchmark), `evolution_run` (cycle/checkpoint/resume) en llm.ts + exports/namespace/TOOL_DESCRIPTIONS/union Capability en index.ts. Merge ADITIVO (nunca sobrescribir hunks ajenos).
- **M7 Docs**: learning/sources/motor-evolutivo.md (fuente condensada fiel DOCX+chat, comando de extraccion incluido) + docs/RAZONAMIENTO-MOTOR-EVOLUTIVO.md (tabla capitulo -> UltraIa implementado/parcial/nuevo + decisiones) + fila 94 en STATE.md + entradas run-log [I]/[V]/[R].

## DESIGN (S-D integrado - fase P-P)
- Arquitectura elegida: 4 modulos NUEVOS independientes (physics2d/cadgeo/evo/evolution) + wiring aditivo; cero modificaciones a modulos existentes salvo seed-data.mjs y los dos hubs (llm.ts/index.ts). evolution.ts COMPONE evo.ts (no duplica GA) y consume generadores/evaluadores via interfaces inyectables - mismo patron replica.ts (IO inyectable) y harness.ts (plugins).
- Flujo M4: targetSpec -> initPopulation(seed) -> [generar(params)->artefacto -> fitness(artefacto,target) -> evolveGeneration] x G -> checkpoints -> brainpage timeline + vault. El ciclo evolutivo del manual queda mapeado 1:1: Observar=leer truth/checkpoints, Medir=fitness, Analizar=stats/diversidad, Proponer=crossover/mutacion, Implementar=generar, Probar=evaluar, Evaluar=seleccion, Aprender=checkpoint brainpage, Repetir=siguiente generacion.
- Interop Blender/Godot/OpenCASCADE: SIN deps - GeomMesh->OBJ/STL/glTF ya existentes son el puente (decision: export estandar > vendor SDK nativo).
- Diagrama opcional post-build: diagram_render kind=data-flow (pipeline M4) -> docs/diagrams/.

## LEARN (L-T integrado - fase P-P)
- Verdad verificada aplicable: learning/truth/truth_ultraia_capabilities.json (54 docs corpus; search/image/video/code/audio verificados) - evolution.ts se apoya en videoqa/imaging ya documentados. Corpus sincronizable a Qdrant v2 (Task/sync-qdrant.ts) tras anadir casos nuevos.
- Lecciones LEARNINGS vigentes que aplican: portar solo el aporte genuino no redundante (iter-86 Genesis: NO recrear blueprint/improve/feedback - este plan respeta no duplicando PIVR/vitals/genesis); commit SIEMPRE con pathspec (iter-58); cache stale node_modules/.vite ante fallos raros de vitest; PS 5.1 corrompe UTF-8 con Get-Content/Set-Content (usar scripts py -3.12 para escrituras complejas); quien commitea primero gana (concurrencia - wiring aditivo + lock); JSDoc /** con // internos no cierra bloque.
- Biblioteca de fracasos: vaciado de archivos a 0 bytes (automatizacion.json victima ahora) -> check integridad de la fuente ANTES de usarla (hecho: detectado y reportado, no inventar contenido).
- Gaps de autolearn que esta tarea cierra: tema_sin_truth para "physics/simulation" y "genetic algorithms" (nuevos casos de verdad post-build) + gap backlog_pendiente #94.

## TEST (L-T integrado - fase P-P)
- Estrategia: unit tests vitest por modulo con vectores deterministas (semillas fijas, tolerancia 0 para enteros/hashes, 1e-9 para floats derivados de mismas ops). Casos clave: (1) Verlet pila de N balls en flask -> posiciones finales identicas en 2 corridas + energia <= inicial tras settle; (2) rigidos restitucion 1 conserva momento; friccion reduce velocidad tangencial; (3) Delaunay: 4 puntos convexo -> 2 triangulos esperados + edge colineal rechazado con error claro; (4) Voronoi dual: cada celda contiene su sitio; (5) BVH query == fuerza bruta en 500 AABBs random-seed; (6) B-spline pasa por extremos y respeta convex hull grado 1; (7) GA benchmark esferico converge <50 gens con semilla fija + reproducibilidad bit-exact; (8) evolution resume(checkpoint)==corrida completa; (9) wiring: descriptor/namespace/Capability (patron *.wiring.test.ts); (10) seed: conteos exactos por agente tras seed-admin real.
- Gates scoped por pasada: vitest archivo + tsc core --noEmit. Gates FULL al cierre: typecheck->lint->test->build (orden CI, dev servers muertos, .next limpio).

## MEJORAS A ADICIONAR
- Capability `physics2d` (simulacion fisica determinista - gap mayor del manual).
- Modulo `cadgeo` (Delaunay/Voronoi/BVH/quadtree/B-spline/CAD-lite extrude-revolve).
- Capability `evo` (GA generico determinista reutilizable por cualquier dominio).
- Capability `evolution` (motor evolutivo de artefactos con memoria brainpage + vault).
- 3 subagentes nuevos bp-matematico/bp-geometra/bp-fisico + caps nuevas al orquestador.
- Wiring de 4 tools nuevas en el runtime de agentes.
- Fuente + RAZONAMIENTO documentados + 2 casos truth nuevos (physics, ga).

## TECNOLOGIAS EVALUADAS (research 24/08/2026, websearch x2)
- **nape-js** (MIT, deterministic stepping + serialization, zero-dep ~195KB gzip): mejor referencia de API moderna; NO adoptada como dep (regla dominio puro; principios suficientes).
- **matter-js / planck.js / p2-es / cannon-es / ammo.js**: maduros pero estado mutable global, sin foco byte-exact, deps pesadas; NO.
- **Pezza Verlet solver** (Xepsa manual web): patron ELEGIDO particulas - velocity implicita, substeps gravity->collide->constrain->integrate, estabilidad incondicional, bit-exact.
- **box2d-lite lineage (impulse/SAT)**: patron ELEGIDO capa rigida circulo/caja (restitucion+friccion).
- **delaunator** (mapbox ISC): rapido pero dep nueva; Bowyer-Watson propio O(n^2) suficiente (n<=2000). ELEGIDO propio.
- **BVH**: median-split eje mayor (PBRT SAH diferido a v2 - complejidad innecesaria ahora).
- **AutoGen/LangGraph**: NO como dependencias core - ese rol YA lo cumple el harness propio (PIVR + genesis runner + opencode agents); LangGraph vive solo en sandbox sacd_system/nucleo_nasa.py.
- **ChromaDB/Weaviate**: redundantes - Qdrant Cloud/Local v2 + Neo4j ya operativos (sacd_system Docker verificado iter-69).
- **Blender bpy / Godot headless / OpenCASCADE / ROS2**: DIFERIDO (instalacion nativa pesada, fuera del ciclo npm; interoperabilidad cubierta por OBJ/STL/glTF/SVG existentes).
- **LoRA fine-tuning local**: human-blocked GPU (backlog #6 existente) - fuera de alcance.

## Objetivo
- Integrar el Motor Evolutivo del manual como 4 capacidades nuevas deterministas + 3 subagentes especializados, con ~75 tests nuevos y gates FULL verdes, sin tocar WIP ajeno ni anadir dependencias.

## Pasos
1. C1: guardar fuente condensada en learning/sources/motor-evolutivo.md (extraccion python zipfile ya validada en %TEMP%/opencode/docx_*.txt) + escribir docs/RAZONAMIENTO-MOTOR-EVOLUTIVO.md base.
2. C1: implementar packages/core/src/tools/physics2d.ts (Verlet + rigidos + renderPhysicsHtml) + physics2d.test.ts (~25 tests).
3. C2: implementar packages/core/src/tools/cadgeo.ts (Bowyer-Watson/Voronoi/BVH/quadtree/B-spline/extrude/revolve) + cadgeo.test.ts (~20 tests).
4. C2: implementar packages/core/src/tools/evo.ts (xorshift + evolveGeneration + benchmark esferico) + evo.test.ts (~18 tests).
5. C3: implementar packages/core/src/tools/evolution.ts (ciclo completo + checkpoints + brainpage/vault IO inyectable) + evolution.test.ts (~12 tests).
6. C3: seed-data.mjs - 3 agentes nuevos + caps nuevas orquestador; verificar DB real (patron iter-70).
7. C3: wiring aditivo llm.ts (4 tools) + index.ts (exports/namespace/TOOL_DESCRIPTIONS/Capability union) + wiring tests.
8. C3: cerrar RAZONAMIENTO (mapeo completo) + truth cases physics/ga + fila 94 STATE.md DONE + run-log [I]/[V]/[R] + leccion LEARNINGS si aplica.
9. Cada pasada: staging EXPLICITO + commit pathspec `feat(core): ...` solo con gates de esa pasada verdes.

## Archivos a tocar (staging explicito)
- learning/sources/motor-evolutivo.md — NUEVO, fuente condensada
- docs/RAZONAMIENTO-MOTOR-EVOLUTIVO.md — NUEVO, analisis y mapeo
- packages/core/src/tools/physics2d.ts — NUEVO (+ physics2d.test.ts)
- packages/core/src/tools/cadgeo.ts — NUEVO (+ cadgeo.test.ts)
- packages/core/src/tools/evo.ts — NUEVO (+ evo.test.ts)
- packages/core/src/tools/evolution.ts — NUEVO (+ evolution.test.ts)
- packages/core/src/tools/{physics2d,cadgeo,evo,evolution}.wiring.test.ts — NUEVOS (patron wiring)
- packages/core/prisma/seed-data.mjs — EDITAR (aditivo: 3 agentes + caps orquestador)
- packages/core/src/ai/llm.ts — EDITAR (wiring aditivo 4 tools)
- packages/core/src/tools/index.ts — EDITAR (exports/namespace/descriptors/Capability)
- learning/truth/truth_physics_ga.json — NUEVO (2 casos verificados)
- STATE.md — EDITAR (fila 94, fase R)
- loop-run-log.md — EDITAR (entradas [P]/[I]/[V]/[R])
- OPCIONAL: Task/motor-evolutivo-demo.ts + resultTask/motor-evolutivo/ (demo render)

## RECURSOS / PRESUPUESTO
- Tools: Write via scripts py -3.12 (nunca PS sobre archivos del repo), vitest scoped, tsc core, grep/read; python zipfile para DOCX (ya validada, outputs en %TEMP%/opencode/docx_*.txt); patrones de referencia sdf.ts/codevfx.ts (HTML autocontenido), replica.ts (IO inyectable), geom.ts (tipos GeomMesh reutilizados), seed pattern iter-70.
- Tiempo estimado: C1 ~60min, C2 ~70min, C3 ~80min (+gates FULL ~10min). Tokens dentro del cap diario PIVR (100k).
- Skills: loop-concurrency-guard (lock antes de build/commit), state-integrity-check pre-commit (checks 6/8), loop-budget.

## NO-hacer (guardas explicitas)
- NO tocar: geom.ts/geom.test.ts ni recordly* ni planes loop-92*/93* (de sesiones previas); WIP ajeno si reaparece (cuarentena hash, precedente iter-54/79).
- NO anadir dependencias npm (sin delaunator/matter-js/nape/langchain).
- NO push/merge (gate humano); NO editar .env*; NUNCA git add . (pathspec siempre).
- NO inventar contenido de automatizacion.json (0 bytes) - pedirlo al usuario en el reporte.
- NO recrear PIVR/vitals/genesis/autolearn (ya existen - leccion iter-86); NO introducir AutoGen/LangGraph Python al core.
- NO correr npm run build con dev servers vivos (taskkill primero).

## Criterios de verificacion
- Scoped C1: vitest physics2d ~25/25 PASS + tsc core EXIT 0.
- Scoped C2: vitest cadgeo+evo ~38/38 PASS + tsc core EXIT 0.
- Scoped C3: vitest evolution+wiring ~16/16 PASS + tsc core EXIT 0.
- FULL cierre: npm run typecheck 0 -> lint 0 -> test >=1527 PASS (baseline 1452 + ~75 nuevos) -> build 0 (~44-45 paginas).
- Seed: query Prisma -> bp-matematico/bp-geometra/bp-fisico activos con caps exactas + orquestador con las 4 nuevas.
- Commit pathspec por pasada; evidencia [I]/[V]/[R] en run-log con hashes.

## TOLERANCIAS
- Tests nuevos +/-10 sobre lo estimado (25/38/16) - aceptable si cobertura de criterios SPEC completa; STOP cuando criterios 1-10 cubiertos.
- Si FULL RED -> max 3 fix attempts por item -> escalar High Priority en STATE.md y parar (sin commitear rojo).
- Si otra sesion toma lock vivo sobre llm.ts/index.ts -> CEDE wiring a siguiente ciclo (precedente 90->91), commitear modulos puros igualmente.
- Rendimientos decrecientes: si tras 2 pasadas el benchmark GA no converge, simplificar config default y documentar (no bloquear el resto).

## Riesgos / guardas
- Concurrencia (riesgo top): sesiones r92/r93 podrian volver sobre llm.ts/index.ts -> mitigacion: merge ADITIVO, lock propio antes de gates, cuarentena WIP con Get-FileHash, commit pathspec.
- Determinismo float: mismos inputs/mismas ops en Node dan resultados identicos; NO usar Math.random (solo xorshift sembrado); NO Date.now() en modulos (timestamps solo en IO inyectable).
- Bowyer-Watson degenerado: super-triangulo 10x bounds + dedupe de puntos (<1e-9) + test colineal.
- Vaciado 0 bytes recurrente: verificar archivos criticos (check-6/8) antes de commit; la fuente DOCX ya respaldada en %TEMP% y re-extraible.
- Build: matar node.exe next dev + .next limpio si errores raros; cache vitest node_modules/.vite si fallos extranos post-edicion.

## Esfuerzo estimado
- Medio-alto — 4 modulos nuevos con matematica no trivial, pero patrones repo consolidados (dominio puro + wiring aditivo + seed) reducen riesgo; 3 pasadas acotadas.


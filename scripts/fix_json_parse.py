#!/usr/bin/env python3
"""Batch-replace bare JSON.parse() calls in llm.ts with safe parseJson<T>() helper."""
import re, sys

path = r'C:\Users\UTEC-5695\Desktop\UltraIa\packages\core\src\ai\llm.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

before = content.count('JSON.parse')
print(f'Before: {before} JSON.parse calls')

# --- recordly timeline ---
content = content.replace(
    '? (JSON.parse(regionesJson) as {\n              zoomRegions?: ZoomRegion[];\n              clipRegions?: ClipRegion[];\n              annotationRegions?: AnnotationRegion[];\n              audioRegions?: AudioRegion[];\n            })\n              : {};',
    'parseJson<{ zoomRegions?: ZoomRegion[]; clipRegions?: ClipRegion[]; annotationRegions?: AnnotationRegion[]; audioRegions?: AudioRegion[] }>(regionesJson, {});',
    1
)

# recordly manifest
content = content.replace(
    'return { accion, manifest: JSON.parse(manifest) };',
    'return { accion, manifest: parseJson(manifest, {}) };',
    1
)

# cerebro
content = content.replace(
    'const cfgInput = configJson ? (JSON.parse(configJson) as Record<string, unknown>) : {};',
    'const cfgInput = parseJson<Record<string, unknown>>(configJson, {});',
    1
)
content = content.replace(
    '? parseBrainState(JSON.parse(estadoJson))',
    'parseBrainState(parseJson(estadoJson, undefined))',
    1
)

# travel
content = content.replace(
    'return { accion, manifest: buildTakeManifest(JSON.parse(tomaJson)) };',
    'return { accion, manifest: buildTakeManifest(parseJson<any>(tomaJson, {})) };',
    1
)
content = content.replace(
    'const plan = JSON.parse(planJson) as TravelPlan;\n            const opts = opcionesJson ? (JSON.parse(opcionesJson) as Record<string, unknown>) : {};\n            const render = buildTravelRender',
    'const plan = parseJson<TravelPlan>(planJson, {} as TravelPlan);\n            const opts = parseJson<Record<string, unknown>>(opcionesJson, {});\n            const render = buildTravelRender',
    1
)
content = content.replace(
    'const opts = opcionesJson ? (JSON.parse(opcionesJson) as { variaciones?: number; seed?: number }) : {};',
    'const opts = parseJson<{ variaciones?: number; seed?: number }>(opcionesJson, {});',
    1
)
content = content.replace(
    'const plan = JSON.parse(planJson) as TravelPlan;\n            const opts = opcionesJson ? (JSON.parse(opcionesJson) as { width?: number; height?: number; seed?: number }) : {};\n            return { accion, imagen: travelLeadImage',
    'const plan = parseJson<TravelPlan>(planJson, {} as TravelPlan);\n            const opts = parseJson<{ width?: number; height?: number; seed?: number }>(opcionesJson, {});\n            return { accion, imagen: travelLeadImage',
    1
)

# generative_media
content = content.replace(
    "const opts = opcionesJson ? (JSON.parse(opcionesJson) as Record<string, any>) : {};",
    "const opts = parseJson<Record<string, any>>(opcionesJson, {});",
    1
)
content = content.replace(
    "const p = patronJson ? (JSON.parse(patronJson) as { axioma?: string; reglas?: Record<string, string>; iteraciones?: number }) : {};",
    "const p = parseJson<{ axioma?: string; reglas?: Record<string, string>; iteraciones?: number }>(patronJson, {});",
    1
)
content = content.replace(
    "const kfs = keyframesJson ? (JSON.parse(keyframesJson) as Array<{ t: number; value: number[] }>) : [{ t: 0, value: [0] }, { t: 1, value: [1] }];",
    "const kfs = parseJson<Array<{ t: number; value: number[] }>>(keyframesJson, [{ t: 0, value: [0] }, { t: 1, value: [1] }]);",
    1
)
content = content.replace(
    "const p = patronJson ? (JSON.parse(patronJson) as { pattern: Array<{ step: number; freq: number; type?: string }> }) : { pattern: [{ step: 0, freq: 220 }] };",
    "const p = parseJson<{ pattern: Array<{ step: number; freq: number; type?: string }> }>(patronJson, { pattern: [{ step: 0, freq: 220 }] });",
    1
)

# libros
content = content.replace(
    "const r = validarPropuestaLibro(JSON.parse(propuestaJson));",
    "const r = validarPropuestaLibro(parseJson<any>(propuestaJson, {}));",
    1
)

# sdf_render
content = content.replace(
    "const escena = escenaJson ? JSON.parse(escenaJson) : { primitives: [{ kind: 'sphere', pos: [0, 0, 0], color: '#8b5cf6', params: { radius: 1 } }] };",
    "const escena = parseJson(escenaJson, { primitives: [{ kind: 'sphere', pos: [0, 0, 0], color: '#8b5cf6', params: { radius: 1 } }] });",
    1
)

# geometry_build
content = content.replace(
    'const P = params ? JSON.parse(params) : {};\n        const vA = A ? JSON.parse(A) : undefined;\n        const vB = B ? JSON.parse(B) : undefined;',
    'const P = parseJson(params, {});\n        const vA = parseJson(A, undefined);\n        const vB = parseJson(B, undefined);',
    1
)

# videoqa - metricas case
content = content.replace(
    "const reference = JSON.parse(referenceJson ?? '[]');\n            const distorted = JSON.parse(distortedJson ?? '[]');\n            const flow = flowJson ? JSON.parse(flowJson) : {};\n            const mseValue = videoqa.mse",
    "const reference = parseJson(referenceJson, []);\n            const distorted = parseJson(distortedJson, []);\n            const flow = parseJson(flowJson, {});\n            const mseValue = videoqa.mse",
    1
)
# videoqa - veredicto case
content = content.replace(
    "const reference = JSON.parse(referenceJson ?? '[]');\n            const distorted = JSON.parse(distortedJson ?? '[]');\n            const flow = flowJson ? JSON.parse(flowJson) : {};\n            const umbrales = umbralesJson ? JSON.parse(umbralesJson) : {};",
    "const reference = parseJson(referenceJson, []);\n            const distorted = parseJson(distortedJson, []);\n            const flow = parseJson(flowJson, {});\n            const umbrales = parseJson(umbralesJson, {});",
    1
)
# videoqa - vmaf case
content = content.replace(
    'const runner = runnerJson ? JSON.parse(runnerJson) : {};',
    'const runner = parseJson(runnerJson, {});',
    1
)

# motion - stats + descomponer
content = content.replace(
    'const campo = campoJson ? JSON.parse(campoJson) : { width: 1, height: 1, vectors: [] };',
    'const campo = parseJson(campoJson, { width: 1, height: 1, vectors: [] });',
    2
)
# motion - trayectoria
content = content.replace(
    'const puntos = puntosJson ? JSON.parse(puntosJson) : [];',
    'const puntos = parseJson(puntosJson, []);',
    1
)
# motion - runner
content = content.replace(
    'const cfg = cfgJson ? JSON.parse(cfgJson) : {};',
    'const cfg = parseJson(cfgJson, {});',
    1
)

# video_edit_pack
content = content.replace(
    "const segments = JSON.parse(segmentsJson) as import('../tools/video-edit').TranscriptSegment[];",
    "const segments = parseJson<import('../tools/video-edit').TranscriptSegment[]>(segmentsJson, []);",
    1
)
# video_edit_edl
content = content.replace(
    "const cuts = JSON.parse(cutsJson) as import('../tools/video-edit').EdlCut[];",
    "const cuts = parseJson<import('../tools/video-edit').EdlCut[]>(cutsJson, []);",
    1
)
# video_edit_render
content = content.replace(
    "const edl = JSON.parse(edlJson) as import('../tools/video-edit').Edl;\n        const { shell, steps, argv } = renderFfmpeg",
    "const edl = parseJson<import('../tools/video-edit').Edl>(edlJson, {} as import('../tools/video-edit').Edl);\n        const { shell, steps, argv } = renderFfmpeg",
    1
)
# video_edit_selfeval
content = content.replace(
    "const edl = JSON.parse(edlJson) as import('../tools/video-edit').Edl;\n        const silenceGapsMs = silenceGapsMsJson ? (JSON.parse(silenceGapsMsJson) as number[]) : undefined;",
    "const edl = parseJson<import('../tools/video-edit').Edl>(edlJson, {} as import('../tools/video-edit').Edl);\n        const silenceGapsMs = parseJson<number[] | undefined>(silenceGapsMsJson, undefined);",
    1
)
# video_edit_timeline
content = content.replace(
    "const markers = JSON.parse(markersJson) as import('../tools/video-edit').TimelineViewSpec['markers'];\n        const silences = silencesJson ? (JSON.parse(silencesJson) as import('../tools/video-edit').TimelineViewSpec['silences']) : undefined;",
    "const markers = parseJson<import('../tools/video-edit').TimelineViewSpec['markers']>(markersJson, []);\n        const silences = parseJson<import('../tools/video-edit').TimelineViewSpec['silences']>(silencesJson, undefined);",
    1
)

# screenflow_plan
content = content.replace(
    "const script = JSON.parse(scriptJson) as import('../tools/screenflow').ActionScript;",
    "const script = parseJson<import('../tools/screenflow').ActionScript>(scriptJson, [] as unknown as import('../tools/screenflow').ActionScript);",
    1
)
# screenflow_state
content = content.replace(
    "const previous: RunState | null = previousJson ? (JSON.parse(previousJson) as RunState) : null;",
    "const previous: RunState | null = parseJson<RunState | null>(previousJson, null);",
    1
)

# geometry_build paramsJson
content = content.replace(
    "const p = paramsJson ? (JSON.parse(paramsJson) as Record<string, unknown>) : {};",
    "const p = parseJson<Record<string, unknown>>(paramsJson, {});",
    1
)

# procvid
content = content.replace(
    "params: args.paramsJson ? (JSON.parse(args.paramsJson) as Record<string, unknown>) : undefined,",
    "params: parseJson<Record<string, unknown> | undefined>(args.paramsJson, undefined),",
    1
)

# cadgeo ptsFrom helper
content = content.replace(
    "raw ? JSON.parse(raw) as Array<[number, number]> : fallback;",
    "parseJson<Array<[number, number]>>(raw, fallback);",
    1
)
# cadgeo bvh
content = content.replace(
    "const boxes = JSON.parse(boxesJson ?? '[]') as cadgeo.BvhBox[];",
    "const boxes = parseJson<cadgeo.BvhBox[]>(boxesJson, []);",
    1
)
content = content.replace(
    "const q = queryJson ? (JSON.parse(queryJson) as cadgeo.BvhBox) : { minX: -1e9, minY: -1e9, maxX: 1e9, maxY: 1e9 };",
    "const q = parseJson<cadgeo.BvhBox>(queryJson, { minX: -1e9, minY: -1e9, maxX: 1e9, maxY: 1e9 });",
    1
)
content = content.replace(
    "const [ox, oy, dx, dy] = JSON.parse(rayJson) as [number, number, number, number];",
    "const [ox, oy, dx, dy] = parseJson<[number, number, number, number]>(rayJson, [0, 0, 1, 0]);",
    1
)
# cadgeo quadtree
content = content.replace(
    "const c = queryJson ? (JSON.parse(queryJson) as { cx: number; cy: number; r: number }) : { cx: 1, cy: 1, r: 3 };",
    "const c = parseJson<{ cx: number; cy: number; r: number }>(queryJson, { cx: 1, cy: 1, r: 3 });",
    1
)

# evo stats
content = content.replace(
    "const pop = (populationJson ? JSON.parse(populationJson) : [{ genes: [0, 0] }, { genes: [1, 1] }]) as evoDomain.Individual[];",
    "const pop = parseJson<evoDomain.Individual[]>(populationJson, [{ genes: [0, 0] }, { genes: [1, 1] }]);",
    1
)
# evo evolve fitness
content = content.replace(
    "const parsed = fitnessJson ? (JSON.parse(fitnessJson) as { weights?: number[] }) : {};",
    "const parsed = parseJson<{ weights?: number[] }>(fitnessJson, {});",
    1
)
# evo evolve population
content = content.replace(
    "? (JSON.parse(populationJson) as evoDomain.IndividualInput[])\n          : evoDomain.spherePopulation",
    "parseJson<evoDomain.IndividualInput[] | undefined>(populationJson, undefined)\n          ?? evoDomain.spherePopulation",
    1
)

# observability (trace + generation - 2 occurrences)
old_obs = "const input = inputJson ? JSON.parse(inputJson) : undefined;\n          const output = outputJson ? JSON.parse(outputJson) : undefined;"
new_obs = "const input = parseJson(inputJson, undefined);\n          const output = parseJson(outputJson, undefined);"
content = content.replace(old_obs, new_obs, 2)

# agentic plan
content = content.replace(
    "const spec = specJson ? JSON.parse(specJson) : { entry: 'start', nodes: [{ id: 'start', kind: 'router' }], edges: [] };",
    "const spec = parseJson(specJson, { entry: 'start', nodes: [{ id: 'start', kind: 'router' }], edges: [] });",
    1
)
content = content.replace(
    "const spec = specJson ? JSON.parse(specJson) : { roles: [{ name: 'researcher', goal: 'investigar' }], tasks: [{ id: 't1', role: 'researcher', objective: 'buscar' }] };",
    "const spec = parseJson(specJson, { roles: [{ name: 'researcher', goal: 'investigar' }], tasks: [{ id: 't1', role: 'researcher', objective: 'buscar' }] });",
    1
)
content = content.replace(
    "const spec = specJson ? JSON.parse(specJson) : { loaders: ['web'], chunk: { size: 1000, overlap: 100 }, embed: 'local', store: 'qdrant' };",
    "const spec = parseJson(specJson, { loaders: ['web'], chunk: { size: 1000, overlap: 100 }, embed: 'local', store: 'qdrant' });",
    1
)
content = content.replace(
    "const steps = specJson ? JSON.parse(specJson) : [{ kind: 'prompt', name: 'template' }, { kind: 'model', name: 'gpt-4o-mini' }];",
    "const steps = parseJson(specJson, [{ kind: 'prompt', name: 'template' }, { kind: 'model', name: 'gpt-4o-mini' }]);",
    1
)
content = content.replace(
    "const spec = specJson ? JSON.parse(specJson) : { lang: 'python', code: 'print(\"hello\")' };",
    "const spec = parseJson(specJson, { lang: 'python', code: 'print(\"hello\")' });",
    1
)
content = content.replace(
    "const spec = specJson ? JSON.parse(specJson) : { kind: 'semantic', query: 'buscar' };",
    "const spec = parseJson(specJson, { kind: 'semantic', query: 'buscar' });",
    1
)

# canvas_physics ball
content = content.replace(
    "const ball = ballJson ? JSON.parse(ballJson) : { x: 100, y: 50, vx: 3, vy: 0, r: 12, mass: 1 };",
    "const ball = parseJson(ballJson, { x: 100, y: 50, vx: 3, vy: 0, r: 12, mass: 1 });",
    1
)

# chaos attractor (evaluate + trajectory)
content = content.replace(
    "const state = stateJson ? JSON.parse(stateJson) : [0.1, 0, 0];",
    "const state = parseJson(stateJson, [0.1, 0, 0]);",
    2
)

# publication_queue
content = content.replace(
    "const paquete = JSON.parse(paqueteJson);",
    "const paquete = parseJson(paqueteJson, {});",
    1
)

# contenido_generar
content = content.replace(
    "const brief = JSON.parse(briefJson) as import('../tools/topics').TopicBrief;",
    "const brief = parseJson<import('../tools/topics').TopicBrief>(briefJson, {} as import('../tools/topics').TopicBrief);",
    1
)

# Remove unused safeJsonArray import
content = content.replace(
    "import { safeJsonParse, safeJsonArray } from '../utils/safe-json';",
    "import { safeJsonParse } from '../utils/safe-json';",
    1
)

after = content.count('JSON.parse')
print(f'After: {after} JSON.parse calls')
print(f'Replaced: {before - after}')

# Count which ones remain (for debugging)
lines = content.split('\n')
remaining = []
for i, line in enumerate(lines, 1):
    if 'JSON.parse' in line and 'const parseJson' not in line and 'try { return JSON.parse' not in line and 'parseJsonLoose' not in line:
        remaining.append(f'  L{i}: {line.strip()[:80]}')
print(f'Remaining bare JSON.parse ({len(remaining)}):')
for r in remaining:
    print(r)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('File written OK')

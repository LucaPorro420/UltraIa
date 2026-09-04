#!/usr/bin/env python3
"""
Iter-168: Add module-level parseJson helper + replace all bare JSON.parse() in tool execute handlers.
Runs in one atomic pass to avoid file reverts between edits.
"""
import re

path = r'C:\Users\UTEC-5695\Desktop\UltraIa\packages\core\src\ai\llm.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# ===== STEP 1: Add module-level parseJson helper =====
old_import = "import { FREE_MODEL_CATALOG } from './model-catalog';\n\nconst modelCache = new Map<string, LanguageModel>();"
new_import = """import { FREE_MODEL_CATALOG } from './model-catalog';

/** Safe JSON parse with default — never throws. Used in tool execute handlers. */
const parseJson = <T>(raw: string | undefined, defaultValue: T): T => {
  if (!raw) return defaultValue;
  try { return JSON.parse(raw) as T; } catch { return defaultValue; }
};

const modelCache = new Map<string, LanguageModel>();"""
content = content.replace(old_import, new_import, 1)

# ===== STEP 2: Remove unused safeJsonArray import =====
content = content.replace(
    "import { safeJsonParse, safeJsonArray } from '../utils/safe-json';",
    "import { safeJsonParse } from '../utils/safe-json';",
    1
)

# ===== STEP 3: Replace bare JSON.parse in each handler =====
replacements = [
    # --- qdrant_memory ---
    (
        "? semanticMemory.loadTruthCorpus(JSON.parse(corpusJson) as semanticMemory.TruthFileLike[])\n          : (await semanticMemory.loadTruthAuto()).docs;\n        const client = qdrantMemory.createQdrantClient(url ?? qdrantMemory.QDRANT_DEFAULT_URL);\n        if (accion === 'plan') {\n          const remoteIds = remoteIdsJson ? (JSON.parse(remoteIdsJson) as number[]) : [];",
        "? semanticMemory.loadTruthCorpus(parseJson<semanticMemory.TruthFileLike[]>(corpusJson, []))\n          : (await semanticMemory.loadTruthAuto()).docs;\n        const client = qdrantMemory.createQdrantClient(url ?? qdrantMemory.QDRANT_DEFAULT_URL);\n        if (accion === 'plan') {\n          const remoteIds = parseJson<number[]>(remoteIdsJson, []);"
    ),
    # --- kgraph_build ---
    (
        "files = JSON.parse(filesJson) as kgraph.GraphInputFile[];",
        "files = parseJson<kgraph.GraphInputFile[]>(filesJson, []);"
    ),
    # --- vfx_code ---
    (
        "const opts = opcionesJson ? (JSON.parse(opcionesJson) as Record<string, unknown>) : {};\n        switch (accion) {\n          case 'plan': {\n            if (!kind) throw new Error('plan requiere kind');\n            return { accion, plan: planEffect(kind, opts) };\n          }\n          case 'colorimetria': {\n            if (!coloresJson) throw new Error('colorimetria requiere coloresJson');\n            return { accion, reporte: colorimetryAnalyze(JSON.parse(coloresJson) as string[]) };",
        "const opts = parseJson<Record<string, unknown>>(opcionesJson, {});\n        switch (accion) {\n          case 'plan': {\n            if (!kind) throw new Error('plan requiere kind');\n            return { accion, plan: planEffect(kind, opts) };\n          }\n          case 'colorimetria': {\n            if (!coloresJson) throw new Error('colorimetria requiere coloresJson');\n            return { accion, reporte: colorimetryAnalyze(parseJson<string[]>(coloresJson, [])) };"
    ),
    # --- recordly editor + telemetry ---
    (
        "const editorState = editorJson ? (JSON.parse(editorJson) as RecordlyEditorState) : undefined;\n        const samples = telemetriaJson ? (JSON.parse(telemetriaJson) as CursorSample[]) : [];",
        "const editorState = parseJson<RecordlyEditorState | undefined>(editorJson, undefined);\n        const samples = parseJson<CursorSample[]>(telemetriaJson, []);"
    ),
    # --- recordly timeline ---
    (
        "? (JSON.parse(regionesJson) as {\n                  zoomRegions?: ZoomRegion[];\n                  clipRegions?: ClipRegion[];\n                  annotationRegions?: AnnotationRegion[];\n                  audioRegions?: AudioRegion[];\n                })\n              : {};",
        "parseJson<{ zoomRegions?: ZoomRegion[]; clipRegions?: ClipRegion[]; annotationRegions?: AnnotationRegion[]; audioRegions?: AudioRegion[] }>(regionesJson, {});"
    ),
    # --- recordly manifest ---
    (
        "return { accion, manifest: JSON.parse(manifest) };",
        "return { accion, manifest: parseJson(manifest, {}) };"
    ),
    # --- cerebro ---
    (
        "const cfgInput = configJson ? (JSON.parse(configJson) as Record<string, unknown>) : {};\n        const config = resolveCerebroConfig(cfgInput);\n        const state = estadoJson\n          ? parseBrainState(JSON.parse(estadoJson))\n          : parseBrainState(undefined);",
        "const cfgInput = parseJson<Record<string, unknown>>(configJson, {});\n        const config = resolveCerebroConfig(cfgInput);\n        const state = parseBrainState(parseJson(estadoJson, undefined));"
    ),
    # --- travel toma ---
    (
        "return { accion, manifest: buildTakeManifest(JSON.parse(tomaJson)) };",
        "return { accion, manifest: buildTakeManifest(parseJson<any>(tomaJson, {})) };"
    ),
    # --- travel render ---
    (
        "const plan = JSON.parse(planJson) as TravelPlan;\n            const opts = opcionesJson ? (JSON.parse(opcionesJson) as Record<string, unknown>) : {};\n            const render = buildTravelRender",
        "const plan = parseJson<TravelPlan>(planJson, {} as TravelPlan);\n            const opts = parseJson<Record<string, unknown>>(opcionesJson, {});\n            const render = buildTravelRender"
    ),
    # --- travel replicar ---
    (
        "const opts = opcionesJson ? (JSON.parse(opcionesJson) as { variaciones?: number; seed?: number }) : {};",
        "const opts = parseJson<{ variaciones?: number; seed?: number }>(opcionesJson, {});"
    ),
    # --- travel lead ---
    (
        "const plan = JSON.parse(planJson) as TravelPlan;\n            const opts = opcionesJson ? (JSON.parse(opcionesJson) as { width?: number; height?: number; seed?: number }) : {};\n            return { accion, imagen: travelLeadImage",
        "const plan = parseJson<TravelPlan>(planJson, {} as TravelPlan);\n            const opts = parseJson<{ width?: number; height?: number; seed?: number }>(opcionesJson, {});\n            return { accion, imagen: travelLeadImage"
    ),
    # --- generative_media opts ---
    (
        "const opts = opcionesJson ? (JSON.parse(opcionesJson) as Record<string, any>) : {};",
        "const opts = parseJson<Record<string, any>>(opcionesJson, {});"
    ),
    # --- generative lsystem ---
    (
        "const p = patronJson ? (JSON.parse(patronJson) as { axioma?: string; reglas?: Record<string, string>; iteraciones?: number }) : {};",
        "const p = parseJson<{ axioma?: string; reglas?: Record<string, string>; iteraciones?: number }>(patronJson, {});"
    ),
    # --- generative keyframes ---
    (
        "const kfs = keyframesJson ? (JSON.parse(keyframesJson) as Array<{ t: number; value: number[] }>) : [{ t: 0, value: [0] }, { t: 1, value: [1] }];",
        "const kfs = parseJson<Array<{ t: number; value: number[] }>>(keyframesJson, [{ t: 0, value: [0] }, { t: 1, value: [1] }]);"
    ),
    # --- generative secuencia ---
    (
        "const p = patronJson ? (JSON.parse(patronJson) as { pattern: Array<{ step: number; freq: number; type?: string }> }) : { pattern: [{ step: 0, freq: 220 }] };",
        "const p = parseJson<{ pattern: Array<{ step: number; freq: number; type?: string }> }>(patronJson, { pattern: [{ step: 0, freq: 220 }] });"
    ),
    # --- libros ---
    (
        "const r = validarPropuestaLibro(JSON.parse(propuestaJson));",
        "const r = validarPropuestaLibro(parseJson<any>(propuestaJson, {}));"
    ),
    # --- sdf_render ---
    (
        "const escena = escenaJson ? JSON.parse(escenaJson) : { primitives: [{ kind: 'sphere', pos: [0, 0, 0], color: '#8b5cf6', params: { radius: 1 } }] };",
        "const escena = parseJson(escenaJson, { primitives: [{ kind: 'sphere', pos: [0, 0, 0], color: '#8b5cf6', params: { radius: 1 } }] }) as Parameters<typeof sdf.planSdfScene>[0];"
    ),
    # --- geometry_build ---
    (
        "const P = params ? JSON.parse(params) : {};\n        const vA = A ? JSON.parse(A) : undefined;\n        const vB = B ? JSON.parse(B) : undefined;",
        "const P = parseJson<Record<string, any>>(params, {});\n        const vA = parseJson<any>(A, undefined);\n        const vB = parseJson<any>(B, undefined);"
    ),
    # --- videoqa metricas ---
    (
        "const reference = JSON.parse(referenceJson ?? '[]');\n            const distorted = JSON.parse(distortedJson ?? '[]');\n            const flow = flowJson ? JSON.parse(flowJson) : {};\n            const mseValue = videoqa.mse",
        "const reference = parseJson(referenceJson, []);\n            const distorted = parseJson(distortedJson, []);\n            const flow = parseJson<{ flowReference?: number[]; flowDistorted?: number[] }>(flowJson, {});\n            const mseValue = videoqa.mse"
    ),
    # --- videoqa veredicto ---
    (
        "const reference = JSON.parse(referenceJson ?? '[]');\n            const distorted = JSON.parse(distortedJson ?? '[]');\n            const flow = flowJson ? JSON.parse(flowJson) : {};\n            const umbrales = umbralesJson ? JSON.parse(umbralesJson) : {};",
        "const reference = parseJson(referenceJson, []);\n            const distorted = parseJson(distortedJson, []);\n            const flow = parseJson<{ flowReference?: number[]; flowDistorted?: number[] }>(flowJson, {});\n            const umbrales = parseJson<{ psnrMin: number; ssimMin: number; eTotalMax: number }>(umbralesJson, { psnrMin: 40, ssimMin: 0.95, eTotalMax: 0.4 });"
    ),
    # --- videoqa vmaf ---
    (
        "const runner = runnerJson ? JSON.parse(runnerJson) : {};",
        "const runner = parseJson<{ model: string; size: string; reference: string; distorted: string; features: ('psnr' | 'ssim' | 'vmaf')[]; ffmpegPath: string }>(runnerJson, { model: 'vmaf-0.6.1', size: '1920x1080', reference: '', distorted: '', features: ['psnr', 'ssim', 'vmaf'], ffmpegPath: 'ffmpeg' });"
    ),
    # --- motion stats ---
    (
        "const campo = campoJson ? JSON.parse(campoJson) : { width: 1, height: 1, vectors: [] };\n            return { accion, stats: motion.flowStats(campo) };\n          }\n          case 'descomponer': {\n            const campo = campoJson ? JSON.parse(campoJson) : { width: 1, height: 1, vectors: [] };",
        "const campo = parseJson(campoJson, { width: 1, height: 1, vectors: [] });\n            return { accion, stats: motion.flowStats(campo) };\n          }\n          case 'descomponer': {\n            const campo = parseJson(campoJson, { width: 1, height: 1, vectors: [] });"
    ),
    # --- motion trayectoria ---
    (
        "const puntos = puntosJson ? JSON.parse(puntosJson) : [];",
        "const puntos = parseJson(puntosJson, []);"
    ),
    # --- motion runner ---
    (
        "const cfg = cfgJson ? JSON.parse(cfgJson) : {};",
        "const cfg = parseJson(cfgJson, {});"
    ),
    # --- video_edit_pack ---
    (
        "const segments = JSON.parse(segmentsJson) as import('../tools/video-edit').TranscriptSegment[];",
        "const segments = parseJson<import('../tools/video-edit').TranscriptSegment[]>(segmentsJson, []);"
    ),
    # --- video_edit_edl ---
    (
        "const cuts = JSON.parse(cutsJson) as import('../tools/video-edit').EdlCut[];",
        "const cuts = parseJson<import('../tools/video-edit').EdlCut[]>(cutsJson, []);"
    ),
    # --- video_edit_render ---
    (
        "const edl = JSON.parse(edlJson) as import('../tools/video-edit').Edl;\n        const { shell, steps, argv } = renderFfmpeg",
        "const edl = parseJson<import('../tools/video-edit').Edl>(edlJson, {} as import('../tools/video-edit').Edl);\n        const { shell, steps, argv } = renderFfmpeg"
    ),
    # --- video_edit_selfeval ---
    (
        "const edl = JSON.parse(edlJson) as import('../tools/video-edit').Edl;\n        const silenceGapsMs = silenceGapsMsJson ? (JSON.parse(silenceGapsMsJson) as number[]) : undefined;",
        "const edl = parseJson<import('../tools/video-edit').Edl>(edlJson, {} as import('../tools/video-edit').Edl);\n        const silenceGapsMs = parseJson<number[] | undefined>(silenceGapsMsJson, undefined);"
    ),
    # --- video_edit_timeline ---
    (
        "const markers = JSON.parse(markersJson) as import('../tools/video-edit').TimelineViewSpec['markers'];\n        const silences = silencesJson ? (JSON.parse(silencesJson) as import('../tools/video-edit').TimelineViewSpec['silences']) : undefined;",
        "const markers = parseJson<import('../tools/video-edit').TimelineViewSpec['markers']>(markersJson, []);\n        const silences = parseJson<import('../tools/video-edit').TimelineViewSpec['silences']>(silencesJson, undefined);"
    ),
    # --- screenflow_plan ---
    (
        "const script = JSON.parse(scriptJson) as import('../tools/screenflow').ActionScript;",
        "const script = parseJson<import('../tools/screenflow').ActionScript>(scriptJson, [] as unknown as import('../tools/screenflow').ActionScript);"
    ),
    # --- screenflow_state ---
    (
        "const previous: RunState | null = previousJson ? (JSON.parse(previousJson) as RunState) : null;",
        "const previous: RunState | null = parseJson<RunState | null>(previousJson, null);"
    ),
    # --- geometry paramsJson ---
    (
        "const p = paramsJson ? (JSON.parse(paramsJson) as Record<string, unknown>) : {};",
        "const p = parseJson<Record<string, unknown>>(paramsJson, {});"
    ),
    # --- procvid ---
    (
        "params: args.paramsJson ? (JSON.parse(args.paramsJson) as Record<string, unknown>) : undefined,",
        "params: parseJson<Record<string, unknown> | undefined>(args.paramsJson, undefined),"
    ),
    # --- cadgeo ptsFrom ---
    (
        "raw ? JSON.parse(raw) as Array<[number, number]> : fallback;",
        "parseJson<Array<[number, number]>>(raw, fallback);"
    ),
    # --- cadgeo bvh ---
    (
        "const boxes = JSON.parse(boxesJson ?? '[]') as cadgeo.BvhBox[];",
        "const boxes = parseJson<cadgeo.BvhBox[]>(boxesJson, []);"
    ),
    (
        "const q = queryJson ? (JSON.parse(queryJson) as cadgeo.BvhBox) : { minX: -1e9, minY: -1e9, maxX: 1e9, maxY: 1e9 };",
        "const q = parseJson<cadgeo.BvhBox>(queryJson, { minX: -1e9, minY: -1e9, maxX: 1e9, maxY: 1e9 });"
    ),
    (
        "const [ox, oy, dx, dy] = JSON.parse(rayJson) as [number, number, number, number];",
        "const [ox, oy, dx, dy] = parseJson<[number, number, number, number]>(rayJson, [0, 0, 1, 0]);"
    ),
    # --- cadgeo quadtree ---
    (
        "const c = queryJson ? (JSON.parse(queryJson) as { cx: number; cy: number; r: number }) : { cx: 1, cy: 1, r: 3 };",
        "const c = parseJson<{ cx: number; cy: number; r: number }>(queryJson, { cx: 1, cy: 1, r: 3 });"
    ),
    # --- evo stats ---
    (
        "const pop = (populationJson ? JSON.parse(populationJson) : [{ genes: [0, 0] }, { genes: [1, 1] }]) as evoDomain.Individual[];",
        "const pop = parseJson<evoDomain.Individual[]>(populationJson, [{ genes: [0, 0] }, { genes: [1, 1] }]);"
    ),
    # --- evo fitness (keep try-catch, just replace JSON.parse inside) ---
    (
        "const parsed = fitnessJson ? (JSON.parse(fitnessJson) as { weights?: number[] }) : {};",
        "const parsed = parseJson<{ weights?: number[] }>(fitnessJson, {});"
    ),
    # --- evo evolve population ---
    (
        "? (JSON.parse(populationJson) as evoDomain.IndividualInput[])\n          : evoDomain.spherePopulation",
        "parseJson<evoDomain.IndividualInput[]>(populationJson, evoDomain.spherePopulation"
    ),
    # --- observability (trace + generation) ---
    (
        "const input = inputJson ? JSON.parse(inputJson) : undefined;\n          const output = outputJson ? JSON.parse(outputJson) : undefined;",
        "const input = parseJson(inputJson, undefined);\n          const output = parseJson(outputJson, undefined);"
    ),
    # --- agentic graph ---
    (
        "const spec = specJson ? JSON.parse(specJson) : { entry: 'start', nodes: [{ id: 'start', kind: 'router' }], edges: [] };",
        "const spec = parseJson<any>(specJson, { entry: 'start', nodes: [{ id: 'start', kind: 'router' }], edges: [] });"
    ),
    # --- agentic crew ---
    (
        "const spec = specJson ? JSON.parse(specJson) : { roles: [{ name: 'researcher', goal: 'investigar' }], tasks: [{ id: 't1', role: 'researcher', objective: 'buscar' }] };",
        "const spec = parseJson<any>(specJson, { roles: [{ name: 'researcher', goal: 'investigar' }], tasks: [{ id: 't1', role: 'researcher', objective: 'buscar' }] });"
    ),
    # --- agentic rag ---
    (
        "const spec = specJson ? JSON.parse(specJson) : { loaders: ['web'], chunk: { size: 1000, overlap: 100 }, embed: 'local', store: 'qdrant' };",
        "const spec = parseJson<any>(specJson, { loaders: ['web'], chunk: { size: 1000, overlap: 100 }, embed: 'local', store: 'qdrant' });"
    ),
    # --- agentic lcel ---
    (
        "const steps = specJson ? JSON.parse(specJson) : [{ kind: 'prompt', name: 'template' }, { kind: 'model', name: 'gpt-4o-mini' }];",
        "const steps = parseJson<any>(specJson, [{ kind: 'prompt', name: 'template' }, { kind: 'model', name: 'gpt-4o-mini' }]);"
    ),
    # --- agentic sandbox ---
    (
        "const spec = specJson ? JSON.parse(specJson) : { lang: 'python', code: 'print(\"hello\")' };",
        "const spec = parseJson<any>(specJson, { lang: 'python', code: 'print(\"hello\")' });"
    ),
    # --- agentic memory ---
    (
        "const spec = specJson ? JSON.parse(specJson) : { kind: 'semantic', query: 'buscar' };",
        "const spec = parseJson<any>(specJson, { kind: 'semantic', query: 'buscar' });"
    ),
    # --- canvas_physics ball ---
    (
        "const ball = ballJson ? JSON.parse(ballJson) : { x: 100, y: 50, vx: 3, vy: 0, r: 12, mass: 1 };",
        "const ball = parseJson(ballJson, { x: 100, y: 50, vx: 3, vy: 0, r: 12, mass: 1 });"
    ),
    # --- chaos attractor (evaluate + trajectory) ---
    (
        "const state = stateJson ? JSON.parse(stateJson) : [0.1, 0, 0];",
        "const state = parseJson(stateJson, [0.1, 0, 0]) as readonly [number, number, number];"
    ),
    # --- publication_queue ---
    (
        "const paquete = JSON.parse(paqueteJson);",
        "const paquete = parseJson<any>(paqueteJson, {});"
    ),
    # --- contenido_generar ---
    (
        "const brief = JSON.parse(briefJson) as import('../tools/topics').TopicBrief;",
        "const brief = parseJson<import('../tools/topics').TopicBrief>(briefJson, {} as import('../tools/topics').TopicBrief);"
    ),
]

count = 0
for old, new in replacements:
    if old in content:
        content = content.replace(old, new, 1)
        count += 1
    else:
        print(f'  MISS: {old[:70]}...')

before_raw = 76  # known count
after_raw = content.count('JSON.parse')

# Count remaining unprotected (not in try/catch, not parseJsonLoose, not parseJson)
lines = content.split('\n')
remaining = []
for i, line in enumerate(lines, 1):
    stripped = line.strip()
    if 'JSON.parse' in stripped and 'parseJson' not in stripped and 'parseJsonLoose' not in stripped:
        remaining.append(f'  L{i}: {stripped[:80]}')

print(f'Replaced: {count}/{len(replacements)} patterns')
print(f'Raw JSON.parse count: {before_raw} -> {after_raw} ({before_raw - after_raw} replaced)')
print(f'Remaining unprotected ({len(remaining)}):')
for r in remaining:
    print(r)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('File written OK')

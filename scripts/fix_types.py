#!/usr/bin/env python3
"""Fix type errors from parseJson by adding explicit type params where needed."""
import re

path = r'C:\Users\UTEC-5695\Desktop\UltraIa\packages\core\src\ai\llm.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# For geometry params - P needs to be Record<string, any>
content = content.replace(
    "const P = parseJson(params, {});",
    "const P = parseJson<Record<string, any>>(params, {});",
    1
)
content = content.replace(
    "const vA = parseJson(A, undefined);",
    "const vA = parseJson<any>(A, undefined);",
    1
)
content = content.replace(
    "const vB = parseJson(B, undefined);",
    "const vB = parseJson<any>(B, undefined);",
    1
)

# videoqa flow - needs typed
content = content.replace(
    "const flow = parseJson(flowJson, {});\n            const mseValue = videoqa.mse",
    "const flow = parseJson<{ flowReference?: number[]; flowDistorted?: number[] }>(flowJson, {});\n            const mseValue = videoqa.mse",
    1
)
content = content.replace(
    "const flow = parseJson(flowJson, {});\n            const umbrales = parseJson(umbralesJson, {});",
    "const flow = parseJson<{ flowReference?: number[]; flowDistorted?: number[] }>(flowJson, {});\n            const umbrales = parseJson<{ psnrMin: number; ssimMin: number; eTotalMax: number }>(umbralesJson, { psnrMin: 40, ssimMin: 0.95, eTotalMax: 0.4 });",
    1
)
content = content.replace(
    "const runner = parseJson(runnerJson, {});",
    "const runner = parseJson<{ model: string; size: string; reference: string; distorted: string; features: ('psnr' | 'ssim' | 'vmaf')[]; ffmpegPath: string }>(runnerJson, { model: 'vmaf-0.6.1', size: '1920x1080', reference: '', distorted: '', features: ['psnr', 'ssim', 'vmaf'], ffmpegPath: 'ffmpeg' });",
    1
)

# publication_queue paquete
content = content.replace(
    "const paquete = parseJson(paqueteJson, {});",
    "const paquete = parseJson<any>(paqueteJson, {});",
    1
)

# agentic graph spec
content = content.replace(
    "const spec = parseJson(specJson, { entry: 'start', nodes: [{ id: 'start', kind: 'router' }], edges: [] });",
    "const spec = parseJson<any>(specJson, { entry: 'start', nodes: [{ id: 'start', kind: 'router' }], edges: [] });",
    1
)
content = content.replace(
    "const spec = parseJson(specJson, { roles: [{ name: 'researcher', goal: 'investigar' }], tasks: [{ id: 't1', role: 'researcher', objective: 'buscar' }] });",
    "const spec = parseJson<any>(specJson, { roles: [{ name: 'researcher', goal: 'investigar' }], tasks: [{ id: 't1', role: 'researcher', objective: 'buscar' }] });",
    1
)

# evo evolve population - parseJson<T|undefined>(x, undefined) ?? default
content = content.replace(
    "parseJson<evoDomain.IndividualInput[] | undefined>(populationJson, undefined)\n          ?? evoDomain.spherePopulation",
    "parseJson<evoDomain.IndividualInput[]>(populationJson, evoDomain.spherePopulation(20, 4, 5, seed ?? 42))",
    1
)

# agentic graph/crew/rag/lcel/sandbox/memory - revert to parseJson<any>
# Already handled above for graph and crew

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Fixed type errors')

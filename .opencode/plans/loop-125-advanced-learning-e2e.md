# Plan — loop-125: modelos de aprendizaje programado + E2E avanzado

## Contexto
El usuario pide (1) "varios modelos de aprendizaje programado e integracion de pensamientos"
que, al crecer, compriman la memoria y creen modelos avanzados para calcular/razonar sobre
**diferencias de pensamiento** y **formas de resolver errores**; y (2) un testeo avanzado tipo
Antigravity (abre la app, la analiza en navegador/emulador/docker) — "dejalo pronto".

## Objetivo
- **Part A — learnModels (core, determinista, keyless):** capability `learnModels` con modelos
  programados (associative/causal/contrastive/compression), integración de "pensamientos",
  compresión de memoria al superar capacidad, contraste entre conjuntos de pensamientos y
  derivación de modelos avanzados de meta-razonamiento para resolver errores.
- **Part B — E2E avanzado "listo":** skill `.opencode/skills/ultraia-e2e`, config MCP
  `.mcp.json` (Playwright) y runner `scripts/e2e-analyze.mjs` (fallback claro si no hay
  navegador). No se ejecuta un navegador real aquí (entorno headless sin Chromium garantizado);
  se deja la funcionalidad cableada y documentada para usarla.

## Archivos a tocar
- `packages/core/src/tools/learn-models.ts` (nuevo)
- `packages/core/src/tools/learn-models.test.ts` (nuevo)
- `packages/core/src/tools/index.ts` (wiring: import, tools, TOOL_DESCRIPTIONS, Capability, export *)
- `.opencode/skills/ultraia-e2e/SKILL.md` (nuevo)
- `.mcp.json` (nuevo)
- `scripts/e2e-analyze.mjs` (nuevo)

## Pasos
1. Crear `learn-models.ts` con: `Thought`/`LearningModel`/`ThoughtDiff`/`Resolution`, hashing
   djb2, `createModel`/`makeThought`/`addThought` (dedup + auto-compress) / `integrateThoughts`
   / `compressModel` / `contrastThoughts` / `resolveErrors` / `spawnAdvancedModel`.
2. Tests deterministas (hash, dedup, compress-on-overflow, contrast, resolveErrors, spawn).
3. Wiring en `index.ts` (Capability `learnModels`, TOOL_DESCRIPTIONS, namespace en `tools`).
4. Part B: SKILL.md + .mcp.json + e2e-analyze.mjs (fail-soft, `node --check`).
5. Gates FULL: typecheck → lint → test → build (matar dev servers antes de build).

## Criterios
- Scoped: tests de `learnModels` PASS.
- FULL: typecheck/lint/test/build verdes.
- Commit único con pathspec.

## Predicción
Gates verdes; `learnModels` añade ~12 funciones puras testeadas; E2E queda "listo" (config + skill
+ runner) sin romper gates. Registro pendiente en `llm.ts` (sesión concurrente lo posee) igual que
`designcompose`.

# Plan loop-124 — Mejora del proyecto completo: Orquestador, Cerebro, Agentes y Modelo de Diseño 2D/3D

## Contexto
El usuario pide: "Actualiza e inicia una mejor para el proyecto completo, centrate en el
orquestador, el cerebro, los agentes y el modelo de diseno 2D e 3D". El repo ya tiene
librerías procedimentales (geometry, generative, sdf, pngrender, procvid, codevfx, imaging)
pero NO un modelo de "diseño" que las componga. Este plan crea ese modelo de diseño
(`designcompose`) y lo cablea en los 4 pilares pedidos, sin tocar el WIP de la sesión
concurrente (connections/*, _diag.ts, llm.ts).

## Objetivo
Crear `designcompose` (modelo determinista keyless de diseño 2D/3D) y wirearlo en:
1. **Orquestador (OMAG)**: nuevo `DesignGeneratorAdapter` registrado en `defaultGenerators()`.
2. **Cerebro**: nuevo paso `create_design` en el plan del ciclo + ejecución real en `cerebro-cycle.ts`.
3. **Agentes**: capacidad `designcompose` (unión Capability + TOOL_DESCRIPTIONS + barrel) + agente `bp-disenador` en seed.
4. **Modelo 2D/3D**: `designcompose.ts` compone `generative` (mandelbrot/flowField) + `geometry`
   (superShape3D/mobiusSurface) → PNG vía `pngrender` (`valuesToRgba`/`renderMeshPng`).

## Archivos a tocar (explícitos)
- NUEVO `packages/core/src/tools/designcompose.ts` — modelo de diseño (2D/3D) + `planDesignBatch`.
- NUEVO `packages/core/src/tools/designcompose.test.ts` — determinismo + PNG válido + batch.
- NUEVO `packages/core/src/omag/design-generator.ts` — `DesignGeneratorAdapter`.
- EDITAR `packages/core/src/omag/generators.ts` — importar + agregar a `defaultGenerators()`.
- EDITAR `packages/core/src/omag/mediafield.ts` — `Modality` += `'design'`.
- EDITAR `packages/core/src/tools/cerebro.ts` — `CerebroStepKind` += `'create_design'` + paso en `planBrainCycle`.
- EDITAR `Task/cerebro-cycle.ts` — importar `designcompose` + `crearDisenos` + llamar en `main`.
- EDITAR `packages/core/src/tools/index.ts` — `Capability` += `'designcompose'` + `TOOL_DESCRIPTIONS.designcompose` + `export * from './designcompose'`.
- EDITAR `packages/core/prisma/seed-data.mjs` — agente `bp-disenador` en `AGENTS`.

## Recursos / Presupuesto
- Sin deps nuevas (todo keyless, determinista, dominio puro + runner fs).
- Sin red. PNG vía encoder puro ya existente.

## NO-hacer
- NO tocar `apps/web/src/app/api/connections/*`, `packages/core/src/_diag.ts`, `packages/core/src/ai/llm.ts` (WIP concurrente).
- NO push (requiere aprobación humana).
- NO `git add .` / `-A`; pathspec explícito por commit.

## Criterios de éxito
- typecheck (core) OK · lint OK · test (core) OK con nuevos tests · build OK.
- `designcompose` determinista (misma semilla → mismos bytes PNG).
- OMAG `defaultGenerators()` incluye el adapter de diseño.
- Cerebro plan incluye paso `create_design`; `cerebro-cycle --plan` lo muestra.
- `bp-disenador` presente en `AGENTS` con caps de diseño.
- `designcompose` es Capability válida y exportada.

## Tolerancias
- Modality 'design' sin switch exhaustivo en el repo (verificado por grep) → seguro.
- `designcompose` no requiere registro en `llm.ts` para compilar (se difiere el wiring de la tool).

## Predicción
Gates FULL verdes tras los edits. Commit único `feat(core): design model 2D/3D + wiring orquestador/cerebro/agentes`.

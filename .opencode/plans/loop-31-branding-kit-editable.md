# Plan loop-31 — AutoPub F3: branding kit editable

## Contexto
- Fuente: AGENTS.md AUTO-PUBLICACIÓN F3 — "Pendiente F3: branding kit editable".
- `present.ts` (tools/present.ts, 256 líneas): `brandingFor(marca?)` solo acepta el NOMBRE
  del kit (`ultrala`/`neo_violet`); el resto de campos (paleta/fuente/logo/acento) son fijos.
- Tool `present_package` en `ai/llm.ts` (líneas 473-487): schema con `marca` pero sin
  personalización del kit.
- Restricción: #25 sigue activo (screenflow/automation/blueprint/reach/shared). NO tocar sus
  archivos. Gates FULL bloqueados → verificación SCOPED (vitest por archivo + tsc parcial con
  tsconfig temporal + eslint scoped). present.ts/present.test.ts/llm.ts NO están en su lista.

## Objetivo
El branding kit pasa a ser EDITABLE: el caller puede sobrescribir cualquier campo del kit
(marca, paleta, fuente, logo, acento) vía merge parcial sobre el kit base (por nombre o
default Dark Obsidian). Aditivo: `brandingFor(marca)` sigue funcionando igual.

## Pasos
1. `packages/core/src/tools/present.ts`:
   - Nuevo tipo `BrandingKitInput = Partial<BrandingKit>`.
   - `brandingFor(marca?, override?: BrandingKitInput)` → `{ ...base, ...override }`.
   - `PresentInput` gana `branding?: BrandingKitInput`.
   - `present()`: `const branding = brandingFor(input.marca, input.branding)`.
   - Export en `presentTools`.
2. `packages/core/src/ai/llm.ts` tool `present_package`:
   - Schema gana `branding` (zod partial, opcional, con límites).
   - execute pasa `branding` a present().
3. `packages/core/src/tools/present.test.ts` (+5 tests):
   - override merge sobre default (acento custom).
   - override de paleta completa.
   - kit por nombre + override parcial (neo_violet + fuente custom).
   - marca custom (no kit) + override → merge sobre default con marca custom.
   - sin branding → default intacto (regresión).
4. Verificación scoped: vitest present.test.ts + tsc parcial (tsconfig temporal %TEMP%) +
   eslint present.ts/present.test.ts. Gates FULL anotados pendientes árbol limpio.

## Archivos a tocar
- packages/core/src/tools/present.ts
- packages/core/src/tools/present.test.ts
- packages/core/src/ai/llm.ts (solo bloque present_package)

## Criterios de éxito
- 13 tests actuales de present + 5 nuevos = 18 PASS.
- tsc parcial: 0 errores en archivos propios (ruido reach/blueprint de #25 permitido y anotado).
- Commit `feat(autopub): branding kit editable...`.

## Riesgos
- llm.ts es archivo compartido pero #25 no lo toca hoy; cambios mínimos y aditivos (schema
  opcional) — sin riesgo de romper su wiring (verificado por tsc parcial).

## Esfuerzo
- Bajo (3 archivos, ~60 líneas + 5 tests).

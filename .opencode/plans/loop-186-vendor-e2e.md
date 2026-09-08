# PLAN: Vendor vibe-coding + content-factory/theatre E2E (tarea #186, prioridad P2)

Fecha: 2026-09-08 · Modo: P-P · Patron: Sensado/Razonamiento/Accion/Ajuste · Presupuesto: ~2h / 30k tokens

## Contexto
- 184 DONE (a09e141, turbo.json + cache 2.65s, 201 pages), 185 DONE (5a84860, Study app real 17 files, 3077 insertions, 3043 tests). WIP restante: vendor/vibe-coding-with-base44 (no analizado, ~2k archivos, licencia por verificar), content-factory.test.ts (7 kinds, ya trackeado pero sin wire E2E), theatre-sequence.ts (untracked) + holagpt-demo.ts (untracked, Task/). Todos en cuarentena en gates previos, pero nunca validados E2E con build real.

## SPEC
- vendor/vibe-coding-with-base44: leer LICENSE/README, listar 5 patrones transferibles, escribir docs/RAZONAMIENTO-VIBE-CODING.md (no copiar codigo, solo principios), decidir: adoptar starter-kits para Builder vs descartar.
- content-factory: validar `content-factory.test.ts` 7 kinds (web/video/game/app/image/audio/music) con mocks keyless, sin red, determinista.
- theatre-sequence: validar determinismo JSON (mismo input -> mismo output) para 3 tracks, sin red.
- holagpt-demo.ts: `vite-node Task/holagpt-demo.ts --dry-run` debe generar 7 artifacts sin key, sin romper gates.

## DESIGN
- Analisis vendor: `learning/sources/vibe-coding-with-base44.md` crudo + `docs/RAZONAMIENTO-VIBE-CODING.md` (tabla patrones / decision).
- Tests: `vitest run content-factory.test.ts theatre-sequence.test.ts` scoped, `vite-node Task/holagpt-demo.ts --dry-run` para E2E.
- No tocar `holagpt.ts` (ya wireado), solo validar.

## LEARN
- Lecciones 120-134 (lab/cloud), 44-62 (export *), 79-85 (node:*), 54 (quarentena).
- Truth: `truth_tecno_recursos.json` 9/9 (Veo/Seedance), `truth_web_browse_repos.json` 10/10.

## TEST
- Scoped: `vitest 7+3` para content-factory + theatre, `vite-node` dry-run 7 artifacts.
- FULL: typecheck 0, lint 0, test 3043+10, build 201 pages (con .next limpio), harness 30/30.

## MEJORAS A ADICIONAR
- Razonamiento vendor documentado, no codigo copiado.
- Validacion E2E keyless para factory/theatre/holagpt-demo.
- Limpieza: `content-factory.test.ts` movido a `src/tools/` ya, `theatre-sequence.ts` wireado.

## TECNOLOGIAS EVALUADAS
- vendor/vibe-coding-with-base44 (MIT? por verificar) vs holagpt/theatre ya adoptados. Decision: adoptar patrones de prompts para Builder, descartar runtime (ya tenemos OMAG).

## Objetivo
- Validar vendor sin copiar, y E2E factory/theatre/holagpt-demo en verde, sin romper gates.

## Pasos
1. Leer vendor/vibe-coding-with-base44/README.md + LICENSE, escribir learning/sources/vibe-coding-with-base44.md + docs/RAZONAMIENTO-VIBE-CODING.md
2. Scoped vitest content-factory + theatre
3. vite-node Task/holagpt-demo.ts --dry-run
4. FULL gates con cuarentena minima (solo vendor como docs, no codigo)
5. Commit pathspec (docs + vite-node demo si es nuevo)

## Archivos a tocar
- `learning/sources/vibe-coding-with-base44.md` — NUEVO
- `docs/RAZONAMIENTO-VIBE-CODING.md` — NUEVO
- `Task/holagpt-demo.ts` — validar (no tocar si ya verde)
- `packages/core/src/tools/theatre-sequence.ts` — ya existe como ??, wirear si falta (pero ya wireado en index.ts)
- `packages/core/src/tools/content-factory.test.ts` — ya existe, solo validar

## RECURSOS / PRESUPUESTO
- 2h, 30k tokens, vitest, vite-node, docs-only + scoped.

## NO-hacer
- No copiar codigo de vendor (solo principios), no tocar holagpt.ts, no romper gates, no push.

## Criterios
- Scoped: vitest content-factory 7/7 + theatre 3/3 + holagpt-demo dry-run 7 artifacts
- FULL: typecheck 0/lint 0/test 3043+10/build 201/harness 30/30

## TOLERANCIAS
- Si vendor es AGPL/privado, descartar y documentar, no wirear.

## Riesgos
- Vendor con licencia restrictiva -> descartar.

## Esfuerzo
- Bajo — analisis + validacion E2E, sin codigo nuevo pesado.

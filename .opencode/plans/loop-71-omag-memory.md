# Plan loop-71 — Conectar memoria experiencial (semantic_memory) al orquestador OMAG

## Contexto
Iteraciones 69-70 entregaron la capability `semantic_memory` (tool `memory_search` + dominio
puro) y la activaron en los agentes bp-* (seeds). El diseño SACD/NASA pone la **memoria
experiencial consultada ANTES de planear** en el centro del orquestador ("el orquestador
consulta lecciones verificadas y las usa como contexto"). Hoy `OmagOrchestrator.run` planea
con `adaptToMediaPlan(idea)` SIN memoria: el gap conceptual del diseño sigue abierto en el
código que ejecuta la creación.

## Objetivo
Iteración 71: `OmagRequest` gana `memory?: { corpus?: TruthFileLike[]; hits?: number }`
(retrocompatible: ausente → sin cambio de comportamiento). En `run()`, si hay corpus:
`loadTruthCorpus` + `searchTruth(idea, k)` → hits, que se (a) registran en `WorkingMemory`
(nuevo `setHits/getHits`), (b) se inyectan como contexto al Director
(`adaptToMediaPlan(..., { memoryContext })` → `DIRECTOR_SYSTEM_PROMPT` con sección de
memoria verificada), (c) se exponen en `OmagResult.memoryHits` y en `field.metadata.memory`.
Sin tocar el núcleo de generación ni los críticos.

## Pasos
1. Plan file (este).
2. `packages/core/src/omag/memory.ts` — `WorkingMemory` gana `hits: MemoryHit[]` +
   `setHits(hits)` / `getHits()` (clone defensivo).
3. `packages/core/src/prompt/director.ts` — `DIRECTOR_SYSTEM_PROMPT(languages, memoryContext?)`
   con sección opcional "Verified memory (use as context, do not contradict)" +
   `adaptToMediaPlan(prompt, { gateway, model, memoryContext? })` la propaga.
4. `packages/core/src/omag/orchestrator.ts` — `OmagRequest.memory?`, `OmagResult.memoryHits?`
   (retrocompatible), import de `loadTruthCorpus`/`searchTruth`/tipos desde
   `../tools/semantic-memory`; en `run()`: corpus → hits → working.setHits →
   `adaptToMediaPlan(idea, { gateway, memoryContext })` → `field.metadata.memory = hits` →
   incluir `memoryHits` en ambos returns.
5. Tests `orchestrator.test.ts` +2/+3: (a) con corpus → `memoryHits.length >= 1`, score > 0,
   `working.getHits()` poblado, `field.metadata.memory` presente, orden por score desc;
   (b) sin `memory` → comportamiento idéntico (sin hits, sin error); (c) corpus vacío →
   hits []. Tests `prompt.test.ts` +1: `DIRECTOR_SYSTEM_PROMPT` con memoryContext incluye la
   sección y sin él no.
6. Gates FULL en orden CI: typecheck → lint → test → build (matar node + .next antes del
   build). El worktree llm.ts/index.ts es WIP ajeno — NO tocar (la capability ya está
   commiteada en 26aacc0/eff71d9; este ciclo no toca wiring).
7. Evidencia: fila 71 en STATE.md, entrada en loop-run-log.md, lección en LEARNINGS si aplica.
8. Commit con pathspec (NUNCA `git add .`) + restaurar cuarentena si se usó.

## ARCHIVOS A TOCAR
- .opencode/plans/loop-71-omag-memory.md (nuevo)
- packages/core/src/omag/memory.ts (WorkingMemory +hits)
- packages/core/src/prompt/director.ts (memoryContext en system prompt + opts)
- packages/core/src/omag/orchestrator.ts (request/result/run con memoria)
- packages/core/src/omag/orchestrator.test.ts (+tests memoria)
- packages/core/src/prompt/prompt.test.ts (+test system prompt con memoria)
- STATE.md, loop-run-log.md (evidencia)

## NO-hacer
- NO tocar llm.ts/index.ts (WIP ajeno creativo en el worktree).
- NO tocar WIP ajeno: creativo.ts, creativo.test.ts, automation.ts, recorder.ts,
  media-synthesis/*, reach.ts, topics.ts, present.ts, enrutador.ts, motion.test.ts,
  publish.test.ts (D staged), reach.test.ts (D staged), vfx-generator.test.ts (D staged),
  .env*, DOCS_TODO.md, docs de #25.
- NO cambiar la firma de run() de forma rompedora (memoria OPCIONAL).
- NO `git add .` ni `-A`. NO push/merge. NO instalar deps. NO migraciones.

## Criterios
- Scoped: vitest orchestrator.test.ts + prompt.test.ts PASS con los nuevos casos.
- FULL: npm run typecheck → npm run lint → npm run test → npm run build, TODOS verdes.
- Commit 1 solo, mensaje `feat(omag): memoria experiencial en el orquestador (iter-71)`.

## TOLERANCIAS / RIESGOS
- El corpus en tests es embebido (determinista, sin red): casos con overlap léxico claro
  ("mujer camina calle lluviosa" ↔ "motocicleta pasa").
- WorkingMemory.set() clona field — añadir hits como campo propio NO afecta set/get.
- field.metadata es Record<string, unknown> — asignar `memory` no rompe parse/serialize.
- Retrocompatibilidad: OmagResult.memoryHits OPCIONAL (ausente si no hay request.memory) —
  los tests existentes (187) no cambian.
- PS 5.1: NO Set-Content sobre archivos del repo (usar tool Edit/Write).

## Esfuerzo / Prioridad
- Prioridad P2 (cierre del gap conceptual SACD en el ejecutor real). Esfuerzo: 1 ciclo.
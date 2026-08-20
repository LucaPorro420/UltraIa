# Plan loop-70 — Activar capability `semantic_memory` en agentes bp-* (cierre SACD)

## Contexto
La iteración 69 entregó la capability `semantic_memory` (tool `memory_search`, wiring
commiteado en 26aacc0) + docs + infra Docker de referencia. Pendiente documentado en
`docs/RAZONAMIENTO-SACD.md` §5: "conectar memory_search al flujo bp-*". El diseño SACD/NASA
pone la recuperación semántica de la memoria experiencial en el centro del orquestador y de
los agentes que consultan verdad.

Patrón establecido `b619be5`: "bp-guionista +motion, bp-analista +videoqa, bp-publicador
+videoqa, bp-orquestador +sdf/videoqa/motion/replica (seed-admin hereda automaticamente con
+skills/content/memory; una sola fuente en seed-data.mjs)". La DB actual tiene 16 versiones
(8 blueprints bp-admin-* x 2 tablas) y el orquestador 11 caps.

## Objetivo
Iteración 70: activar `semantic_memory` en los agentes bp-* que consultan verdad/memoria
(investigador, analista, orquestador) editando UNA sola fuente (`seed-data.mjs`), re-correr
el seed admin y verificar en la DB real (patrón b619be5: "Verificado en DB"). Commiteado con
pathspec; sin tocar TS (el wiring ya está en 26aacc0).

## Pasos
1. Plan file (este).
2. `packages/core/prisma/seed-data.mjs` — añadir `semantic_memory` a caps de:
   - bp-investigador: `['web', 'semantic_memory', 'chat']`
   - bp-analista: `['web', 'videoqa', 'semantic_memory', 'chat']`
   - bp-orquestador: `['web', 'image', 'video', 'music', 'design', 'branding', 'sdf',
     'videoqa', 'motion', 'replica', 'semantic_memory', 'chat']`
   (seed-admin.mjs hereda automáticamente: `[...a.caps, 'skills', 'content', 'memory']` →
   los 8 bp-admin-* quedan con la capability; verificación en DB.)
3. Verificación DB real: `node packages/core/prisma/seed-admin.mjs` (dev.db existente) +
   query Prisma: agentVersion.tools contiene 'semantic_memory' en bp-admin-investigador,
   bp-admin-analista, bp-admin-orquestador; el resto sin la cap (no regresión).
4. Gates FULL en orden CI (typecheck → lint → test → build). OJO: el worktree llm.ts es el
   WIP ajeno (creativo, SIN memory_search) — el wiring vive solo en 26aacc0; los gates no
   dependen del seed. Matar node + quitar .next antes del build.
5. Evidencia: fila 70 en STATE.md, entrada en loop-run-log.md, lección en LEARNINGS si aplica.
6. Commit con pathspec (NUNCA `git add .`) + restaurar cuarentena si se usó.

## ARCHIVOS A TOCAR
- .opencode/plans/loop-70-semantic-memory-seeds.md (nuevo)
- packages/core/prisma/seed-data.mjs (caps +semantic_memory en 3 agentes)
- STATE.md (fila 70), loop-run-log.md (entrada iter-70), learning/LEARNINGS.md (si aplica)

## NO-hacer
- NO tocar llm.ts/index.ts (WIP ajeno creativo en el worktree; mi wiring ya está en 26aacc0).
- NO tocar WIP ajeno: creativo.ts, creativo.test.ts, automation.ts, recorder.ts,
  media-synthesis/*, reach.ts, topics.ts, present.ts, enrutador.ts, motion.test.ts,
  publish.test.ts (D staged), reach.test.ts (D staged), .env*, DOCS_TODO.md, docs de #25.
- NO `git add .` ni `-A`. NO push/merge. NO instalar deps. NO tocar el orquestador OMAG.
- NO ejecutar migraciones (no hay cambio de schema).

## Criterios
- Scoped: seed-admin corre OK + query DB muestra semantic_memory en los 3 bp-admin-* esperados
  y ausente en los demás.
- FULL: npm run typecheck → npm run lint → npm run test → npm run build, TODOS verdes.
- Commit 1 solo, mensaje `feat(core): activar capability semantic_memory en agentes bp-* (iter-70)`.

## TOLERANCIAS / RIESGOS
- seed-admin.mjs usa PrismaClient contra dev.db — si la DB no está migrada, correr
  `npm run db:migrate` primero (verificado: dev.db existe en packages/core/prisma/).
- El orquestador pasa de 11 a 12 caps — verificar que seed-admin no duplique (Set ya
  existe: `[...new Set([...a.caps, 'skills', 'content', 'memory'])]`).
- WIP ajeno llm.ts: NO tocar; documentar que el runtime actual (dev server) NO expone
  memory_search hasta que se resuelva el merge de llm.ts (pendiente sesión ajena).
- PS 5.1: NO Set-Content sobre archivos del repo.

## Esfuerzo / Prioridad
- Prioridad P2 (cierre del pendiente SACD, patrón ya establecido). Esfuerzo: 1 ciclo corto.
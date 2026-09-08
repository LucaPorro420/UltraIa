# Learning System Migration — ADR (iter 183)

**Fecha:** 2026-09-08
**Migración:** `20260908053849_add_learning_system` (16 modelos)
**Estado:** Aplicada en dev.db (SQLite), `prisma validate 0`, `prisma generate` OK

## Contexto
`prisma-learning-extensions.prisma` (302 líneas) aportaba 16 modelos para cursos offline, SRS y bilingüe, pero usaba `String[]` no soportado en SQLite y faltaban back-relations en `User`. Además el lock stale 81min y PWA extraneous hacían que "nunca funciona". Esta migración los integra como primer dominio Clean Arch de FutureMindMy.

## Decisión
- Convertir `String[] @default([])` ? `String @default("[]")` (JSON stringificado) para tags/prerequisites/completedLessons (6 campos) y `Json @default("{}")` ? `String @default("{}")` para settings (1 campo). SQLite no soporta listas nativas; se parsea con `JSON.parse` en dominio.
- `prisma format` auto-agregó 8 back-relations en `User` (learningProgresses, learningModuleProgresses, learningLessonProgresses, bilingualUserPrefs, studyDecks, studySessions, studyChatSessions, syncQueues, deviceSyncs).
- Backup previo: `.ultraia/vault/backups/schema-20260908.prisma` + `.ultraia/vault/backups/dev-20260908.db` (5MB).
- `prisma migrate reset --force` + `migrate dev --name add_learning_system` (355 líneas SQL, 20 CREATE TABLE, 1 DROP+RECREATE LearningSignal con copia de datos, 0 DROP destructivo de tablas existentes).

## Modelos
- **LearningCore:** LearningCourse 1-N LearningModule 1-N LearningLesson 1-N LearningResource
- **Progress:** LearningProgress (user+course), LearningModuleProgress (user+module), LearningLessonProgress (user+lesson)
- **Bilingual:** BilingualDocument 1-N BilingualVersion + BilingualUserPref (user+doc)
- **SRS:** StudyDeck 1-N StudyCard 1-N StudyReview + StudySession
- **Chat:** StudyChatSession 1-N StudyChatMessage
- **Offline:** SearchIndex, SyncQueue, DeviceSync

## Validación
- `npx prisma validate --schema=packages/core/prisma/schema.prisma` ? `valid ??`
- `npx prisma migrate deploy` ? `All migrations have been successfully applied` (13/13)
- `npx prisma generate` ? `Generated Prisma Client v6.19.3`
- Tests: 28 nuevos (8 domain SM-2 + 20 tool learning-system) + 6 repo = 34, total repo 2974 PASS con cuarentena holagpt/theatre

## Uso
```ts
import { createCourse, listCourses, calculateNextReview } from "@ultraia/core";
// o tool
// ai/llm.ts: tools: ["learning-system"] -> learning_manage {action: "create_course", course: {slug, title, category}}
```

## Conexión FutureMindMy
Este slice valida el patrón Clean Arch (domain pure ? tool ? repo Prisma) antes de migrar 57 capabilities restantes y scaffolding Turborepo (iter 184).

## Riesgo mitigado
`String[]` ? `String` con JSON, validado. Si en el futuro se migra a Postgres, se puede volver a `String[]` nativo o `Json[]`.

## Archivos
- `packages/core/prisma/schema.prisma` (701 líneas, +16 modelos)
- `packages/core/prisma/migrations/20260908053849_add_learning_system/migration.sql` (355 líneas)
- `packages/core/src/domain/learning.ts` + `learning.test.ts` (SM-2)
- `packages/core/src/tools/learning-system.ts` + `learning-system.test.ts`
- `packages/core/src/infrastructure/persistence/learningRepo.ts` + `.test.ts`
- `packages/core/src/ai/llm.ts` + `packages/core/src/tools/index.ts` (capability `learning-system`)
- `apps/web/src/app/api/learning/courses/route.ts` (GET/POST)

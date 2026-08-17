# loop-39-publication-telegram-channel

**Estado**: DONE (commit pendiente de gates)

## Contexto
Iteración 37 dejó el adapter Telegram (`createTelegramAdapter`) + wiring en `publish_submit`,
pero la COLA Publication (AutoPub F4) no conocía el canal `telegram`: `TopicChannel`,
`PresentChannel`, `CANALES_CON_APROBACION`, `publishDue` y el endpoint API solo soportaban
`youtube_shorts | tiktok | instagram | blog`. La sesión concurrente usó el número 38
(loop-38-tiktok-studio-edition, archivos ajenos vfx/higgsfield — NO tocar).

## Objetivo
Canal `telegram` en el pipeline completo F1→F4: topics → present → cola → calendario → endpoint.

## Pasos (todos aplicados)
1. `topics.ts`: `TopicChannel` + `'telegram'`.
2. `present.ts`: `FORMAT_BY_CHANNEL.telegram` ('9:16 video'), `HORARIO_SUGERIDO.telegram`
   ('mar/jue/sab 18:00'), hashtags base telegram, `captionFor` case telegram (cap 1000),
   `visualFor` case telegram (9:16, sin srt).
3. `publications.ts`: `CANALES_CON_APROBACION` + telegram (video → DRAFT humano);
   `publishDue` con `includeTelegram: true`.
4. `apps/web/src/app/api/publications/route.ts`: `CANALES` + telegram.
5. `prisma/schema.prisma`: comentarios de canal actualizados (String, sin migración).
6. Tests: present.test (1 nuevo: paquete telegram), publications.test (2 nuevos:
   aprobación + createPublication DRAFT canal telegram).
7. Docs: bitácora iteración 39 + fila STATE.md + AGENTS.md sección telegram.

## Archivos a tocar
- packages/core/src/tools/topics.ts
- packages/core/src/tools/present.ts
- packages/core/src/domain/publications.ts
- packages/core/src/domain/publications.test.ts
- packages/core/src/tools/present.test.ts
- apps/web/src/app/api/publications/route.ts
- packages/core/prisma/schema.prisma
- STATE.md, loop-run-log.md, AGENTS.md

## Criterios scoped
- vitest: topics + present + publications + publish + telegram + enrutador (regresión) PASS
- tsc scoped EXIT 0 (solo ruido reach.ts #25)
- eslint EXIT 0
- FULL gates: bloqueados por árbol sucio #25 (documentado)

## Riesgos
- `Record<PresentChannel, ...>` exhaustivos → TS exige la rama telegram (cubierto).
- Sin migración: `canal` es String en Prisma.

## Esfuerzo
Iteración 39, 1 commit.
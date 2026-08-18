# loop-41-discord-slack-adapters

**Estado**: DONE (commit pendiente de gates)

## Contexto
Iteración 37 trajo Telegram (APIS-GRATIS-2026.md: Discord/Slack también gratis). La sesión
concurrente usó el número 40 (F5 analytics, `5afe2f7`, tocó metrics.ts + llm.ts + index.ts —
sin conflicto con mis archivos; llm.ts/index.ts quedaron LIMPIOS). Esta iteración es la 41.
`index.ts` reexporta `export * from './publish'` → los nuevos adapters quedan visibles sin
tocarlo.

## Objetivo
Adapters Discord + Slack (PublisherAdapter) + canal en la cola Publication (aprobación DRAFT),
sin tocar llm.ts/index.ts.

## Pasos
1. `tools/discord.ts` (NUEVO): `createDiscordAdapter` — webhook URL (env DISCORD_WEBHOOK_URL),
   multipart (buildMultipartBody de telegram.js) con `file` + `payload_json`, límite 10 MiB
   (gratis), caption cap 2000, 204 → ok, fail-soft.
2. `tools/slack.ts` (NUEVO): `createSlackAdapter` — bot token (env SLACK_BOT_TOKEN) + channel
   (env SLACK_CHANNEL), POST https://slack.com/api/files.upload (multipart file+channels+title,
   Bearer), límite 1 GiB, caption cap 4000, responde JSON {ok,error,file} → fail-soft.
3. `publish.ts`: union `PublishPlatform` + 'discord' | 'slack' + `createDefaultPublishers`
   ({includeDiscord, includeSlack}) + namespace publish + re-export.
4. `publications.ts`: CANALES_CON_APROBACION + discord/slack (video → DRAFT); publishDue con
   includeDiscord/includeSlack.
5. Tests: discord.test.ts (~14), slack.test.ts (~14), publications.test +1.
6. Docs: bitácora iteración 40 + fila STATE.md + AGENTS.md sección.

## Archivos a tocar
- packages/core/src/tools/discord.ts (NUEVO) + discord.test.ts (NUEVO)
- packages/core/src/tools/slack.ts (NUEVO) + slack.test.ts (NUEVO)
- packages/core/src/tools/publish.ts
- packages/core/src/domain/publications.ts (+ test)
- STATE.md, loop-run-log.md, AGENTS.md

## DIFERIDO (High Priority)
- llm.ts tool `publish_submit` toDiscord/toSlack + exports en index.ts — AHORA llm.ts está
  limpio (committeado por la sesión concurrente en 5afe2f7) → wiring posible en próxima
  iteración sin choque.

## Criterios scoped
- vitest: discord + slack + publish + telegram + publications + present/topics regresión PASS
- tsc scoped 0 propios (solo ruido reach.ts #25)
- eslint EXIT 0

## Riesgos
- buildMultipartBody/truncateCaption importados de telegram.js (sin ciclo: telegram importa
  type-only de publish).
- Discord responde 204 sin cuerpo → no parsear JSON.
- Slack files.upload: initial_comment cap 4000 (2000 antes) — fail-soft si error.

## Esfuerzo
Iteración 40, 1 commit.
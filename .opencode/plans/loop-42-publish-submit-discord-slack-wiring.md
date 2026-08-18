# loop-42-publish-submit-discord-slack-wiring

**Estado**: DONE (commit pendiente de gates)

## Contexto
Iteración 41 dejó diferido el wiring de la tool `publish_submit` (toDiscord/toSlack) porque
la sesión concurrente podía tocar llm.ts. Ella committeó F5 analytics (`5afe2f7`: metrics +
llm.ts + index.ts) → llm.ts/index.ts quedaron LIMPIOS → wiring posible sin choque.

## Objetivo
Cerrar el diferido: tool `publish_submit` con toDiscord/toSlack + descriptor actualizado.

## Pasos (aplicados)
1. `llm.ts`: publish_submit — description con Discord/Slack + params `toDiscord`/`toSlack`
   (z.boolean().optional()) + ramas switch `'discord'`/`'slack'` + `createDefaultPublishers`
   con includeDiscord/includeSlack.
2. `index.ts`: descriptor TOOL_DESCRIPTIONS.publish actualizado (8 plataformas).
3. `enrutador.ts`: fix TS2739 propio descubierto en tsc scoped — CTA_BY_CANAL (es/ar) ahora
   incluye telegram/discord/slack (records exhaustivos de TopicBrief['canal']).

## Archivos a tocar
- packages/core/src/ai/llm.ts
- packages/core/src/tools/index.ts
- packages/core/src/tools/enrutador.ts
- STATE.md, loop-run-log.md, AGENTS.md

## Criterios scoped
- vitest 175/175 (8 archivos, regresión)
- tsc scoped 0 propios (solo ruido reach.ts #25)
- eslint EXIT 0 (apps/web no tocado — verificación por tsc)

## Riesgos
- Sin migración; canal String. Sin choque con #25 (llm.ts/index.ts limpios verificados antes
  de editar).

## Esfuerzo
Iteración 42, 1 commit.
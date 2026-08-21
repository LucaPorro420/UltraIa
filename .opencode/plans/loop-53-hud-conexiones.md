# Plan Iteración 53 — HUD + Conexiones (Fase 1-2: Core + Facebook Adapter)

## Contexto
AutoPub 9/9 canales funcionan (YT/TikTok/X/IG/Threads/LinkedIn/Telegram/Discord/Slack) pero tokens solo en `.env`. No hay Facebook Pages. Usuario quiere HUD para verificar acciones + gestionar conexiones con OAuth + paste-token.

## Objetivo iteración 53
1. Modelo Prisma `ChannelConnection` + migración `add_channel_connection`
2. Dominio `connections.ts`: cifrado AES-256-GCM, CRUD enmascarado, test conexión, resolver tokens DB→env
3. Tests `connections.test.ts` (~10)
4. Adapter Facebook Pages (`createFacebookAdapter`) + canal `facebook` en pipeline
5. Tests facebook (~8)

## Archivos a tocar
- `packages/core/prisma/schema.prisma`
- `packages/core/src/domain/connections.ts` (NUEVO)
- `packages/core/src/domain/connections.test.ts` (NUEVO)
- `packages/core/src/tools/publish.ts` (FB adapter + union + createDefaultPublishers)
- `packages/core/src/tools/present.ts` (canal facebook)
- `packages/core/src/domain/publications.ts` (CANALES_CON_APROBACION + publishDue resolver)
- `packages/core/src/tools/publish.test.ts` (tests FB)
- `packages/core/src/index.ts` (export connections)

## Criterios DONE
- `npm run typecheck` EXIT 0
- `npm run lint` EXIT 0
- `npm run test` (core + runtime, con cuarentena 3 tests #25) — 100% PASS
- `npm run build` EXIT 0 (matar node + limpiar .next antes)
- Commit único `feat(conexiones): ChannelConnection + Facebook adapter + dominio conexiones` + push

## Riesgos
- Sesión #25: llm.ts/index.ts sucios → wiring llm.ts diferido
- CONNECTIONS_SECRET obligatorio para persistir tokens (dev: clave efímera + aviso)

## Bitácora
- P: plan creado
- I: implementación fases 1-2
- V: gates FULL
- R: cierre + siguiente iteración (API OAuth)
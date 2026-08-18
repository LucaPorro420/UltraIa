# loop-44-canales-config

**Estado**: DONE (commit pendiente de gates)

## Contexto
AutoPub F4/F5 completó 8 plataformas (iteraciones 37-42). Falta la guía operativa de
configuración (cómo obtener cada token y probar). El árbol de la sesión concurrente sigue
sucio (18 archivos) → FULL bloqueado; esta iteración es 100% docs + .env.example
(verificado limpio, sin tocar por #25).

## Objetivo
`docs/CANALES-CONFIG-2026.md` + `.env.example` raíz con las 13 variables de los 8 canales
+ actualización de AGENTS.md/STATE.md/bitácora.

## Pasos (aplicados)
1. `.env.example` raíz: sección AutoPub con las 13 variables exactas (verificadas contra
   `process.env.*` de publish.ts/telegram.ts/discord.ts/slack.ts: YOUTUBE_ACCESS_TOKEN,
   TIKTOK_ACCESS_TOKEN, X_ACCESS_TOKEN — sin secrets, IG_ACCESS_TOKEN/IG_USER_ID,
   THREADS_ACCESS_TOKEN/THREADS_USER_ID, TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID,
   DISCORD_WEBHOOK_URL, SLACK_BOT_TOKEN/SLACK_CHANNEL).
2. `docs/CANALES-CONFIG-2026.md` (NUEVO): tabla resumen + paso a paso por canal + cómo
   probar (API cola / tool publish_submit / adapter aislado con vite-node) + regla de
   aprobación + pendientes.

## Archivos a tocar
- .env.example
- docs/CANALES-CONFIG-2026.md (NUEVO)
- AGENTS.md, STATE.md, loop-run-log.md

## Criterios scoped
- Docs: sin gates de código. Verificación: git diff sin corrupción UTF-8 (tool Edit).
- tsc/lint no aplican (sin .ts tocados).

## Riesgos
- Ninguno de código. NO tocar DOCS_TODO.md (de la sesión concurrente).

## Esfuerzo
Iteración 44, 1 commit.
# RAZONAMIENTO — OpenClaw → adapter Telegram + lista de APIs gratis (enlaces.txt)

> Fuentes: `learning/sources/openclaw.md` (README + .env.example, MIT, ~387k stars) +
> websearch 2026 (Telegram Bot API pricing, WhatsApp Cloud API pricing).
> Port: `packages/core/src/tools/telegram.ts` — `createTelegramAdapter` (iteración 37).
> Pedido del usuario: "Adiciona la lista api que verifiques son gratuitas y sirven al
> proyecto para avanzar" → `docs/APIS-GRATIS-2026.md`.

## Análisis

**OpenClaw** valida tres decisiones ya tomadas en UltraIa y aporta una:

1. **Gateway local + token + loopback** — OpenClaw tiene exactamente el mismo diseño que la
   Fase B de `packages/runtime` (token auto-generado, rechazo de placeholders, loopback por
   defecto, tratar entrada como no confiable, emparejamiento por aprobación). Confirmación
   externa del patrón; no requiere cambio.
2. **Canales de mensajería = superficie de distribución** — Telegram/Discord/Slack/WhatsApp
   son canales de primera clase para un asistente personal. AutoPub (F4) distribuye a
   plataformas de video (YouTube/TikTok/X/Meta) pero **no tiene un canal de mensajería
   gratis sin OAuth ni app review**. Telegram es ese canal: bot token (sin aprobación),
   API 100% gratis (verificado 2026), video hasta 50MB, storage gratis con file_id.
3. **Skills/Plugins** — el modelo "plugin SDK + marketplace" de OpenClaw (ClawHub) equivale
   a las capabilities del repo (`tools/*` + registry `ai/llm.ts`) + `harness.defineSeam`.
4. **Model provider rotación** (claves `_1.._N`/`_KEYS`) — patrón útil para los agentes
   admin cuando haya múltiples claves; hoy `resolveModel()` usa una por proveedor.

**WhatsApp** fue descartado con datos: marketing $0.025/msg (US), free tier deprecado,
solo service messages gratis. Telegram es estrictamente superior para distribución
proactiva de contenido.

## Mapeo implementado (port ORIGINAL, dominio puro determinista)

| Principio OpenClaw | Port UltraIa |
|---|---|
| Canal Telegram (`TELEGRAM_BOT_TOKEN`) | `createTelegramAdapter` — implementa `PublisherAdapter` (publish/validate fail-soft, fetch inyectable, env `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID`) |
| Subida de archivos 50MB | Cap de 50MB en `publish` con reason clara (Telegram API: video hasta 50MB, foto 10MB) |
| Rate limits (30/1/20 msg) | Manejo 429 → reason con `retry_after` (fail-soft, nunca lanzar) |
| Caption/texto truncado | Caption bilingüe es/ar truncada a 1024 chars (límite Telegram) |
| Multipart sin deps | Body multipart construido manualmente (boundary + CRLF) — funciona con cualquier fetch (tests con mock) |
| Lista de APIs gratis | `docs/APIS-GRATIS-2026.md` (verificado 17/08/2026 con websearch) |

Wiring (union `PublishPlatform` + `createDefaultPublishers` + tool en llm.ts/index.ts):
**DIFERIDO** — la sesión concurrente #25 está editando publish.ts/llm.ts/index.ts (wiring
Meta); precedente cloud (7315d4d) hizo el wiring post-#25. Documentado en High Priority.

## Verificación

- Vitest scoped: telegram.test.ts verde (mocks, cero llamadas reales).
- tsc parcial: 0 errores propios (ruido preexistente reach.ts de #25).
- eslint: 0 issues.
- FULL pendiente árbol limpio (#25 activo), igual que iteraciones 29-36.

## Pendiente

- Wiring del canal `telegram` en la cola Publication (union + publishDue + tool
  `publish_submit` toTelegram) — tras #25.
- Adapters `discord`/`slack` (mismo patrón, tokens del .env de OpenClaw) — cuando se pidan.
- Verificar TikTok @studioeditionoficial (enlaces.txt 811, pendiente).
- Rotación de claves de modelo (`_KEYS`) para los agentes admin — backlog.
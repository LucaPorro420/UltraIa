# Plan loop-37 — Capability Telegram adapter (enlaces.txt → openclaw)

## Contexto

- El usuario dejó nuevas URLs en enlaces.txt: `github.com/openclaw/openclaw` (809) con pedido
  explícito: **"Adiciona la lista api que verifiques son gratuitas y sirven al proyecto para
  avanzar"**; post de Facebook (807) → HTTP 400 anti-bot (solo referencia); TikTok
  @studioeditionoficial (811) → pendiente de verificar.
- OpenClaw (MIT, ~387k stars, "your assistant on your devices, in your chats") = agente
  personal con Gateway local + canales de mensajería (Telegram/Discord/Slack/WhatsApp/Signal/
  iMessage). Su `.env.example` confirma: `TELEGRAM_BOT_TOKEN`, `DISCORD_BOT_TOKEN`,
  `SLACK_BOT_TOKEN`, model providers (OpenAI/Anthropic/Gemini/OpenRouter), tools
  (Brave/Perplexity/Firecrawl/ElevenLabs).
- Verificación websearch 2026: **Telegram Bot API es GRATIS total** (sin límites de mensajes,
  sin tarjeta, uso comercial explícito, video hasta 50MB, fotos 10MB, storage gratis con
  file_id; rate: 30 msg/s usuarios distintos, 1 msg/s mismo usuario, 20 msg/min grupo).
  **WhatsApp Cloud API NO es gratis para publicación proactiva** (marketing $0.025/msg US,
  free tier 1000 conversaciones/mes DEPRECADO, solo service messages en ventana 24h gratis).
- AutoPub (F4) tiene la cola `Publication` + `PublisherAdapter` (publish/validate fail-soft) +
  canales youtube/tiktok/x/instagram/threads. **Falta un canal 100% gratis sin OAuth ni app
  review**: Telegram es el candidato ideal (bot token por @BotFather, cero aprobación).

## Objetivo

1. `learning/sources/openclaw.md` — fuente cruda compacta (README + .env.example).
2. `docs/APIS-GRATIS-2026.md` — la LISTA de APIs gratuitas verificadas (pedido del usuario):
   Telegram (gratis total), Discord webhooks (gratis), Slack (gratis bots), WhatsApp
   (NO recomendado, justificado), + keyless ya integradas (pollinations, edge-tts, Tunetank,
   DuckDuckGo, r.jina.ai, Exa) + límites verificados 2026 con fuentes.
3. `docs/RAZONAMIENTO-OPENCLAW.md` — análisis + mapeo (Gateway local = Fase B Local API del
   runtime; canales = AutoPub; skills/plugins = capabilities).
4. **`packages/core/src/tools/telegram.ts` (NUEVO)** — `createTelegramAdapter` implementando
   la interfaz `PublisherAdapter` (publish/validate fail-soft, fetch inyectable, tokens env
   `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID`): sendVideo multipart sin deps (boundary manual),
   caption bilingüe truncada a 1024 (límite Telegram), cap 50MB, 429 → retry_after en reason.
5. `packages/core/src/tools/telegram.test.ts` — tests con fetch mock (cero llamadas reales).
6. **Wiring DIFERIDO** (documentar en High Priority de STATE.md): union `PublishPlatform` +
   `createDefaultPublishers` + tool en `llm.ts`/`index.ts` — NO tocar mientras la sesión
   concurrente #25 hace el wiring Meta en esos archivos (precedente cloud: wiring lo hizo la
   sesión concurrente, 7315d4d).

## Archivos a tocar

- NUEVO `packages/core/src/tools/telegram.ts`
- NUEVO `packages/core/src/tools/telegram.test.ts`
- NUEVO `learning/sources/openclaw.md`
- NUEVO `docs/APIS-GRATIS-2026.md`
- NUEVO `docs/RAZONAMIENTO-OPENCLAW.md`
- NUEVO `.opencode/plans/loop-37-telegram-adapter.md`
- MODIFICAR `learning/LEARNINGS.md`, `loop-run-log.md`, `STATE.md` (bitácora)
- NO TOCAR: publish.ts, llm.ts, index.ts, archivos de #25 (blueprint/reach/automation/
  recorder/shared/enlaces.txt/DOCS_TODO.md)

## Criterios

- **Scoped (este ciclo)**: vitest `telegram.test.ts` verde; tsc parcial del paquete sin errores
  propios (ruido reach.ts de #25 permitido); eslint telegram.ts+test.
- **FULL**: pendiente árbol limpio (#25 activo), igual que iteraciones 29-36.

## Riesgos

- Sesión concurrente #25 tocando publish.ts/llm.ts/index.ts → wiring diferido (no conflicto).
- Telegram API cambia límites → razones fail-soft siempre; nunca lanzar.

## Esfuerzo

- Bajo: ~1 archivo de dominio (~180 líneas) + 1 test (~12 casos) + 2 docs + bitácora.
# OpenClaw — fuente cruda (enlaces.txt)

> Descargado 17/08/2026 desde https://github.com/openclaw/openclaw (README + .env.example,
> versión compacta; MIT License, ~387k stars, OpenClaw Foundation non-profit). Pedido del
> usuario (enlaces.txt línea 809): "Adiciona la lista api que verifiques son gratuitas y
> sirven al proyecto para avanzar".

## Qué es

"Your own personal AI assistant. Any OS. Any Platform." — asistente personal de un solo
operador que corre en tus dispositivos y te encuentra en los canales que ya usas: conecta
modelos, herramientas, canales de mensajería y apps companion a través de un **Gateway**
local. Creado por Peter Steinberger (Molty). npm: `npm install -g openclaw@latest`.

## Arquitectura

- **Gateway**: plano de control local para sesiones, tools, eventos y conexiones de canal.
- **Control UI / CLI / TUI**: se conectan al Gateway.
- **Channels**: WhatsApp, Telegram, Slack, Discord, Google Chat, Signal, iMessage y otros.
- **Companion apps / nodes**: voz, Canvas, cámara, pantalla y acciones locales del dispositivo.
- **Tools / Skills / Plugins**: extensión; ClawHub para compartir plugins (plugin SDK).
- Model providers: hosted y locales (OpenAI, Anthropic, Gemini, OpenRouter, ...).

## .env.example (integraciones reales)

- Gateway: `OPENCLAW_GATEWAY_TOKEN` (auto-generado si vacío, `openssl rand -hex 32`),
  `OPENCLAW_GATEWAY_PASSWORD`, state/config dirs.
- Model providers: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`,
  `OPENROUTER_API_KEY`, `GOOGLE_API_KEY`, múltiples keys `_1.._N`/`_KEYS` (rotación),
  opcionales `ZAI_API_KEY`, `AI_GATEWAY_API_KEY`, `TOKENHUB_API_KEY`, `LKEAP_API_KEY`,
  `MINIMAX_API_KEY`, `SYNTHETIC_API_KEY`.
- Canales: `TELEGRAM_BOT_TOKEN`, `DISCORD_BOT_TOKEN`, `SLACK_BOT_TOKEN`/`SLACK_APP_TOKEN`,
  `MATTERMOST_BOT_TOKEN`+`MATTERMOST_URL`, `ZALO_BOT_TOKEN`, `OPENCLAW_TWITCH_ACCESS_TOKEN`.
- Tools/voice: `BRAVE_API_KEY`, `PERPLEXITY_API_KEY`, `FIRECRAWL_API_KEY`,
  `ELEVENLABS_API_KEY` (+ alias `XI_API_KEY`), `INWORLD_API_KEY`, `DEEPGRAM_API_KEY`.

## Seguridad (patrón)

- Tratar mensajes entrantes como **no confiables** (untrusted input).
- Canales con DM: emparejamiento por aprobación (`openclaw pairing approve <channel> <code>`).
- Tools corren en el host salvo sandboxing explícito; guías de exposure/sandboxing.
- Token de gateway exigido si bindea más allá de loopback; nunca copiar placeholders de docs.

## Mapeo a UltraIa

- **Gateway local + token + loopback-only** = Fase B Local API del runtime
  (`packages/runtime/src/api/` — token randomBytes(32), origin loopback, rate limit) ya
  implementada 15/08/2026. OpenClaw valida el diseño.
- **Canales de mensajería gratis** = canal faltante de AutoPub: Telegram Bot API (gratis
  total, sin OAuth, sin app review) → adapter `telegram` (iteración 37). Discord/Slack
  siguen el mismo patrón (webhook/bot token).
- **Tools/Skills/Plugins** = capabilities del repo (`packages/core/src/tools/*` + `ai/llm.ts`
  registry). Pattern "plugin SDK + marketplace" ya cubierto por `harness` (defineSeam).
- **Model provider rotación** (`_KEYS` comas) = útil para los agentes admin cuando haya
  múltiples claves; hoy `resolveModel()` usa una por proveedor.
- Pedido del usuario: lista de APIs gratuitas verificadas → `docs/APIS-GRATIS-2026.md`
  (iteración 37).
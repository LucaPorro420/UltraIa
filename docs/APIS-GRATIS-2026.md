# APIS-GRATIS-2026.md — APIs gratuitas verificadas para UltraIa

> Pedido del usuario (enlaces.txt → openclaw/openclaw): "Adiciona la lista api que verifiques
> son gratuitas y sirven al proyecto para avanzar". Datos VERIFICADOS 17/08/2026 con
> websearch (fuentes en cada fila). Principio: keyless-first con degradación elegante.

## Distribución de contenido (AutoPub F4/F5)

| API | Costo 2026 | Verificado | Uso en UltraIa |
|---|---|---|---|
| **Telegram Bot API** | **GRATIS total**: bots ilimitados, mensajes ilimitados, uso comercial explícito, sin tarjeta, sin aprobación (solo crear bot con @BotFather). Subida 50MB (video), 10MB (foto); storage gratis e indefinido con `file_id`; rate 30 msg/s distintos / 1 msg/s mismo / 20 msg/min grupo | optimum-web.com/blog/telegram-bot-api-pricing-2026 + botract.com + michaelheredia.com (abr 2026) | **Adapter `telegram` (iteración 37)** — canal de publicación sin OAuth ni app review |
| **Discord webhooks / bots** | GRATIS (comunidades Discord; sin cargo por mensaje; bots con token) | .env.example openclaw (`DISCORD_BOT_TOKEN`) | Futuro adapter `discord` (mismo patrón telegram) |
| **Slack bots** | GRATIS para apps internas/workspace propio (token `xoxb-`; límites de rate razonables) | .env.example openclaw (`SLACK_BOT_TOKEN`/`SLACK_APP_TOKEN`) | Futuro adapter `slack` |
| **WhatsApp Cloud API** | ⚠️ **NO recomendado para publicación proactiva**: marketing $0.025/msg (US, rate card ene 2026); utility por-mensaje desde jul 2025; free tier de 1000 conversaciones/mes **DEPRECADO**; solo service messages en ventana 24h (customer-initiated) gratis; requieres verificación de negocio | blueticks.co/blog/whatsapp-business-api-pricing-2026 + chatbooster.ai (jun 2026) + peppercloud (jul 2026) | Descartado para AutoPub; solo si hubiera chat entrante de clientes |
| **YouTube Data API v3** | Cuota gratis 10.000 unidades/día (un upload resumable ≈ 1600 u.) — GRATIS sin tarjeta; canal propio sin app review | docs oficiales + ya integrado (`createYouTubeAdapter`) | Ya en uso |
| **TikTok Content Posting API** | Gratis con aprobación humana (Developer Portal) — aprobación por app, no por mensaje | ya integrado (`createTikTokAdapter`) | Ya en uso |
| **X API v2 Free** | 17 posts/24h POR APP (el 1500/mes era API 1.1 legacy) | CLOUD-FREE-2026.md (verificado 17/08) | Ya integrado |
| **Meta Graph API (IG Reels/Threads)** | Gratis; app review NO requerida para negocio propio (Standard Access, docs updated 2026-06-30) | CLOUD-FREE-2026.md | Ya integrado (adapters, iteración 35) |

## Generación keyless (OMAG / AutoPub F2/F3) — ya integradas

| API | Detalle | Uso |
|---|---|---|
| **Pollinations.ai** | Imágenes keyless (sin token), texto a imagen | `tools/image.ts` |
| **MeiGEN** | Imágenes con token propio `meigen_sk_*` (opcional) | `tools/image.ts` multi-provider |
| **edge-tts (Microsoft)** | TTS keyless, 14 idiomas, WebSocket nativo | `omag/tts.ts` (`edgeTtsAudio`) |
| **Tunetank** | Música keyless (búsqueda de UNA palabra) | `tools/music.ts` |
| **DuckDuckGo IA** | Búsqueda web keyless | `tools/reach.ts` (`searchWeb`) |
| **r.jina.ai** | Lectura web keyless (fallback directo incluido) | `tools/reach.ts` (`readWeb`) |
| **Exa** | Búsqueda neural — SOLO si `EXA_API_KEY` (opcional) | `tools/reach.ts` |
| **Síntesis procedural** | WAV/PCM16 sin deps ni ffmpeg (tone/noise/beat/ambience) | `omag/sound.ts` |

## Búsqueda / investigación (opcionales, .env de OpenClaw)

| API | Costo 2026 | Verificado | Nota |
|---|---|---|---|
| **Brave Search API** | Free tier 2.000 queries/mes (1 query/s) | docs oficiales Brave (2026) | Alternativa a DuckDuckGo si se satura |
| **Firecrawl** | Free tier (500 créditos/mes, scrape/maps) | docs oficiales Firecrawl (2026) | Alternativa a r.jina.ai para crawl profundo |
| **Perplexity API** | ⚠️ Pago (p5 free trial limitado) | — | NO recomendado |
| **ElevenLabs** | Free tier 10k créditos/mes (TTS) | docs oficiales (2026) | Alternativa premium a edge-tts |
| **Deepgram** | Free tier 200 créditos/mes (STT) | docs oficiales (2026) | Alternativa a transcripción manual |

## Presupuesto estable del proyecto

- **$0/mes** con: Telegram (distribución) + YouTube/TikTok/X/Meta gratis (cuotas) +
  keyless (imágenes/TTS/música/búsqueda) + Cloudflare Workers 100k req/día + R2 10GB egress
  (CLOUD-FREE-2026.md).
- Único gasto futuro real: GPU para entrenar el Gen-Engine (backlog #6) o LLM de pago para
  agentes a volumen (hoy `resolveModel()` usa lo configurado, keyless-first).
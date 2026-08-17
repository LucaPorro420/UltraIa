# Plan loop-39 — AutoPub F5: analytics reales por API de canal

## Contexto
- F5 pendiente documentado: "analytics reales por API de canal" (la promoción vía signals
  ya la cerró growth en dominio puro). metrics.ts solo agrega la COLA (publicadas/fallidas/
  mediaScore); no hay métricas reales de las plataformas.
- Keyless-first (regla del proyecto): YouTube Data API v3 es gratis con YOUTUBE_API_KEY
  (channels/statistics público); TikTok Research requiere aprobación; X v2 requiere OAuth2
  user; IG/Threads Graph requiere token; Telegram requiere bot admin → TODOS fail-soft con
  razón clara (patrón publish.ts).

## Objetivo
`fetchChannelAnalytics(platform)` con fetch inyectable (cero llamadas reales en tests) +
`mergeAnalyticsIntoKpis(kpis, analytics)` determinista (platform→canal de la cola).

## Pasos
1. `tools/metrics.ts`:
   - `ChannelAnalytics` {platform, ok, canal?, vistas?, likes?, comentarios?, compartidos?,
     videoCount?, error?, fetchedAt} — números parseados, strings de la API → int.
   - `fetchChannelAnalytics(input, opts: {fetchImpl?, apiKeys?})`: rama youtube (GET
     youtube.googleapis.com/youtube/v3/channels?part=statistics&id&key → items[0].statistics:
     viewCount/subscriberCount/videoCount), tiktok/x/ig/threads/telegram → fail-soft.
   - `mergeAnalyticsIntoKpis(kpis, analytics)`: mapeo platform→canal
     (youtube→youtube_shorts, tiktok→tiktok, instagram→instagram, telegram→telegram,
     x/threads → null, skip); añade vistasReales/likesReales por canal existente.
2. Tests (mocks): youtube ok (parse), youtube sin apiKey, youtube fetch error, youtube sin
   items, tiktok aprobación, x oauth, ig/threads token, telegram admin, merge por canal,
   merge skip x/threads, merge canal desconocido. (~13)
3. Wiring de la acción `analytics` en la tool `publication_metrics` (llm.ts) SOLO si
   llm.ts está limpio en el momento del commit; si la sesión concurrente lo tocó → diferir
   (High Priority) y documentarlo.

## Archivos a tocar
- packages/core/src/tools/metrics.ts (+ test)
- packages/core/src/ai/llm.ts (opcional, condicionado)

## Criterios de éxito
- Vitest metrics ~13/13; tsc parcial 0 propios; eslint limpio; commit staging explícito.

## Riesgos
- llm.ts lo toca la sesión concurrente (telegram wiring) → condición explicita arriba.
- YouTube API: hiddenSubscriberCount=true → subscriberCount ausente → parse defensivo.

## Esfuerzo
- Bajo (~1h).
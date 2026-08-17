# Plan loop-35 — AutoPub F4 paso 5: adapters Meta (IG Reels + Threads)

## Contexto
- Canales del orden recomendado (AUTO-PUBLICACION.md): YouTube+TikTok ✅ (F4 pasos 1-2),
  blog ✅ (paso 3), X ✅ (pasos 4-5: adapter 8bc63b8 + wiring 4a0aa78). Siguiente: Meta.
- Datos VERIFICADOS 17/08 (docs/CLOUD-FREE-2026.md Parte 5, docs oficiales updated
  2026-06-30): Meta/IG **NO requiere app review** para negocio propio ("My app is only for
  a business I own or manage" → Standard Access); permisos
  `instagram_business_content_publish` + `instagram_basic`; container flow
  create → poll → publish; límite ~100 posts/día; env `IG_ACCESS_TOKEN` (patrón .env.cloud.example).

## Objetivo
Adaptadores Meta en `tools/publish.ts` siguiendo el patrón X (fetch inyectable,
fail-soft, tokens desde options/env, determinista):
- `createInstagramAdapter`: Graph API v21 — POST `/{igUserId}/media` (media_type=REELS,
  video_url, caption) → creation_id; POST `/{igUserId}/media_publish` (creation_id) → media id.
- `createThreadsAdapter`: Graph API v1.0 — POST `/{threadsUserId}/threads` (media_type=VIDEO,
  video_url, text) → creation_id; POST `/{threadsUserId}/threads_publish` → thread id.
- Union `platform` ampliada a 'instagram' | 'threads' (aditiva); `PublishInput.videoUrl?`
  (los Reels/Threads requieren URL pública del video — fail-soft con razón si falta).
- SIN wiring (createDefaultPublishers/publishDue/tool) — eso es loop-36, como se hizo con X.

## Pasos
1. `tools/publish.ts`:
   - Union de plataformas en `PublishResult.platform` y `PublisherAdapter.platform`.
   - `PublishInput` gana `videoUrl?: string` (aditivo).
   - Constantes `IG_MEDIA_URL`/`THREADS_BASE_URL`; helper `formBody(params)` con URLSearchParams.
   - `createInstagramAdapter(options)`: token `IG_ACCESS_TOKEN`, userId `IG_USER_ID`;
     validate sin token/userId → ok:false con razón; publish: videoUrl de
     options.videoUrl ?? input.videoUrl → create container → publish; caption = título (cap 2200);
     url `https://www.instagram.com/reel/{id}/`.
   - `createThreadsAdapter(options)`: token `THREADS_ACCESS_TOKEN`, userId `THREADS_USER_ID`;
     validate análogo; publish: videoUrl requerido → create threads → publish; text = título
     (cap 500); sin url (id como TikTok).
   - Export en namespace `publish`.
2. `publish.test.ts`: ~11 tests espejo del patrón X (validate sin token/userId; flujos felices
   IG y Threads con fetch mock; faltas de videoUrl; fallos HTTP en cada paso; caps de caption/text;
   publishToAll fail-soft con Meta sin token).
3. Nada más: NO tocar publications.ts / llm.ts (wiring en loop-36; llm.ts lo trabaja la sesión
   concurrente hoy).

## Archivos a tocar
- packages/core/src/tools/publish.ts (+ test)

## Criterios de éxito
- Vitest scoped publish 27 → ~38 PASS (11 nuevos); tsc parcial 0 errores propios; eslint 0.
- FULL pendiente árbol limpio (#25 sigue activo).

## Riesgos
- Cambiar la union `platform` puede romper switch/ternarios existentes → verificar con tsc
  parcial (los ternarios de llm.ts usan a.platform === 'youtube' etc. — union ampliada es
  aditiva y no rompe comparaciones de igualdad).
- Sesión concurrente tocando publish.ts? No está en su lista (verificado en status previo).

## Esfuerzo
- Bajo (~130 líneas + tests).
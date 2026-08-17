# Plan loop-32 — AutoPub F4 paso 4: adapter X (Twitter) API v2

## Contexto
- Fuente: AUTO-PUBLICACIÓN orden de canales: YouTube+TikTok (D1) → blog (D2) → Meta (D3) → X
  API v2 (D4) → LinkedIn. CLOUD-FREE-2026 verificado (17/08): X API v2 Free = 17 posts/24h POR
  APP sin app review. Meta/IG requiere app review (humano) → X es el siguiente canal accionable.
- `tools/publish.ts` (252 líneas): patrón `PublisherAdapter` (platform/publish/validate),
  fetch inyectable, tokens desde options/env, fail-soft. `createYouTubeAdapter` +
  `createTikTokAdapter` + `publishToAll` + `createDefaultPublishers` (YT+TikTok, NO se toca →
  los tests de publishToAll no cambian).
- Restricción: #25 activo (screenflow/automation/blueprint/reach/shared). publish.ts NO está en
  su lista. Gates FULL bloqueados → scoped (vitest + tsc parcial + eslint).

## Objetivo
`createXAdapter` (plataforma `'x'`): media chunked upload v1.1 (INIT → APPEND×n ≤5 MiB →
FINALIZE) + tweet v2 (`POST /2/tweets`). `PublishResult.platform` y
`PublisherAdapter.platform` se amplían a `'youtube' | 'tiktok' | 'x'` (retrocompatible).

## Pasos
1. `tools/publish.ts`:
   - Tipos: `platform: 'youtube' | 'tiktok' | 'x'` en PublishResult y PublisherAdapter.
   - `X_MEDIA_UPLOAD_URL = 'https://upload.x.com/1.1/media/upload.json'`,
     `X_TWEETS_URL = 'https://api.x.com/2/tweets'`, `X_CHUNK_BYTES = 5 * 1024 * 1024`.
   - `buildXPostText(meta: PublishMetadata): string` — título + primera línea desc + hashtags,
     slice 280.
   - `xAppendMultipartBody(mediaId, segmentIndex, chunk, boundary): string` — form-data
     multipart manual (command/media_id/segment_index/media_data base64) sin deps.
   - `createXAdapter(options: XAdapterOptions): PublisherAdapter` — INIT (JSON
     {command:'INIT', media_type:'video/mp4', total_bytes}) → media_id_string; APPENDs de
     chunkBytes (base64 en multipart); FINALIZE {command:'FINALIZE', media_id}; POST tweets
     {text, media:{media_ids}} → data.id; url `https://x.com/i/status/<id>`; fail-soft con
     razón `X_ACCESS_TOKEN no configurado` / `X INIT|upload|tweet falló: HTTP N`.
   - Export en namespace `publish`.
2. `tools/index.ts`: export `publish` ya existe — sin cambio (namespace contiene createXAdapter).
3. `tools/publish.test.ts` (+10 tests): validate sin token; buildXPostText ≤280 con hashtags;
   multipart contiene boundary/campos/base64; chunking 12 MiB → 3 APPENDs con segment_index
   0,1,2 (fetch mock contando); flujo feliz completo (ok, id, url); INIT falla; FINALIZE
   falla; tweet HTTP 401; sin video → error; publishToAll con X sin token → fail-soft razonado.

## Archivos a tocar
- packages/core/src/tools/publish.ts
- packages/core/src/tools/publish.test.ts

## Criterios de éxito
- Tests existentes publish + 10 nuevos PASS (vitest scoped).
- tsc parcial 0 errores propios (ruido #25 permitido).
- Commit `feat(autopub): adapter X API v2 ...`.

## Riesgos
- Ampliar el union `platform` es aditivo; ningún switch exhaustivo en el repo (verificar con
  grep antes de commit). createDefaultPublishers NO incluye X (los tests existentes de
  publishToAll con 2 adapters siguen pasando).

## Esfuerzo
- Medio (~150 líneas + tests).

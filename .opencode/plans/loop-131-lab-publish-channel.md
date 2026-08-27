---
id: 131
slug: lab-publish-channel
title: Publicar diseños guardados del Lab a un canal conectado (Telegram/Discord)
objective: >
  Cerrar design -> reach: desde el tab "Tuyos" del Prototype Browser, publicar un diseño
  guardado en Cloud a un canal social conectado. El pipeline AutoPub es video-only; este
  ciclo añade soporte de IMAGEN a los adapters file-based (Telegram/Discord) y un endpoint
  + UI en el Lab.
context: >
  PublishInput era video-only (videoPath/videoBuffer/videoUrl). createDefaultPublishers ya
  expone createTelegramAdapter/createDiscordAdapter (PublisherAdapter). CloudService.read/stat
  devuelven bytes + CloudFile. /lab está bajo (app) autenticado => getCurrentUser ok.
files:
  - packages/core/src/tools/publish.ts            # PublishInput + imageBuffer/imageName/imageUrl
  - packages/core/src/tools/telegram.ts           # sendPhoto/sendDocument por imagen
  - packages/core/src/tools/discord.ts            # post file por imagen
  - packages/core/src/tools/telegram.test.ts      # +3 tests imagen
  - packages/core/src/tools/discord.test.ts       # +2 tests imagen
  - apps/web/src/app/api/lab/publish/route.ts     # NUEVO: POST {path,channel}
  - apps/web/src/components/lab-client.tsx        # botones Publicar por cloud tile
  - .opencode/plans/loop-131-lab-publish.md       # este plan
steps:
  1. PublishInput gana imageBuffer/imageName/imageUrl.
  2. telegram: si no hay video pero sí imagen -> sendPhoto (png/jpg/jpeg/webp/gif) o
     sendDocument (svg/html); fall-soft.
  3. discord: si no hay video pero sí imagen -> webhook file multipart con content caption.
  4. Ruta POST /api/lab/publish: auth + isSafePath + read bytes + adapter.publish({imageBuffer}).
  5. Lab UI: por cloud tile, botones telegram/discord -> fetch route, muestra estado.
  6. Gates CI: typecheck -> lint -> test -> build. Commit pathspec. Push.
scoped_criteria: typecheck OK, lint OK, core tests (telegram/discord/cloud) OK
full_criteria: npm run typecheck && npm run lint && npm run test && npm run build (verdes)
tolerances: no tocar #25 (herramientas/, api/tools/route.ts, _diag.ts) ni G0DM0D3
risks: >
  - Telegram image via buffer (imageUrl opcional fetch). Discord 204 No Content.
  - Solo canales file-based soportan imagen; video-only (YT/TikTok/IG/...) fuera de alcance.
priority: P1
effort: M
---

# loop-131 — Publicar diseño del Lab a canal conectado

## Predicción
- Telegram/Discord publican la imagen del diseño guardado con fail-soft (token faltante =>
  ok:false con razón, sin romper la UI).
- Gates FULL verdes; commit + push limpio.

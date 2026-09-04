# DOCS_TODO — archivos pendientes de documentar

Este archivo lo genera `scripts/doc-reminder.mjs` tras cada commit (git hook `post-commit`).

Para documentar un archivo, pide: **"explica &lt;archivo&gt;"** (usa la skill `explain-code`).
La skill agrega comentarios estilo Better Comments sin cambiar el código.

## Formato de las entradas
Cada commit agrega una sección con fecha y la lista de archivos `.ts/.tsx` tocados:
```
## 2026-08-12T...Z
- [ ] apps/web/src/app/(app)/roadmap/page.tsx
```

## 2026-08-14T18:06:26.475Z
- [ ] apps/web/e2e/smoke.spec.ts
- [ ] apps/web/next.config.ts
- [x] apps/web/playwright.config.ts
- [ ] apps/web/src/app/(app)/dashboard/page.tsx
- [ ] apps/web/src/app/api/chat/general/route.ts
- [ ] apps/web/src/components/assistant-chat.tsx
- [ ] packages/core/src/ai/llm.ts
- [ ] packages/core/src/prompt/director.ts
- [ ] packages/core/src/prompt/index.ts
- [ ] packages/core/src/prompt/languages.ts
- [ ] packages/core/src/prompt/prompt.test.ts
- [ ] packages/core/src/tools/content.live.test.ts
- [ ] packages/core/src/tools/content.test.ts
- [ ] packages/core/src/tools/content.ts
- [ ] packages/core/src/tools/gen-engine.test.ts
- [ ] packages/core/src/tools/gen-engine.ts
- [ ] packages/core/src/tools/index.ts
- [ ] packages/core/vitest.config.ts

## 2026-08-14T18:07:10.813Z
- [ ] apps/web/e2e/smoke.spec.ts
- [x] apps/web/playwright.config.ts
- [ ] apps/web/src/app/api/omag/route.ts
- [ ] apps/web/src/instrumentation.ts
- [ ] packages/core/src/ai/llm.ts
- [ ] packages/core/src/index.ts
- [ ] packages/core/src/omag/audiolibrary.test.ts
- [ ] packages/core/src/omag/audiolibrary.ts
- [ ] packages/core/src/omag/critics.test.ts
- [ ] packages/core/src/omag/critics.ts
- [ ] packages/core/src/omag/generators.test.ts
- [ ] packages/core/src/omag/generators.ts
- [ ] packages/core/src/omag/index.ts
- [ ] packages/core/src/omag/mediafield.test.ts
- [ ] packages/core/src/omag/mediafield.ts
- [ ] packages/core/src/omag/memory.test.ts
- [ ] packages/core/src/omag/memory.ts
- [ ] packages/core/src/omag/orchestrator.test.ts
- [ ] packages/core/src/omag/orchestrator.ts
- [ ] packages/core/src/omag/project.test.ts
- [ ] packages/core/src/omag/project.ts
- [ ] packages/core/src/omag/sound.test.ts
- [ ] packages/core/src/omag/sound.ts
- [ ] packages/core/src/omag/timeline.test.ts
- [ ] packages/core/src/omag/timeline.ts
- [ ] packages/core/src/omag/tts.test.ts
- [ ] packages/core/src/omag/tts.ts
- [ ] packages/core/src/omag/world.test.ts
- [ ] packages/core/src/omag/world.ts
- [ ] packages/core/src/prompt/director.ts
- [ ] packages/core/src/prompt/prompt.test.ts
- [ ] packages/core/src/tools/content.test.ts
- [ ] packages/core/src/tools/content.ts
- [ ] packages/core/src/tools/music.test.ts
- [ ] packages/core/src/tools/music.ts

## 2026-08-14T23:42:55.529Z
- [ ] apps/web/next.config.ts
- [ ] packages/core/src/auth/apikey.test.ts
- [ ] packages/core/src/auth/apikey.ts
- [ ] packages/core/src/auth/session.ts
- [ ] packages/core/src/omag/audiolibrary.test.ts
- [ ] packages/core/src/omag/audiolibrary.ts
- [ ] packages/core/src/omag/tts.ts
- [ ] packages/core/src/tools/stitch.ts

## 2026-08-14T23:55:29.681Z
- [ ] apps/web/src/instrumentation.ts
- [ ] packages/core/src/tools/gen-engine.test.ts
- [ ] packages/core/src/tools/gen-engine.ts

## 2026-08-15T01:38:08.950Z
- [ ] packages/runtime/src/command-executor.test.ts
- [ ] packages/runtime/src/command-executor.ts
- [ ] packages/runtime/src/config.test.ts
- [ ] packages/runtime/src/config.ts
- [ ] packages/runtime/src/context.test.ts
- [ ] packages/runtime/src/context.ts
- [ ] packages/runtime/src/event-bus.test.ts
- [ ] packages/runtime/src/event-bus.ts
- [ ] packages/runtime/src/health.test.ts
- [ ] packages/runtime/src/health.ts
- [ ] packages/runtime/src/index.ts
- [ ] packages/runtime/src/installer.test.ts
- [ ] packages/runtime/src/installer.ts
- [ ] packages/runtime/src/logger.test.ts
- [ ] packages/runtime/src/logger.ts
- [ ] packages/runtime/src/memory.test.ts
- [ ] packages/runtime/src/memory.ts
- [ ] packages/runtime/src/module-manager.test.ts
- [ ] packages/runtime/src/module-manager.ts
- [ ] packages/runtime/src/module-registry.test.ts
- [ ] packages/runtime/src/module-registry.ts
- [ ] packages/runtime/src/recovery.test.ts
- [ ] packages/runtime/src/recovery.ts
- [ ] packages/runtime/src/resource-manager.test.ts
- [ ] packages/runtime/src/resource-manager.ts
- [ ] packages/runtime/src/runtime.test.ts
- [ ] packages/runtime/src/runtime.ts
- [ ] packages/runtime/src/task-manager.test.ts
- [ ] packages/runtime/src/task-manager.ts
- [ ] packages/runtime/src/types.ts
- [ ] packages/runtime/vitest.config.ts

## 2026-08-15T03:22:01.824Z
- [ ] packages/runtime/src/api/runtime-api.test.ts
- [ ] packages/runtime/src/api/runtime-handlers.ts
- [ ] packages/runtime/src/api/server.test.ts
- [ ] packages/runtime/src/api/server.ts
- [ ] packages/runtime/src/api/ws.ts
- [ ] packages/runtime/src/index.ts
- [ ] packages/runtime/src/runtime.test.ts
- [ ] packages/runtime/src/runtime.ts

## 2026-08-15T05:55:39.776Z
- [ ] packages/runtime/src/adapters/ai.test.ts
- [ ] packages/runtime/src/adapters/ai.ts
- [ ] packages/runtime/src/adapters/core.test.ts
- [ ] packages/runtime/src/adapters/core.ts
- [ ] packages/runtime/src/adapters/db.test.ts
- [ ] packages/runtime/src/adapters/db.ts
- [ ] packages/runtime/src/adapters/ports.ts
- [ ] packages/runtime/src/index.ts

## 2026-08-15T06:13:28.713Z
- [ ] packages/core/src/omag/index.ts
- [ ] packages/runtime/src/adapters/core.test.ts
- [ ] packages/runtime/src/adapters/core.ts
- [ ] packages/runtime/src/adapters/omag.test.ts
- [ ] packages/runtime/src/adapters/omag.ts
- [ ] packages/runtime/src/adapters/ports.ts
- [ ] packages/runtime/src/adapters/tools.test.ts
- [ ] packages/runtime/src/adapters/tools.ts
- [ ] packages/runtime/src/index.ts

## 2026-08-15T06:37:23.081Z
- [ ] packages/runtime/src/runtime.test.ts
- [ ] packages/runtime/src/runtime.ts

## 2026-08-15T06:58:16.648Z
- [ ] packages/runtime/src/launcher.test.ts

## 2026-08-15T07:12:46.742Z
- [ ] packages/core/src/ai/llm.ts
- [ ] packages/core/src/tools/index.ts
- [ ] packages/core/src/tools/topics.test.ts
- [ ] packages/core/src/tools/topics.ts

## 2026-08-15T08:00:43.032Z
- [ ] packages/core/src/ai/llm.ts
- [ ] packages/core/src/tools/index.ts
- [ ] packages/core/src/tools/present.test.ts
- [ ] packages/core/src/tools/present.ts

## 2026-08-15T08:05:31.831Z
- [ ] packages/core/src/ai/llm.ts
- [ ] packages/core/src/tools/index.ts

## 2026-08-15T14:28:34.896Z
- [ ] packages/core/src/tools/publish.test.ts
- [ ] packages/core/src/tools/publish.ts

## 2026-08-15T14:51:33.042Z
- [ ] apps/web/src/app/api/publications/[id]/approve/route.ts
- [ ] apps/web/src/app/api/publications/[id]/publish/route.ts
- [ ] apps/web/src/app/api/publications/[id]/reject/route.ts
- [ ] apps/web/src/app/api/publications/route.ts
- [ ] packages/core/src/ai/llm.ts
- [ ] packages/core/src/auth/session.ts
- [ ] packages/core/src/domain/publications.test.ts
- [ ] packages/core/src/domain/publications.ts
- [ ] packages/core/src/index.ts
- [ ] packages/core/src/tools/index.ts

## 2026-08-15T20:07:42.222Z
- [ ] apps/web/src/app/api/publications/publish-due/route.ts
- [ ] apps/web/src/app/blog/page.tsx
- [ ] packages/core/src/domain/publications.test.ts
- [ ] packages/core/src/domain/publications.ts

## 2026-08-15T20:47:53.171Z
- [ ] packages/core/src/ai/llm.ts
- [ ] packages/core/src/tools/enrutador.test.ts
- [ ] packages/core/src/tools/enrutador.ts
- [ ] packages/core/src/tools/index.ts

## 2026-08-15T21:38:38.629Z
- [ ] apps/web/src/app/api/publications/[id]/feedback/route.ts
- [ ] apps/web/src/app/api/publications/metrics/route.ts
- [ ] packages/core/src/ai/llm.ts
- [ ] packages/core/src/domain/publications.test.ts
- [ ] packages/core/src/domain/publications.ts
- [ ] packages/core/src/tools/index.ts
- [ ] packages/core/src/tools/media-score.test.ts
- [ ] packages/core/src/tools/media-score.ts
- [ ] packages/core/src/tools/metrics.test.ts
- [ ] packages/core/src/tools/metrics.ts

## 2026-08-15T21:51:25.684Z
- [ ] packages/core/src/ai/llm.ts
- [ ] packages/core/src/domain/briefs.test.ts
- [ ] packages/core/src/domain/briefs.ts
- [ ] packages/core/src/index.ts

## 2026-08-15T22:10:45.319Z
- [ ] packages/core/src/ai/llm.ts
- [ ] packages/core/src/tools/enrutador.test.ts
- [ ] packages/core/src/tools/enrutador.ts

## 2026-08-15T22:25:51.299Z
- [ ] packages/core/src/ai/llm.ts
- [ ] packages/core/src/tools/enrutador.test.ts
- [ ] packages/core/src/tools/enrutador.ts
- [ ] packages/core/src/tools/topics.ts

## 2026-08-16T02:37:10.336Z
- [ ] packages/runtime/src/launcher.test.ts

## 2026-08-16T02:37:32.188Z
- [ ] packages/core/src/ai/llm.ts
- [ ] packages/core/src/index.ts
- [ ] packages/core/src/tools/index.ts
- [ ] packages/core/src/tools/memory-fs.test.ts
- [ ] packages/core/src/tools/memory-fs.ts

## 2026-08-17T02:15:37.335Z
- [ ] Task/run_task1.ts
- [ ] Task/task1-prompts.ts

## 2026-08-17T03:28:44.188Z
- [ ] Task/generate-diagrams.ts
- [ ] packages/core/src/ai/llm.ts
- [ ] packages/core/src/tools/diagram.test.ts
- [ ] packages/core/src/tools/diagram.ts
- [ ] packages/core/src/tools/index.ts

## 2026-08-17T04:08:38.026Z
- [ ] apps/web/next.config.ts

## 2026-08-17T04:09:09.207Z
- [ ] Task/video-edit-demo.ts
- [ ] packages/core/src/ai/llm.ts
- [ ] packages/core/src/tools/index.ts
- [ ] packages/core/src/tools/video-edit.test.ts
- [ ] packages/core/src/tools/video-edit.ts

## 2026-08-17T04:45:25.197Z
- [ ] Task/run_screenflow.ts
- [ ] packages/core/src/ai/llm.ts
- [ ] packages/core/src/tools/index.ts
- [ ] packages/core/src/tools/screenflow.test.ts
- [ ] packages/core/src/tools/screenflow.ts

## 2026-08-17T07:10:30.253Z
- [ ] apps/web/src/app/(app)/cloud/page.tsx
- [ ] apps/web/src/app/api/cloud/files/route.ts
- [ ] apps/web/src/app/api/cloud/providers.ts
- [ ] apps/web/src/app/api/cloud/status/route.ts
- [ ] apps/web/src/app/api/cloud/upload/route.ts
- [ ] apps/web/src/components/app-shell/nav.tsx
- [ ] apps/web/src/components/cloud-client.tsx
- [ ] cloudflare/worker.ts
- [ ] packages/core/src/tools/cloud.test.ts
- [x] packages/core/src/tools/cloud.ts

## 2026-08-17T08:16:14.438Z
- [x] packages/core/src/tools/cloud.ts

## 2026-08-17T08:22:51.821Z
- [ ] packages/core/src/tools/game.test.ts
- [ ] packages/core/src/tools/game.ts

## 2026-08-17T15:41:20.849Z
- [ ] packages/core/src/ai/llm.ts
- [ ] packages/core/src/tools/index.ts

## 2026-08-17T15:59:51.623Z
- [ ] packages/core/src/ai/llm.ts
- [ ] packages/core/src/tools/screenflow.test.ts
- [ ] packages/core/src/tools/screenflow.ts

## 2026-08-17T16:35:18.712Z
- [ ] packages/core/src/tools/screenflow.test.ts
- [ ] packages/core/src/tools/screenflow.ts

## 2026-08-17T16:43:43.229Z
- [ ] packages/core/src/domain/publications.test.ts
- [ ] packages/core/src/domain/publications.ts

## 2026-08-17T17:00:06.353Z
- [ ] packages/core/src/tools/video-edit.test.ts
- [ ] packages/core/src/tools/video-edit.ts

## 2026-08-17T17:06:07.974Z
- [ ] apps/web/src/app/api/publications/route.ts

## 2026-08-17T17:21:17.656Z
- [ ] packages/core/src/ai/llm.ts
- [ ] packages/core/src/tools/present.test.ts
- [ ] packages/core/src/tools/present.ts

## 2026-08-17T17:26:37.276Z
- [ ] packages/core/src/tools/publish.test.ts
- [ ] packages/core/src/tools/publish.ts

## 2026-08-17T18:13:33.272Z
- [ ] packages/core/src/ai/llm.ts
- [ ] packages/core/src/domain/publications.test.ts
- [ ] packages/core/src/domain/publications.ts
- [ ] packages/core/src/tools/publish.test.ts
- [ ] packages/core/src/tools/publish.ts

## 2026-08-17T22:27:06.689Z
- [ ] packages/core/src/ai/llm.ts
- [x] packages/core/src/tools/harness.test.ts
- [x] packages/core/src/tools/harness.ts
- [ ] packages/core/src/tools/index.ts

## 2026-08-17T22:43:51.047Z
- [ ] packages/core/src/tools/publish.test.ts
- [ ] packages/core/src/tools/publish.ts

## 2026-08-17T22:48:57.600Z
- [ ] packages/core/src/ai/llm.ts
- [x] packages/core/src/tools/growth.test.ts
- [x] packages/core/src/tools/growth.ts
- [ ] packages/core/src/tools/index.ts

## 2026-08-17T23:01:16.216Z
- [ ] packages/core/src/ai/llm.ts
- [ ] packages/core/src/domain/publications.test.ts
- [ ] packages/core/src/domain/publications.ts
- [ ] packages/core/src/tools/publish.test.ts
- [ ] packages/core/src/tools/publish.ts

## 2026-08-17T23:09:21.635Z
- [ ] packages/core/src/tools/telegram.test.ts
- [ ] packages/core/src/tools/telegram.ts

## 2026-08-17T23:15:14.047Z
- [ ] packages/core/src/ai/llm.ts
- [ ] packages/core/src/tools/publish.test.ts
- [ ] packages/core/src/tools/publish.ts

## 2026-08-17T23:24:13.472Z
- [ ] packages/core/src/ai/llm.ts
- [ ] packages/core/src/tools/index.ts
- [ ] packages/core/src/tools/vfx.test.ts
- [ ] packages/core/src/tools/vfx.ts

## 2026-08-17T23:43:10.491Z
- [ ] apps/web/src/app/api/publications/route.ts
- [ ] packages/core/src/domain/publications.test.ts
- [ ] packages/core/src/domain/publications.ts
- [ ] packages/core/src/tools/present.ts
- [ ] packages/core/src/tools/topics.ts

## 2026-08-17T23:54:53.752Z
- [ ] packages/core/src/ai/llm.ts
- [ ] packages/core/src/tools/index.ts
- [ ] packages/core/src/tools/metrics.test.ts
- [ ] packages/core/src/tools/metrics.ts

## 2026-08-18T00:05:15.984Z
- [ ] apps/web/src/app/api/publications/metrics/route.ts

## 2026-08-18T00:06:24.509Z
- [ ] apps/web/src/app/api/publications/route.ts
- [ ] packages/core/src/domain/publications.test.ts
- [ ] packages/core/src/domain/publications.ts
- [ ] packages/core/src/tools/discord.test.ts
- [ ] packages/core/src/tools/discord.ts
- [ ] packages/core/src/tools/present.ts
- [ ] packages/core/src/tools/publish.ts
- [ ] packages/core/src/tools/slack.test.ts
- [ ] packages/core/src/tools/slack.ts
- [ ] packages/core/src/tools/topics.ts

## 2026-08-18T00:16:16.227Z
- [ ] packages/core/src/ai/llm.ts
- [ ] packages/core/src/tools/enrutador.ts
- [ ] packages/core/src/tools/index.ts

## 2026-08-18T00:16:48.724Z
- [ ] apps/web/src/app/(app)/metrics/page.tsx
- [ ] apps/web/src/components/app-shell/nav.tsx
- [ ] apps/web/src/components/metrics-client.tsx

## 2026-08-18T02:44:43.968Z
- [ ] apps/mobile/src/api/client.ts
- [ ] apps/mobile/src/api/types.ts
- [ ] apps/mobile/src/app/(auth)/_layout.tsx
- [ ] apps/mobile/src/app/(auth)/login.tsx
- [ ] apps/mobile/src/app/(auth)/register.tsx
- [ ] apps/mobile/src/app/(tabs)/_layout.tsx
- [ ] apps/mobile/src/app/(tabs)/blog.tsx
- [ ] apps/mobile/src/app/(tabs)/cloud.tsx
- [ ] apps/mobile/src/app/(tabs)/index.tsx
- [ ] apps/mobile/src/app/(tabs)/publicaciones.tsx
- [ ] apps/mobile/src/app/_layout.tsx
- [ ] apps/mobile/src/auth/auth-context.tsx
- [ ] apps/mobile/src/components/ui.tsx
- [ ] apps/mobile/src/constants/theme.ts
- [ ] apps/mobile/src/hooks/use-color-scheme.ts
- [ ] apps/mobile/src/hooks/use-color-scheme.web.ts
- [ ] apps/mobile/src/hooks/use-theme.ts
- [ ] apps/web/src/app/api/auth/login/route.ts
- [ ] apps/web/src/app/api/auth/me/route.ts
- [ ] apps/web/src/app/api/auth/register/route.ts
- [ ] apps/web/src/app/api/cloud/files/route.ts
- [ ] apps/web/src/app/api/publications/[id]/approve/route.ts
- [ ] apps/web/src/app/api/publications/[id]/reject/route.ts
- [ ] apps/web/src/app/api/publications/metrics/route.ts
- [ ] apps/web/src/app/api/publications/route.ts
- [ ] apps/web/src/lib/server/context.ts

## 2026-08-18T03:13:43.709Z
- [ ] Task/codevfx-demo.ts
- [ ] packages/core/src/ai/llm.ts
- [x] packages/core/src/tools/codevfx.test.ts
- [x] packages/core/src/tools/codevfx.ts
- [ ] packages/core/src/tools/index.ts

## 2026-08-18T03:51:02.164Z
- [ ] packages/core/src/tools/discord.ts
- [ ] packages/core/src/tools/publish.ts
- [ ] packages/core/src/tools/slack.test.ts
- [ ] packages/core/src/tools/slack.ts

## 2026-08-18T04:11:20.501Z
- [ ] apps/web/next.config.ts
- [ ] packages/core/src/domain/blueprint.test.ts
- [ ] packages/core/src/domain/blueprint.ts
- [ ] packages/core/src/shared/domain.ts
- [ ] packages/core/src/tools/present.test.ts
- [ ] packages/core/src/tools/reach.test.ts
- [ ] packages/core/src/tools/reach.ts

## 2026-08-18T04:17:02.493Z
- [ ] packages/core/src/tools/discord.ts
- [ ] packages/core/src/tools/slack.ts
- [ ] packages/core/src/tools/telegram.ts

## 2026-08-18T05:28:04.291Z
- [x] packages/core/src/ai/llm.ts
- [x] packages/core/src/tools/index.ts
- [x] packages/core/src/tools/travel.test.ts
- [x] packages/core/src/tools/travel.ts

## 2026-08-18T06:00:00.000Z — completados en la ronda de consolidación (loop-46)
- [x] packages/core/src/tools/telegram.ts (fix BodyInit 78d25e0 — JSDoc completo)
- [x] packages/core/src/tools/discord.ts (fix BodyInit 78d25e0 — JSDoc completo)
- [x] packages/core/src/tools/slack.ts (fix BodyInit 78d25e0 — JSDoc completo)
- [x] packages/core/src/tools/travel.ts + travel.test.ts (capability travel 9fed227 — JSDoc es/ar completo)
- [x] docs/REPOMIX.md (guía repomix 85c1d26)
- [x] AGENTS.md (sección loop-46: push histórico, fix BodyInit, repomix, travel, verificaciones enlaces.txt, reglas concurrencia #25)

## 2026-08-20T02:24:16.421Z
- [ ] Task/batch-tomasporro.ts
- [ ] Task/build-real-tomasporro.ts
- [ ] Task/run-remaining.ts
- [ ] Task/run-tomasporro.ts
- [x] apps/web/playwright.config.ts
- [ ] packages/core/src/domain/blueprint.test.ts
- [ ] packages/core/src/domain/blueprint.ts
- [ ] packages/core/src/domain/connections.test.ts
- [ ] packages/core/src/domain/connections.ts
- [ ] packages/core/src/domain/publications.ts
- [ ] packages/core/src/index.ts
- [ ] packages/core/src/omag/vfx-generator.test.ts
- [ ] packages/core/src/tools/automation.ts
- [ ] packages/core/src/tools/enrutador.ts
- [ ] packages/core/src/tools/media-synthesis/math/prng.ts
- [ ] packages/core/src/tools/present.ts
- [ ] packages/core/src/tools/publish.test.ts
- [ ] packages/core/src/tools/reach.test.ts
- [ ] packages/core/src/tools/reach.ts
- [ ] packages/core/src/tools/recorder.ts
- [ ] packages/core/src/tools/topics.ts

## 2026-08-20T02:24:53.760Z
- [x] apps/web/playwright.config.ts
- [x] apps/web/src/app/(app)/lab/page.tsx
- [x] apps/web/src/components/lab-client.tsx

## 2026-08-20T04:05:25.549Z
- [x] packages/core/src/tools/growth.test.ts
- [x] packages/core/src/tools/growth.ts

## 2026-08-20T04:22:21.138Z
- [ ] apps/web/playwright.config.ts
- [x] packages/core/src/tools/growth.ts

## 2026-08-20T14:03:37.443Z
- [ ] packages/core/src/ai/llm.ts
- [ ] packages/core/src/tools/index.ts
- [ ] packages/core/src/tools/semantic-memory.test.ts
- [ ] packages/core/src/tools/semantic-memory.ts

## 2026-08-20T14:53:02.829Z
- [ ] packages/core/src/omag/memory.ts
- [ ] packages/core/src/omag/orchestrator.test.ts
- [ ] packages/core/src/omag/orchestrator.ts
- [ ] packages/core/src/prompt/director.ts
- [ ] packages/core/src/prompt/prompt.test.ts

## 2026-08-20T16:12:03.147Z
- [ ] packages/core/src/ai/llm.ts
- [ ] packages/core/src/tools/autolearn.test.ts
- [ ] packages/core/src/tools/autolearn.ts
- [ ] packages/core/src/tools/index.ts
- [ ] packages/core/src/tools/semantic-memory.ts

## 2026-08-20T16:50:44.636Z
- [ ] packages/core/src/ai/llm.ts
- [ ] packages/core/src/tools/creativo.test.ts
- [ ] packages/core/src/tools/creativo.ts
- [ ] packages/core/src/tools/index.ts

## 2026-08-20T17:17:14.961Z
- [ ] packages/core/src/tools/autolearn.test.ts
- [ ] packages/core/src/tools/autolearn.ts

## 2026-08-20T18:51:44.074Z
- [ ] Task/sync-qdrant.ts
- [ ] packages/core/src/tools/qdrant-memory.test.ts
- [ ] packages/core/src/tools/qdrant-memory.ts

## 2026-08-21T01:09:53.904Z
- [ ] packages/core/src/ai/llm.ts
- [ ] packages/core/src/tools/autolearn.test.ts
- [ ] packages/core/src/tools/autolearn.ts
- [ ] packages/core/src/tools/index.ts
- [ ] packages/core/src/tools/pdfsearch.test.ts
- [ ] packages/core/src/tools/pdfsearch.ts
- [ ] packages/core/src/tools/research.test.ts
- [ ] packages/core/src/tools/research.ts
- [ ] packages/core/src/tools/vault.test.ts
- [ ] packages/core/src/tools/vault.ts

## 2026-08-21T01:21:27.082Z
- [ ] packages/core/src/ai/llm.ts
- [ ] packages/core/src/tools/index.ts
- [ ] packages/core/src/tools/qdrant-memory.wiring.test.ts

## 2026-08-21T03:57:49.699Z
- [ ] Task/batch-tomasporro.ts
- [ ] Task/brain-sync.ts
- [ ] Task/build-real-tomasporro.ts
- [ ] Task/knowledge-graph.ts
- [ ] Task/run-remaining.ts
- [ ] Task/run-tomasporro.ts
- [ ] apps/web/src/app/(app)/lab/page.tsx
- [ ] apps/web/src/components/app-shell/nav.tsx
- [ ] apps/web/src/components/lab-client.tsx
- [ ] creativo.test.ts
- [ ] creativo.ts
- [ ] packages/core/src/domain/blueprint.test.ts
- [ ] packages/core/src/domain/blueprint.ts
- [ ] packages/core/src/domain/connections.ts
- [ ] packages/core/src/domain/publications.test.ts
- [ ] packages/core/src/domain/publications.ts
- [ ] packages/core/src/index.ts
- [ ] packages/core/src/omag/vfx-generator.test.ts
- [ ] packages/core/src/tools/automation.ts
- [ ] packages/core/src/tools/brain.test.ts
- [ ] packages/core/src/tools/brain.ts
- [ ] packages/core/src/tools/enrutador.ts
- [ ] packages/core/src/tools/knowledge-graph.test.ts
- [ ] packages/core/src/tools/knowledge-graph.ts
- [ ] packages/core/src/tools/media-synthesis/math/prng.ts
- [ ] packages/core/src/tools/present.ts
- [ ] packages/core/src/tools/publish.test.ts
- [ ] packages/core/src/tools/reach.test.ts
- [ ] packages/core/src/tools/reach.ts
- [ ] packages/core/src/tools/recorder.ts
- [ ] packages/core/src/tools/topics.ts
- [ ] scripts/dbg-creativo.ts

## 2026-08-21T20:51:28.127Z
- [ ] Task/bench-embeddings.ts
- [ ] Task/sync-qdrant.ts
- [ ] packages/core/src/ai/llm.ts
- [ ] packages/core/src/tools/index.ts
- [ ] packages/core/src/tools/qdrant-memory.test.ts
- [ ] packages/core/src/tools/qdrant-memory.ts
- [ ] packages/core/src/tools/qdrant-memory.wiring.test.ts
- [ ] packages/core/src/tools/semantic-memory.test.ts
- [ ] packages/core/src/tools/semantic-memory.ts
- [ ] packages/core/src/tools/topics.test.ts

## 2026-08-21T21:58:15.763Z
- [ ] Task/bench-embeddings.ts
- [ ] packages/core/src/tools/qdrant-memory.ts

## 2026-08-21T23:17:09.196Z
- [ ] packages/core/src/ai/llm.ts
- [ ] packages/core/src/tools/index.ts
- [ ] packages/core/src/tools/kgraph.test.ts
- [ ] packages/core/src/tools/kgraph.ts
- [ ] packages/core/src/tools/kgraph.wiring.test.ts

## 2026-08-22T02:52:30.940Z
- [ ] Task/heartbeat.ts
- [ ] apps/web/src/app/api/health/route.ts
- [ ] packages/core/src/tools/vitals.test.ts
- [ ] packages/core/src/tools/vitals.ts

## 2026-08-22T03:07:53.118Z
- [ ] packages/core/src/ai/llm.ts
- [ ] packages/core/src/tools/brainpage.test.ts
- [ ] packages/core/src/tools/brainpage.ts
- [ ] packages/core/src/tools/brainpage.wiring.test.ts
- [ ] packages/core/src/tools/index.ts

## 2026-08-22T18:08:58.183Z
- [ ] packages/core/src/ai/llm.ts
- [ ] packages/core/src/tools/genesis.test.ts
- [ ] packages/core/src/tools/genesis.ts
- [ ] packages/core/src/tools/index.ts

## 2026-08-22T18:35:01.952Z
- [ ] packages/core/src/ai/llm.ts
- [ ] packages/core/src/tools/genesis-runner.test.ts
- [ ] packages/core/src/tools/genesis-runner.ts
- [ ] packages/core/src/tools/genesis.ts
- [ ] scripts/genesis-run.ts

## 2026-08-22T18:48:48.972Z
- [ ] packages/core/src/ai/llm.ts

## 2026-08-22T18:54:09.437Z
- [ ] packages/core/src/tools/index.ts

## 2026-08-22T19:01:58.195Z
- [ ] scripts/genesis-run.ts

## 2026-08-22T20:12:34.989Z
- [ ] packages/core/src/ai/llm.ts
- [ ] packages/core/src/tools/genesis.test.ts
- [ ] packages/core/src/tools/genesis.ts
- [ ] scripts/genesis-run.ts

## 2026-08-22T21:11:57.889Z
- [ ] Task/run-autopub.ts
- [ ] packages/core/src/tools/autopub.test.ts
- [ ] packages/core/src/tools/autopub.ts
- [ ] packages/core/src/tools/qdrant-memory.test.ts
- [ ] packages/core/src/tools/qdrant-memory.ts

## 2026-08-22T23:44:16.062Z
- [ ] packages/core/src/ai/llm.ts
- [ ] packages/core/src/tools/autopub.wiring.test.ts
- [ ] packages/core/src/tools/index.ts

## 2026-08-22T23:50:48.284Z
- [ ] packages/core/src/ai/llm.ts
- [ ] packages/core/src/tools/index.ts
- [ ] packages/core/src/tools/security.test.ts
- [ ] packages/core/src/tools/security.ts

## 2026-08-23T00:06:07.506Z
- [ ] packages/core/src/ai/llm.ts
- [ ] packages/core/src/tools/codequality.test.ts
- [ ] packages/core/src/tools/codequality.ts
- [ ] packages/core/src/tools/index.ts

## 2026-08-23T00:11:09.556Z
- [ ] packages/core/src/ai/llm.ts
- [ ] packages/core/src/tools/deps.test.ts
- [ ] packages/core/src/tools/deps.ts
- [ ] packages/core/src/tools/index.ts

## 2026-08-24T01:22:56.615Z
- [ ] packages/core/src/tools/geometry.test.ts
- [ ] packages/core/src/tools/geometry.ts
- [ ] packages/core/src/tools/geometry.wiring.test.ts
- [ ] packages/core/src/tools/pngrender.test.ts
- [ ] packages/core/src/tools/pngrender.ts
- [ ] packages/core/src/tools/pngrender.wiring.test.ts
- [ ] packages/core/src/tools/procvid.test.ts
- [ ] packages/core/src/tools/procvid.ts
- [ ] packages/core/src/tools/procvid.wiring.test.ts

## 2026-08-24T01:56:54.759Z
- [ ] packages/core/src/tools/geom.test.ts
- [ ] packages/core/src/tools/geom.ts

## 2026-08-24T02:12:56.633Z
- [ ] packages/core/src/ai/llm.ts
- [ ] packages/core/src/tools/index.ts

## 2026-08-24T02:45:14.791Z
- [ ] Task/procedural-demo.ts

## 2026-08-24T02:52:57.634Z
- [ ] packages/core/src/ai/llm.ts
- [ ] packages/core/src/tools/index.ts
- [ ] packages/core/src/tools/pngrender.wiring.test.ts
- [ ] packages/core/src/tools/procvid.wiring.test.ts

## 2026-08-24T03:39:27.333Z
- [ ] packages/core/src/ai/llm.ts
- [ ] packages/core/src/tools/index.ts
- [ ] packages/core/src/tools/pngrender.gif.test.ts
- [ ] packages/core/src/tools/pngrender.ts
- [ ] packages/core/src/tools/procvid.gif.test.ts
- [ ] packages/core/src/tools/procvid.ts

## 2026-08-24T04:11:46.890Z
- [ ] Task/procedural-demo.ts

## 2026-08-24T04:36:45.180Z
- [ ] Task/procedural-demo.ts
- [ ] packages/core/src/tools/pngrender.mediancut.test.ts
- [ ] packages/core/src/tools/pngrender.ts
- [ ] packages/core/src/tools/procvid.ts

## 2026-08-24T05:32:37.340Z
- [ ] packages/core/src/ai/llm.ts

## 2026-08-24T05:40:30.835Z
- [ ] apps/web/src/app/api/chat/general/route.ts
- [ ] apps/web/src/app/api/chat/route.ts
- [ ] apps/web/src/app/api/studio/chat/route.ts

## 2026-08-24T05:42:08.281Z
- [ ] apps/web/src/app/(app)/studio/studio-client.tsx
- [ ] apps/web/src/components/agent-chat.tsx
- [ ] apps/web/src/components/assistant-chat.tsx

## 2026-08-24T05:56:25.435Z
- [ ] packages/core/src/ai/llm.test.ts
- [ ] packages/core/src/omag/audiolibrary.test.ts

## 2026-08-24T05:59:15.928Z
- [ ] packages/core/src/ai/llm.test.ts

## 2026-08-24T06:12:53.107Z
- [ ] packages/core/src/tools/index.ts
- [ ] packages/core/src/tools/procedural-pub.test.ts
- [ ] packages/core/src/tools/procedural-pub.ts

## 2026-08-24T06:15:58.626Z
- [ ] cloudflare/worker.ts
- [ ] packages/core/src/db/client.ts
- [ ] packages/core/src/tools/gen-engine.ts

## 2026-08-24T06:25:45.547Z
- [ ] packages/core/src/tools/gen-engine.test.ts

## 2026-08-24T09:35:51.010Z
- [ ] packages/core/src/tools/cadgeo.test.ts
- [ ] packages/core/src/tools/cadgeo.ts

## 2026-08-24T09:41:42.996Z
- [ ] packages/core/src/tools/evo.test.ts
- [ ] packages/core/src/tools/evo.ts

## 2026-08-24T09:52:33.585Z
- [ ] packages/core/src/tools/evolution.test.ts
- [ ] packages/core/src/tools/evolution.ts

## 2026-08-24T10:11:03.520Z
- [ ] packages/core/src/tools/physics2d.test.ts
- [ ] packages/core/src/tools/physics2d.ts

## 2026-08-24T10:34:18.426Z
- [ ] packages/core/src/ai/llm.ts
- [ ] packages/core/src/tools/index.ts
- [ ] packages/core/src/tools/motor-evolutivo.wiring.test.ts

## 2026-08-24T15:42:10.188Z
- [ ] packages/core/src/tools/evo.ts
- [ ] packages/core/src/tools/physics2d.ts

## 2026-08-24T16:08:04.441Z
- [ ] packages/runtime/src/adapters/ai.test.ts
- [ ] packages/runtime/src/adapters/ai.ts

## 2026-08-24T18:38:21.336Z
- [ ] packages/core/src/tools/codevfx.test.ts
- [ ] packages/core/src/tools/codevfx.ts

## 2026-08-24T18:38:44.128Z
- [ ] packages/core/src/tools/recordly.test.ts
- [ ] packages/core/src/tools/recordly.ts

## 2026-08-24T18:38:57.901Z
- [ ] packages/core/src/ai/llm.ts
- [ ] packages/core/src/tools/index.ts

## 2026-08-24T19:32:45.180Z
- [ ] packages/core/src/tools/index.ts
- [ ] packages/core/src/tools/recordly.wiring.test.ts

## 2026-08-24T20:13:10.267Z
- [ ] packages/core/src/ai/llm.ts
- [ ] packages/core/src/tools/cerebro.test.ts
- [ ] packages/core/src/tools/cerebro.ts
- [ ] packages/core/src/tools/index.ts

## 2026-08-24T20:13:13.153Z
- [ ] Task/cerebro-cycle.ts

## 2026-08-24T20:41:00.967Z
- [ ] Task/cerebro-cycle.ts

## 2026-08-25T13:39:32.343Z
- [ ] apps/web/src/app/(app)/layout.tsx
- [ ] apps/web/src/components/app-shell/nav.tsx
- [ ] apps/web/src/components/ide/ide-shell.tsx
- [ ] apps/web/src/components/ide/nav-items.ts

## 2026-08-25T14:16:48.699Z
- [ ] packages/core/src/tools/index.ts
- [ ] packages/core/src/tools/studio-catalog.ts
- [ ] packages/core/src/tools/studio.test.ts
- [ ] packages/core/src/tools/studio.ts
- [ ] packages/core/src/tools/studio.wiring.test.ts

## 2026-08-25T14:54:52.449Z
- [ ] apps/web/src/app/(app)/studio/page.tsx
- [ ] apps/web/src/app/(app)/studio/studio-client.tsx
- [ ] apps/web/src/app/api/assets/[id]/derive/route.ts
- [ ] apps/web/src/app/api/assets/[id]/download/route.ts
- [ ] apps/web/src/app/api/assets/[id]/route.ts
- [ ] apps/web/src/app/api/library/assets/route.ts
- [ ] apps/web/src/app/api/tools/content/music/route.ts
- [ ] apps/web/src/components/studio/asset-actions.tsx
- [ ] apps/web/src/components/studio/creations-grid.tsx
- [ ] apps/web/src/components/studio/oss-lab.tsx
- [ ] apps/web/src/components/studio/storyboard-player.tsx
- [ ] apps/web/src/components/studio/types.ts
- [ ] apps/web/src/lib/server/studio-assets.ts

## 2026-08-25T16:06:04.875Z
- [ ] apps/web/src/app/(app)/workspace/page.tsx
- [ ] apps/web/src/app/(app)/workspace/workspace-client.tsx
- [ ] apps/web/src/app/api/chat/route.ts
- [ ] apps/web/src/components/agent-chat.tsx
- [ ] apps/web/src/components/ide/nav-items.ts

## 2026-08-25T17:22:48.358Z
- [ ] apps/web/src/app/(app)/studio/studio-client.tsx
- [ ] apps/web/src/app/api/tools/web/route.ts
- [ ] apps/web/src/components/studio/creations-grid.tsx
- [ ] packages/core/src/tools/studio-catalog.ts
- [ ] packages/core/src/tools/studio.test.ts
- [ ] packages/core/src/tools/studio.ts

## 2026-08-25T18:06:32.579Z
- [ ] apps/web/src/app/(app)/connections/connections-client.tsx
- [ ] apps/web/src/app/(app)/connections/page.tsx
- [ ] apps/web/src/app/api/connections/route.ts
- [ ] apps/web/src/app/api/connections/test/route.ts
- [ ] apps/web/src/components/ide/ide-shell.tsx
- [ ] apps/web/src/components/ide/nav-items.ts

## 2026-08-25T18:49:53.398Z
- [ ] packages/core/src/tools/reporeview.ts

## 2026-08-25T19:03:56.344Z
- [ ] apps/web/src/app/(app)/studio/studio-client.tsx
- [ ] apps/web/src/app/api/tools/web/screenshot/route.ts
- [ ] packages/core/src/tools/research-firecrawl.test.ts

## 2026-08-25T19:07:52.709Z
- [ ] packages/core/src/tools/reporeview.test.ts
- [ ] scripts/reporeview-run.ts

## 2026-08-25T19:15:53.795Z
- [ ] packages/core/src/tools/research.ts

## 2026-08-25T19:24:59.624Z
- [ ] packages/core/src/tools/research.ts

## 2026-08-25T19:25:25.709Z
- [ ] Task/cerebro-cycle.ts
- [ ] Task/media-v2-demo.ts
- [ ] packages/core/src/tools/geometry.test.ts
- [ ] packages/core/src/tools/geometry.ts
- [ ] packages/core/src/tools/procvid.test.ts
- [ ] packages/core/src/tools/procvid.ts

## 2026-08-25T21:08:24.065Z
- [ ] Task/cerebro-cycle.ts
- [ ] Task/media-v2-demo.ts
- [ ] apps/web/src/app/(app)/connections/connections-client.tsx
- [ ] apps/web/src/app/(app)/connections/page.tsx
- [ ] apps/web/src/app/(app)/studio/page.tsx
- [ ] apps/web/src/app/(app)/studio/studio-client.tsx
- [ ] apps/web/src/app/(app)/workspace/page.tsx
- [ ] apps/web/src/app/(app)/workspace/workspace-client.tsx
- [ ] apps/web/src/app/api/assets/[id]/derive/route.ts
- [ ] apps/web/src/app/api/assets/[id]/download/route.ts
- [ ] apps/web/src/app/api/assets/[id]/route.ts
- [ ] apps/web/src/app/api/chat/route.ts
- [ ] apps/web/src/app/api/connections/route.ts
- [ ] apps/web/src/app/api/connections/test/route.ts
- [ ] apps/web/src/app/api/library/assets/route.ts
- [ ] apps/web/src/app/api/tools/content/music/route.ts
- [ ] apps/web/src/app/api/tools/web/route.ts
- [ ] apps/web/src/app/api/tools/web/screenshot/route.ts
- [ ] apps/web/src/components/agent-chat.tsx
- [ ] apps/web/src/components/ide/ide-shell.tsx
- [ ] apps/web/src/components/ide/nav-items.ts
- [ ] apps/web/src/components/studio/asset-actions.tsx
- [ ] apps/web/src/components/studio/creations-grid.tsx
- [ ] apps/web/src/components/studio/oss-lab.tsx
- [ ] apps/web/src/components/studio/storyboard-player.tsx
- [ ] apps/web/src/components/studio/types.ts
- [ ] apps/web/src/lib/server/studio-assets.ts
- [ ] packages/core/src/tools/geometry.test.ts
- [ ] packages/core/src/tools/geometry.ts
- [ ] packages/core/src/tools/index.ts
- [ ] packages/core/src/tools/procvid.test.ts
- [ ] packages/core/src/tools/procvid.ts
- [ ] packages/core/src/tools/reporeview.test.ts
- [ ] packages/core/src/tools/reporeview.ts
- [ ] packages/core/src/tools/research.ts
- [ ] packages/core/src/tools/studio-catalog.ts
- [ ] packages/core/src/tools/studio.test.ts
- [ ] packages/core/src/tools/studio.ts
- [ ] packages/core/src/tools/studio.wiring.test.ts
- [ ] scripts/reporeview-run.ts

## 2026-08-25T22:10:43.463Z
- [ ] packages/core/src/tools/research-firecrawl.test.ts

## 2026-08-25T23:31:35.421Z
- [ ] apps/mobile/src/api/types.ts
- [ ] apps/web/src/app/api/assets/[id]/download/route.ts
- [ ] apps/web/src/app/api/assets/[id]/route.ts
- [ ] packages/core/src/tools/reporeview.ts

## 2026-08-25T23:42:48.038Z
- [ ] apps/mobile/src/api/client.ts
- [ ] apps/mobile/src/app/(tabs)/_layout.tsx
- [ ] apps/mobile/src/app/(tabs)/creaciones.tsx

## 2026-08-26T04:20:22.576Z
- [ ] apps/mobile/src/app/(tabs)/creaciones.tsx

## 2026-08-26T04:52:24.626Z
- [ ] packages/core/src/tools/autolearn.test.ts

## 2026-08-26T06:10:36.414Z
- [ ] packages/core/src/omag/audiolibrary.test.ts

## 2026-08-26T06:11:04.018Z
- [ ] apps/web/src/app/(app)/workspace/workspace-client.tsx
- [ ] apps/web/src/components/ide/ide-shell.tsx

## 2026-08-30T12:23:09.582Z
- [ ] apps/web/next.config.ts

## 2026-08-30T13:05:29.769Z
- [ ] apps/web/src/app/(app)/design-system/design-system-client.tsx
- [ ] apps/web/src/app/(app)/design-system/page.tsx
- [ ] apps/web/src/components/ide/ide-shell.tsx
- [ ] apps/web/src/components/ide/nav-items.ts
- [ ] apps/web/src/components/ide/theme-customizer.tsx
- [ ] apps/web/src/components/ide/theme-engine.ts
- [ ] apps/web/src/components/ide/theme-provider.tsx

## 2026-08-30T13:25:18.457Z
- [ ] apps/web/src/app/layout.tsx
- [ ] apps/web/src/components/aurora/aurora-canvas.tsx
- [ ] apps/web/src/components/ebooks/playground-canvas.tsx
- [ ] apps/web/src/lib/dev-cleanup.ts

## 2026-08-30T14:08:28.608Z
- [ ] apps/web/src/app/(marketing)/page.tsx
- [ ] apps/web/src/components/landing/landing-sections.tsx

## 2026-08-30T14:14:14.347Z
- [ ] apps/web/src/app/(app)/agents/[id]/error.tsx
- [ ] apps/web/src/app/(app)/agents/[id]/page.tsx
- [ ] apps/web/src/app/(app)/dashboard/error.tsx
- [ ] apps/web/src/app/(app)/dashboard/page.tsx
- [ ] apps/web/src/components/assistant-chat.tsx

## 2026-08-30T14:45:13.002Z
- [ ] apps/web/src/data/content-sources.ts
- [ ] packages/core/src/tools/content-engine.test.ts
- [ ] packages/core/src/tools/content-engine.ts
- [ ] packages/core/src/tools/content-templates.ts

## 2026-08-30T14:54:13.342Z
- [ ] apps/web/src/app/(app)/metrics/page.tsx
- [ ] apps/web/src/components/ide/ide-shell.tsx
- [ ] apps/web/src/components/metrics-client.tsx

## 2026-08-30T15:22:40.381Z
- [ ] apps/web/src/app/api/content/route.ts
- [ ] apps/web/src/data/content-sources.ts
- [ ] packages/core/src/ai/llm.ts
- [ ] packages/core/src/tools/content-engine.ts
- [ ] packages/core/src/tools/content-sources.ts
- [ ] packages/core/src/tools/index.ts

## 2026-08-30T16:19:13.884Z
- [ ] apps/web/src/app/(marketing)/content/page.tsx
- [ ] apps/web/src/app/api/content/generate-due/route.ts
- [ ] apps/web/src/components/content/content-client.tsx
- [ ] apps/web/src/components/ide/nav-items.ts
- [ ] packages/core/src/tools/content-sources.ts
- [ ] packages/core/src/tools/index.ts

## 2026-08-30T21:48:31.701Z
- [ ] apps/mobile/src/app/(tabs)/publicaciones.tsx
- [ ] apps/web/src/app/api/publications/route.ts
- [ ] apps/web/src/components/metrics-client.tsx
- [ ] apps/web/src/lib/server/context.ts
- [ ] apps/web/src/middleware.ts

## 2026-08-30T21:51:08.342Z
- [ ] Task/cerebro-cycle.ts
- [ ] apps/web/src/app/(app)/dashboard/page.tsx
- [ ] apps/web/src/app/(marketing)/content/history/page.tsx
- [ ] apps/web/src/app/api/content/list/route.ts
- [ ] apps/web/src/components/content/content-history-client.tsx
- [ ] packages/core/src/tools/content-manifest.ts
- [ ] packages/core/src/tools/index.ts

## 2026-08-30T22:26:56.228Z
- [ ] apps/web/src/app/api/health/route.ts

## 2026-08-30T22:37:04.620Z
- [ ] apps/web/src/app/layout.tsx
- [ ] apps/web/src/components/performance/web-vitals.tsx
- [ ] apps/web/src/components/ui/error-boundary.tsx
- [ ] apps/web/src/components/ui/loading.tsx
- [ ] apps/web/src/hooks/use-performance.ts

## 2026-08-30T22:39:01.296Z
- [ ] apps/web/next.config.ts
- [ ] apps/web/src/app/layout.tsx

## 2026-08-30T23:12:55.994Z
- [ ] Task/cerebro-cycle.ts
- [ ] apps/web/src/app/api/content/generate-due/route.ts
- [ ] apps/web/src/app/api/vitals/route.ts
- [ ] apps/web/src/types/web-vitals.d.ts
- [ ] packages/core/src/tools/content-engine.test.ts
- [ ] packages/core/src/tools/content-engine.ts

## 2026-08-31T04:53:03.364Z
- [ ] apps/web/src/app/(app)/cloud/page.tsx
- [ ] packages/core/src/ai/mem0-client.ts

## 2026-08-31T05:31:33.065Z
- [ ] apps/web/src/app/(app)/content/history/page.tsx
- [ ] apps/web/src/app/(app)/content/page.tsx
- [ ] apps/web/src/app/(app)/ebooks/[id]/page.tsx
- [ ] apps/web/src/app/(app)/ebooks/library/page.tsx
- [ ] apps/web/src/app/(app)/ebooks/page.tsx
- [ ] apps/web/src/app/(app)/ebooks/playground/page.tsx
- [ ] apps/web/src/app/(app)/studio/studio-client.tsx
- [ ] apps/web/src/app/(marketing)/ebooks/[id]/page.tsx
- [ ] apps/web/src/app/(marketing)/ebooks/library/page.tsx
- [ ] apps/web/src/app/(marketing)/ebooks/page.tsx
- [ ] apps/web/src/app/(marketing)/ebooks/playground/page.tsx
- [ ] apps/web/src/components/gallery/detail-dialog.tsx
- [ ] apps/web/src/components/gallery/prompt-card.tsx

## 2026-08-31T05:33:13.580Z
- [ ] apps/web/src/app/(app)/playground/diagrams-client.tsx
- [ ] apps/web/src/app/(app)/playground/geometry-client.tsx
- [ ] apps/web/src/app/(app)/playground/page.tsx
- [ ] apps/web/src/app/(app)/playground/playground-client.tsx
- [ ] apps/web/src/components/ide/nav-items.ts

## 2026-08-31T15:27:08.995Z
- [ ] apps/web/src/app/(app)/playground/codevfx-client.tsx
- [ ] apps/web/src/app/(app)/playground/playground-client.tsx
- [ ] apps/web/src/app/(app)/playground/procedural-client.tsx
- [ ] apps/web/src/app/(app)/playground/travel-client.tsx

## 2026-08-31T16:00:15.073Z
- [ ] apps/web/src/app/api/codevfx/route.ts
- [ ] apps/web/src/app/api/geometry/route.ts
- [ ] apps/web/src/app/api/travel/route.ts

## 2026-08-31T16:11:51.575Z
- [ ] apps/web/src/app/(app)/playground/travel-client.tsx

## 2026-08-31T16:35:40.617Z
- [ ] apps/web/src/app/api/geometry/route.ts
- [ ] apps/web/src/app/layout.tsx
- [ ] packages/core/src/omag/audiolibrary.test.ts
- [ ] packages/core/src/tools/content.live.test.ts

## 2026-08-31T18:28:26.790Z
- [ ] apps/web/src/app/(app)/hypothesis-quest/engine/camera.ts
- [ ] apps/web/src/app/(app)/hypothesis-quest/engine/chaos.ts
- [ ] apps/web/src/app/(app)/hypothesis-quest/engine/levels/collatz.ts
- [ ] apps/web/src/app/(app)/hypothesis-quest/engine/levels/goldbach.ts
- [ ] apps/web/src/app/(app)/hypothesis-quest/engine/levels/pnp.ts
- [ ] apps/web/src/app/(app)/hypothesis-quest/engine/levels/riemann.ts
- [ ] apps/web/src/app/(app)/hypothesis-quest/engine/player.ts
- [ ] apps/web/src/app/(app)/hypothesis-quest/engine/world.ts
- [ ] apps/web/src/app/(app)/hypothesis-quest/hypothesis-quest-client.tsx
- [ ] apps/web/src/app/(app)/hypothesis-quest/page.tsx
- [ ] apps/web/src/components/ide/nav-items.ts
- [ ] packages/core/src/ai/llm.ts
- [ ] packages/core/src/omag/audiolibrary.test.ts
- [ ] packages/core/src/tools/catalog.ts
- [ ] packages/core/src/tools/index.ts
- [ ] packages/core/src/tools/loop-trigger.test.ts
- [ ] packages/core/src/tools/loop-trigger.ts

## 2026-08-31T19:10:04.234Z
- [ ] apps/web/src/app/api/loop/trigger/route.ts

## 2026-08-31T21:45:02.747Z
- [ ] apps/web/src/app/api/bridge/route.ts
- [ ] apps/web/src/lib/api-error.ts
- [ ] packages/core/src/ai/geom-safety.test.ts
- [ ] packages/core/src/ai/llm.ts
- [ ] packages/core/src/tools/catalog.ts
- [ ] packages/core/src/tools/chat-bridge.test.ts
- [ ] packages/core/src/tools/chat-bridge.ts
- [ ] packages/core/src/tools/index.ts

## 2026-08-31T21:50:43.008Z
- [ ] .vscode-extension/src/chat-panel.ts
- [ ] .vscode-extension/src/extension.ts
- [ ] .vscode-extension/src/status-bar.ts
- [ ] .vscode-extension/src/task-provider.ts
- [ ] .vscode-extension/src/ws-client.ts

## 2026-08-31T22:00:08.861Z
- [ ] packages/core/src/lib/errors.test.ts
- [ ] packages/core/src/lib/errors.ts

## 2026-08-31T22:02:54.263Z
- [ ] apps/web/src/app/api/loop/trigger/route.ts

## 2026-08-31T22:03:47.087Z
- [ ] apps/web/src/app/api/bridge/route.ts

## 2026-09-01T00:38:32.347Z
- [ ] .vscode-extension/src/chat-panel.ts
- [ ] packages/core/src/utils/safe-json.ts

## 2026-09-01T01:10:49.134Z
- [ ] apps/web/src/app/(app)/chaos-game/chaos-game-client.tsx
- [ ] apps/web/src/app/(app)/chaos-game/engine/attractors.ts
- [ ] apps/web/src/app/(app)/chaos-game/engine/integrator.ts
- [ ] apps/web/src/app/(app)/chaos-game/engine/renderer.ts
- [ ] apps/web/src/app/(app)/chaos-game/page.tsx
- [ ] apps/web/src/components/ide/nav-items.ts

## 2026-09-01T01:25:50.127Z
- [ ] packages/core/src/tools/catalog.ts

## 2026-09-01T01:28:02.174Z
- [ ] .vscode-extension/src/extension.ts
- [ ] apps/web/src/middleware.ts
- [ ] packages/core/src/ai/llm.ts

## 2026-09-02T02:29:15.089Z
- [ ] packages/core/src/tools/chat-bridge.ts
- [ ] packages/runtime/src/api/runtime-handlers.ts

## 2026-09-02T03:54:10.020Z
- [ ] .vscode-extension/src/chat-panel.ts
- [ ] .vscode-extension/src/extension.ts
- [ ] .vscode-extension/src/status-bar.ts
- [ ] .vscode-extension/src/ws-client.ts

## 2026-09-02T04:48:29.223Z
- [ ] .vscode-extension/src/extension.ts
- [ ] .vscode-extension/src/tasks-panel.ts

## 2026-09-02T05:13:39.705Z
- [ ] packages/core/src/tools/chat-bridge.ts
- [ ] packages/runtime/src/api/runtime-handlers.ts

## 2026-09-02T05:13:45.163Z
- [ ] .vscode-extension/src/chat-panel.ts
- [ ] packages/core/src/utils/safe-json.ts

## 2026-09-02T05:13:49.597Z
- [ ] .vscode-extension/src/extension.ts
- [ ] .vscode-extension/src/tasks-panel.ts

## 2026-09-02T05:22:26.143Z
- [ ] apps/web/next.config.ts
- [ ] apps/web/src/app/(app)/hypothesis-quest/hypothesis-quest-client.tsx
- [ ] apps/web/src/instrumentation.ts
- [ ] packages/core/src/ai/llm.ts
- [ ] packages/core/src/tools/catalog.ts
- [ ] packages/core/src/tools/index.ts

## 2026-09-02T06:52:12.722Z
- [ ] apps/web/next.config.ts

## 2026-09-02T07:50:17.839Z
- [ ] apps/web/src/app/(app)/agents/new/CreateAgentFormWrapper.tsx
- [ ] apps/web/src/app/(app)/agents/new/page.tsx
- [ ] apps/web/src/app/(app)/ebooks/playground/PlaygroundCanvasWrapper.tsx
- [ ] apps/web/src/app/(app)/ebooks/playground/page.tsx
- [ ] apps/web/src/app/(app)/studio/StudioClientWrapper.tsx
- [ ] apps/web/src/app/(app)/studio/page.tsx

## 2026-09-02T08:15:58.070Z
- [ ] apps/web/src/app/development-cleanup.ts
- [ ] apps/web/src/app/layout.tsx

## 2026-09-02T08:40:23.161Z
- [ ] apps/web/src/app/(app)/dashboard/VirtualizedAgentList.tsx
- [ ] apps/web/src/app/(app)/dashboard/page.tsx

## 2026-09-02T09:26:07.446Z
- [ ] apps/web/src/components/landing/LazySection.tsx
- [ ] apps/web/src/components/landing/landing-sections.tsx

## 2026-09-02T23:05:02.539Z
- [ ] Task/chaos-game-demo.ts
- [ ] packages/core/src/tools/chaos-game.test.ts
- [ ] packages/core/src/tools/chaos-game.ts
- [ ] packages/core/src/tools/index.ts

## 2026-09-02T23:47:52.969Z
- [ ] packages/core/src/ai/llm.ts
- [ ] packages/core/src/tools/index.ts

## 2026-09-03T01:14:35.869Z
- [ ] apps/web/src/app/(app)/hypothesis-quest/engine/levels/consciousness.ts
- [ ] apps/web/src/app/(app)/hypothesis-quest/engine/levels/halting.ts
- [ ] apps/web/src/app/(app)/hypothesis-quest/engine/levels/navier-stokes.ts
- [ ] apps/web/src/app/(app)/hypothesis-quest/engine/levels/post-quantum-crypto.ts
- [ ] apps/web/src/app/(app)/hypothesis-quest/engine/levels/protein-folding.ts
- [ ] apps/web/src/app/(app)/hypothesis-quest/engine/levels/time-arrow.ts

## 2026-09-03T01:24:19.312Z
- [ ] packages/core/src/tools/chaos/index.ts

## 2026-09-03T15:38:16.033Z
- [ ] .vscode-extension/src/code-lens.ts
- [ ] .vscode-extension/src/extension.ts
- [ ] packages/core/src/tools/catalog.ts

## 2026-09-03T16:00:47.737Z
- [ ] apps/web/src/app/api/bridge/route.ts

## 2026-09-03T17:15:07.229Z
- [ ] apps/web/src/components/chaos-game/ChaosGameClient.tsx
- [ ] apps/web/src/components/chaos-game/DivergenceIndicator.tsx
- [ ] apps/web/src/components/chaos-game/LiveMetrics.tsx

## 2026-09-03T17:16:05.239Z
- [ ] apps/web/src/components/chaos-game/AttractorSelect.tsx
- [ ] apps/web/src/components/chaos-game/ChaosCanvas.tsx
- [ ] apps/web/src/components/chaos-game/InitialConditionSliders.tsx

## 2026-09-03T17:22:11.042Z
- [ ] apps/web/src/app/(app)/dashboard/page.tsx
- [ ] apps/web/src/app/(app)/hypothesis-quest/engine/levels/halting.ts
- [ ] apps/web/src/app/layout.tsx
- [ ] apps/web/src/components/chaos-game/ChaosSidebar.tsx
- [ ] packages/core/src/tools/catalog.ts

## 2026-09-03T17:58:51.819Z
- [ ] packages/core/src/tools/catalog.ts
- [ ] packages/core/src/tools/chaos/attractors.ts
- [ ] packages/core/src/tools/chaos/constants.ts
- [ ] packages/core/src/tools/chaos/rk4.ts
- [ ] packages/core/src/tools/chaos/trajectory.ts
- [ ] packages/core/src/tools/chaos/types.ts

## 2026-09-03T21:17:04.264Z
- [ ] packages/core/src/tools/catalog.ts

## 2026-09-03T21:25:40.031Z
- [ ] packages/core/src/tools/index.ts

## 2026-09-03T22:46:38.224Z
- [ ] packages/core/src/ai/llm.ts

## 2026-09-03T23:00:28.803Z
- [ ] packages/core/src/ai/llm.ts
- [ ] packages/core/src/tools/index.ts

## 2026-09-03T23:43:54.385Z
- [ ] packages/core/src/ai/llm.ts

## 2026-09-03T23:50:13.552Z
- [ ] packages/core/src/tools/automation.test.ts
- [ ] packages/core/src/tools/automation.ts
- [ ] packages/core/src/tools/model-memory.test.ts
- [ ] packages/core/src/tools/recorder.test.ts
- [ ] packages/core/src/tools/stitch.ts
- [ ] packages/memory-engine/src/api/memory-client.ts
- [ ] packages/memory-engine/src/background/loop.ts

## 2026-09-04T13:50:49.457Z (catalog + index)
- [x] packages/core/src/tools/catalog.ts (header comment: tool catalog with i18n)
- [x] packages/core/src/tools/index.ts (header comment: tool registry re-exports)

## 2026-09-04T00:17:51.783Z
- [ ] apps/web/src/app/(app)/actions.ts
- [ ] apps/web/src/app/api/assets/[id]/derive/route.ts
- [ ] apps/web/src/app/api/bridge/route.ts
- [ ] apps/web/src/app/api/library/assets/route.ts
- [ ] packages/core/src/tools/reach.test.ts
- [ ] packages/core/src/tools/reach.ts
- [ ] packages/core/src/tools/web.test.ts
- [ ] packages/core/src/tools/web.ts

## 2026-09-04T01:27:18.642Z
- [ ] cloudflare/worker.ts
- [ ] packages/core/src/auth/password.test.ts
- [ ] packages/core/src/auth/password.ts
- [ ] packages/runtime/src/orchestrator/coordinator.ts

## 2026-09-04T02:35:46.358Z
- [ ] apps/web/src/app/api/assets/[id]/derive/route.ts
- [ ] apps/web/src/app/api/publications/[id]/approve/route.ts
- [ ] apps/web/src/app/api/publications/[id]/feedback/route.ts
- [ ] apps/web/src/app/api/publications/[id]/publish/route.ts
- [ ] apps/web/src/app/api/publications/[id]/reject/route.ts
- [ ] apps/web/src/app/api/publications/metrics/route.ts
- [ ] apps/web/src/app/api/publications/publish-due/route.ts
- [ ] apps/web/src/app/api/tools/web/route.ts
- [ ] apps/web/src/app/api/tools/web/screenshot/route.ts
- [ ] apps/web/src/lib/server/sanitize-error.ts
- [ ] packages/core/src/domain/connections.ts

## 2026-09-04T03:47:47.288Z
- [ ] packages/core/src/ai/llm.ts
- [ ] packages/runtime/src/api/runtime-handlers.ts
- [ ] packages/runtime/src/api/server.test.ts
- [ ] packages/runtime/src/api/server.ts

## 2026-09-04T04:06:29.247Z
- [ ] packages/core/src/ai/llm.ts

## 2026-09-04T05:33:46.601Z
- [ ] apps/web/next.config.ts
- [ ] apps/web/src/app/(app)/chaos-game/engine/renderer.ts
- [ ] packages/core/src/ai/chat-memory.ts
- [ ] packages/core/src/ai/provider-stats.ts
- [ ] packages/core/src/domain/briefs.ts
- [ ] packages/core/src/omag/mediafield.ts
- [ ] packages/core/src/prompt/director.ts
- [ ] packages/core/src/tools/content.ts

## 2026-09-04T05:42:43.365Z
- [ ] apps/web/src/lib/server/context.ts
- [ ] apps/web/src/middleware.ts
- [ ] packages/core/src/auth/session.ts

## 2026-09-04T06:27:53.838Z
- [ ] apps/web/src/app/api/assets/[id]/download/route.ts
- [ ] apps/web/src/app/api/assets/[id]/route.ts
- [ ] apps/web/src/app/api/auth/login/route.ts
- [ ] apps/web/src/lib/server/brute-force.ts
- [ ] apps/web/src/lib/server/download-token.ts

## 2026-09-04T06:59:41.879Z
- [ ] packages/core/src/tools/connections-catalog.ts

## 2026-09-04T08:27:27.886Z
- [ ] apps/web/next.config.ts
- [ ] apps/web/src/middleware.ts

## 2026-09-04T13:50:49.457Z
- [x] packages/core/src/ai/llm.ts (header comment: AI Gateway brain)
- [ ] packages/core/src/tools/batch-executor.test.ts
- [x] packages/core/src/tools/batch-executor.ts (header + section comments)
- [ ] packages/core/src/tools/blackboard.test.ts
- [ ] packages/core/src/tools/blackboard.ts (already has good comments)
- [x] packages/core/src/tools/catalog.ts (header comment: tool catalog with i18n)
- [ ] packages/core/src/tools/competitive-intel.test.ts
- [ ] packages/core/src/tools/competitive-intel.ts (already has good comments)
- [ ] packages/core/src/tools/complexity-router.test.ts
- [ ] packages/core/src/tools/complexity-router.ts (already has good comments)
- [ ] packages/core/src/tools/feedback-analyzer.test.ts
- [ ] packages/core/src/tools/feedback-analyzer.ts (already has good comments)
- [x] packages/core/src/tools/index.ts (header comment: tool registry)
- [ ] packages/core/src/tools/perf-optimizer.test.ts
- [ ] packages/core/src/tools/perf-optimizer.ts (already has good comments)
- [ ] packages/core/src/tools/release-manager.test.ts
- [ ] packages/core/src/tools/release-manager.ts (already has good comments)
- [ ] packages/core/src/tools/tech-debt.test.ts
- [ ] packages/core/src/tools/tech-debt.ts (already has good comments)

## 2026-09-04T20:34:49.408Z
- [ ] packages/core/src/tools/batch-executor.test.ts
- [x] packages/core/src/tools/batch-executor.ts (header + section comments)

## 2026-09-04T20:46:00.038Z
- [ ] apps/web/src/app/api/omag/route.commented.ts
- [ ] packages/core/src/omag/orchestrator.commented.ts

## 2026-09-04T20:47:41.713Z
- [ ] packages/core/src/tools/catalog.ts
- [ ] packages/core/src/tools/index.ts

## 2026-09-04T20:48:12.602Z
- [ ] packages/core/src/ai/llm.ts

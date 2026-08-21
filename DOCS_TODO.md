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

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
- [ ] apps/web/playwright.config.ts
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
- [ ] apps/web/playwright.config.ts
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

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

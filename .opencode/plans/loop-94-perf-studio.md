# Plan: loop-94 — Rendimiento y estabilidad (host local, servidor web/nube, Studio)

## Objetivo
Host local rápido y que no se trabe: modelo local robusto (Ollama→LM Studio, cloud solo si hay key),
Studio responsive (stop/progreso/error), servidor con timeouts + SQLite estable, cloud worker endurecido.
Principio: IA local sin intermediario (modelo local + herramientas keyless offline).

## Fases
- F1: timeouts+abort+keep-alive en llamadas a modelos (llm.ts/gateway.ts) + fallback local + catch AiUnavailableError en rutas + reach.ts withTimeout.
- F2: fix bug studio chat (enum 400) + stop/progreso/error UX en studio-client + agent/assistant-chat + catch AiUnavailableError.
- F3: middleware/server timeout + SQLite tuning (connection_limit/timeout) + gen-engine :8100 + workers + onFinish fuera de camino critico.
- F4: next.config compress + cloudflare worker hardening + start.py auto-heal.

## Archivos
packages/core/src/ai/llm.ts, gateway.ts, tools/reach.ts, tools/gen-engine.ts, db/client.ts, prisma/schema.prisma
apps/web/src/app/api/studio/chat/route.ts, app/(app)/studio/studio-client.tsx, components/agent-chat.tsx,
assistant-chat.tsx, app/api/chat/route.ts, chat/general/route.ts, middleware.ts (nuevo), next.config.ts
cloudflare/worker.ts, start.py

## Gates por fase
typecheck (root+core) -> lint -> test core --no-cache -> build web. Commit pathspec por fase.

## Estado (cierre 24/08)
- F1 DONE: 3da0905 (modelFetch timeout 120s + resolveModel local-first fallback Ollama→LM Studio; reach.ts ya tenía withTimeout). Gates GREEN.
- F2 DONE: d43f25d (studio enum 400 + AiUnavailableError→503 en chat routes) + f4aea13 (stop/retry UI + postJson timeout + error sin "set OPENAI_API_KEY"). Gates GREEN.
- F3 DONE (parcial): afb790e (db/client.ts connection_limit=1 para evitar "database is locked"; gen-engine default :8100 para no colisionar con webhook :8000) + 6e58775 (test :8100). NO se hizo middleware global (el modelo timeout de 120s ya acota el stall) ni onFinish fuera de camino crítico (onFinish ya corre post-stream, no bloquea el stream). Gates GREEN (1415 tests, build OK).
- F4 DONE (parcial): afb790e incluye cloudflare/worker.ts hardening (rate-limit real 120/min, token timing-safe, CORS lock por CLOUD_ALLOWED_ORIGINS). PENDIENTE start.py auto-heal (kill por puerto frágil) y next.config compress (Next 15 ya comprime en next start; añadir `compress` es inválido). Se dejan como follow-up.
- Conclusión: el bug reportado (studio agent request se traba) está resuelto: capability enum válido, fallback local-first, timeout de modelo de 120s con abort, y UX stop/retry/error. Todos los gates en verde. No se hizo push (requiere aprobación humana).

# Plan — Proveedor Qwen (qwen3.8-max-preview)

## Contexto
Usuario pide integrar **Qwen 3.8 Max** ("usando todas sus mejores capacidades") y, si la
implementación es mejora, añadir los demás modelos Qwen. Verificado vía web (2026-08): Qwen3.8-Max
es real — release 2026-08-03, ID `qwen3.8-max-preview`, 2.4T MoE / 95B activos, 1M contexto,
entrada vision+texto, thinking + tool calling, vía DashScope OpenAI-compatible.

## Objetivo
Añadir Qwen como proveedor del gateway de `ai/llm.ts`, seleccionable con `ULTRAIA_PROVIDER=qwen`,
usando el endpoint OpenAI-compatible de DashScope. Habilitar thinking mode y exponer la familia Qwen.

## Archivos a tocar
- `packages/core/src/ai/llm.ts` — `qwenModel()` + `qwenFetch` (inyecta `enable_thinking`),
  `ProviderName` + `'qwen'`, `defaultNameFor`/`buildProvider`, `QWEN_MODELS`, `QWEN_DEFAULT_MODEL`.
- `packages/core/src/ai/qwen-provider.test.ts` — 3 tests (resolución, default, familia).
- `.env.example` — `DASHSCOPE_API_KEY`, `QWEN_BASE_URL`, `QWEN_ENABLE_THINKING`, `QWEN_MODEL`.

## Capacidades aprovechadas ("mejores")
- 1M contexto (inherente en messages).
- Thinking mode vía `enable_thinking` inyectado en body de chat/completions (`qwenFetch`).
- Tool calling / structured a través del gateway Vercel AI SDK existente.
- Fallback local (ollama/lmstudio) si no hay key — no rompe offline.

## NO-hacer
- No tocar el resto de proveedores ni el shell/web.
- No hardcodear el modelo en UI; usa `ULTRAIA_MODEL`/`QWEN_MODEL`.

## Verificación
- typecheck (core+web+runtime) ✅ · lint ✅ · test core (1763) ✅ · build ✅.

## Veredicto
Es mejora: suma un frontier model (coding/razonamiento top, 1M ctx) y elige el usuario. Se añaden
los "otros modelos" (`QWEN_MODELS`) como selectables.

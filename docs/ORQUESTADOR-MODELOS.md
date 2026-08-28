# Orquestador de Modelos y Memoria de Chat (graphity)

Documento de referencia: **qué modelo/modo usar para qué**, cómo el orquestador evita
fallas por failover, y cómo la memoria de chat preserva la consistencia al cambiar de
modelo o modo.

Estado: implementado en `packages/core/src/ai/` (`orchestrator.ts`, `chat-memory.ts`,
`model-catalog.ts`) y cableado como capabilities en `llm.ts` (`chatStream`).

---

## 1. Proveedores y claves

| Proveedor | Variable de entorno | Keyless | Notas |
|---|---|---|---|
| `ollama` | (local) | ✅ | Siempre disponible si hay Ollama en `11434`. Modelo por defecto `llama3.1`. |
| `lmstudio` | (local) | ✅ | Siempre disponible si hay LM Studio en `1234`. Modelo `qwen2.5-7b-instruct`. |
| `openrouter` | `OPENROUTER_API_KEY` | ⚠️ parcial | Los modelos `:free` de OpenRouter **no requieren más que la clave de OpenRouter** (ya configurada en `.env`). Es la vía keyless-first preferida para la nube. |
| `google` | `GOOGLE_API_KEY` | ❌ | Gemini. Necesaria clave propia. |
| `deepseek` | `DEEPSEEK_API_KEY` | ❌ | Razonamiento barato. |
| `qwen` | `DASHSCOPE_API_KEY` | ❌ | Qwen de Alibaba. |
| `groq` | `GROQ_API_KEY` | ❌ | Ultra rápido (Llama/Mixtral). |
| `mistral` | `MISTRAL_API_KEY` | ❌ | Mistral/Ministral. |
| `together` | `TOGETHER_API_KEY` | ❌ | Muchos open-weights. |
| `huggingface` | `HUGGINGFACE_API_KEY` | ❌ | HF Inference. |

> `.env` ya contiene `OPENROUTER_API_KEY` (configurada por el usuario). Nunca se commitea `.env`.
> Para usar Google/DeepSeek/Qwen/Groq/Mistral/Together/HuggingFace, añade su clave en `.env`
> (ver `.env.example`, que tiene todas las variables documentadas y vacías).

---

## 2. Tiers (qué modelo usar para qué)

El orquestador elige el **tier** según la tarea y el modo operativo:

| Tier | Cuándo usarlo | Comportamiento típico |
|---|---|---|
| `fast` | Resúmenes, traducción, clasificación, respuestas cortas | Modelo pequeño/rápido, baja latencia. |
| `balanced` | Chat general, redacción | Calidad media, buena velocidad. |
| `coding` | Generar/corregir código, pipelines de agente | Modelo fuerte en instrucciones y código. |
| `reasoning` | Planificación, matemáticas, análisis complejo | Cadena de pensamiento, mayor latencia. |
| `vision` | Imágenes/UI como entrada | Multimodal. |

El `FREE_MODEL_CATALOG` (`model-catalog.ts`) lista los modelos gratis disponibles por
tier y proveedor; el orquestador lo consulta para armar la lista de candidatos.

---

## 3. Modos operativos y estrategia (P-P / P-B / L-T / S-D)

El orquestador ajusta la **selección de modelo** y el **system prompt** según el modo
operacional del harness UltraIa:

| Modo | Tier por defecto | Estrategia de chat inyectada |
|---|---|---|
| `P-P` (Piv-Plan) | `reasoning` | `reasoning` — separa hipótesis/evidencia/conclusión. |
| `P-B` (Piv-Build) | `coding` | `agentic` — pasos concretos, usa herramientas, verifica. |
| `L-T` (Learn-Test) | `balanced` | `concise` — directo al grano. |
| `S-D` (Spec-Design) | `reasoning` | `creative` — originalidad y diseño. |

La estrategia también puede forzarse explícitamente con `strategy` (`concise` /
`agentic` / `reasoning` / `creative`), sobreescribiendo la del modo.

---

## 4. Failover automático (evitar fallas)

`ModelOrchestrator` construye una **cadena ordenada de candidatos** y conmuta si uno
falla:

1. Modelo forzado explícitamente (`model` / `provider`+`model`).
2. Tier objetivo (por tarea, modo o `tier` explícito), ordenado por:
   - proveedor primario (`ULTRAIA_PROVIDER`) primero,
   - **keyless primero** (OpenRouter `:free` antes que proveedores con clave),
   - mayor contexto disponible.
3. Fallback keyless si el tier no tuvo coincidencias.
4. Fallback local (Ollama / LM Studio) al final — siempre disponible sin clave.

`route(req)` devuelve el primer `LanguageModel` **construible** (clave presente);
`withFailover(fn, req)` ejecuta `fn(model)` y, si falla en runtime (timeout, 4xx/5xx,
red), conmuta al siguiente candidato. Resultado: **nunca se cuelga ni falla por un solo
proveedor caído**.

---

## 5. Memoria de chat (graphity) — consistencia entre modelos/modos

`ChatSessionMemory` guarda la conversación y deriva un **grafo de entidades**
(`KnowledgeGraph`, formato de `kgraph.ts`) de forma determinista y **sin LLM**:

- `create` → nueva sesión con `sessionId`.
- `append` (role + content) → añade un turno.
- `graph` → grafo de entidades extraídas (capitalizadas + frases entrecomilladas) y
  co-ocurrencias como aristas. Es la "memoria extendible".
- `context` → bloque de texto compacto (`[CHAT MEMORY — sesión ...]`, resumen, entidades
  clave, ventana de turnos recientes) **listo para inyectar como system context** cuando
  se cambia de modelo o modo. Así el nuevo modelo retoma el hilo sin perder intención.
- `save` / `load` → persistencia atómica en `.ultraia/chat-sessions/`.

Ventaja: el contexto es **determinista** (misma sesión ⇒ mismo bloque) y keyless, por lo
que funciona igual si el orquestador salta de OpenRouter a Ollama a Google en mitad de la
conversación.

---

## 6. Cómo activar las capabilities

En el `chatStream` de `llm.ts`, pasa las capabilities en `opts.tools`:

```ts
chatStream({
  system: '...',
  messages: [...],
  tools: ['orchestrator', 'chat_memory', /* otras capabilities */],
});
```

Las herramientas expuestas al agente son:

- `orchestrator_route` (acciones): `recommend` (modelo sugerido por tarea/modo),
  `route` (resuelve el `LanguageModel` construible), `providers` (claves disponibles),
  `context` (system prompt con modo+estrategia), `catalog` (modelos gratis).
- `chat_memory_session` (acciones): `create`, `append`, `context`, `graph`, `save`, `load`.

---

## 7. Resumen "qué usar para qué"

- **Quiero que nunca falle y sea gratis:** dejar el orquestador en automático (OpenRouter
  `:free` keyless-first + fallback local). No hace falta tocar nada.
- **Tarea de código/agente:** modo `P-B` ⇒ tier `coding` + estrategia `agentic`.
- **Planificación/razonamiento:** modo `P-P`/`S-D` ⇒ tier `reasoning`.
- **Resúmenes/traducción:** tier `fast` (o modo `L-T` ⇒ `concise`).
- **Necesito un proveedor concreto (p. ej. Gemini):** pon `GOOGLE_API_KEY` en `.env`;
  el orquestador lo usará cuando corresponda al tier, o fuérzalo con `model`.
- **No perder el hilo al cambiar de modelo:** usar `chat_memory_session` (`append` en
  cada turno, `context` al reanudar/inyectar en el nuevo modelo).

---

## 8. Archivos

- `packages/core/src/ai/orchestrator.ts` — `ModelOrchestrator` (routing + failover).
- `packages/core/src/ai/chat-memory.ts` — `ChatSessionMemory` (graphity + contexto).
- `packages/core/src/ai/model-catalog.ts` — `FREE_MODEL_CATALOG` (modelos gratis).
- `packages/core/src/ai/llm.ts` — cableado de `orchestrator_route` / `chat_memory_session`
  en `chatStream`.
- `packages/core/src/tools/index.ts` + `catalog.ts` — capability `orchestrator` /
  `chat_memory` en el catálogo multiidioma.

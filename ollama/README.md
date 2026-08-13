# UltraIa · Carga experta de modelos locales (Ollama)

Guía para cargar los 8 agentes de UltraIa con **información** (Modelfile + system prompt), **razonamiento** (parámetros calibrados por rol) y **funcionalidad** (tools, structured output, embeddings/RAG para la "memoria privada"), todo **100% local y sin API keys**.

---

## 1. ¿Qué hay en esta carpeta?

| Archivo | Qué es |
|---|---|
| `Modelfile.*` (x8) | Un modelo tuneado por agente: system prompt experto + parámetros calibrados por rol. Se crean con `ollama create`. |
| `agents.json` | Mapeo agente → modelo Ollama, parámetros por rol y por caso de uso (máquina-legible, útil para ti y para código). |
| `setup-models.ps1` | Script de instalación único (Windows): descarga base + crea los 8 modelos + verifica. |

---

## 2. Quickstart

```powershell
cd ollama
.\setup-models.ps1        # crea ultraia-orquestador, ultraia-investigador, ...
```

Para usarlos en la app:

```dotenv
# .env (raíz) y apps/web/.env
ULTRAIA_PROVIDER="ollama"
ULTRAIA_MODEL="ultraia-orquestador"   # 1 modelo global (recomendado en local)
```

> Para que **cada agente use su propio tuneo**: fija el campo `model` de cada `AgentVersion` con el `ollamaModel` de `agents.json` (p. ej. `ultraia-investigador`). Con `model: ''` todos caen en `ULTRAIA_MODEL` — ese es el comportamiento actual del seed.

---

## 3. Cómo funciona la integración (funcionamiento real)

### 3.1. Ruta de la petición
```
apps/web (chat UI) → api route (Vercel AI SDK) → packages/core/src/ai/llm.ts
   → resolveModel(ULTRAIA_PROVIDER + ULTRAIA_MODEL)
   → @ai-sdk/openai con baseURL http://localhost:11434/v1 (compat: 'compatible')
   → Ollama (OpenAI-compatible) → llama3.1:8b (o ultraia-*)
```

### 3.2. Por qué funciona sin cambios de código
Ollama expone un endpoint **OpenAI-compatible** en `http://localhost:11434/v1`. `createOpenAI({ baseURL, apiKey: 'ollama', compatibility: 'compatible' })` (llm.ts:26-30) hace que todo el stack del Vercel AI SDK (`streamText`, `generateText`, `generateObject`, `tool`) funcione contra Ollama sin provider especial. El `modelCache` (llm.ts:14) evita re-instanciar el provider por request.

### 3.3. Prioridad de resolución de modelo
`resolveModel()` (llm.ts:61-88): `model` del agente → `ULTRAIA_MODEL` → default por proveedor (`llama3.1` para ollama).

---

## 4. Información experta: razonamiento y parámetros por rol

Cada Modelfile fija `num_ctx`, `num_predict`, `temperature`, `top_p`, `repeat_penalty` y `stop` según la tarea. Lógica detrás:

| Rol | Modelo | temp | num_ctx | num_predict | Por qué |
|---|---|---|---|---|---|
| Analista | ultraia-analista | **0.2** | 16384 | 2048 | Extracción/análisis: baja temp = determinista, citas y rangos. Contexto amplio para datasets/benchmarks. |
| Investigador | ultraia-investigador | 0.3 | 16384 | 2048 | Precisión + fuentes largas (web). Confianza alta. |
| Gestor | ultraia-gestor | 0.4 | 8192 | 2048 | Estructura de plan, ordenada pero no rígida. |
| Orquestador | ultraia-orquestador | 0.5 | **16384** | 4096 | Integra salidas de 7 agentes: necesita el contexto más grande + output largo. |
| Publicador | ultraia-publicador | 0.6 | 8192 | 2048 | Copy + formato por plataforma: creatividad moderada. |
| Redactor | ultraia-redactor | 0.7 | 8192 | **4096** | Escritura creativa: temp media-alta, output largo (artículos). |
| Guionista | ultraia-guionista | 0.8 | 8192 | 4096 | Narrativa/diálogos: creatividad alta. |
| Diseñador | ultraia-disenador | **0.9** | 8192 | 2048 | Exploración visual: máxima creatividad. |

**Reglas del pulgar (validadas por la comunidad):**
- `temperature 0.0–0.2` + `seed fijo` = extracción/clasificación determinista (para `generateStructured` del gateway).
- `0.7–0.9` para creativo. Nunca uses la default de Ollama (0.8) para todo.
- `num_ctx` cuesta VRAM linealmente (KV cache): 8K es suficiente para chat; 16-32K solo para RAG/docs largos. Modelo 8B Q4 ≈ 4.9 GB pesos + cache.
- `num_predict` SIEMPRE acotado en pipelines batch para evitar generación desbocada.
- El `stop` depende del chat template del modelo base: para Llama 3.1 es `<|eot_id|>` (verifícalo con `ollama show llama3.1:8b --modelfile`).

---

## 5. Implementaciones poco conocidas / no frecuentes (alto valor)

### 5.1. Structured output garantizado con `generateObject`
El gateway ya usa `generateObject` con Zod (llm.ts:93-101). Contra Ollama funciona porque éste soporta `response_format: json_schema` vía endpoint OpenAI-compatible **pero solo en versiones modernas** (verificado en la doc oficial). Puntos críticos:

- **Schemas pequeños y estrictos**: modelos 8B fallan con schemas complejos. Usa `additionalProperties: false` y pocos niveles de anidación.
- **Caveat conocido (issue ollama#7978)**: Ollama no respetaba el orden de propiedades del schema — arreglado en ramas modernas. Si `generateStructured` devuelve objetos raros, actualiza Ollama.
- **Retry loop recomendado**: 3 intentos con re-parsing, luego fallback a modelo más grande:
```ts
const { object } = await generateObject({
  model: resolveModel(input.model), system: input.system, prompt: input.prompt,
  schema: input.schema as z.ZodType<T>,
});
// envuelve en try/catch; si Zod falla, reintenta hasta 3 veces con "format JSON estricto" en el prompt
```

### 5.2. Tool calling (funcionalidad) — ya activo en `chatStream`
`chatStream` (llm.ts:118-187) registra `calculator`, `web`, `image`, `video`, `music`, `design` como `Tool` de Vercel AI SDK con `maxSteps: 4` (llamadas multi-tool). Con Ollama esto funciona vía el mismo endpoint OpenAI-compatible. Notas:
- Llama 3.1 tiene tool calling nativo. Para modelos sin soporte, el AI SDK fuerza `parallel_tool_calls` — si falla, el modelo responde texto plano (aceptable).
- La descripción de cada tool ES el razonamiento del modelo: son más importantes que el propio execute.

### 5.3. Embeddings para la "memoria privada" de los agentes (RAG ligero)
`nomic-embed-text` (274 MB, ya descargado) es el estándar local. Los agentes se describen como "memoria privada" — este patrón les da memoria consultable:

```bash
curl -X POST http://localhost:11434/api/embed -d '{
  "model": "nomic-embed-text",
  "input": ["search_document: Los agentes de UltraIa son memoria privada..."]
}'
```
```js
const query = await embed('search_query: qué hace el agente investigador?');
// indexar con el MISMO modelo, comparar con coseno
```
- **Truco poco conocido**: nomic exige prefijos `search_document:` / `search_query:` — sin ellos la recuperación baja 5-10 puntos.
- Vector db: empezar con SQLite simple + coseno (hasta ~100k vectores); luego Qdrant/Milvus.

### 5.4. Tunning fino de servidor (Windows)
Ollama lee env vars de usuario al arrancar (Settings → Variables de entorno). Las de mayor impacto:
```powershell
setx OLLAMA_KEEP_ALIVE "-1"          # mantener modelos cargados (evita reloads de 5min)
setx OLLAMA_KV_CACHE_TYPE "q8_0"     # KV cache cuantizada: ~mitad de VRAM, pérdida imperceptible (requiere flash attention)
setx OLLAMA_CONTEXT_LENGTH "8192"    # contexto default (auto: 4K <24GB VRAM)
setx OLLAMA_NUM_PARALLEL "2"         # 2 requests paralelos por modelo (cada +1 duplica cache)
```
> Reiniciar Ollama (icono de bandeja → Quit → reabrir) después de cambiar vars. `OLLAMA_FLASH_ATTENTION` hoy es automático donde se soporta.

### 5.5. Diagnóstico rápido
```powershell
ollama ps                 # qué está cargado y cuánta VRAM usa
ollama show ultraia-orquestador --modelfile   # verificar que el SYSTEM/parámetros aplicaron
ollama show --parameters llama3.1:8b
curl http://localhost:11434/v1/models        # endpoint OpenAI-compatible vivo
```

### 5.6. RAM/VRAM: qué modelo base elegir
- **8 GB VRAM** → llama3.1:8b Q4 (4.9 GB) + 4-8K ctx. ← es el setup actual, correcto.
- **12-16 GB** → llama3.1:8b con 16K ctx + `OLLAMA_NUM_PARALLEL=2`, o qwen2.5:14b.
- **24 GB** → qwen2.5-coder:32b (código) / llama3.3:70b solo en CPU+RAM grande.
- Embeddings corren bien en CPU (nomic = 274 MB).

---

## 6. Recursos oficiales

| Recurso | URL |
|---|---|
| Modelfile reference | https://docs.ollama.com/modelfile |
| Tool calling | https://docs.ollama.com/capabilities/tool-calling |
| Structured outputs | https://docs.ollama.com/capabilities/structured-outputs |
| Embeddings (/api/embed) | https://github.com/ollama/ollama/blob/main/docs/capabilities/embeddings.mdx |
| OpenAI compatibility | https://docs.ollama.com/api/openai-compatibility |
| FAQ: env vars y paralelismo | https://docs.ollama.com/faq |
| nomic-embed-text | https://ollama.com/library/nomic-embed-text |
| AI SDK structured data | https://ai-sdk.dev/v5/docs/ai-sdk-core/generating-structured-data |

---

## 7. Seguridad (importante)

- El system prompt NO es una frontera de seguridad: prompt injection puede sobrescribirlo. Restricciones reales van en la capa API (auth, filtros), no en el Modelfile.
- Ollama sin `OLLAMA_AUTH` escucha en localhost sin auth: no expongas `OLLAMA_HOST=0.0.0.0` a Internet sin proxy/tunnel autenticado.

---

## 8. Roadmap sugerido (razonamiento a nivel experto)

1. **Ya**: 8 modelos tuneados locales sin keys (este paquete) → app 100% funcional.
2. **Subir calidad**: para razonamiento complejo, probar `qwen3:8b` (generación + razonamiento explícito) como base del Orquestador; solo cambias `FROM` en los Modelfiles.
3. **Memoria real**: implementar embeddings (5.3) sobre los `AgentVersion`/`AgentBlueprint` en Prisma para búsqueda semántica de "memoria privada".
4. **Evalúo**: usar `refineLoop` (packages/core/src/ai/loop.ts) + `generateStructured` para evaluar cada agente con el Analista como juez — iteración generación→crítica.

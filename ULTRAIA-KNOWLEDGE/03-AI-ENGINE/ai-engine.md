# AI Engine — El cerebro completo de UltraIa

> **Archivo principal:** `packages/core/src/ai/llm.ts` (3,861 líneas)
> **Proveedores:** 11 (Google, Ollama, LM Studio, OpenAI, DeepSeek, Qwen, OpenRouter, Groq, Mistral, Together, HuggingFace)
> **Herramientas:** 87 tools registradas
> **Patrón:** Keyless-first (funciona sin API keys usando modelos locales)

---

## 1. ¿Qué es el AI Engine?

Es el **cerebro** del proyecto. Cuando le escribes algo a la IA, este código:
1. Recibe tu mensaje
2. Decide qué modelo de IA usar
3. Le envía el mensaje al modelo
4. Recibe la respuesta
5. Si necesita usar una herramienta, la ejecuta
6. Devuelve la respuesta a tu pantalla

---

## 2. Los 11 proveedores

### 2.1 Ollama (local, gratis)

```bash
# Instalar Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Descargar un modelo
ollama pull llama3.1

# Iniciar Ollama
ollama serve
```

```bash
# .env
ULTRAIA_PROVIDER="ollama"
OLLAMA_BASE_URL="http://localhost:11434/v1"
ULTRAIA_MODEL="llama3.1"
```

**Ventajas:** Gratis, offline, privado
**Desventajas:** Necesita CPU/GPU potente

---

### 2.2 LM Studio (local, gratis)

```bash
# Descargar LM Studio desde lmstudio.ai
# Descargar un modelo desde la app
# Iniciar el servidor local
```

```bash
# .env
ULTRAIA_PROVIDER="lmstudio"
LMSTUDIO_BASE_URL="http://localhost:1234/v1"
```

---

### 2.3 Google Gemini (gratis con límites)

```bash
# .env
ULTRAIA_PROVIDER="google"
GOOGLE_API_KEY="tu-api-key-aqui"
```

**Modelos disponibles:**
- `gemini-2.0-flash` (rápido, gratis)
- `gemini-2.5-pro` (mejor, con límites)

---

### 2.4 OpenAI (pago)

```bash
# .env
ULTRAIA_PROVIDER="openai"
OPENAI_API_KEY="sk-tu-api-key"
```

**Modelos:**
- `gpt-4o-mini` (rápido, barato)
- `gpt-4o` (mejor, más caro)
- `gpt-5-mini` (última generación)

---

### 2.5 DeepSeek (gratis)

```bash
# .env
ULTRAIA_PROVIDER="deepseek"
DEEPSEEK_API_KEY="tu-api-key"
```

---

### 2.6 Qwen Alibaba (gratis, 1M contexto)

```bash
# .env
ULTRAIA_PROVIDER="qwen"
DASHSCOPE_API_KEY="tu-api-key"
QWEN_MODEL="qwen3.8-max-preview"
QWEN_ENABLE_THINKING="false"
```

---

### 2.7 OpenRouter (UN solo key, incluye modelos :free)

```bash
# .env
ULTRAIA_PROVIDER="openrouter"
OPENROUTER_API_KEY="tu-api-key"
OPENROUTER_MODEL="google/gemma-2-9b-it:free"
```

**Modelos gratis disponibles:**
- `google/gemma-2-9b-it:free`
- `llama-3.1-8b-instruct:free`
- `qwen2.5-coder-7b-instruct:free`
- `deepseek-r1-distill-llama-70b:free`

---

### 2.8 Groq (gratis, ultra-baja latencia)

```bash
# .env
ULTRAIA_PROVIDER="groq"
GROQ_API_KEY="tu-api-key"
```

---

### 2.9 Mistral (gratis)

```bash
# .env
ULTRAIA_PROVIDER="mistral"
MISTRAL_API_KEY="tu-api-key"
```

---

### 2.10 Together AI (gratis)

```bash
# .env
ULTRAIA_PROVIDER="together"
TOGETHER_API_KEY="tu-api-key"
```

---

### 2.11 HuggingFace (gratis)

```bash
# .env
ULTRAIA_PROVIDER="huggingface"
HUGGINGFACE_API_KEY="tu-api-key"
```

---

## 3. El flujo del cerebro

```
┌─────────────────────────────────────────────────────────────┐
│  USUARIO escribe: "Genera una imagen de un atardecer"       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  llm.ts: chatStream()                                       │
│  1. Recibe el mensaje                                       │
│  2. resolveModel() → ¿Qué proveedor usar?                  │
│     └→ Si Ollama está corriendo → Ollama (gratis)          │
│     └→ Si no → Google Gemini (gratis)                      │
│  3. Construye el system prompt con las herramientas        │
│  4. Envía al modelo: streamText()                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  MODELO DE IA (ej: Gemini)                                  │
│  "Voy a generar la imagen"                                  │
│  Llama a la tool: image({ prompt: "atardecer" })            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  tools/image.ts                                              │
│  const url = `https://image.pollinations.ai/prompt/...`     │
│  Devuelve: { url: "https://..." }                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  llm.ts: Recibe el resultado de la tool                    │
│  "Aquí tienes tu imagen de atardecer: [url]"                │
│  Devuelve la respuesta al usuario                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Las 87 herramientas (categorías)

### 4.1 Matemáticas (1)
| Tool | Descripción |
|------|-------------|
| `calculator` | Operaciones básicas (+, -, ×, ÷) |

### 4.2 Búsqueda y Web (5)
| Tool | Descripción | Keyless |
|------|-------------|---------|
| `web` | Búsqueda DuckDuckGo | ✅ |
| `reach` | readWeb, searchWeb, searchGitHub, parseRss, videoInfo | ✅ |
| `research` | Búsqueda profunda con PDFs | ✅ |
| `enlaces` | Análisis de URLs | ✅ |
| `libros` | Búsqueda de libros | ✅ |

### 4.3 Generación de Contenido (7)
| Tool | Descripción | Keyless |
|------|-------------|---------|
| `image` | Imágenes (Pollinations/MeiGEN) | ✅ |
| `video` | Videos (storyboard) | ✅ |
| `music` | Música (Tunetank/compose) | ✅ |
| `audio` | TTS (14 idiomas) | ✅ |
| `design` | Sistemas de diseño | ✅ |
| `content` | Generación de contenido | ✅ |
| `present` | Paquete de publicación | ✅ |

### 4.4 Publicación (5)
| Tool | Descripción |
|------|-------------|
| `publish` | 8 plataformas (YouTube, TikTok, X, IG, Threads, Telegram, Discord, Slack) |
| `publications` | Cola de publicaciones |
| `contenido` | Enrutador brief→contenido (es/ar) |
| `topics` | Ideas de contenido (RSS + DDG) |
| `metrics` | KPIs por canal |

### 4.5 IA y Agentes (7)
| Tool | Descripción |
|------|-------------|
| `skills` | Ejecutar skills (plan/build/test/review/ship/simplify) |
| `orchestrator` | Orquestación multi-agente |
| `cerebro` | Agente autónomo |
| `goal` | Establecer objetivos |
| `loop-trigger` | Disparar ciclos |
| `chat-bridge` | Puente chat→código |
| `harness` | Sistema de plugins |

### 4.6 G0DM0D3 (4)
| Tool | Descripción |
|------|-------------|
| `g0_parseltongue` | 33 técnicas de ofuscación |
| `g0_autotune` | 20 contextos con sampling |
| `g0_ultraplinian` | N passes (12-60) |
| `g0_godmode` | 5 combos en paralelo |

### 4.7 Memoria (6)
| Tool | Descripción |
|------|-------------|
| `semantic_memory` | Memoria vectorial |
| `chat_memory` | Memoria de chat |
| `autolearn` | Sistema de aprendizaje |
| `memory` | Working/Scene/Character/Style/Error |
| `kgraph` | Knowledge graph |
| `brainpage` | Páginas de conocimiento |

### 4.8 Análisis (4)
| Tool | Descripción |
|------|-------------|
| `videoqa` | MAE/MSE/PSNR/SSIM |
| `motion` | Flujo óptico |
| `replica` | Análisis-por-sintesis |
| `imaging` | Análisis de imágenes |

### 4.9 VFX (3)
| Tool | Descripción |
|------|-------------|
| `vfx` | Efectos VFX |
| `codevfx` | 9 kinds con GLSL |
| `recordly` | ScreenFlow Studio |

### 4.10 Geometría (12)
| Tool | Descripción |
|------|-------------|
| `geometry` | Superfórmula, Möbius, glTF |
| `pngrender` | PNG encoder puro TS |
| `procvid` | Animaciones procedurales |
| `sdf` | SDF ray marching |
| `geom` | Geometría avanzada |
| `generative` | Perlin/Simplex/Mandelbrot |
| `chaos-game` | Fractales |
| `chaos` | Caos y complejidad |
| `physics2d` | Física 2D |
| `cadgeo` | CAD |
| `evo` | Evolución |
| `evolution` | Evolución avanzada |

### 4.11 Edición Video (2)
| Tool | Descripción |
|------|-------------|
| `video_edit` | EDL, render ffmpeg, self-eval |
| `screenflow` | Grabación de pantalla |

### 4.12 Diagramas (1)
| Tool | Descripción |
|------|-------------|
| `diagram` | HTML/SVG autocontenidos |

### 4.13 Nube (1)
| Tool | Descripción |
|------|-------------|
| `cloud` | Upload/list/read/remove/stat |

### 4.14 Seguridad (3)
| Tool | Descripción |
|------|-------------|
| `security` | Auditoría OWASP |
| `codequality` | Calidad de código |
| `deps` | Auditoría de dependencias |

### 4.15 Otros (23)
| Tool | Descripción |
|------|-------------|
| `travel` | Videos de viaje (bilingüe) |
| `vault` | Repositorio local |
| `pdfsearch` | Búsqueda de PDFs |
| `growth` | Perfil de canal |
| `prioritize` | Priorización |
| `genesis` | Ingeniería autónoma |
| `autopub` | Publicación automática |
| `observability` | Observabilidad |
| `agentic` | Capacidades agénticas |
| `zernio` | Motor Zernio |
| `content-engine` | Motor de contenido |
| `sandbox` | Sandbox aislado |
| `creativo` | Herramientas creativas |
| `research` | Investigación |
| `imaging` | Análisis de imágenes |
| `publications` | Cola de publicaciones |
| `contenido` | Enrutador de contenido |
| `metrics` | Métricas |
| `memory` | Memoria |
| `diagram` | Diagramas |
| `video_edit` | Edición de video |
| `screenflow` | Grabación |
| `geometry` | Geometría |

---

## 5. Los 8 agentes admin

| ID | Nombre | Rol | Capacidades |
|----|--------|-----|-------------|
| bp-admin-7022 | Assistant General | Ayuda general | Todas |
| bp-admin-7192 | Guionista Video | Crea guiones | video, audio, music, travel |
| bp-admin-7255 | Analista Datos | Analiza datos | calculator, web, research |
| bp-admin-7280 | Publicador | Publica contenido | publish, publications, topics |
| bp-admin-7342 | Orquestador | Coordina agentes | orchestrator, skills, all |
| bp-admin-7366 | Investigador | Investiga temas | research, reach, web, pdfsearch |
| bp-admin-7390 | Creador Imagen | Crea imágenes | image, design, codevfx |
| bp-admin-7416 | Asistente Personal | Ayuda personal | All tools |

---

## 6. System Prompt (cómo le hablamos a la IA)

```typescript
// En llm.ts, el system prompt incluye:
const systemPrompt = `
Eres UltraIa, un asistente de IA avanzado.

## Herramientas disponibles
Puedes usar estas herramientas cuando el usuario las necesite:
- image: Generar imágenes desde texto (gratis, keyless)
- video: Generar videos
- music: Componer música
- cloud: Guardar archivos en la nube
- travel: Planificar videos de viaje
- diagram: Crear diagramas
- ... (87 tools en total)

## Reglas
1. Responde en el idioma del usuario
2. Usa la herramienta correcta para cada tarea
3. Si no sabes algo, di "no sé" en vez de inventar
4. Sé útil, conciso y directo
`;
```

---

## 7. Cómo agregar un nuevo proveedor

### Paso 1: Crear el builder

```typescript
// En llm.ts, agregar el builder:

function buildMiProveedor(apiKey: string) {
  return createOpenAICompatible({
    name: 'mi-proveedor',
    baseURL: 'https://api.mi-proveedor.com/v1',
    apiKey,
  });
}
```

### Paso 2: Agregar al resolveModel

```typescript
// En resolveModel(), agregar el case:

case 'mi-proveedor':
  return buildMiProveedor(process.env.MI_PROVEEDOR_API_KEY);
```

### Paso 3: Agregar la variable de entorno

```bash
# En .env
MI_PROVEEDOR_API_KEY="tu-api-key"
```

### Paso 4: Usar

```bash
ULTRAIA_PROVIDER="mi-proveedor"
```

---

## 8. Cache de respuestas

El engine tiene un cache para evitar llamadas repetidas:

```typescript
// En llm.ts
const cache = new Map<string, string>();

// Si la pregunta ya se hizo, devolver la respuesta cacheada
if (cache.has(prompt)) {
  return cache.get(prompt);
}
```

---

## 9. mem0 Integration

UltraIa se integra con mem0 para memoria persistente:

```typescript
// En llm.ts
import { Mem0 } from 'mem0ai';

const mem0 = new Mem0({
  apiKey: process.env.MEM0_API_KEY,
});

// Guardar memoria
await mem0.add("El usuario prefiere respuestas cortas", { userId });

// Buscar memoria
const memories = await mem0.search("preferencias del usuario", { userId });
```

---

## 10. Problemas comunes

| Problema | Causa | Solución |
|----------|-------|----------|
| "No API key" | Falta configurar `.env` | Agregar `OPENAI_API_KEY` o usar Ollama |
| "Model not found" | Modelo no instalado | `ollama pull llama3.1` |
| "Timeout" | Respuesta muy lenta | Aumentar timeout o usar modelo más rápido |
| "Rate limited" | Demasiadas peticiones | Esperar o usar otro proveedor |
| "Tool not called" | Descripción confusa | Mejorar la descripción de la tool |
| "Context too long" | Mensaje muy largo | Usar modelo con más contexto |

---

## 11. Referencias

- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [Ollama](https://ollama.ai)
- [OpenAI API](https://platform.openai.com/docs)
- [Google AI Studio](https://aistudio.google.com)
- [OpenRouter](https://openrouter.ai)

---

**Última actualización:** 2026-09-04

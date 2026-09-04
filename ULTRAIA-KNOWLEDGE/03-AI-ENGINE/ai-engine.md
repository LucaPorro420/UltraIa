# AI Engine — Cómo funciona la inteligencia artificial

> **Archivo principal:** `packages/core/src/ai/llm.ts`
> **Proveedores:** OpenAI, Google, Ollama (local), LM Studio, DeepSeek, Qwen
> **Patrón:** Keyless-first (funciona sin API keys usando modelos locales)

---

## 1. ¿Qué es el AI Engine?

Es el **cerebro** del proyecto. Cuando le escribes algo a la IA, este código:
1. Recibe tu mensaje
2. Decide qué modelo de IA usar
3. Le envía el mensaje al modelo
4. Recibe la respuesta
5. La envía de vuelta a tu pantalla

---

## 2. Cómo funciona (explicación simple)

```
Tú escribes: "Genera una imagen de un atardecer"
        │
        ▼
┌─────────────────────────┐
│  AI Engine (llm.ts)     │
│  "¿Qué herramienta      │
│   necesito? → image"    │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Herramienta: image.ts  │
│  "Enviar prompt a       │
│   Pollinations AI"      │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Pollinations AI (nube) │
│  "Aquí tienes tu imagen"│
└───────────┬─────────────┘
            │
            ▼
        Tú ves la imagen
```

---

## 3. Los proveedores de IA

| Proveedor | Tipo | Costo | Ejemplo de uso |
|-----------|------|-------|----------------|
| **Ollama** | Local (tu PC) | Gratis | `ollama run llama3` |
| **LM Studio** | Local (tu PC) | Gratis | Descargar modelos |
| **OpenAI** | Nube | Pago | GPT-4, DALL-E |
| **Google** | Nube | Gratis (con límites) | Gemini |
| **DeepSeek** | Nube | Gratis/Pago | DeepSeek Chat |
| **Qwen** | Nube | Gratis | Qwen Turbo |

**Keyless-first:** UltraIa intenta usar modelos GRATIS primero. Si no hay internet, usa Ollama (local).

---

## 4. Cómo se configura

### El archivo `.env` (en la raíz)

```bash
# Quién es el proveedor principal
ULTRAIA_PROVIDER=ollama

# Si usas Ollama (local)
OLLAMA_BASE_URL=http://localhost:11434

# Si usas OpenAI (pago)
OPENAI_API_KEY=sk-xxxxx

# Si usas Google (gratis)
GOOGLE_API_KEY=xxxxx
```

### Cómo cambia el comportamiento

```typescript
// En packages/core/src/ai/llm.ts

// Si ULTRAIA_PROVIDER=ollama → usa modelos locales
// Si ULTRAIA_PROVIDER=openai → usa GPT-4
// Si ULTRAIA_PROVIDER=google → usa Gemini
```

---

## 5. El system prompt (cómo le hablamos a la IA)

Cada vez que la IA responde, primero lee un "system prompt" que le dice:
- Quién es (un asistente de UltraIa)
- Qué puede hacer (usar herramientas)
- Cómo debe responder (en español, ser útil, etc.)

```typescript
// Ejemplo simplificado
const systemPrompt = `
Eres UltraIa, un asistente de IA.
Puedes usar estas herramientas:
- image: generar imágenes
- video: generar videos
- music: componer música
- cloud: guardar archivos
Cuando el usuario te pida algo, usa la herramienta correcta.
`;
```

---

## 6. Cómo crear un nuevo proveedor

### Paso 1: Crear el archivo del proveedor

```typescript
// packages/core/src/ai/providers/mi-proveedor.ts

export function miProveedor(options: { apiKey: string }) {
  return {
    name: 'mi-proveedor',
    async generate(prompt: string) {
      // Lógica para llamar a tu proveedor
      const response = await fetch('https://api.mi-proveedor.com/v1/chat', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${options.apiKey}` },
        body: JSON.stringify({ prompt }),
      });
      return response.json();
    },
  };
}
```

### Paso 2: Registrarlo en `llm.ts`

```typescript
// packages/core/src/ai/llm.ts

import { miProveedor } from './providers/mi-proveedor';

// Agregar al switch de proveedores
switch (provider) {
  case 'mi-proveedor':
    return miProveedor({ apiKey: process.env.MI_PROVEEDOR_KEY });
}
```

### Paso 3: Agregar la variable de entorno

```bash
# En .env
MI_PROVEEDOR_KEY=tu-api-key-aqui
```

---

## 7. Problemas comunes

| Problema | Causa | Solución |
|----------|-------|----------|
| "No API key" | Falta configurar `.env` | Agregar `OPENAI_API_KEY` o usar Ollama |
| "Model not found" | Modelo no instalado en Ollama | `ollama pull llama3` |
| "Timeout" | Respuesta muy lenta | Aumentar timeout o usar modelo más rápido |
| "Rate limited" | Demasiadas peticiones | Esperar o usar otro proveedor |

---

## 8. Referencias

- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [Ollama](https://ollama.ai)
- [OpenAI API](https://platform.openai.com/docs)

---

**Última actualización:** 2026-09-04

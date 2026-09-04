# Tools — Cómo crear nuevas herramientas para la IA

> **Ubicación:** `packages/core/src/tools/`
> **Cantidad actual:** 60+ herramientas
> **Patrón:** Dominio puro (sin dependencias externas), determinista, keyless-first

---

## 1. ¿Qué es una tool (herramienta)?

Una tool es como un **botón especial** que la IA puede presionar. Cuando le dices "genera una imagen", la IA presiona el botón `image` y esa herramienta hace el trabajo.

**Analogía:** Imagina una navaja suiza. Cada herramienta es una hoja diferente:
- Hoja 1: Generar imágenes
- Hoja 2: Generar videos
- Hoja 3: Buscar en internet
- Hoja 4: Guardar archivos en la nube
- etc.

---

## 2. Estructura de una tool

Cada herramienta tiene 3 partes:

### Parte 1: El dominio (la lógica)

```typescript
// packages/core/src/tools/mi-herramienta.ts

import { z } from 'zod';

// 1. Definir qué acepta la herramienta (schema)
export const miHerramientaSchema = z.object({
  prompt: z.string().describe('Descripción de lo que quieres'),
  tamaño: z.enum(['pequeño', 'mediano', 'grande']).default('mediano'),
});

// 2. Implementar la lógica
export function miHerramienta(input: z.infer<typeof miHerramientaSchema>) {
  // Aquí va tu lógica
  return {
    resultado: `Generado: ${input.prompt} (${input.tamaño})`,
    url: 'https://ejemplo.com/imagen.png',
  };
}

// 3. Describir qué hace (para que la IA sepa cuándo usarla)
export const miHerramientaDescription = 
  'Genera algo basado en un prompt. Úsalo cuando el usuario pida crear contenido.';
```

### Parte 2: El registro (decirle a la IA que existe)

```typescript
// packages/core/src/tools/index.ts

// Importar la herramienta
import { miHerramienta, miHerramientaDescription } from './mi-herramienta';

// Agregar al objeto de herramientas
export const tools = {
  // ... otras herramientas
  miHerramienta,
};

// Agregar descripción
export const TOOL_DESCRIPTIONS = {
  // ... otras descripciones
  miHerramienta: miHerramientaDescription,
};
```

### Parte 3: El wiring en la IA (conectarla)

```typescript
// packages/core/src/ai/llm.ts

// La herramienta ya está disponible porque se exportó en index.ts
// La IA la usa automáticamente cuando la necesita
```

---

## 3. Ejemplo real: la herramienta `image`

```typescript
// packages/core/src/tools/image.ts

import { z } from 'zod';

// Schema: qué acepta
export const imageSchema = z.object({
  prompt: z.string().describe('Descripción de la imagen a generar'),
});

// Lógica: cómo generar la imagen
export async function generateImage(prompt: string) {
  // Usar Pollinations AI (gratis, sin API key)
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`;
  return { url };
}

// Descripción
export const imageDescription = 
  'Genera una imagen fotorrealista desde un texto. Gratis, sin API key.';
```

---

## 4. Tipos de herramientas

| Tipo | Ejemplo | Qué hace |
|------|---------|----------|
| **Generativas** | `image`, `video`, `music` | Crean contenido nuevo |
| **Consulta** | `web`, `reach` | Buscan información |
| **Almacenamiento** | `cloud` | Guardan archivos |
| **Análisis** | `videoqa`, `motion` | Analizan contenido existente |
| **Automatización** | `cerebro`, `autopub` | Hacen cosas solas |
| **Seguridad** | `security`, `codequality` | Revisan código |

---

## 5. Cómo crear una tool paso a paso

### Paso 1: Decide qué va a hacer

Ejemplo: "Quiero una herramienta que convierta texto a voz"

### Paso 2: Crea el archivo

```typescript
// packages/core/src/tools/tts.ts

import { z } from 'zod';

export const ttsSchema = z.object({
  texto: z.string().describe('El texto a convertir a voz'),
  idioma: z.enum(['es', 'en', 'ar']).default('es'),
});

export async function textToSpeech(texto: string, idioma: string) {
  // Lógica para convertir texto a voz
  // Puede usar edge-tts (gratis) o ElevenLabs (pago)
  return { audioUrl: 'https://...' };
}

export const ttsDescription = 
  'Convierte texto a voz. Úsalo cuando el usuario quiera escuchar algo.';
```

### Paso 3: Regístralo

En `packages/core/src/tools/index.ts`:
```typescript
import { textToSpeech, ttsDescription } from './tts';

export const tools = {
  // ... existentes
  textToSpeech,
};

export const TOOL_DESCRIPTIONS = {
  // ... existentes
  textToSpeech: ttsDescription,
};
```

### Paso 4: Prueba

```bash
npm run test -- --grep "tts"
```

---

## 6. Reglas importantes

1. **Dominio puro:** No usar `fetch` ni llamadas a red dentro de la herramienta (dejar eso para el proveedor)
2. **Determinista:** Misma entrada = mismo resultado (siempre)
3. **Keyless-first:** Intentar funcionar sin API keys
4. **Fail-soft:** Si algo falla, devolver un error amigable, no crashear
5. **Zod schema:** SIEMPRE validar la entrada con Zod

---

## 7. Problemas comunes

| Problema | Causa | Solución |
|----------|-------|----------|
| "Tool not found" | No se registró en `index.ts` | Agregar import + export |
| "Invalid input" | Schema Zod no coincide | Revisar el schema |
| "Cannot read property" | Falta validación | Usar Zod para validar |

---

## 8. Referencias

- [Zod docs](https://zod.dev)
- [Herramientas existentes](packages/core/src/tools/)

---

**Última actualización:** 2026-09-04

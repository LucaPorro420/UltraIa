# Plan: Optimización CSS + Performance + Limpieza de Extensiones

**Fecha:** 2026-08-30
**Contexto:** ChatAiGC.md + diagnóstico localhost:3000 + análisis de build

---

## Datos actuales del proyecto

| Métrica | Valor actual | Objetivo |
|---------|-------------|----------|
| CSS total | 120 KB (2 archivos) | < 60 KB |
| JS total | 2,607 KB (chunks) | < 1,500 KB |
| First Load JS | 102 KB base | < 80 KB |
| Página más pesada | /ebooks/playground 252 KB | < 150 KB |
| Líneas globals.css | 392 | < 200 |
| Nodos DOM ( ChatAiGC) | 1,749 | < 800 |
| Estilos inline (ChatAiGC) | 34 KB | < 5 KB |

---

## FASE 1: Optimización CSS (Prioridad ALTA)

### 1.1 Tailwind v4 Purging agresivo
- **Archivo:** `apps/web/postcss.config.mjs`
- **Cambio:** Agregar `@tailwindcss/postcss` con content paths optimizados
- **Beneficio:** Tailwind v4 ya hace purge automático, pero podemos ser más agresivo

### 1.2 Dividir globals.css en módulos
- **Archivo:** `apps/web/src/app/globals.css` (392 líneas)
- **Cambio:** Separar en:
  - `globals-base.css` — resets, tipografía, variables CSS
  - `globals-utilities.css` — clases utilitarias (.glass-panel, .glow-*, .card-glow-hover)
  - `globals-components.css` — estilos de componentes (.md-body, .ide-sep)
  - `globals-motion.css` — keyframes y animaciones
- **Beneficio:** Carga solo lo necesario por página

### 1.3 Eliminar CSS duplicado
- **Problema:** Muchas clases utilitarias replican lo que Tailwind ya ofrece
- **Acción:** Reemplazar clases custom con equivalentes Tailwind donde sea posible
- **Ejemplo:** `.glow-video` → `border-purple-500/45 shadow-[0_0_18px_-6px_#a855f7]`

### 1.4 Compresión gzip/brotli
- **Archivo:** `apps/web/next.config.ts`
- **Cambio:** Agregar headers `Content-Encoding` para assets estáticos
- **Beneficio:** Reducción 60-80% en tamaño transferido

---

## FASE 2: Optimización JS (Prioridad ALTA)

### 2.1 Tree shaking de Three.js
- **Problema:** Three.js (~500 KB) se importa completo
- **Acción:** Usar imports separados:
  ```ts
  import { Scene } from 'three/src/scenes/Scene.js'
  import { Mesh } from 'three/src/objects/Mesh.js'
  ```
- **Beneficio:** Reducción ~300 KB

### 2.2 Dynamic imports para rutas pesadas
- **Archivos afectados:**
  - `/ebooks/playground` (146 KB)
  - `/dashboard` (38.6 KB)
  - `/agents/new` (82.3 KB)
  - `/studio` (17.2 KB)
- **Acción:** Usar `next/dynamic` con `{ loading: () => <Skeleton /> }`
- **Beneficio:** Carga bajo demanda, no en initial load

### 2.3 Eliminar polyfills innecesarios
- **Problema:** polyfills.js se carga para todos
- **Acción:** Verificar si soportamos browsers modernos (ES2022+)
- **Beneficio:** Eliminar ~20 KB

### 2.4 Consolidar chunks pequeños
- **Problema:** 19 scripts fragmentados
- **Acción:** Usar `splitChunks` config en next.config.ts
- **Beneficio:** Menos requests HTTP

---

## FASE 3: Extensiones Chrome (Prioridad MEDIA)

### 3.1 MutationObserver para limpiar DOM
- **Problema:** Plurality, DeepL, aiinhbfoop inyectan nodos
- **Acción:** Agregar script de desarrollo que observe y elimine nodos ajenos
- **Archivo:** `apps/web/src/app/development-cleanup.ts` (solo en dev)
- **Código:**
  ```ts
  if (process.env.NODE_ENV === 'development') {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((m) => {
        m.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement && !node.closest('#__next')) {
            node.remove();
          }
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
  ```

### 3.2 Instrucciones para el usuario
- Crear archivo `docs/EXTENSIONES-CHROME.md` con:
  - Cómo deshabilitar Plurality
  - Cómo usar modo incógnito
  - Extensiones recomendadas (React DevTools, etc.)

---

## FASE 4: DOM y Rendering (Prioridad MEDIA)

### 4.1 Virtualización de listas
- **Problema:** 1,749 nodos DOM en vista inicial
- **Acción:** Implementar `react-window` o `@tanstack/react-virtual` para:
  - Lista de agentes
  - Lista de publicaciones
  - Galería de imágenes
- **Beneficio:** Reducir nodos a ~200-300

### 4.2 Lazy loading de secciones
- **Problema:** Todas las secciones del landing cargan de golpe
- **Acción:** Usar `IntersectionObserver` para cargar secciones bajo demanda
- **Componentes afectados:**
  - `LandingFeatures`
  - `LandingDashboard`
  - `LandingEcosystem`
  - `LandingPillars`

### 4.3 Imágenes con dimensiones
- **Problema:** Imágenes sin width/height causan CLS
- **Acción:** Agregar dimensiones explícitas a todas las `<img>` o usar `<Image>` de Next.js

---

## FASE 5: Streaming SSR (Prioridad BAJA)

### 5.1 Server Components con streaming
- **Acción:** Convertir páginas pesadas a Server Components con Suspense
- **Beneficio:** UI responde instantáneamente, datos cargan en background

### 5.2 suppressHydrationWarning
- **Problema:** Extensiones causan hydration mismatch
- **Acción:** Agregar `suppressHydrationWarning` en `<html>` y `<body>`

---

## Archivos a modificar

| Archivo | Cambios |
|---------|---------|
| `apps/web/next.config.ts` | splitChunks, compresión, allowedDevOrigins |
| `apps/web/postcss.config.mjs` | Configuración Tailwind v4 optimizada |
| `apps/web/src/app/globals.css` | Dividir en módulos |
| `apps/web/src/app/layout.tsx` | suppressHydrationWarning |
| `apps/web/src/components/landing/*.tsx` | Dynamic imports, lazy loading |
| `docs/EXTENSIONES-CHROME.md` | Guía de extensiones |

---

## Criterios de verificación

1. **CSS:** < 60 KB total después de optimización
2. **JS:** < 1,500 KB total después de tree shaking
3. **First Load:** < 80 KB
4. **DOM:** < 800 nodos en vista inicial
5. **CLS:** < 0.1
6. **Lighthouse:** Score > 90 en Performance
7. **Dev server:** < 10s de arranque
8. **Sin errores MIME** en consola del navegador

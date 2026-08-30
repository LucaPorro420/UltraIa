# Plan de Optimización — UltraIa (2026-08-30)

## Situación actual

Tu sitio funciona, pero hay problemas de rendimiento:

| Qué | Ahora | Objetivo |
|-----|-------|----------|
| **CSS** | 120 KB | < 60 KB |
| **JavaScript** | 2,607 KB | < 1,500 KB |
| **Nodos HTML** | 1,749 | < 800 |
| **Estilos inline** | 34 KB | < 5 KB |

---

## Qué vamos a hacer (en orden)

### 1. Separar el CSS grande (globals.css)

Tu archivo `globals.css` tiene 392 líneas con TODO junto:
- Variables de colores
- Animaciones
- Estilos de componentes
- Utilidades custom

**Solución:** Dividirlo en 4 archivos pequeños:
- `globals-base.css` — colores, tipografía
- `globals-utilities.css` — clases como .glass-panel, .glow-*
- `globals-components.css` — estilos de markdown, separadores
- `globals-motion.css` — animaciones y keyframes

**Beneficio:** Cada página carga solo lo que necesita.

### 2. Tree shaking de Three.js

Three.js pesa ~500 KB pero solo usas unas pocas funciones.

**Solución:** Importar solo lo que necesitas:
```ts
// Antes: import * as THREE from 'three' (carga todo)
// Después: import { Scene } from 'three/src/scenes/Scene.js' (carga solo Scene)
```

**Beneficio:** ~300 KB menos.

### 3. Carga dinámica de páginas pesadas

Estas páginas cargan todo de golpe:
- `/ebooks/playground` (146 KB)
- `/dashboard` (38 KB)
- `/agents/new` (82 KB)

**Solución:** Usar `next/dynamic` para cargar bajo demanda.

**Beneficio:** El usuario ve algo rápido, el resto carga después.

### 4. Limpiar extensiones de Chrome

Extensiones como Plurality y DeepL inyectan HTML y CSS que rompen tu diseño.

**Solución:**
1. MutationObserver que elimine nodos ajenos
2. Guía para deshabilitar extensiones

### 5. Reducir nodos DOM

1,749 nodos es mucho para una vista inicial.

**Solución:** Virtualizar listas largas (agentes, publicaciones, galería).

### 6. Compresión gzip

**Solución:** Activar compresión en el servidor.

**Beneficio:** 60-80% menos de datos transferidos.

---

## Resumen visual

```
ANTES:                    DESPUÉS:
CSS: 120 KB      →       CSS: 60 KB  (-50%)
JS: 2,607 KB     →       JS: 1,500 KB (-43%)
DOM: 1,749 nodos →       DOM: 800 nodos (-54%)
Carga: 15s       →       Carga: 5s   (-67%)
```

---

## Cómo traducir este archivo

1. Copia este texto
2. Ve a [Google Translate](https://translate.google.com)
3. Pega y selecciona tu idioma
4. Traduce

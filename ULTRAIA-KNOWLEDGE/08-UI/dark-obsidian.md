# UI — El diseño Dark Obsidian

> **Theme:** Dark Obsidian
> **CSS:** Tailwind CSS v4
> **Tokens:** En `apps/web/globals.css`
> **Componentes:** `apps/web/src/components/ui/`

---

## 1. ¿Qué es un design system?

Es como un **kit de pintura**: tiene colores, tamaños, fuentes y estilos predefinidos para que todo el sitio se vea igual.

**Dark Obsidian** es el tema de UltraIa: oscuro, elegante, con toques de violeta.

---

## 2. Los colores

```css
/* apps/web/globals.css */

@theme {
  /* Colores base */
  --color-canvas: #08080a;        /* Fondo principal (casi negro) */
  --color-panel: #111115;          /* Paneles y tarjetas */
  --color-surface: #1a1a20;        /* Superficies elevadas */
  
  /* Borde */
  --color-border-subtle: #1f1f2a;  /* Bordes suaves */
  
  /* Acento principal */
  --color-primary: #8b5cf6;        /* Violeta (el color de UltraIa) */
  --color-primary-hover: #7c3aed;  /* Violeta más oscuro al pasar el mouse */
  
  /* Texto */
  --color-text: #f5f5f5;           /* Texto principal (blanco suave) */
  --color-text-secondary: #a0a0a0; /* Texto secundario (gris) */
  
  /* Acentos por modalidad */
  --color-video: #f97316;          /* Naranja para video */
  --color-audio: #06b6d4;          /* Cyan para audio */
  --color-texto: #22c55e;          /* Verde para texto */
  --color-codigo: #eab308;         /* Amarillo para código */
  --color-web: #ec4899;            /* Rosa para web */
}
```

---

## 3. Acentos por modalidad

Cada tipo de contenido tiene su propio color:

| Modalidad | Color | Ejemplo |
|-----------|-------|---------|
| Video | Naranja 🟠 | Player de video |
| Audio | Cyan 🔵 | Reproductor de música |
| Texto | Verde 🟢 | Documentos |
| Código | Amarillo 🟡 | Editor de código |
| Web | Rosa 🩷 | Navegador |

---

## 4. Tipografías

```css
/* Fuentes */
--font-sans: 'Inter', sans-serif;           /* Texto funcional */
--font-display: 'Plus Jakarta Sans', sans-serif; /* Títulos y chat */
--font-mono: 'JetBrains Mono', monospace;   /* Código y logs */
```

**Regla:** NO usar Inter para títulos grandes (se ve "AI slop").

---

## 5. Utilidades especiales

### Glass Panel (efecto vidrio esmerilado)

```html
<div class="glass-panel">
  Contenido con efecto vidrio
</div>
```

### Card Glow Hover (brillo al pasar el mouse)

```html
<div class="card-glow-hover">
  Tarjeta que brilla al pasar el mouse
</div>
```

### Gradient Neo Frame (marco violeta)

```html
<div class="gradient-neo-frame">
  Elemento con marco degradado violeta
</div>
```

---

## 6. Componentes UI

Ubicación: `apps/web/src/components/ui/`

| Componente | Qué hace |
|------------|----------|
| `button.tsx` | Botones |
| `input.tsx` | Campos de texto |
| `card.tsx` | Tarjetas |
| `dialog.tsx` | Ventanas modales |
| `tabs.tsx` | Pestañas |
| `skeleton.tsx` | Carga (placeholder) |
| `tooltip.tsx` | Consejos flotantes |
| `stat-card.tsx` | Estadísticas |
| `empty-state.tsx` | Estado vacío |

---

## 7. Cómo crear un nuevo componente

### Paso 1: Crear el archivo

```tsx
// apps/web/src/components/ui/mi-componente.tsx

interface MiComponenteProps {
  titulo: string;
  children: React.ReactNode;
}

export function MiComponente({ titulo, children }: MiComponenteProps) {
  return (
    <div className="glass-panel p-4 rounded-lg">
      <h3 className="text-lg font-semibold text-text">{titulo}</h3>
      <div className="mt-2 text-text-secondary">{children}</div>
    </div>
  );
}
```

### Paso 2: Usarlo

```tsx
import { MiComponente } from '@/components/ui/mi-componente';

<MiComponente titulo="Ejemplo">
  Este es el contenido
</MiComponente>
```

---

## 8. Reglas de diseño

1. **Oscuro primero:** Todo el sitio es dark mode
2. **Violeta como acento:** Solo para elementos importantes
3. **Sin sombras:** Usar bordes sutiles en vez de sombras
4. **Bordes redondeados:** Máximo 10px
5. **Espaciado consistente:** Múltiplos de 4px

---

## 9. Problemas comunes

| Problema | Causa | Solución |
|----------|-------|----------|
| "Color no se ve" | CSS variable no definida | Revisar `globals.css` |
| "Fuente rara" | Font no cargada | Verificar import de Google Fonts |
| "Espaciado inconsistente" | No usar tokens | Usar `p-4`, `m-2`, etc. |

---

## 10. Referencias

- [Tailwind CSS docs](https://tailwindcss.com/docs)
- [Dark mode best practices](https://tailwindcss.com/docs/dark-mode)

---

**Última actualización:** 2026-09-04

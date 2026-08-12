# Component Variants & Responsive Breakpoints

Guía de variantes para componentes clave — dark mode (activo) + light mode (preparado).

---

## 1. Responsive Grid Patterns

### Dashboard agent grid
```tsx
// Mobile: 1 col, Tablet: 2 cols, Desktop: 3 cols
<ul className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
  {blueprints.map((bp) => (
    <AgentCard key={bp.id} bp={bp} />
  ))}
</ul>
```

### Agent Detail layout
```tsx
// Chat: full width mobile, 3/5 desktop. Sidebar: full / 2/5
<section className="grid gap-6 lg:grid-cols-5">
  <div className="lg:col-span-3">[Chat]</div>
  <div className="flex flex-col gap-6 lg:col-span-2">[Controls]</div>
</section>
```

### Auth pages
```tsx
<main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
  ...
</main>
```

---

## 2. Dark vs Light Mode Tokens

### Fondo / Superficies
| Token | Dark (activo) | Light (preparado) |
|-------|---------------|-------------------|
| `--color-background` | `#0F1117` (neutral-950) | `#FAFAFA` (gray-50) |
| `--color-surface` | `#18181D` | `#FFFFFF` |
| `--color-surface-alt` | `#27272A` (neutral-800) | `#F4F4F5` (gray-100) |
| `--color-border` | `#27272A` | `#E5E5E6` |
| `--color-border-strong` | `#3F3F46` (neutral-700) | `#D1D1D6` |

### Texto
| Token | Dark | Light |
|-------|------|-------|
| `--color-foreground` | `#E4E4E7` (neutral-200) | `#0F1726` (slate-900) |
| `--color-muted` | `#71717A` (neutral-500) | `#6B7280` (gray-500) |
| `--color-on-primary` | `#FFFFFF` | `#FFFFFF` |

### Acentos (iguales en ambos modos)
| Token | Valor |
|-------|-------|
| `--color-primary` | `#8B5CF6` (violet-500) |
| `--color-accent` | `#F472B6` (pink-400) |

### Implementación (Tailwind v4 con CSS variables)
```css
@layer base {
  :root {
    /* Dark mode por defecto */
    --color-primary: 132 85 255;
    --color-secondary: 130 130 255;
    --color-accent: 244 114 182;
    --color-background: 15 17 23;
    --color-surface: 24 24 29;
    --color-surface-alt: 39 39 42;
    --color-foreground: 228 228 235;
    --color-muted: 113 113 122;
    --color-border: 39 39 42;
    --color-border-strong: 63 63 70;
    --color-on-primary: 255 255 255;
    --color-destructive: 248 113 113;
  }

  .light {
    --color-primary: 132 85 255;
    --color-background: 250 250 250;
    --color-surface: 255 255 255;
    --color-surface-alt: 244 244 245;
    --color-foreground: 15 23 42;
    --color-muted: 107 114 128;
    --color-border: 229 229 230;
    --color-border-strong: 209 209 214;
  }
}
```

---

## 3. Button Variants

```tsx
// Reusable component usando CVA (class-variance-authority)
import { cva, type VariantProps } from 'class-variance-authority';

export const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
  {
    variants: {
      variant: {
        primary: 'bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-50',
        secondary: 'border border-neutral-700 bg-neutral-800 text-neutral-200 hover:bg-neutral-700',
        ghost: 'text-neutral-300 hover:bg-neutral-800 hover:text-white',
        destructive: 'bg-red-700 text-white hover:bg-red-600',
        icon: 'rounded-lg border border-neutral-700 bg-neutral-800 p-2 text-neutral-300 hover:text-white hover:bg-neutral-700',
      },
      size: {
        sm: 'px-3 py-1.5 text-xs',
        md: 'px-4 py-2.5 text-sm',
        lg: 'px-6 py-3 text-base',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
);
```

---

## 4. Input Variants

```tsx
// Input con estados
export const inputVariants = cva(
  'w-full rounded-lg border bg-neutral-900 px-3 py-2.5 text-sm text-white outline-none transition-colors',
  {
    variants: {
      variant: {
        default: 'border-neutral-700 focus:border-violet-500 focus:ring-1 focus:ring-violet-500',
        error: 'border-red-500 focus:ring-red-500',
        success: 'border-emerald-500 focus:ring-emerald-500',
      },
      size: {
        sm: 'py-1.5 px-2.5 text-xs',
        md: 'py-2.5 px-3 text-sm',
        lg: 'py-3 px-4 text-base',
      },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  }
);
```

---

## 5. Badge / Status Variants

```tsx
export const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
  {
    variants: {
      status: {
        active: 'bg-emerald-900/60 text-emerald-300',
        pending: 'bg-amber-900/60 text-amber-300',
        rejected: 'bg-red-900/60 text-red-300',
        superseded: 'bg-neutral-800 text-neutral-400',
        running: 'bg-blue-900/60 text-blue-300',
      },
    },
    defaultVariants: { status: 'superseded' },
  }
);
```

---

## 6. Card / Panel Variants

```tsx
export const cardVariants = cva(
  'rounded-2xl border bg-neutral-900/50 p-5',
  {
    variants: {
      variant: {
        default: 'border-neutral-800',
        elevated: 'border-neutral-700 shadow-lg',
        interactive: 'border-neutral-800 transition-colors hover:border-violet-700',
        muted: 'border-neutral-800 bg-neutral-900',
      },
      padding: {
        sm: 'p-3',
        md: 'p-5',
        lg: 'p-6',
      },
    },
    defaultVariants: { variant: 'default', padding: 'md' },
  }
);
```

---

## 7. Chat Message Variants

```tsx
// Mensaje alineado según rol
const messageClasses = {
  user: 'ml-auto max-w-[85%] self-end rounded-2xl bg-violet-700/80 px-4 py-3 text-sm text-white',
  assistant: 'mr-auto max-w-[85%] self-start rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-neutral-100',
  system: 'mx-auto max-w-[85%] rounded-xl bg-neutral-800 px-3 py-2 text-xs text-neutral-500',
};
```

---

## 8. Breakpoint Usage Matrix

| Component | xs (375) | sm (640) | md (768) | lg (1024) | xl (1280) | 2xl (1536) |
|-----------|----------|----------|----------|-----------|-----------|------------|
| Container max-w | 640px | 640px | 768px | 1024px | 1280px | 1280px |
| Dashboard grid | 1 col | 1 col | 2 cols | 2 cols | 3 cols | 3 cols |
| Agent Detail | flex col | flex col | grid col-5 | grid col-5 | grid col-5 | grid col-5 |
| Chat msg max-w | 85% | 85% | 85% | 85% | 80% | 80% |
| Header padding | 16px | 16px | 24px | 24px | 24px | 24px |
| Form max-width | 90% | 90% | 90% | 512px | 640px | 640px |

---

## 9. Mobile Adaptations

### Drawer (para móviles, menú lateral futuro)
```tsx
// En MVP, usar modal en vez de drawer
<div className="lg:hidden">
  <button className="rounded-lg border border-neutral-700 p-2 text-neutral-300">
    <MenuIcon className="h-5 w-5" />
  </button>
</div>
```

### Toasts (feedback global)
```tsx
// Posición fija bottom-right, responsive
<div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
  <Toast variant="success">Key copied to clipboard</Toast>
  <Toast variant="error">Failed to record feedback</Toast>
</div>
```

---

## 10. Motion Tokens (per component)

| Component | Property | Duration | Easing |
|-----------|----------|----------|--------|
| Button hover | background-color | 150ms | ease |
| Card hover | border-color | 150ms | ease |
| Modal open/close | opacity + scale | 200ms | cubic-bezier(0.4,0,0.2,1) |
| Dropdown | height + opacity | 150ms | ease |
| Chat message appear | opacity + y | 150ms | ease (stagger) |
| Loading spinner | rotation | 1s linear infinite | — |

```css
@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; }
}
```

# UltraIa Design System (Master)

**Product:** SaaS — AI agent generation & human-in-the-loop improvement
**Stack:** Next.js 15 / Tailwind CSS v4 / Vercel AI SDK
**Product Type:** Developer-tool SaaS dashboard
**Mood:** Dark, cinematic, technical, precision, clean, premium, developer, high-end utility

> Adaptado de la base de datos `ui-ux-pro-max` para mantener el dark-mode heritage del MVP actual (Tailwind `neutral-950` base + acentos violeta). La regla de anti-pattern "no dark mode by default" se sobreescribe aquí porque la audiencia objetivo (devs & ML engineers) prefiere dark en entornos de trabajo prolongados.

---

## 1. Color Tokens

| Role | Light Mode | Dark Mode (active) | CSS (Tailwind v4) | Usage |
|------|-----------|--------------------|--------------------|-------|
| **Primary** | `#7C3AED` (violet-600) | `#8B5CF6` (violet-500) | `--color-primary` | Botones primarios, acentos activos, links |
| **On Primary** | `#FFFFFF` | `#FFFFFF` | `--color-on-primary` | Texto/iconos sobre primary |
| **Secondary** | `#6366F1` (indigo-500) | `#818CF8` (indigo-400) | `--color-secondary` | Highlights secundarios |
| **Accent / CTA** | `#EC4899` (pink-500) | `#F472B6` (pink-400) | `--color-accent` | CTA destacados, badges de éxito |
| **Background** | `#FAFAFA` (gray-50) | `#0F1117` (near-black) | `--color-background` | Fondo de página |
| **Surface** | `#FFFFFF` | `#18181D` | `--color-surface` | Cards, panels, inputs |
| **Surface Alt** | `#F4F4F5` | `#27272A` | `--color-surface-alt` | Hover de cards, borders sutiles |
| **Foreground** | `#0F172A` (slate-900) | `#E4E4E7` (neutral-200) | `--color-foreground` | Texto principal |
| **Muted** | `#6B7280` (gray-500) | `#71717A` (neutral-500) | `--color-muted` | Texto secundario, placeholders |
| **Border** | `#E5E5E6` | `#27272A` (neutral-800) | `--color-border` | Bordes de inputs, separadores |
| **Border Strong** | `#D1D1D6` | `#3F3F46` | `--color-border-strong` | Cards elevadas |
| **Destructive** | `#DC2626` (red-600) | `#F87171` (red-400) | `--color-destructive` | Errores, acciones destructivas |
| **On Destructive** | `#FFFFFF` | `#FFFFFF` | `--color-on-destructive` | Texto sobre destructive |
| **Ring / Focus** | `#7C3AED` | `#8B5CF6` | `--color-ring` | Focus rings, outline activo |

### Palette de éxito / estado
| Estado | Color | Uso |
|--------|-------|-----|
| Success / PASS | `#4ADE80` (emerald-400) | Badges verdes, verdicts PASS |
| Warning / PENDING | `#FBBF24` (amber-400) | Badges amarillos, versión pendiente |
| Error / FAIL / BAD | `#F87171` (red-400) | Badges rojos, feedback BAD, verdict FAIL |
| Info / RUNNING | `#60A5FA` (blue-400) | Estado de corridas en ejecución |

### Contraste (WCAG)
- Texto sobre fondo surface: **≥ 4.5:1** (foreground vs surface)
- Texto sobre primary: **≥ 7:1** (on-primary vs primary)
- Focus rings: **3:1** against background

---

## 2. Typography

**Fuente principal:** Inter (300/400/500/600/700)

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
```

> Nota: El proyecto ya usa `next/font` recomendado. Priorizar `@/lib/fonts` con `Inter` y aplicar en `layout.tsx`.

| Elemento | Size / Line Height | Weight | Color | Notas |
|----------|-------------------|--------|-------|-------|
| Logo / Brand | 18px / 1.2 | 700 | `neutral-100` | "Ultra" + violet "Ia" |
| H1 (Landing) | 48-56px / 1.1 | 700 | `neutral-100` | Tight tracking |
| H1 (Pages) | 28-32px / 1.2 | 700 | `neutral-100` | |
| H2 (Section) | 20px / 1.3 | 600 | `neutral-200` | |
| H3 (Card) | 16px / 1.3 | 600 | `neutral-100` | |
| Body | 14-16px / 1.5 | 400 | `neutral-300` | |
| Small / Caption | 12-13px / 1.4 | 400 | `neutral-500` | |
| Code / Pre | 12-13px / 1.4 | 400 | `neutral-400` | Consolas, monospace |
| Button Primary | 14px / — | 600 | `on-primary` | |
| Button Secondary | 14px / — | 500 | `neutral-200` | |

### Escala de espaciado (base 4px)
8, 12, 16, 20, 24, 32, 40, 48, 56, 64

---

## 3. Layout & Breakpoints

| Breakpoint | Min Width | Uso |
|-----------|-----------|-----|
| xs | 375px | Móvil pequeño |
| sm | 640px | Móvil grande / tablet |
| md | 768px | Tablet landscape |
| lg | 1024px | Laptop |
| xl | 1280px | Desktop estándar |
| 2xl | 1536px | Desktop ancho |

**Max-width containers:**
- Landing / Auth: `max-w-5xl` (1024px)
- Dashboard / App: `max-w-7xl` (1280px)

---

## 4. Spacing & Sizing

| Property | Value |
|----------|-------|
| Border radius (cards) | `rounded-2xl` (16px) |
| Border radius (inputs/buttons) | `rounded-lg` (8px) |
| Border radius (pill badges) | `rounded-full` |
| Input height | 40px (`py-2.5 px-3`) |
| Button height (primary) | 44px (`py-2.5 px-4 py-2`) |
| Min touch target | 44×44px |
| Card padding | 20-24px (`p-5`/`p-6`) |
| Section gap | 32px (`gap-8`) |
| Form field gap | 20px (`space-y-5`) |

---

## 5. Border & Shadows

| Elemento | Border | Shadow |
|----------|--------|--------|
| Cards / Panels | `border-neutral-800` (1px) | `shadow-none` (flat design) |
| Cards hover | `border-violet-700/50` | — |
| Inputs | `border-neutral-700` → focus `border-violet-500` | — |
| Modal overlay | — | `shadow-2xl` (solo para overlay fuera de layout) |
| Divisores | `border-neutral-800` | — |

> Flat design: NO sombras decorativas. Solo `shadow-2xl` para modales/ dropdowns para crear profundidad.

---

## 6. Iconografía

- **Librería:** Heroicons (outline para interfaz, solid para estados)
- **Tamaño base:** 16px (íconos inline), 20px (íconos de botones secundarios)
- **Sin emojis** como íconos (usar SVGs)
- `cursor-pointer` en todos los elementos clickeables

| Acción | Ícono |
|--------|-------|
| Navegación | `home`, `cube`, `chat-bubble-left`, `key`, `chart-bar` |
| Feedback GOOD | `hand-thumb-up` (verde) |
| Feedback BAD | `hand-thumb-down` (rojo) |
| Mejorar agente | `sparkles` (violeta) |
| Ejecutar eval | `play` (azul) |
| Aprobar versión | `check-circle` (verde) |
| Rechazar versión | `x-circle` (rojo) |
| API Key | `key`, `eye`, `copy` |
| Enviar mensaje | `paper-airplane` |
| Menú / toggle | `menu`, `x-mark` |

---

## 7. Motion / Animación

| Propiedad | Valor |
|-----------|-------|
| Duration | 150–200ms |
| Easing | `ease` (Tailwind default), o `cubic-bezier(0.4, 0, 0.2, 1)` |
| Scope | Color/opacity transitions, height/opacity para dropdowns |
| Reduced motion | `@media (prefers-reduced-motion: reduce)` → `transition: none` |
| Enter faster than exit | Siempre |

---

## 8. Dark Mode Strategy

```css
/* CSS layer en globals.css — Tailwind v4 */
@layer base {
  :root {
    --color-primary: 132 85 255;      /* violet-500 */
    --color-accent: 244 114 182;     /* pink-400 */
    --color-background: 15 17 23;    /* near-black */
    --color-surface: 24 24 29;       /* neutral-900 */
    --color-foreground: 228 228 235; /* neutral-200 */
    /* ... */
  }
}
```

- Dark mode por defecto (NO toggle ligado en MVP, pero sistema preparado)
- Contraste verified: texto primario `neutral-200` sobre `neutral-950` = 12.5:1

---

## 9. Component Tokens

| Token | Value |
|-------|-------|
| Focus ring | `ring-2 ring-violet-500 focus:border-violet-500` |
| Input focus | `focus:border-violet-500 focus:ring-1 focus:ring-violet-500` |
| Button primary base | `bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-lg` |
| Button secondary base | `border border-neutral-700 text-neutral-200 hover:bg-neutral-800 rounded-lg` |
| Badge pill | `inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium` |
| Card base | `rounded-2xl border border-neutral-800 bg-neutral-900/50` |

---

## 10. Accessibility Checklist

- [ ] Contraste ≥ 4.5:1 texto, 3:1 focus rings
- [ ] Focus visible en keyboard nav (no `outline: none` sin reemplazo)
- [ ] Labels visibles en todos los inputs (no placeholder-only)
- [ ] `aria-label` en botones icon-only
- [ ] `prefers-reduced-motion` respetado
- [ ] Alt text en imágenes
- [ ] Mensajes de error inline (cerca del campo)
- [ ] Estructura semántica: `main`, `header`, `section`, `nav`, `footer`

# UltraIa Component Catalog

Catálogo de componentes visuales. Basado en Tailwind CSS v4 + tokens de `01-design-system.md`.

---

## 1. Buttons

### Primary
```tsx
<button className="rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50 transition-colors">
  Design my agent
</button>
```
- Usado: Landing CTA, New Agent, Send, Approve Version
- Hover 150ms ease

### Secondary (outline)
```tsx
<button className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-700 transition-colors">
  Cancel
</button>
```

### Destructive text
```tsx
<button className="rounded px-2 py-0.5 text-xs text-red-300 hover:bg-red-950/50">
  Reject
</button>
```

### Icon button
```tsx
<button className="rounded-lg border border-neutral-700 bg-neutral-800 p-2 text-neutral-300 hover:text-white hover:bg-neutral-700">
  <CopyIcon className="h-4 w-4" />
</button>
```

### Loading button
```tsx
<button disabled className="rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white">
  <span className="flex items-center gap-2">
    <span className="animate-spin">⋯</span>
    Designing your agent…
  </span>
</button>
```

---

## 2. Inputs

### Text input (con label siempre visible)
```tsx
<label className="block text-sm font-medium text-neutral-300">
  Agent name
  <input
    type="text"
    maxLength={100}
    placeholder="e.g. Sales Email Writer"
    className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
  />
</label>
```
- Error state: `border-red-500 focus:ring-red-500`

### Textarea
```tsx
<label className="block text-sm font-medium text-neutral-300">
  What should the agent do? *
  <textarea
    rows={6}
    maxLength={4000}
    placeholder="Describe your task..."
    className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
  />
</label>
```

### Form error (inline)
```tsx
<p className="rounded-lg border border-red-800 bg-red-950/50 px-3 py-2 text-sm text-red-300">
  Email already registered
</p>
```

### Helper text
```tsx
<p className="text-xs text-neutral-500">
  UltraIa designs the system prompt, model, tools and evaluation rubric.
</p>
```

---

## 3. Chat UI

### User message (align right, violet)
```tsx
<div className="max-w-[85%] self-end rounded-2xl bg-violet-700/80 px-4 py-3 text-sm text-white">
  Hola, ¿puedes ayudarme?
</div>
```

### Assistant message (align left, neutral surface)
```tsx
<div className="max-w-[85%] self-start rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-neutral-100">
  Hola! Claro que sí...
</div>
```

### Thinking indicator
```tsx
<div className="self-start rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-neutral-400">
  Thinking…
</div>
```

### Chat input bar
```tsx
<form className="flex gap-2">
  <input
    type="text"
    placeholder="Ask your agent something…"
    className="flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500"
  />
  <button type="submit" disabled className="rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50">
    Send
  </button>
</form>
```

---

## 4. Feedback Control

Ver `apps/web/src/components/feedback-control.tsx`.

Estados:
1. **Inicial:** label "Was this good?" + 2 botones Good/Bad
2. **BAD seleccionado:** expande textarea para critique + botón Send rojo
3. **Guardado:** mensaje "Thanks — feedback recorded."

---

## 5. Status Badges

| Status | Clase Tailwind |
|--------|---------------|
| ACTIVE | `bg-emerald-900/60 text-emerald-300` |
| PENDING | `bg-amber-900/60 text-amber-300` |
| REJECTED | `bg-red-900/60 text-red-300` |
| SUPERSEDED | `bg-neutral-800 text-neutral-400` |

```tsx
<span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[v.status]}`}>
  {v.status}
</span>
```

---

## 6. Cards & Panels

### Panel de sección (Agent detail)
```tsx
<div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-5">
  <h2 className="text-sm font-semibold text-neutral-300">Try it</h2>
</div>
```

### Card de agente (Dashboard grid)
```tsx
<Link href={`/agents/${bp.id}`} className="block rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6 transition hover:border-violet-700">
  <div className="flex items-center justify-between">
    <h2 className="font-semibold">Sales Email Writer</h2>
    <span className="rounded-full bg-neutral-800 px-2.5 py-0.5 text-xs text-neutral-300">v1</span>
  </div>
  <p className="mt-2 line-clamp-2 text-sm text-neutral-400">{bp.taskDescription}</p>
</Link>
```

---

## 7. Header / Navigation

### Logged-out (Landing)
```tsx
<header className="flex items-center justify-between">
  <div className="text-lg font-bold tracking-tight">Ultra<span className="text-violet-400">Ia</span></div>
  <nav className="flex items-center gap-4 text-sm">
    <Link href="/login" className="text-neutral-300 hover:text-white">Log in</Link>
    <Link href="/register" className="rounded-lg bg-violet-600 px-4 py-2 font-medium text-white hover:bg-violet-500">Get started</Link>
  </nav>
</header>
```

### Logged-in (App layout)
```tsx
<header className="border-b border-neutral-800">
  <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
    <Link href="/dashboard" className="text-lg font-bold tracking-tight">
      Ultra<span className="text-violet-400">Ia</span>
    </Link>
    <nav className="flex items-center gap-4 text-sm">
      <Link href="/agents/new" className="text-neutral-300 hover:text-white">+ New agent</Link>
      <span className="text-neutral-600">|</span>
      <span className="text-neutral-400">{user?.name ?? user?.email}</span>
      <form action={logoutAction} method="post">
        <button className="text-neutral-500 hover:text-white">Log out</button>
      </form>
    </nav>
  </div>
</header>
```

---

## 8. Empty / Loading States

### Estado vacío (Dashboard)
```tsx
<div className="mt-16 rounded-2xl border border-dashed border-neutral-700 p-12 text-center">
  <p className="text-neutral-300">No agents yet.</p>
  <p className="mt-2 text-sm text-neutral-500">Describe a task and UltraIa will design a purpose-built agent.</p>
  <Link href="/agents/new" className="mt-6 inline-block rounded-lg bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-violet-500">
    Create your first agent
  </Link>
</div>
```

### Estado de chat vacío
```tsx
<p className="rounded-xl border border-dashed border-neutral-700 px-4 py-8 text-center text-sm text-neutral-500">
  Start a conversation to test your agent.
</p>
```

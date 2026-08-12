# UltraIa Page Wireframes

Wireframes ASCII para las páginas clave. Mobile-first (375px base) → Desktop (1280px).

---

## 1. Landing Page (`/`)

```
┌─────────────────────────────────────────────────────────┐
│ LOGO              Log in        [Get started]           │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                                                         │
│   AI that creates AI — and learns from every            │
│   conversation.                                         │
│                                                         │
│   Describe a task in plain language. UltraIa            │
│   generates a purpose-built AI agent...                 │
│                                                         │
│           [ Create your first agent ]                   │
│                                                         │
└─────────────────────────────────────────────────────────┘

┌───────┐  ┌───────┐  ┌───────┐
│Generate│ │Run    │ │Improve│
│Tell us│ │Chat   │ │Auto   │
│the job│ │with   │ │-pipe  │
│...    │ │agent  │ │line   │
│       │ │or API │ │+eval  │
└───────┘  └───────┘  └───────┘

┌─────────────────────────────────────────────────────────┐
│ UltraIa · AI creates AI, humans approve.               │
└─────────────────────────────────────────────────────────┘
```

**Layout:** max-w-5xl, centro, flex column, 28px top margin hero, 28px gaps entre secciones.

---

## 2. Login Page (`/login`)

```
┌─────────────────────────────────────────────────────────┐
│                      (solo branding)                    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                                                     │
│  Welcome back                                       │
│  Log in to your UltraIa workspace.                  │
│                                                     │
│  ┌───────────────────────────────────────────────┐   │
│  │ Email                                         │   │
│  │ [ user@example.com              ]             │   │
│  │                                               │   │
│  │ Password                                      │   │
│  │ [ ●●●●●●●●●●●●●● ]                           │   │
│  │                                               │   │
│  │  [ Log in ]                                  │   │
│  └───────────────────────────────────────────────┘   │
│                                                     │
│  No account? Create one                              │
│                                                     │
└─────────────────────────────────────────────────────┘

Mobile: max-w-sm, flex min-h-screen justify-center
Desktop: max-w-sm centrado
```

**Notas:** Formulario usa `useActionState` con `loginAction`. Error inline si auth falla.

---

## 3. Register Page (`/register`)

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  Create your workspace                              │
│  Start building agents that learn from use.         │
│                                                     │
│  ┌───────────────────────────────────────────────┐   │
│  │ Name (optional)                               │   │
│  │ [ John Doe                 ]                  │   │
│  │                                               │   │
│  │ Email *                                       │   │
│  │ [ user@example.com        ]                   │   │
│  │                                               │   │
│  │ Password *                                    │   │
│  │ [ ●●●●●●●●●●●● ]                              │   │
│  │                                               │   │
│  │  [ Create account ]                           │   │
│  └───────────────────────────────────────────────┘   │
│                                                     │
│  Already registered? Log in                          │
│                                                     │
└─────────────────────────────────────────────────────┘

Password min 8 chars. Validación cliente + server.
```

---

## 4. Dashboard Page (`/dashboard`)

```
┌─────────────────────────────────────────────────────────────────┐
│ LOGO              + New agent | John Doe | Log out              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Your agents                                                     │
│ Agents UltraIa generated for you...                             │
│                               [ + New agent ]                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────┐
│ ┌──────────────────────────────────┐│
│ │Sales Email Writer      [v1]      ││
│ │Write persuasive sales emails...  ││
│ └──────────────────────────────────┘│
│                                     │
│ ┌──────────────────────────────────┐│
│ │Code Review Buddy      [v1]      ││
│ │Review PRs and flag issues...     ││
│ └──────────────────────────────────┘│
└─────────────────────────────────────┘

Mobile: grid 1-col  →  md: grid-cols-2  →  lg: grid-cols-3
```

**Empty state:** centrado con ilustración + CTA.

---

## 5. New Agent Page (`/agents/new`)

```
┌───────┐
│← Dashboard│
└───────┘

┌─────────────────────────────────────────────┐
│  Design a new agent                         │
│  Describe the job in plain language...      │
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │ Agent name (optional)                 │  │
│  │ [                    ]               │  │
│  │                                       │  │
│  │ What should the agent do? *           │  │
│  │ [Describe your task in 4000 chars    │  │
│  │  of limit...]                         │  │
│  │                                       │  │
│  │  [ Design my agent ]                 │  │
│  │  (diseñando tu agente… ~15s)         │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  UltraIa designs the system prompt,          │
│  model, tools and evaluation rubric.        │
└─────────────────────────────────────────────┘

max-w-2xl centrado
```

**States:**
- Initial: formulario
- Pending: botón disabled, spinner + "Designing your agent… (this can take ~15s)"
- Success → redirect a `/agents/[id]`

---

## 6. Agent Detail Page (`/agents/[id]`)

```
┌───────┐
│← Dashboard│
└───────┘

Agente: Sales Email Writer
v1 · gpt-4o-mini · Tools: calculator · Feedback: 5 good / 2 bad

┌──────────────────────────────────────────────────────────┐
│                                                          │
│                    ┌────────────────────────┐            │
│                    │   Try it (chat)        │            │
│                    │   [AgentChat component]│            │
│                    │                        │            │
│                    │ [Ask something…][Send] │            │
│                    └────────────────────────┘            │
│                                                          │
│  ┌──────────────┐ ┌────────────────────────┐            │
│  │Learn from     │ │Evaluations              │            │
│  │[Improve] Bot.│ │Avg: 0.85 · 80% pass     │            │
│  │Reviews BAD   │ │[Run evals]              │            │
│  │feedback...   │ │Regression set (5 inputs)│            │
│  │              │ │+ Eval input form         │            │
│  └──────────────┘ └────────────────────────┘            │
│                                                          │
│  ┌────────────────────────┐                             │
│  │API access              │                              │
│  │[ApiKeyPanel component] │                              │
│  └────────────────────────┘                             │
│                                                          │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ Version history                                          │
│ ┌──────────────────────────────────────────────────────┐ │
│ │v1  ACTIVE  12 ago · gpt-4o-mini  last eval: 0.85    │ │
│ │  "Improved tone for cold outreach"                  │ │
│ │  [System prompt ▼]                                    │ │
│ │  v1  [Approve▼] [Reject] (PENDING)                   │ │
│ └──────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘

Desktop: grid lg:grid-cols-5 (chat col-span-3, sidebar col-span-2)
Mobile: flex column, gaps
```

### Agent Detail — Desktop breakdown

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ← Dashboard                                                              │
│ Sales Email Writer                                                        │
│ v1 · gpt-4o-mini · Tools: calculator · Feedback: 5 good / 2 bad          │
│                                                                          │
│ ┌─────────────────┬─────────────────┬────────────────────────────┐      │
│ │                 │                 │                            │      │
│ │   Try it        │  Learn from     │    Evaluations             │      │
│ │  (col-span-3)   │   feedback      │   (col-span-2)             │      │
│ │  [Chat UI]      │  [Improve Btn]  │  Avg: 0.85 · 80% pass      │      │
│ │                 │  "...proposes   │  [Run evals]               │      │
│ │                 │   new prompt"   │  Regression set (5 inputs) │      │
│ │                 │                 │  [+ Eval input form]       │      │
│ │                 │                 │                            │      │
│ │                 │                 │    API access              │      │
│ │                 │                 │  [ApiKeyPanel]             │      │
│ └─────────────────┴─────────────────┴────────────────────────────┘      │
│                                                                          │
│ Version history (full width)                                             │
│ ┌────────────────────────────────────────────────────────────────────┐   │
│ │ v2  PENDING  ... [System prompt ▼] [Approve] [Reject]             │   │
│ │ v1  ACTIVE   ... [System prompt ▼]                                  │   │
│ └────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Agent Chat (Component)

```
┌─────────────────────────────────────────┐
│ [msg1: usuario]  ← align right  violet │
│ [msg2: asistente] ← align left  neutral│
│ ...                                     │
│ [msgN: asistente]                       │
│   └── FeedbackControl: Good | Bad [↕]   │
│       Gracias — feedback recorded.      │
│ ─────────────────────────               │
│ [Ask something…________________][Send] │
└─────────────────────────────────────────┘

- Mensajes max-w-[85%]
- Feedback solo en último mensaje asistente
- "Thinking…" indicador durante streaming
```

---

## 8. API Key Panel

```
┌─────────────────────────────────────────┐
│ API access                              │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 🔑 prod-key-1  [👁]       Created  │ │
│ │    Active · Last used 2h ago      │ │
│ └─────────────────────────────────────┘ │
│                                         │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 🔑 staging-key      [👁]   Created  │ │
│ │    Revoked                         │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [ + New API Key ]                       │
└─────────────────────────────────────────┘
```

### Modal: New API Key
```
┌─────────────────────────────────────────┐
│ New API Key                             │
│                                         │
│ Name: [ prod-key-2                  ]   │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ sk_live_1234... (copied to clipboard│ │
│ │ on creation, can't be recovered)    │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [ Cancel ]  [ Create key ]              │
└─── modal overlay
```

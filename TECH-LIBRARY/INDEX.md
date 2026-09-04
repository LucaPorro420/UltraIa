# UltraIa - Biblioteca Tecnológica Offline

> **Fecha de creación:** 2026-08-30
> **Propósito:** Referencia completa offline de TODAS las tecnologías usadas en UltraIa
> **Uso:** Consultar antes de implementar, reparar, mejorar o replicar el proyecto

---

## 📋 Índice por Categoría

### 01 - FRONTEND
| Archivo | Tecnología | Versión | Descripción |
|---------|-----------|---------|-------------|
| [nextjs-15.md](01-FRONTEND/nextjs-15.md) | Next.js | 15.3.3 | App Router, Server Components, Streaming, Turbopack |
| [react-19.md](01-FRONTEND/react-19.md) | React | 19.2.3 | Actions, use(), Server Components, Compiler |
| [typescript-5.md](01-FRONTEND/typescript-5.md) | TypeScript | 5.8.2 | Advanced types, pattern matching, generics |
| [tailwind-v4.md](01-FRONTEND/tailwind-v4.md) | Tailwind CSS | 4.1.4 | CSS-first config, @theme, Lightning CSS engine |

### 02 - BACKEND
| Archivo | Tecnología | Versión | Descripción |
|---------|-----------|---------|-------------|
| [vercel-ai-sdk.md](02-BACKEND/vercel-ai-sdk.md) | Vercel AI SDK | 4.1.61 | generateText, streamText, tools, agents |
| [zod.md](02-BACKEND/zod.md) | Zod | 3.24.2 | Schema validation, type inference |
| [nodejs-patterns.md](02-BACKEND/nodejs-patterns.md) | Node.js | 20+ | Backend patterns, API design |

### 03 - DATABASE
| Archivo | Tecnología | Versión | Descripción |
|---------|-----------|---------|-------------|
| [prisma-sqlite.md](03-DATABASE/prisma-sqlite.md) | Prisma ORM | 6.7.0 | Schema, migrations, SQLite, Client |

### 04 - AI/ML
| Archivo | Tecnología | Versión | Descripción |
|---------|-----------|---------|-------------|
| [ai-sdk-providers.md](04-AI-ML/ai-sdk-providers.md) | AI Providers | - | OpenAI, Google, Anthropic integration |
| [llm-agents.md](04-AI-ML/llm-agents.md) | LLM Agents | - | Agent architecture, tools, capabilities |

### 05 - MOBILE
| Archivo | Tecnología | Versión | Descripción |
|---------|-----------|---------|-------------|
| [expo-react-native.md](05-MOBILE/expo-react-native.md) | Expo SDK | 57 | React Native, routing, secure store |

### 06 - ANIMATION & 3D
| Archivo | Tecnología | Versión | Descripción |
|---------|-----------|---------|-------------|
| [gsap.md](06-ANIMATION-3D/gsap.md) | GSAP | 3.15.0 | Animation engine, ScrollTrigger, React hook |
| [threejs.md](06-ANIMATION-3D/threejs.md) | Three.js | 0.185.1 | WebGL, 3D rendering, shaders |
| [lottie.md](06-ANIMATION-3D/lottie.md) | Lottie | 2.4.1 | After Effects animations in React |

### 07 - TESTING
| Archivo | Tecnología | Versión | Descripción |
|---------|-----------|---------|-------------|
| [vitest.md](07-TESTING/vitest.md) | Vitest | 3.0.9 | Unit testing, mocking, coverage |
| [playwright.md](07-TESTING/playwright.md) | Playwright | 1.62.1 | E2E testing, browser automation |

### 08 - INFRASTRUCTURE
| Archivo | Tecnología | Versión | Descripción |
|---------|-----------|---------|-------------|
| [cloudflare-workers.md](08-INFRASTRUCTURE/cloudflare-workers.md) | Cloudflare | - | Workers, R2, D1, edge computing |
| [docker.md](08-INFRASTRUCTURE/docker.md) | Docker | - | Containerization, compose |

### 09 - REALTIME
| Archivo | Tecnología | Versión | Descripción |
|---------|-----------|---------|-------------|
| [websocket.md](09-REALTIME/websocket.md) | WebSocket | - | Real-time communication |
| [webrtc.md](09-REALTIME/webrtc.md) | WebRTC | - | P2P video, data channels |

### 10 - SECURITY
| Archivo | Tecnología | Versión | Descripción |
|---------|-----------|---------|-------------|
| [auth-patterns.md](10-SECURITY/auth-patterns.md) | Auth | - | JWT, sessions, OAuth2, RBAC |

### 11 - DEVOPS
| Archivo | Tecnología | Versión | Descripción |
|---------|-----------|---------|-------------|
| [git-workflows.md](11-DEVOPS/git-workflows.md) | Git | - | Branching, CI/CD, hooks |
| [npm-workspaces.md](11-DEVOPS/npm-workspaces.md) | npm | - | Monorepo, workspaces |

### 12 - TOOLS & UTILITIES
| Archivo | Tecnología | Versión | Descripción |
|---------|-----------|---------|-------------|
| [eslint-prettier.md](12-TOOLS/eslint-prettier.md) | ESLint/Prettier | - | Code quality, formatting |
| [repomix.md](12-TOOLS/repomix.md) | Repomix | 1.18.0 | Repo packaging for LLMs |

---

## 🏗️ Stack Completo del Proyecto

```
UltraIa Monorepo
├── apps/
│   ├── web/          → Next.js 15 + React 19 + Tailwind v4 + Three.js + GSAP
│   └── mobile/       → Expo SDK 57 + React Native 0.86
├── packages/
│   ├── core/         → Prisma + Zod + Vercel AI SDK + domain logic
│   └── runtime/      → @ultraia/runtime (local API, modules, memory)
├── gen-engine/       → Python gen-engine (AI content generation)
├── cloudflare/       → Cloudflare Workers (R2 stateless API)
└── scripts/          → Python automation (loop PIVR, state doctor, etc.)
```

## 🔑 Comandos Esenciales

```bash
# Setup
npm run db:migrate          # Prisma migrations
npm run db:generate         # Generate Prisma Client

# Development
npm run dev                 # Start Next.js dev server
npm run mobile              # Start Expo dev server

# Quality Gates (CI order)
npm run typecheck           # TypeScript checking
npm run lint                # ESLint
npm run test                # Vitest (core + runtime)
npm run build               # Next.js production build

# Full verification
npm run gate                # All 4 gates + harness tests

# Automation
python start.py             # Setup + web + webhooks + gen-engine
npm run cerebro             # Cerebro cycle
```

## 📚 Fuentes de Veridad

- `AGENTS.md` — Master prompt y reglas operativas
- `DESIGN.md` — Sistema de diseño
- `docs/design-dna.json` — DNA visual
- `apps/web/MASTER.md` — Motion y stack-aware rules
- `learning/LEARNINGS.md` — Lecciones verificadas
- `learning/truth/` — Datos verificados contra reality

## 🎓 Cómo estudiar (app offline `index.html`)

Doble-click en `index.html` (o en Windows `Abrir-Biblioteca.cmd` para ventana app sin barra;
o `node desktopFase/launcher/launcher.mjs --biblio` para ventana WebView2). Todo persiste en
`localStorage` (`tl_*`); copia en Guardados → ⬇ Exportar. Cuaderno → ⬇ Cuaderno .md (apuntes en Markdown).

- **Biblioteca**: lectura libre 01→12 + libros (115) con favoritos y notas.
- **Curso**: Nivel 1 Fundamentos → Nivel 2 Stack UltraIa → Nivel 3 Pro. Sesión de estudio
  (recall + auto-calificación Otra vez/Difícil/Bien/Fácil + Feynman), test sorpresa
  (opción múltiple auto-corregido) y mezcla total (interleaving). Repaso espaciado SM-2
  (cajas 0/1/3/7/16 días) en `tl_quiz`.
- **Guardados**: carpetas/subcarpetas + fichas que SOLO se guardan con título.
- **Agente IA local** (sin internet): busca, enlaza, resume (extractivo), explica (simple +
  ejemplo + siguiente paso) y traduce por glosario técnico ES↔EN.

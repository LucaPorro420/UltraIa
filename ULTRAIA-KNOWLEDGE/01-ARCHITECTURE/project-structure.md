# Arquitectura completa de UltraIa — El plano de la casa

> **Versión:** 1.5.0
> **Tipo:** Monorepo npm workspaces
> **Stack:** Next.js 15 + Prisma + TypeScript + Tailwind v4 + Vercel AI SDK
> **Nodes:** Node.js >= 20, Python >= 3.10

---

## 1. ¿Qué es la arquitectura?

Es como el **plano de una casa**: dice dónde va cada cuarto, cómo se conectan las habitaciones, y dónde están las tuberías.

En UltraIa, la arquitectura define:
- Dónde está el código de cada parte
- Cómo se comunican entre sí
- Qué hace cada carpeta

---

## 2. El mapa completo del proyecto

```
UltraIa/                              ← RAÍZ (aquí ejecutas todo)
│
├── apps/                             ← LAS APLICACIONES (lo que el usuario ve)
│   ├── web/                          ← La página web (Next.js 15.3.3)
│   │   ├── app/                      ← Páginas (App Router)
│   │   │   ├── layout.tsx            ← Esqueleto de TODAS las páginas
│   │   │   ├── page.tsx              ← Landing page (inicio)
│   │   │   ├── (marketing)/          ← Páginas públicas
│   │   │   │   ├── (auth)/           ← Login y registro
│   │   │   │   └── pricing/          ← Página de precios
│   │   │   ├── (app)/                ← Páginas que requieren login
│   │   │   │   ├── dashboard/        ← Panel principal
│   │   │   │   ├── chat/             ← Chat con la IA
│   │   │   │   ├── studio/           ← Editor de contenido
│   │   │   │   ├── gallery/          ← Galería de creaciones
│   │   │   │   ├── cloud/            ← Tu nube de archivos
│   │   │   │   ├── blog/             ← Blog público
│   │   │   │   └── playground/       ← Playground de código
│   │   │   └── api/                  ← El "backend" (API routes)
│   │   │       ├── auth/             ← Login, registro, me
│   │   │       ├── chat/             ← Chat con la IA
│   │   │       ├── cloud/            ← Archivos en la nube
│   │   │       ├── publications/     ← Cola de publicaciones
│   │   │       ├── agents/           ← Agentes de IA
│   │   │       ├── bridge/           ← Chat→código
│   │   │       ├── omag/             ← Generación multimedia
│   │   │       ├── health/           ← Health checks
│   │   │       └── ...               ← 20+ endpoints más
│   │   │
│   │   ├── components/               ← Componentes React
│   │   │   ├── ui/                   ← UI kit (botones, cards, etc.)
│   │   │   ├── app-shell/            ← Navegación, sidebar
│   │   │   └── aurora/               ← Efecto visual Three.js
│   │   │
│   │   ├── src/
│   │   │   ├── lib/server/           ← Funciones del servidor
│   │   │   │   ├── context.ts        ← ¿Quién está logueado?
│   │   │   │   └── download-token.ts ← Tokens de descarga
│   │   │   └── middleware.ts         ← Seguridad (329 líneas)
│   │   │
│   │   ├── globals.css               ← Entry CSS → 4 archivos
│   │   │   ├── globals-base.css      ← Tokens de diseño (129 líneas)
│   │   │   ├── globals-utilities.css ← Utilidades CSS (186 líneas)
│   │   │   ├── globals-components.css← Componentes CSS (130 líneas)
│   │   │   └── globals-motion.css    ← Animaciones (77 líneas)
│   │   │
│   │   ├── next.config.ts            ← Config Next.js (202 líneas)
│   │   ├── tsconfig.json             ← Config TypeScript
│   │   └── package.json              ← Dependencias
│   │
│   └── mobile/                       ← App de celular (Expo SDK 57)
│       ├── app/                      ← Pantallas (expo-router)
│       ├── src/api/types.ts          ← Tipos de la API
│       └── package.json              ← Dependencias
│
├── packages/                         ← LAS LIBRERÍAS (código compartido)
│   ├── core/                         ← EL CEREBRO (@ultraia/core)
│   │   ├── src/
│   │   │   ├── ai/
│   │   │   │   └── llm.ts            ← EL CEREBRO PRINCIPAL (3,861 líneas)
│   │   │   │                         ← 11 proveedores, 87 tools, streaming
│   │   │   ├── auth/
│   │   │   │   ├── session.ts        ← Sesiones SHA-256 (150 líneas)
│   │   │   │   └── password.ts       ← bcrypt cost 12 (40 líneas)
│   │   │   ├── tools/                ← 87 herramientas
│   │   │   │   ├── index.ts          ← Catálogo completo (441 líneas)
│   │   │   │   ├── calculator.ts     ← Matemáticas
│   │   │   │   ├── image.ts          ← Generar imágenes
│   │   │   │   ├── video.ts          ← Generar videos
│   │   │   │   ├── music.ts          ← Componer música
│   │   │   │   ├── cloud.ts          ← Nube de archivos
│   │   │   │   ├── travel.ts         ← Videos de viaje
│   │   │   │   ├── diagram.ts        ← Diagramas HTML/SVG
│   │   │   │   ├── codevfx.ts        ← Efectos VFX con código
│   │   │   │   ├── g0dm0d3.ts        ← Ofuscación avanzada
│   │   │   │   ├── publish.ts        ← 8 plataformas
│   │   │   │   └── ...               ← 77 tools más
│   │   │   ├── db/
│   │   │   │   └── client.ts         ← Conexión Prisma
│   │   │   ├── prompt/
│   │   │   │   └── director.ts       ← Director de IA
│   │   │   └── domain/
│   │   │       ├── publications.ts   ← Cola de publicaciones
│   │   │       └── briefs.ts         ← Ideas de contenido
│   │   │
│   │   ├── prisma/
│   │   │   ├── schema.prisma         ← PLANO de la DB (301 líneas, 17 modelos)
│   │   │   ├── dev.db                ← Base de datos SQLite
│   │   │   └── seed-admin.mjs        ← Datos iniciales
│   │   │
│   │   ├── package.json              ← Dependencias (@ai-sdk/*, ai, bcryptjs, zod)
│   │   └── tsconfig.json             ← Config TypeScript
│   │
│   └── runtime/                      ← MOTOR LOCAL (@ultraia/runtime)
│       ├── src/
│       │   ├── runtime.ts            ← UltraRuntime (orquestador)
│       │   ├── api/                  ← Servidor local (WebSocket + HTTP)
│       │   └── adapters/             ← Conexiones a modelos locales
│       └── package.json              ← TS puro, sin deps externas
│
├── scripts/                          ← Scripts Python automáticos
│   ├── loop_piv.py                   ← Driver del bucle PIVR
│   ├── state_doctor.py               ← Verificador de integridad
│   ├── loop_triage.py                ← Triage determinista
│   ├── sync_skill_mirrors.py         ← Sincronizar skills
│   ├── cloud-cli.py                  ← CLI de nube
│   ├── topics.py                     ← Motor de ideas
│   └── *.test.py                     ← Tests standalone
│
├── Task/                             ← Tareas automáticas del cerebro
│   ├── cerebro.mjs                   ← Agente autónomo
│   ├── generate-diagrams.ts          ← Generador de diagramas
│   └── ...
│
├── gen-engine/                       ← Motor de generación (Python)
│   ├── main.py                       ← FastAPI server
│   └── tests/                        ← Tests del engine
│
├── cloudflare/                       ← Worker para R2
│   ├── worker.ts                     ← Cloudflare Worker
│   └── wrangler.toml                 ← Config Cloudflare
│
├── learning/                         ← Sistema de aprendizaje
│   ├── truth/                        ← Verdad verificada
│   ├── responses/                    ← Respuestas crudas
│   └── scripts/verify.py             ← Verificador
│
├── docs/                             ← Documentación
│   ├── SECURITY-AUDIT.md             ← Auditoría de seguridad (32 findings)
│   ├── CLOUD-FREE-2026.md            ← Hosting gratuito
│   ├── CANALES-CONFIG-2026.md        ← Config canales
│   ├── MOBILE.md                     ← Guía app móvil
│   └── ...
│
├── .opencode/                        ← Config de opencode
│   ├── plans/                        ← Planes de iteraciones
│   └── skills/                       ← Skills del harness
│
├── skills/                           ← Skills (espejos)
├── vendor/                           ← Código de referencia
├── ULTRAIA-KNOWLEDGE/                ← ESTA BIBLIOTECA (estás aquí)
│
├── start.py                          ← UN COMANDO para iniciar todo (1,192 líneas)
├── package.json                      ← Config raíz (workspaces, scripts)
├── tsconfig.base.json                ← TypeScript base
├── .env.example                      ← 123+ variables de entorno
├── .gitignore                        ← Archivos ignorados
├── STATE.md                          ← Estado actual del proyecto
├── AGENTS.md                         ← Reglas para agentes de IA
├── LOOP.md                           ← Config del bucle PIVR
├── loop-constraints.md               ← Reglas vinculantes
├── loop-run-log.md                   ← Historial de iteraciones
└── loop-budget.md                    ← Presupuesto de tokens/tiempo
```

---

## 3. Las 3 partes principales (explicación detallada)

### 3.1 `apps/web/` — La página web (lo que ves)

**¿Qué es?** Es la interfaz visual. Cuando abres `http://localhost:3000`, ves esto.

**Stack tecnológico:**
- Next.js 15.3.3 (App Router)
- React 19.2.3
- Tailwind CSS 4
- Three.js (efectos 3D)
- GSAP (animaciones)
- lucide-react (iconos)

**Archivos importantes:**

| Archivo | Líneas | Qué hace |
|---------|--------|----------|
| `app/layout.tsx` | ~100 | Esqueleto de todas las páginas |
| `app/page.tsx` | ~50 | Landing page |
| `src/middleware.ts` | 329 | Seguridad (rate limit, CSP, CSRF) |
| `src/lib/server/context.ts` | ~50 | getCurrentUser() |
| `globals.css` | 8 | Entry CSS (importa 4 archivos) |
| `globals-base.css` | 129 | Tokens de diseño (colores, fuentes) |
| `globals-utilities.css` | 186 | Utilidades (glass-panel, glow, etc.) |
| `globals-components.css` | 130 | Componentes CSS (markdown, tooltip) |
| `globals-motion.css` | 77 | Animaciones (aurora, shimmer, etc.) |
| `next.config.ts` | 202 | Config Next.js (images, headers, etc.) |

**Componentes UI:**

| Componente | Archivo | Qué hace |
|------------|---------|----------|
| Button | `ui/button.tsx` | Botones con variantes |
| Input | `ui/input.tsx` | Campos de texto |
| Card | `ui/card.tsx` | Tarjetas |
| Dialog | `ui/dialog.tsx` | Modales |
| Tabs | `ui/tabs.tsx` | Pestañas |
| Skeleton | `ui/skeleton.tsx` | Carga |
| Tooltip | `ui/tooltip.tsx` | Consejos |
| StatCard | `ui/stat-card.tsx` | Estadísticas |
| EmptyState | `ui/empty-state.tsx` | Estado vacío |
| Badge | `ui/badge.tsx` | Etiquetas |
| Switch | `ui/switch.tsx` | Interruptores |
| Kbd | `ui/kbd.tsx` | Atajos de teclado |

---

### 3.2 `packages/core/` — El cerebro (la parte importante)

**¿Qué es?** Aquí vive TODO el poder del proyecto: la IA, las herramientas, la base de datos, la seguridad.

**Stack tecnológico:**
- Vercel AI SDK (`ai` package)
- @ai-sdk/google (Gemini)
- @ai-sdk/openai (GPT)
- Prisma (ORM)
- bcryptjs (contraseñas)
- zod (validación)

**Archivos importantes:**

| Archivo | Líneas | Qué hace |
|---------|--------|----------|
| `src/ai/llm.ts` | 3,861 | EL CEREBRO: 11 proveedores, 87 tools |
| `src/auth/session.ts` | 150 | Sesiones SHA-256 |
| `src/auth/password.ts` | 40 | bcrypt cost 12 |
| `src/tools/index.ts` | 441 | Catálogo de 87 tools |
| `prisma/schema.prisma` | 301 | 17 modelos de DB |
| `prisma/dev.db` | - | Base de datos SQLite |

**Las 87 herramientas (resumen):**

| Categoría | Cantidad | Ejemplos |
|-----------|----------|----------|
| Matemáticas | 1 | calculator |
| Búsqueda/Web | 5 | web, reach, research, enlaces, libros |
| Generación | 7 | image, video, music, audio, design, content, present |
| Publicación | 5 | publish, publications, contenido, topics, metrics |
| IA/Agentes | 7 | skills, orchestrator, cerebro, goal, loop-trigger, chat-bridge, harness |
| G0DM0D3 | 4 | parseltongue, autotune, ultraplinian, godmode |
| Memoria | 6 | semantic_memory, chat_memory, autolearn, memory, kgraph, brainpage |
| Análisis | 4 | videoqa, motion, replica, imaging |
| VFX | 3 | vfx, codevfx, recordly |
| Geometría | 12 | geometry, pngrender, procvid, sdf, geom, generative, chaos-game, chaos, physics2d, cadgeo, evo, evolution |
| Edición video | 2 | video_edit, screenflow |
| Diagramas | 1 | diagram |
| Nube | 1 | cloud |
| Seguridad | 3 | security, codequality, deps |
| Otros | 23 | travel, vault, pdfsearch, growth, etc. |

---

### 3.3 `packages/runtime/` — El motor local

**¿Qué es?** Permite que UltraIa funcione SIN internet, en tu computadora.

**Stack tecnológico:**
- TypeScript puro
- Sin dependencias externas
- WebSocket + HTTP server

**Componentes:**

| Componente | Qué hace |
|------------|----------|
| UltraRuntime | Orquestador principal |
| UltraPaths | Layout `.ultraia/` de 9 directorios |
| UltraConfig | Secretos enmascarados |
| UltraLogger | Logs con sinks |
| UltraEventBus | Eventos con wildcards |
| TaskManager | Prioridades y cancelación |
| ModuleRegistry | Módulos lazy-load |
| ResourceManager | CPU monitoring |
| CommandExecutor | Allowlist estricto |
| HealthManager | Health checks |
| Recovery | Auto-recovery por módulo |
| MemoryManager | Memoria con evicción |
| LocalApiServer | API HTTP/WS en 127.0.0.1 |

---

## 4. Cómo se comunican las partes

```
┌─────────────────────────────────────────────────────────────────┐
│                        USUARIO (tú)                            │
│                              │                                  │
│                              ▼                                  │
│                   ┌─────────────────────┐                      │
│                   │   apps/web (UI)     │                      │
│                   │   Puerto 3000       │                      │
│                   │   Next.js 15        │                      │
│                   └──────────┬──────────┘                      │
│                              │                                  │
│                              ▼                                  │
│                   ┌─────────────────────┐                      │
│                   │   API Routes        │                      │
│                   │   /api/auth/login   │                      │
│                   │   /api/chat         │                      │
│                   │   /api/cloud        │                      │
│                   │   /api/publications │                      │
│                   └──────────┬──────────┘                      │
│                              │                                  │
│                              ▼                                  │
│              ┌───────────────────────────────┐                 │
│              │   packages/core (CEREBRO)     │                 │
│              │   llm.ts (3,861 líneas)       │                 │
│              │   11 proveedores IA            │                 │
│              │   87 herramientas              │                 │
│              │   17 modelos de DB             │                 │
│              └───────────┬───────────────────┘                 │
│                          │                                      │
│          ┌───────────────┼───────────────┐                     │
│          ▼               ▼               ▼                     │
│   ┌──────────┐   ┌──────────┐   ┌──────────┐                 │
│   │ OpenAI   │   │ Google   │   │ Ollama   │                 │
│   │ (nube)   │   │ (nube)   │   │ (local)  │                 │
│   │ GPT-4    │   │ Gemini   │   │ Llama3   │                 │
│   └──────────┘   └──────────┘   └──────────┘                 │
│                                                               │
│   ┌──────────────────────────────────────────────┐           │
│   │   packages/runtime (MOTOR LOCAL)             │           │
│   │   UltraRuntime + LocalApiServer              │           │
│   │   WebSocket + HTTP en 127.0.0.1              │           │
│   └──────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Flujo de una petición (detallado)

### Ejemplo: "Genera una imagen de un atardecer"

```
1. TÚ escribes en el chat
   └→ El navegador envía POST /api/chat
      Body: { messages: [{ role: "user", content: "Genera una imagen de un atardecer" }] }

2. MIDDLEWARE intercepta
   └→ Rate limit check (¿IP bloqueada? NO)
   └→ CSRF check (¿Origin válido? SÍ)
   └→ Security headers
   └→ CSP nonce

3. API ROUTE /api/chat recibe
   └→ getCurrentUser(request) → usuario logueado
   └→ Valida el body con Zod

4. packages/core/llm.ts procesa
   └→ resolveModel() → ¿Qué proveedor usar?
      └→ Si Ollama está corriendo → Ollama (gratis)
      └→ Si no → Google Gemini (gratis)
   └→ chatStream() envía el mensaje al modelo
   └→ La IA responde: "Voy a generar la imagen"
   └→ La IA llama a la tool: image({ prompt: "atardecer" })

5. packages/core/tools/image.ts ejecuta
   └→ const url = `https://image.pollinations.ai/prompt/atarreder`
   └→ Devuelve { url: "https://..." }

6. La IA recibe el resultado
   └→ Responde: "Aquí tienes tu imagen de atardecer"
   └→ El stream envía la respuesta al navegador

7. TÚ ves la imagen en pantalla
```

---

## 6. Comandos importantes

```bash
# ═══ ARRANCAR ═══
python start.py                    # Todo en un comando
python start.py --web              # Solo web
python start.py --hooks            # Solo webhooks
python start.py --gen-engine       # Solo gen-engine
python start.py --check-connections # Verificar todo
python start.py --clean            # Limpiar puertos ocupados
python start.py --deploy           # Build + instrucciones deploy

# ═══ DESARROLLO ═══
npm run dev                        # Dev server (Next.js)
npm run build                      # Production build
npm run lint                       # Verificar código
npm run typecheck                  # Verificar tipos
npm run test                       # Correr tests

# ═══ BASE DE DATOS ═══
npm run db:migrate                 # Crear/actualizar DB
npx prisma studio                  # Ver datos (GUI)
npx prisma generate                # Generar cliente Prisma

# ═══ LOOP PIVR ═══
python scripts/loop_piv.py --cycles 1    # Un ciclo
python scripts/loop_piv.py --plan-only   # Solo plan
python scripts/loop_piv.py --gate-only   # Solo gates
python scripts/loop_piv.py --triage      # Analizar estado
python scripts/loop_piv.py --doctor      # Verificar integridad

# ═══ GIT ═══
git status                         # Ver estado
git add <archivos>                 # Agregar archivos ESPECÍFICOS
git commit -m "feat(scope): desc"  # Commit
git log --oneline -10              # Últimos commits
```

---

## 7. Variables de entorno principales

```bash
# Base de datos
DATABASE_URL="file:./dev.db"

# Proveedor de IA (default: ollama)
ULTRAIA_PROVIDER="ollama"
ULTRAIA_MODEL="llama3.1"

# API Keys (todas opcionales)
OPENAI_API_KEY=""
GOOGLE_API_KEY=""
DEEPSEEK_API_KEY=""
DASHSCOPE_API_KEY=""
OPENROUTER_API_KEY=""
GROQ_API_KEY=""

# Seguridad
APP_URL="http://localhost:3000"
TRUST_PROXY=1

# Canales de publicación (todos opcionales)
TELEGRAM_BOT_TOKEN=""
YOUTUBE_ACCESS_TOKEN=""
TIKTOK_ACCESS_TOKEN=""
X_ACCESS_TOKEN=""
```

---

## 8. Problemas comunes

| Problema | Causa | Solución |
|----------|-------|----------|
| "Puerto 3000 en uso" | Otro programa lo usa | `python start.py --clean` |
| "No encuentra Python" | No está instalado | Instalar Python 3.10+ |
| "Database not found" | Primera vez | `npm run db:migrate` |
| "No funciona la IA" | Sin API key | Configurar `.env` o usar Ollama |
| "Build falla en Windows" | Poca memoria | Correr desde `apps/web/` con `--max-old-space-size=4096` |
| "Module not found" | Dependencies desactualizadas | `rm -rf node_modules && npm install` |
| "Type error" | Código con errores | `npm run typecheck` |
| "Tests fallan" | Caché stale | `rm -rf node_modules/.vite && npm run test` |

---

## 9. Resumen rápido

| Concepto | Dónde | Qué hace |
|----------|-------|----------|
| UI | `apps/web/` | Lo que el usuario ve |
| API | `apps/web/app/api/` | Backend (rutas) |
| Cerebro | `packages/core/src/ai/llm.ts` | IA y orquestación |
| Tools | `packages/core/src/tools/` | 87 herramientas |
| DB | `packages/core/prisma/` | Base de datos |
| Auth | `packages/core/src/auth/` | Login y seguridad |
| Seguridad | `apps/web/src/middleware.ts` | Rate limit, CSP, CSRF |
| Motor local | `packages/runtime/` | Offline |
| Scripts | `scripts/` | Automatización Python |
| Estado | `STATE.md` | Qué está hecho |

---

**Última actualización:** 2026-09-04

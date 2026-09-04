# Arquitectura — Cómo está organizado UltraIa

> **Versión del proyecto:** 1.0.0
> **Tipo:** Monorepo (varios proyectos en uno)
> **Stack principal:** Next.js + Prisma + TypeScript

---

## 1. ¿Qué es la arquitectura?

La arquitectura es como el **plano de una casa**: dice dónde va cada cuarto, cómo se conectan las habitaciones, y dónde están las tuberías.

En UltraIa, la arquitectura define:
- Dónde está el código de cada parte
- Cómo se comunican entre sí
- Qué hace cada carpeta

---

## 2. El mapa completo

```
UltraIa/                    ← Raíz del proyecto (aquí ejecutas todo)
│
├── apps/                   ← Las "aplicaciones" (lo que el usuario ve)
│   ├── web/                ← La página web (Next.js)
│   └── mobile/             ← La app de celular (React Native)
│
├── packages/               ← Las "librerías" (código que comparten apps)
│   ├── core/               ← El cerebro: IA, herramientas, base de datos
│   └── runtime/            ← Motor local para ejecutar cosas sin internet
│
├── scripts/                ← Scripts automáticos (Python)
├── Task/                   ← Tareas que corre el "cerebro" automáticamente
├── gen-engine/             ← Motor de generación de video/imagen
│
├── start.py                ← UN COMANDO para iniciar todo
├── package.json            ← Configuración del proyecto raíz
├── STATE.md                ← Estado actual (qué está hecho, qué falta)
├── AGENTS.md               ← Reglas para los agentes de IA
└── ULTRAIA-KNOWLEDGE/      ← Esta biblioteca (estás aquí)
```

---

## 3. Las 3 partes principales

### 3.1 `apps/web/` — La página web (lo que ves en el navegador)

**¿Qué es?** Es la interfaz visual. Cuando abres `http://localhost:3000`, ves esto.

**Qué hay aquí:**
```
apps/web/
├── app/                    ← Las páginas (App Router)
│   ├── layout.tsx          ← El "esqueleto" que envuelve todas las páginas
│   ├── page.tsx            ← La página de inicio (landing)
│   ├── (app)/              ← Páginas que requieren login
│   │   ├── dashboard/      ← Panel principal
│   │   ├── chat/           ← Chat con la IA
│   │   ├── studio/         ← Editor de contenido
│   │   ├── gallery/        ← Galería de creaciones
│   │   ├── cloud/          ← Tu nube de archivos
│   │   └── blog/           ← Blog público
│   └── api/                ← El "backend" (API routes)
│       ├── auth/           ← Login y registro
│       ├── chat/           ← Chat con la IA
│       ├── cloud/          ← Archivos en la nube
│       └── publications/   ← Cola de publicaciones
│
├── components/             ← Botones, paneles, cosas reutilizables
│   ├── ui/                 ← Botones, inputs, cards (UI kit)
│   ├── app-shell/          ← El menú lateral, navegación
│   └── aurora/             ← Efecto visual de fondo (Three.js)
│
├── src/
│   └── lib/server/         ← Funciones que solo corren en el servidor
│       ├── context.ts      ← "¿Quién está logueado?"
│       └── download-token.ts ← Tokens seguros para descargar archivos
│
├── globals.css             ← Estilos (Dark Obsidian theme)
├── next.config.ts          ← Configuración de Next.js
└── tsconfig.json           ← Configuración de TypeScript
```

**En palabras simples:** Es como una tienda online. Tiene páginas (productos), un carrito (API), y un almacén (base de datos).

---

### 3.2 `packages/core/` — El cerebro (la parte importante)

**¿Qué es?** Aquí vive TODO el poder del proyecto: la IA, las herramientas, la base de datos, la seguridad.

**Qué hay aquí:**
```
packages/core/
├── src/
│   ├── ai/
│   │   └── llm.ts          ← EL CEREBRO: conecta con OpenAI, Google, Ollama, etc.
│   │
│   ├── auth/
│   │   ├── session.ts      ← Cómo se guarda tu sesión (login)
│   │   └── password.ts     ← Cómo se cifran las contraseñas
│   │
│   ├── tools/              ← LAS HERRAMIENTAS (60+ capacidades)
│   │   ├── index.ts        ← Catálogo de todas las herramientas
│   │   ├── cloud.ts        ← Nube de archivos
│   │   ├── image.ts        ← Generar imágenes con IA
│   │   ├── video.ts        ← Generar videos
│   │   ├── music.ts        ← Componer música
│   │   ├── travel.ts       ← Videos de viajes
│   │   ├── diagram.ts      ← Diagramas
│   │   └── ...             ← 50+ herramientas más
│   │
│   ├── db/
│   │   ├── client.ts       ← Conexión a la base de datos
│   │   └── schema.prisma   ← Cómo se estructuran los datos
│   │
│   ├── prompt/             ← Cómo le hablamos a la IA
│   │   ├── director.ts     ← El "director" que decide qué hacer
│   │   └── languages.ts   ← Soporte para español/árabe
│   │
│   └── domain/             ← Lógica de negocio
│       ├── publications.ts ← Cola de publicaciones
│       └── briefs.ts       ← Ideas de contenido
│
├── prisma/
│   ├── schema.prisma       ← El "plano" de la base de datos
│   └── dev.db              ← La base de datos (SQLite)
│
├── package.json            ← Dependencias de core
└── tsconfig.json           ← Configuración TypeScript
```

**En palabras simples:** Es como el "cerebro" y los "brazos" de un robot. El cerebro (`llm.ts`) piensa, los brazos (`tools/`) ejecutan.

---

### 3.3 `packages/runtime/` — El motor local

**¿Qué es?** Permite que UltraIa funcione SIN internet, en tu computadora.

**Qué hay aquí:**
```
packages/runtime/
├── src/
│   ├── runtime.ts          ← El orquestador principal
│   ├── api/                ← Servidor web local (WebSocket + HTTP)
│   ├── adapters/           ← Conexiones a modelos locales (Ollama, etc.)
│   └── ...
```

**En palabras simples:** Es como tener un asistente offline que no necesita WiFi.

---

## 4. Cómo se conectan las partes

```
┌─────────────────────────────────────────────────────────┐
│                    USUARIO (tú)                         │
│                         │                               │
│                         ▼                               │
│              ┌─────────────────────┐                    │
│              │   apps/web (UI)     │                    │
│              │   Puerto 3000       │                    │
│              └──────────┬──────────┘                    │
│                         │                               │
│                         ▼                               │
│              ┌─────────────────────┐                    │
│              │   API Routes        │                    │
│              │   /api/auth/login   │                    │
│              │   /api/chat         │                    │
│              │   /api/cloud        │                    │
│              └──────────┬──────────┘                    │
│                         │                               │
│                         ▼                               │
│              ┌─────────────────────┐                    │
│              │   packages/core     │                    │
│              │   (IA + Tools + DB) │                    │
│              └──────────┬──────────┘                    │
│                         │                               │
│            ┌────────────┼────────────┐                  │
│            ▼            ▼            ▼                  │
│     ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│     │ OpenAI   │ │ Google   │ │ Ollama   │            │
│     │ (nube)   │ │ (nube)   │ │ (local)  │            │
│     └──────────┘ └──────────┘ └──────────┘            │
└─────────────────────────────────────────────────────────┘
```

---

## 5. Flujo de una petición

Cuando haces algo (ej: "genera una imagen"):

1. **Tú escribes** en el chat → `apps/web` recibe tu mensaje
2. **La API** lo envía a `packages/core` → `/api/chat`
3. **El cerebro** (`llm.ts`) decide qué herramienta usar
4. **La herramienta** (`image.ts`) ejecuta la acción
5. **El resultado** vuelve a `apps/web` → lo ves en pantalla

---

## 6. Comandos importantes

```bash
# Arrancar todo (web + base de datos)
python start.py

# Solo la web
python start.py --web

# Solo la nube
python start.py --hooks

# Verificar que todo funciona
python start.py --check-connections

# Desplegar a internet
python start.py --deploy
```

---

## 7. Problemas comunes

| Problema | Causa | Solución |
|----------|-------|----------|
| "Puerto 3000 en uso" | Otro programa lo usa | `python start.py --clean` |
| "No encuentra Python" | No está instalado | Instalar Python 3.10+ |
| "Base de datos no existe" | Primera vez | `npm run db:migrate` |
| "No funciona la IA" | Sin API key | Configurar `.env` |

---

## 8. Referencias

- [Next.js Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [TypeScript Docs](https://www.typescriptlang.org/docs)
- [Expo Docs](https://docs.expo.dev)

---

**Última actualización:** 2026-09-04

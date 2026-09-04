# Workspaces — El Monorepo completo

> **Tipo:** npm workspaces
> **Herramienta:** npm (viene con Node.js)
> **Versión Node.js requerida:** >= 20
> **Workspaces:** apps/* + packages/*

---

## 1. ¿Qué es un monorepo?

Imagina que tienes **4 proyectos**: una web, una app móvil, una librería compartida, y un motor offline.

**Sin monorepo:** Tendrías 4 carpetas separadas, cada una con su propio `node_modules` (gigante). Si cambias algo en la librería, tendrías que copiarlo a los otros 3 proyectos.

**Con monorepo:** Todo vive en UNA sola carpeta. Las partes comparten el mismo `node_modules`. Si cambias algo en la librería, todos se enteran automáticamente.

```
UltraIa/                    ← Un solo proyecto grande
├── apps/web/               ← Proyecto 1: la web
├── apps/mobile/            ← Proyecto 2: la app móvil
├── packages/core/          ← Proyecto 3: la librería compartida
└── packages/runtime/       ← Proyecto 4: el motor local
```

---

## 2. El root `package.json`

```json
{
  "name": "ultraia",
  "version": "1.5.0",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "next dev",
    "build": "prisma generate && next build",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio",
    "gate": "python scripts/loop_gate.py",
    "harness:test": "python scripts/harness_test.py",
    "cerebro": "node Task/cerebro.mjs",
    "repomix": "repomix --include \"packages/core/src,apps/web/src\""
  },
  "devDependencies": {
    "prisma": "^6.0.0",
    "repomix": "^1.18.0",
    "typescript": "^5.7.0"
  }
}
```

---

## 3. Los 4 workspaces

### 3.1 `apps/web` — La página web

```json
{
  "name": "@ultraia/web",
  "dependencies": {
    "next": "15.3.3",
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "three": "^0.170.0",
    "@types/three": "^0.170.0",
    "gsap": "^3.15.0",
    "lucide-react": "^0.400.0",
    "zod": "^3.22.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.0.0",
    "@ultraia/core": "*"
  },
  "devDependencies": {
    "@playwright/test": "^1.40.0",
    "tailwindcss": "^4.0.0",
    "postcss": "^8.4.0",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0"
  }
}
```

**Qué hace:** La interfaz visual. Next.js App Router, React, Tailwind, Three.js, GSAP.

**Cómo importa core:**
```json
// apps/web/tsconfig.json
{
  "paths": {
    "@/*": ["./src/*"],
    "@ultraia/core": ["../../packages/core/src/index.ts"],
    "@ultraia/cloud": ["../../packages/core/src/tools/cloud.ts"]
  }
}
```

---

### 3.2 `apps/mobile` — La app de celular

```json
{
  "name": "@ultraia/mobile",
  "dependencies": {
    "expo": "~57.0.0",
    "react-native": "0.86.0",
    "react": "19.2.3",
    "expo-router": "~4.0.0",
    "expo-secure-store": "~14.0.0"
  }
}
```

**Qué hace:** App móvil Android/iOS con Expo.

**NO importa core:** Metro (el bundler de React Native) no puede resolver `node:*` modules que usa core. En su lugar, replica los tipos de la API en `src/api/types.ts`.

---

### 3.3 `packages/core` — El cerebro

```json
{
  "name": "@ultraia/core",
  "type": "module",
  "main": "src/index.ts",
  "dependencies": {
    "@ai-sdk/google": "^1.0.0",
    "@ai-sdk/openai": "^1.0.0",
    "@google/stitch-sdk": "^0.1.0",
    "@prisma/client": "^6.0.0",
    "ai": "^4.0.0",
    "bcryptjs": "^2.4.3",
    "cheerio": "^1.0.0",
    "fast-xml-parser": "^4.0.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@vitest/coverage-v8": "^3.0.0",
    "vitest": "^3.0.0"
  }
}
```

**Qué hace:** IA, herramientas, base de datos, autenticación.

**Dependencias clave:**
- `ai` (Vercel AI SDK) — Framework para IA
- `@ai-sdk/google` — Proveedor Google Gemini
- `@ai-sdk/openai` — Proveedor OpenAI
- `@prisma/client` — ORM para base de datos
- `bcryptjs` — Cifrado de contraseñas
- `zod` — Validación de datos
- `cheerio` — Parsing HTML
- `fast-xml-parser` — Parsing XML/RSS

---

### 3.4 `packages/runtime` — Motor local

```json
{
  "name": "@ultraia/runtime",
  "type": "module",
  "main": "src/index.ts"
}
```

**Qué hace:** UltraIa offline. TypeScript puro, sin dependencias externas.

---

## 4. Cómo se conectan

```
┌─────────────────────────────────────────────────────┐
│           @ultraia/web (Next.js)                    │
│           "Necesito la IA y la DB"                  │
│                                                     │
│   import { prisma, tools } from '@ultraia/core'     │
└───────────────────┬─────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│           @ultraia/core (Librería)                  │
│           "Aquí tengo todo"                         │
│                                                     │
│   - 87 herramientas (tools/)                        │
│   - 11 proveedores IA (ai/llm.ts)                  │
│   - 17 modelos DB (prisma/)                         │
│   - Auth (auth/)                                    │
└───────────────────┬─────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│           @ultraia/runtime (Motor)                  │
│           "Ejecuto cosas offline"                   │
│                                                     │
│   - UltraRuntime (orquestador)                      │
│   - LocalApiServer (HTTP/WS)                        │
│   - Adapters a core                                 │
└─────────────────────────────────────────────────────┘
```

**Regla importante:** `web` importa `core` via tsconfig path alias. `mobile` NO puede importar `core` (Metro no resuelve `node:*`).

---

## 5. `node_modules` compartido

Cuando ejecutas `npm install` en la raíz:
1. npm crea UN solo `node_modules/` en la raíz
2. Crea symlinks (atajos) en cada workspace
3. Si `web` necesita `zod`, npm lo instala una sola vez
4. Si `core` también necesita `zod`, reutiliza el mismo

```
UltraIa/
├── node_modules/           ← UNO SOLO para todo
│   ├── zod/                ← Paquete real
│   ├── next/               ← Paquete real
│   └── ...
├── apps/web/
│   └── node_modules/       ← Symlinks (atajos)
│       ├── zod → ../../node_modules/zod
│       └── ...
└── packages/core/
    └── node_modules/       ← Symlinks (atajos)
        ├── zod → ../../node_modules/zod
        └── ...
```

---

## 6. TypeScript Configuration

### Root `tsconfig.base.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

### Web `tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "jsx": "preserve",
    "incremental": true,
    "noEmit": true,
    "paths": {
      "@/*": ["./src/*"],
      "@ultraia/core": ["../../packages/core/src/index.ts"],
      "@ultraia/cloud": ["../../packages/core/src/tools/cloud.ts"]
    },
    "plugins": [{ "name": "next" }],
    "allowJs": true,
    "isolatedModules": true
  }
}
```

### Core `tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "types": ["node"],
    "lib": ["ES2022"]
  }
}
```

---

## 7. Comandos por workspace

```bash
# ═══ RAÍZ ═══
npm install                        # Instalar todo
npm run dev                        # Dev server
npm run build                      # Production build
npm run test                       # Todos los tests
npm run typecheck                  # Verificar tipos
npm run lint                       # Verificar código

# ═══ UN WORKSPACE ═══
npm run dev --workspace=@ultraia/web
npm run test --workspace=@ultraia/core
npm install zod --workspace=packages/core

# ═══ VER WORKSPACES ═══
npm ls --workspaces --depth=0      # Listar workspaces
npm ls zod                         # Ver dónde está zod
```

---

## 8. React duplicado (intencional)

**Web usa:** React 19.2.3
**Mobile usa:** React 19.2.3

Esto es INTENCIONAL. Expo (React Native) necesita su propia versión de React. `expo-doctor` marca esta duplicación (20/21) pero es normal en monorepos con web + mobile.

---

## 9. Problemas comunes

| Problema | Causa | Solución |
|----------|-------|----------|
| "Cannot find module '@ultraia/core'" | No se instalaron dependencias | `npm install` en la raíz |
| "npm ERR! code ERESOLVE" | Conflicto de versiones | `npm install --legacy-peer-deps` |
| "workspace not found" | Nombre mal escrito | Verificar con `npm ls --workspaces` |
| "Metro can't resolve node:*" | Mobile importando core | NO importar core desde mobile |
| "Type error across workspaces" | Tipo mal definido | Verificar tsconfig de cada workspace |

---

## 10. Referencias

- [npm workspaces docs](https://docs.npmjs.com/cli/v7/using-npm/workspaces)
- [Monorepo best practices](https://github.com/nicolo-ribaudo/tc39-proposal-monorepo)
- [Next.js monorepo](https://nextjs.org/docs/app/building-your-application/optimizing/monorepos)

---

**Última actualización:** 2026-09-04

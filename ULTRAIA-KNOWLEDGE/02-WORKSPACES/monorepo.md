# Workspaces — El Monorepo (varios proyectos en uno)

> **Tipo:** npm workspaces
> **Herramienta:** npm (viene con Node.js)
> **Versión Node.js requerida:** >= 20

---

## 1. ¿Qué es un monorepo?

Imagina que tienes **3 proyectos**: una web, una app móvil, y una librería compartida.

**Sin monorepo:** Tendrías 3 carpetas separadas, cada una con su propio `node_modules` (gigante). Si cambias algo en la librería, tendrías que copiarlo a los otros 2 proyectos.

**Con monorepo:** Todo vive en UNA sola carpeta. Las partes comparten el mismo `node_modules`. Si cambias algo en la librería, todos se enteran automáticamente.

```
UltraIa/                    ← Un solo proyecto grande
├── apps/web/               ← Proyecto 1: la web
├── apps/mobile/            ← Proyecto 2: la app móvil
├── packages/core/          ← Proyecto 3: la librería compartida
└── packages/runtime/       ← Proyecto 4: el motor local
```

---

## 2. Cómo funciona

### El archivo `package.json` raíz

En la raíz del proyecto hay un `package.json` especial:

```json
{
  "name": "ultraia",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ]
}
```

**¿Qué significa?** Le dice a npm: "Hey, hay proyectos dentro de `apps/` y `packages/`. Tráctalos como uno solo."

### Cada workspace tiene su propio `package.json`

```json
// packages/core/package.json
{
  "name": "@ultraia/core",
  "version": "1.0.0",
  "dependencies": {
    "zod": "^3.22.0"
  }
}
```

```json
// apps/web/package.json
{
  "name": "@ultraia/web",
  "dependencies": {
    "@ultraia/core": "*"    ← "Quiero todo lo de core"
  }
}
```

---

## 3. Los workspaces de UltraIa

| Workspace | Nombre | Qué hace |
|-----------|--------|----------|
| `apps/web` | `@ultraia/web` | La página web (Next.js) |
| `apps/mobile` | `@ultraia/mobile` | La app de celular (React Native) |
| `packages/core` | `@ultraia/core` | El cerebro: IA, herramientas, DB |
| `packages/runtime` | `@ultraia/runtime` | Motor local offline |

---

## 4. Comandos importantes

```bash
# Instalar TODO (una sola vez)
npm install

# Agregar una dependencia a UN workspace
npm install zod --workspace=packages/core

# Correr un script en un workspace
npm run dev --workspace=@ultraia/web

# Correr tests en todos los workspaces
npm run test

# Ver qué workspaces existen
npm ls --workspaces --depth=0
```

---

## 5. Cómo se conectan

```
┌─────────────────────────────────────────┐
│           @ultraia/web (Next.js)        │
│           "Necesito la IA y la DB"      │
└───────────────────┬─────────────────────┘
                    │ import { prisma, tools }
                    ▼
┌─────────────────────────────────────────┐
│           @ultraia/core (Librería)      │
│           "Aquí tengo todo"             │
└───────────────────┬─────────────────────┘
                    │ import { UltraRuntime }
                    ▼
┌─────────────────────────────────────────┐
│           @ultraia/runtime (Motor)      │
│           "Ejecuto cosas offline"       │
└─────────────────────────────────────────┘
```

**En palabras simples:** `web` es la cara visible, `core` es el cerebro, `runtime` es el modo offline.

---

## 6. Problemas comunes

| Problema | Causa | Solución |
|----------|-------|----------|
| "Cannot find module '@ultraia/core'" | No se instalaron las dependencias | `npm install` en la raíz |
| "npm ERR! code ERESOLVE" | Conflicto de versiones | `npm install --legacy-peer-deps` |
| "workspace not found" | Nombre mal escrito | Verificar con `npm ls --workspaces` |

---

## 7. Referencias

- [npm workspaces docs](https://docs.npmjs.com/cli/v7/using-npm/workspaces)
- [Monorepo best practices](https://github.com/nicolo-ribaudo/tc39-proposal-monorepo)

---

**Última actualización:** 2026-09-04

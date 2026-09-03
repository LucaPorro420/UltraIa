# Guía de extensiones Chrome para desarrollo UltraIa

## Problema
Las extensiones de Chrome como **Plurality**, **DeepL**, **aiinhbfoop** y otras inyectan nodos en el DOM (scripts, iframes, styles, links) que:
- Causan errores de hidratación en React
- Inflan el DOM innecesariamente
- Interfieren con las herramientas de desarrollo

## Solución implementada
El proyecto incluye un script de limpieza automático en desarrollo (middleware de hidratación) que:
1. Elimina nodos inyectados por extensiones conocidas al cargar la página
2. Observa mutaciones del DOM y elimina nuevos nodos ajenos en tiempo real
3. Solo se ejecuta en `NODE_ENV === 'development'`

## Extensiones problemáticas conocidas

| Extensión | Qué inyecta | Selector bloqueado |
|-----------|-------------|-------------------|
| **Plurality** | Scripts, iframes, styles | `[class*="plurality"]` |
| **DeepL** | Scripts, iframes, tooltips | `[class*="deepl"]` |
| **aiinhbfoop** | Scripts de tracking | `#aiinhbfoop` |
| Genéricas | iframes de chrome-extension | `iframe[src*="chrome-extension"]` |
| Genéricas | Scripts de chrome-extension | `script[src*="chrome-extension"]` |
| Genéricas | Stylesheets de chrome-extension | `link[href*="chrome-extension"]` |

## Cómo deshabilitar Plurality
1. Click derecho en el icono de Plurality → **Manage extension**
2. Desactivar **"Allow in incognito"** y **"Allow access to file URLs"**
3. O desactivar completamente mientras desarrollas

## Cómo usar modo incógnito para desarrollo limpio
1. `Ctrl+Shift+N` (Windows/Linux) / `Cmd+Shift+N` (Mac)
2. En incógnito, las extensiones están deshabilitadas por defecto
3. Navega a `http://localhost:3000`

## Extensiones recomendadas para desarrollo UltraIa

| Extensión | Propósito |
|-----------|-----------|
| **React Developer Tools** | Inspeccionar componentes, props, state |
| **Redux DevTools** | Debug de estado global (si usas Redux/Zustand) |
| **Tailwind CSS IntelliSense** | Autocompletado de clases Tailwind |
| **ES7+ React/Redux/React-Native snippets** | Snippets de código |
| **Error Lens** | Ver errores TypeScript/ESLint inline |
| **GitLens** | Git blame, history inline |
| **Thunder Client** | Testing de APIs REST |

## Configuración recomendada VS Code
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

## Verificar que la limpieza funciona
1. Ejecuta `npm run dev`
2. Abre DevTools → Console
3. Deberías ver 0 errores de "Refused to execute script" por extensiones
4. Inspecciona Elements → no deberías ver iframes/scripts de extensiones fuera de `#__next`

## Desactivar limpieza (si interfiere)
En `apps/web/src/app/layout.tsx`, comenta la línea:
```tsx
{process.env.NODE_ENV === 'development' && setupDevCleanup()}
```
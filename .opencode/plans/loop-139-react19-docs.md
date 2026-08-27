# Plan — loop-122-react19-docs

## Contexto
El usuario pide: "actualiza react a 19 en todos los jsx js y ty, e demas archivos e doc que necesiten".
Auditoría completa del repo (excluye node_modules/vendor):

- `apps/web`: react 19.1.0 / react-dom 19.1.0 / @types/react ^19.1.0 → **YA React 19**
- `apps/mobile`: react 19.2.3 / react-dom 19.2.3 / @types/react ~19.2.2 → **YA React 19**
- `headroom/**`: react ^19.2.7 → **YA React 19**
- `vendor/G0DM0D3` (2 package.json): react ^18.2.0 → código de referencia de terceros (AGPL, sin .git).
  **NO se toca** (regla vendor/ de AGENTS.md).
- `Ebookweb.md` (doc plan del usuario, untracked): package.json de ejemplo con
  react ^18.3.1, react-dom ^18.3.1, @types/react ^18.3.10, @types/react-dom ^18.3.0,
  @react-three/fiber ^8.17.10, @react-three/drei ^9.114.0 → **REQUIERE React 19**.
- `apps/web/src/components/builder/codegen.ts` (línea 276): comentario de plantilla
  "// Requisitos: React 18+, ..." → **REQUIERE "React 19+"**.
- `Act-UltraIA/ebook.md` y `Act-UltraIA/ebookWeb.md`: sin pins de versión React 18
  (usan `ReactDOM.createRoot`, compatible con 19) → **NO requieren cambio**.

## Objetivo
Llevar a React 19 los únicos artefactos in-scope que aún referencian React 18
(doc `Ebookweb.md` + comentario de plantilla en `codegen.ts`), con versiones peer
compatibles, sin tocar vendor ni las apps ya en 19.

## ARCHIVOS A TOCAR
1. `Ebookweb.md` — bloque `frontend/package.json` (líneas ~50-68)
2. `apps/web/src/components/builder/codegen.ts` — línea 276 (comentario)

## NO-hacer
- No modificar `vendor/G0DM0D3` (React 18 de referencia de terceros).
- No cambiar las versiones de react en `apps/web`, `apps/mobile`, `headroom`
  (ya son 19; la dualidad 19.1.0/19.2.3 es intencional según AGENTS.md).
- No hacer `git add .` ni tocar archivos de la sesión concurrente #25
  (label.tsx, textarea.tsx, llm.ts, index.ts, marketing-header.tsx, etc.).
- No push / no merge.

## Criterios de verificación (scoped + FULL)
- `npm run typecheck` / `lint` / `test`: sin regresiones (cambios = doc + string literal).
- `npm run build`: se corre tras matar dev servers; el cambio no afecta el output de build.
- Commit con pathspec explícito de solo los 2 archivos: `git commit -m ... -- <files>`.

## Predicción
El repo ya corre en React 19; tras este parche los únicos refs React 18 in-scope
(desaparecen de Ebookweb.md y del comentario de codegen). Gates en verde.
Tolerancias: peer deps de R3F (fiber ^9 / drei ^10) son las versiones React-19-compatible
oficiales; no se instalan (es doc), solo se documentan correctamente.

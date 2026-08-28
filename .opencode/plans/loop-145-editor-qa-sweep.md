# Plan — loop-145: Editor Visual Part A — barrido QA headless (loop-120 diferido)

## Contexto
loop-120 ("Editor Visual no-code tipo WordPress/Figma") se cerro en iter-120 (commit 659a515)
con la Part B (capa de anotacion/edicion: Prisma PageAnnotation + dominio page-editor.ts +
API /api/editor/annotations + AnnotationLayer en (app)/layout.tsx + /editor admin + nav Editor).
La **Part A (barrido de errores QA real con navegador headless) quedo diferida** ("no bloquea").
Esta tarea implementa esa Part A: un driver headless que recorre las paginas publicas y las
redirecciones auth, recolecta console errors + failed requests por pagina, y corrige los
errores reproducibles encontrados.

Peticion original (loop-120): "Revisa e corrige los errores y dame un apartado para que pueda
modificar la pagina agregar nota e peticiones desde el navegador web como si fuera un wordpress,
figma u otro editor de ui/ux no code". El "apartado" (Part B) ya existe; este ciclo cubre el
"revisa e corrige los errores" (Part A) de forma automatica y reutilizable.

## Objetivo
- `scripts/editor-qa-sweep.mjs`: driver Playwright headless que barre las rutas publicas
  (`/`,`/login`,`/register`,`/blog`,`/explore`,`/recursos`,`/roadmap`) + verifica redireccion
  auth (`/dashboard`,`/gallery`,`/builder`,`/editor`,`/cloud`,`/lab` -> /login sin sesion) y
  recolecta: console errors, page errors (uncaught), y failed requests (requestfailed o
  response >=400). Escribe `resultTask/editor-qa/report.json` + resumen. Fail-soft si no hay
  navegador (mensaje + exit 0 con reporte vacio).
- Corregir los errores reproducibles que reporte el barrido (en nuestro codigo/app, no WIP ajeno).
- Re-ejecutar el barrido para confirmar reduccion de errores.

## Pasos
1. Crear `scripts/editor-qa-sweep.mjs` (Playwright headless, IPv4 127.0.0.1:3000, reporte JSON).
2. Correrlo contra el dev server activo en :3000 (o `npm run dev` limpio si hiciera falta).
3. Analizar reporte; FIX solo errores reproducibles en app/web (ej: 404 de assets, warnings
   de hidratacion, llamadas a APIs sin token que tiran en consola). Reportar lo que requiera
   decision humana (no lo arreglo speculative).
4. Re-correr barrido; confirmar mejora.
5. Gates FULL (typecheck/lint/test/build) — build mata dev server antes.

## ARCHIVOS A TOCAR
- `scripts/editor-qa-sweep.mjs` (nuevo)
- `resultTask/editor-qa/report.json` (generado, NO commiteado — esta en .gitignore? verificar)
- Archivos de app/web que se corrijan por errores reproducibles (por determinar tras el barrido)
- `.opencode/plans/loop-145-editor-qa-sweep.md` (este plan)

## NO-hacer
- No tocar WIP concurrente (prototypes/lab, recorder/automation, mobile creaciones, netwatch).
- No edicion visual de landing publica fuera del shell (roadmap v1.1).
- No push.

## Criterios
- `node scripts/editor-qa-sweep.mjs` corre y produce report.json con errores por pagina.
- Errores reproducibles encontrados en app/web se corrigen; barrido posterior muestra la baja.
- FULL gates GREEN (el script es Node, fuera del grafo npm; pero el fix de app/web requiere build).

## Prediccion
Barrido operativo y errores reproducibles corregidos; reporte como evidencia. Commit unico
`feat(editor): barrido QA headless (Part A de loop-120) + fixes`.

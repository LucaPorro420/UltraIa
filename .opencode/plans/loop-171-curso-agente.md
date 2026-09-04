# Plan — loop-171: App estudio offline (curso + guardados + agente IA local)

## Contexto
El usuario ORDENA construir ("Creame una app") sobre el plan loop-170, y AÑADE un requisito
nuevo fuera del 170: **agente de IA** que ayuda a buscar, enlazar, resumir, explicar y traducir.
Este plan delta cubre ese añadido + concreta el curso/guardados. Autorización de build: orden
directa del usuario (04/09/2026). Sin push sin aprobación (loop-constraints).

## Objetivo
`TECH-LIBRARY/index.html` pasa de biblioteca estática a **app de estudio offline** con 4 pilares:
Biblioteca (existente) + Curso + Guardados + Agente IA local. Cero deps, cero red, `file://`.

## SPEC
- **Curso**: `RUTA` 3 niveles (25 slugs verificados contra `TECH_MAP` de generate-unified.js).
  Tarjetas auto-generadas por reglas (heading→pregunta; bloque código→"¿Qué hace?").
  Sesión estudio (recall en textarea + revelar + Otra vez/Difícil/Bien/Fácil + Feynman que ante
  fallo crea ficha) y test sorpresa (MCQ 4 opciones auto-corregido "«título» pertenece a…").
  SM-2 simplificado cajas [0,1,3,7,16] en `tl_quiz`. Interleaving = round-robin por tech.
- **Guardados**: árbol carpetas profundidad ilimitada + fichas `{titulo OBLIGATORIO, origen,
  cita, nota}`; lista colapsada por título; guardar-sección desde cada sección tech;
  export/import `.json` (exportData extendido).
- **Agente local determinista** (NO LLM en MVP; offline real): intents por regex sobre texto
  sin acentos (ayuda/traduce/resume/explica/enlaza/buscar-default) + `mejorTema` por scoring
  título×3/tags×2/secciones×1 + resumen extractivo por frecuencia + glosario ES↔EN (~60 pares,
  con nota honesta de que no es MT completa) + `preguntarAgente(slug,si)` desde el material.
- **Launcher**: flag `--biblio` (rama temprana en `main()`, abre `file:///…/index.html` en
  WebView2/msedge `--app`; `--no-window` solo imprime URL; reutiliza `openWindow` fail-soft).

## ARCHIVOS A TOCAR (cerrado)
- `TECH-LIBRARY/index.html` (edit: CSS + estado + sidebar + render + curso + guardados + agente)
- `TECH-LIBRARY/INDEX.md` (edit: sección "Cómo estudiar")
- `desktopFase/launcher/launcher.mjs` (edit: flag `--biblio` ×2 hunks)
- `.opencode/plans/loop-170-biblioteca-offline.md` (existe, contexto)
- `.opencode/plans/loop-171-curso-agente.md` (este plan)

## NO-hacer
- NO `apps/web`, `packages/*`, `generate*.js`, `Completo/`, WIP ajeno (`DOCS_TODO.md`, `??`).
  NO `git add .`. NO push. NO `</script>` dentro de strings JS. NO fetch/LLM.

## Verificación
- Scoped: harness Node en `%TEMP%` con stubs DOM (parse `vm.Script` + asserts: deck≥100,
  SM-2, intents, glosario, carpetas/clips, import/export) + `node --check launcher.mjs`.
- FULL: `npm run typecheck → lint → test → build` en orden CI (cero `.ts` tocados: se espera
  GREEN idéntico a `eeea668`); matar dev servers antes de build; cuarentena WIP solo si un gate
  falla por ruido ajeno.
- Aceptación: doble-click `index.html` offline → curso 10 tarjetas, test 8, carpeta+ficha
  titulada, agente explica/resume/traduce, recarga persiste, export/import round-trip.

## Predicción
Gates GREEN; 1 commit `feat(biblio): …` con pathspec de los 5 archivos; artefacto usable sin
instalar nada. Fase 2 posible: extraer motor a `packages/core` con vitest + FSRS + Ollama
opcional fail-soft.

## Prioridad / Esfuerzo
P1 / S. Siguiente tras commit: reportar + pedir aprobación para push (NO pushear).

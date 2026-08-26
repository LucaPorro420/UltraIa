# Plan loop-118 - IDE V0.1 F3 (pulido gráfico) + F5 (responsividad)

> NOTA numeración: escrito como loop-112 (02:13) pero la sesión concurrente reclamó
> iter-112 (netwatch) a las 02:10 y planificó hasta loop-117 (genesis) - colisión
> resuelta por precedente 108/109: este ciclo se renumera a **iter-118**.

## Contexto
- Continuación directa ("Continua con la acción anterior"): el árbol tiene WIP sin commitear
  de la sesión previa que implementa exactamente lo documentado como pendiente en iter-108:
  "IDE V0.1: F1+F2+F4 DONE; restan F3 pulido gráfico + F5 responsividad".
- Pre-flight: kill switch NO activo (solo menciones en prosa, regla iter-68); sin lock ajeno;
  HEAD `fb0f836`; working tree = WIP propio (ide-shell.tsx + workspace-client.tsx) +
  DOCS_TODO.md (hooks post-commit) + untracked ajenos (InfoPeticion.txt, .ultraia/, planes).
- Concurrencia ACTIVA detectada en curso (sesión netwatch/genesis): no tocar sus archivos;
  commits con pathspec estricto; sus tests pasaron dentro de mis gates FULL.

## Objetivo
Cerrar F3+F5 del IDE V0.1: verificar/completar el WIP heredado, corregir defectos encontrados,
gates FULL en orden CI y commit pathspec.

## Alcance (ARCHIVOS A TOCAR)
1. `apps/web/src/components/ide/ide-shell.tsx` - F3: rail h-10/duration-200; feed vivo
   `DockActivity` (cola /api/publications → chips con dot de estado) en header del dock.
   **FIX obligatorio**: el WIP lee `data.publications` pero `listPublications` devuelve
   `{ items }` → el feed quedaría vacío. Corregir a `data.items`. Además actualizar el texto
   obsoleto del cuerpo del dock ("El feed llegará con F4" - ya existe).
2. `apps/web/src/app/(app)/workspace/workspace-client.tsx` - F3: focus-within glow en
   PaneFrame; F5: hook `useIsNarrow` (<768px) + layout apilado en columna con PaneFrame.
3. `DOCS_TODO.md` - hooks post-commit (se commitea tal cual).

## NO-hacer
- NO tocar WIP ajeno (netwatch*, genesis*, llm.ts, index.ts, .gitignore, LEARNINGS,
  loop_piv.py, scripts/genesis*).
- NO push (requiere aprobación humana).
- NO ampliar scope del IDE (F6+ no existe aún).

## Verificación (criterios FULL)
- typecheck 0 · lint 0 · test todo PASS · build exit 0 (~50 páginas).
- Pre-build: matar procesos `next dev` (taskkill /T /F) - lección smoke test.
- Commit SIEMPRE con pathspec explícito.

## Predicción
Gates verdes salvo ruido de concurrencia; build mantiene ~50 páginas.
Riesgos reales encontrados en ejecución: flake audiolibrary (timeout 15s vs 3 spawns
reales) y `.next` corrupto recurrente (#25) - ambos con mitigación conocida.

## Recursos/presupuesto
1 ciclo PIVR; gates ~15 min (build lento en esta máquina); esfuerzo S.

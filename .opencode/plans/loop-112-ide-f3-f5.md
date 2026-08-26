# Plan loop-112 — IDE V0.1 F3 (pulido gráfico) + F5 (responsividad)

## Contexto
- Continuación directa ("Continua con la acción anterior"): el árbol tiene WIP sin commitear
  de la sesión previa que implementa exactamente lo documentado como pendiente en iter-108:
  "IDE V0.1: F1+F2+F4 DONE; restan F3 pulido gráfico + F5 responsividad".
- Pre-flight: kill switch NO activo (solo menciones en prosa, regla iter-68); sin lock ajeno;
  HEAD `fb0f836`; working tree = WIP propio (ide-shell.tsx + workspace-client.tsx) +
  DOCS_TODO.md (hooks post-commit) + untracked ajenos (InfoPeticion.txt, .ultraia/, plan 108).

## Objetivo
Cerrar F3+F5 del IDE V0.1: verificar/completar el WIP, corregir defectos encontrados,
gates FULL en orden CI y commit pathspec.

## Alcance (ARCHIVOS A TOCAR)
1. `apps/web/src/components/ide/ide-shell.tsx` — F3: rail h-10/duration-200; feed vivo
   `DockActivity` (cola /api/publications → chips con dot de estado) en header del dock.
   **FIX obligatorio**: el WIP lee `data.publications` pero `listPublications` devuelve
   `{ items }` → el feed quedaría vacío. Corregir a `data.items`. Además actualizar el texto
   obsoleto del cuerpo del dock ("El feed llegará con F4" — ya existe).
2. `apps/web/src/app/(app)/workspace/workspace-client.tsx` — F3: focus-within glow en
   PaneFrame; F5: hook `useIsNarrow` (<768px) + layout apilado en columna con PaneFrame.
3. `DOCS_TODO.md` — hooks post-commit (se commitea tal cual).

## NO-hacer
- NO tocar InfoPeticion.txt / .ultraia/ / plan files ajenos (loop-108-mobile-creaciones.md).
- NO push (requiere aprobación humana).
- NO ampliar scope del IDE (F6+ no existe aún).

## Verificación (criterios FULL)
- typecheck 0 · lint 0 · test todo PASS · build exit 0 (~44 páginas).
- Pre-build: matar procesos `next dev` (taskkill /T /F) — lección smoke test.
- Commit SIEMPRE con pathspec explícito.

## Predicción
Gates verdes al primer intento salvo ruido de concurrencia; build mantiene ~44 páginas.
Riesgo bajo: cambios solo client-side en apps/web, cero core/runtime.

## Recursos/presupuesto
1 ciclo PIVR; gates ~6-8 min; esfuerzo S.

# Plan loop-119 - Release v1.0.0 (aprobacion usuario: push + iniciar version 1.0)

## Contexto
- Usuario aprueba EXPLICITAMENTE: push a origin + iniciar la linea v1.0 del proyecto.
- Recon: root/core/runtime/web @0.1.0; mobile YA @1.0.0 (package.json + app.json); sin
  CHANGELOG.md raiz ni VERSION; 5 badges "v0.1" hardcodeados en UI (page.tsx,
  landing-hero.tsx, ide-shell.tsx x3).
- Concurrencia: sesion netwatch/genesis commiteo su genesis (81b74c0, loop-117); su WIP
  netwatch sigue sucio en el arbol - NO tocar, NO arrastrar (pathspec estricto).

## Objetivo
Establecer la linea v1.0: bump de manifests, CHANGELOG con contrato de estabilidad,
badges UI actualizados, gates FULL, tag anotado v1.0.0 y push aprobado.

## Alcance (ARCHIVOS A TOCAR)
1. `package.json` (root ultraia) 0.1.0 -> 1.0.0
2. `packages/core/package.json` 0.1.0 -> 1.0.0
3. `packages/runtime/package.json` 0.1.0 -> 1.0.0
4. `apps/web/package.json` 0.1.0 -> 1.0.0
5. `apps/web/src/app/page.tsx` footer v0.1 -> v1.0
6. `apps/web/src/components/landing/landing-hero.tsx` badge v0.1 -> v1.0
7. `apps/web/src/components/ide/ide-shell.tsx` 3 badges v0.1 -> v1.0
8. `CHANGELOG.md` NUEVO (Keep-a-Changelog): entrada 1.0.0 con resumen por area +
   contrato de estabilidad de la linea 1.x
9. `package-lock.json` regenerado SOLO metadata (`npm install --package-lock-only`)
   para que el lock refleje las versiones nuevas

## NO-hacer
- NO tocar WIP ajeno (llm.ts, index.ts, loop_piv.py, netwatch*, .gitignore, LEARNINGS).
- NO crear GitHub Release (sin gh auth verificado; tag basta).
- NO renumerar/backlog: fila 119 sola al final.

## Verificacion (criterios FULL)
- typecheck 0 / lint 0 / test todo PASS / build exit 0 (~50 paginas).
- Pre-build: verificar sin dev servers (verificado: ninguno).
- Diff del lock limitado a campos de version (verificar con git diff --stat).
- Tag anotado v1.0.0 sobre el commit de release; push branch + tag juntos.

## Prediccion
Gates verdes (cambios = strings de version + markdown); build mantiene ~50 paginas;
push limpia la divergencia de 13+ commits (incluye genesis de la sesion concurrente,
ya commiteado y verde). Riesgo: carrera del lock si la sesion concurrente instala deps -
mitigado verificando diff del lock antes de stagear.

## Recursos/presupuesto
1 ciclo PIVR; gates ~15 min; esfuerzo S.

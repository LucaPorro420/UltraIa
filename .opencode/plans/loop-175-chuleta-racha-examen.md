# Plan — loop-175: Chuleta + racha + examen cronometrado

## Contexto
"Mejoras e información": el material del usuario pedía comandos esenciales, tests y
cuestionarios. Faltaban en la app: (1) los **comandos esenciales** como información estudiable,
(2) **racha** visible (motivación), (3) **examen cronometrado** (evaluación real).

## SPEC
1. **`COMANDOS[]` (12, del material del usuario + AGENTS.md)**: grupos Setup (db:migrate,
   db:generate), Desarrollo (dev, mobile), Calidad (typecheck, lint, test, build, gate),
   Automatización (start.py, cerebro, repomix). Vista **⌨️ Chuleta** (tecla 6): tarjetas por
   grupo con [Copiar] (clipboard + fallback) y [Estudiar] → 12 flashcards (ida y vuelta:
   `¿Qué hace X?` + `¿Qué comando hace Y?`, SM-2 reutilizado).
2. **Racha**: `tl_racha {dias[]}` + `registrarEstudio()` al cerrar sesión/test/examen +
   `rachaDias()` (consecutivos hasta hoy/ayer) + `ultimoEstudio()` en stats.
3. **Examen**: 10 MCQ, 5:00 con barra + `mm:ss` (rojo <60s), entrega manual o auto al
   expirar; mejor marca en `tl_examen`; todo suma a SM-2 y racha. Timer con `setInterval`
   guardado en sesión y limpiado al salir/cambiar (sin fugas).
4. **Agente**: intent `comando|npm run|...` → top 5 comandos + chip ⌨️.

## ARCHIVOS A TOCAR
- `TECH-LIBRARY/index.html` (~14 hunks pequeños)
- `.opencode/plans/loop-175-chuleta-racha-examen.md` (este plan)

## NO-hacer
- NO tocar DATA embebido, `apps/web`, `packages/*`, WIP ajeno. NO `git add .`. NO push.
- Sin deps, sin red, sin `</script>` en strings.

## Verificación
- Scoped: smoke (COMANDOS≥10, estudiarComandos→sesión, copiar, racha≥1, examen 10 +
  acierto + fin + mejor marca, chuleta render, agente comando, tab chuleta render).
- FULL: typecheck → lint → test → build (árbol quieto; matar `next dev` por regla).
- Aceptación: chuleta copiable/estudiable; racha sube al estudiar; examen 5:00 evaluable.

## Predicción
Smoke 70+/70+; gates GREEN; 1 commit `feat(biblio)` pathspec 2 archivos.

## Prioridad / Esfuerzo
P1 / S.

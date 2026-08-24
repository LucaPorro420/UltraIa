# Plan — iter-98: Cierre de cola (higiene post r94-retoma + trabajo verificado sin commitear)

## Contexto (Sensado)
- Pedido usuario: "Continua con las implementaciones de mejoras en los piv y doctor state e
  loop triage que quedo pendiente. En caso de que no continua con lo que haya quedado en cola."
- Verificado: NO queda nada pendiente del área state-doctor/loop-triage/piv-plan/piv-build
  (fila 68 DONE 854095e; única mención en STATE/run-log; skills espejos sync). → Se ejecuta
  la cola.
- Lock previo `r94-retoma-20260824` dormido ~9h (heartbeat 09:17Z vs 15:32Z) → RETOMADO como
  `r98-UTEC-5695-20260824-PIVB` (precedentes iter-77/80/91: >30min = muerta).
- Kill switch: NO activo (solo prosa histórica negada).
- Árbol: trabajo REAL sin commitear de sesiones cerradas:
  1. **iter-92-inicio-ram-baja** (sesión #92, 22/08): `start.py` gana `--lite [--ram-mb N]`
     (`apply_lite_env` + `print_lite_tips` + `cmd_full(lite)`), `scripts/iniciar-local.ps1`,
     `docs/INICIO-LOCAL-Y-NUBE.md`, cross-ref en `docs/DESPLIEGUE-GRATUITO.md`. El run-log
     solo registra `[P]` — nunca hubo [I]/[V]/[R] ni commit.
  2. **Fixes motor evolutivo** (post-6f987c3): `evo.ts` `z.inference`→`z.infer`;
     `physics2d.ts` `verletImplicitVelocity` fallback px/py nulos.
  3. **Bitácora iter-97** sin commitear: STATE.md fila 97 DONE + entradas [I]/[V]/[R]
     en run-log (drift check-12).
  4. **AGENT.md**: paste del usuario 21/08 (~1800 líneas: skill completa "Genesis Autonomous
     Software Engineering" — fuente original ya porteada como capability `genesis` iter-83/84/85).
     Reemplaza el placeholder del master prompt. Acción: preservar byte-exact en
     `learning/sources/genesis-skill-full.md` + restaurar AGENT.md desde HEAD (el master prompt
     vuelve a su estado canónico; contenido preservado y documentado).
  5. Ruido generado NO commitear: `resultTask/qdrant/memory-sync.json` (+56k líneas regenerado),
     `resultTask/procedural/*`, `DOCS_TODO.md` (hook), diffs vacíos por CRLF en wiring tests.

## Objetivo
Cerrar la cola de trabajo verificado-sin-commitear en commits pathspec atómicos, dejando el
árbol limpio para el siguiente ciclo (iter-99 = completar capability `recordly`: tests + wiring).

## Pasos
1. [V] Verificación pre-commit del árbol actual:
   - `tsc --noEmit -p packages/core` EXIT 0 (incluye fixes evo/physics2d).
   - vitest scoped: physics2d + evo + cadgeo + evolution + sus wiring tests → PASS.
   - Gates Python start.py: `py -3.12 -m py_compile`, `-m ruff check`, `-m pyflakes` +
     smoke `--help` y presencia del flag `--lite`.
2. [I] Preservación Genesis: copiar el bloque pegado de AGENT.md (byte-exact) a
   `learning/sources/genesis-skill-full.md` + restaurar AGENT.md desde HEAD.
3. Commits pathspec (uno por lógica):
   - C1 `feat(scripts): modo lite para PCs <8GB RAM` — start.py + iniciar-local.ps1 +
     INICIO-LOCAL-Y-NUBE.md + DESPLIEGUE-GRATUITO.md + plan loop-92-inicio-ram-baja.md.
   - C2 `fix(core): fixes motor evolutivo + cierre bitácora iter-97` — evo.ts + physics2d.ts +
     STATE.md + loop-run-log.md + genesis-skill-full.md + restauración AGENT.md +
     plan loop-98.
4. [V] Gates FULL en orden CI tras los commits: typecheck → lint → test → build
   (matar dev servers antes del build).
5. [R] Bitácora: fila 98 en STATE.md + entrada [P]/[I]/[V]/[R] en run-log + JSON presupuesto.

## NO-hacer
- NO tocar: resultTask/* generados, DOCS_TODO.md (hook), SACD-P*/pdf//planificacionImplementar/
  RoadMapLearning (datos del usuario), recordly.ts (es de iter-99), browser-e2e.mjs (su propio
  ciclo), plans ajenos (loop-94-perf-studio, loop-95-browser-e2e).
- Sin push (regla: aprobación humana).
- Nunca `git add .` — staging explícito siempre.

## Criterios
- scoped: tsc core 0 + suites motor evolutivo verdes + Python gates 0 + `--help` muestra --lite.
- FULL: typecheck/lint/test/build EXIT 0.
- PREDICCIÓN: 2 commits pathspec; test total ~1452+93=1545 aprox (baseline post-iter-97);
  build ~45 páginas. Sin cambios de comportamiento en runtime salvo fix null-safe de
  verletImplicitVelocity (px/py opcionales ahora tolerados).

## TOLERANCIAS / RIESGOS
- Si `--lite` falla el smoke → máx 3 fixes, sino escalar High Priority.
- AGENT.md restaurado: contenido del paste PRESERVADO en learning/sources/genesis-skill-full.md;
  reversible con un copy-paste si el usuario lo quería ahí (documentado en el reporte final).
- .next puede estar corrupto por raza histórica → limpiar solo si el build falla por chunks.

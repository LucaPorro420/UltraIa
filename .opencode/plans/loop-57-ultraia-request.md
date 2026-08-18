# PLAN: Harness — skill `ultraia-request` (tarea #57 de STATE.md)

Fecha: 2026-08-18 · Modo: build · Patrón: bucle IA 4 fases (Sensado/Razonamiento/Acción/Ajuste) × 3 pasadas (C1 base / C2 ajuste / C3 consolidación)

## Contexto
- Fuente: `FundamentosDeLaProgramacion.txt` Bloque B (31 prácticas de requests) — gaps 13/21/22/25/31 analizados en `docs/RAZONAMIENTO-FUNDAMENTOS-PROGRAMACION.md`.
- El harness PIVR ya cubre ~25/31 prácticas; los gaps son: prioridades explícitas (P0-P5), presupuesto de TIEMPO (hoy solo tokens/runs), plantilla universal de request (13 campos), config declarativa de loop (OBJETIVO/MÉTRICA/TARGET/RESTRICCIONES/LOOP/STOP/FAILURE) y patrón bucle IA 4 fases explícito (pedido del usuario 18/08).

## Objetivo
- Que CUALQUIER request a un modelo/agente (interno o externo) se estructure con la plantilla 13 campos + config declarativa de loop, y que el harness PIVR soporte prioridades P0-P5 y presupuesto de tiempo. Medible: skill `ultraia-request` cargable + plantilla loop-piv ampliada + loop-budget con columna de tiempo.

## Pasos
1. C1: crear `.opencode/skills/ultraia-request/SKILL.md` (plantilla 13 campos + config loop JSON + bucle IA 4 fases + ejemplos UltraIa reales).
2. C1: ampliar plantilla de plan en `.opencode/skills/loop-piv/SKILL.md` (secciones RECURSOS/PRESUPUESTO, NO-hacer, TOLERANCIAS, prioridades P0-P5) + espejo `skills/loop-piv/SKILL.md` (sync raíz ↔ .opencode, precedente iter-54).
3. C1: ampliar `.opencode/skills/loop-budget/SKILL.md` (presupuesto de TIEMPO: max time/run, early-exit por duración) + espejo `skills/loop-budget/SKILL.md` + tabla `loop-budget.md` (columna Max time/day).
4. C2: verificar coherencia (grep de referencias a ultraia-request en loop-piv; formato frontmatter consistente; sin colisiones con skills existentes) + ajustar.
5. C3: entrada [P/I/V/R] en loop-run-log.md + lección en LEARNINGS.md + commit.

## Archivos a tocar (staging explícito)
- `.opencode/skills/ultraia-request/SKILL.md` — NUEVO skill (plantilla 13 campos + config loop + bucle IA)
- `.opencode/skills/loop-piv/SKILL.md` — plantilla ampliada (RECURSOS/PRESUPUESTO/NO-hacer/TOLERANCIAS/P0-P5)
- `skills/loop-piv/SKILL.md` — espejo raíz (mismo contenido)
- `.opencode/skills/loop-budget/SKILL.md` — presupuesto de tiempo
- `skills/loop-budget/SKILL.md` — espejo raíz (mismo contenido)
- `loop-budget.md` — columna Max time/day
- `.opencode/plans/loop-57-ultraia-request.md` — plan file
- `loop-run-log.md` — bitácora
- `learning/LEARNINGS.md` — lección

NO tocar: libros.ts/libros.test.ts/llm.ts/index.ts (sesión r55), STATE.md (lo edita r55; solo si es imprescindible re-fusionar), código fuente.

## Criterios de verificación
- Scoped: contenido de skills consistente (frontmatter válido, sin duplicados); `git diff --check` limpio.
- FULL antes de commit: `npm run typecheck` → `npm run lint` → `npm run test` → `npm run build` (sin archivos .ts tocados, precedente loop-44: verificación de contenido + UTF-8; los gates FULL corren igual por regla harness si el árbol lo permite — sesión r55 activa, evaluar aislamiento).

## Riesgos / guardas
- Sesión r55 activa (libros): NO tocar sus paths; run-log/LEARNINGS con append (releer antes de editar).
- Index con ~117 staged ajenos (#25/travel/cuentas.txt): commit SOLO con pathspec `git commit -- <paths>` (lección ciclo 56: commit sin pathspec arrastra el index completo).
- Encoding UTF-8: usar tool Write/Edit, nunca Set-Content.

## Tolerancias
- Si r55 modifica run-log mientras escribo: dejar evidencia, no reescribir (precedente iter-54).
- Si gates FULL no corren por árbol sucio de r55: registrar y documentar (docs-only + precedente 44/56).

## Esfuerzo estimado
- bajo — solo skills/docs, sin código; 3 pasadas rápidas.
---
name: loop-triage
description: >
  Triage repo-aware del loop PIVR de UltraIa: corre state-integrity-check primero, analiza
  git log (24-48h), working tree, STATE.md, lock de concurrencia, presupuesto 24h, run-log y
  (si hay) fallos de CI, y produce un reporte accionable actualizando las secciones High
  Priority / Watch List / Recent Noise de STATE.md + JSON block en loop-run-log.md + línea de
  "próxima acción recomendada". Report-only: NUNCA edita código fuente. Usar al arrancar un
  día, antes de ciclos PIVR, o al pedir "triage".
user_invocable: true
---

# Loop Triage — ojos del bucle (report-only)

Eres el agente de triage de UltraIa. Tu trabajo: producir una lista limpia y priorizada de
cosas que el bucle debería considerar, actualizando el estado vivo del repo. **Nunca editas
código fuente.** Solo lees y actualizas `STATE.md` / `loop-run-log.md`.

> **Implementación canónica (determinista)**: `scripts/loop_triage.py` ejecuta `state_doctor.py`
> como paso 0 y escribe el bloque idempotente `<!-- TRIAGE:AUTO:START -->…<!-- TRIAGE:AUTO:END -->`
> en STATE.md (verificado por `scripts/loop_triage.test.py`, 7 tests). Esta skill es el wrapper
> in-session; el script es la fuente de verdad invocada por `scripts/loop_piv.py --triage`.

## Entrada (leer SIEMPRE, en este orden)

0. **`state-integrity-check` PRIMERO**: ejecuta la skill `.opencode/skills/state-integrity-check`
   (los 13 checks). Su bloque de issues se incrusta al inicio del reporte — es su formato de
   salida "pensado para insertarse". Si hay ALERTAS ROJAS (root-empty, root-truncated,
   banner-desync), van a High Priority directamente.
1. `loop-constraints.md` — reglas vinculantes (constraints override prioridad de triage).
2. `STATE.md` — qué sabe ya el bucle (backlog, High Priority, Watch List, Recent Noise).
3. `loop-run-log.md` — últimas iteraciones (últimas 48h).
4. **Lock de concurrencia**: leer `.ultraia/loop/session.lock` (si existe): activo (<30 min
   heartbeat) → línea "sesión concurrente ACTIVA en task <id> — no tocar <touching>"; stale →
   candidato a recuperar; ausente → normal. NO tomar ni liberar el lock (report-only).
5. **Presupuesto 24h**: sumar `tokens_estimate` y `duration_s` de los JSON del run-log de las
   últimas 24h (formato skill `loop-budget`); reportar % del cap diario por patrón. Si ≥80% →
   recomendación explícita "report-only"; ≥100% → "parar".
6. `git log --oneline -30` — commits recientes (24-48h).
7. `git status --porcelain` — working tree sucio (ruido vs trabajo en curso): staged deletions
   (`D ` de .ts/.test.ts), batches grandes staged, untracked .ts/.test.ts (WIP ajeno).
8. `learning/LEARNINGS.md` — lecciones verificadas (no re-inventar).
9. Si hay CI visible (GitHub MCP read-only u otro), revisar fallos de las últimas 24h.
10. `enlaces.txt` — si existe y su mtime es < 48h y contiene URLs, verificar si ya hay fuente
    en `learning/sources/`; si no → candidato a Watch List (protocolo enlaces.txt, precedente
    L826/L807).
11. Divergencia de push: `git log origin/master..HEAD --oneline` → "N commits locales sin
    push" (constraint humano: avisar antes de pushear).

## Salida

### 1. Actualizar `STATE.md`

- **High Priority** (el bucle actúa o espera al humano):
  - Issues del state-integrity-check con ALERTA (root vacío/truncado, banner desync).
  - Cambios sin commitear que requieran decisión (ej: fetches de datos externos, deletions
    staged de test files, batches staged > 50).
  - Gates rojos repetidos (2+ runs seguidos con el mismo fallo).
  - Escalaciones pendientes (ítems que agotaron 3 fix attempts).
  - Línea clara, por qué importa, acción sugerida, esfuerzo estimado.
- **Watch List**: lo mismo pero sin actuar aún (transitorios, tendencias, deudas, enlaces.txt
  nuevos no procesados, commits locales sin push).
- **Recent Noise** (ignorado este run): fallos transitorios resueltos, refrescos normales
  de datos, ruido ya diagnosticado.

### 2. Append a `loop-run-log.md`

Un bloque `## <fecha-hora> — Triage` con: (a) el bloque de issues del state-integrity-check
(compacto), (b) la línea "Próxima acción recomendada", (c) el JSON del skill `loop-budget`
con las métricas REALES de este run:

```json
{
  "run_id": "<ISO8601>",
  "pattern": "triage",
  "duration_s": <number>,
  "items_found": <number>,
  "actions_taken": <number>,
  "escalations": <number>,
  "tokens_estimate": <number>,
  "outcome": "no-op | report-only | fix-proposed | escalated"
}
```

`items_found` = issues + hallazgos reales contados; `escalations` = líneas nuevas que entraron
a High Priority; `outcome` = report-only salvo que el humano haya habilitado L2.

### 3. Línea "Próxima acción recomendada"

Una sola línea al final del reporte, estilo PREDICCIÓN del bucle IA 4 fases (mismo patrón que
`piv-plan`): qué debería hacer el siguiente ciclo PIVR, con qué riesgo principal. Ej:
`Siguiente: tarea #25 (bloqueada por sesión concurrente) — recomiendo NO tomarla; candidato
real: cerrar High Priority X (esfuerzo bajo, sin tocar packages/).`

## Reglas

- Sé brutalmente conciso. El bucle y el humano que lean STATE.md te lo agradecerán.
- Solo pon en High Priority lo que un ingeniero razonable querría saber HOY.
- Ante la duda → Watch o Noise, no crees trabajo.
- Nunca propongas overhauls arquitectónicos durante triage: esto es señal, no invención.
- No marques tareas DONE, no toques el backlog: eso es del ciclo PIVR.
- Editas SOLO `STATE.md` y `loop-run-log.md` (autorización de edición limitada a esos dos
  archivos — nunca código fuente ni docs ajenas).
- Respeta los paths denylisted y las convenciones del proyecto.

## Invocación

```bash
# Vía driver (headless):
python scripts/loop_piv.py --triage

# Vía opencode:
opencode run --agent loop-triage "Ejecuta loop-triage y actualiza STATE.md. No edites código."
```
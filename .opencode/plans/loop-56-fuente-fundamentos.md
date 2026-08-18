# PLAN: Fuente FundamentosDeLaProgramacion — protocolo enlaces.txt (tarea #56 de STATE.md)

Fecha: 2026-08-18 · Modo: build · Ciclo: 56 (C1 base / C2 ajuste / C3 consolidación)
NOTA: numeración 56-62 porque la sesión concurrente r55-OVERRIDE tomó el id 55 (libros-programacion, lock activo). No tocar sus archivos (libros.ts, libros.test.ts, llm.ts, index.ts hasta liberación).

## Contexto
- `FundamentosDeLaProgramcon.txt` (raíz, 3504 líneas) = transcript ChatGPT con 2 bloques:
  A) guía Replica Engine (37 secciones: SDF/ray marching, shaders, optical flow, métricas PSNR/SSIM/VMAF, análisis-por-síntesis);
  B) 31 prácticas para requests/loops eficientes (plantilla 13 campos, máquina de estados, presupuestos, tolerancias).
- Protocolo enlaces.txt: fuente → learning/sources/ + análisis → docs/RAZONAMIENTO-<SLUG>.md + implementar accionable como PIVR + lecciones.

## Objetivo (medible)
- `learning/sources/fundamentos-programacion.md` (fuente fiel resumida) + `docs/RAZONAMIENTO-FUNDAMENTOS-PROGRAMACION.md` (mapeo implementado/parcial/pendiente contra el código real) + fix desync STATE.md (banner obsoleto, IDs duplicados, filas huérfanas) + filas backlog 56-62 + lección en LEARNINGS.md.

## Pasos (3 pasadas)
C1 — base: escribir fuentes + RAZONAMIENTO v1 + [P] en run-log.
C2 — ajuste: verificar claims contra código real (grep exports generative/codevfx/omag/video-edit), refinar mapeo.
C3 — consolidación: fix STATE.md desync (banner, duplicados #16/#17/#36/#41, huérfanas 19/20/45-52, líneas `�`) + filas backlog 56-62 + lección LEARNINGS.md + commits.

## Archivos a tocar (staging explícito)
- `learning/sources/fundamentos-programacion.md` — fuente resumida fiel
- `docs/RAZONAMIENTO-FUNDAMENTOS-PROGRAMACION.md` — análisis + mapeo
- `STATE.md` — fix desync + filas 56-62 (fusionar con sesión libros)
- `loop-run-log.md` — bitácora [P]/[I]/[V]/[R] (fusionar)
- `learning/LEARNINGS.md` — lección C3
- `.opencode/plans/loop-56-fuente-fundamentos.md` — este plan

NO tocar: libros.ts/libros.test.ts/llm.ts/index.ts (sesión r55), .env*, auth/, cuentas.txt.

## Criterios de verificación
- Docs-only (sin .ts tocados): UTF-8 verificado, contenido verificado contra código (grep), precedente loop-44.
- C2: verificación claims con grep real.
- C3: state-integrity-check sin errores nuevos + filas 56-62 pendientes.

## Riesgos / guardas
- Sesión r55 activa: fusionar STATE.md/run-log releyendo antes de editar; nunca sobrescribir sus secciones.
- PowerShell 5.1: usar tool Write/Edit, nunca Set-Content para UTF-8.
- No commitear cuentas.txt ni travel media ni WIP #25 (staging explícito por pathspec).

## Esfuerzo estimado
- bajo (docs-only, 3 pasadas)
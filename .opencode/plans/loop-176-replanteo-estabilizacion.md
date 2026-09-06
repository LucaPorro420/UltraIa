# PLAN: Replanteo total UltraIa + estabilización localhost/web + inventario open-source (tarea #176, prioridad P0)

Fecha: 2026-09-06 · Modo: P-P (architectural, brainstorming previo) · Patrón: Sensado→Razonamiento→Acción→Ajuste · Presupuesto: ~2h / 1 ciclo

## Contexto
- Pedido usuario 06/09/2026: "Replantea el proyecto en un md nuevo con todo lo necesario especificadamente. busca todos los recursos opensource e implementalos en el proyecto e ayuda en su mejora total."
- Aclaraciones respondidas: alcance = "riesgos necesarios sin romper nada + automatización + solucionar localhost/web que se rompe"; objetivo #1 = **producto comercial ya**; restricción = **$0 keyless-first**.
- Estado del árbol: 15 archivos M (batch local coherente LAN/extension) + ~9 untracked, SIN lock activo, última iteración 175 DONE (website-clone, 2683/2683 + runtime 250/250).

## SPEC (S-D integrado — fase P-P)
- Entradas: repo real (packages/core ~140 tools, apps/web+mobile, packages/runtime, vendor/ 10 repos, TECH-LIBRARY 12 cats, 73 docs, 33 RAZONAMIENTO, 29 learning/sources, dev.log con causa de crash).
- Salidas: `docs/REPLANTEO-ULTRAIA-2026.md` (documento maestro) + este plan file + higiene env (matar huérfanos next dev) + bitácora [P/I/V/R] + fila STATE 176.
- Criterios de aceptación: MD cubre inventario verificado + diagnóstico P0 con evidencias + plan P0-P5 + automatización + comercial $0 + reglas no-romper + roadmap 177-185; cero archivos .ts tocados; commit docs-only con pathspec.
- Límites: NO commitear WIP ajeno/local (15 M + untracked quedan fuera); NO push; NO tocar denylist (.env, auth/, payments/, secrets/, credentials/).

## DESIGN (S-D integrado — fase P-P)
- Estructura del MD: 0 resumen ejecutivo → 1 inventario verificado → 2 diagnóstico P0 (tabla causa/evidencia/estado/acción) → 3 inventario open-source (vendor + TECH-LIBRARY + sources + keyless) → 4 brechas/decisiones → 5 plan P0-P5 → 6 automatización → 7 comercial $0 → 8 reglas operativas → 9 roadmap 177-185 → anexos (comandos, mapa docs, glosario).
- Hallazgo central del diagnóstico: el crash web actual es `lucide-react` brand icons (`Linkedin/Slack/Twitter/Youtube`) — YA resuelto en HEAD `031dc75` (landing-ecosystem.tsx usa iconos genéricos); dev.log es stale; quedan huérfanos + fix Content-Encoding en WIP (next.config.ts) pendiente de commit por su autor.
- Sin diagrama nuevo: el MD referencia `docs/diagrams/` existentes.

## LEARN (L-T integrado — fase P-P)
- Verdad aplicable: learning/truth_truth_ultraia_capabilities.json (search/image/video/code/audio propios); LEARNINGS: instrumentation dual-runtime (iter-48), imports .js rompen webpack (iter-47), commit siempre con pathspec (iter-57/58/66/77), docs-only precedent loop-44/56 (sin gates de código), orphans rompen build (14/08), .next corrupto por raza, IPv6 localhost → 127.0.0.1 (ciclo 66).
- Gaps que cierra: visión comercial unificada (no existía MD maestro post-175), diagnóstico escrito del "se rompe a cada rato", inventario open-source único (estaba disperso en 33 RAZONAMIENTO + TECH-LIBRARY + vendor).

## TEST (L-T integrado — fase P-P)
- Verificación docs-only: `py -3.12 scripts/loop_verifier.py .opencode/plans/loop-176-replanteo-estabilizacion.md` → APPROVE; ambos .md existen, UTF-8 sin BOM ni mojibake nuevo; `git status --porcelain` muestra SOLO los 4 archivos del plan como staged/cambios propios; `git diff --cached --stat` == plan.
- Sin gates npm (precedente loop-44/56: cero .ts tocados).

## MEJORAS A ADICIONAR
- Documento maestro comercial que faltaba desde iter-103 (DESCRIPCION.md era solo usuario-final, sin técnica ni plan).
- Higiene real: 3 procesos next-dev huérfanos eliminados (PIDs 5896/16416/8976), puerto 3000 liberado.
- Inventario open-source accionable con decisiones (integrar / no / pendiente) en vez de lista plana.

## TECNOLOGÍAS EVALUADAS
- vendor/vibe-coding-with-base44 (starter-kits/prompts/docs con LICENSE): NUEVO, sin analizar → backlog 177 (protocolo enlaces.txt: descargar→analizar→RAZONAMIENTO→capability si aplica).
- vendor/everything-claude-code (skills x-api/social-publisher): X adapter ya propio (8bc63b8); social-publisher LinkedIn vs adapter propio iter-49 → verificar duplicado en 178.
- Lucide brand icons: NO reintroducir (removidos upstream); usar genéricos o SVG inline propio.
- Sin nuevas deps npm en esta iteración (docs-only).

## Objetivo
- Entregar el MD maestro de replanteo comercial $0 + estabilización diagnosticada, sin romper nada, en un commit docs-only.

## Pasos
1. Higiene: matar huérfanos `next dev` (taskkill quirúrgico por PID) — HECHO (0 restantes).
2. Escribir `.opencode/plans/loop-176-replanteo-estabilizacion.md` (este archivo).
3. Escribir `docs/REPLANTEO-ULTRAIA-2026.md` (inventario + diagnóstico + plan P0-P5 + comercial + roadmap).
4. Verificar: loop_verifier.py APPROVE + UTF-8 + status limpio de ajenos en staged.
5. Bitácora: append iteración 176 en loop-run-log.md; fila 176 en STATE.md (tras fila 126).
6. Staging explícito de los 4 archivos + commit pathspec `docs(replanteo): ...` — SIN push.

## Archivos a tocar

Staging explícito (nunca `git add .`):

- `.opencode/plans/loop-176-replanteo-estabilizacion.md` — NUEVO (este plan)
- `docs/REPLANTEO-ULTRAIA-2026.md` — NUEVO (documento maestro)
- `loop-run-log.md` — APPEND iteración 176 (bitácora)
- `STATE.md` — fila 176 tras fila 126 + Last run → iter-176 (contabilidad)

## RECURSOS / PRESUPUESTO
- Tools: Read/Grep/Bash (inventario), Write (docs), loop_verifier.py, taskkill. Skills: loop-piv, loop-constraints, brainstorming (ya aplicadas).
- Tiempo: ~2h. Tokens: dentro del cap diario (1 ciclo de 10).

## NO-hacer (guardas explícitas)
- NO `git add .` / `git commit` sin pathspec; NO incluir los 15 M ni untracked (batch LAN/extension, next.config fix, reference-media, vendor/vibe-*) — son de otra línea de trabajo.
- NO tocar `apps/web/src/components/landing/landing-ecosystem.tsx` (ya correcto en HEAD) ni reintroducir brand icons.
- NO editar código (.ts/.tsx/.py/.ps1), .env*, auth/, payments/, secrets/, credentials/, .vscode/.
- NO push ni merge (gate humano). NO crear PR.
- NO reescribir STATE.md completo (solo insertar fila; el archivo tiene mojibake histórico — no "arreglarlo" aquí).

## Criterios

De verificación (scoped + FULL):
- Scoped: loop_verifier.py APPROVE sobre este plan.
- FULL: no aplica (docs-only, precedente loop-44/56) — se declara explícitamente en el commit y la bitácora.
- Esperado: 2 archivos nuevos + 2 appends; `git diff --cached --name-only` == esos 4.

## TOLERANCIAS
- Si loop_verifier.py da REJECT → corregir secciones del plan (máx 3 intentos), nunca commitear sin APPROVE.
- Si STATE.md se corrompe al editar → `git checkout -- STATE.md` y reintentar solo la inserción de fila; si persiste, commitear sin STATE.md y anotarlo.
- Si aparece lock ajeno o sesión concurrente → CEDE: solo docs nuevos ya escritos, sin commit, y reportar.

## Riesgos / guardas
- STATE.md/loop-run-log.md con encoding frágil → editar por inserción mínima con Write/Edit, verificar con `git diff` que solo cambia lo previsto.
- WIP local grande sin commitear → nuestro commit con pathspec es inmune; verificar `git diff --cached` antes de commitear.
- Alcance "implementar todo" del pedido → contenido a roadmap 177-185 por ciclos (un fix por run); esta iteración cierra P (plan) + doc + higiene.

## Esfuerzo estimado
- medio — 2 archivos nuevos grandes + 2 ediciones quirúrgicas + verificación; sin código ni gates npm.

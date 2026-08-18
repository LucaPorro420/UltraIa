# Auditoría del harness PIVR — hallazgos verificados (18/08/2026)

Fecha: 2026-08-18 · Alcance: capa de meta-desarrollo (loop PIVR, STATE.md, agentes opencode,
skills de loop) — no la capa de producto (capabilities de `packages/core`). Petición: analizar
el proyecto y su planificación general, y producir adiciones/mejoras/agentes/skills/loop/plan
PIV para agilizar el desarrollo. Todo lo listado abajo se verificó contra archivos reales del
repo y contra `git status`/`git log` en vivo (18/08/2026, rama `master`, HEAD `b4b3bf9`) — nada
de esto es especulación sobre el proyecto.

## 1. Bug confirmado: `scripts/loop_piv.py::mark_done`

`mark_done(task_id)` recibe el ID de la tarea a cerrar, pero el reemplazo de texto se aplicaba a
**cualquier** fila de STATE.md cuyo Estado siguiera siendo `pendiente`, sin filtrar por ese ID
(el parámetro solo se usaba en el `print` final). Invisible mientras solo hay una fila
`pendiente` a la vez — pero este proyecto ya documentó, en su propio STATE.md, al menos cuatro
episodios de sesiones concurrentes (iteraciones 25, 26, 41, 46) donde dos procesos escriben el
backlog al mismo tiempo. En ese escenario, dos filas `pendiente` simultáneas + un `mark_done` de
cualquiera de las dos = la otra queda marcada DONE sin que nadie la haya hecho.

**Verificado empíricamente** (no es una lectura del código sin probar): se reprodujo el bug
contra una copia del archivo original con un STATE.md sintético de dos filas `pendiente`,
llamando `mark_done(1)` — la fila `#2` (una tarea distinta) quedó marcada `✅ DONE` igual. Contra
la versión corregida (entregada en este paquete), la misma prueba deja la fila `#2` intacta.
Test de regresión incluido: `scripts/loop_piv_mark_done.test.py` (4 casos, los 4 pasan contra el
fix y 2 fallan contra el original).

**Fix aplicado** (mínimo, solo dentro de `mark_done`, sin tocar el resto del archivo): filtrar
por `int(m.group(1)) == task_id` antes de sustituir, y avisar por consola si el ID no se
encontró (antes fallaba en silencio).

## 2. STATE.md: integridad de la tabla de backlog

Leyendo la tabla completa (no solo las últimas filas):

- **IDs duplicados con contenido distinto**: `#16` aparece dos veces (AutoPub F2 tarea 3 —
  literalmente repetida palabra por palabra), `#17` dos veces (AutoPub F4 tarea 4 y tarea 5,
  descripciones distintas), `#36` dos veces (Capability growth / AutoPub F4 wiring Meta), `#41`
  dos veces (AutoPub F5 endpoint metrics / Adapters Discord+Slack).
- **Filas fuera de la tabla**: las filas `#45, #47, #48, #46, #49, #50, #51, #52` aparecen
  DESPUÉS de la línea de cierre `---\nRun log: loop-run-log.md`, en vez de dentro del cuerpo de
  la tabla — y fuera de orden (48 antes que 46 y 47).
- **Artefactos de encoding**: el carácter de reemplazo Unicode (`�`) aparece en las filas 45, 47,
  49, 50, 51 (coincide con la lección ya escrita en `loop-constraints.md` sobre PowerShell 5.1 +
  `Set-Content -Encoding UTF8` metiendo BOM).
- **Banner desincronizado del kill switch real** (el hallazgo más importante de los cuatro): el
  banner superior de STATE.md dice *"⏸️ ITERACIÓN 46 PAUSADA (18/08/2026 ~00:50)... RETOMAR
  cuando el usuario confirme que la sesión terminó"*. Pero:
  - `findstr /C:"loop-pause-all" STATE.md loop-run-log.md` (el string literal que
    `kill_switch_active()` busca) **no devolvió ninguna coincidencia** — el kill switch mecánico
    nunca se activó.
  - La misma tabla de STATE.md muestra las iteraciones 47, 48, 49, 50, 51, 52 completadas
    **después** de la hora del banner, con commits reales (`e769223`, `f7df3d0`, `c9cc080`,
    `4deb4e9`, `be35a83`, todos visibles en `git log`).
  - Conclusión verificada: el banner quedó obsoleto — el trabajo síguió sin que nadie lo
    "retomara" explícitamente porque el kill switch nunca frenó nada. Es exactamente el tipo de
    señal falsa que un agente (o un humano apurado) puede leer mal.

`state-integrity-check` (skill nueva, ver abajo) automatiza estos cuatro chequeos.

## 3. Estado real del working tree AHORA MISMO (verificado vía `git status --porcelain`)

No es texto de STATE.md — es la salida real de git en el momento de esta auditoría:

- **20 archivos trackeados modificados o borrados** sin commitear, incluyendo `.gitignore`,
  `DOCS_TODO.md`, `enlaces.txt`, `loop-run-log.md`, el schema de Prisma, `llm.ts`, `index.ts`, y
  **dos archivos de test BORRADOS sin reemplazo**: `packages/core/src/domain/publications.test.ts`
  y `packages/core/src/tools/publish.test.ts` (aparecen como `D` en `git status`). STATE.md les
  atribuye 30 y 48 tests respectivamente en la última medición — si se commitea el árbol tal
  cual está hoy, esa cobertura desaparece. No se puede saber desde aquí si es un refactor a
  medio terminar o un borrado accidental; hace falta triage humano antes de tocarlo.
- **~30 archivos sin trackear**, que se agrupan en al menos tres frentes de trabajo distintos y
  sin fila propia en STATE.md:
  1. El remanente de la "sesión concurrente #25" (media-automation/game-dev) que STATE.md ya
     documentaba como pendiente: `automation.ts`/`.test.ts`, `recorder.ts`/`.test.ts`,
     `docs/AUTOMATION-WEB.md`, `docs/RAZONAMIENTO-{GAME-DEV,MEDIA-AUTOMATION}.md`,
     `learning/sources/{game-dev-ai,media-automation}.md`, `scripts/web-automation.py`.
  2. Una migración Prisma nueva sin commitear (`add_channel_connection`) + `domain/connections.ts`
     — feature de conexión de canales en progreso, sin fila en STATE.md.
  3. **Tres planes compitiendo por el mismo "siguiente slot"**: `.opencode/plans/loop-53-ia-generativa-procedural.md`,
     `loop-53-hud-conexiones.md` (mismo número, dos planes) y `loop-media-synthesis-full.md` (sin
     número). Los tres tienen código asociado ya presente sin trackear (`generative.ts`,
     `research.ts`, `enlaces.ts`, `media-synthesis/`) pero ninguno tiene fila en STATE.md ni
     commit de cierre — no puede saberse desde aquí cuál es el vigente.
- **Los planes de las iteraciones YA cerradas y pusheadas nunca se commitearon**: `git log`
  confirma commits reales para las iteraciones 46, 47, 49, 50, 51, 52 (código + tests + docs),
  pero los archivos `.opencode/plans/loop-{46,47,49,50,51,52,53×2}-*.md` y
  `loop-media-synthesis-full.md` siguen apareciendo como `??` (sin trackear) en `git status`. El
  protocolo del propio proyecto dice *"el plan es el contrato del ciclo"* — hoy ese contrato
  vive solo en el disco de una máquina, no en el historial de git.
- **Archivos sensibles sin decisión tomada**: `cuentas.txt` (raíz, sin trackear) y `.ultraia/`
  (directorio del runtime local, sin trackear — y `AGENTS.md` solo confirma
  `.gitignore` para `.ultraia/recordings/`, `logs/` y `screenshots/`, no para el árbol completo,
  mientras que `packages/runtime` documenta que `UltraConfig` guarda "secretos enmascarados en
  disco" ahí dentro). No se abrió ni se leyó el contenido de `cuentas.txt` — se señala su
  existencia únicamente por higiene, antes de que alguien corra un `git add` amplio por hábito
  (aunque las reglas del proyecto ya lo prohíben explícitamente).

Esto no se tocó: ningún archivo de los listados arriba se modificó, movió ni commiteó. Es
observación pura vía `git status`/`git log`, de solo lectura.

## 4. Skills: catálogo real vs. lo que ve una sesión Claude/Cowork

`.opencode/skills/` tiene 20 carpetas (el set completo que carga opencode). La carpeta
`skills/` en la raíz — la que efectivamente ve una sesión basada en Claude que se conecta a
esta carpeta como contexto — solo espejaba 3: `loop-budget`, `loop-constraints`, `loop-triage`.
Faltaban exactamente los dos skills más importantes del protocolo (`loop-piv`, el que define el
ciclo completo, y `loop-verifier`, el checker). Se copiaron ambos a `skills/` en este paquete
(contenido idéntico al de `.opencode/skills/`, verificado con `diff`).

## 5. Qué NO se tocó (y por qué)

- **STATE.md y `loop-run-log.md`**: `loop-run-log.md` ya está modificado en el working tree
  ahora mismo (otra sesión o el usuario están escribiendo ahí); STATE.md es el archivo que un
  driver autónomo (`scripts/loop_piv.py`) puede leer y actuar sobre él en cualquier momento —
  hoy no tiene el kill switch activo. Añadir una fila `pendiente` ahí mismo habría significado
  poner en cola trabajo real, autónomo, ejecutable, sobre un árbol que ya tiene WIP ajeno y dos
  tests borrados sin resolver. Eso es una decisión del usuario, no algo para tomar por defecto.
  La fila propuesta (lista para pegar) está en el plan `.opencode/plans/loop-54-harness-self-improvement.md`.
- **Los ~30 archivos sin trackear ni los 2 tests borrados**: requieren triage humano (¿cuál de
  los 3 planes del "slot 53" sigue vigente?, ¿el borrado de los tests fue intencional?) que no
  puede resolverse desde fuera del working tree activo.
- **`cuentas.txt`**: no se leyó su contenido.

## 6. Watch List (no construido, solo anotado)

- El producto (los 8 agentes privados `bp-admin-*`: Orquestador, Investigador, Redactor,
  Guionista, Diseñador, Analista, Gestor, Publicador) no tiene un agente que corresponda a la
  nueva capability `growth.ts` (perfil de canal → experimentos → playbook) ni a `media-score.ts`
  — encajaría un noveno agente tipo "Analista de Crecimiento" si el usuario quiere llevar esa
  capability al producto, no solo al backend. Fuera de alcance de esta ronda (harness, no
  producto).

# INCIDENTE — la raíz del repo vaciada por una sesión concurrente (18-19/08/2026)

> Estado: **diagnosticado, reparación automatizada disponible** (`scripts/restore-empty-tracked.ps1`).
> No requiere decisiones de diseño: los datos siguen en `.git`.

## Qué pasó

Todos los archivos **de la raíz del repositorio** (no de los subdirectorios) tienen tamaño 0.
Sus `mtime` están agrupados en una ventana de ~3 segundos:

| epoch (ms) | qué |
|---|---|
| 1787104341 | commit `63ad94b` (wiring `index.ts`, iteración 63) |
| **1787104407 – 1787104410** | **~46 archivos de la raíz pasan a 0 bytes** |
| 1787104421 | `loop-run-log.md` reescrito (con contenido, sobrevive) |
| 1787104466 | `.gitignore` reescrito (14 bytes) |
| 1787104573 | repack de `.git/objects/pack/pack-8996b12….pack` |
| 1787104925 | `STATE.md` reescrito (con contenido, sobrevive) |
| 1787105216 | commit `913e798` (bitácora iteración 63) |

## Causa (identificada, con evidencia en la propia bitácora)

No fue el disco: **fue la sesión concurrente `57b`**. La bitácora restaurada lo dice
literalmente, aunque solo para un archivo (`loop-run-log.md`, línea 2148):

> «STATE.md worktree vacio restaurado desde c22dee8 (**la 57b lo vacio a las 22:53:27** tras
> su commit 63ad94b; restauracion reversible - si ella reescribe, su version gana)»

`22:53:27` (UTC−3) es exactamente `1787104407` — el mismo segundo en el que se vaciaron los
otros 45 archivos. Es decir: **la sesión principal detectó el vaciado de `STATE.md`, lo
restauró desde `c22dee8`… y no miró el resto de la raíz.** 45 archivos llevan vacíos desde
entonces, entre ellos `package.json`.

Lo que sí funcionó: la regla de commitear con pathspec explícito
(`loop-constraints.md`). `913e798` solo incluyó `STATE.md` y `loop-run-log.md`, así que
`HEAD` conserva el contenido bueno de los 36 archivos versionados y la reparación es trivial.

Verificado: `packages/`, `apps/`, `docs/`, `scripts/`, `.opencode/` están **intactos**
(muestreo de `packages/core/src` completo, `apps/web`, `scripts/`, `docs/`, `.opencode/plans`).

## Impacto

`package.json` y `tsconfig.base.json` en 0 bytes ⇒ **el monorepo no arranca ni compila**:
`npm run dev`, `npm run typecheck`, `npm run lint`, `npm run test` y `npm run build` fallan
antes de empezar. También se perdieron `AGENTS.md`, `LOOP.md`, `loop-constraints.md`,
`loop-budget.md` y `opencode.json` — es decir, **el harness del bucle PIVR y la configuración
de los agentes**.

## Reparación

```powershell
# 1) informe (no toca nada)
powershell -ExecutionPolicy Bypass -File scripts\restore-empty-tracked.ps1

# 2) restaurar
powershell -ExecutionPolicy Bypass -File scripts\restore-empty-tracked.ps1 -Apply

# 3) gates
npm run typecheck; npm run lint; npm run test; npm run build
```

El script solo toca archivos **versionados y actualmente vacíos** (no hay nada que perder en
ellos) y restaura byte a byte desde `HEAD`. Deliberadamente **no** ejecuta `git restore .`:
eso destruiría el WIP sin commitear de las sesiones concurrentes (`recorder.ts`,
`automation.ts`, `blueprint.ts`, `reach.ts`, migraciones `connections`) que `STATE.md`
marca como intocable.

### Los 36 recuperables desde HEAD

`.env.cloud.example` · `.env.example` · `AGENT.md` · `AGENTS.loop.md` · `AGENTS.md` ·
`AplicacionIaMatEtc.md` · `CHANGES.md` · `DEPLOY.md` · `DESIGN.md` · `DESIGN.png` ·
`DOCS_TODO.md` · `Dockerfile.travel-video` · `LOOP.md` · `LOOPENGINEER.TXT` ·
`PLAN-ULTRAIA.md` · `PrototypeREADME.md` · `PrototypeREADME.pdf` · `QUICKSTART.md` ·
`README.md` · `UltraIa-Prototipo.zip` · `docker-compose.travel.yml` · `enlaces.txt` ·
`integracionModeloLocal.txt` · `integracionTecno.txt` · `integracionWebBrowse.txt` ·
`loop-budget.md` · `loop-constraints.md` · `masinfo.txt` · `opencode.json` ·
`package-lock.json` · `package.json` · `proyectoNuevo.md` · `proyectoNuevo.txt` ·
`run-all.ps1` · `start.py` · `tsconfig.base.json`

### Caso aparte: `loop-run-log.md` — el truncado SÍ se commiteó (YA RESUELTO)

`loop-run-log.md` fue vaciado a las `…407` y **reescrito a las `…421` con solo la entrada de
la iteración 63** (1880 B). El commit `913e798` lo consolidó así: **`HEAD` ya no tiene el
histórico de la bitácora** y `git restore` no lo devuelve. Recuperación:

```powershell
git show 63ad94b:loop-run-log.md > loop-run-log.md
# y volver a añadir encima las entradas 63 y 64 (que sí son válidas)
```

**Estado 19/08**: ya restaurado por una sesión concurrente (174 467 B, mtime `1787106380`);
la entrada de la iteración 64 se añadió encima. `STATE.md` tampoco está afectado
(restaurado desde `c22dee8`). El script detecta este tipo de caso automáticamente comparando
`HEAD` contra `63ad94b` (parámetro `-BaseCommit`).

### Los 13 NO recuperables (sin seguimiento en git)

| archivo | sustituto |
|---|---|
| `.env` (raíz) | `apps/web/.env` sigue intacto (1783 B) — es el que usa la app; rehacer la raíz desde `.env.example` una vez restaurado |
| `cuentas.txt` | sin copia. Estaba *staged* (`A`) en el index: `git checkout-index -- cuentas.txt` puede recuperarlo si el blob sigue en `.git` |
| `FundamentosDeLaProgramcon.txt` | copia fiel en `learning/sources/fundamentos-programacion.md` |
| `loop-verifier.md` | espejo en `.opencode/skills/` (sincronizado en `506c037`) |
| `repomix-output.xml` | regenerable: `npm run repomix` |
| `session-ses_009b.md` | sin copia (bitácora de sesión) |
| `dev.log`, `dev.err`, `.dev-server.log`, `.start-final*.log`, `start-fullfinal.log` | logs; irrelevantes |
| `Video by coders.learning [DcD96B5Nd-m].mp4` | dato del usuario, no producto |

## Prevención (el punto importante: esto puede repetirse)

La causa es un agente, no un disco — así que la mitigación va en el harness:

1. **Ampliar `state-integrity-check`.** La skill ya existe (iteración 54) pero solo vigila
   `STATE.md`. Debe cubrir los archivos que hacen que el repo *exista*: `package.json`,
   `tsconfig.base.json`, `AGENTS.md`, `LOOP.md`, `opencode.json`, `loop-constraints.md`,
   `loop-budget.md`. Un archivo versionado con 0 bytes es siempre un fallo, nunca un estado
   válido.
2. **Regla explícita en `loop-constraints.md`**: *nunca escribir contenido vacío sobre un
   archivo versionado; para eliminar contenido, borrar el archivo y commitear el borrado.*
   Un `Write` con string vacío es indistinguible de una corrupción.
3. **Precondición en `check_prereqs` (`start.py`)**: ejecutar
   `scripts\restore-empty-tracked.ps1` en dry-run al arrancar el bucle y abortar si reporta
   archivos vacíos. Es la práctica 8 del Bloque B ("precondiciones") aplicada a sí misma.
4. **Cuando se detecte un vaciado, revisar TODA la raíz, no solo el archivo que saltó.**
   El coste de no hacerlo fueron ~14 horas con el monorepo sin poder compilar.
5. **Verificar el push `b4b3bf9..c729041`** (29 commits, `origin/master = c729041`): se
   empujó después del vaciado. `git log --stat b4b3bf9..c729041 -- package.json
   tsconfig.base.json AGENTS.md LOOP.md opencode.json` dice si el remoto se llevó también
   algún archivo vacío.
6. `.gitignore` quedó en 14 bytes: revisar con
   `scripts\restore-empty-tracked.ps1 -ShrinkReport` si perdió reglas
   (`.ultraia/travel/` ya estaba en la Watch List de `STATE.md`).

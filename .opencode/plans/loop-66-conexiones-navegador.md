# Plan loop-66 — Conexiones robustas para Chrome/Brave (mejora Python)

## Contexto
Petición del usuario (19/08/2026): "mejora las conexiones y el código python para que
funcionen de mejor manera a la hora de ejecutar el servidor en chrome o brave".

Diagnóstico sobre `start.py` + `webhook_server.py`:
1. **Health-checks con `localhost`** → `urllib` (Python) en Windows puede resolver
   `localhost` a `::1` (IPv6) mientras los servidores escuchan solo IPv4
   (uvicorn `0.0.0.0`/`127.0.0.1`) → falsos negativos: "no respondió en 90s" o
   "murió antes de responder" con el servidor realmente UP. Afecta a web (:3000),
   hooks (:8000), gen-engine (:8100), ollama y LM Studio.
2. **No se abre el navegador automáticamente** → el usuario tiene que copiar la URL.
3. **Sin host configurable** → `next dev` y uvicorn escuchan donde deciden ellos; si
   Chrome/Brave resuelve `localhost`→`::1` y el server es IPv4-only, la conexión
   falla (Happy Eyeballs suele salvar, pero no siempre).
4. **El monitor no reinicia** servicios que mueren → hay que relanzar `start.py` a mano.
5. **`python_exec()` re-probea** intérpretes en cada llamada (arranque lento, ~15s por
   candidato).

## Objetivo
Arranque `python start.py` determinista y resiliente: health-checks IPv4 explícito
(`127.0.0.1`), host de escucha configurable (`--host`), apertura automática del
navegador Chrome/Brave al estar la web UP (con `--no-open` y `--browser`), auto-restart
de servicios (máx 2 intentos, backoff), `python_exec()` cacheado.

## Archivos a tocar (SOLO estos)
- `start.py` — mejoras de conexión/navegador/restart.
- `ULTRAIA/integracionesImplementacion/webhook_server.py` — argparse `--host`/`--port`
  (retrocompatible: default 0.0.0.0:8000).
- `.opencode/plans/loop-66-conexiones-navegador.md` — este plan.
- `loop-run-log.md` — bitácora [P]/[I]/[V]/[R].
- `STATE.md` — fila nueva en backlog (DONE + evidencia).

## NO-hacer
- NO tocar archivos de sesiones concurrentes (recorder/automation/reach/blueprint/
  connections/media-synthesis, docs ajenos, enlaces.txt, .env*, batch staged #25).
- NO `git add .` / `-A` — staging explícito de los 5 archivos del plan.
- NO push (constraint: avisar antes).
- NO cambiar el comportamiento default de `webhook_server.py` al ejecutarlo directo.
- NO tocar TS/JS (gates npm solo se corren, no se modifican).

## Pasos
1. `start.py`:
   - `_ipv4_url()`: reescribe `localhost`/`::1` → `127.0.0.1`; aplicar en `http_ok`.
   - `service_url()` → `127.0.0.1` explícito; `public_url()` → `localhost` para
     mostrar/abrir.
   - Flag `--host` (default `127.0.0.1`; `0.0.0.0` LAN; `::` dual-stack) propagado a
     `next dev -H`, uvicorn `--host`, `webhook_server.py --host`.
   - Flags `--browser {chrome,brave,default}` y `--no-open`; `find_browser()` con
     rutas comunes Windows + env `BROWSER`; `open_browser()`; thread
     `open_browser_when_ready()` (solo full run y `--web`).
   - `monitor_loop` con auto-restart (máx 2, backoff 2s·n) + `spawn_and_watch` con
     reintentos y finally de limpieza en `cmd_single`.
   - `python_exec()` con `@lru_cache(maxsize=1)` y probe timeout 8s.
   - `check_connections`: fila navegador + checks con 127.0.0.1.
   - Logs con ambas URLs (`localhost` y `127.0.0.1`).
2. `webhook_server.py`: argparse `--host`/`--port` (defaults 0.0.0.0/8000).
3. Linters Python: `py -3.12 -m ruff check`, `pyflakes`, `py_compile` sobre los 2.
4. Prueba funcional: `py -3.12 start.py --check-connections` + arranque real breve
   `--web --no-open` (verificar 200 en 127.0.0.1:3000, matar con taskkill /T /F).
5. Gates FULL en orden CI: typecheck → lint → test → build (matar node.exe antes del
   build; si `node_modules/.vite` stale → limpiar).
6. Commit explícito de los 5 archivos + run-log + STATE.md.

## Criterios de éxito (scoped)
- `python start.py --check-connections` → fila [BROWSER] con chrome/brave o fallback.
- `http_ok` con localhost e IPv6 `::1` → usa 127.0.0.1 (unit probe manual).
- Linters Python: 0 issues.
- Gates FULL verdes (sin tocar TS, deben seguir verdes).
- Build con dev servers muertos.

## Predicción
`start.py` verificado por linters Python y por una ejecución real de `--web --no-open`;
los 4 gates npm siguen verdes porque solo cambia Python. Commit 1 archivo grande
(start.py) + webhook_server.py + plan + run-log + STATE.md.

## Riesgos
- npm `run dev -- -H` puede no pasar args en algún npm viejo → verificar en la prueba
  real que next escucha en el host pedido (`netstat`/health 127.0.0.1).
- La apertura automática abriría Chrome/Brave en la máquina del usuario durante la
  prueba → probar con `--no-open`; la apertura real queda para su uso.
- Puertos ocupados por sesiones concurrentes → preflight ya aborta con mensaje claro.

## Esfuerzo / prioridad
- Esfuerzo: 1 ciclo (S). Prioridad: P1 (petición directa del usuario, bloquea su uso).
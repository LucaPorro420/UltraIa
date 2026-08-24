# PLAN: Inicio local y nube para PCs <8 GB RAM (tarea #92 de STATE.md, P1)

Fecha: 2026-08-22 · Modo: P-B · Presupuesto: 1 ciclo (~2h / ≤50k tokens)

## Contexto
- Pedido usuario: "iniciar a crear el cómo iniciarlo de forma local y nube para que funcione en PC
  con menos de 8 GB de RAM". La máquina de desarrollo ya es i5-4210M/8GB sin GPU (lección vigente:
  keyless-first). Falta un camino DOCUMENTADO + MECANIZADO para máquinas aún más limitadas.
- Piezas existentes que se integran (no se duplican): `start.py` (orquestador), launcher WebView2
  (~111 MB RAM medidos iter-50), scheduler schtasks autopub (iter-90, corre SIN UI), heartbeat
  Actions (iter-82, gates en la nube), docs/DESPLIEGUE-GRATUITO.md + DEPLOY.md.

## SPEC / DESIGN
- `start.py --lite [--ram-mb N]`: aplica `NODE_OPTIONS=--max-old-space-size=N` (default 512,
  NUNCA pisa un valor existente del usuario) y en el run completo arranca SOLO web (omite
  webhooks/gen-engine). Tips RAM impresos al iniciar. Aplicado tras setup() para no capar npm install.
- `scripts/iniciar-local.ps1` (ASCII puro — lección PS5.1): detecta RAM total vía CIM y elige perfil
  automáticamente (`minimo` <6GB → --lite --ram-mb escalado; `estandar` resto), con overrides
  `-Perfil`, `-RamMb`, `-Lan` (host 0.0.0.0 para móvil), `-SinNavegador`.
- `docs/INICIO-LOCAL-Y-NUBE.md`: guía definitiva — tabla de decisión por RAM; local paso a paso
  (instalar una vez → perfiles → presupuesto de RAM por servicio con referencias); alternativa UI
  ultra-ligera (launcher WebView2, comando real verificado); modo headless (solo schtasks, ni web);
  nube gratis paso a paso (Vercel = build en su nube ⇒ 0 RAM local; Supabase Postgres para cola real;
  Qdrant Cloud; heartbeat/monitor ya activos); reparto recomendado local↔nube para <8GB;
  troubleshooting (pagefile, Chrome, zombis node, NUNCA build local en RAM baja).
- 1 línea en DESPLIEGUE-GRATUITO.md §6 apuntando a la guía nueva.

## LEARN / TEST
- Lecciones: PS5.1 ASCII-only; start.py linted (ruff/pylint/pyright/pyflakes deben seguir en 0);
  no correr build junto a dev servers; keyless-first.
- Verificación: py_compile + ruff + pyflakes sobre start.py; smoke determinista
  (`import start; apply_lite_env(384)` → NODE_OPTIONS contiene el cap; idempotencia si ya existe);
  `python start.py --help` muestra --lite/--ram-mb; `--check-connections` intacto.
- FULL npm gates antes del commit (start.py NO entra al bundle, pero los gates validan el repo).

## Archivos a tocar
- `.opencode/plans/loop-92-inicio-ram-baja.md`, `start.py`, `scripts/iniciar-local.ps1` (NUEVO),
  `docs/INICIO-LOCAL-Y-NUBE.md` (NUEVO), `docs/DESPLIEGUE-GRATUITO.md` (+1 línea),
  `STATE.md`, `loop-run-log.md`.

## NO-hacer / Riesgos
- NO tocar core/web/runtime (sin necesidad — cero colisión con sesiones concurrentes).
- NO editar .env* (denylist). NO push. Máx 3 fixes/ítem.
- No prometer mediciones que no existen: cifras de next dev/build marcadas como aproximadas,
  launcher 111 MB citada como medida real (iter-50).

## Criterios de verificación
- Python: py_compile EXIT 0 + ruff 0 + pyflakes 0 + smoke apply_lite_env OK + --help OK.
- FULL: typecheck→lint→test→build. Smoke arranque lite real OPCIONAL (--web --lite --no-open +
  health + taskkill) solo si el tiempo lo permite; si no, queda documentado como verificación manual.

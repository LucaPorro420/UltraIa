# Plan loop-112 — Capability `netwatch`: watchdog WiFi/red con decisiones auditables

**Sesión**: r112-UTEC-20260826-NETWATCH · Base: fb0f836 · Origen: `InfoPeticion.txt`
(26/08 01:34): "Planificar esta automatizacion para que efectues en todos los modos con total
decisiones auditoriales e implementarias, controla el wifi tambien para autoconectarte estando
el dispositivo encendido."

## SPEC / LEARN (S-D + L-T)
- Lo pedido ya existe en gran parte: genesis/genesis-runner (iter-83/84/85) = orquestador
  autónomo con gates; autolearn/cerebro/vitals/autopub = ciclos programados; brainpage/
  qdrant/kgraph/reporeview = memoria + research registry. **Gap real**: control de red/WiFi
  (auto-reconexión) + registro de decisiones auditable por tick.
- VERDAD capturada (API directa, no web): salida real de esta máquina:
  - `netsh wlan show interfaces` (ES): `Estado : conectado`, `SSID : Norma-2.4`,
    `Señal : 72%`, `Perfil : Norma-2.4`, `Nombre : Wi-Fi`.
  - `netsh wlan show profiles` (ES): `Perfil de todos los usuarios     : <nombre>`.
  - TRAMPA verificada: `"desconectado"` contiene `"conectado"` → normalizar chequeando la
    negación PRIMERO (mismo bug potencial en EN `disconnected`/`connected`).
- Patrón a seguir: cerebro.ts (dominio puro zod + schedule argv) + runner vite-node en Task/
  + scheduler ps1 + wiring llm.ts/index.ts + tests sin red real.

## OBJETIVO
El sistema se mantiene CONECTADO solo (watchdog cada pocos minutos mientras el PC esté
encendido) y deja AUDITORÍA NDJSON de cada decisión; operable por agente vía tool.

## Pasos
1. `packages/core/src/tools/netwatch.ts` (dominio puro, keyless, determinista):
   - `parseWlanInterfaces(raw)` → `WlanInterface[]` (labels ES+EN, acentos normalizados,
     negación primero); `wifiSummary(ifaces)`.
   - `parseWlanProfiles(raw)` → `string[]`; `parsePingOutput(raw)` → ok/reason (ES+EN).
   - Config zod: hosts probe, intervalSec ≥15, cooldownSec ≥30, maxAccionesPorHora ≤12,
     autoConnect, perfilPreferido.
   - `decideNetAction({summary, probeOk, accionesRecientes, clock})` → decisión
     noop|reconnect|scan|report_only|cooldown con razón auditable + anti-thrash
     (cooldown + tope horario).
   - argv builders: `netshStatusArgv/netshProfilesArgv/netshConnectArgv(ssid, iface)/
     netshDisconnectArgv/pingProbeArgv(host)` (win `-n/-w`, unix `-c/-W`).
   - `auditEntry(entry)` → línea NDJSON determinista (ts ISO, decision, reason, args).
   - `netwatchScheduleArgv(taskName, cadaNMinutos, workdir)` schtasks + cron line.
2. Tests `netwatch.test.ts` (~20, fixtures ES reales + EN canónicos, cero red):
   parser conectado/desconectado/sin-SSID/perfiles/ping ok-timeout, matriz de decisión,
   rate-limit, argv exactos, NDJSON determinista, defaults schema.
3. Runner `Task/netwatch-run.ts` (--once|--watch N|--profile|--dry-run|--dir): tick real
   spawnSync netsh+ping → decide → ejecuta connect (si autoConnect y no dry-run) →
   `.ultraia/netwatch/state.json` + append `audit.ndjson`; exit 0 sano / 1 degradado.
   Smoke REAL en esta máquina (WiFi Norma-2.4 conectado).
4. Scheduler `scripts/netwatch-schedule.ps1` (patrón cerebro-schedule.ps1, ASCII puro).
5. Wiring: llm.ts tool `netwatch_manage` (acciones parse/decide/argv/schedule/policy — puras)
   bajo capability `netwatch`; index.ts `export * from './netwatch'` (símbolos Net*/WLAN_*
   sin colisión) + TOOL_DESCRIPTIONS + union Capability.
6. Docs: `docs/RAZONAMIENTO-NETWATCH.md` (mapeo InfoPeticion→existente/gap/implementado;
   cómo lo consumen los modos P-P/P-B pre-flight y el Cerebro/heartbeat) + fila STATE.md 116
   + bitácora `[P]/[I]/[V]/[R]`.

## ARCHIVOS A TOCAR
packages/core/src/tools/netwatch.ts (N) · netwatch.test.ts (N) · ai/llm.ts (bloque aditivo) ·
tools/index.ts (export/descriptor/Capability) · Task/netwatch-run.ts (N) ·
scripts/netwatch-schedule.ps1 (N) · docs/RAZONAMIENTO-NETWATCH.md (N) · STATE.md ·
loop-run-log.md · .gitignore (`​.ultraia/netwatch/`).

## RECURSOS / PRESUPUESTO
1 iteración · gates FULL tras scoped verde · dev server ajeno PID 16280 se mata ANTES del
build (constraint) y NO se relanza.

## NO-hacer
NO tocar WIP ajeno (DOCS_TODO.md, workspace-client.tsx, ide-shell.tsx, plan huérfano
loop-108). NO commitear `.ultraia/`. NO ejecutar disconnect ni cambiar SSID real. Sin deps
nuevas. NO push (requiere humano).

## CRITERIOS (scoped + FULL)
scoped: vitest netwatch ≥20/20 + tsc core 0 propios. FULL CI order: typecheck/lint/test/build
GREEN con árbol vivo (atribución si WIP ajeno interfiere).

## TOLERANCIAS
Parser tolera ES/EN y acentos; runner fail-soft (nunca lanza, exit codes documentados);
tests herméticos (fixtures inline).

## RIESGOS
Colisión con sesión concurrente en llm/index → commit temprano pathspec (lección 93/104).
Locale distinto en CI ubuntu → argv builders cross-platform + parser sólo recibe raw inyectado.

## ESFUERZO/PRIORIDAD
~2h · P1 (pedido explícito usuario 26/08).

## PREDICCIÓN
netwatch.test.ts ~20 PASS primera pasada salvo 1-2 ajustes de regex de labels; FULL igual al
último verde (test count +~20); smoke real imprime decision=noop (red actual sana).

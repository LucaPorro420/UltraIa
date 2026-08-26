# RAZONAMIENTO — netwatch (loop-112): watchdog WiFi/red con decisiones auditables

**Origen**: `InfoPeticion.txt` (26/08/2026 01:34) — *"Planificar esta automatizacion para que
efectues en todos los modos con total decisiones auditoriales e implementarias, controla el wifi
tambien para autoconectarte estando el dispositivo encendido."*

## 1. Mapeo del pedido → estado del repo (qué ya existía)

El documento pegado en InfoPeticion.txt describe "Genesis Autonomous Engineering". Auditoría
honesta: **~85% ya estaba implementado** y NO se re-hace (regla: no recrear módulos existentes,
lección iter-86):

| Pieza pedida | Ya existente en UltraIa |
|---|---|
| Project manifest ejecutable | `genesis.ts` parseManifest + `scripts/genesis.manifest.json` (iter-83/87) |
| Ciclo OBSERVE→…→REPEAT | `genesis-runner.ts` runGenesisCycle + `npm run genesis` (iter-84) |
| Quality gates evaluados | `evaluateGates` contra los 4 gates npm (iter-84/85) |
| Stop conditions / next action | `checkStopConditions` + `nextEngineeringAction` (iter-83) |
| Memoria técnica (3 niveles) | brainpage (timeline append-only), semantic-memory, qdrant v2, LEARNINGS |
| Research Registry de repos | `learning/sources/*` + truth JSONs + reporeview (81 archivos→69 docs, iter-108) |
| Knowledge graph | kgraph (iter-80) |
| Agentes especializados | 11 bp-* con capabilities por seed (una sola fuente seed-data.mjs) |
| Skills bajo demanda | .opencode/skills/* + capabilities como tools |
| Automatización programada | schtasks Cerebro/AutoPub + workflows cloud (cerebro.yml, heartbeat) |
| Self-healing loop | vitals detectRegresiones + decidirAccion reparar→explotar→optimizar→explorar |

## 2. El gap real que este ciclo implementa

1. **Control de WiFi/red** — nada vigilaba la conectividad. Si el PC pierde el WiFi de noche,
   el Cerebro/AutoPub fallan silenciosos. Ahora: watchdog determinista que SONDEA (`ping`
   multi-host), DECIDE con política anti-thrash (enfriamiento 120s default + tope 6 acciones/h)
   y RECONECTA vía `netsh wlan connect` mientras el dispositivo esté encendido.
2. **Decisiones auditables por tick** — cada decisión (incluidas las informativas noop/cooldown)
   queda como línea NDJSON inmutable en `.ultraia/netwatch/audit.ndjson` con razón legible:
   `conectado_y_probe_ok`, `enfriamiento_120s_faltan_90s`, `tope_horario_6/6`,
   `desconectado_reconnect_<perfil>`… El rate-limit se calcula DESDE la propia auditoría
   (el log es la fuente de verdad, no memoria volátil).

## 3. Verdad capturada (API directa, no web)

- Salida REAL de esta máquina (locale ES): `Estado : conectado`, `SSID : Norma-2.4`,
  `Señal : 72-80%`, `Perfil : Norma-2.4`; perfiles: `Perfil de todos los usuarios : <nombre>`.
- **Trampa substring**: `"desconectado"` contiene `"conectado"` → `normalizeEstado` prueba la
  negación primero (ídem EN). Test de regresión dedicado.
- **Mojibake consola**: cp850/cp1252 rompen `Señal`. Doble defensa: (a) el runner decodifica
  latin1 si utf8 produce U+FFFD; (b) el parser limpia claves a `[a-z]` y acepta
  `senal|seal|signal`. Test con fixture `Se¤al`.
- **Caja de SSID**: extraer valores desde texto normalizado los minúsculiza → el regex de
  perfiles corre case-insensitive sobre la línea ORIGINAL (bug encontrado por test).

## 4. Arquitectura (patrón cerebro/screenflow)

```
netwatch.ts (puro, zod, keyless)      Task/netwatch-run.ts (vite-node)     scripts/netwatch-schedule.ps1
parse* → summary → decideNetAction ──▶ spawnSync netsh/ping → tick ──▶ schtasks /SC MINUTE /MO 5
argv builders + auditEntryNdjson      state.json + audit.ndjson           (--Remove para quitar)
netwatchSchtasksArgv/CronLine         exit 0 online / 1 degradado
```

- La tool `netwatch_manage` (llm.ts) expone SOLO acciones puras: `policy | parse | decide |
  argv | audit | schedule`. Nunca ejecuta red/procesos (mismo contrato que cerebro_run).
- Consumo por modos: **P-B pre-flight** puede llamar `decide` antes de gates FULL (build sin
  red = fuentes caídas); **L-T**: la auditoría NDJSON es evidencia aprendible; **Cerebro/
  heartbeat**: `--once` como primer paso del ciclo.

## 5. Verificación

- 31 tests dominio (fixtures ES real + EN canónico + mojibake) + 3 wiring = 34 nuevos, 0 red.
- Smoke REAL e2e en esta máquina: `decision=noop razon=conectado_y_probe_ok ssid=Norma-2.4
  señal=80% probe=true → exit 0`; state.json + audit.ndjson escritos; `--schedule` imprime
  argv schtasks/cron correctos; salida limpia bajo `cmd /c` (EXITCODE=0).
- Registro programable: `.\scripts\netwatch-schedule.ps1` (cada 5 min, task `UltraIa-NetWatch`).

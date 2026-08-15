# Loop Budget — UltraIa

> Primary loop: **PIVR** (Plan⇒Implement⇒Verificar⇒Reiniciar) — harness loop-engineering

## Daily limits

| Loop | Max runs/day | Max tokens/day | Max sub-agent spawns/run |
|------|--------------|----------------|--------------------------|
| PIVR | 10 ciclos | 100k | 2 (verifier) |
| Daily Triage | 1 | 20k | 0 |

## On budget exceed

1. Pausar el driver (`loop-pause-all` en STATE.md o terminar `scripts/loop_piv.py`).
2. Append evento a `loop-run-log.md`.
3. Notificar humano (STATE.md High Priority).

## Kill switch

- Flag: `loop-pause-all` en `STATE.md` o `loop-run-log.md`.
- Resume solo después de que el humano borre el flag.

## Estimate spend

```bash
npx @cobusgreyling/loop-cost --pattern daily-triage
npx @cobusgreyling/loop status .
```

## Notas

- Ciclo en-sesión = 1 tarea del backlog completa (P+I+V+R) por petición del usuario.
- Driver headless: `python scripts/loop_piv.py --cycles N` (default 1).
# RAZONAMIENTO — DeepSeek Harness (enlaces.txt línea 804)

> Fuente: `learning/sources/deepseek-harness.md` (README + docs/architecture.md + AGENTS.md de
> deepseek-ai/deepseek-harness, MIT, 148k stars, rama master, "Everything is a Plugin" sobre
> Cordis, creado 13/08/2026 — verificado 17/08/2026).
> Port: `packages/core/src/tools/harness.ts` — capability `harness` (iteración 34).

## Análisis del patrón

DeepSeek Harness (`dsh`) no es un framework de agentes clásico con un loop central: es un
**runtime donde TODO es un plugin** (architecture.md: "no privileged core"). Los principios
que lo hacen interesante:

1. **Todo es plugin** — tools, schedulers, observers y providers son plugins que se montan
   unos al lado de otros; no existe un "core" con privilegios especiales. Extender el
   runtime = añadir un plugin, nada más.
2. **Seams (costuras)** — capacidades intercambiables con tres roles: Service Definition
   (`defineSeam`), Service Provider (`register`) y Consumer (`resolve`). Cambiar un provider
   cambia todo el producto sin tocar a los consumidores.
3. **Eventos como extensión** — el contexto expone un bus de eventos; las suscripciones se
   deshacen cuando el plugin se desactiva (efectos reversibles garantizados por el runtime).
4. **Orden topológico** — los plugins declaran `dependsOn`; el runtime activa en orden
   (Kahn) y desactiva en orden inverso (unwind).
5. **Scheduler determinista** — trabajo de fondo por ticks (sin timers reales), ideal para
   tests con reloj inyectable.

## Mapeo implementado (port ORIGINAL, sin código copiado)

| Principio dsh | Port UltraIa (`harness.ts`) |
|---|---|
| Everything is a plugin | `HarnessPlugin { id, kind (tool/scheduler/observer/provider), dependsOn, tools, schedule, activate, deactivate? }` |
| No privileged core | `createHarness({ plugins })` — boot() valida TODO el árbol antes de activar nada (ids `^[a-z0-9][a-z0-9-]{1,63}$`, duplicados, deps faltantes, ciclos); run() solo ve tools de plugins activos |
| Seams | `defineSeam<T>(name)` → `register(ctx, provider)` / `resolve(ctx)`; sin provider → error claro |
| Eventos reversibles | `ctx.events.on/emit`; el runtime trackea las unsubs por plugin y las ejecuta en shutdown aunque el plugin no defina deactivate() |
| Orden topológico | `topoOrder()` Kahn; ciclo → error; rollback fail-soft si un plugin falla al activar |
| Scheduler por ticks | `plugin.schedule: [{ at, run }]`; `tick()` avanza reloj (inyectable) y ejecuta los jobs que vencen; fallos se loguean, nunca tumban el runtime |
| Estado compartido | `ctx.state` con claves NAMESPACED `<pluginId>:<clave>` (sin colisiones entre plugins) |
| Reversible shutdown | `shutdown()` → unsubs de eventos + deactivate en orden inverso, fail-soft con errores recolectados |

Plugins de ejemplo incluidos: `echoToolPlugin` (tools deterministas) y
`counterSchedulerPlugin` (emite 'tick' y cuenta hits cada N ticks).

## Wiring

- `ai/llm.ts`: capability `harness` → tool `harness_manage` (`accion: boot|run|tick|dump|shutdown`),
  runtime PERSISTENTE por sesión de chat (boot en una llamada, run/tick en las siguientes).
- `tools/index.ts`: export `harness` + TOOL_DESCRIPTIONS + capability `harness`.

## Verificación

- Tests: `harness.test.ts` **19 PASS** (orden de activación, dep faltante, ciclo, id inválido,
  duplicado, shutdown inverso, efectos reversibles, seam sin provider, run ok/desconocida,
  scheduler con reloj, dump, shutdown fail-soft, deactivate opcional, state namespaced).
- tsc parcial 0 errores propios; eslint limpio. Gates FULL pendientes árbol limpio (#25).

## Pendiente (no portado — fuera de alcance del dominio puro)

- Web UI (`dsh web` en 127.0.0.1:3080) — el port es dominio puro de razonamiento; una UI
  sería la Fase D del Desktop (Local API) o el app shell.
- Proveedores de LLM internos de dsh — UltraIa ya tiene su gateway propio (`resolveModel`,
  providers openai/google/ollama/lmstudio/deepseek).
- Plugins de la comunidad (`dsh-plugin` topic) — el patrón de montaje declarativo vía
  `harness_manage` ya permite componerlos sin copiar código.
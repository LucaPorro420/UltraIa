---
name: genesis
description: >
  Capa de ingeniería autónoma GENESIS sobre el ecosistema UltraIa existente:
  contrato genesis.json, consola operador scripts/genesis.py, research registry,
  motor npm run genesis y WiFi keepalive experimental. Usar cuando se pida
  "genesis", "operar genesis", "doctor", "registry", "wifi ensure",
  "instancia un proyecto genesis" o se necesite el estado del sistema autónomo.
user_invocable: true
---

# Genesis — Operación del sistema de ingeniería autónoma

**Regla de oro**: Genesis DELEGA, nunca duplica. El bucle es PIVR, la memoria es
`learning/`, los gates son CI. La auditoría completa vive en `docs/GENESIS.md`.

## Comandos (stdlib Python, Windows-first, fail-soft)

```bash
py -3.12 scripts/genesis.py manifest              # valida genesis.json raíz
py -3.12 scripts/genesis.py doctor                # pre-flight: kill switch+lock+git+prereqs+wifi
py -3.12 scripts/genesis.py inspect               # snapshot capabilities/skills/backlog
py -3.12 scripts/genesis.py gates                 # gates CI en orden (delega npm)
py -3.12 scripts/genesis.py run [--cycles N]      # ciclos PIVR (delega loop_piv.py)
py -3.12 scripts/genesis.py triage                # triage diario
py -3.12 scripts/genesis.py registry validate     # research-registry schema + decisiones
py -3.12 scripts/genesis.py registry add --file E # añade entrada validada (exige evidence)
py -3.12 scripts/genesis.py project new <slug>    # instancia genesis/projects/<slug>/
py -3.12 scripts/genesis.py wifi status           # read-only SIEMPRE seguro
py -3.12 scripts/genesis.py wifi ensure --ensure  # DOBLE guarda: flag + GENESIS_WIFI_SSID
npm run genesis                                   # motor autónomo con gates REALES
node_modules/.bin/vite-node.cmd scripts/genesis-run.ts --propose   # solo propuesta
```

## Reglas operativas

1. **Antes de actuar**: `doctor`. Si reporta kill switch ACTIVE real (token sin
   negación ni mención-meta en su contexto) → NO trabajar; escalar a humano.
2. **Research Registry es obligatorio**: todo repo externo estudiado se registra con
   `decision integrate|adapt|study|reject` + `evidence[]` commiteada. `stars`/
   `last_activity` = null si no se verificaron hoy. NUNCA reinvestigar lo mismo.
3. **MCPs**: cero por defecto (`docs/GENESIS.md §4`). Instalar solo capacidad ausente,
   con evaluación previa documentada y aprobación humana.
4. **WiFi**: `status` libre; `ensure` SOLO con doble guarda y NUNCA dentro del bucle
   automático. Jamás disconnect ni cambios destructivos de adapter.
5. **Proyectos nuevos**: `project new <slug>` genera el manifiesto desde template;
   validar con `manifest <ruta>` antes de usar.
6. **Costo**: política FREE > existente > OSS > free_tier > pago. Pago requiere humano.
7. **Motor vs consola**: el motor (`npm run genesis`) ejecuta gates reales y persiste
   `.ultraia/genesis/state.json`; la consola envuelve/reporta. No mezclar responsabilidades.

## Fuentes de verdad

- Contrato: `genesis.json` (raíz) · Auditoría: `docs/GENESIS.md`
- Motor: `packages/core/src/tools/genesis.ts` + `genesis-runner.ts` (wired llm.ts/index.ts)
- Registry: `genesis/research-registry.json` · Multi-proyecto: `genesis/projects/`

---
name: ultraia-request
description: >
  Harness universal de requests para UltraIa (port de las 31 practicas del Bloque B de
  FundamentosDeLaProgramacion). Usar SIEMPRE antes de delegar cualquier tarea a un modelo/agente
  (interno o externo): estructura el request en una plantilla de 13 campos, declara la config del
  loop (OBJETIVO/METRICA/TARGET/RESTRICCIONES/LOOP/STOP/FAILURE) y ejecuta el patron de bucle IA
  de 4 fases (Sensado/Razonamiento/Accion/Ajuste) hasta cumplir STOP.
user_invocable: true
---

# ultraia-request — plantilla universal de requests + bucle IA

Harness de requests verificado 18/08/2026 (ciclo 57, fuente FundamentosDeLaProgramacion Bloque B).
Complementa a `loop-piv` (protocolo del bucle PIVR): este skill estructura EL REQUEST individual,
`loop-piv` estructura EL CICLO de desarrollo. Se aplican las reglas de `loop-constraints.md`.

## Patron de bucle IA (4 fases) — obligatorio en cada request

Cada request se ejecuta como un bucle cerrado de 4 fases, iterando hasta que se cumpla STOP:

1. **Sensado** — leer el estado real: archivos, evidencia, gates, lock, presupuesto. NUNCA inventar
   estado. (En el harness: STATE.md, run-log, LEARNINGS, `git status`, lock de sesion.)
2. **Razonamiento** — formular hipotesis y el plan del paso: que se va a hacer, por que, que se
   espera medir (target). Predecir el resultado ANTES de actuar.
3. **Accion** — ejecutar el paso minimo con las tools del proyecto (edit/run/test). Staging
   explicito; un commit por iteracion con gates verdes.
4. **Ajuste** — medir contra la metrica/target, comparar con la prediccion, registrar la leccion
   (LEARNINGS.md) y decidir: continuar (si hay mejora) o parar (si STOP).

Reglas del bucle:
- Max 3 reintentos por item (loop-constraints). Si sigue fallando -> escalar a High Priority.
- Cada iteracion debe consumir presupuesto (ver `loop-budget`: tokens Y tiempo).
- Si el target se alcanza -> parar (no sobre-optimizar).
- Si la mejora < umbral N veces seguidas -> parar (rendimientos decrecientes).
- Registrar el JSON de la config del loop al iniciar y el resultado al terminar.

## Plantilla de request (13 campos)

Copia este bloque y completalo. Un request sin estos campos esta incompleto y debe devolverse.

```markdown
1. **ROLE**: <rol experto unico: Senior Software Architect, QA Engineer, Data Scientist...>
2. **OBJECTIVE**: <que se quiere lograr, en una frase MEDIBLE>
3. **CONTEXT**: <estado actual verificado: paths, evidencia, gates, lock, versiones; NUNCA inventar>
4. **INPUT**: <datos de entrada exactos: archivos, queries, parametros, formatos>
5. **CONSTRAINTS**: <restricciones: keyless-first, determinista, sin deps nuevas, offline,
   encoding UTF-8, no tocar paths denylisted, no inventar datos>
6. **RESOURCES**: <recursos disponibles: tools, scripts, skills, fuentes, modelos configurados>
7. **PROCESS**: <pasos del proceso en orden, cada paso con su archivo/artefacto resultante>
8. **VALIDATION**: <como se valida: gates, tests, grep de evidencia, verifier>
9. **SUCCESS CRITERIA**: <criterios de exito EXPLICITOS: umbrales numericos, tests PASS,
   gates GREEN, commit con hash>
10. **FAILURE POLICY**: <que hacer si falla: fail-soft, degradacion elegante, escalar a
    High Priority, NO romper el sistema>
11. **RETRY POLICY**: <reintentos: max 3, backoff, cuando abandonar>
12. **STOP CONDITIONS**: <condiciones de parada: target alcanzado OR max iteraciones OR
    mejora < umbral x veces>
13. **METRICA / TARGET**: <metrica unica de exito + valor objetivo; ej: tests 19/19 PASS,
    PSNR > 40 dB, build 43 paginas>
```

## Config declarativa de loop (JSON)

Formato maquina-parseable que se registra en loop-run-log.md al iniciar cada request:

```json
{
  "objetivo": "<frase medible>",
  "metrica": "<nombre de la metrica>",
  "target": <valor numerico o criterio>,
  "restricciones": ["keyless-first", "determinista", "no tocar llm.ts (sesion r55)"],
  "loop": { "maxIteraciones": 3, "patron": "sensed/razonar/actuar/ajustar" },
  "stop": {
    "targetAlcanzado": true,
    "maxIteraciones": 3,
    "sinMejora": { "umbral": 0.001, "veces": 5 }
  },
  "failure": { "politica": "fail-soft", "degradacion": "keyless", "escalarA": "High Priority" }
}
```

## Prioridades P0-P5 (para planes y backlog)

| Prioridad | Definicion | Ejemplo UltraIa |
|---|---|---|
| P0 | Bloqueante/seguridad: rompe gates, filtra secrets, corrompe datos | secretos en .env, gates RED |
| P1 | Alta: feature del backlog activo, bloquea a otra tarea | capabilities 58-61, wiring tools |
| P2 | Media: mejora verificable, backlog normal | adapters de canal, UI polish |
| P3 | Baja: nice-to-have, sin deadline | docs menores, refactor cosmetico |
| P4 | Deuda: postergable indefinidamente | limpiar encoding `�` de docs viejos |
| P5 | Descartable/idea sin validar: NO planificar hasta validar | ideas de enlaces.txt sin analizar |

## Integracion con el harness PIVR

- **Plan file**: usar la plantilla ampliada de `loop-piv` (incluye RECURSOS/PRESUPUESTO,
  NO-hacer, TOLERANCIAS, prioridades P0-P5).
- **Presupuesto**: `loop-budget` ahora mide tokens Y tiempo (max time/day por loop).
- **Verificacion**: `loop-verifier` (APROBAR/REJECT) + `state-integrity-check` antes de confiar
  en STATE.md.
- **Concurrencia**: `loop-concurrency-guard` — verificar el lock ANTES de numerar tareas nuevas.

## Ejemplo minimo (adaptacion de un request real, ciclo 56)

```markdown
1. **ROLE**: Research Engineer
2. **OBJECTIVE**: Mapear las 31 practicas del Bloque B contra el harness PIVR y listar gaps.
3. **CONTEXT**: learning/sources/fundamentos-programacion.md (fuente), harness en .opencode/skills/.
4. **INPUT**: Bloque B del transcript (secciones 1-31).
5. **CONSTRAINTS**: no inventar; verificar claims con grep del codigo.
6. **RESOURCES**: grep, read, codigo en packages/core/src.
7. **PROCESS**: leer fuente -> mapear 1:1 -> verificar con grep -> escribir RAZONAMIENTO-*.md.
8. **VALIDATION**: cada claim tiene su grep; docs-only sin gates de codigo.
9. **SUCCESS CRITERIA**: docs/RAZONAMIENTO-FUNDAMENTOS-PROGRAMACION.md con mapeo completo.
10. **FAILURE POLICY**: degradar a fuente resumida; escalar si no hay evidencia.
11. **RETRY POLICY**: max 3 greps por claim.
12. **STOP CONDITIONS**: mapeo completo OR 3 pasadas sin nueva informacion.
13. **METRICA/TARGET**: gaps identificados >= 4 con evidencia.
```
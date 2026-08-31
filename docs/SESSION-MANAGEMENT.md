# Session Management System

Sistema de gestión de sesiones para UltraIa. Captura interacciones, verifica builds, y sugiere mejoras automáticamente.

## Componentes

### 1. Session Logger (`scripts/session_logger.py`)

Captura cada interacción (request/response) entre el agente y el usuario.

**Uso:**
```bash
# Build check (OBLIGATORIO al inicio de cada sesión)
python scripts/session_logger.py build-check

# Iniciar sesión
python scripts/session_logger.py start <session_id>

# Loggear interacciones
python scripts/session_logger.py log <session_id> user "Petición del usuario"
python scripts/session_logger.py log <session_id> assistant "Respuesta del agente"
python scripts/session_logger.py log <session_id> tool "Output de herramienta"

# Cerrar sesión
python scripts/session_logger.py end <session_id> "Resumen"

# Ver resumen
python scripts/session_logger.py summary
```

### 2. Auto-Improve (`scripts/auto_improve.py`)

Analiza sesiones y sugiere mejoras a loops, doctor, y configuración.

**Uso:**
```bash
# Analizar sesiones y sugerir mejoras
python scripts/auto_improve.py analyze

# Generar plan de mejoras
python scripts/auto_improve.py generate-plan

# Ver salud del loop
python scripts/auto_improve.py loop-health

# Aplicar mejoras auto-aprobadas
python scripts/auto_improve.py apply
```

### 3. Session Capturer Skill (`.opencode/skills/session-capturer/SKILL.md`)

Skill que el agente carga automáticamente para mantener memoria de sesiones.

## Flujo de Trabajo

### Al inicio de cada sesión

1. **Build check**: `python scripts/session_logger.py build-check`
   - Verifica typecheck core + runtime
   - Si falla → NO continuar hasta arreglar
   - Resultado guardado en `sessions/last_build_check.json`

2. **Start session**: `python scripts/session_logger.py start <id>`
   - Crea archivo en `sessions/<date>/<id>.md`

### Durante la sesión

3. **Log interactions**: Después de cada interacción significativa
   - User requests
   - Assistant responses
   - Tool outputs
   - Build/test results

### Al cerrar la sesión

4. **End session**: `python scripts/session_logger.py end <id> "summary"`

5. **Auto-analyze**: `python scripts/auto_improve.py analyze`
   - Identifica patrones de errores
   - Detecta archivos modificados frecuentemente
   - Sugiere mejoras de procesos

### Mejora continua

6. **Generate plan**: `python scripts/auto_improve.py generate-plan`
   - Crea `sessions/improvement-plan-<date>.md`
   - Lista mejoras con prioridad
   - Marca cuáles son auto-aplicables

7. **Apply improvements**: `python scripts/auto_improve.py apply`
   - Aplica mejoras auto-aprobadas
   - Las que requieren decisión se discuten en chat

## Archivos Generados

| Archivo | Descripción |
|---------|-------------|
| `sessions/<date>/<id>.md` | Transcripción completa de la sesión |
| `sessions/INDEX.md` | Índice maestro de todas las sesiones |
| `sessions/last_build_check.json` | Último resultado de build check |
| `sessions/improvements.jsonl` | Log de mejoras sugeridas/aplicadas |
| `sessions/improvement-plan-<date>.md` | Planes de mejora generados |

## Integración con Loop PIVR

El sistema se integra con el protocolo PIVR:

- **P (Plan)**: Se loggea el plan generado + build check
- **I (Implement)**: Se loggean commits y cambios
- **V (Verify)**: Se loggean resultados de gates (typecheck/lint/test/build)
- **R (Restart)**: Se genera resumen + auto-analyze

## Decisiones de Mejora

Cuando `auto_improve.py` encuentra una mejora:

1. **Auto-apply**: Se aplica automáticamente en el próximo ciclo
2. **Needs decision**: Se muestra en el output, se discute en chat
3. **Se guarda** en `sessions/improvements.jsonl` para historial
4. **Se genera plan** en `sessions/improvement-plan-<date>.md`

## Ejemplo de Uso Completo

```bash
# 1. Build check
python scripts/session_logger.py build-check
# Output: BUILD CHECK: ALL PASS

# 2. Start session
python scripts/session_logger.py start iter-150-orchestrator
# Output: OK: Session iter-150-orchestrator started

# 3. [El agente trabaja, loggea interacciones]
python scripts/session_logger.py log iter-150-orchestrator user "Implementa el orquestador local"
python scripts/session_logger.py log iter-150-orchestrator assistant "Plan: crear ollama-router.ts..."

# 4. [Build y tests pasan]
python scripts/session_logger.py log iter-150-orchestrator tool "57/57 tests PASS"

# 5. Cerrar sesión
python scripts/session_logger.py end iter-150-orchestrator "Orquestador implementado y commiteado"

# 6. Analizar para mejoras
python scripts/auto_improve.py analyze
# Output: SUGGESTED IMPROVEMENTS (2)
#   1. [HIGH] Build failed 3 times → add pre-commit check [AUTO-APPLY]
#   2. [MEDIUM] File modified 5 times → consider refactor [NEEDS DECISION]

# 7. Generar plan
python scripts/auto_improve.py generate-plan
# Output: Plan written to sessions/improvement-plan-20260831.md
```

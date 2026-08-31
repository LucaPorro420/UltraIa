# Agent Session Capturer

Captura cada interacción (request/response) entre el agente y el usuario en sessions/.

## Uso automático (recomendado)

Al inicio de cada sesión, el agente DEBE ejecutar un solo comando:

```bash
python scripts/session_logger.py auto "objetivo de la sesión"
```

Esto hace: build-check + start session + log goal en un paso.
El session ID se genera automáticamente (ses-YYYYMMDD-HHMMSS).

## Uso manual

```bash
# Iniciar sesión
python scripts/session_logger.py start mi-sesion

# Loggear interacción
python scripts/session_logger.py log mi-sesion user "Mi petición"
python scripts/session_logger.py log mi-sesion assistant "Mi respuesta"
python scripts/session_logger.py log mi-sesion tool "Output de herramienta"

# Cerrar sesión
python scripts/session_logger.py end mi-sesion "Resumen de lo hecho"
```

## Build check

```bash
# Verificar build al inicio (OBLIGATORIO)
python scripts/session_logger.py build-check

# Ver último check
python scripts/session_logger.py last-check
```

## Auto-improve

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

## Archivos generados

- `sessions/<date>/<session_id>.md` — Transcripción completa de la sesión
- `sessions/INDEX.md` — Índice maestro de todas las sesiones
- `sessions/last_build_check.json` — Último resultado de build check
- `sessions/improvements.jsonl` — Log de mejoras sugeridas/aplicadas
- `sessions/improvement-plan-<date>.md` — Planes de mejora generados

## Integración con el loop PIVR

El session logger se integra con el protocolo PIVR:

- **P (Plan)**: Se loggea el plan generado
- **I (Implement)**: Se loggean los commits y cambios
- **V (Verify)**: Se loggean los resultados de gates
- **R (Restart)**: Se genera el resumen de la iteración

## Decisiones de mejora

Cuando `auto_improve.py` encuentra una mejora que requiere decisión humana:

1. Se muestra en el output del `analyze`
2. Se guarda en `sessions/improvements.jsonl`
3. Se genera un plan en `sessions/improvement-plan-<date>.md`
4. El usuario decide en el chat: "aplica la mejora X"
5. Se ejecuta `auto_improve.py apply` o se implementa manualmente

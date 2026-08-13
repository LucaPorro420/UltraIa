---
name: learning-memory
description: |
  Carga la memoria de aprendizaje verificada de UltraIa (learning/memory/ultraia_memory.zip).
  Provee esquemas de consulta verificados (truth), veredictos y lecciones aprendidas para
  reutilizar en nuevos prompts. Usar cuando se necesite: generar una consulta verificable,
  reutilizar un esquema de truth, o recordar lecciones de prompts anteriores.
---

# Memoria de aprendizaje de UltraIa

## Cómo cargar la memoria

```bash
python "learning/scripts/restore_memory.py" summary   # resumen de esquemas + lecciones
python "learning/scripts/restore_memory.py" schemas   # solo esquemas de truth
python "learning/scripts/restore_memory.py" extract   # restaurar archivos completos
```

## Cómo generar nueva memoria verificada (loop de aprendizaje)

1. **Crear verdad** (guardar aparte, nunca usar la respuesta del modelo como verdad):
   - math: `python learning/scripts/gen_truth_math.py`
   - live (APIs): `python learning/scripts/gen_truth_live.py`
   - hechos de archivos: `python learning/scripts/gen_truth_gstack.py`
   - Copiar truth_*.json a `learning/truth/`
2. **Pedir respuesta** → guardar en `learning/responses/<id>/attempt_N.json` (campo `answer`)
3. **Verificar**: `python learning/scripts/verify.py <id> <ruta_respuesta.json>`
4. **Si FAIL** → mejorar el prompt (contexto/API exacta/campo crudo) → reintentar (máx 3)
5. **Reportar**: `python learning/scripts/run_loop.py report`

## Empaquetar memoria (ahorra espacio, persiste conocimiento)

```bash
python learning/scripts/bundle_memory.py build   # genera learning/memory/ultraia_memory.zip
```

## Reglas de la memoria (verificadas en el loop)

- API directa > búsqueda web para datos numéricos live
- Pedir campos crudos exactos (`time_last_update_utc`, `current.temperature_2m`)
- El tipo de comparación (exact/approx/dict/text) viene de la verdad, no de la respuesta
- PowerShell 5.1 rompe JSON con comillas dobles en argv → escribir archivos por Write

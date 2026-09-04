# LOOP-PIVR — El ciclo de desarrollo del proyecto

> **Patrón:** Plan → Implement → Verify → Restart (Reiniciar)
> **Driver:** `scripts/loop_piv.py`
> **Estado:** `STATE.md` + `loop-run-log.md`

---

## 1. ¿Qué es el LOOP-PIVR?

Es como el **ciclo de un videojuego**:planeas tu movimiento, lo ejecutas, verificas si funcionó, y si no, aprendes e intentas de nuevo.

```
┌─────────────────────────────────────────┐
│                                         │
│    ┌─────┐    ┌──────────┐             │
│    │  P  │───▶│    I     │             │
│    │Plan │    │Implement │             │
│    └─────┘    └────┬─────┘             │
│                    │                    │
│                    ▼                    │
│               ┌──────────┐             │
│               │    V     │             │
│               │  Verify  │             │
│               └────┬─────┘             │
│                    │                    │
│                    ▼                    │
│               ┌──────────┐             │
│               │    R     │             │
│               │ Restart  │             │
│               └──────────┘             │
│                                         │
└─────────────────────────────────────────┘
```

---

## 2. Las 4 fases

### Fase P: Plan (Planea)

**Qué haces:** Lees qué falta, escribes un plan de qué hacer.

```markdown
## Plan para iteración 173

### Objetivo
Crear una herramienta que genere GIFs animados

### Pasos
1. Crear archivo `gif.ts` en `packages/core/src/tools/`
2. Implementar lógica de generación
3. Agregar tests
4. Registrar en `index.ts`
```

### Fase I: Implement (Ejecuta)

**Qué haces:** Escribes el código siguiendo el plan.

```typescript
// packages/core/src/tools/gif.ts
export function generateGif(prompt: string) {
  // Lógica aquí
}
```

### Fase V: Verify (Verifica)

**Qué haces:** Corres los tests y verificas que todo funciona.

```bash
npm run typecheck    # ¿El código está bien escrito?
npm run lint         # ¿El código es limpio?
npm run test         # ¿Los tests pasan?
npm run build        # ¿Se puede compilar?
```

### Fase R: Restart (Reinicia)

**Qué haces:** Si todo pasó, commit y siguiente tarea. Si no, aprende e intenta de nuevo.

```bash
git add packages/core/src/tools/gif.ts
git commit -m "feat(tools): add GIF generator"
```

---

## 3. Archivos importantes

| Archivo | Qué contiene |
|---------|--------------|
| `STATE.md` | Estado actual del proyecto (qué está hecho, qué falta) |
| `loop-run-log.md` | Historial de todas las iteraciones |
| `loop-constraints.md` | Reglas vinculantes del bucle |
| `loop-budget.md` | Presupuesto de tokens y tiempo |
| `.opencode/plans/` | Planes de cada iteración |

---

## 4. Comandos del driver

```bash
# Correr un ciclo completo
python scripts/loop_piv.py --cycles 1

# Solo el plan (sin ejecutar)
python scripts/loop_piv.py --plan-only

# Solo verificar gates
python scripts/loop_piv.py --gate-only

# Triage (analizar qué hacer)
python scripts/loop_piv.py --triage

# Verificar integridad del estado
python scripts/loop_piv.py --doctor
```

---

## 5. Reglas importantes

1. **NUNCA `git add .`** — Siempre agregar archivos específicos
2. **Gates ANTES de commit** — typecheck → lint → test → build
3. **Un commit por iteración** — No mezclar cambios
4. **Plan en archivo** — No solo en el prompt
5. **Verificar antes de afirmar** — Evidencia antes que assertions

---

## 6. Ejemplo completo

```bash
# 1. Plan
# Leer STATE.md, ver qué falta
# Escribir plan en .opencode/plans/loop-173-mi-herramienta.md

# 2. Implement
# Crear archivos, escribir código

# 3. Verify
npm run typecheck
npm run lint
npm run test
npm run build

# 4. Commit (si todo pasó)
git add packages/core/src/tools/mi-herramienta.ts
git commit -m "feat(tools): add mi-herramienta"

# 5. Restart
# Volver al paso 1 con la siguiente tarea
```

---

## 7. Problemas comunes

| Problema | Causa | Solución |
|----------|-------|----------|
| "Gate failed" | Error en el código | Arreglar y volver a verificar |
| "Commit rejected" | Gates rojos | Asegurar que todo pase |
| "STATE.md desync" | Estado no actualizado | Correr `state_doctor.py` |

---

## 8. Referencias

- [LOOP.md](LOOP.md) — Configuración del bucle
- [STATE.md](STATE.md) — Estado actual
- [loop-constraints.md](loop-constraints.md) — Reglas vinculantes

---

**Última actualización:** 2026-09-04

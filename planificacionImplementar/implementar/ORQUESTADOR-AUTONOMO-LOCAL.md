# Orquestador Autonomo Local — Sin APIs, Sin Tokens, Sin Costo

**ESTADO**: Planificado, NO implementado.
**REVISION**: Solo si el usuario lo pide explicitamente.

---

## Que es

Un sistema de orquestadores multiples que trabajan en paralelo usando modelos
locales (Ollama) para planificar, implementar y verificar codigo de forma
autonoma, sin depender de APIs externas ni tokens.

## Por que

- **Costo cero**: los modelos corren en tu PC
- **Privacidad**: el codigo nunca sale de tu maquina
- **Autonomia real**: puede trabajar de noche sin supervision
- **Escalable**: cada orquestador es independiente

## Arquitectura

```
Tarea del usuario
       │
       ▼
┌──────────────────┐
│   Coordinador    │  Decide que modelo usar para cada fase
│   (nuevo)        │  Lee el contexto de memoria compartida
└────────┬─────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌────────┐
│Plan    │ │Coder   │
│(Phi-3) │ │(Deep   │
│razona- │ │Seek)   │
│miento  │ │genera  │
│        │ │codigo  │
└───┬────┘ └───┬────┘
    │          │
    └────┬─────┘
         │
         ▼
┌────────────────┐
│  Verificador   │  Genera tests, corre gates
│  (CodeLlama)   │  Si falla → reintenta
└────────┬───────┘
         │
         ▼
    Commit + Push
```

## Modelos Locales Requeridos

| Modelo | Tamano | Uso | Comando Ollama |
|--------|--------|-----|----------------|
| Phi-3 3.8B | ~2GB | Razonamiento, planes | `ollama pull phi3` |
| DeepSeek Coder 6.7B | ~4GB | Generacion de codigo | `ollama pull deepseek-coder` |
| CodeLlama 7B | ~4GB | Tests, verificacion | `ollama pull codellama` |
| Llama3 8B | ~5GB | Texto general, docs | `ollama pull llama3` |

**Total**: ~15GB de disco. Funciona con 8GB RAM minimo.

## Archivos a Crear

### 1. `packages/runtime/src/adapters/ollama-router.ts`

Enrutador de modelos locales. Decide que modelo usar segun la tarea.

```typescript
interface OllamaRouter {
  route(task: 'plan' | 'code' | 'test' | 'docs'): ModelConfig
  generate(prompt: string, model: string): Promise<string>
  health(): Promise<boolean>
}
```

### 2. `packages/runtime/src/orchestrator/specialized.ts`

Orquestadores especializados. Cada uno tiene un modelo y una especialidad.

```typescript
interface SpecializedOrchestrator {
  name: string
  model: string
  execute(task: Task): Promise<Result>
}

// Planificador: recibe tarea → genera plan paso a paso
// Coder: recibe plan → genera codigo con tipos
// Verificador: recibe codigo → genera tests y corre gates
```

### 3. `packages/runtime/src/orchestrator/coordinator.ts`

Coordinador que orquesta los 3 especializados.

```typescript
interface Coordinator {
  run(task: string): Promise<CommitResult>
  // 1. Planificador genera plan
  // 2. Coder implementa cada paso
  // 3. Verificador genera tests
  // 4. Si falla → reintenta (max 3)
  // 5. Commit automatico
}
```

### 4. `packages/runtime/src/orchestrator/memory.ts`

Memoria compartida entre orquestadores.

```typescript
interface SharedMemory {
  save(context: Context): void
  query(topic: string): Context[]
  // Almacena: planes pasados, exitos, fallos, lecciones
}
```

## Flujo de Trabajo

```
1. Usuario: "Implementa la capability X"
2. Coordinador: recibe tarea
3. Planificador (Phi-3):
   - Analiza la tarea
   - Genera plan con 3-7 pasos
   - Guarda plan en memoria
4. Coder (DeepSeek):
   - Recibe cada paso del plan
   - Genera archivo .ts con tipos
   - Guarda en disco
5. Verificador (CodeLlama):
   - Genera test file
   - Corre npm run typecheck
   - Si falla → feedback al Coder
   - Si pasa → siguiente paso
6. Coordinador:
   - Si todo OK → git add + commit
   - Si fallo max 3 veces → escala a humano
```

## Restricciones

- **Sin APIs**: solo Ollama local, sin conexion a internet
- **Sin tokens**: no se usan claves API de ningun proveedor
- **Sin costo**: todo corre en tu hardware
- **Con limits**: max 3 reintentos por tarea, max 10 archivos por ciclo
- **Con supervision**: al finalizar, vos verificas los commits

## Integracion con UltraIa

Se integra con los sistemas existentes:

- `@ultraia/runtime` (Local API en 127.0.0.1)
- `semantic-memory.ts` (memoria compartida)
- `cerebro-cycle.ts` (ciclo autonomo)
- `loop_piv.py` (driver PIVR)

El coordinador reemplaza al agente de IA en el loop PIVR cuando esta en modo
"local-only". Si Ollama no esta disponible, degrada a usar las tools
deterministas existentes (sin LLM).

## Requisitos

- [ ] Ollama instalado (`winget install Ollama.Ollama`)
- [ ] Modelos descargados (~15GB)
- [ ] 8GB RAM libre
- [ ] Node.js >= 20

## Testing

```bash
# 1. Correr Ollama
ollama serve

# 2. Verificar modelos
ollama list

# 3. Correr tests
npm run test -- --grep "orchestrator"

# 4. Probar end-to-end
npm run orchestrator:local -- "Crea una tool que valide emails"
```

## Documentos Relacionados

- `desktopFase/ARCHITECTURE.md` — Fase B del runtime
- `docs/CEREBRO.md` — Ciclo autonomo existente
- `AGENTS.md` — Protocolo PIVR
- `learning/LEARNINGS.md` — Lecciones aprendidas

---

**NOTA**: Este archivo es solo documentacion. No hay codigo implementado.
Revision solo si el usuario lo pide.

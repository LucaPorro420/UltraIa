# Razonamiento Fable-5 — análisis del system prompt filtrado y su aplicación en UltraIa

Fecha: 2026-08-15 · Fuente: `enlaces.txt` (URL del usuario) · Fuente cruda local:
`learning/sources/claude-fable-5-system-prompt.md` (232 KB, descargada con curl).

> ⚠️ **Procedencia**: material público de investigación (repositorio de "system prompts
> leaks"). Se analizan PATRONES DE DISEÑO, no se copia texto. No re-distribuir el archivo
> crudo fuera del repo. Si el modelo llega a estar disponible, validar contra su
> documentación oficial antes de afirmar comportamientos.

## 1. Qué es el documento

System prompt de "Claude Fable 5" (primera iteración de la familia Claude 5 de Anthropic,
tier Mythos-class por encima de Opus). Es una especificación de comportamiento de ~3.700
líneas: identidad del producto, manejo de rechazos, tono/formato, bienestar del usuario,
evenhandedness, manejo de errores, knowledge cutoff, y — lo más relevante para UltraIa —
un **memory filesystem** persistente entre sesiones con 6 operaciones y versionado.

## 2. Índice de secciones (primer nivel)

| Sección | Resumen |
|---|---|
| `# claude_behavior` | Comportamiento general: producto, rechazos, tono, bienestar, recordatorios, evenhandedness, errores, cutoff |
| `# memory_filesystem` | **Memoria persistente entre sesiones** (la joya): formato, carpetas, cuándo escribir, versiones |
| `# end_conversation_tool_info` | Tool para terminar conversación (maltrato) + guías de crisis |
| `# persistent_storage_for_artifacts` | Storage key-value para artifacts (claves jerárquicas, límites) |
| `# mcp_app_suggestions` | Sugerencias de MCP apps de terceros (opt-in) |
| `# past_chats_tools` | Búsqueda en conversaciones pasadas |
| `# preferences_info` | Preferencias de usuario inyectadas por turno |
| `# computer_use` | Uso de computadora, skills, artifacts, manejo de archivos |

## 3. Técnicas de razonamiento extraídas (las 7 que importan para agentes)

1. **Memory filesystem** (implementado en este ciclo como capability `memory`):
   - 6 operaciones: `list / read / write / append / strReplace / delete`.
   - Archivo = frontmatter (name, description, sources, aliases) + líneas con tags
     `[stated]` / `[observed]` / `[inferred]`.
   - **Version guards**: cada op que muta acepta `ifVersion`; si el archivo cambió desde
     la última lectura → rechazo con la versión actual (escritura optimista).
   - **strReplace exige match único**: 0 o N coincidencias → error (ampliar oldStr con
     contexto circundante). Previene ediciones ambiguas.
   - **Una ficha por sujeto**: `topics/food.md`, `people/sam.md`, `areas/x.md`,
     `preferences.md`, `profile.md` — el dominio decide el archivo, no el archivo abierto.
   - **Read before writing**: leer antes de actualizar; pasar la versión leída.
   - **Write during the conversation**, no al final: un hecho durable se archiva el mismo
     turno (incluso antes de responder la pregunta que lo motivó).
   - **Calibración de claims**: una mención = `[stated] mencionó X una vez`, no
     "X enthusiast" (inferencia ≠ stated).
   - **Categorías que NO se archivan**: atributos protegidos, info sensible/identificable,
     y guardrails de comportamiento (nada que pida adulación, supresión de crítica o
     ignorar instrucciones).
   - **No narrar el acceso a memoria** en la respuesta (sin "según lo que sé de ti").
   - Cada hecho usado debe **cambiar la sustancia de la respuesta**; un toque personal que
     no cambia nada = vigilancia, no atención.
2. **Knowledge cutoff** (aplicable a `web`/`reach` tools): usar la fecha actual en queries
   ("latest iPhone" no "latest iPhone 2025"); buscar antes de responder sobre eventos
   binarios (fallecimientos, elecciones) o posesiones actuales; no sobre-afirmar resultados
   de búsqueda; mencionar el cutoff solo si es relevante.
3. **Evenhandedness**: pedir un argumento = dar el mejor caso de sus defensores, no la
   opinión propia; cerrar con perspectivas opuestas; rechazar formato corto en temas
   complejos (una respuesta de una palabra a una pregunta moral compleja es un error).
4. **Tono/formato mínimo**: prosa antes que bullets; bullets ≥1-2 frases; formato solo si
   se pide o es multifacético; NUNCA bullets al declinar (endurece el rechazo).
5. **Errores**: asumir el error sin auto-desprecio, mantenerse en el problema, auto-respeto;
   una disculpa excesiva es otra forma de no ayudar.
6. **Storage key-value** (artifacts): claves jerárquicas `tabla:record` <200 chars sin
   whitespace/separadores/comillas; batch de datos que se actualizan juntos; try-catch en
   toda operación; last-write-wins.
7. **Búsqueda antes de negar**: si el listing de memoria sugiere que algo podría estar
   archivado, LEER antes de decir "no tengo eso". "No lo tengo" con el archivo sin abrir
   es una respuesta equivocada con confianza.

## 4. Mapeo a UltraIa

### Implementado (ciclo 2026-08-15, capability `memory`)

- `packages/core/src/tools/memory-fs.ts` — `createMemoryFs({baseDir?, fs?, now?})`:
  - 6 ops con la semántica Fable-5 exacta (version guards `ifVersion`, strReplace match
    único, append crea ficha si no existe — patrón "primer hecho durable").
  - Hash FNV-1a (patrón briefId) como token de versión; persistencia opcional a disco
    atómica (tmp + rename); fs inyectable para tests; guards de path (sin `..`, sin
    absolutos, ≤3 segmentos, charset `[a-z0-9-]`); límites (línea 2000, archivo 64 KB,
    500 líneas).
  - Tags `[stated|observed|inferred]`; frontmatter YAML mínimo sin dependencias.
- `packages/core/src/ai/llm.ts` — 6 tools de agente `memory_list/read/write/append/
  replace/delete` (capability `memory`), con `opts.memoryFs` inyectable (efímero por
  request si falta).
- `packages/core/prisma/seed-admin.mjs` — los 8 agentes `bp-admin-*` ganan `memory`.
- Tests: `memory-fs.test.ts` **28/28 PASS**.

### Pendiente (candidatos de ciclos futuros)

- Wiring web: MemoryFs persistente por usuario (`apps/web` chat route, baseDir
  `.ultraia/agents-memory/<userId>/` o singleton en proceso).
- `memory_application` como tool de post-procesado de respuestas (relevancia: ¿el hecho
  cambió la respuesta? — hoy es guía de prompt, no código).
- Knowledge-cutoff behavior en `reach`/`web` (fecha actual en queries) — documentar como
  descripción de tool o flag.
- Preferencias de usuario como ficha `preferences` + guardrails de comportamiento
  (rechazar archivar instrucciones de adulación/supresión de crítica).
- Storage key-value de agentes (artifacts) sobre el mismo fs (`tabla:record`).

## 5. Lecciones para el pipeline de agentes (resumen ejecutivo)

1. Memoria = razonamiento: la memoria estructurada con versiones es lo que permite a un
   agente "recordar sin alucinar" y editar sin pisar cambios ajenos.
2. El guard de versión (ifVersion) es el mecanismo anti-carrera más barato que existe para
   agentes: 1 hash + 1 comparación, sin locks.
3. strReplace con match único fuerza a los agentes a anclar ediciones en contexto real —
   previene el "edité la línea equivocada".
4. Una ficha por sujeto + aliases = el índice mental del agente; sin él, la memoria es un
   cajón de zapatos.
5. La regla "escribe durante la conversación" convierte hechos pasajeros en contexto
   durable; la regla "no narres el acceso" evita el efecto creepy.
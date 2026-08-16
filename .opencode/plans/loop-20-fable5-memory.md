# PLAN: Aprender del system prompt Fable 5 — memory filesystem para agentes (tarea #20 de STATE.md)

Fecha: 2026-08-15 · Modo: plan→build (autorizado por el usuario)

## Contexto
- El usuario dejó la URL `https://github.com/asgeirtj/system_prompts_leaks/blob/main/Anthropic/claude-fable-5.md` en `enlaces.txt` y pidió: "utiliza la url de enlaces.txt para mejorar y aprender otro modelo de razonamiento. A partir de ahora te dejaré enlaces en ese archivo para que lo analices y utilices. cambia al modo build cuando lo necesites".
- Fuente descargada y verificada: `learning/sources/claude-fable-5-system-prompt.md` (232 KB, curl exitoso). Es el system prompt filtrado de Claude Fable 5 (modelo Mythos-class de Anthropic).
- Análisis realizado (índice de secciones + lectura de memory_filesystem / memory_application / persistent_storage / knowledge_cutoff / evenhandedness / tone):
  1) **Memory filesystem** — el patrón más distintivo: 6 operaciones (read/write/append/str_replace/list/delete), frontmatter YAML (name/description/sources/aliases), tags [stated]/[observed]/[inferred], ficheros por dominio (/profile, /topics/, /areas/, /people/, /preferences), read-before-writing con `if_version` (optimistic concurrency), str_replace con match ÚNICO (0 o varios → rechazo), una-ficha-por-sujeto, calibración de claims, write durante la conversación sin que se pida, categorías que NO se archivan (protected/sensitive/identifiable + behavioral_guardrails), no narrar el acceso a memoria en la respuesta.
  2) **Storage API** (persistent_storage_for_artifacts): claves jerárquicas `tabla:record`, <200 chars sin whitespace/slashes/comillas, valores <5MB, last-write-wins, batch de datos relacionados, try-catch en toda op.
  3) **knowledge_cutoff**: usar la fecha actual en queries de búsqueda; buscar antes de responder eventos binarios/posesiones; no sobre-afirmar resultados; mencionar cutoff solo si es relevante.
  4) **evenhandedness**: pedir un argumento = dar el mejor caso de sus defensores + perspectivas opuestas; rechazar formato corto en temas complejos.
  5) **lists_and_bullets**: formato mínimo en prosa (bullets ≥1-2 frases, solo si se pide o es multifacético); nunca bullets al declinar.
  6) **responding_to_mistakes**: asumir errores sin auto-desprecio; mantenerse en el problema; auto-respeto.
  7) **memory_application**: cada hecho usado debe cambiar la sustancia de la respuesta; esperar a que el usuario traiga temas sensibles; nunca aplicar memorias que desalienten honestidad/crítica.
- Los agentes admin de UltraIa (`bp-admin-*`) HOY no tienen memoria persistente entre sesiones (el MemoryManager del runtime es desktop-side) → implementar el memory filesystem como capability de agente es el "otro modelo de razonamiento" más valioso y accionable (razonamiento con memoria estructurada + versionado).

## Objetivo
- Implementar un memory filesystem para agentes en core (patrón Fable-5): `createMemoryFs` con 6 operaciones, versiones sha256 + guards `if_version`, frontmatter, tags, persistencia opcional a disco atómica, sin deps nuevas; exponerlo como capability `memory` (6 tools de agente) en los 8 agentes admin; documentar el análisis y la convención de `enlaces.txt`.

## Pasos
1. `packages/core/src/tools/memory-fs.ts` — dominio puro (fs inyectable, keyless, sin deps):
   - Types: `MemoryFile` {path, name, description, sources[], aliases[], lines[] con tags, content, version, updatedAt}; `MemoryFsOptions` {baseDir?, fs?}.
   - `parseMemoryFile(text)` / `serializeMemoryFile(file)` — frontmatter YAML mínimo determinista (clave: valor; listas [a, b]; sin dep YAML).
   - `createMemoryFs({baseDir?, fs?})` → ops:
     - `list()` → [{path, description, aliases}]
     - `read(path)` → {file} (error claro si no existe)
     - `write(path, {name, description, sources, aliases, lines}, ifVersion?)` → crea/reescribe; version guard; devuelve {version}
     - `append(path, line, ifVersion?)` → línea con tag [stated] por defecto al final; version guard
     - `strReplace(path, oldStr, newStr, ifVersion?)` → match ÚNICO (0 o varios → error MemoryConflict); version guard
     - `delete(path, ifVersion?)` → elimina (solo si version coincide)
     - `versionOf(path)` interno; hash = sha256(contenido) (crypto node — patrón MemoryManager dedup sha256(16) del runtime).
   - Guards: path normalizado (sin `..`, sin `/` inicial, ≤3 segmentos, charset seguro); línea ≤ 2000 chars; archivo ≤ 64 KB; tags válidos [stated|observed|inferred]; operación desconocida → MemoryError con mensaje claro.
   - Persistencia: en memoria (default) + opcional a disco con escritura atómica tmp+rename (patrón manifest enrutador); fs inyectable para tests (mem fs de vitest).
2. `packages/core/src/tools/index.ts` — export * './memory-fs'; `tools.memoryFs = {createMemoryFs}`; `TOOL_DESCRIPTIONS.memory` (describe el memory filesystem Fable-5-style); `Capability` gana `'memory'`.
3. `packages/core/src/ai/llm.ts` — `chatStream` opts gana `memoryFs?: MemoryFs` (inyectable; si no → efímero en memoria); capability `memory` → 6 tools:
   - `memory_list` (sin args → listing), `memory_read` (path), `memory_write` (path + campos + ifVersion?), `memory_append` (path + line + ifVersion?), `memory_replace` (path + oldStr + newStr + ifVersion?), `memory_delete` (path + ifVersion?).
   - Descripciones citando las reglas Fable-5 clave (read antes de write, ifVersion para conflictos, tags, una ficha por sujeto).
4. `packages/core/src/index.ts` — export público de memory-fs.
5. `packages/core/prisma/seed-admin.mjs` — `const caps = [...new Set([...a.caps, 'skills', 'content', 'memory'])]` → los 8 agentes admin ganan la capability `memory`.
6. Tests `packages/core/src/tools/memory-fs.test.ts` (~22): parse/serialize frontmatter (name/description/sources/aliases/lines), write/read roundtrip + version, append con tag, strReplace match único (0 matches → error, 2 matches → error, 1 → ok), delete con version guard (version stale → MemoryConflict), list, persistencia a disco (tmp dir, idempotente, atómico), guards de path (.., slashes, charset), límites (línea larga, archivo grande), paths por dominio (topics/, people/).
7. Docs:
   - `docs/RAZONAMIENTO-FABLE5.md` — análisis del leak (fuente, índice de secciones, 7 técnicas extraídas con detalle, mapeo: implementado hoy vs pendiente, riesgos/ética de usar prompts filtrados — nota de que es material público de investigación).
   - `AGENTS.md` — sección "Fuente de enlaces (enlaces.txt)": convención (el usuario deja URLs → descargar a learning/sources/, analizar, extraer lecciones a LEARNINGS.md/truth cuando aplique, implementar lo accionable).
   - `learning/LEARNINGS.md` — lecciones verificadas del análisis Fable-5.
   - `STATE.md` — fila #20 DONE + #19 (PrototypeREADME) queda pendiente + Last run.
   - `loop-run-log.md` — Iteración 20 [P]/[I]/[V]/[R].
8. Wiring web (SCOPED, decidir en build con evidencia): `apps/web/src/app/api/chat/general/route.ts` — si el route ya usa chatStream con auth, inyectar un MemoryFs por usuario (singleton en proceso keyed por userId + baseDir `.ultraia/agents-memory/<userId>/`); si agrega fricción → dejar documentado como siguiente paso (la capability funciona con memoria efímera por request).

## Archivos a tocar (staging explícito)
- `learning/sources/claude-fable-5-system-prompt.md` — NUEVO (fuente descargada)
- `enlaces.txt` — NUEVO/commiteado (la convención del usuario; contenido: la URL)
- `packages/core/src/tools/memory-fs.ts` — NUEVO (dominio memory filesystem)
- `packages/core/src/tools/memory-fs.test.ts` — NUEVO (~22 tests)
- `packages/core/src/tools/index.ts` — export + TOOL_DESCRIPTIONS + Capability 'memory'
- `packages/core/src/ai/llm.ts` — 6 tools memory_* + opts.memoryFs
- `packages/core/src/index.ts` — export memory-fs
- `packages/core/prisma/seed-admin.mjs` — caps + 'memory'
- `docs/RAZONAMIENTO-FABLE5.md` — NUEVO (análisis + técnicas)
- `AGENTS.md` — sección enlaces.txt
- `learning/LEARNINGS.md` — lecciones
- `STATE.md` — backlog #20 + Last run
- `loop-run-log.md` — Iteración 20
- (opcional, si simple) `apps/web/src/app/api/chat/general/route.ts` — memoryFs por usuario

NO se tocan: packages/runtime, desktopFase (Iteración 17 en curso en working tree: webview2-host.cs, launcher.mjs, launcher.test.ts, .gitignore, DOCS_TODO.md — ruido fuera del commit), ni PrototypeREADME/README/md2pdf (tarea #19 pendiente, ciclo siguiente).

## Criterios de verificación
- Scoped: `npx vitest run packages/core/src/tools/memory-fs.test.ts` (22/22) · typecheck core
- FULL antes de commit: `npm run typecheck` → `npm run lint` → `npm run test` (core 334 → ~356; repo 526 → ~548) → `npm run build` (pre-build: taskkill dev servers)
- Seed verificado: `npx prisma db seed` no requerido (solo código del seed; aplicar al re-seedear)
- Commit: `feat(core): memoria de agentes Fable-5 - memory filesystem (6 ops, version guards) + capability memory + docs enlaces.txt`

## Riesgos / guardas
- Staging explícito: el working tree tiene ruido de Iteración 17 + tarea #19 → `git add` SOLO de los archivos del plan
- Sha256 de node:crypto en core: verificar que no rompe edge/browser (patrón existente: MemoryManager runtime usa crypto; si core ya importa crypto en otro lado, ok — comprobar; si no, hash propio FNV-1a como enrutador briefId)
- YAML sin dep: parseador mínimo propio (frontmatter limitado) — documentar límites
- Ética/legal: el leak es material público de investigación; el doc RAZONAMIENTO-FABLE5 incluye nota de procedencia; NO copiar texto del prompt (solo patrones de diseño)
- Denylisted: .env*, auth/, payments/, secrets/, credentials/ — no aplica
- Sin push ni merge (aprobación humana)

## Esfuerzo estimado
- Medio — módulo nuevo + 6 tools + 22 tests + seed + 3 docs; patrón de repo bien establecido (tools/capabilities/llm.ts)

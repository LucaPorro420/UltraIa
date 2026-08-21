# RAZONAMIENTO-GAME-DEV — Videojuegos con IA (análisis de enlaces.txt)

- **Fuente**: `enlaces.txt` líneas 696-791 → cruda en `learning/sources/game-dev-ai.md`
- **Fecha**: 17/08/2026 · **Protocolo**: enlaces.txt (analizar → patrones → implementar → lecciones)
- **Resultado**: capability `game` (generador de juegos HTML5 keyless determinista, `packages/core/src/tools/game.ts`, 20+ tests)

## 1. Índice del bloque

| Sección del bloque | Contenido | Relevancia UltraIa |
|---|---|---|
| 1. Repositorios GitHub | awesome-ai-tools-for-game-dev · awesome-gamedev-agent-skills (67 skills auto-detectadas) · awesome-ai-built-games (juegos hechos con IA) | ALTA — patrón de skills por motor = nuestro `skills.ts`; prompts de generación de juegos |
| 2. Motores prompt-to-game | Rosebud AI (prompt → HTML/JS jugable) · GDevelop (OSS eventos+IA) · Summer Engine (Godot 4) | ALTA — Rosebud valida el modelo "prompt → HTML5 autocontenido" que implementa la capability `game` |
| 3. Programación inteligente | Cursor · Ollama + Gemma/Qwen local | MEDIA — coincide con `resolveModel()` (openai/google/ollama/lmstudio) de g0dm0d3 |
| 4. Assets gratis | Scenario (2D consistente) · Meshy/Tripo (texto→3D) · Suno (música) · ElevenLabs (voces) | MEDIA — mismos proveedores que OMAG (música: Tunetank; TTS: edge-tts); Suno/ElevenLabs = providers premium futuros del Gen-Engine |
| 5. Marketing/validación | Ludo.ai (GDD + tendencias) · Figma AI (UI prototipos) | BAJA — ya cubierto por F1 topics + F5 metrics |
| End-to-end | Summer Engine · **Claude Code Game Studios (49 agentes = estudio)** · Rosebud · GDevelop | ALTA — el patrón de estudio multi-agente es el blueprint `bp-*` de UltraIa |
| Multiplataforma | Figma AI · Unity Muse · Replit AI Game Builder | BAJA — fuera de scope web-first |
| Pensamiento/lógica | gamedev-skills · awesome-game-ai (RL/ML-Agents) · Yuan-ManX/ai-game-devtools | MEDIA — arquitectura de capas (mundo/agentes/código/texturas/shaders/3D) espeja OMAG |
| Assets on-the-fly | Scenario & Leonardo · Meshy & Tripo | BAJA-MEDIA — providers de imagen del Gen-Engine |

## 2. Patrones transferibles (los que se implementan)

1. **Prompt-to-game autocontenido** (Rosebud/Replit): un prompt → HTML/JS jugable sin build ni
   servidor. Implementado como capability `game`: templates deterministas por género
   (runner/dodge/clicker/pong/maze/quiz) con CSS+JS inline, Dark Obsidian, a11y, sin deps externas.
   Mismo ADN que `diagram` (HTML/SVG autocontenido) — el generador no llama a ningún LLM:
   es el modelo de razonamiento quien elige `genre` + `seed` + `tema`.
2. **Detección de contexto del motor** (gamedev-skills 67 skills): detectar el motor y cargar la
   lógica exacta. UltraIa ya lo hace en `skills.ts` (kinds plan/build/test/review/ship/simplify);
   la capability `game` añade `detectGenre` (keywords del prompt → género) como equivalente.
3. **Zero-asset** (flujo profesional): todo se genera (código+estilo) sin assets externos.
   `generateGame` no embebe ni pide recursos: sprites = CSS/DOM + canvas procedural.
4. **Estudio de 49 agentes** (Claude Code Game Studios): director/leader/specialist por capa.
   UltraIa ya tiene 8 agentes `bp-*` ADMIN públicos + skills `skill_*`; el blueprint de "estudio"
   queda documentado como patrón de evolución (no se implementa en este ciclo).
5. **Prompting de juegos vía ejemplos** (awesome-ai-built-games): documentado como referencia
   para el motor de ideas F1 (topics) cuando genere temas de game-dev.

## 3. Mapa implementado / pendiente

| Ítem | Estado |
|---|---|
| Capability `game` (game.ts + 20+ tests) — generador HTML5 keyless | ✅ IMPLEMENTADO (este ciclo) |
| docs/RAZONAMIENTO-GAME-DEV.md + fuente cruda learning/sources/game-dev-ai.md | ✅ COMMITEADOS |
| Wiring `game` en `ai/llm.ts`/`tools/index.ts` (capability `game` → tool `game_generate`) | ⏳ DIFERIDO — llm.ts/index.ts sucios por sesión concurrente #25 (mismo patrón que `cloud`; HIGH PRIORITY tras commit de #25) |
| Demo runner (vite-node) → resultTask/games/ | ⏳ PENDIENTE (opcional, ciclo futuro) |
| Providers premium (Suno/ElevenLabs/Meshy/Tripo) para OMAG/Gen-Engine | ⏳ PENDIENTE (requieren claves API — documentado en CLOUD-FREE-2026.md §7 como providers premium) |
| Blueprint "estudio de agentes" (49 especialistas) en seed-admin | ⏳ PENDIENTE (evolución de bp-*) |

## 4. Aplicación directa al proyecto

- Los juegos generados son publicables en `/blog` o `/gallery` (HTML autocontenido = embed trivial
  en iframe sandbox) y encajan con la cola `Publication` (canal `blog`).
- El HTML generado respeta las reglas de `diagram.ts` (sin `<script src>`, sin recursos externos,
  a11y, prefijos de IDs) → puede reutilizarse la misma política de incrustación segura.
- El patrón `detectGenre` es reutilizable por el enrutador `enrutador.ts` (brief → formato).

## 5. Enlaces sociales sin procesar (líneas 676-686 y 793-800)

`@tomassporro` (IG), `@melisaescobart_` (TikTok video 7665799501134892308), `vidrush.ai`,
`abacus.ai`, 3 posts de IG (`DcEFERhDDMg`, `DcD96B5Nd-m`, `DcGtEjOjRmp`), `@wearebrand.io`
(TikTok 7674876431779777825 + 7674875780328885536), `DcEONSaku2o`, `DcIa8O3Dvpw` — perfiles y
reels de marketing sin instrucción de procesado. **Pendiente de aclaración del usuario**
(posible relevancia: branding/video marketing para la Auto-Publicación F4). No se descargan
(requieren login/yt-dlp y no hay instrucción).
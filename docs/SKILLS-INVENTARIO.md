# SKILLS-INVENTARIO — UltraIa (18/08/2026, iteración 62)

Inventario de skills del proyecto clasificado en **recomendadas / condicionales / evitadas**.
Fuente: verificación directa de `skills/` + `.opencode/skills/` + skills globales (gstack,
~/.agents) el 18/08/2026. Las evitadas tienen copia de referencia en `.opencode/skills-avoid/`
(cuarentena NO descubierta por opencode — ver `README.md` + `manifest.json` ahí).

## Recomendadas (usar SIEMPRE según su trigger)

Skills del harness PIVR (raíz `skills/` + espejos `.opencode/skills/`, sync por hash):

| Skill | Trigger | Por qué |
|---|---|---|
| `loop-piv` | Toda tarea de desarrollo | Protocolo en-sesión PIVR (plantilla de plan ampliada, prioridades P0-P5) |
| `ultraia-request` | Toda delegación a un modelo/agente | Plantilla 13 campos + config declarativa de loop + bucle IA 4 fases (Sensado/Razonamiento/Acción/Ajuste) |
| `loop-constraints` | Inicio de cada run | Reglas vinculantes (pathspec, gates, denylist) |
| `loop-concurrency-guard` | Antes de tomar cualquier tarea | Lock de sesión + cuarentena WIP ajeno |
| `loop-budget` | Inicio/fin de cada iteración | Presupuesto tokens Y tiempo (early-exit 80/100%) |
| `loop-triage` | Arranque de día / "triage" | Report-only de High Priority / Watch List |
| `loop-verifier` | Fin de fase V | APPROVE/REJECT independiente |
| `state-integrity-check` | Antes de confiar en STATE.md | IDs duplicados, filas fuera de tabla, banner desync, encoding |
| `learning-memory` | Reutilizar esquemas verificados | Restaura memoria comprimida + lecciones |
| `ultraia-design-system` | Cualquier UI de UltraIa | Tokens Dark Obsidian + motion + anti-AI-slop |
| `creative-code-architect` | Cualquier creación 2D/3D/audio/video por código puro (19/08/2026) | Skill del usuario (verbatim): razonamiento matemático → código puro → ejecución recursiva; sin assets externos, 60 FPS |
| `creative-coding` | Todo trabajo de animación/imagen/video programado | Flujo: matemática/física primero → código puro autocontenido → verificación visual (screenshot+videoqa) → lección (19/08/2026, C73) |

Skills de capability (en `.opencode/skills/` de terceros/derivados usados por el proyecto):

| Skill | Trigger |
|---|---|
| `web-browse-repos` | Búsqueda web/browsing/scraping para AgentReach/OMAG |
| `gsap-core` / `gsap-timeline` / `gsap-scrolltrigger` / `gsap-react` / `gsap-plugins` / `gsap-performance` / `gsap-frameworks` / `gsap-utils` | Motion GSAP (reglas de apps/web/MASTER.md) |
| `threejs-*` (fundamentals, materials, shaders, postprocessing, r3f, loaders, geometry, interaction, lighting, textures, animation) | Aurora WebGL, efectos 3D |
| `motion-design` | Diseño de animaciones (timing/easing/choreography) |
| `design-dna` | Análisis de referencias de diseño en 3 dimensiones |
| `explain-code` | Documentar código para el dueño no técnico (post-commit) |
| `ecc-documentation-lookup` | Docs actualizadas de frameworks vía Context7 |
| `ecc-deep-research` / `ecc-exa-search` / `ecc-data-scraper-agent` | Research multi-fuente, Exa, scraping automatizado |
| `ecc-mcp-server-patterns` | Construir/debuggear servidores MCP |
| `ecc-search-first` | Investigar antes de escribir código |
| `learning-memory` (raíz) | Restaurar memoria verificada |
| `loop-budget` / `loop-concurrency-guard` / `loop-constraints` / `loop-piv` / `loop-triage` / `loop-verifier` / `state-integrity-check` (raíz) | Espejos del harness |

### Skills vetted de terceros (28/08/2026, find-skills)

Instalados vía `npx skills` desde fuentes oficiales (Vercel / Anthropic / mizchi), auditados
Safe / Low Risk. Se usan on-demand (no siempre):

| Skill | Categoría | Trigger |
|---|---|---|
| `vercel-react-best-practices` | Web / Perf | Al escribir/optimizar componentes React/Next.js |
| `web-design-guidelines` | Web / Perf | Al crear UI/landing (reglas de diseño web) |
| `frontend-design` | Design | Al maquetar interfaces frontend |
| `webapp-testing` | Testing | Al QA de features web (Playwright) |
| `deploy-to-vercel` | Deploy | Al desplegar apps/web a Vercel |
| `docx` | Docs | Al generar documentos .docx / artefactos |
| `conventional-changelog` | Docs / Changelog | Al generar CHANGELOG / release notes |

## Condicionales (usar solo cuando aplique el contexto)

| Skill | Condición |
|---|---|
| `gstack` / `gstack-upgrade` | Solo para actualizar la suite gstack global (no es skill de producto) |
| `gstack-plan-ceo-review` / `gstack-plan-eng-review` / `gstack-plan-design-review` / `gstack-plan-devex-review` | Reviews de plan grandes (ciclos PIVR grandes); para ciclos normales el harness ya cubre |
| `gstack-qa` / `gstack-qa-only` / `gstack-browse` / `gstack-benchmark` / `gstack-canary` / `gstack-health` | QA en navegador real / rendimiento — alternativas a browser-automation propio |
| `gstack-investigate` | Debugging sistemático con root cause (alternativa a investigar directo) |
| `gstack-review` / `gstack-claude` / `gstack-codex` | Second opinion de diffs/PRs |
| `gstack-cso` | Auditoría de seguridad (OWASP/STRIDE) — correr periódico, no por tarea |
| `gstack-ship` / `gstack-land-and-deploy` / `gstack-landing-report` | Solo si se decide flujo PR (hoy: push directo aprobado por humano) |
| `gstack-office-hours` / `gstack-autoplan` / `gstack-spec` / `gstack-document-generate` / `gstack-document-release` | Ideación/espec/docs puntuales |
| `gstack-learn` | Revisar aprendido de gstack |
| `gstack-make-pdf` | Exportar markdown a PDF |
| `gstack-diagram` / `gstack-excalidraw` | Diagramas con excalidraw (alternativa a capability `diagram` del core) |
| `gstack-design-*` / `gstack-design-consultation` / `gstack-design-shotgun` / `gstack-design-html` / `gstack-design-review` | Procesos de diseño explícitos (vs ultraia-design-system que es el default) |
| `gstack-careful` / `gstack-freeze` / `gstack-guard` / `gstack-unfreeze` | Modo seguro en operaciones destructivas |
| `gstack-context-save` / `gstack-context-restore` | Guardar/restaurar contexto entre sesiones |
| `gstack-retro` / `gstack-openclaw-retro` | Retrospectivas semanales |
| `gstack-devex-review` | Audit de DX de features developer-facing |
| `gstack-ios-*` (qa/fix/sync/design-review/clean) | SOLO si se decide app iOS nativa (hoy: Expo — NO aplica) → ver evitadas |
| `genjutsu` / `genjutsu:cast` / `genjutsu:paint` / `_jutsu/*` | Creative coding wow-factor (Web/Android/Apple) — condicional a pedidos de motion extremo |
| `AUTOPROGRAM` (skill de ~/.agents) | NO — ver evitadas |
| `supabase-postgres-best-practices` | NO — ver evitadas |

## Evitadas (cuarentena en `.opencode/skills-avoid/` — copia de referencia, no descubierta)

| Skill | Motivo |
|---|---|
| `ios-clean` | Requiere app iOS nativa con DebugBridge — UltraIa no tiene (Expo/web) |
| `ios-design-review` | Auditoría en iPhone real — no aplica |
| `ios-fix` | Auto-fix en dispositivo real — no aplica |
| `ios-qa` | QA en iPhone real vía USB — no aplica |
| `ios-sync` | Regenera DebugBridge gstack — no aplica |
| `benchmark-models` | Benchmark cruzado Claude/GPT/Gemini — no se usa en el harness |
| `pair-agent` | Empareja agente remoto con browser — no aplica al flujo local |
| `open-gstack-browser` | Browser visible con sidebar gstack — QA es headless propio |
| `setup-browser-cookies` | Importa cookies de Chromium real — no aplica (QA headless) |
| `setup-gbrain` | Instala gbrain — no se usa gbrain en el harness |
| `sync-gbrain` | Re-indexa gbrain — no se usa |
| `landing-report` | Dashboard de cola de PRs por workspace — no aplica (PIVR sin PRs automáticos) |
| `setup-deploy` | Configura deploy para land-and-deploy — deploy documentado en DEPLOY.md |
| `supabase-postgres-best-practices` | Postgres Supabase — proyecto usa SQLite (Prisma); Supabase solo doc |
| `AUTOPROGRAM` | Agente alternativo de terceros — no aplica al harness PIVR propio |

Restauración: copiar `SKILL.md` de `.opencode/skills-avoid/<name>/` a la ruta original del
manifest (nunca se borró el original global; la copia es solo referencia).

## Reglas del inventario

1. Los skills del harness (loop-*) y `ultraia-request` son OBLIGATORIOS — no mover a cuarentena.
2. Un skill global evitado NO debe volver a cargarse sin decisión explícita (ej: decidir app iOS nativa).
3. Al instalar un skill nuevo de terceros, evaluar aquí: recomendado/condicional/evitado + actualizar
   `manifest.json` si va a cuarentena.
4. Mantener `skills/` (raíz) como fuente y `.opencode/skills/` como espejos sync por hash (iter-54/57).
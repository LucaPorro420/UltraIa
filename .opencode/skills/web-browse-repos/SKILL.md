---
name: web-browse-repos
description: |
  Catálogo de repositorios GitHub que facilitan la navegación y búsqueda web para agentes AI
  (browsing, scraping, search, deep research, MCP). Verdad verificada 10/10 PASS en
  learning/truth/truth_web_browse_repos.json (fuente: AI mode de Google
  share.google/aimode/IFwSMZTjOGXZx8Rug). Usar cuando haya que: buscar información en internet,
  navegar sitios, scrapear contenido, hacer deep research, o decidir qué stack de browsing/search
  integrar en AgentReach, OMAG, el Gen-Engine o la Fase B del Desktop.
---

# Web Browse Repos — catálogo para búsquedas/navegación web

## Cuándo usar

- Elegir un motor de búsqueda/scraping/browsing (agente o self-hosted) para el producto.
- Implementar o mejorar `searchWeb`/`readWeb` de AgentReach (`packages/core/src/tools/reach.ts`).
- Diseñar el pipeline de investigación de OMAG o la Local API del Desktop (Fase B).
- Pedir "navega esto", "scrapea esa página", "investiga en profundidad X".

## Catálogo (verificado)

| Repo | Licencia | Rol | Punto fuerte |
|---|---|---|---|
| firecrawl/web-agent | MIT | Agente web de datos | Deep Agents + loop plan-act-observe, subagentes, skills SKILL.md on-demand; tools Search/Scrape/Interact |
| ntegrals/openbrowser | MIT | Toolkit browsing TS | Playwright + Vercel AI SDK, REPL CLI, sandbox con límites CPU/memoria/dominio, stall detection |
| SufiSR/internet-search-mcp | MIT | Backend REST+MCP self-hosted | Pipeline browse = search (SearXNG) → BM25 rank → fetch concurrente con fallback |
| sjtu-sai-agents/Browse-Master | research | Agente search Planner-Executor | Búsqueda code-driven (batch_search/check_condition/generate_keywords), replan por confianza, BrowseComp |
| JonusNattapong/MCPSearch | MIT | Investigación multi-fuente keyless | Search multi-engine, crawl fast/hybrid/stealth, social (Reddit/X/YT/GitHub), MCP-native, sin API keys |
| baojiachen0214/web-rooter | MIT | Capa web "citable" CLI | Comandos wr quick/web/deep/do/jobs/academic/social; instala skills en Claude/Cursor/OpenCode/OpenClaw; configura cookies |
| DamiMartinez/scrapeagent | MIT | Scraping multi-agente | Conocimiento de cada sitio en SKILL.md escrito por el propio agente (create_skill) |
| k-kolomeitsev/agent-browser-workspace | MIT | Deep research local | Chrome CDP + Playwright, SERP snapshot reproducible (links.json) + Markdown, PDF handling |
| Jeomon/Web-Use | MIT | Agente browsing CDP | Multi-LLM, visión, árbol semántico DOM, OAuth 2.0+PKCE, WebMCP (sitios exponen tools) |
| colaboy519/webharvest | MIT | Scraper self-hosted gratis | 100% local, alternativa Firecrawl; scrape/crawl/extract/search/agent; anti-bot curl_cffi+Patchright+BrowserForge |

## Decisiones tomadas

- **AgentReach**: adoptar el patrón browse de `internet-search-mcp` (search → BM25 → fetch
  concurrente con fallback) y el workflow reproducible de `agent-browser-workspace`
  (links.json + Markdown) para el deep research.
- **Local-first**: MCPSearch o webharvest como motor self-host keyless (sin API keys, sin cloud) —
  encaja con LOCAL-FIRST del runtime Desktop.
- **Self-improvement**: scrapeagent es el modelo del loop del producto: el agente investiga el
  sitio, escribe su propio SKILL.md y lo recarga (plan → ejecutar → implementar → mejorar).
- **Browser single-threaded**: el perfil de Chrome es recurso compartido — tareas de browser en
  secuencia desde un solo proceso (regla para el TaskManager del runtime).

## Fuente y verificación

- AI mode de Google: `share.google/aimode/IFwSMZTjOGXZx8Rug` (query "repositorios de github que
  facilitan la navegacion o busqueda por internet"). El AI mode quedó tras un challenge anti-bot
  (no accesible por HTTP); el catálogo fue recuperado y verificado vía búsqueda web contra GitHub.
- Truth: `learning/truth/truth_web_browse_repos.json` (10/10 PASS). Doc raíz:
  `integracionWebBrowse.txt`. Copia del catálogo: CreationsApp `RepositorysGithubAi.txt`.

## Loop de mejora

- Para verificar un dato nuevo de estos repos: crear caso en `learning/truth/` → pedir respuesta →
  `python learning/scripts/verify.py <id> <respuesta.json>` → rebuild
  `python learning/scripts/bundle_memory.py build`.
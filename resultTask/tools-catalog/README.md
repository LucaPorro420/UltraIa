# UltraIa → itsfree.dev export

Ready-to-submit export of UltraIa's **62 capabilities** for the
[itsfree.dev](https://itsfree.dev/es) directory.

## Files
- `itsfree-<lang>.md` — one Markdown file per language (name, category, route, description, tags).
- `tools-catalog.json` — all 14 locales keyed by language.
- `itsfree-flat.json` — flattened array (one row per `capability × language`) for easy ingestion by a directory site or a PR bot.

## Languages
- **Full translations (7):** `es`, `en`, `pt`, `it`, `de`, `zh`, `ru`.
- **Fallback to `es` (7):** `fr`, `ar`, `hi`, `ja`, `nl`, `tr`, `ko`.

## How to (re)generate against a live instance
```bash
# from repo root, with the web app running (or CATALOG_BASE pointing at a deploy)
CATALOG_BASE=http://localhost:3000 node scripts/export-tools-catalog.mjs
CATALOG_BASE=http://localhost:3000 node scripts/analyze-tool-overlap.mjs
```
The overlap/consolidation map lives at `docs/HERRAMIENTAS-MAP.md`.

## Submission
1. Use `itsfree-flat.json` to fill itsfree.dev's "submit a tool" form, or open a PR against
   the itsfree.dev directory repo with these entries.
2. For the canonical catalog source, see `packages/core/src/tools/catalog.ts`
   (`getToolCatalog(locale)`, `CATALOG_LOCALES`).

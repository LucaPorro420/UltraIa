---
name: explain-code
description: Add plain-language, Better Comments-style explanations to a source file so a non-technical owner can understand it. Use when the user says "explica <archivo>", "documenta el codigo", or as part of the post-commit doc loop (DOCS_TODO.md).
---

# Skill: explain-code

Add human-readable explanations to a code file WITHOUT changing its behavior.

## When to use
- User asks "explica <archivo>" or "documenta <codigo>".
- As the documentation "loop": after a commit, `scripts/doc-reminder.mjs` appends
  changed `.ts/.tsx` files to `DOCS_TODO.md`. Pick one and run this skill.

## Rules (do NOT break these)
1. **Never delete or change logic.** Only ADD comments and (optionally) reference copies.
2. Comments in **English** using Better Comments tags:
   - `//!` = important / critical
   - `//*` = highlight / key concept
   - `//?` = question / decision to revisit
   - `// TODO:` = future work
3. For the non-technical owner, also keep a Spanish plain-language guide in
   `docs/GUIA-CODIGO.md` or in `apps/web/src/lib/shared/README.md` when relevant.
4. If the user is non-technical, explain terms (component, prop, hook, API route, etc.)
   instead of assuming they know them.

## Workflow
1. Read the target file fully.
2. Identify the public surface: exported functions/components, props, side effects.
3. Prepend a short header comment (what the file is + its real path + what it does).
4. Add `//!`/`//*` comments on the key lines (entry points, non-obvious logic).
5. Do NOT add comments to every line — only where it improves understanding.
6. If the file belongs to a reusable piece, also add/extend its copy under
   `apps/web/src/lib/shared/` or `packages/core/src/shared/`.
7. Report a 2-3 line summary of what you documented.

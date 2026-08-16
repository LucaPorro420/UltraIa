# PLAN: PrototypeREADME actualizado + descargable PDF en la lista total (tarea #19 de STATE.md)

Fecha: 2026-08-15 · Modo: plan

## Contexto
- Petición del usuario: "Realiza el prototypeREADME.md y dame el descargable en la lista total de ULTRAIA para usarlo".
- `PrototypeREADME.md` existe (commiteado en 791e095, harness v2) pero está DESACTUALIZADO: la hoja de ruta lista como "planificadas" cosas ya DONE (AutoPub F2/F5, cola de briefs, Desktop Fase D) y no refleja las iteraciones 12–16 (enrutador es/ar + TTS + guion largo OMAG 60s+, KPIs/media_score/feedback, cola TopicBrief) ni el estado completo del repo (runtime Fases A–C + adapters core, launcher spike, OMAG expandido con audio/música, g0dm0d3, Gen-Engine wiring, sistema learning/).
- Verificado en pre-flight: NO hay toolchain PDF en esta máquina (binario make-pdf de gstack no compilado, sin pandoc/weasyprint/wkhtmltopdf/pdflatex, sin reportlab/fpdf/markdown en python ni py -3.12, sin msedge en rutas estándar). → El descargable se genera con un writer PDF stdlib puro (DNA del proyecto: keyless-first, síntesis desde cero — precedente `omag/sound.ts` PCM16/WAV sin deps).
- "Lista total de ULTRAIA" = `README.md` (índice maestro del repo): se agrega sección "Documentación / Descargables" que enlaza PrototypeREADME.md + PrototypeREADME.pdf.

## Objetivo
- `PrototypeREADME.md` reflejando el estado real al 15/08/2026 + descargable `PrototypeREADME.pdf` generado con `scripts/md2pdf.py` (stdlib, cero deps) + enlaces en la lista total (`README.md`).

## Pasos
1. Reescribir `PrototypeREADME.md`:
   - Descripción general + diagrama de lógica actualizado (web :3000 / webhooks :8000 / gen-engine :8100 / @ultraia/runtime + Local API 127.0.0.1).
   - Capacidades actuales: agentes bp-admin (skills plan/build/test/review/ship/simplify, AgentReach, g0dm0d3, tools music/audio/publication), OMAG v0.1 expandido (MediaField, timeline, memorias, generadores keyless: imagen pollinations/meigen, video storyboard, audio edge-tts 14 idiomas + música Tunetank + síntesis procedural WAV, long-form Project→Act→Sequence→Scene→Shot 60s+), AutoPub F1–F5 completos (topics + cola TopicBrief, enrutador es/ar + TTS + guion largo, present, publish YouTube/TikTok + cola Publication + calendario publish-due + /blog, KPIs + media_score + feedback), @ultraia/runtime Fases A–C (runtime lazy, Local API HTTP/WS con token timing-safe + rate limit, adapters core db/ai/tools/omag) + Desktop Fase D pasos 1–2 (SHELL_DECISION MVP WebView2 + spike launcher validado) con paso 3 en curso, Gen-Engine :8100 wiring (GEN_ENGINE_URL), loop PIVR (harness + driver), sistema learning/ (verdad verificada).
   - Quickstart + verificación del repo (gates en orden CI, 526/526 PASS, login admin/admin).
   - Prototipo de uso: `python start.py` (+ flags), `scripts/loop_piv.py` (--dry-run/--plan-only/--gate-only/--triage), API OMAG, endpoints publications.
   - Hoja de ruta SOLO pendientes reales: Gen-Engine entrenamiento F5 (GPU/decisión humana), canales Meta (IG Reels/Threads)/X v2/LinkedIn (app review humana), Desktop Fase D paso 3 (ventana WebView2 nativa), F3 branding kit editable.
   - Nueva sección "Descargables": link a `PrototypeREADME.pdf`.
2. Crear `scripts/md2pdf.py` (stdlib puro, ~150 líneas): markdown → PDF con Helvetica/WinAnsi (títulos, listas, code blocks, saltos de página, nº de página); flags `--out` y `--check` (valida cabecera %PDF, xref, %%EOF, páginas > 0); caracteres fuera de latin-1 → sustitución controlada con aviso a stderr.
3. Generar `PrototypeREADME.pdf` en la raíz con el script; verificar con `--check` + lectura con parser mínimo.
4. `README.md`: sección "Documentación / Descargables" enlazando `PrototypeREADME.md` y `PrototypeREADME.pdf` (lista total).
5. `STATE.md`: fila backlog #19 → DONE (tras commit, con hash) + "Last run" actualizado.
6. `loop-run-log.md`: sección Iteración 18 con [P] (esta) y [I]/[V]/[R] en build.

## Archivos a tocar (staging explícito)
- `PrototypeREADME.md` — reescritura a estado real 15/08/2026 + sección Descargables
- `scripts/md2pdf.py` — NUEVO: writer PDF stdlib (md → PDF, flag --check)
- `PrototypeREADME.pdf` — NUEVO: descargable generado y commiteado (precedente: learning/memory/ultraia_memory.zip)
- `README.md` — sección "Documentación / Descargables" (lista total)
- `STATE.md` — backlog #19 + Last run
- `loop-run-log.md` — registro [P]/[I]/[V]/[R]

NO se tocan: paquetes (packages/core, apps/web, packages/runtime) ni el ruido del working tree
(Iteración 17 en curso: `desktopFase/launcher/webview2-host.cs` untracked, `launcher.mjs`,
`launcher.test.ts`, `.gitignore`, `DOCS_TODO.md` modificados → fuera del commit).

## Criterios de verificación
- Scoped: `python scripts/md2pdf.py --check` (exit 0, %PDF válido, páginas > 0) · regeneración `python scripts/md2pdf.py PrototypeREADME.md --out PrototypeREADME.pdf` sin error
- FULL antes de commit: `npm run typecheck` → `npm run lint` → `npm run test` (526/526 esperado: core 334 + runtime 192) → `npm run build` (sin cambios en paquetes; pre-build: taskkill de dev servers)
- Tests esperados: 0 nuevos en vitest (doc-only; el script Python queda fuera de los gates npm, validado por su propio --check)

## Riesgos / guardas
- Ruido del working tree (Iteración 17 en curso) → staging explícito SOLO de los 6 archivos del plan; NUNCA `git add .` ni `-A`
- Caracteres no-latin1 en el MD (emojis/árabe si aparecieran) → sustitución controlada en md2pdf.py con avisos a stderr; el doc es español (acentos OK en WinAnsi)
- Binario PDF en git: aceptable (precedente learning/memory/ultraia_memory.zip)
- Denylisted: `.env*`, `auth/`, `payments/`, `secrets/`, `credentials/` — no aplica
- Sin push ni merge (aprobación humana)

## Esfuerzo estimado
- Bajo-medio — 1 doc reescrito + 1 script Python stdlib (~150 líneas) + PDF generado + enlaces; sin tocar paquetes → gates verdes sin fricción esperada.

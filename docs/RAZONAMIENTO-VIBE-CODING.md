# Razonamiento: Vibe Coding with Base44 (vendor/vibe-coding-with-base44)

**Fuente:** `vendor/vibe-coding-with-base44` (MIT, 14k stars, https://github.com/cporter202/vibe-coding-with-base44)
**Fecha:** 2026-09-08
**Licencia:** MIT — permite uso comercial, atribución requerida.

## Resumen
Curso práctico zero-to-launch para Base44 (AI app builder). Enseña a construir una app real (lead tracker) sin código, con prompts estructurados, starter-kits y checklist de seguridad. No es un framework de código, es una metodología de prompts y plantillas.

## Patrones transferibles (5)

1. **Prompt estructurado** `On [PAGE], when [USER] does [ACTION], change [CURRENT] so that [EXPECTED]. Keep [UNCHANGED] unchanged. Done means: [RESULT] - [EDGE] - [NEVER]` — mejora `builder` y `content-factory` (actualmente usan prompts libres). **Decisión: ADOPTAR** para `builder` (property-panel) y `enrutador` (guionizar) — ya tenemos `MOTIONS` vocabulario, podemos añadir este esqueleto.

2. **Starter-kits** (lead-tracker, client-portal, booking-manager) con brief + data model + permissions + build order + tests — similar a nuestros `seed-data.mjs` (8 agentes) y `present` (PublicationPackage). **Decisión: ADOPTAR** como `starter-kits/` para `apps/web` (ej: `starter-kits/lead-tracker.json` con schema Zod), no como runtime, solo como templates para `content-factory` kind `app`.

3. **Quick Reference** (one-page, modo/workflow) — similar a `docs/MODOS-OPERACION.md` (P-P/P-B/L-T/S-D). **Decisión: NO DUPLICAR** — ya tenemos `MODOS-OPERACION.md`, solo añadir una tabla de “modo Base44 → modo UltraIa” en `docs/RAZONAMIENTO`.

4. **Testing & Debugging** (role-based tests, troubleshooting symptom-based) — similar a `video_edit` (self-eval) y `harness` (gate). **Decisión: ADOPTAR** checklist de `docs/06-launch-checklist.md` como `checklist` en `present` (mediaScore) — ya tenemos `media_score 0-25` para pre-pub.

5. **Seguridad** (data, auth, security, nunca confundir auth con authz) — ya tenemos `security` (OWASP, STRIDE) y `auth` (RBAC). **Decisión: NO DUPLICAR** — solo citar en `SECURITY.md`.

## Decisiones

- **Adoptar:** prompt estructurado + starter-kits como templates JSON (no código), checklist como `present` mediaScore.
- **Descartar:** runtime Base44 (no es código, es SaaS), no hay código que copiar (MIT pero es docs, no lib). No instalar `base44` SDK.
- **Atribución:** MIT, mantener `vendor/vibe-coding-with-base44` como referencia, no copiar código.

## Implementación en UltraIa (no código, solo docs + templates)

- `starter-kits/lead-tracker.json` — ejemplo: `{ "brief": "lead tracker para peluquería", "dataModel": ["Lead", "Admin"], "permissions": {"public": ["create"], "admin": ["read","update"]}, "tests": ["public can submit", "admin can review"] }` — para `content-factory` kind `app`.
- `docs/RAZONAMIENTO` ya hecho (este archivo) — cierra pendiente `vendor/vibe-coding-with-base44` de REPLANTEO 177.
- No deps nuevas, no runtime, solo docs.

## Verificación
- `learning/sources/vibe-coding-with-base44.md` existe (copia cruda README)
- `docs/RAZONAMIENTO-VIBE-CODING.md` existe (este archivo)
- `content-factory.test.ts` 7/7 + `theatre-sequence.test.ts` 3/3 → scoped 10/10 PASS (ver abajo)
- `Task/holagpt-demo.ts --dry-run` → 7 artifacts sin key, sin red

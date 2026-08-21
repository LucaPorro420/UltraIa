# Loop 49 — LinkedIn Adapter (AutoPub F4 canal restante)

## Contexto
- AutoPub F4 canales: YouTube ✅, TikTok ✅, X ✅, Meta (IG/Threads) ✅, Telegram ✅, Discord ✅, Slack ✅.
- Falta: **LinkedIn** (backlog #17, pendiente desde iteración 44 "CANALES-CONFIG-2026.md: LinkedIn pendiente de verificar").
- LinkedIn Marketing API / UGC Posts API para publicar video (MP4) en páginas de empresa o perfiles personales.
- Requiere LinkedIn Developer App + OAuth 2.0 (access token con scopes `rw_organization_admin`, `w_member_social` o `w_organization_social`).
- Verificación 17/08 (CLOUD-FREE-2026.md): "LinkedIn pendiente de verificar" — ahora se verifica y documenta.

## Objetivo
1. Adapter `createLinkedInAdapter` en `packages/core/src/tools/publish.ts` (o archivo nuevo `linkedin.ts`) siguiendo el patrón existente (fetch inyectable, token/env, fail-soft, UGC Posts API para video).
2. Wiring completo: `PublishPlatform` + 'linkedin', `createDefaultPublishers({includeLinkedIn})`, export en `publish.ts` + `index.ts` + `llm.ts` (tool `publish_submit` gana `toLinkedIn`).
3. Docs: actualizar `docs/CANALES-CONFIG-2026.md` con pasos LinkedIn + variable de entorno `LINKEDIN_ACCESS_TOKEN` + `LINKEDIN_ORG_URN` (o `LINKEDIN_PERSON_URN`).
4. Tests: unitarios del adapter (mocks fetch, validate/publish) + integración en `publish.test.ts`.

## Pasos
1. Investigar LinkedIn UGC Posts API (video upload flow: registerUpload → PUT uploadUrl → create UGC post con asset URN).
2. Implementar `createLinkedInAdapter` en `publish.ts` (o `linkedin.ts` exportado desde `publish.ts`).
3. Actualizar `PublishPlatform` type, `createDefaultPublishers`, exports en `publish.ts`.
4. Actualizar `index.ts` export.
5. Actualizar `llm.ts` tool `publish_submit` (parámetro `toLinkedIn` + filtro).
6. Tests: `publish.test.ts` (adapter unit + integración con mocks).
7. `docs/CANALES-CONFIG-2026.md` sección LinkedIn (OAuth scopes, App review, variables, cómo probar).
8. Gates FULL (typecheck/lint/test/build) con cuarentena tests #25.

## ARCHIVOS A TOCAR
- `packages/core/src/tools/publish.ts` (o nuevo `linkedin.ts` + re-export desde `publish.ts`)
- `packages/core/src/tools/index.ts`
- `packages/core/src/ai/llm.ts`
- `packages/core/src/tools/publish.test.ts`
- `docs/CANALES-CONFIG-2026.md`

## Criterios
- Scoped: typecheck core 0, lint 0, test publish 27+ (nuevos tests LinkedIn).
- FULL: typecheck/lint/test/build EXIT 0.
- Adapter: UGC Posts API video flow, fail-soft sin token/env, fetch inyectable, org/person URN configurable.

## Riesgos
- LinkedIn requiere App Review para producción (scope `w_member_social` o `rw_organization_admin`).
- Video max 5GB / 10 min MP4.
- Token expira 60 días (refresh token no implementado — igual que YouTube/TikTok hoy).
- Upload URL puede requerir multipart o binary PUT (verificar docs actuales).

## Esfuerzo
Medio-Alto (nuevo adapter + wiring + tests + docs ≈ 45-60 min).
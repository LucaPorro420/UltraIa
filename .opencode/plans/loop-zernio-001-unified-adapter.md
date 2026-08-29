# Plan — Zernio como adapter unificado de publicación (AutoPub)

**Tarea:** loop-zernio-001 — Integrar Zernio (MCP `https://mcp.zernio.com/mcp` + REST `https://zernio.com/api/v1`) como canal de distribución de UltraIa.
**Decisión estratégica:** Zernio ya está conectado al agente vía MCP en opencode.json (commit `0fb517e`). Aquí se añade el **adapter de código** para que los agentes `bp-*` y el pipeline AutoPub puedan publicar a 16 plataformas con UNA integración (API key), complementando los 13 adapters bespoke existentes (y no reemplazándolos: Zernio es el "broad-reach" unificado; los bespoke siguen para control fino).

## Contexto / por qué
- UltraIa AutoPub ya soporta youtube, tiktok, x, instagram, threads, facebook, linkedin, telegram, discord, slack, reddit, pinterest, whatsapp (13) vía adapters individuales.
- Zernio expone 16 plataformas (incl. Bluesky, Google Business, Snapchat, WhatsApp) en UNA llamada `POST /v1/posts` con `platforms:[{platform,accountId}]`. Cubre el gap de alcance y simplifica el onboarding (1 API key vs N tokens).
- Aporte al proyecto: el "fábrica de contenido autónoma" (AutoPub F1–F5 + Cerebro) gana un canal único que fan-out a muchas plataformas, alineado con la misión de publicación autónoma.

## Archivos a tocar (explícitos)
1. **NUEVO** `packages/core/src/tools/zernio.ts` — `createZernioAdapter` (implementa `PublisherAdapter`, `platform:'zernio'`). Llama `POST /v1/posts` (text/image/video, scheduledFor, publishNow). Media: URL pública directa o upload vía `/v1/media/presign`+PUT. Descubre cuentas (`GET /v1/accounts`) si no se pasan `zernioPlatforms`. Fail-soft. Fetch inyectable. `ZERNIO_API_URL`, `buildZernioCaption`, `__validate`.
2. **NUEVO** `packages/core/src/tools/zernio.test.ts` — tests con mock fetch (validate, publish URL-path success, publish con upload presign, 401 fail-soft, sin plataformas fail-soft).
3. `tools/publish.ts` — añadir `'zernio'` a `PublishPlatform`; extender `PublishInput` (`text?`,`link?`,`scheduledFor?`,`zernioPlatforms?`,`zernioAccountIds?`,`zernioProfileId?`); `import { createZernioAdapter }`; `includeZernio` en `createDefaultPublishers`; agregar a objeto `publish`.
4. `tools/goal.ts` — `publish_submit`: añadir `includeZernio: true`.
5. `domain/publications.ts` — `publishDue`: añadir `includeZernio: true` en `createDefaultPublishers`; añadir `'zernio'` a `CANALES_CON_APROBACION` (siempre DRAFT → aprobación humana, fan-out amplio).
6. `domain/connections.ts` — añadir `includeZernio: true` en el `createDefaultPublishers` de la ruta de conexiones.
7. `apps/web/src/app/api/publications/[id]/publish/route.ts` — `createDefaultPublishers({ includeZernio: true })`.
8. `tools/topics.ts` — añadir `'zernio'` a `TopicChannel`; entradas en `CHANNEL_KEYWORDS` y `FORMAT_BY_CHANNEL`.
9. `tools/present.ts` — entradas en `FORMAT_BY_CHANNEL`, `HORARIO_SUGERIDO`, `hashtagsFor` (base), `captionFor` (case), `visualFor` (case).
10. `tools/autopub.ts` — añadir `'zernio'` a `CANALES_AUTOPUB` (canal seleccionable; default no fuerza fan-out problemático porque zernio requiere aprobación).
11. `tools/cerebro.ts` — añadir `'zernio'` a `CEREBRO_CHANNELS` (el cerebro autónomo puede apuntarlo).
12. `tools/connections-catalog.ts` — entrada de catálogo `zernio` (social, token, 16 plataformas).
13. `tools/index.ts` — `export * from './zernio';` y actualizar `TOOL_DESCRIPTIONS.publish` mencionando Zernio.
14. `.env.example` — `ZERNIO_API_KEY=` y `ZERNIO_PROFILE_ID=`.
15. `docs/CANALES-CONFIG-2026.md` — sección Zernio (env + uso).
16. **NUEVO** `docs/RAZONAMIENTO-ZERNIO.md` — análisis estratégico (mapa AutoPub↔Zernio, cobertura, decisión unified-vs-bespoke, siguientes pasos: cola con target platforms, analytics, coste).

## Predicción
- typecheck: GREEN (añado todos los miembros de union/Record exigidos por exhaustividad).
- lint: GREEN.
- test: GREEN (zernio.test.ts nuevo + existentes sin regresión; autopub/cerebro no afirman lista hardcodeada de canales).
- build: GREEN.
- Total tests core sube ~+18 (zernio).

## NO-hacer
- No reemplazar los adapters bespoke (youtube/tiktok/...). Zernio es complementario.
- No tocar Prisma (Publication.canal ya es String).
- No pushear/merge (solo commit local).
- No cambiar el comportamiento de aprobación híbrida: zernio → DRAFT.

## Tolerancias
- Si `npm run test` falla por una aserción de catálogo de canales no prevista, ajusto mínimamente la aserción o la entrada, sin romper el contrato.
- Si el build falla por dev server vivo, mato node/next y reintento (max 2).

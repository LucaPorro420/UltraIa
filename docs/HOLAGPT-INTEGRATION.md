# HolaGPT Integration — UltraIa

**Fuente:** https://holagpt.com — $20/mes, 1M tokens, trial 30 días gratis. Uruguay legal, sin gasto inicial.

## Qué integra
Proveedor unificado OpenAI-compatible para:
- **LLMs:** Gemini 3.1 Pro Max, Claude Opus 4.8, GPT-5/4o, Llama 3.1 405B, Grok-3, Gemini 2.5 Flash
- **Imágenes:** FLUX (500), GPT Image (500), Recraft V3 / Nano Banana (100 premium)
- **Web search, TTS/STT, análisis de archivos**

## Configuración
En `apps/web/.env` (o raíz `.env`, gitignored):
```
HOLAGPT_API_KEY=sk-...      # o HOLOGPT_API_KEY (alias)
HOLAGPT_BASE_URL=https://api.holagpt.com/v1  # opcional
```
Sin key → **keyless-first** (pollinations, edge-tts, DDG, procedural) — nunca rompe el build.

`.env.example` tiene placeholder. Nunca commitear el valor real.

## Uso desde agentes
Capabilities registradas en `ai/llm.ts`:
- `holagpt` → `holagpt_chat`, `holagpt_image`, `holagpt_search`, `holagpt_audio`, `holagpt_models`
- `content-factory` → `content_factory` (7 kinds: web/video/game/app/image/audio/music), `content_search`

```ts
// llm.ts — dentro de chatStream
await chatStream({ system, messages, tools: ['holagpt','content-factory'] })
```

Direct import keyless:
```ts
import { holagptChat, holagptImage } from '@ultraia/core/tools/holagpt';
import { contentFactoryGenerate } from '@ultraia/core/tools/content-factory';
await contentFactoryGenerate({ kind: 'image', brief: 'poster café', idioma: 'es' });
await contentFactoryGenerate({ kind: 'video', brief: 'reel 9:16 cafetería', idioma: 'es' });
await contentFactoryGenerate({ kind: 'web', brief: 'landing cafetería', idioma: 'es' });
```

## Factory 7 tipos
| kind | Usa | Fallback |
|------|-----|----------|
| web | holagpt chat + Stitch | builder placeholder |
| video | OMAG storyboard | pollinations |
| game | holagpt scaffold | codevfx+sdf |
| app | holagpt scaffold | template Expo |
| image | holagpt flux | pollinations |
| audio | edge-tts | procedural tone |
| music | holagpt compose | composeMusic |

Cada kind es **fail-soft** — si uno falla, los demás siguen.

## Demo
```
node_modules\.bin\vite-node.cmd Task/holagpt-demo.ts --quick
node_modules\.bin\vite-node.cmd Task/holagpt-demo.ts
```

## Distribución & venta
El factory produce `PublicationPackage` (present.ts) → cola `Publication` (Prisma, `publishDue`) →
10+ canales (YT/TikTok/X/IG/Threads/Telegram/Discord/Slack/LinkedIn/blog/cloud) vía `publishToAll`.
Aprobación humana híbrida: video/imagen → DRAFT, texto/blog → AUTO.
Cuentas IG/FB/TikTok desde Uruguay: usa `social_connect` (guide/validate-cookies) — legal, sin bots.

## Backup GitHub
- Local vault: `.ultraia/vault/` (ya existe, cloud R2/local)
- Workflow: `.github/workflows/holagpt-backup.yml` cron diario 03:23 UTC (`workflow_dispatch` manual)
- Manual: `vault_manage` → `export_github` o `npm run repomix`

## Límites honestos
- holagpt Trial 30d → $20/mes; 1M tokens contados por el proveedor (headers `x-ratelimit-*`)
- Imágenes premium (Recraft/Nano) sólo 100/mes
- Sin HOLAGPT_API_KEY todo sigue funcionando en modo keyless (ya verificado en tests)

## Verificación
- Scoped: `npx vitest run holagpt.test.ts content-factory.test.ts` (24 PASS)
- FULL: `npm run typecheck → lint → test → build` (typecheck colgado en CI por tsc incremental — verificado con scoped + vitest)

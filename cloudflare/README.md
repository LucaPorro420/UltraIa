# UltraIA Cloud Worker — deploy en 5 minutos

Worker de Cloudflare que sirve la API de archivos del cloud UltraIa sobre **R2** (10 GB
gratis, egress $0). Es el backend del `R2CloudAdapter` de `packages/core/src/tools/cloud.ts`
y de la página `/cloud` de la app.

## Requisitos
- Cuenta Cloudflare gratis (dash.cloudflare.com/sign-up) — 2 minutos.
- Bucket R2: dashboard → R2 → *Create bucket* → `ultraia-media` (región auto).

## Deploy
```bash
npm i -g wrangler          # una sola vez
npx wrangler login         # autoriza con tu cuenta en el navegador
npx wrangler secret put CLOUD_TOKEN      # pega el token R2 (API Tokens → Edit Cloudflare Workers)
npx wrangler secret put CLOUD_PUBLIC_URL # opcional: https://media.<tu>.pages.dev
npx wrangler deploy
```

Al terminar te imprime `https://cloud-<tu>.workers.dev`. Pega esa URL en el `.env` de la raíz:

```env
CLOUDFLARE_R2_WORKER_URL=https://cloud-<tu>.workers.dev
CLOUDFLARE_R2_TOKEN=<mismo token de CLOUD_TOKEN>
CLOUDFLARE_R2_PUBLIC_URL=https://media.<tu>.pages.dev   # opcional (public access del bucket)
```

## Contrato REST (consumido por R2CloudAdapter)
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/files` | Lista `{ files: [...] }` (opcional `?prefix=media/`) |
| GET | `/files/<path>` | Bytes del objeto (404 si no existe) |
| HEAD | `/files/<path>` | Headers (content-length, content-type, last-modified) |
| PUT | `/files/<path>` | Sube/sobrescribe (body = bytes) |
| DELETE | `/files/<path>` | Borra (204; 404 si no existía) |

Auth: `Authorization: Bearer <CLOUD_TOKEN>` en todas las peticiones. CORS abierto para la
app web. Límite de subida 100 MiB.

## Verificación rápida
```bash
curl -H "Authorization: Bearer $CLOUD_R2_TOKEN" https://cloud-<tu>.workers.dev/files
curl -X PUT -H "Authorization: Bearer $CLOUD_R2_TOKEN" --data-binary @hola.txt \
     -H "Content-Type: text/plain" https://cloud-<tu>.workers.dev/files/drafts/hola.txt
curl -H "Authorization: Bearer $CLOUD_R2_TOKEN" https://cloud-<tu>.workers.dev/files/drafts/hola.txt
```

## Notas
- El Worker no guarda estado (sin D1/KV) — es una fachada stateless sobre R2; se escala solo.
- El rate limit por IP (120 req/min) se aplica en el plano gratuito de Workers por defecto.
- Para subidas grandes desde el navegador, la app web sube primero al server local y luego al
  Worker (o directo con un presigned token en una iteración futura).
- `worker.ts` usa tipos de la plataforma Workers (R2Bucket, ExportedHandler) — typecheck
  scoped con `npx wrangler types` si se edita.
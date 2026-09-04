//! Cloud provider adapters for the /api/cloud endpoints.
// Local adapter uses .ultraia/cloud/ on disk; R2 adapter is env-configured.
import { LocalCloudAdapter } from '@ultraia/cloud';
import { join } from 'node:path';

/** Directorio raíz del cloud local (`.ultraia/cloud/` en la raíz del repo). */
export function cloudBaseDir(): string {
  return process.env.ULTRAIA_CLOUD_DIR ?? join(process.cwd(), '..', '..', '.ultraia', 'cloud');
}

export function localCloudAdapter() {
  return new LocalCloudAdapter(cloudBaseDir());
}

/** Estado de proveedores cloud según env (nunca expone secretos). */
export function cloudProviders() {
  const providers = [
    {
      id: 'local',
      name: 'Local (.ultraia/cloud)',
      active: true,
      detail: cloudBaseDir(),
      limits: '100 MiB por archivo · almacenamiento en tu máquina',
    },
    {
      id: 'r2',
      name: 'Cloudflare R2 (Worker)',
      active: Boolean(process.env.CLOUDFLARE_R2_WORKER_URL && process.env.CLOUDFLARE_R2_TOKEN),
      detail: process.env.CLOUDFLARE_R2_WORKER_URL
        ? 'conectado — uploads y descargas vía Worker'
        : 'no configurado — registra en Cloudflare y pega CLOUDFLARE_R2_* en .env',
      limits: '10 GB gratis · egress $0 · dominio .pages.dev',
    },
    {
      id: 'supabase',
      name: 'Supabase Free',
      active: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
      detail: process.env.SUPABASE_URL ? 'conectado' : 'no configurado — SUPABASE_URL + clave en .env',
      limits: '500 MB Postgres · 1 GB files · 50k MAU · auto-pausa 7 días',
    },
    {
      id: 'vercel',
      name: 'Vercel Hobby',
      active: Boolean(process.env.VERCEL_URL),
      detail: process.env.VERCEL_URL ? 'deploy activo' : 'no configurado — sin uso comercial en Hobby',
      limits: '100 GB bandwidth · sin uso comercial (personal/learning)',
    },
  ] as const;

  return {
    providers,
    presupuesto: { mensual: '$0', nota: 'stack free tiers verificado 17/08/2026 (docs/CLOUD-FREE-2026.md)' },
    fecha: new Date().toISOString(),
  };
}
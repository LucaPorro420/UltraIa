//! GET /api/cloud/status — cloud provider status + budget (no secrets exposed).
import { getCurrentUser } from '@/lib/server/context';
import { cloudProviders } from '../providers';

/** GET /api/cloud/status — estado de proveedores + presupuesto (sin secretos). */
export async function GET(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) return new Response('Unauthorized', { status: 401 });
  return Response.json(cloudProviders());
}
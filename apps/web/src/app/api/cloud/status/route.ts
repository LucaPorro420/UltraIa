import { getCurrentUser } from '@/lib/server/context';
import { cloudProviders } from '../providers';

/** GET /api/cloud/status — estado de proveedores + presupuesto (sin secretos). */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response('Unauthorized', { status: 401 });
  return Response.json(cloudProviders());
}
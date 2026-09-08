/**
 * GET/POST /api/learning/courses — Learning System courses
 * GET: lista cursos públicos (sin auth)
 * POST: crea curso (ADMIN)
 */
import { prisma, createCourse, listCourses } from "@ultraia/core";
import { getCurrentUser } from "@/lib/server/context";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") ?? undefined;
  const result = await listCourses(prisma as any, { category });
  if (!result.ok) return Response.json({ ok: false, reason: result.reason }, { status: 500 });
  return Response.json({ ok: true, courses: result.courses });
}

export async function POST(request: Request) {
  const user = await getCurrentUser(request as any).catch(() => null);
  if (!user || (user as any).role !== "ADMIN") {
    return Response.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const result = await createCourse(prisma as any, body);
    if (!result.ok) return Response.json(result, { status: 400 });
    return Response.json(result, { status: 201 });
  } catch (e) {
    return Response.json({ ok: false, reason: "invalid_json" }, { status: 400 });
  }
}

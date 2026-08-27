/**
 * Editor Visual no-code (loop-120): anotaciones/notas/peticiones sobre las paginas del
 * shell (app), mas reemplazo de texto por selector (kind=texto, solo ADMIN) para editar
 * la UI como un CMS ligero (estilo WordPress/Figma).
 *
 * Dominio puro con `Db` (PrismaClient) inyectado (patron de domain/publications.ts):
 *   - createAnnotation / listAnnotations / getAnnotation
 *   - resolveAnnotation / reopenAnnotation / setAnnotationVisible / deleteAnnotation
 *   - buildOverrides (Map selector -> nuevoTexto para el injector de texto)
 *   - uniqueSelectorPath (generador determinista de selectores CSS a partir de un descriptor)
 */

import type { Db } from '../db/client';
import type { Prisma } from '@prisma/client';

export type AnnotationKind = 'nota' | 'peticion' | 'texto';
export type AnnotationEstado = 'abierta' | 'resuelta';

export interface PageAnnotation {
  id: string;
  page: string;
  selector: string | null;
  anchorText: string | null;
  kind: AnnotationKind;
  body: string;
  nuevoTexto: string | null;
  estado: AnnotationEstado;
  visible: boolean;
  creadoPorId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAnnotationInput {
  page: string;
  selector?: string | null;
  anchorText?: string | null;
  kind: AnnotationKind;
  body: string;
  nuevoTexto?: string | null;
  visible?: boolean;
  creadoPorId?: string | null;
}

export interface ListAnnotationsOptions {
  page?: string;
  kind?: AnnotationKind;
  estado?: AnnotationEstado;
  visibleOnly?: boolean;
}

const KINDS: AnnotationKind[] = ['nota', 'peticion', 'texto'];

/** Genera un selector CSS determinista a partir de un descriptor de nodo. */
export interface SelectorDescriptor {
  tag?: string;
  id?: string;
  classes?: string[];
  nthChild?: number;
  parentPath?: string;
}

function sanitizeIdent(value: string, allowed: RegExp): string {
  return value.replace(allowed, '');
}

export function uniqueSelectorPath(d: SelectorDescriptor): string {
  const tag = sanitizeIdent((d.tag || 'div').toLowerCase(), /[^a-z0-9]/g) || 'div';
  let sel = tag;
  if (d.id) sel += `#${sanitizeIdent(d.id, /[^a-zA-Z0-9_-]/g)}`;
  if (d.classes && d.classes.length) {
    sel += '.' + d.classes.map((c) => sanitizeIdent(c, /[^a-zA-Z0-9_-]/g)).filter(Boolean).join('.');
  }
  if (typeof d.nthChild === 'number' && d.nthChild > 0) sel += `:nth-child(${d.nthChild})`;
  if (d.parentPath) sel = `${d.parentPath} > ${sel}`;
  return sel;
}

export async function createAnnotation(db: Db, input: CreateAnnotationInput): Promise<PageAnnotation> {
  const page = input.page?.trim();
  if (!page) throw new Error('page es requerido');
  const kind = input.kind;
  if (!KINDS.includes(kind)) throw new Error('kind inválido (nota|peticion|texto)');
  const body = input.body?.trim();
  if (!body) throw new Error('body es requerido');

  if (kind === 'texto') {
    const nuevo = input.nuevoTexto?.trim();
    if (!nuevo) throw new Error('nuevoTexto es requerido para kind=texto');
    if (!input.selector?.trim() && !input.anchorText?.trim()) {
      throw new Error('selector o anchorText son requeridos para kind=texto');
    }
  }

  const row = await db.pageAnnotation.create({
    data: {
      page,
      selector: input.selector?.trim() || null,
      anchorText: input.anchorText?.trim() || null,
      kind,
      body,
      nuevoTexto: kind === 'texto' ? (input.nuevoTexto?.trim() ?? null) : null,
      visible: input.visible ?? true,
      creadoPorId: input.creadoPorId ?? null,
    },
  });
  return row as unknown as PageAnnotation;
}

export async function listAnnotations(db: Db, opts: ListAnnotationsOptions = {}): Promise<PageAnnotation[]> {
  const where: Prisma.PageAnnotationWhereInput = {};
  if (opts.page) where.page = opts.page;
  if (opts.kind) where.kind = opts.kind;
  if (opts.estado) where.estado = opts.estado;
  if (opts.visibleOnly) where.visible = true;
  const rows = await db.pageAnnotation.findMany({ where, orderBy: { createdAt: 'asc' } });
  return rows as unknown as PageAnnotation[];
}

export async function getAnnotation(db: Db, id: string): Promise<PageAnnotation | null> {
  const row = await db.pageAnnotation.findUnique({ where: { id } });
  return (row as unknown as PageAnnotation) ?? null;
}

export async function resolveAnnotation(
  db: Db,
  id: string,
  userId: string,
  role: string,
): Promise<AnnotationEstado> {
  const ann = await db.pageAnnotation.findUnique({ where: { id } });
  if (!ann) throw new Error('Anotacion no encontrada');
  if (role !== 'ADMIN' && ann.creadoPorId !== userId) throw new Error('No autorizado');
  const updated = await db.pageAnnotation.update({ where: { id }, data: { estado: 'resuelta' } });
  return (updated as unknown as PageAnnotation).estado;
}

export async function reopenAnnotation(db: Db, id: string): Promise<AnnotationEstado> {
  const updated = await db.pageAnnotation.update({ where: { id }, data: { estado: 'abierta' } });
  return (updated as unknown as PageAnnotation).estado;
}

export async function setAnnotationVisible(db: Db, id: string, visible: boolean): Promise<boolean> {
  await db.pageAnnotation.update({ where: { id }, data: { visible } });
  return visible;
}

export async function deleteAnnotation(
  db: Db,
  id: string,
  ctx: { userId: string; role: string },
): Promise<boolean> {
  const ann = await db.pageAnnotation.findUnique({ where: { id } });
  if (!ann) return false;
  if (ctx.role !== 'ADMIN' && ann.creadoPorId !== ctx.userId) return false;
  await db.pageAnnotation.delete({ where: { id } });
  return true;
}

/** Mapa selector -> nuevoTexto para los reemplazos de texto visibles (kind=texto). */
export function buildOverrides(annotations: PageAnnotation[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const a of annotations) {
    if (a.kind === 'texto' && a.visible && a.nuevoTexto && a.selector) {
      m.set(a.selector, a.nuevoTexto);
    }
  }
  return m;
}

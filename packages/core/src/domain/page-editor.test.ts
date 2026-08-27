import { describe, expect, it } from 'vitest';
import {
  buildOverrides,
  createAnnotation,
  deleteAnnotation,
  listAnnotations,
  reopenAnnotation,
  resolveAnnotation,
  setAnnotationVisible,
  uniqueSelectorPath,
  type AnnotationKind,
  type PageAnnotation,
} from './page-editor';
import type { Db } from '../db/client';

interface Row {
  id: string;
  page: string;
  selector: string | null;
  anchorText: string | null;
  kind: AnnotationKind;
  body: string;
  nuevoTexto: string | null;
  estado: 'abierta' | 'resuelta';
  visible: boolean;
  creadoPorId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

let seq = 0;

function fakeDb(rows: Row[] = []) {
  const db = {
    pageAnnotation: {
      create: async ({ data }: any) => {
        const row: Row = {
          id: `a${++seq}`,
          page: data.page,
          selector: data.selector ?? null,
          anchorText: data.anchorText ?? null,
          kind: data.kind,
          body: data.body,
          nuevoTexto: data.nuevoTexto ?? null,
          estado: (data.estado ?? 'abierta') as 'abierta' | 'resuelta',
          visible: data.visible ?? true,
          creadoPorId: data.creadoPorId ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        rows.push(row);
        return row;
      },
      findMany: async ({ where, orderBy }: any) => {
        let out = rows.filter((r) => {
          if (where?.page && r.page !== where.page) return false;
          if (where?.kind && r.kind !== where.kind) return false;
          if (where?.estado && r.estado !== where.estado) return false;
          if (where?.visible === true && !r.visible) return false;
          return true;
        });
        if (orderBy?.createdAt === 'asc') out = [...out].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        return out;
      },
      findUnique: async ({ where }: any) => rows.find((r) => r.id === where.id) ?? null,
      update: async ({ where, data }: any) => {
        const row = rows.find((r) => r.id === where.id)!;
        Object.assign(row, data);
        row.updatedAt = new Date();
        return row;
      },
      delete: async ({ where }: any) => {
        const idx = rows.findIndex((r) => r.id === where.id);
        if (idx >= 0) rows.splice(idx, 1);
      },
    },
  };
  return { db: db as unknown as Db, rows };
}

describe('createAnnotation', () => {
  it('crea una nota con page+body', async () => {
    const { db, rows } = fakeDb();
    const a = await createAnnotation(db, { page: '/dashboard', kind: 'nota', body: 'Revisar copy' });
    expect(a.id).toBeTruthy();
    expect(a.kind).toBe('nota');
    expect(rows).toHaveLength(1);
  });

  it('crea una peticion', async () => {
    const { db } = fakeDb();
    const a = await createAnnotation(db, { page: '/builder', kind: 'peticion', body: 'Agregar undo' });
    expect(a.kind).toBe('peticion');
  });

  it('kind=texto exige nuevoTexto y selector/anchorText', async () => {
    const { db } = fakeDb();
    await expect(createAnnotation(db, { page: '/x', kind: 'texto', body: 'd', nuevoTexto: 'nuevo' })).rejects.toThrow(
      /selector o anchorText/,
    );
    await expect(
      createAnnotation(db, { page: '/x', kind: 'texto', body: 'd', selector: '.title' }),
    ).rejects.toThrow(/nuevoTexto/);
  });

  it('rechaza page o body vacios', async () => {
    const { db } = fakeDb();
    await expect(createAnnotation(db, { page: '', kind: 'nota', body: 'x' })).rejects.toThrow(/page/);
    await expect(createAnnotation(db, { page: '/x', kind: 'nota', body: '  ' })).rejects.toThrow(/body/);
  });
});

describe('listAnnotations', () => {
  it('filtra por page y kind', async () => {
    const { db } = fakeDb();
    await createAnnotation(db, { page: '/dashboard', kind: 'nota', body: 'A' });
    await createAnnotation(db, { page: '/dashboard', kind: 'peticion', body: 'B' });
    await createAnnotation(db, { page: '/builder', kind: 'nota', body: 'C' });
    const dash = await listAnnotations(db, { page: '/dashboard' });
    expect(dash).toHaveLength(2);
    const notas = await listAnnotations(db, { kind: 'nota' });
    expect(notas).toHaveLength(2);
  });

  it('visibleOnly oculta las no visibles', async () => {
    const { db, rows } = fakeDb();
    await createAnnotation(db, { page: '/x', kind: 'nota', body: 'A' });
    const hidden = await createAnnotation(db, { page: '/x', kind: 'nota', body: 'B' });
    await setAnnotationVisible(db, hidden.id, false);
    expect(rows.find((r) => r.id === hidden.id)!.visible).toBe(false);
    const vis = await listAnnotations(db, { visibleOnly: true });
    expect(vis).toHaveLength(1);
  });
});

describe('buildOverrides', () => {
  it('mapea solo texto visible con selector', () => {
    const anns: PageAnnotation[] = [
      { id: '1', page: '/x', selector: '.title', anchorText: null, kind: 'texto', body: '', nuevoTexto: 'Nuevo', estado: 'abierta', visible: true, creadoPorId: null, createdAt: new Date(), updatedAt: new Date() },
      { id: '2', page: '/x', selector: '.sub', anchorText: null, kind: 'texto', body: '', nuevoTexto: 'Oculto', estado: 'abierta', visible: false, creadoPorId: null, createdAt: new Date(), updatedAt: new Date() },
      { id: '3', page: '/x', selector: null, anchorText: null, kind: 'nota', body: 'n', nuevoTexto: null, estado: 'abierta', visible: true, creadoPorId: null, createdAt: new Date(), updatedAt: new Date() },
    ];
    const m = buildOverrides(anns);
    expect(m.get('.title')).toBe('Nuevo');
    expect(m.has('.sub')).toBe(false);
  });
});

describe('transiciones', () => {
  it('resuelve solo autor o admin; reabre', async () => {
    const { db, rows } = fakeDb();
    const a = await createAnnotation(db, { page: '/x', kind: 'nota', body: 'A', creadoPorId: 'u1' });
    await expect(resolveAnnotation(db, a.id, 'u2', 'USER')).rejects.toThrow(/autorizado/);
    const e1 = await resolveAnnotation(db, a.id, 'u1', 'USER');
    expect(e1).toBe('resuelta');
    expect(rows.find((r) => r.id === a.id)!.estado).toBe('resuelta');
    const e2 = await reopenAnnotation(db, a.id);
    expect(e2).toBe('abierta');
  });

  it('borra autor o admin; prohibe a terceros', async () => {
    const { db, rows } = fakeDb();
    const a = await createAnnotation(db, { page: '/x', kind: 'nota', body: 'A', creadoPorId: 'u1' });
    expect(await deleteAnnotation(db, a.id, { userId: 'u2', role: 'USER' })).toBe(false);
    expect(rows).toHaveLength(1);
    expect(await deleteAnnotation(db, a.id, { userId: 'u1', role: 'USER' })).toBe(true);
    expect(rows).toHaveLength(0);
    const b = await createAnnotation(db, { page: '/x', kind: 'nota', body: 'B' });
    expect(await deleteAnnotation(db, b.id, { userId: 'any', role: 'ADMIN' })).toBe(true);
  });
});

describe('uniqueSelectorPath', () => {
  it('es determinista y compone tag/id/classes/nth', () => {
    const a = uniqueSelectorPath({ tag: 'DIV', id: 'main', classes: ['card', 'active'], nthChild: 2 });
    const b = uniqueSelectorPath({ tag: 'div', id: 'main', classes: ['card', 'active'], nthChild: 2 });
    expect(a).toBe(b);
    expect(a).toBe('div#main.card.active:nth-child(2)');
    expect(uniqueSelectorPath({ tag: 'span', parentPath: 'div#main' })).toBe('div#main > span');
    expect(uniqueSelectorPath({})).toBe('div');
  });
});

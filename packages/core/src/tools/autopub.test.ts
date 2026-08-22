import { describe, expect, it } from 'vitest';
import {
  CANALES_AUTOPUB,
  defaultAutopubDeps,
  parseAutopubConfig,
  planAutopubCycle,
  resumenAutopub,
  rowToBrief,
  runAutopubCycle,
  textoDeContenido,
} from './autopub';
import type { AutopubConfig, AutopubDeps } from './autopub';
import type { BriefRow } from '../domain/briefs';
import type { ContentPackage } from './enrutador';
import type { PublicationPackage } from './present';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const CONFIG: AutopubConfig = {
  maxBriefs: 2,
  idioma: 'es',
  canales: [...CANALES_AUTOPUB],
  tts: false,
  publishDue: false,
};

let seq = 0;
function briefRow(overrides: Partial<BriefRow> = {}): BriefRow {
  seq++;
  return {
    id: `row-${seq}`,
    tema: `Tema ${seq}`,
    canal: 'blog',
    formato: '16:9 articulo',
    tono: 'informativo',
    angulo: 'guia practica',
    fuentes: ['https://ejemplo.local/fuente'],
    score: 0.8 + seq / 100,
    pubDate: null,
    estado: 'NUEVO',
    creadoEn: new Date('2026-08-22T10:00:00Z'),
    procesadoEn: null,
    ...overrides,
  };
}

function fakePaquete(briefId: string | null): PublicationPackage {
  return {
    briefId,
    tema: 'tema',
    contenido: 'contenido',
    media: [],
    canales: ['blog'],
    captionsByChannel: {} as PublicationPackage['captionsByChannel'],
    visualByChannel: {} as PublicationPackage['visualByChannel'],
    horarioSugerido: {} as PublicationPackage['horarioSugerido'],
    branding: { marca: 'UltraIa', paleta: ['#000'], fuente: 'Inter', logo: null, acento: '#8b5cf6' },
    generadoAt: '2026-08-22T00:00:00.000Z',
  };
}

interface FakeState {
  marcas: string[];
  encolados: Array<{ canal: string; briefId: string | null }>;
  publicado: boolean;
}

/** Deps felices: cola con las filas dadas, todo OK. */
function fakeDeps(rows: BriefRow[], state: FakeState = { marcas: [], encolados: [], publicado: false }): AutopubDeps {
  return {
    listarCola: async (take) => rows.slice(0, take),
    generarPaquete: async (row) => ({ paquete: fakePaquete(`brief-${row.id}`) }),
    encolar: async ({ paquete, canal }) => {
      state.encolados.push({ canal, briefId: paquete.briefId });
      return { id: `pub-${paquete.briefId}`, estado: canal === 'blog' ? 'APPROVED' : 'DRAFT', requiereAprobacion: canal !== 'blog' };
    },
    marcarProcesado: async (id) => {
      state.marcas.push(id);
    },
    clock: () => new Date('2026-08-22T12:00:00Z'),
  };
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

describe('autopub / parseAutopubConfig', () => {
  it('entrada vacia → defaults completos (3 briefs, es, 8 canales)', () => {
    const r = parseAutopubConfig({});
    expect(r.ok).toBe(true);
    expect(r.config.maxBriefs).toBe(3);
    expect(r.config.idioma).toBe('es');
    expect(r.config.canales).toHaveLength(8);
    expect(r.config.tts).toBe(false);
    expect(r.config.publishDue).toBe(false);
    expect(r.issues).toEqual([]);
  });

  it('acepta config parcial valida', () => {
    const r = parseAutopubConfig({ maxBriefs: 5, idioma: 'ar', canales: ['blog'], publishDue: true });
    expect(r.ok).toBe(true);
    expect(r.config).toEqual({ maxBriefs: 5, idioma: 'ar', canales: ['blog'], tts: false, publishDue: true });
  });

  it('maxBriefs fuera de rango → fail-soft con defaults e issues', () => {
    const r = parseAutopubConfig({ maxBriefs: 99 });
    expect(r.ok).toBe(false);
    expect(r.config.maxBriefs).toBe(3); // defaults
    expect(r.issues.length).toBeGreaterThan(0);
  });

  it('canal desconocido → fail-soft', () => {
    const r = parseAutopubConfig({ canales: ['canal-inexistente'] });
    expect(r.ok).toBe(false);
    expect(r.issues.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Plan
// ---------------------------------------------------------------------------

describe('autopub / planAutopubCycle', () => {
  it('4 pasos base sin CAL; 5 con publishDue', () => {
    const p = planAutopubCycle(CONFIG, 7);
    expect(p.pasos.map((x) => x.fase)).toEqual(['F1', 'F2', 'F3', 'F4']);
    expect(p.disponibles).toBe(7);
    const p2 = planAutopubCycle({ ...CONFIG, publishDue: true }, 7);
    expect(p2.pasos.map((x) => x.fase)).toEqual(['F1', 'F2', 'F3', 'F4', 'CAL']);
  });

  it('determinista con reloj inyectable', () => {
    const a = planAutopubCycle(CONFIG, 3, () => new Date('2026-08-22T00:00:00Z'));
    const b = planAutopubCycle(CONFIG, 3, () => new Date('2026-08-22T00:00:00Z'));
    expect(a).toEqual(b);
    expect(a.generadoEn).toBe('2026-08-22T00:00:00.000Z');
  });
});

// ---------------------------------------------------------------------------
// Conversiones / extraccion
// ---------------------------------------------------------------------------

describe('autopub / rowToBrief', () => {
  it('mapea la fila de la cola a TopicBrief', () => {
    const b = rowToBrief(briefRow({ canal: 'tiktok', formato: '9:16 video' }));
    expect(b.canal).toBe('tiktok');
    expect(b.formato).toBe('9:16 video');
    expect(b.tema).toContain('Tema');
    expect(Array.isArray(b.fuentes)).toBe(true);
  });
});

describe('autopub / textoDeContenido', () => {
  it('texto: une titulo/intro/cuerpo/cierre/cta', () => {
    const cp = {
      contenido: { titulo: 'T', intro: 'I', cuerpo: ['C1', 'C2'], cierre: 'F', cta: 'CTA', palabrasClave: [] },
    } as unknown as ContentPackage;
    expect(textoDeContenido(cp)).toBe('T\n\nI\n\nC1\n\nC2\n\nF\n\nCTA');
  });

  it('guion: devuelve la narracion completa', () => {
    const cp = { guion: { narracion: 'HOOK escenas' } } as unknown as ContentPackage;
    expect(textoDeContenido(cp)).toBe('HOOK escenas');
  });

  it('guion_largo: junta los dialogos del timeline', () => {
    const cp = {
      timeline: { tracks: { dialogue: [{ text: 'a' }, { text: 'b' }] } },
      brief: { tema: 'Largo' },
    } as unknown as ContentPackage;
    expect(textoDeContenido(cp)).toBe('a\n\nb');
  });

  it('fallback al tema del brief', () => {
    const cp = { brief: { tema: 'Solo tema' } } as unknown as ContentPackage;
    expect(textoDeContenido(cp)).toBe('Solo tema');
  });
});

// ---------------------------------------------------------------------------
// Ciclo
// ---------------------------------------------------------------------------

describe('autopub / runAutopubCycle', () => {
  it('happy path: procesa, encola por el canal del brief y marca PROCESADO', async () => {
    const state: FakeState = { marcas: [], encolados: [], publicado: false };
    const report = await runAutopubCycle(fakeDeps([briefRow(), briefRow()], state), CONFIG);
    expect(report.ok).toBe(true);
    expect(report.procesados).toHaveLength(2);
    expect(state.marcas).toHaveLength(2);
    expect(report.procesados[0].estado).toBe('APPROVED'); // blog auto-aprueba
    expect(report.publicadas).toBeNull(); // publishDue apagado
    expect(report.fechaIso).toBe('2026-08-22T12:00:00.000Z');
  });

  it('brief con canal fuera de config.canales → usa el primer canal configurado', async () => {
    const state: FakeState = { marcas: [], encolados: [], publicado: false };
    await runAutopubCycle(fakeDeps([briefRow({ canal: 'slack' })], state), {
      ...CONFIG,
      canales: ['blog'],
    });
    expect(state.encolados[0].canal).toBe('blog');
  });

  it('fallo en F1 no aborta el ciclo: usa la cola existente y registra el error', async () => {
    const state: FakeState = { marcas: [], encolados: [], publicado: false };
    const deps = fakeDeps([briefRow()], state);
    deps.descubrirTemas = async () => {
      throw new Error('red caida');
    };
    deps.guardar = async () => ({ creados: 0, yaExistentes: 0 });
    const report = await runAutopubCycle(deps, CONFIG);
    expect(report.ok).toBe(false);
    expect(report.errores[0]).toContain('F1');
    expect(report.procesados).toHaveLength(1); // la cola existente se proceso igual
  });

  it('fallo puntual de un brief no tumba el lote', async () => {
    const rows = [briefRow(), briefRow()];
    const state: FakeState = { marcas: [], encolados: [], publicado: false };
    const deps = fakeDeps(rows, state);
    let n = 0;
    deps.generarPaquete = async (row) => {
      n++;
      if (n === 1) throw new Error('edge-tts timeout');
      return { paquete: fakePaquete(`brief-${row.id}`) };
    };
    const report = await runAutopubCycle(deps, CONFIG);
    expect(report.ok).toBe(false);
    expect(report.errores).toHaveLength(1);
    expect(report.procesados).toHaveLength(1);
  });

  it('respeta maxBriefs como take de la cola', async () => {
    const takes: number[] = [];
    const deps = fakeDeps([briefRow()]);
    deps.listarCola = async (take) => {
      takes.push(take);
      return [];
    };
    await runAutopubCycle(deps, CONFIG);
    expect(takes).toEqual([2]);
  });

  it('publishDue=false no llama publicarVencidos; true agrega los numeros', async () => {
    const state: FakeState = { marcas: [], encolados: [], publicado: false };
    const deps = fakeDeps([], state);
    deps.publicarVencidos = async () => {
      state.publicado = true;
      return { publicadas: 2, fallidas: 1 };
    };
    const off = await runAutopubCycle(deps, { ...CONFIG, publishDue: false });
    expect(off.publicadas).toBeNull();
    expect(state.publicado).toBe(false);

    const on = await runAutopubCycle(deps, { ...CONFIG, publishDue: true });
    expect(on.publicadas).toBe(2);
    expect(on.fallidas).toBe(1);
  });

  it('fallo de marca PROCESADO se registra pero el item queda procesado', async () => {
    const deps = fakeDeps([briefRow()]);
    deps.marcarProcesado = async () => {
      throw new Error('db busy');
    };
    const report = await runAutopubCycle(deps, CONFIG);
    expect(report.procesados).toHaveLength(1);
    expect(report.ok).toBe(false);
    expect(report.errores[0]).toContain('db busy');
  });

  it('F1 cuenta creados y duplicados del guardado', async () => {
    const deps = fakeDeps([]);
    deps.descubrirTemas = async () => [];
    deps.guardar = async () => ({ creados: 4, yaExistentes: 2 });
    const report = await runAutopubCycle(deps, CONFIG);
    expect(report.briefsCreados).toBe(4);
    expect(report.duplicados).toBe(2);
    expect(report.temasDescubiertos).toBe(0);
  });
});

describe('autopub / resumenAutopub', () => {
  it('incluye cabecera, conteos y errores', async () => {
    const deps = fakeDeps([briefRow()]);
    deps.marcarProcesado = async () => {
      throw new Error('db busy x');
    };
    const report = await runAutopubCycle(deps, { ...CONFIG, publishDue: true });
    const md = resumenAutopub(report);
    expect(md).toContain('# AutoPub ciclo');
    expect(md).toContain('| tema | canal | tipo | estado |');
    expect(md).toContain('- marca');
    expect(md).toContain('db busy x');
  });
});

// ---------------------------------------------------------------------------
// Deps reales: contrato sin DB (dry-run no persiste)
// ---------------------------------------------------------------------------

describe('autopub / defaultAutopubDeps (contrato dry-run)', () => {
  it('dryRun: encolar devuelve DRY con requiereAprobacion segun canal y guardar no crea', async () => {
    // Db nunca debe tocarse en dry-run: pasamos un proxy que explota si se usa.
    const dbExplosivo = new Proxy({}, {
      get() {
        throw new Error('la DB no debe tocarse en dry-run');
      },
    }) as never;
    const deps = defaultAutopubDeps(dbExplosivo, { dryRun: true });
    const g = await deps.guardar!([]);
    expect(g).toEqual({ creados: 0, yaExistentes: 0 });
    const enc = await deps.encolar!({
      paquete: fakePaquete('brief-x'),
      canal: 'youtube_shorts',
    });
    expect(enc.estado).toBe('DRY');
    expect(enc.requiereAprobacion).toBe(true); // video → humano
    const encBlog = await deps.encolar!({ paquete: fakePaquete('brief-y'), canal: 'blog' });
    expect(encBlog.requiereAprobacion).toBe(false); // blog auto
    expect(await deps.marcarProcesado!('r1')).toBeNull();
    expect(await deps.publicarVencidos!()).toEqual({ publicadas: 0, fallidas: 0 });
  });
});

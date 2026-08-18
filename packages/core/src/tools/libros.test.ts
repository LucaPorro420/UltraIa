import { describe, it, expect } from 'vitest';
import {
  LIBROS,
  SECCIONES_LIBROS,
  CATEGORIAS_LIBROS,
  FORMATOS_LIBRO,
  buscarLibros,
  librosPorSeccion,
  categoriasLibros,
  normalizarSeccion,
  validarPropuestaLibro,
} from './libros';

describe('libros: integridad del catálogo', () => {
  it('contiene 115 recursos (total declarado por librosgratis.dev)', () => {
    expect(LIBROS.length).toBe(115);
  });

  it('contiene 32 secciones y 8 categorías', () => {
    expect(SECCIONES_LIBROS.length).toBe(32);
    expect(CATEGORIAS_LIBROS.length).toBe(8);
  });

  it('todos los recursos tienen título, url http(s) y sección válida', () => {
    const ids = new Set(SECCIONES_LIBROS.map((s) => s.id));
    for (const l of LIBROS) {
      expect(l.titulo.length).toBeGreaterThan(0);
      expect(l.url.startsWith('http://') || l.url.startsWith('https://')).toBe(true);
      expect(ids.has(l.seccion)).toBe(true);
    }
  });

  it('no hay duplicados de título+url', () => {
    const vistos = new Set<string>();
    for (const l of LIBROS) {
      const key = `${l.titulo}|${l.url}`;
      expect(vistos.has(key)).toBe(false);
      vistos.add(key);
    }
  });

  it('todas las secciones referenciadas existen y todas las secciones tienen recursos', () => {
    const conRecursos = new Set(LIBROS.map((l) => l.seccion));
    expect(conRecursos.size).toBe(32);
    for (const s of SECCIONES_LIBROS) {
      expect(conRecursos.has(s.id)).toBe(true);
      expect(s.titulo.length).toBeGreaterThan(0);
      expect(s.descripcion.length).toBeGreaterThan(0);
      expect(CATEGORIAS_LIBROS.some((c) => c.id === s.categoria)).toBe(true);
    }
  });

  it('los conteos por sección coinciden con el índice del README', () => {
    const esperados: Record<string, number> = {
      generales: 3,
      algoritmos: 8,
      'html-css': 4,
      javascript: 13,
      typescript: 7,
      python: 13,
      ruby: 3,
      rust: 5,
      blockchain: 4,
      php: 4,
      haskell: 3,
      golang: 2,
      kotlin: 2,
      android: 2,
      c: 1,
      cplusplus: 4,
      csharp: 2,
      java: 6,
      r: 2,
      react: 4,
      qwik: 1,
      nodejs: 1,
      angular: 1,
      django: 2,
      git: 4,
      docker: 2,
      linux: 2,
      sql: 4,
      nosql: 2,
      'sistemas-operativos': 1,
      ia: 1,
      metodologias: 2,
    };
    for (const [id, n] of Object.entries(esperados)) {
      expect(LIBROS.filter((l) => l.seccion === id).length).toBe(n);
    }
  });
});

describe('libros: categorías (conteos computados)', () => {
  it('lenguajes: 15 secciones y 71 recursos (verificado contra README)', () => {
    const c = categoriasLibros().find((x) => x.id === 'lenguajes')!;
    expect(c.secciones).toBe(15);
    expect(c.total).toBe(71);
  });

  it('frameworks: 5 secciones y 9 recursos', () => {
    const c = categoriasLibros().find((x) => x.id === 'frameworks')!;
    expect(c.secciones).toBe(5);
    expect(c.total).toBe(9);
  });

  it('herramientas: 3 secciones y 8 recursos; bases-datos: 2 y 6; ia-datos: 1 y 1', () => {
    const h = categoriasLibros().find((x) => x.id === 'herramientas')!;
    expect(h.secciones).toBe(3);
    expect(h.total).toBe(8);
    const bd = categoriasLibros().find((x) => x.id === 'bases-datos')!;
    expect(bd.secciones).toBe(2);
    expect(bd.total).toBe(6);
    const ia = categoriasLibros().find((x) => x.id === 'ia-datos')!;
    expect(ia.secciones).toBe(1);
    expect(ia.total).toBe(1);
  });

  it('la suma de todas las categorías es 115 (el README suma 114 — su error interno)', () => {
    const total = categoriasLibros().reduce((acc, c) => acc + c.total, 0);
    expect(total).toBe(115);
  });

  it('cada categoría incluye al menos una sección con nombre', () => {
    for (const c of categoriasLibros()) {
      expect(c.nombre.length).toBeGreaterThan(0);
      expect(c.secciones).toBeGreaterThan(0);
    }
  });
});

describe('libros: normalizarSeccion', () => {
  it('acepta id, título con acentos y título sin acentos', () => {
    expect(normalizarSeccion('python')).toBe('python');
    expect(normalizarSeccion('Python')).toBe('python');
    expect(normalizarSeccion('Metodologías de desarrollo')).toBe('metodologias');
    expect(normalizarSeccion('metodologias de desarrollo')).toBe('metodologias');
    expect(normalizarSeccion('ALGORITMOS Y ESTRUCTURAS DE DATOS')).toBe('algoritmos');
  });

  it('devuelve undefined para secciones inexistentes', () => {
    expect(normalizarSeccion('cobol')).toBeUndefined();
    expect(normalizarSeccion('')).toBeUndefined();
  });
});

describe('libros: buscarLibros', () => {
  it('busca por término en título, autor o sección (case-insensitive)', () => {
    const r = buscarLibros('javascript');
    expect(r.length).toBeGreaterThan(0);
    for (const l of r) {
      const texto = `${l.titulo} ${l.autor ?? ''}`.toLowerCase();
      const seccion = SECCIONES_LIBROS.find((s) => s.id === l.seccion)!.titulo.toLowerCase();
      expect(texto.includes('javascript') || seccion.includes('javascript')).toBe(true);
    }
    // El primero debe matchear en el título (score 3 > autor 2 > sección 1)
    expect(r[0].titulo.toLowerCase().includes('javascript')).toBe(true);
  });

  it('multi-término: todos los términos deben aparecer (título+autor)', () => {
    const r = buscarLibros('python para todos');
    expect(r.length).toBeGreaterThan(0);
    for (const l of r) {
      const texto = `${l.titulo} ${l.autor ?? ''}`.toLowerCase();
      expect(texto.includes('python')).toBe(true);
      expect(texto.includes('para')).toBe(true);
      expect(texto.includes('todos')).toBe(true);
    }
  });

  it('es accent-insensitive (diseño/diseño)', () => {
    const r = buscarLibros('diseno interfaces');
    expect(r.some((l) => l.titulo === 'Diseño de Interfaces Web')).toBe(true);
  });

  it('filtra por sección (id y título)', () => {
    const porId = buscarLibros('guia', { seccion: 'git' });
    const porTitulo = buscarLibros('guia', { seccion: 'Git' });
    expect(porId).toEqual(porTitulo);
    expect(porId.length).toBeGreaterThan(0);
    expect(porId.every((l) => l.seccion === 'git')).toBe(true);
  });

  it('filtra por formato', () => {
    const r = buscarLibros('python', { formato: 'PDF' });
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((l) => l.formato?.includes('PDF'))).toBe(true);
  });

  it('respeta max (default 20) y max 1', () => {
    const todos = buscarLibros('a');
    expect(todos.length).toBeLessThanOrEqual(20);
    const uno = buscarLibros('python', { max: 1 });
    expect(uno.length).toBe(1);
  });

  it('ordena por score: match en título antes que solo en autor o sección', () => {
    const r = buscarLibros('react');
    expect(r.length).toBeGreaterThan(0);
    // El primer resultado debe tener "react" en el título
    expect(r[0].titulo.toLowerCase().includes('react')).toBe(true);
  });

  it('resultado vacío cuando no hay match', () => {
    expect(buscarLibros('zzzznada')).toEqual([]);
  });
});

describe('libros: librosPorSeccion', () => {
  it('devuelve los recursos de la sección en orden', () => {
    const r = librosPorSeccion('python');
    expect(r.length).toBe(13);
    expect(r[0].titulo).toBe('Aprende Python');
  });

  it('devuelve [] para sección inexistente', () => {
    expect(librosPorSeccion('cobol')).toEqual([]);
  });
});

describe('libros: validarPropuestaLibro (reglas del README)', () => {
  it('acepta una propuesta completa válida', () => {
    const v = validarPropuestaLibro({
      titulo: 'El libro de la prueba',
      autor: 'Autor Ejemplo',
      url: 'https://ejemplo.com/libro.pdf',
      formato: 'PDF',
      gratis: true,
      espanol: true,
    });
    expect(v.ok).toBe(true);
    expect(v.errores).toEqual([]);
  });

  it('acepta formatos combinados "HTML, PDF"', () => {
    const v = validarPropuestaLibro({
      titulo: 'Guía combinada',
      url: 'https://ejemplo.com/guia',
      formato: 'HTML, PDF',
      gratis: true,
      espanol: true,
    });
    expect(v.ok).toBe(true);
  });

  it('rechaza sin título o título corto', () => {
    const v = validarPropuestaLibro({
      titulo: 'ab',
      url: 'https://ejemplo.com',
      formato: 'HTML',
      gratis: true,
      espanol: true,
    });
    expect(v.ok).toBe(false);
    expect(v.errores.some((e) => e.includes('título'))).toBe(true);
  });

  it('rechaza URL inválida o no http(s)', () => {
    const v1 = validarPropuestaLibro({ titulo: 'Libro X', url: 'ftp://nope.com', formato: 'HTML', gratis: true, espanol: true });
    expect(v1.errores.some((e) => e.includes('URL'))).toBe(true);
    const v2 = validarPropuestaLibro({ titulo: 'Libro X', url: 'no-url', formato: 'HTML', gratis: true, espanol: true });
    expect(v2.errores.some((e) => e.includes('URL'))).toBe(true);
  });

  it('rechaza formato no válido', () => {
    const v = validarPropuestaLibro({ titulo: 'Libro X', url: 'https://ejemplo.com', formato: 'DOCX', gratis: true, espanol: true });
    expect(v.ok).toBe(false);
    expect(v.errores.some((e) => e.includes('Formato'))).toBe(true);
  });

  it('rechaza si no es gratis o no está en español', () => {
    const v1 = validarPropuestaLibro({ titulo: 'Libro X', url: 'https://ejemplo.com', formato: 'PDF', gratis: false, espanol: true });
    expect(v1.errores.some((e) => e.includes('gratuito'))).toBe(true);
    const v2 = validarPropuestaLibro({ titulo: 'Libro X', url: 'https://ejemplo.com', formato: 'PDF', gratis: true, espanol: false });
    expect(v2.errores.some((e) => e.includes('español'))).toBe(true);
  });

  it('acumula múltiples errores a la vez', () => {
    const v = validarPropuestaLibro({ titulo: 'x', url: 'mala', formato: 'DOCX', gratis: false, espanol: false });
    expect(v.ok).toBe(false);
    expect(v.errores.length).toBeGreaterThanOrEqual(4);
  });
});

describe('libros: constantes', () => {
  it('FORMATOS_LIBRO contiene los formatos del README', () => {
    expect(FORMATOS_LIBRO).toEqual(['PDF', 'HTML', 'ePub', 'eBook']);
  });
});
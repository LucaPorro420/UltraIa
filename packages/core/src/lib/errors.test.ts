/**
 * Tests TDD para las clases de error HTTP.
 *
 * Patrón: cada test verifica un comportamiento específico.
 * Si el test falla, la implementación tiene un bug.
 */
import { describe, expect, it } from 'vitest';
import {
  AppError,
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  RateLimitError,
  type HttpError,
  type ErrorResponse,
} from './errors';

describe('AppError (base class)', () => {
  it('tiene statusCode por defecto 500', () => {
    const error = new AppError('test');
    expect(error.statusCode).toBe(500);
  });

  it('acepta statusCode personalizado', () => {
    const error = new AppError('test', 418);
    expect(error.statusCode).toBe(418);
  });

  it('esOperational es true por defecto', () => {
    const error = new AppError('test');
    expect(error.isOperational).toBe(true);
  });

  it('acepta isOperational personalizado', () => {
    const error = new AppError('test', 500, false);
    expect(error.isOperational).toBe(false);
  });

  it('hereda de Error', () => {
    const error = new AppError('test');
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('AppError');
  });

  it('tiene stack trace', () => {
    const error = new AppError('test');
    expect(error.stack).toBeDefined();
    expect(error.stack).toContain('AppError');
  });
});

describe('NotFoundError', () => {
  it('tiene statusCode 404', () => {
    const error = new NotFoundError();
    expect(error.statusCode).toBe(404);
  });

  it('tiene mensaje por defecto', () => {
    const error = new NotFoundError();
    expect(error.message).toBe('Recurso no encontrado');
  });

  it('acepta mensaje personalizado', () => {
    const error = new NotFoundError('Agente no encontrado');
    expect(error.message).toBe('Agente no encontrado');
  });

  it('es instancia de AppError y Error', () => {
    const error = new NotFoundError();
    expect(error).toBeInstanceOf(AppError);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('NotFoundError');
  });
});

describe('ValidationError', () => {
  it('tiene statusCode 400', () => {
    const error = new ValidationError();
    expect(error.statusCode).toBe(400);
  });

  it('tiene mensaje por defecto', () => {
    const error = new ValidationError();
    expect(error.message).toBe('Datos inválidos');
  });

  it('acepta errores de campos', () => {
    const fieldErrors = { email: 'Email inválido', name: 'Requerido' };
    const error = new ValidationError('Body inválido', fieldErrors);
    expect(error.errors).toEqual(fieldErrors);
  });

  it('errors es undefined por defecto', () => {
    const error = new ValidationError();
    expect(error.errors).toBeUndefined();
  });
});

describe('UnauthorizedError', () => {
  it('tiene statusCode 401', () => {
    const error = new UnauthorizedError();
    expect(error.statusCode).toBe(401);
  });

  it('tiene mensaje por defecto', () => {
    const error = new UnauthorizedError();
    expect(error.message).toBe('No autorizado');
  });

  it('es instancia de AppError', () => {
    const error = new UnauthorizedError();
    expect(error).toBeInstanceOf(AppError);
    expect(error.name).toBe('UnauthorizedError');
  });
});

describe('ForbiddenError', () => {
  it('tiene statusCode 403', () => {
    const error = new ForbiddenError();
    expect(error.statusCode).toBe(403);
  });

  it('tiene mensaje por defecto', () => {
    const error = new ForbiddenError();
    expect(error.message).toBe('Acceso denegado');
  });
});

describe('ConflictError', () => {
  it('tiene statusCode 409', () => {
    const error = new ConflictError();
    expect(error.statusCode).toBe(409);
  });

  it('tiene mensaje por defecto', () => {
    const error = new ConflictError();
    expect(error.message).toBe('Conflicto');
  });
});

describe('RateLimitError', () => {
  it('tiene statusCode 429', () => {
    const error = new RateLimitError();
    expect(error.statusCode).toBe(429);
  });

  it('tiene mensaje por defecto', () => {
    const error = new RateLimitError();
    expect(error.message).toBe('Demasiadas solicitudes');
  });
});

describe('Comportamiento de throw/catch', () => {
  it('se puede throw y catch como AppError', () => {
    expect(() => {
      throw new NotFoundError('test');
    }).toThrow(AppError);
  });

  it('se puede catch por tipo específico', () => {
    try {
      throw new ValidationError('bad');
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).statusCode).toBe(400);
    }
  });

  it('error de autorización se puede distinguir de otros', () => {
    const errors = [
      new NotFoundError(),
      new UnauthorizedError(),
      new ForbiddenError(),
    ];

    const unauthorized = errors.filter((e) => e.statusCode === 401);
    expect(unauthorized).toHaveLength(1);
    expect(unauthorized[0]).toBeInstanceOf(UnauthorizedError);
  });
});

describe('Discriminated union (HttpError)', () => {
  it('AppError.isHttpError identifica errores HTTP', () => {
    const error = new NotFoundError();
    expect(AppError.isHttpError(error)).toBe(true);
  });

  it('AppError.isHttpError rechaza errores no-HTTP', () => {
    const error = new Error('regular error');
    expect(AppError.isHttpError(error)).toBe(false);
  });

  it('AppError.isHttpError rechaza null/undefined', () => {
    expect(AppError.isHttpError(null)).toBe(false);
    expect(AppError.isHttpError(undefined)).toBe(false);
  });
});

describe('toJSON() para respuestas API', () => {
  it('AppError.toJSON() retorna ErrorResponse válido', () => {
    const error = new AppError('Internal', 500);
    const json = error.toJSON();
    expect(json).toEqual({
      error: 'Internal',
      statusCode: 500,
    });
  });

  it('ValidationError.toJSON() incluye details', () => {
    const error = new ValidationError('Bad', { email: 'Invalid' });
    const json = error.toJSON();
    expect(json).toEqual({
      error: 'Bad',
      statusCode: 400,
      details: { email: 'Invalid' },
    });
  });

  it('NotFoundError.toJSON() retorna 404', () => {
    const error = new NotFoundError();
    const json = error.toJSON();
    expect(json.statusCode).toBe(404);
  });
});

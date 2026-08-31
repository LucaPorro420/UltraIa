/**
 * Errores HTTP personalizados para la API.
 *
 * Cada clase lleva un statusCode y esOperational (true = error esperado,
 * false = bug interno que no se debe exponer al cliente).
 *
 * Patrón: Discriminated union para type narrowing en catch blocks.
 */

// Tipos discriminados para errores HTTP
export type HttpError =
  | NotFoundError
  | ValidationError
  | UnauthorizedError
  | ForbiddenError
  | ConflictError
  | RateLimitError
  | AppError;

// Tipo para la respuesta de error JSON
export interface ErrorResponse {
  error: string;
  statusCode: number;
  details?: Record<string, string>;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 500, isOperational = true) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.isOperational = isOperational;
  }

  // Type guard para discriminated union
  static isHttpError(error: unknown): error is HttpError {
    return error instanceof AppError;
  }

  // Extrae respuesta JSON segura (no expone stack trace)
  toJSON(): ErrorResponse {
    return {
      error: this.message,
      statusCode: this.statusCode,
    };
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Recurso no encontrado') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends AppError {
  public readonly errors?: Record<string, string>;

  constructor(message = 'Datos inválidos', errors?: Record<string, string>) {
    super(message, 400);
    this.name = 'ValidationError';
    this.errors = errors;
  }

  // Override para incluir detalles en JSON
  override toJSON(): ErrorResponse {
    return {
      error: this.message,
      statusCode: this.statusCode,
      details: this.errors,
    };
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'No autorizado') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Acceso denegado') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflicto') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Demasiadas solicitudes') {
    super(message, 429);
    this.name = 'RateLimitError';
  }
}

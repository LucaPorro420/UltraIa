/**
 * Respuestas de error consistentes para la API.
 *
 * Patrón: Discriminated union para type narrowing en error handling.
 *
 * Uso:
 *   throw new NotFoundError('Agente no encontrado')
 *   → Next.js captura y el error.tsx lo muestra
 *
 * Para errores manuales en route handlers:
 *   return apiError('Unauthorized', 401)
 */

import {
  AppError,
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  type HttpError,
  type ErrorResponse,
} from '@ultraia/core';
import { NextResponse } from 'next/server';

// Tipo para respuestas de éxito
type SuccessResponse<T> = { data: T; status: number };

// Unión discriminated para todas las respuestas API
export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

/**
 * Crea respuesta de error consistente.
 */
export function apiError(message: string, status = 500): NextResponse {
  return NextResponse.json({ error: message, statusCode: status }, { status });
}

/**
 * Crea respuesta de error de validación con detalles.
 */
export function apiValidationError(message: string, errors?: Record<string, string>): NextResponse {
  return NextResponse.json(
    { error: message, statusCode: 400, details: errors },
    { status: 400 }
  );
}

/**
 * Convierte un HttpError a NextResponse de forma type-safe.
 */
export function errorToResponse(error: HttpError): NextResponse {
  return NextResponse.json(error.toJSON(), { status: error.statusCode });
}

/**
 * Extrae el statusCode de un error lanzado en un route handler.
 */
export function getErrorStatus(error: unknown): number {
  if (AppError.isHttpError(error)) return error.statusCode;
  return 500;
}

/**
 * Extrae el mensaje de error seguro (no expone detalles internos).
 */
export function getErrorMessage(error: unknown): string {
  if (AppError.isHttpError(error)) return error.message;
  if (error instanceof Error) {
    // No exponer mensajes de errores internos en producción
    return process.env.NODE_ENV === 'production'
      ? 'Error interno del servidor'
      : error.message;
  }
  return 'Error desconocido';
}

export {
  AppError,
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  type HttpError,
  type ErrorResponse,
};

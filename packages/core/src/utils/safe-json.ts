/**
 * Safe JSON parse utilities — prevents unhandled SyntaxError crashes
 * when tools receive malformed JSON from models or external sources.
 */

/** Parse JSON safely; returns undefined on failure instead of throwing. */
export function safeJsonParse<T = unknown>(raw: string): T | undefined {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

/** Parse JSON safely with a default fallback value. */
export function safeJsonParseWith<T>(raw: string, defaultValue: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

/** Parse JSON safely and throw a descriptive Error on failure. */
export function safeJsonParseOrThrow<T = unknown>(
  raw: string,
  context: string,
): T {
  try {
    return JSON.parse(raw) as T;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Invalid JSON in ${context}: ${message}`);
  }
}

/**
 * Validate that a JSON string is an array; returns [] on failure.
 */
export function safeJsonArray<T = unknown>(raw: string): T[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Validate that a JSON string is a plain object; returns {} on failure.
 */
export function safeJsonObject<T extends Record<string, unknown> = Record<string, unknown>>(
  raw: string,
): T {
  try {
    const parsed = JSON.parse(raw);
    return (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed))
      ? (parsed as T)
      : ({} as T);
  } catch {
    return {} as T;
  }
}

/**
 * Sanitize error messages for client responses (L03 — info disclosure).
 * Logs the full error server-side; returns a safe generic message to the client.
 */

/** Maps known error types to safe messages. Everything else returns a generic. */
const SAFE_MESSAGES: Record<string, string> = {
  'Publication not found': 'Publication not found',
  'Publication is not in DRAFT state': 'Invalid publication state',
  'Publication is not in APPROVED state': 'Invalid publication state',
  'Rating debe ser GOOD o BAD': 'Rating debe ser GOOD o BAD',
};

export function sanitizeError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  console.error('[API error]', msg);
  // Return safe message if known, otherwise generic
  return SAFE_MESSAGES[msg] ?? 'Internal server error';
}

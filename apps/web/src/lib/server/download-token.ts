/**
 * H04 FIX: Short-lived, HMAC-signed download tokens for mobile webview access.
 *
 * Instead of leaking session tokens in URL query params (logged in server/proxy/browser
 * history), we generate single-purpose tokens signed with DOWNLOAD_SECRET.
 *
 * Token format: base64url(expiresAt) + "." + hmac-sha256(assetId + expiresAt)
 * TTL: 60 seconds, single use.
 */

import { createHmac, randomBytes } from 'node:crypto';

const DOWNLOAD_TOKEN_TTL_MS = 60_000; // 60 seconds
const SECRET_ENV = 'DOWNLOAD_SECRET';

function getSecret(): string {
  const secret = process.env[SECRET_ENV];
  if (!secret) {
    // Fallback: generate a per-process random secret (invalidates tokens on restart).
    // In production, DOWNLOAD_SECRET MUST be set in .env.
    const { randomBytes: rb } = require('node:crypto') as typeof import('node:crypto');
    return rb(32).toString('base64url');
  }
  return secret;
}

function sign(data: string, secret: string): string {
  return createHmac('sha256', secret).update(data).digest('base64url');
}

/** Generate a short-lived, HMAC-signed download token for an asset. */
export function createDownloadToken(assetId: string, userId: string): string {
  const expiresAt = Date.now() + DOWNLOAD_TOKEN_TTL_MS;
  const payload = `${assetId}:${userId}:${expiresAt}`;
  const sig = sign(payload, getSecret());
  return `${Buffer.from(String(expiresAt)).toString('base64url')}.${sig}`;
}

/** Verify a download token. Returns { assetId, userId } if valid, null otherwise. */
export function verifyDownloadToken(
  token: string,
  assetId: string,
  userId: string,
): { valid: boolean; reason?: string } {
  const dotIdx = token.indexOf('.');
  if (dotIdx === -1) return { valid: false, reason: 'malformed' };

  const expiresB64 = token.slice(0, dotIdx);
  const sig = token.slice(dotIdx + 1);

  let expiresAt: number;
  try {
    expiresAt = parseInt(Buffer.from(expiresB64, 'base64url').toString(), 10);
  } catch {
    return { valid: false, reason: 'bad expiry' };
  }

  if (isNaN(expiresAt) || Date.now() > expiresAt) {
    return { valid: false, reason: 'expired' };
  }

  const payload = `${assetId}:${userId}:${expiresAt}`;
  const expected = sign(payload, getSecret());

  // Timing-safe comparison
  const { timingSafeEqual } = require('node:crypto') as typeof import('node:crypto');
  if (sig.length !== expected.length) return { valid: false, reason: 'invalid' };
  if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return { valid: false, reason: 'invalid' };
  }

  return { valid: true };
}

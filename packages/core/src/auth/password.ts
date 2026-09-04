//! Password hashing and strength validation.
// Uses bcrypt (cost 12) for secure one-way hashing. Includes NIST/SecLists
// common password blocklist (top 20) and structural strength checks (length,
// uppercase, lowercase, number). Fail-soft: throws on weak passwords.
import bcrypt from 'bcryptjs';

const COST = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, COST);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** Common passwords blocklist (top 20 from NIST/SecLists 2024). */
const COMMON_PASSWORDS = new Set([
  'password', 'password1', '123456', '12345678', 'qwerty', 'qwerty12', 'abc123', 'monkey', 'master',
  'dragon', 'login', 'princess', 'football', 'shadow', 'sunshine', 'trustno1',
  'iloveyou', 'batman', 'access', 'hello', 'charlie',
]);

export function assertStrongPassword(password: string): void {
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }
  // Structural checks first (uppercase/lowercase/number) — these catch weak
  // passwords even if they aren't on the common list.
  if (!/[A-Z]/.test(password)) {
    throw new Error('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    throw new Error('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    throw new Error('Password must contain at least one number');
  }
  // Common password check last — only applies to passwords that already
  // pass structural checks (e.g. "Password1" or "Qwerty12").
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    throw new Error('Password is too common; choose a more unique password');
  }
}

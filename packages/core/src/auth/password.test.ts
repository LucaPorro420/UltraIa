import { describe, it, expect } from 'vitest';
import { assertStrongPassword, hashPassword, verifyPassword } from './password';

describe('assertStrongPassword', () => {
  it('accepts a strong password', () => {
    expect(() => assertStrongPassword('MyS3cure!Pass')).not.toThrow();
  });

  it('rejects password shorter than 8 characters', () => {
    expect(() => assertStrongPassword('Ab1x')).toThrow('at least 8 characters');
  });

  it('rejects common passwords that pass structural checks', () => {
    // "Password1" passes uppercase+lowercase+number but is common
    expect(() => assertStrongPassword('Password1')).toThrow('too common');
    // "Qwerty12" passes all structural checks but is common
    expect(() => assertStrongPassword('Qwerty12')).toThrow('too common');
  });

  it('rejects password without uppercase', () => {
    expect(() => assertStrongPassword('alllower123')).toThrow('uppercase');
  });

  it('rejects password without lowercase', () => {
    expect(() => assertStrongPassword('ALLUPPER123')).toThrow('lowercase');
  });

  it('rejects password without numbers', () => {
    expect(() => assertStrongPassword('NoNumbersHere')).toThrow('number');
  });

  it('is case-insensitive for common password check', () => {
    // "Password1" passes all structural checks (upper+lower+digit) but is common
    expect(() => assertStrongPassword('Password1')).toThrow('too common');
  });
});

describe('hashPassword / verifyPassword', () => {
  it('round-trips correctly', async () => {
    const hash = await hashPassword('TestPass1!');
    expect(await verifyPassword('TestPass1!', hash)).toBe(true);
    expect(await verifyPassword('WrongPass1!', hash)).toBe(false);
  });
});

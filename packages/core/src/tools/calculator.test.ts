import { describe, expect, it } from 'vitest';
import { evaluate } from './calculator';

describe('evaluate', () => {
  it('handles basic arithmetic', () => {
    expect(evaluate('2 + 3 * 4')).toBe(14);
    expect(evaluate('(2 + 3) * 4')).toBe(20);
    expect(evaluate('10 / 4')).toBe(2.5);
    expect(evaluate('7 % 3')).toBe(1);
    expect(evaluate('2 ^ 10')).toBe(1024);
  });

  it('handles unary minus and decimals', () => {
    expect(evaluate('-5 + 3')).toBe(-2);
    expect(evaluate('1.5 * 2')).toBe(3);
    expect(evaluate('--3')).toBe(3);
  });

  it('handles functions', () => {
    expect(evaluate('sqrt(16)')).toBe(4);
    expect(evaluate('abs(-7)')).toBe(7);
    expect(evaluate('round(2.6)')).toBe(3);
    expect(evaluate('floor(2.9)')).toBe(2);
    expect(evaluate('ceil(2.1)')).toBe(3);
    expect(evaluate('min(3, 7)')).toBe(3);
    expect(evaluate('max(3, 7)')).toBe(7);
    expect(evaluate('pow(2, 8)')).toBe(256);
    expect(evaluate('sqrt(9) + abs(-1)')).toBe(4);
  });

  it('rejects invalid input', () => {
    expect(() => evaluate('2 +')).toThrow();
    expect(() => evaluate('1/0')).toThrow();
    expect(() => evaluate('sqrt(-4)')).toThrow();
    expect(() => evaluate('a + b')).toThrow();
    expect(() => evaluate('2; rm -rf')).toThrow();
    expect(() => evaluate('2 ( 3')).toThrow();
    expect(() => evaluate('1 2')).toThrow();
    expect(() => evaluate('evaluate("x")')).toThrow();
    expect(() => evaluate('Math.pow(2,3)')).toThrow();
  });

  it('rejects oversized expressions', () => {
    expect(() => evaluate('1 + '.repeat(100) + '1')).toThrow();
  });

  it('enforces function arity', () => {
    expect(() => evaluate('sqrt(1,2)')).toThrow();
    expect(() => evaluate('min(1)')).toThrow();
  });
});

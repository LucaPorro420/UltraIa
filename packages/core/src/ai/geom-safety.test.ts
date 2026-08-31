/**
 * Tests TDD para validación segura de expresiones matemáticas.
 *
 * VULN-001: new Function() con input del LLM es RCE.
 * Solución: validar que las expresiones solo contengan matemáticas seguras.
 */
import { describe, expect, it } from 'vitest';
import { isSafeMathExpression } from './geom-safety';

describe('isSafeMathExpression', () => {
  it('acepta expresiones matemáticas simples', () => {
    expect(isSafeMathExpression('Math.cos(u)')).toBe(true);
    expect(isSafeMathExpression('u * v')).toBe(true);
    expect(isSafeMathExpression('Math.sin(u * 2 * Math.PI)')).toBe(true);
    expect(isSafeMathExpression('[Math.cos(u), Math.sin(v), 0]')).toBe(true);
  });

  it('acepta números y operadores', () => {
    expect(isSafeMathExpression('1 + 2')).toBe(true);
    expect(isSafeMathExpression('3.14 * 2')).toBe(true);
    expect(isSafeMathExpression('(u + v) / 2')).toBe(true);
  });

  it('acecta arrays y objetos literales', () => {
    expect(isSafeMathExpression('[u, v, 0]')).toBe(true);
    expect(isSafeMathExpression('{x: u, y: v}')).toBe(true);
  });

  it('rechaza require()', () => {
    expect(isSafeMathExpression('require("child_process")')).toBe(false);
    expect(isSafeMathExpression('require(\'fs\')')).toBe(false);
  });

  it('rechaza process.exit()', () => {
    expect(isSafeMathExpression('process.exit()')).toBe(false);
    expect(isSafeMathExpression('process.exit(1)')).toBe(false);
  });

  it('rechaza exec()', () => {
    expect(isSafeMathExpression('exec("whoami")')).toBe(false);
    expect(isSafeMathExpression('child_process.exec("ls")')).toBe(false);
  });

  it('rechaza eval()', () => {
    expect(isSafeMathExpression('eval("code")')).toBe(false);
  });

  it('rechaza import()', () => {
    expect(isSafeMathExpression('import("fs")')).toBe(false);
  });

  it('rechaza access a propiedades peligrosas', () => {
    expect(isSafeMathExpression('global.process')).toBe(false);
    expect(isSafeMathExpression('this.constructor')).toBe(false);
    expect(isSafeMathExpression('__proto__')).toBe(false);
  });

  it('rechaza strings con caracteres sospechosos', () => {
    expect(isSafeMathExpression('"rm -rf /"')).toBe(false);
    expect(isSafeMathExpression('`whoami`')).toBe(false);
  });

  it('rechaza expresiones vacías o nulas', () => {
    expect(isSafeMathExpression('')).toBe(false);
    expect(isSafeMathExpression('   ')).toBe(false);
  });
});

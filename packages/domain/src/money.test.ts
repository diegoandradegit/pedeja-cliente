import { describe, expect, it } from 'vitest';
import { aplicarPercentual, formatarBRL, multiplicar, reaisParaCentavos, somar } from './money.js';

describe('money', () => {
  it('evita o erro classico de ponto flutuante', () => {
    expect(somar(reaisParaCentavos(0.1), reaisParaCentavos(0.2))).toBe(30);
    expect(0.1 + 0.2).not.toBe(0.3);
  });

  it('multiplica sem perder centavos', () => {
    expect(multiplicar(1999, 3)).toBe(5997);
  });

  it('rejeita quantidade fracionaria ou negativa', () => {
    expect(() => multiplicar(100, 1.5)).toThrow();
    expect(() => multiplicar(100, -1)).toThrow();
  });

  it('formata em BRL', () => {
    expect(formatarBRL(1999).replace(/\u00a0/g, ' ')).toBe('R$ 19,99');
  });

  it('aplica percentual', () => {
    expect(aplicarPercentual(10000, 15)).toBe(1500);
    expect(() => aplicarPercentual(100, 150)).toThrow();
  });
});

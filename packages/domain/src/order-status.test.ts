import { describe, expect, it } from 'vitest';
import {
  TransicaoInvalidaError,
  ehStatusFinal,
  garantirTransicao,
  podeTransicionar,
  proximosStatus,
} from './order-status.js';

describe('maquina de estados do pedido', () => {
  it('permite o caminho feliz de entrega', () => {
    expect(podeTransicionar('PENDENTE', 'ACEITO', 'RESTAURANTE')).toBe(true);
    expect(podeTransicionar('ACEITO', 'EM_PREPARO', 'RESTAURANTE')).toBe(true);
    expect(podeTransicionar('EM_PREPARO', 'PRONTO', 'RESTAURANTE')).toBe(true);
    expect(podeTransicionar('PRONTO', 'AGUARDANDO_ENTREGADOR', 'RESTAURANTE')).toBe(true);
    expect(podeTransicionar('AGUARDANDO_ENTREGADOR', 'EM_ROTA', 'ENTREGADOR')).toBe(true);
    expect(podeTransicionar('EM_ROTA', 'ENTREGUE', 'ENTREGADOR')).toBe(true);
  });

  it('bloqueia o pulo que o sistema original permitia', () => {
    expect(podeTransicionar('PENDENTE', 'ENTREGUE', 'RESTAURANTE')).toBe(false);
    expect(podeTransicionar('PENDENTE', 'EM_ROTA', 'ENTREGADOR')).toBe(false);
  });

  it('nao deixa entregador marcar preparo nem restaurante marcar em rota', () => {
    expect(podeTransicionar('ACEITO', 'EM_PREPARO', 'ENTREGADOR')).toBe(false);
    expect(podeTransicionar('AGUARDANDO_ENTREGADOR', 'EM_ROTA', 'RESTAURANTE')).toBe(false);
  });

  it('cliente so cancela antes do preparo', () => {
    expect(podeTransicionar('PENDENTE', 'CANCELADO', 'CLIENTE')).toBe(true);
    expect(podeTransicionar('ACEITO', 'CANCELADO', 'CLIENTE')).toBe(true);
    expect(podeTransicionar('EM_PREPARO', 'CANCELADO', 'CLIENTE')).toBe(false);
    expect(podeTransicionar('EM_ROTA', 'CANCELADO', 'CLIENTE')).toBe(false);
  });

  it('status final nao transiciona', () => {
    for (const final of ['ENTREGUE', 'RETIRADO', 'CANCELADO'] as const) {
      expect(ehStatusFinal(final)).toBe(true);
      expect(proximosStatus(final, 'RESTAURANTE')).toEqual([]);
      expect(proximosStatus(final, 'SISTEMA')).toEqual([]);
    }
  });

  it('garantirTransicao lanca erro tipado', () => {
    expect(() => garantirTransicao('PENDENTE', 'ENTREGUE', 'CLIENTE')).toThrow(
      TransicaoInvalidaError,
    );
  });
});

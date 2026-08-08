import { describe, expect, it } from 'vitest';
import {
  deveEnviarLocalizacao,
  deveMostrarMapa,
  formatarDistancia,
  formatarEta,
  horarioDeChegada,
  interpolar,
  origemDaRota,
  podeEnviarAgora,
  precisaRecalcularRota,
} from './rastreio.js';

const loja = { lat: -23.4205, lng: -51.9331 };
const entregador = { lat: -23.426, lng: -51.935 };

describe('origem da rota', () => {
  it('usa o entregador quando ha posicao', () => {
    const r = origemDaRota(entregador, loja);
    expect(r.deQuem).toBe('ENTREGADOR');
    expect(r.origem).toEqual(entregador);
  });

  it('cai no restaurante antes de haver posicao', () => {
    const r = origemDaRota(null, loja);
    expect(r.deQuem).toBe('LOJA');
    expect(r.origem).toEqual(loja);
  });
});

describe('quando mostrar o mapa', () => {
  it('so em entrega, a partir de pronto', () => {
    expect(deveMostrarMapa({ status: 'PRONTO', tipoEntrega: 'ENTREGA' })).toBe(true);
    expect(deveMostrarMapa({ status: 'EM_ROTA', tipoEntrega: 'ENTREGA' })).toBe(true);
    expect(deveMostrarMapa({ status: 'PENDENTE', tipoEntrega: 'ENTREGA' })).toBe(false);
    expect(deveMostrarMapa({ status: 'ENTREGUE', tipoEntrega: 'ENTREGA' })).toBe(false);
  });

  it('nunca em retirada', () => {
    expect(deveMostrarMapa({ status: 'PRONTO', tipoEntrega: 'RETIRADA' })).toBe(false);
    expect(deveMostrarMapa({ status: 'EM_ROTA', tipoEntrega: 'RETIRADA' })).toBe(false);
  });
});

describe('envio de localizacao', () => {
  it('so durante a rota', () => {
    expect(deveEnviarLocalizacao('EM_ROTA')).toBe(true);
    for (const s of ['PRONTO', 'ENTREGUE', 'CANCELADO', 'PENDENTE'] as const) {
      expect(deveEnviarLocalizacao(s)).toBe(false);
    }
  });

  it('throttle segura envios seguidos', () => {
    const agora = 1_000_000;
    expect(podeEnviarAgora(null, agora)).toBe(true);
    expect(podeEnviarAgora(agora - 2_000, agora)).toBe(false);
    expect(podeEnviarAgora(agora - 9_000, agora)).toBe(true);
  });
});

describe('formatacao', () => {
  it('eta', () => {
    expect(formatarEta(null)).toBe('calculando…');
    expect(formatarEta(20)).toBe('chegando');
    expect(formatarEta(600)).toBe('10 min');
    expect(formatarEta(3600)).toBe('1h');
    expect(formatarEta(4500)).toBe('1h15');
  });

  it('distancia', () => {
    expect(formatarDistancia(null)).toBe('');
    expect(formatarDistancia(320)).toBe('300 m');
    expect(formatarDistancia(2500)).toBe('2,5 km');
  });

  it('horario de chegada soma o eta a agora', () => {
    const base = new Date('2026-08-08T20:00:00Z');
    expect(horarioDeChegada(900, base).toISOString()).toBe('2026-08-08T20:15:00.000Z');
  });
});

describe('recalculo de rota', () => {
  const agora = 1_000_000;

  it('calcula na primeira vez', () => {
    expect(precisaRecalcularRota(null, entregador, 0, agora)).toBe(true);
  });

  it('nao recalcula por poucos metros', () => {
    const quase = { lat: entregador.lat + 0.0002, lng: entregador.lng };
    expect(precisaRecalcularRota(entregador, quase, agora - 5_000, agora)).toBe(false);
  });

  it('recalcula quando anda o bastante', () => {
    const longe = { lat: entregador.lat + 0.005, lng: entregador.lng };
    expect(precisaRecalcularRota(entregador, longe, agora - 5_000, agora)).toBe(true);
  });

  it('recalcula por tempo mesmo parado', () => {
    expect(precisaRecalcularRota(entregador, entregador, agora - 70_000, agora)).toBe(true);
  });
});

describe('interpolacao do pino', () => {
  it('meio do caminho', () => {
    const m = interpolar({ lat: 0, lng: 0 }, { lat: 10, lng: 20 }, 0.5);
    expect(m).toEqual({ lat: 5, lng: 10 });
  });

  it('limita a fracao entre 0 e 1', () => {
    expect(interpolar({ lat: 0, lng: 0 }, { lat: 10, lng: 10 }, 2)).toEqual({ lat: 10, lng: 10 });
    expect(interpolar({ lat: 0, lng: 0 }, { lat: 10, lng: 10 }, -1)).toEqual({ lat: 0, lng: 0 });
  });
});

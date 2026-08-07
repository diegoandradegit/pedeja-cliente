import { describe, expect, it } from 'vitest';
import { estabelecimentoAberto } from './schedule.js';
import type { FaixaHorario } from './types.js';

// 2026-08-07 e uma sexta-feira (dia 5)
const sexta = (h: number, m = 0) => new Date(2026, 7, 7, h, m);
const sabado = (h: number, m = 0) => new Date(2026, 7, 8, h, m);

const comercial: FaixaHorario[] = [{ diaSemana: 5, abre: '11:00', fecha: '15:00' }];
const noturno: FaixaHorario[] = [{ diaSemana: 5, abre: '18:00', fecha: '02:00' }];

describe('horario de funcionamento', () => {
  it('faixa normal', () => {
    expect(estabelecimentoAberto(comercial, sexta(12))).toBe(true);
    expect(estabelecimentoAberto(comercial, sexta(10, 59))).toBe(false);
    expect(estabelecimentoAberto(comercial, sexta(15))).toBe(false);
  });

  it('faixa que vira a meia-noite', () => {
    expect(estabelecimentoAberto(noturno, sexta(20))).toBe(true);
    expect(estabelecimentoAberto(noturno, sabado(1))).toBe(true);
    expect(estabelecimentoAberto(noturno, sabado(3))).toBe(false);
    expect(estabelecimentoAberto(noturno, sexta(17))).toBe(false);
  });

  it('sem faixas, fechado', () => {
    expect(estabelecimentoAberto([], sexta(12))).toBe(false);
  });
});

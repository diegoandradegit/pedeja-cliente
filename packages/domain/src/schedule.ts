import type { FaixaHorario } from './types.js';

const paraMinutos = (hhmm: string): number => {
  const partes = hhmm.split(':');
  const h = Number(partes[0]);
  const m = Number(partes[1]);
  if (Number.isNaN(h) || Number.isNaN(m)) throw new Error(`Horario invalido: ${hhmm}`);
  return h * 60 + m;
};

/**
 * Aceita faixas que viram a meia-noite (ex.: 18:00 -> 02:00), caso comum em
 * delivery noturno e que o sistema original nao tratava (guardava apenas uma
 * string livre de "horarioFuncionamento").
 */
export function estabelecimentoAberto(horarios: FaixaHorario[], agora: Date): boolean {
  const dia = agora.getDay();
  const minutosAgora = agora.getHours() * 60 + agora.getMinutes();
  const diaAnterior = (dia + 6) % 7;

  return horarios.some((f) => {
    const abre = paraMinutos(f.abre);
    const fecha = paraMinutos(f.fecha);
    if (fecha > abre) {
      return f.diaSemana === dia && minutosAgora >= abre && minutosAgora < fecha;
    }
    if (f.diaSemana === dia && minutosAgora >= abre) return true;
    return f.diaSemana === diaAnterior && minutosAgora < fecha;
  });
}

export type Nivel = 'fresco' | 'atencao' | 'atrasado';

/** Minutos inteiros desde o instante informado. */
export function minutosDesde(iso: string, agora = Date.now()): number {
  return Math.max(0, Math.floor((agora - new Date(iso).getTime()) / 60000));
}

/**
 * Faixas de urgencia. Sao o unico julgamento visual do painel: quem esta na
 * cozinha decide pelo tempo parado, nao pelo valor do pedido.
 */
export function nivelDeEspera(minutos: number): Nivel {
  if (minutos < 5) return 'fresco';
  if (minutos < 12) return 'atencao';
  return 'atrasado';
}

/** Ate 59min mostra "07"; acima disso "1h20". */
export function formatarEspera(minutos: number): { valor: string; unidade: string } {
  if (minutos < 60) return { valor: String(minutos).padStart(2, '0'), unidade: 'min' };
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return { valor: `${h}h${String(m).padStart(2, '0')}`, unidade: '' };
}

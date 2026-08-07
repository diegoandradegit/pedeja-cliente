/**
 * Dinheiro em centavos (inteiro). Nunca usar float para valores monetarios:
 * 0.1 + 0.2 !== 0.3 em ponto flutuante, e o projeto original usava float64
 * para preco e frete — fonte classica de divergencia de centavos no fechamento.
 */
export type Centavos = number;

export function reaisParaCentavos(reais: number): Centavos {
  return Math.round(reais * 100);
}

export function centavosParaReais(c: Centavos): number {
  return c / 100;
}

export function formatarBRL(c: Centavos): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c / 100);
}

export function somar(...valores: Centavos[]): Centavos {
  return valores.reduce((acc, v) => acc + v, 0);
}

/** Multiplica valor por quantidade inteira. Arredonda meio-para-cima. */
export function multiplicar(valor: Centavos, quantidade: number): Centavos {
  if (!Number.isInteger(quantidade) || quantidade < 0) {
    throw new Error(`Quantidade invalida: ${quantidade}`);
  }
  return Math.round(valor * quantidade);
}

/** Aplica percentual de desconto (0-100). */
export function aplicarPercentual(valor: Centavos, percentual: number): Centavos {
  if (percentual < 0 || percentual > 100) {
    throw new Error(`Percentual invalido: ${percentual}`);
  }
  return Math.round((valor * percentual) / 100);
}

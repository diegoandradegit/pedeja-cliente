import { type Adicional, type Centavos, type Produto, multiplicar, somar } from '@pedeja/domain';

/**
 * Linha do carrinho no lado do cliente. Guarda o preco apenas para MOSTRAR uma
 * previa — o valor que vale e o que o servidor calcula em cotar()/criar(), a
 * partir do catalogo. Nada daqui e enviado como preco.
 */
export type Linha = {
  chave: string;
  produtoId: string;
  nome: string;
  quantidade: number;
  adicionais: { id: string; nome: string; preco: Centavos }[];
  observacao?: string;
  previaUnitaria: Centavos;
};

export function montarLinha(
  produto: Produto,
  quantidade: number,
  adicionaisEscolhidos: Adicional[],
  observacao: string,
): Linha {
  const adicionais = adicionaisEscolhidos.map((a) => ({ id: a.id, nome: a.nome, preco: a.preco }));
  const ids = adicionais
    .map((a) => a.id)
    .sort()
    .join(',');
  return {
    chave: `${produto.id}|${ids}|${observacao.trim()}`,
    produtoId: produto.id,
    nome: produto.nome,
    quantidade,
    adicionais,
    ...(observacao.trim() ? { observacao: observacao.trim() } : {}),
    previaUnitaria: somar(produto.preco, ...adicionais.map((a) => a.preco)),
  };
}

/** Mesma combinacao de produto + adicionais + observacao vira uma linha so. */
export function juntar(linhas: Linha[], nova: Linha): Linha[] {
  const i = linhas.findIndex((l) => l.chave === nova.chave);
  if (i < 0) return [...linhas, nova];
  const atual = linhas[i];
  if (!atual) return [...linhas, nova];
  const copia = [...linhas];
  copia[i] = { ...atual, quantidade: atual.quantidade + nova.quantidade };
  return copia;
}

export function previaSubtotal(linhas: Linha[]): Centavos {
  return somar(...linhas.map((l) => multiplicar(l.previaUnitaria, l.quantidade)));
}

export function totalDeItens(linhas: Linha[]): number {
  return linhas.reduce((n, l) => n + l.quantidade, 0);
}

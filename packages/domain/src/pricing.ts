import { type Centavos, multiplicar, somar } from './money.js';
import type { Adicional, ConfigFrete, ItemCarrinho, ItemPedido, Produto } from './types.js';

export class ProdutoIndisponivelError extends Error {
  constructor(readonly produtoId: string) {
    super(`Produto indisponivel: ${produtoId}`);
    this.name = 'ProdutoIndisponivelError';
  }
}

export class AdicionalInvalidoError extends Error {
  constructor(
    readonly adicionalId: string,
    readonly produtoId: string,
  ) {
    super(`Adicional ${adicionalId} nao pertence ao produto ${produtoId}`);
    this.name = 'AdicionalInvalidoError';
  }
}

/**
 * Precifica o carrinho a partir do catalogo REAL, ignorando qualquer valor que
 * o cliente tenha enviado. No sistema original o payload inteiro (com Price de
 * cada item e deliveryValue) era gravado direto no Mongo — dava para fechar
 * pedido de R$ 0,01. Aqui o preco so pode vir de `produtos` e `adicionais`.
 */
export function precificarItens(
  carrinho: ItemCarrinho[],
  produtos: Map<string, Produto>,
  adicionais: Map<string, Adicional>,
): ItemPedido[] {
  return carrinho.map((item) => {
    const produto = produtos.get(item.produtoId);
    if (!produto || !produto.ativo) throw new ProdutoIndisponivelError(item.produtoId);
    if (!Number.isInteger(item.quantidade) || item.quantidade < 1) {
      throw new Error(`Quantidade invalida para ${item.produtoId}: ${item.quantidade}`);
    }

    const escolhidos = item.adicionaisIds.map((id) => {
      if (!produto.adicionaisIds.includes(id)) throw new AdicionalInvalidoError(id, produto.id);
      const ad = adicionais.get(id);
      if (!ad || !ad.ativo) throw new ProdutoIndisponivelError(id);
      return { id: ad.id, nome: ad.nome, preco: ad.preco };
    });

    const unitario = somar(produto.preco, ...escolhidos.map((a) => a.preco));

    return {
      produtoId: produto.id,
      nomeProduto: produto.nome,
      quantidade: item.quantidade,
      precoUnitario: unitario,
      adicionais: escolhidos,
      subtotal: multiplicar(unitario, item.quantidade),
      ...(item.observacao ? { observacao: item.observacao } : {}),
    };
  });
}

export function calcularSubtotal(itens: ItemPedido[]): Centavos {
  return somar(...itens.map((i) => i.subtotal));
}

export class ForaDeAreaError extends Error {
  constructor(
    readonly distanciaKm: number,
    readonly raioMaximoKm: number,
  ) {
    super(`Endereco a ${distanciaKm}km, fora do raio de ${raioMaximoKm}km`);
    this.name = 'ForaDeAreaError';
  }
}

/** Frete calculado no servidor. O cliente nunca informa o valor. */
export function calcularFrete(
  distanciaKm: number,
  config: ConfigFrete,
  subtotal: Centavos,
): Centavos {
  if (distanciaKm > config.raioMaximoKm) {
    throw new ForaDeAreaError(distanciaKm, config.raioMaximoKm);
  }
  if (config.freteGratisAcimaDe !== null && subtotal >= config.freteGratisAcimaDe) return 0;
  return Math.round(config.taxaFixa + config.precoPorKm * distanciaKm);
}

export function calcularTotal(subtotal: Centavos, frete: Centavos, desconto: Centavos): Centavos {
  const total = subtotal + frete - desconto;
  return total < 0 ? 0 : total;
}

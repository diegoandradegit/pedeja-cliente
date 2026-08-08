import { type Centavos, multiplicar, somar } from './money.js';
import type {
  Adicional,
  Categoria,
  ConfigFrete,
  ItemCarrinho,
  ItemPedido,
  Produto,
  RegraFracionado,
} from './types.js';

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

export class SaboresInvalidosError extends Error {
  constructor(readonly motivo: string) {
    super(motivo);
    this.name = 'SaboresInvalidosError';
  }
}

/**
 * Preco de um item com um ou mais sabores (pizza meio a meio).
 * MAIOR: cobra o sabor mais caro. MEDIA: cobra a media dos sabores.
 * As duas regras existem no Brasil; quem escolhe e o restaurante.
 */
export function precoDosSabores(sabores: Produto[], regra: RegraFracionado): Centavos {
  const precos = sabores.map((p) => p.preco);
  if (precos.length === 0) throw new SaboresInvalidosError('Item sem produto');
  if (regra === 'MAIOR') return Math.max(...precos);
  return Math.round(precos.reduce((a, b) => a + b, 0) / precos.length);
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
  categorias: Map<string, Categoria>,
  regra: RegraFracionado,
): ItemPedido[] {
  return carrinho.map((item) => {
    const principal = produtos.get(item.produtoId);
    if (!principal || !principal.ativo) throw new ProdutoIndisponivelError(item.produtoId);
    if (!Number.isInteger(item.quantidade) || item.quantidade < 1) {
      throw new Error(`Quantidade invalida para ${item.produtoId}: ${item.quantidade}`);
    }

    // sabores: o principal mais os extras, na ordem escolhida
    const sabores = [principal];
    for (const id of item.saboresExtras ?? []) {
      const extra = produtos.get(id);
      if (!extra || !extra.ativo) throw new ProdutoIndisponivelError(id);
      if (extra.categoriaId !== principal.categoriaId) {
        throw new SaboresInvalidosError('Sabores de categorias diferentes no mesmo item');
      }
      sabores.push(extra);
    }

    const categoria = categorias.get(principal.categoriaId);
    const maxSabores = categoria?.maxSabores ?? 1;
    if (sabores.length > maxSabores) {
      throw new SaboresInvalidosError(`Esta categoria aceita no maximo ${maxSabores} sabor(es)`);
    }

    // adicionais valem pelo sabor principal
    const escolhidos = item.adicionaisIds.map((id) => {
      if (!principal.adicionaisIds.includes(id)) throw new AdicionalInvalidoError(id, principal.id);
      const ad = adicionais.get(id);
      if (!ad || !ad.ativo) throw new ProdutoIndisponivelError(id);
      return { id: ad.id, nome: ad.nome, preco: ad.preco };
    });

    const unitario = somar(precoDosSabores(sabores, regra), ...escolhidos.map((a) => a.preco));

    return {
      produtoId: principal.id,
      sabores: sabores.map((p) => ({ id: p.id, nome: p.nome })),
      nomeProduto: sabores.map((p) => p.nome).join(' / '),
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

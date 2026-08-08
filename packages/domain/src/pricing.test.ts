import { describe, expect, it } from 'vitest';
import {
  AdicionalInvalidoError,
  ForaDeAreaError,
  ProdutoIndisponivelError,
  SaboresInvalidosError,
  calcularFrete,
  calcularSubtotal,
  calcularTotal,
  precificarItens,
  precoDosSabores,
} from './pricing.js';
import type { Adicional, Categoria, ConfigFrete, Produto } from './types.js';

const categorias = new Map<string, Categoria>([
  ['c1', { id: 'c1', estabelecimentoId: 'e1', nome: 'Burgers', ordem: 1, maxSabores: 1 }],
  ['c2', { id: 'c2', estabelecimentoId: 'e1', nome: 'Pizzas', ordem: 2, maxSabores: 2 }],
]);

const produtos = new Map<string, Produto>([
  [
    'p1',
    {
      id: 'p1',
      estabelecimentoId: 'e1',
      nome: 'X-Salada',
      descricao: '',
      preco: 2500,
      imagem: null,
      categoriaId: 'c1',
      adicionaisIds: ['a1', 'a2'],
      ativo: true,
    },
  ],
  [
    'p2',
    {
      id: 'p2',
      estabelecimentoId: 'e1',
      nome: 'Fora do ar',
      descricao: '',
      preco: 1000,
      imagem: null,
      categoriaId: 'c1',
      adicionaisIds: [],
      ativo: false,
    },
  ],
]);

produtos.set('pz1', {
  id: 'pz1',
  estabelecimentoId: 'e1',
  nome: 'Margherita',
  descricao: '',
  preco: 4900,
  imagem: null,
  categoriaId: 'c2',
  adicionaisIds: [],
  ativo: true,
});
produtos.set('pz2', {
  id: 'pz2',
  estabelecimentoId: 'e1',
  nome: 'Calabresa',
  descricao: '',
  preco: 4600,
  imagem: null,
  categoriaId: 'c2',
  adicionaisIds: [],
  ativo: true,
});

const adicionais = new Map<string, Adicional>([
  ['a1', { id: 'a1', nome: 'Bacon', preco: 500, ativo: true }],
  ['a2', { id: 'a2', nome: 'Cheddar', preco: 300, ativo: true }],
  ['a9', { id: 'a9', nome: 'De outro produto', preco: 100, ativo: true }],
]);

describe('precificacao', () => {
  it('usa o preco do catalogo, nao o que o cliente mandar', () => {
    // O tipo ItemCarrinho nem tem campo de preco; ainda assim, simulamos um
    // payload malicioso com preco injetado para provar que e ignorado.
    const payloadMalicioso = {
      produtoId: 'p1',
      quantidade: 2,
      adicionaisIds: [],
      preco: 1,
      precoUnitario: 1,
    } as never;
    const itens = precificarItens([payloadMalicioso], produtos, adicionais, categorias, 'MAIOR');
    expect(itens[0]?.precoUnitario).toBe(2500);
    expect(itens[0]?.subtotal).toBe(5000);
  });

  it('soma adicionais no preco unitario', () => {
    const itens = precificarItens(
      [{ produtoId: 'p1', quantidade: 1, adicionaisIds: ['a1', 'a2'] }],
      produtos,
      adicionais,
      categorias,
      'MAIOR',
    );
    expect(itens[0]?.precoUnitario).toBe(3300);
  });

  it('recusa adicional que nao pertence ao produto', () => {
    expect(() =>
      precificarItens(
        [{ produtoId: 'p1', quantidade: 1, adicionaisIds: ['a9'] }],
        produtos,
        adicionais,
        categorias,
        'MAIOR',
      ),
    ).toThrow(AdicionalInvalidoError);
  });

  it('recusa produto inativo ou inexistente', () => {
    expect(() =>
      precificarItens(
        [{ produtoId: 'p2', quantidade: 1, adicionaisIds: [] }],
        produtos,
        adicionais,
        categorias,
        'MAIOR',
      ),
    ).toThrow(ProdutoIndisponivelError);
    expect(() =>
      precificarItens(
        [{ produtoId: 'xx', quantidade: 1, adicionaisIds: [] }],
        produtos,
        adicionais,
        categorias,
        'MAIOR',
      ),
    ).toThrow(ProdutoIndisponivelError);
  });

  it('soma subtotal de varios itens', () => {
    const itens = precificarItens(
      [
        { produtoId: 'p1', quantidade: 2, adicionaisIds: ['a1'] },
        { produtoId: 'p1', quantidade: 1, adicionaisIds: [] },
      ],
      produtos,
      adicionais,
      categorias,
      'MAIOR',
    );
    expect(calcularSubtotal(itens)).toBe(3000 * 2 + 2500);
  });
});

const frete: ConfigFrete = {
  estabelecimentoId: 'e1',
  taxaFixa: 400,
  precoPorKm: 150,
  raioMaximoKm: 10,
  freteGratisAcimaDe: 8000,
};

describe('frete', () => {
  it('calcula taxa fixa + por km', () => {
    expect(calcularFrete(3, frete, 5000)).toBe(400 + 450);
  });

  it('zera acima do piso de frete gratis', () => {
    expect(calcularFrete(3, frete, 8000)).toBe(0);
  });

  it('recusa fora do raio', () => {
    expect(() => calcularFrete(11, frete, 5000)).toThrow(ForaDeAreaError);
  });

  it('total nunca fica negativo', () => {
    expect(calcularTotal(1000, 500, 9999)).toBe(0);
    expect(calcularTotal(1000, 500, 300)).toBe(1200);
  });
});

describe('meio a meio', () => {
  const margherita = produtos.get('pz1');
  const calabresa = produtos.get('pz2');
  if (!margherita || !calabresa) throw new Error('catalogo de teste incompleto');
  const pizzas = [margherita, calabresa];

  it('MAIOR cobra o sabor mais caro', () => {
    expect(precoDosSabores(pizzas, 'MAIOR')).toBe(4900);
  });

  it('MEDIA cobra a media dos sabores', () => {
    expect(precoDosSabores(pizzas, 'MEDIA')).toBe(4750);
  });

  it('junta os nomes no snapshot do item', () => {
    const itens = precificarItens(
      [{ produtoId: 'pz1', saboresExtras: ['pz2'], quantidade: 1, adicionaisIds: [] }],
      produtos,
      adicionais,
      categorias,
      'MAIOR',
    );
    expect(itens[0]?.nomeProduto).toBe('Margherita / Calabresa');
    expect(itens[0]?.sabores).toHaveLength(2);
    expect(itens[0]?.precoUnitario).toBe(4900);
  });

  it('recusa meio a meio em categoria de um sabor so', () => {
    expect(() =>
      precificarItens(
        [{ produtoId: 'p1', saboresExtras: ['p1'], quantidade: 1, adicionaisIds: [] }],
        produtos,
        adicionais,
        categorias,
        'MAIOR',
      ),
    ).toThrow(SaboresInvalidosError);
  });

  it('recusa sabores de categorias diferentes', () => {
    expect(() =>
      precificarItens(
        [{ produtoId: 'pz1', saboresExtras: ['p1'], quantidade: 1, adicionaisIds: [] }],
        produtos,
        adicionais,
        categorias,
        'MAIOR',
      ),
    ).toThrow(SaboresInvalidosError);
  });
});
